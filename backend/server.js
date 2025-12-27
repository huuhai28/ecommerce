// backend/server.js
const express = require('express');
const cors = require('cors');
const { createProxyMiddleware } = require('http-proxy-middleware');

const app = express();
const PORT = process.env.PORT || 3010;

// 1. Cho phép Frontend truy cập (CORS)
app.use(cors());

/**
 * 2. ĐIỀU HƯỚNG PROXY (SERVICE DISCOVERY)
 * Trong K8s, ta gọi các service bằng tên Service Name thay vì IP.
 */

const logProxyHit = (label) => (req, res, next) => {
    console.log(`[Proxy:${label}] ${req.method} ${req.originalUrl}`);
    next();
};

// Điều hướng Login/Register sang User Service (Cổng 3004)
app.use('/api/users', logProxyHit('users'), createProxyMiddleware({
    target: 'http://user-service:3004',
    changeOrigin: true,
    pathRewrite: { '^/api/users': '/api' } // Chuyển /api/users/login thành /api/login khi gửi tới user-service
}));
app.get('/health', (req, res) => {
    res.json({ status: 'ok', routes: Object.keys(app._router.stack).length });
});

app.get('/debug/routes', (req, res) => {
    const routes = app._router.stack
        .map(layer => (layer.route && layer.route.path) || null)
        .filter(Boolean);
    res.json(routes);
});

console.log('🔗 Proxying /api/users to http://user-service:3004');

// Điều hướng Sản phẩm sang Catalogue Service (Cổng 3002)
app.use('/api/products', logProxyHit('products'), createProxyMiddleware({
    target: 'http://catalogue-service:3002/api',
    changeOrigin: true,
    pathRewrite: { '^/api/products': '/products' }
}));


// Điều hướng Đơn hàng sang Order Service (Cổng 3003)
app.use('/api/orders', logProxyHit('orders'), createProxyMiddleware({
    target: 'http://order-service:3003',
    changeOrigin: true,
    pathRewrite: { '^/api/orders': '/api/orders' }
}));
console.log("🔗 Proxying /api/orders to http://order-service:3003");

// 3. Khởi chạy Gateway
app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 API Gateway is running on port ${PORT}`);
});