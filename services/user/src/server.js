
require('dotenv').config();
const express = require('express');
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const app = express();
const PORT = process.env.PORT || 3001; 
const JWT_SECRET = process.env.JWT_SECRET; 

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
        res.json({ status: 'ok' });
    } catch (err) {
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
        const { email, firstName, lastName, password } = req.body;

        const safeFirst = (firstName || "").trim();
        const safeLast = (lastName || "").trim() || safeFirst; 

        if (!email || !safeFirst || !password) {
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
            return res.status(409).json({ message: "Email đã tồn tại trong hệ thống." });
        }
        console.error("Lỗi đăng ký:", err.message);
        res.status(500).json({ message: "Lỗi server trong quá trình đăng ký." });
    }
});

app.post("/api/login", async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ message: "Email và password là bắt buộc." });
        }

        const result = await pool.query(
            "SELECT id, first_name, last_name, email, password_hash FROM customer WHERE email=$1",
            [email]
        );

        if (result.rows.length === 0)
            return res.status(401).json({ message: "Email hoặc mật khẩu không chính xác." });

        const customer = result.rows[0];

        const ok = await bcrypt.compare(password, customer.password_hash);
        if (!ok)
            return res.status(401).json({ message: "Email hoặc mật khẩu không chính xác." });

        const token = jwt.sign(
            { customerId: customer.id },
            JWT_SECRET,
            { expiresIn: "1d" }
        );

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
        console.error("Lỗi đăng nhập:", err.message);
        res.status(500).json({ message: "Lỗi server trong quá trình đăng nhập." });
    }
});

app.get("/api/customers/:id", protect, async (req, res) => {
    try {
        const { id } = req.params;
        const result = await pool.query(
            "SELECT id, first_name, last_name, email, date_created FROM customer WHERE id=$1",
            [id]
        );

        if (result.rows.length === 0)
            return res.status(404).json({ message: "Không tìm thấy khách hàng." });

        const customer = result.rows[0];
        res.json({ 
            id: customer.id, 
            firstName: customer.first_name, 
            lastName: customer.last_name, 
            email: customer.email,
            dateCreated: customer.date_created
        });
    } catch (err) {
        console.error("Lỗi lấy customer:", err.message);
        res.status(500).json({ message: "Lỗi server." });
    }
});



if (process.env.NODE_ENV !== 'test') {
    pool.connect()
        .then(() => console.log(`User Service connected to DB`))
        .catch(err => {
            console.error("User Service DB ERROR:", err.message);
            process.exit(1); 
        });

    app.listen(PORT, () =>
        console.log(`User Service running at http://localhost:${PORT}`)
    );
}

module.exports = app;