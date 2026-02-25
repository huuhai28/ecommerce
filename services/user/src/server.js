
require('dotenv').config();
const express = require('express');
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const app = express();
const PORT = process.env.PORT || 3001; 
const JWT_SECRET = process.env.JWT_SECRET; 
const SERVICE_NAME = 'user';

app.use(express.json());

function makeRequestId() {
    return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function log(level, message, meta = {}) {
    const timestamp = new Date().toISOString();
    const parts = [`${timestamp}`, level, `service=${SERVICE_NAME}`, message];
    if (meta.requestId) parts.push(`requestId=${meta.requestId}`);
    if (meta.userId !== undefined) parts.push(`userId=${meta.userId}`);
    if (meta.status !== undefined) parts.push(`status=${meta.status}`);
    if (meta.latencyMs !== undefined) parts.push(`latency=${meta.latencyMs}ms`);
    if (meta.method && meta.path) parts.push(`route=${meta.method} ${meta.path}`);
    console.log(parts.join(' '));
}

app.use((req, res, next) => {
    req.requestId = req.headers['x-request-id'] || makeRequestId();
    const start = Date.now();
    res.on('finish', () => {
        log('INFO', 'http', {
            requestId: req.requestId,
            status: res.statusCode,
            latencyMs: Date.now() - start,
            method: req.method,
            path: req.originalUrl,
        });
    });
    next();
});

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST, 
    database: process.env.DB_DATABASE,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
});

app.get('/health', async (req, res) => {
    try {
        const startDb = Date.now();
        await pool.query('SELECT 1');
        log('INFO', 'health', { requestId: req.requestId, status: 200, latencyMs: Date.now() - startDb });
        res.json({ status: 'ok' });
    } catch (err) {
        log('ERROR', 'health', { requestId: req.requestId, status: 500 });
        res.status(500).json({ status: 'error', error: err.message });
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


app.post("/api/register", async (req, res) => {
    try {
        const startReq = Date.now();
        const { email, firstName, lastName, password } = req.body;

        log('INFO', 'register_request', { requestId: req.requestId, status: 'start' });

        const safeFirst = (firstName || "").trim();
        const safeLast = (lastName || "").trim() || safeFirst; 

        if (!email || !safeFirst || !password) {
            log('WARN', 'register_validation_failed', { requestId: req.requestId, status: 400 });
            return res.status(400).json({ message: "Thiếu thông tin bắt buộc." });
        }

        const hash = await bcrypt.hash(password, 10);

        const result = await pool.query(
            "INSERT INTO customer (email, first_name, last_name, password_hash, date_created) VALUES ($1,$2,$3,$4,NOW()) RETURNING id, first_name, last_name, email",
            [email, safeFirst, safeLast, hash]
        );

        const newCustomer = result.rows[0];
        const token = jwt.sign(
            { customerId: newCustomer.id },
            JWT_SECRET,
            { expiresIn: "1d" }
        );

        log('INFO', 'register_success', { requestId: req.requestId, userId: newCustomer.id, status: 201, latencyMs: Date.now() - startReq });
        res.status(201).json({ 
            message: "Đăng ký thành công",
            token,
            customer: { 
                id: newCustomer.id, 
                firstName: newCustomer.first_name, 
                lastName: newCustomer.last_name, 
                email: newCustomer.email 
            } 
        });

    } catch (err) {
        if (err.code === "23505") { 
            log('WARN', 'register_conflict', { requestId: req.requestId, status: 409 });
            return res.status(409).json({ message: "Email đã tồn tại trong hệ thống." });
        }
        log('ERROR', 'register_error', { requestId: req.requestId, status: 500 });
        console.error(err);
        res.status(500).json({ message: "Lỗi server trong quá trình đăng ký." });
    }
});

app.post("/api/login", async (req, res) => {
    try {
        const startReq = Date.now();
        const { email, password } = req.body;

        log('INFO', 'login_request', { requestId: req.requestId, status: 'start' });

        if (!email || !password) {
            log('WARN', 'login_validation_failed', { requestId: req.requestId, status: 400 });
            return res.status(400).json({ message: "Email và password là bắt buộc." });
        }

        const result = await pool.query(
            "SELECT id, first_name, last_name, email, password_hash FROM customer WHERE email=$1",
            [email]
        );

        if (result.rows.length === 0) {
            log('WARN', 'login_failed', { requestId: req.requestId, status: 401 });
            return res.status(401).json({ message: "Email hoặc mật khẩu không chính xác." });
        }

        const customer = result.rows[0];

        const ok = await bcrypt.compare(password, customer.password_hash);
        if (!ok) {
            log('WARN', 'login_failed', { requestId: req.requestId, status: 401 });
            return res.status(401).json({ message: "Email hoặc mật khẩu không chính xác." });
        }

        const token = jwt.sign(
            { customerId: customer.id },
            JWT_SECRET,
            { expiresIn: "1d" }
        );

        log('INFO', 'login_success', { requestId: req.requestId, userId: customer.id, status: 200, latencyMs: Date.now() - startReq });
        res.json({ 
            token, 
            customer: { 
                id: customer.id, 
                firstName: customer.first_name, 
                lastName: customer.last_name, 
                email: customer.email 
            } 
        });

    } catch (err) {
        log('ERROR', 'login_error', { requestId: req.requestId, status: 500 });
        console.error(err);
        res.status(500).json({ message: "Lỗi server trong quá trình đăng nhập." });
    }
});

app.get("/api/customers/:id", protect, async (req, res) => {
    try {
        const startReq = Date.now();
        const { id } = req.params;
        const result = await pool.query(
            "SELECT id, first_name, last_name, email, date_created FROM customer WHERE id=$1",
            [id]
        );

        if (result.rows.length === 0) {
            log('WARN', 'customer_not_found', { requestId: req.requestId, userId: id, status: 404, latencyMs: Date.now() - startReq });
            return res.status(404).json({ message: "Không tìm thấy khách hàng." });
        }

        const customer = result.rows[0];
        log('INFO', 'customer_found', { requestId: req.requestId, userId: customer.id, status: 200, latencyMs: Date.now() - startReq });
        res.json({ 
            id: customer.id, 
            firstName: customer.first_name, 
            lastName: customer.last_name, 
            email: customer.email,
            dateCreated: customer.date_created
        });
    } catch (err) {
        log('ERROR', 'customer_fetch_error', { requestId: req.requestId, status: 500 });
        console.error(err);
        res.status(500).json({ message: "Lỗi server." });
    }
});



if (process.env.NODE_ENV !== 'test') {
    pool.connect()
        .then(() => log('INFO', 'db_connected'))
        .catch(err => {
            log('ERROR', 'db_connection_error', { status: 'failed' });
            console.error(err);
            process.exit(1); 
        });

    app.listen(PORT, () =>
        log('INFO', `server_listening port=${PORT}`)
    );
}

module.exports = app;