// catalogue/server.js

require('dotenv').config();
const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3002; 

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

/* ===================== PRODUCTS ROUTES ===================== */

// GET /api/products (Lấy tất cả sản phẩm)
app.get("/api/products", async (req, res) => {
    try {
        // Giả định bảng products có các cột: id, title, price, category, desc, img
        // NOTE: "desc" là từ khóa SQL nên cần được đặt trong dấu ngoặc kép
        const result = await pool.query('SELECT id, title, price, category, "desc" as desc, img FROM products ORDER BY id DESC');
        res.json(result.rows);
    } catch (err) {
        console.error("Lỗi lấy sản phẩm:", err.message);
        res.status(500).json({ message: "Lỗi server khi lấy danh sách sản phẩm." });
    }
});

// Thêm các route POST, PUT, DELETE cho /api/products nếu cần Admin Panel

/* ===================== RUN SERVER ===================== */

pool.connect()
    .then(() => console.log(`✅ Catalogue Service connected to DB`))
    .catch(err => {
        console.error("❌ Catalogue Service DB ERROR:", err.message);
        process.exit(1); 
    });

app.listen(PORT, () =>
    console.log(`🚀 Catalogue Service running at http://localhost:${PORT}`)
);