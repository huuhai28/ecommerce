// server.js

// ---------------- Cấu hình ban đầu ----------------
require('dotenv').config();
const express = require('express');
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET || 'your_default_secret_key'; // Nên đặt trong .env

// ---------------- Middleware ----------------
// Cho phép frontend từ localhost:xxxx truy cập
app.use(cors({
    origin: ['http://localhost:5500', 'http://127.0.0.1:5500'], // Thay bằng port frontend của bạn nếu khác
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
}));
app.use(express.json());

// ---------------- Kết nối PostgreSQL ----------------
const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
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
    
    // Đảm bảo JWT_SECRET đã được định nghĩa
    if (!JWT_SECRET) {
        console.error("Lỗi: JWT_SECRET chưa được cấu hình.");
        return res.status(500).json({ message: "Lỗi cấu hình server" });
    }

    jwt.verify(token, JWT_SECRET, (err, decoded) => {
        if (err) {
            // Bao gồm lỗi hết hạn
            return res.status(403).json({ message: "Token không hợp lệ hoặc đã hết hạn" }); 
        }

        // Lưu user ID vào request để sử dụng ở các route sau
        req.userId = decoded.userId;
        next();
    });
}

/* ===================== USERS/AUTH ===================== */

// POST /api/register
app.post("/api/register", async (req, res) => {
    try {
        const { email, name, password } = req.body;
        if (!email || !password || !name) {
            return res.status(400).json({ message: "Vui lòng nhập đầy đủ email, tên và mật khẩu." });
        }

        const hash = await bcrypt.hash(password, 10);

        const result = await pool.query(
            "INSERT INTO users (email, name, password_hash) VALUES ($1,$2,$3) RETURNING id",
            [email, name, hash]
        );

        res.status(201).json({ message: "Đăng ký thành công", userId: result.rows[0].id });

    } catch (err) {
        if (err.code === "23505") { // Mã lỗi unique violation
            return res.status(409).json({ message: "Email đã tồn tại trong hệ thống." });
        }
        console.error("Lỗi đăng ký:", err.message);
        res.status(500).json({ message: "Lỗi server trong quá trình đăng ký." });
    }
});

// POST /api/login
app.post("/api/login", async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({ message: "Vui lòng nhập email và mật khẩu." });
        }

        const result = await pool.query(
            "SELECT id, name, email, password_hash FROM users WHERE email=$1",
            [email]
        );

        if (result.rows.length === 0)
            return res.status(401).json({ message: "Email hoặc mật khẩu không chính xác." });

        const user = result.rows[0];

        const ok = await bcrypt.compare(password, user.password_hash);
        if (!ok)
            return res.status(401).json({ message: "Email hoặc mật khẩu không chính xác." });

        const token = jwt.sign(
            { userId: user.id },
            JWT_SECRET,
            { expiresIn: "1d" }
        );

        // Trả về thông tin người dùng không bao gồm password hash
        res.json({ 
            token, 
            user: { 
                id: user.id, 
                name: user.name, 
                email: user.email 
            } 
        });

    } catch (err) {
        console.error("Lỗi đăng nhập:", err.message);
        res.status(500).json({ message: "Lỗi server trong quá trình đăng nhập." });
    }
});

/* ===================== PRODUCTS ===================== */

// GET /api/products (Lấy tất cả sản phẩm)
// Lưu ý: Tên cột trong DB phải khớp với logic frontend (title, category, price, img, desc)
// Tôi giữ nguyên logic DB của bạn nhưng thêm các cột cần thiết cho frontend demo
app.get("/api/products", async (req, res) => {
    try {
        // Giả định bảng products có các cột: id, title, price, category, desc, img
        const result = await pool.query("SELECT id, title, price, category, desc, img FROM products ORDER BY id DESC");
        res.json(result.rows);
    } catch (err) {
        console.error("Lỗi lấy sản phẩm:", err.message);
        res.status(500).json({ message: "Lỗi server khi lấy danh sách sản phẩm." });
    }
});

// POST /api/products (Thêm sản phẩm, chỉ dành cho Admin hoặc user đã đăng nhập)
app.post("/api/products", protect, async (req, res) => {
    try {
        // Tên cột được đổi để khớp với logic frontend (title, price, category, img)
        const { title, price, category, img, desc } = req.body; 
        if (!title || !price || !category) {
            return res.status(400).json({ message: "Thiếu thông tin sản phẩm bắt buộc (title, price, category)." });
        }

        const result = await pool.query(
            "INSERT INTO products (title, price, category, img, desc) VALUES ($1,$2,$3,$4,$5) RETURNING *",
            [title, price, category, img, desc]
        );

        res.status(201).json(result.rows[0]);

    } catch (err) {
        console.error("Lỗi thêm sản phẩm:", err.message);
        res.status(500).json({ message: "Lỗi server khi thêm sản phẩm." });
    }
});

/* ===================== ORDERS ===================== */

// POST /api/orders (Tạo đơn hàng)
app.post("/api/orders", protect, async (req, res) => {
    const { items, total } = req.body; 
    const userId = req.userId;

    if (!items || !total || items.length === 0) {
        return res.status(400).json({ message: "Thiếu thông tin giỏ hàng hoặc tổng tiền." });
    }
    
    // Bắt đầu transaction để đảm bảo cả order và order_items đều được lưu
    const client = await pool.connect();
    
    try {
        await client.query('BEGIN'); // Bắt đầu transaction

        // 1. Lưu Order chính
        const orderResult = await client.query(
    // Đã bỏ cột status:
    "INSERT INTO orders(user_id, total, created_at) VALUES($1, $2, NOW()) RETURNING id",
    [userId, total]
);

        const orderId = orderResult.rows[0].id;

        // 2. Lưu từng Order Item
        for (const item of items) {
            // Kiểm tra tính hợp lệ cơ bản của item
            if (!item.id || !item.quantity || !item.price) {
                throw new Error("Dữ liệu item trong giỏ hàng không hợp lệ.");
            }
            
            // Chèn vào bảng order_items
           await client.query(
        `INSERT INTO order_items(order_id, product_id, quantity, price)
         VALUES($1, $2, $3, $4)`,
        [orderId, item.id, item.quantity, item.price] // <-- LỖI Ở ĐÂY
    );
        }

        await client.query('COMMIT'); // Commit transaction (Lưu lại)

        res.status(201).json({ message: "Tạo đơn hàng thành công", orderId: orderId });

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

        // Nếu không có đơn hàng, trả về luôn
        if (orders.length === 0) {
            return res.json([]);
        }

        // Lấy tất cả Order ID để truy vấn order_items một lần
        const orderIds = orders.map(o => o.id);
        
        const itemsResult = await pool.query(
            `SELECT order_id, product_id, quantity, price 
             FROM order_items 
             WHERE order_id = ANY($1::int[])`, // Sử dụng ANY để tìm kiếm trong mảng ID
            [orderIds]
        );
        
        const itemsMap = itemsResult.rows.reduce((acc, item) => {
            if (!acc[item.order_id]) acc[item.order_id] = [];
            acc[item.order_id].push(item);
            return acc;
        }, {});

        // Kết hợp items vào mỗi order
        const ordersWithItems = orders.map(order => ({
            ...order,
            items: itemsMap[order.id] || []
        }));

        res.json(ordersWithItems);

    } catch (err) {
        console.error("Lỗi lấy đơn hàng:", err.message);
        res.status(500).json({ message: "Lỗi server khi lấy đơn hàng." });
    }
});


/* ===================== RUN SERVER ===================== */

pool.connect()
    .then(() => console.log("✅ PostgreSQL Connected"))
    .catch(err => {
        console.error("❌ Lỗi kết nối CSDL:", err.message);
        console.log("Vui lòng kiểm tra lại file .env và trạng thái PostgreSQL server.");
        process.exit(1); // Thoát ứng dụng nếu không kết nối được DB
    });

app.listen(PORT, () =>
    console.log(`🚀 Backend đang chạy tại http://localhost:${PORT}`)
);