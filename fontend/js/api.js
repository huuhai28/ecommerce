// frontend/js/api.js

/**
 * CẤU HÌNH ĐỊA CHỈ IP CỦA MÁY CHỦ MASTER
 * Thay đổi IP này nếu bạn sang mạng khác hoặc IP máy ảo thay đổi.
 */
const MASTER_IP = "192.168.1.111"; 

// Gateway chạy trên NodePort 30004 mà bạn đã cấu hình trong K8s
const BASE_URL = `http://${MASTER_IP}:30004/api`;

/**
 * QUẢN LÝ CÁC ĐƯỜNG DẪN API (ENDPOINTS)
 * Mọi yêu cầu đều đi qua Gateway, Gateway sẽ tự điều hướng vào bên trong.
 */
const API_ENDPOINTS = {
    // Auth & Users (User Service)
    AUTH: {
        LOGIN: `${BASE_URL}/users/login`,
        REGISTER: `${BASE_URL}/users/register`
    },
    // Products (Catalogue Service)
    PRODUCTS: {
        LIST: `${BASE_URL}/products`,
        DETAIL: (id) => `${BASE_URL}/products/${id}`
    },
    // Orders (Order Service)
    ORDERS: {
        CREATE: `${BASE_URL}/orders`,
        MY_ORDERS: `${BASE_URL}/orders/me`
    }
};

// Xuất cấu hình để script.js sử dụng (nếu dùng module) hoặc để biến toàn cục
window.API_ENDPOINTS = API_ENDPOINTS;

console.log("✅ API Config loaded. Gateway URL:", BASE_URL);