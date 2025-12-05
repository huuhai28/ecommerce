// --- Logic Xử Lý Đăng Nhập (Được Tách Riêng) ---

// Lấy các phần tử DOM cần thiết
const loginForm = document.getElementById('loginForm');
const usernameInput = document.getElementById('username');
const passwordInput = document.getElementById('password');
const messageBox = document.getElementById('messageBox');
const loginButton = document.getElementById('loginButton');

/**
 * Hàm hiển thị thông báo trên giao diện
 * @param {string} message - Nội dung thông báo
 * @param {boolean} isSuccess - True nếu thành công, False nếu thất bại
 */
function displayMessage(message, isSuccess) {
    messageBox.classList.remove('hidden');
    messageBox.textContent = message;

    // Thiết lập màu nền và màu chữ dựa trên trạng thái (thành công/thất bại)
    if (isSuccess) {
        messageBox.className = 'text-center p-3 rounded-lg bg-green-100 text-green-800';
    } else {
        messageBox.className = 'text-center p-3 rounded-lg bg-red-100 text-red-800';
    }
}

// Xử lý sự kiện khi form được gửi (nhấn nút Đăng Nhập)
loginForm.addEventListener('submit', async function(event) {
    event.preventDefault();

    // Vô hiệu hóa nút và xóa thông báo cũ
    loginButton.disabled = true;
    loginButton.textContent = 'Đang xử lý...';
    messageBox.classList.add('hidden');

    const username = usernameInput.value.trim();
    const password = passwordInput.value.trim();

    try {
        // Gửi dữ liệu đăng nhập đến endpoint /login của server (Node.js/Express)
        const response = await fetch('/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ username, password })
        });

        const result = await response.json();

        if (response.ok && result.success) {
            displayMessage('Đăng nhập thành công! Chào mừng bạn.', true);
            // Ở đây bạn có thể chuyển hướng người dùng (window.location.href = '/dashboard')
        } else {
            // Xử lý cả lỗi 401 và các lỗi khác
            displayMessage(result.message || 'Lỗi đăng nhập không xác định.', false);
            passwordInput.value = '';
            passwordInput.focus();
        }

    } catch (error) {
        console.error('Lỗi khi kết nối đến server:', error);
        displayMessage('Lỗi kết nối. Vui lòng thử lại sau.', false);
    } finally {
        // Bật lại nút sau khi hoàn tất
        loginButton.disabled = false;
        loginButton.textContent = 'Đăng Nhập';
    }
});