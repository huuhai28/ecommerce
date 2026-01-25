// order/server.js

require('dotenv').config();
const express = require('express');
const { Pool } = require('pg');
const jwt = require('jsonwebtoken');
const amqp = require('amqplib');

const app = express();
const PORT = process.env.PORT || 3003; 
const JWT_SECRET = process.env.JWT_SECRET; 
const RABBITMQ_URL = process.env.RABBITMQ_URL || 'amqp://guest:guest@rabbitmq:5672/';
const SHIPPING_QUEUE = process.env.RABBITMQ_QUEUE || 'shipping.requests';

let amqpChannel = null;
async function initRabbit() {
    while (!amqpChannel) {
        try {
            const conn = await amqp.connect(RABBITMQ_URL);
            const ch = await conn.createChannel();
            await ch.assertQueue(SHIPPING_QUEUE, { durable: true });
            amqpChannel = ch;
            console.log(' Order Service connected to RabbitMQ');
            break;
        } catch (err) {
            console.warn(' Could not connect to RabbitMQ, retrying in 3s:', err.message);
            amqpChannel = null;
            await new Promise(r => setTimeout(r, 3000));
        }
    }
}

app.use(express.json());

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST, 
    database: process.env.DB_DATABASE,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
});

app.get('/health', async (_req, res) => {
    try {
        await pool.query('SELECT 1');
        res.json({ status: 'ok', rabbit: Boolean(amqpChannel) });
    } catch (err) {
        res.status(500).json({ status: 'error', rabbit: Boolean(amqpChannel), error: err.message });
    }
});

function protect(req, res, next) {
    const auth = req.headers.authorization;
    if (!auth || !auth.startsWith("Bearer ")) {
        return res.status(401).json({ message: "Không có token hoặc định dạng sai" });
    }

    const token = auth.split(" ")[1];
    
    jwt.verify(token, JWT_SECRET, (err, decoded) => {
        if (err) {
            return res.status(403).json({ message: "Token không hợp lệ hoặc đã hết hạn" }); 
        }
        req.customerId = decoded.customerId;
        next();
    });
}

// Helper function: Tạo tracking number
function generateTrackingNumber() {
    return 'ORD-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9).toUpperCase();
}

app.post("/api/orders", protect, async (req, res) => {
    let { items, totalPrice, totalQuantity, billingAddress, shippingAddress, paymentId, paymentMethod } = req.body;
    const customerId = req.customerId;

    console.log(' Order Request (raw):', { itemsLength: items?.length, totalPrice, totalQuantity, customerId, paymentMethod });

    if (!items || items.length === 0) {
        console.log(' Validation failed: items empty');
        return res.status(400).json({ message: "Giỏ hàng trống." });
    }
    
    const SHIPPING_FEE = 30000;
    const calculatedTotal = items.reduce((sum, item) => sum + (item.unitPrice * item.quantity), 0) + SHIPPING_FEE;
    totalPrice = calculatedTotal;
    totalQuantity = items.reduce((sum, item) => sum + item.quantity, 0);
    
    console.log('📦 Order Request (calculated):', { itemsLength: items.length, totalPrice, totalQuantity, customerId, paymentMethod });
    
    const client = await pool.connect();
    
    try {
        await client.query('BEGIN'); 

        // 1. Tạo address nếu cần
        let billingAddressId = null;
        let shippingAddressId = null;

        if (billingAddress) {
            const addrResult = await client.query(
                `INSERT INTO address(street, city, state, country, zip_code) 
                 VALUES($1, $2, $3, $4, $5) RETURNING id`,
                [billingAddress.street, billingAddress.city, billingAddress.state, 
                 billingAddress.country, billingAddress.zipCode]
            );
            billingAddressId = addrResult.rows[0].id;
        }

        if (shippingAddress) {
            const addrResult = await client.query(
                `INSERT INTO address(street, city, state, country, zip_code) 
                 VALUES($1, $2, $3, $4, $5) RETURNING id`,
                [shippingAddress.street, shippingAddress.city, shippingAddress.state, 
                 shippingAddress.country, shippingAddress.zipCode]
            );
            shippingAddressId = addrResult.rows[0].id;
        }

        // 2. Tạo Order chính
        const trackingNumber = generateTrackingNumber();
        const orderResult = await client.query(
            `INSERT INTO orders(order_tracking_number, total_price, total_quantity, 
                                customer_id, billing_address_id, shipping_address_id, 
                                status, date_created) 
             VALUES($1, $2, $3, $4, $5, $6, 'PENDING', NOW()) RETURNING id`,
            [trackingNumber, totalPrice, totalQuantity, customerId, 
             billingAddressId, shippingAddressId]
        );

        const orderId = orderResult.rows[0].id;

        for (const item of items) {
            if (!item.productId || !item.quantity || !item.unitPrice) {
                throw new Error("Dữ liệu item trong giỏ hàng không hợp lệ.");
            }

            const productId = parseInt(String(item.productId).replace(/\D+/g, ''), 10);
            if (Number.isNaN(productId)) {
                throw new Error("productId không hợp lệ");
            }
            console.log('🧾 Insert item', { raw: item.productId, parsed: productId, quantity: item.quantity, unitPrice: item.unitPrice });
            
            await client.query(
                `INSERT INTO order_item(order_id, product_id, quantity, unit_price, image_url)
                 VALUES($1, $2, $3, $4, $5)`,
                [orderId, productId, item.quantity, item.unitPrice, item.imageUrl]
            );
        }

        await client.query('COMMIT');

        // Best-effort: publish order created event for shipping
        try { 
            await publishOrderCreated(orderId, customerId, items, totalPrice, 'PENDING'); 
        } catch (e) { 
            console.error('Warning: Could not publish to RabbitMQ:', e.message);
        }

        res.status(201).json({ 
            message: "Tạo đơn hàng thành công",
            orderId: orderId,
            trackingNumber: trackingNumber,
            status: 'PENDING'
        });

    } catch (err) {
        await client.query('ROLLBACK');
        console.error("Lỗi tạo đơn hàng:", err);
        res.status(500).json({ message: "Lỗi server trong quá trình xử lý đơn hàng." });
    } finally {
        client.release();
    }
});

async function publishOrderCreated(orderId, customerId, items, totalPrice, status) {
    if (!amqpChannel) return;
    const payload = { orderId, customerId, items, totalPrice, status };
    try {
        amqpChannel.sendToQueue(SHIPPING_QUEUE, Buffer.from(JSON.stringify(payload)), { persistent: true });
        console.log('Published order event to RabbitMQ:', orderId);
    } catch (err) {
        console.error('Failed to publish to RabbitMQ:', err.message);
        throw err;
    }
}

// GET /api/orders/me (Lấy đơn hàng của customer đang đăng nhập)
app.get("/api/orders/me", protect, async (req, res) => {
    try {
        const ordersResult = await pool.query(
            `SELECT id, order_tracking_number, total_price, total_quantity, 
                    status, date_created 
             FROM orders WHERE customer_id=$1 ORDER BY date_created DESC`,
            [req.customerId]
        );

        const orders = ordersResult.rows;

        if (orders.length === 0) {
            return res.json([]);
        }

        // Lấy order items
        const orderIds = orders.map(o => o.id);
        const itemsResult = await pool.query(
            `SELECT order_id, product_id, quantity, unit_price, image_url 
             FROM order_item WHERE order_id = ANY($1::int[])`, 
            [orderIds]
        );
        
        const itemsMap = itemsResult.rows.reduce((acc, item) => {
            if (!acc[item.order_id]) acc[item.order_id] = [];
            acc[item.order_id].push({
                productId: item.product_id,
                quantity: item.quantity,
                unitPrice: parseFloat(item.unit_price),
                imageUrl: item.image_url
            });
            return acc;
        }, {});

        const ordersWithItems = orders.map(order => ({
            id: order.id,
            trackingNumber: order.order_tracking_number,
            totalPrice: parseFloat(order.total_price),
            totalQuantity: order.total_quantity,
            status: order.status,
            dateCreated: order.date_created,
            items: itemsMap[order.id] || []
        }));

        res.json(ordersWithItems);

    } catch (err) {
        console.error("Lỗi lấy đơn hàng:", err.message);
        res.status(500).json({ message: "Lỗi server khi lấy đơn hàng." });
    }
});

app.get("/api/orders/:id", protect, async (req, res) => {
    try {
        const { id } = req.params;

        const orderResult = await pool.query(
            `SELECT id, order_tracking_number, total_price, total_quantity, 
                    customer_id, billing_address_id, shipping_address_id, 
                    status, date_created, last_updated
             FROM orders WHERE id=$1`,
            [id]
        );

        if (orderResult.rows.length === 0) {
            return res.status(404).json({ message: "Không tìm thấy đơn hàng." });
        }

        const order = orderResult.rows[0];

        // Lấy order items
        const itemsResult = await pool.query(
            `SELECT id, product_id, quantity, unit_price, image_url 
             FROM order_item WHERE order_id=$1`,
            [id]
        );

        res.json({
            id: order.id,
            trackingNumber: order.order_tracking_number,
            totalPrice: parseFloat(order.total_price),
            totalQuantity: order.total_quantity,
            customerId: order.customer_id,
            billingAddressId: order.billing_address_id,
            shippingAddressId: order.shipping_address_id,
            status: order.status,
            dateCreated: order.date_created,
            lastUpdated: order.last_updated,
            items: itemsResult.rows.map(item => ({
                id: item.id,
                productId: item.product_id,
                quantity: item.quantity,
                unitPrice: parseFloat(item.unit_price),
                imageUrl: item.image_url
            }))
        });

    } catch (err) {
        console.error("Lỗi lấy đơn hàng:", err.message);
        res.status(500).json({ message: "Lỗi server." });
    }
});



if (process.env.NODE_ENV !== 'test') {
    pool.connect()
        .then(() => console.log(` Order Service connected to DB`))
        .catch(err => {
            console.error(" Order Service DB ERROR:", err.message);
            process.exit(1); 
        });

    // Initialize RabbitMQ connection (best-effort)
    initRabbit().catch(() => {});

    app.listen(PORT, () =>
        console.log(` Order Service running at http://localhost:${PORT}`)
    );
}

module.exports = app;