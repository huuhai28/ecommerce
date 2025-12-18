const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const app = express();

// Điều hướng sang User Service
app.use('/api/users', createProxyMiddleware({ 
    target: 'http://user-service:3004', 
    changeOrigin: true 
}));

// Điều hướng sang Catalogue Service
app.use('/api/products', createProxyMiddleware({ 
    target: 'http://catalogue-service:3002', 
    changeOrigin: true 
}));

// Điều hướng sang Order Service
app.use('/api/orders', createProxyMiddleware({ 
    target: 'http://order-service:3003', 
    changeOrigin: true 
}));

app.listen(3004, '0.0.0.0', () => {
    console.log('API Gateway is running on port 3004');
});