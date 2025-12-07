// backend/server.js
require('dotenv').config();
const express = require('express');
const { Pool } = require('pg');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const cors = require('cors'); // Để cho phép frontend truy cập

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET;

// 1. Cấu hình CORS: Cho phép Frontend (chạy trên cổng khác) truy cập
// TRONG MÔI TRƯỜNG LAB, chúng ta cho phép tất cả (*)
app.use(cors());

// Middleware để đọc JSON
app.use(express.json());

// 2. Kết nối PostgreSQL
const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_DATABASE,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
});

// Chức năng: Middleware bảo vệ API bằng JWT
function protect(req, res, next) {
    const authHeader = req.headers['authorization'];
    // Format: Bearer <token>
    const token = authHeader && authHeader.split(' ')[1]; 
    
    if (token == null) return res.status(401).json({ message: 'Không có token, truy cập bị từ chối' });

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) return res.status(403).json({ message: 'Token không hợp lệ hoặc hết hạn' });
        req.userId = user.userId; // Trích xuất userId từ token
        next();
    });
}

// ------------------- ENDPOINTS -------------------

// POST /api/register
app.post('/api/register', async (req, res) => {
    const { email, name, password } = req.body;
    try {
        if (!password) {
            return res.status(400).json({ message: 'Mật khẩu là bắt buộc' });
        }
        // Băm mật khẩu (Hash password)
        const password_hash = await bcrypt.hash(password, 10);
        
        // Chèn người dùng mới
        const result = await pool.query(
            'INSERT INTO users (email, name, password_hash) VALUES ($1, $2, $3) RETURNING id',
            [email, name, password_hash]
        );
        res.status(201).json({ message: 'Đăng ký thành công', userId: result.rows[0].id });

    } catch (err) {
        if (err.code === '23505') { // Lỗi unique (ví dụ: email đã tồn tại)
            return res.status(409).json({ message: 'Email đã tồn tại' });
        }
        console.error('Lỗi đăng ký:', err);
        res.status(500).json({ message: 'Lỗi máy chủ khi đăng ký' });
    }
});

// POST /api/login
app.post('/api/login', async (req, res) => {
    const { email, password } = req.body;
    try {
        // 1. Tìm người dùng
        const result = await pool.query('SELECT id, password_hash, name FROM users WHERE email = $1', [email]);
        const user = result.rows[0];

        if (!user) {
            return res.status(401).json({ message: 'Email hoặc mật khẩu không đúng' });
        }

        // 2. So sánh mật khẩu
        const isMatch = await bcrypt.compare(password, user.password_hash);
        if (!isMatch) {
            return res.status(401).json({ message: 'Email hoặc mật khẩu không đúng' });
        }
        
        // 3. Tạo JWT
        const token = jwt.sign({ userId: user.id, email: email }, JWT_SECRET, { expiresIn: '1d' });
        
        // Trả về Token và thông tin cơ bản
        res.json({ token, user: { id: user.id, name: user.name, email: email } });

    } catch (err) {
        console.error('Lỗi đăng nhập:', err);
        res.status(500).json({ message: 'Lỗi máy chủ' });
    }
});

// GET /api/cart (Ví dụ về Endpoint được bảo vệ)
app.get('/api/cart', protect, (req, res) => {
    // Trong môi trường lab, chỉ trả về một thông báo đơn giản
    res.json({ message: `Dữ liệu giỏ hàng của User ID: ${req.userId} (Được xác thực qua JWT)` });
});


// Khởi động server
app.listen(PORT, () => {
    console.log(`Server Backend chạy trên http://localhost:${PORT}`);
});