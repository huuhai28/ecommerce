// 1. Cài đặt các modules cần thiết (Node.js/Express.js)
// Bạn cần chạy lệnh: npm init -y && npm install express
const express = require('express');
const path = require('path');
const app = express();
const PORT = 3000;

// --- THÊM MIDDLEWARE ĐỂ XỬ LÝ JSON TỪ REQUEST BODY ---
// Điều này rất quan trọng để server có thể đọc được dữ liệu username/password gửi từ frontend
app.use(express.json());

// 2. Định nghĩa thư mục chứa các file tĩnh (HTML, CSS, JS frontend)
// Phục vụ file index.html khi truy cập vào đường dẫn gốc (/)
app.get('/', (req, res) => {
    // Sử dụng path.join để đảm bảo đường dẫn hoạt động trên mọi hệ điều hành
    // __dirname là thư mục hiện tại chứa file server.js
    res.sendFile(path.join(__dirname, 'index.html'));
});

// 3. --- ENDPOINT /LOGIN ĐỂ XỬ LÝ XÁC THỰC (BACKEND LOGIC) ---
// Đây chính là "microservice" đơn giản của bạn
app.post('/login', (req, res) => {
    // Lấy dữ liệu từ body của yêu cầu POST
    const { username, password } = req.body;

    // Định nghĩa tài khoản mẫu (Đây là nơi sau này bạn kết nối với Database/Service khác)
    const VALID_USERNAME = 'admin';
    const VALID_PASSWORD = '123456';

    console.log(`Đã nhận yêu cầu đăng nhập: ${username}`);

    // Thực hiện kiểm tra xác thực
    if (username === VALID_USERNAME && password === VALID_PASSWORD) {
        // Trả về JSON cho biết đăng nhập thành công
        // Trong ứng dụng thực tế, bạn sẽ trả về một JWT (Token) ở đây.
        return res.status(200).json({ 
            success: true, 
            message: 'Đăng nhập thành công' 
        });
    } else {
        // Trả về JSON cho biết đăng nhập thất bại
        return res.status(401).json({ 
            success: false, 
            message: 'Tên người dùng hoặc mật khẩu không đúng.' 
        });
    }
});


// 4. Khởi động Server
app.listen(PORT, () => {
    console.log(`Server đang chạy tại http://localhost:${PORT}`);
    console.log('Sử dụng Ctrl + C để dừng server.');
});

/*
Hướng dẫn chạy:
1. Đảm bảo bạn có Node.js cài đặt.
2. Tạo file server.js và đặt file index.html (trang đăng nhập) cùng thư mục.
3. Mở terminal, chạy các lệnh sau:
   - npm init -y
   - npm install express
   - node server.js
4. Mở trình duyệt và truy cập: http://localhost:3000
*/