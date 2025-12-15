// order/server.js

require('dotenv').config();
const express = require('express');
const { Pool } = require('pg');
const jwt = require('jsonwebtoken'); // Cần JWT để xác thực token
const cors = require('cors');

const app = express();
// Lấy cổng từ biến môi trường (Docker Compose sẽ truyền vào 3003)
const PORT = process.env.PORT || 3003; 
const JWT_SECRET = process.env.JWT_SECRET; 

// ---------------- Middleware ----------------
app.use(cors());
app.use(express.json());

// ---------------- Kết nối PostgreSQL ----------------
const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST, // SẼ LÀ 'postgres_db' trong Docker Compose
    database: process.env.DB_DATABASE,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
});

// ---------------- Middleware Bảo vệ (JWT) ----------------
function protect(req, res, next) {
    const auth = req.headers.authorization;
    if (!auth || !auth.startsWith("Bearer ")) {
        return res.status(401).json({ message: "Không có token hoặc định dạng sai" });
    }

    const token = auth.split(" ")[1];
    
    jwt.verify(token, JWT_SECRET, (err, decoded) => {
        if (err) {
            // LƯU Ý: Nếu User Service đã tách, bạn có thể cân nhắc 
            // dùng Public Key để xác thực token mà không cần JWT_SECRET.
            return res.status(403).json({ message: "Token không hợp lệ hoặc đã hết hạn" }); 
        }
        req.userId = decoded.userId;
        next();
    });
}

/* ===================== ORDERS ROUTES ===================== */

// POST /api/orders (Tạo đơn hàng mới)
app.post("/api/orders", protect, async (req, res) => {
    const { items, total } = req.body; 
    const userId = req.userId;

    if (!items || !total || items.length === 0) {
        return res.status(400).json({ message: "Thiếu thông tin giỏ hàng hoặc tổng tiền." });
    }
    
    // Bắt đầu transaction (Giao dịch)
    const client = await pool.connect();
    
    try {
        await client.query('BEGIN'); 

        // 1. Lưu Order chính
        const orderResult = await client.query(
            "INSERT INTO orders(user_id, total, status, created_at) VALUES($1, $2, 'Pending', NOW()) RETURNING id",
            [userId, total]
        );

        const orderId = orderResult.rows[0].id;

        // 2. Lưu từng Order Item
        for (const item of items) {
            if (!item.id || !item.quantity || !item.price) {
                throw new Error("Dữ liệu item trong giỏ hàng không hợp lệ.");
            }
            
            await client.query(
                `INSERT INTO order_items(order_id, product_id, quantity, price)
                 VALUES($1, $2, $3, $4)`,
                [orderId, item.id, item.quantity, item.price]
            );
        }

        await client.query('COMMIT'); // Commit giao dịch

        // Sau khi lưu đơn, gọi Payment Service để xử lý thanh toán (mock hoặc thực tế)
        try {
            const paymentUrlBase = process.env.PAYMENT_URL || 'http://localhost:3005/api';
            const resp = await fetch(`${paymentUrlBase}/payments`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ orderId: orderId, amount: total, method: 'mock' })
            });

            const payData = await resp.json().catch(() => ({}));
            if (resp.ok) {
                // Cập nhật trạng thái đơn là Paid nếu thanh toán thành công
                await client.query('UPDATE orders SET status=$1 WHERE id=$2', ['Paid', orderId]);
                return res.status(201).json({ message: "Tạo đơn hàng thành công", orderId: orderId, payment: payData.payment || payData });
            } else {
                // Nếu thanh toán thất bại, trả về thông tin lỗi nhưng giữ đơn ở trạng thái Pending
                return res.status(502).json({ message: 'Order created but payment failed', paymentError: payData.message || payData });
            }
        } catch (err) {
            console.error('Lỗi khi gọi Payment Service:', err);
            return res.status(201).json({ message: "Tạo đơn hàng thành công", orderId: orderId, warn: 'Không thể kết nối Payment Service' });
        }

    } catch (err) {
        await client.query('ROLLBACK'); // Rollback nếu có lỗi
        console.error("Lỗi tạo đơn hàng:", err);
        res.status(500).json({ message: "Lỗi server trong quá trình xử lý đơn hàng." });
    } finally {
        client.release(); // Giải phóng client
    }
});

// GET /api/orders/me (Lấy đơn hàng của user đang đăng nhập)
app.get("/api/orders/me", protect, async (req, res) => {
    try {
        // Lấy thông tin orders
        const ordersResult = await pool.query(
            "SELECT id, total, status, created_at FROM orders WHERE user_id=$1 ORDER BY created_at DESC",
            [req.userId]
        );

        const orders = ordersResult.rows;

        if (orders.length === 0) {
            return res.json([]);
        }

        // Lấy tất cả Order ID để truy vấn order_items một lần
        const orderIds = orders.map(o => o.id);
        
        const itemsResult = await pool.query(
            `SELECT order_id, product_id, quantity, price 
             FROM order_items 
             WHERE order_id = ANY($1::int[])`, 
            [orderIds]
        );
        
        const itemsMap = itemsResult.rows.reduce((acc, item) => {
            if (!acc[item.order_id]) acc[item.order_id] = [];
            acc[item.order_id].push(item);
            return acc;
        }, {});

            // Lấy payments tương ứng với các order
            const paymentsResult = await pool.query(
                `SELECT payment_id, order_id, amount, status, provider, created_at
                 FROM payments
                 WHERE order_id = ANY($1::int[])`,
                [orderIds]
            );

            const paymentsMap = paymentsResult.rows.reduce((acc, p) => {
                acc[p.order_id] = acc[p.order_id] || [];
                acc[p.order_id].push(p);
                return acc;
            }, {});

            // Kết hợp items và payments vào mỗi order
            const ordersWithItems = orders.map(order => ({
                ...order,
                items: itemsMap[order.id] || [],
                payments: paymentsMap[order.id] || []
            }));

        res.json(ordersWithItems);

    } catch (err) {
        console.error("Lỗi lấy đơn hàng:", err.message);
        res.status(500).json({ message: "Lỗi server khi lấy đơn hàng." });
    }
});

// POST /api/orders/:id/payment-callback (called by Payment Service)
app.post('/api/orders/:id/payment-callback', async (req, res) => {
    const orderId = parseInt(req.params.id, 10);
    const { paymentId, status } = req.body;
    if (!orderId || !paymentId) return res.status(400).json({ message: 'orderId & paymentId required' });

    try {
        if (status === 'success') {
            await pool.query('UPDATE orders SET status=$1 WHERE id=$2', ['Paid', orderId]);
            return res.json({ message: 'Order updated to Paid' });
        } else {
            await pool.query('UPDATE orders SET status=$1 WHERE id=$2', ['Payment Failed', orderId]);
            return res.json({ message: 'Order updated to Payment Failed' });
        }
    } catch (err) {
        console.error('Payment callback error:', err.message);
        res.status(500).json({ message: 'Server error' });
    }
});


/* ===================== RUN SERVER ===================== */

pool.connect()
    .then(() => console.log(`✅ Order Service connected to DB`))
    .catch(err => {
        console.error("❌ Order Service DB ERROR:", err.message);
        process.exit(1); 
    });

app.listen(PORT, () =>
    console.log(`🚀 Order Service running at http://localhost:${PORT}`)
);