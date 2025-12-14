// user/server.js

require('dotenv').config();
const express = require('express');
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');

const app = express();
// Lấy cổng từ biến môi trường (Docker Compose sẽ truyền vào 3001)
const PORT = process.env.PORT || 3001; 
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

// ---------------- Middleware Bảo vệ (JWT) - Dùng cho các service khác nếu cần ----------------
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
        req.userId = decoded.userId;
        next();
    });
}

/* ===================== USER/AUTH ROUTES ===================== */

// POST /api/register
app.post("/api/register", async (req, res) => {
    try {
        const { email, name, password } = req.body;
        const hash = await bcrypt.hash(password, 10);

        const result = await pool.query(
            "INSERT INTO users (email, name, password_hash) VALUES ($1,$2,$3) RETURNING id",
            [email, name, hash]
        );

        res.status(201).json({ message: "Đăng ký thành công", userId: result.rows[0].id });

    } catch (err) {
        if (err.code === "23505") { 
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

        res.json({ 
            token, 
            user: { id: user.id, name: user.name, email: user.email } 
        });

    } catch (err) {
        console.error("Lỗi đăng nhập:", err.message);
        res.status(500).json({ message: "Lỗi server trong quá trình đăng nhập." });
    }
});


/* ===================== RUN SERVER ===================== */

pool.connect()
    .then(() => console.log(`✅ User Service connected to DB`))
    .catch(err => {
        console.error("❌ User Service DB ERROR:", err.message);
        process.exit(1); 
    });

app.listen(PORT, () =>
    console.log(`🚀 User Service running at http://localhost:${PORT}`)
);