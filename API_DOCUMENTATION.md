# Comprehensive API Documentation

## Base URLs
- **Local**: `http://localhost:30004` (via API Gateway)
- **Production**: `https://api.yourdomain.com` (via Ingress)

## Authentication
All requests to Order Service require JWT token in header:
```
Authorization: Bearer YOUR_JWT_TOKEN
```

---

## User Service (Port 3004)

### Register User
```
POST /api/register
Content-Type: application/json

{
  "email": "user@example.com",
  "firstName": "John",
  "lastName": "Doe",
  "password": "SecurePassword123!"
}

Response 201:
{
  "message": "Đăng ký thành công",
  "token": "eyJhbGci...",
  "customer": {
    "id": 1,
    "firstName": "John",
    "lastName": "Doe", 
    "email": "user@example.com"
  }
}
```

### Login User
```
POST /api/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "SecurePassword123!"
}

Response 200:
{
  "message": "Đăng nhập thành công",
  "token": "eyJhbGci...",
  "customer": {
    "id": 1,
    "firstName": "John",
    "lastName": "Doe",
    "email": "user@example.com"
  }
}
```

### Health Check
```
GET /health

Response 200:
{
  "status": "ok"
}
```

---

## Catalogue Service (Port 3002)

### Get All Products
```
GET /api/products

Response 200:
[
  {
    "id": 1,
    "sku": "SKU001",
    "title": "Product Name",
    "price": 99.99,
    "category": "Electronics",
    "desc": "Product description",
    "img": "https://...",
    "active": true,
    "unitsInStock": 50,
    "categoryId": 1
  }
]
```

### Get Product Details
```
GET /api/products/:id

Response 200:
{
  "id": 1,
  "sku": "SKU001",
  "title": "Product Name",
  "price": 99.99,
  "category": "Electronics",
  "desc": "Product description",
  "img": "https://...",
  "active": true,
  "unitsInStock": 50,
  "categoryId": 1
}
```

### Create Product (Admin)
```
POST /api/products
Authorization: Bearer ADMIN_TOKEN
Content-Type: application/json

{
  "sku": "SKU002",
  "name": "New Product",
  "description": "Description",
  "unitPrice": 49.99,
  "imageUrl": "https://...",
  "categoryId": 1,
  "unitsInStock": 100
}

Response 201:
{
  "id": 2,
  "sku": "SKU002",
  "title": "New Product",
  "price": 49.99
}
```

---

## Cart Service (Port 3006)

### Get User Cart
```
GET /api/cart/:userId

Response 200:
{
  "items": [
    {
      "productId": 1,
      "quantity": 2,
      "unitPrice": 99.99
    }
  ],
  "totalQuantity": 2,
  "totalPrice": 199.98
}
```

### Update Cart
```
POST /api/cart/:userId
Content-Type: application/json

{
  "items": [
    {
      "productId": 1,
      "quantity": 2,
      "unitPrice": 99.99
    }
  ],
  "totalQuantity": 2,
  "totalPrice": 199.98
}

Response 200:
{
  "ok": true
}
```

### Clear Cart
```
DELETE /api/cart/:userId

Response 200:
{
  "ok": true
}
```

---

## Order Service (Port 3003)

### Create Order ⭐ (Requires JWT)
```
POST /api/orders
Authorization: Bearer USER_JWT_TOKEN
Content-Type: application/json

{
  "items": [
    {
      "productId": 1,
      "quantity": 2,
      "unitPrice": 99.99,
      "imageUrl": "https://..."
    }
  ],
  "totalPrice": 199.98,
  "totalQuantity": 2,
  "billingAddress": {
    "street": "123 Main St",
    "city": "New York",
    "state": "NY",
    "country": "USA",
    "zipCode": "10001"
  },
  "shippingAddress": {
    "street": "456 Shipping Ave",
    "city": "Los Angeles",
    "state": "CA",
    "country": "USA",
    "zipCode": "90001"
  }
}

Response 201:
{
  "message": "Đặt hàng thành công",
  "orderId": 5,
  "orderTrackingNumber": "ORD-1705521600000-ABC12345",
  "status": "PENDING",
  "totalPrice": 199.98
}
```

### Get Order Details ⭐ (Requires JWT)
```
GET /api/orders/:orderId
Authorization: Bearer USER_JWT_TOKEN

Response 200:
{
  "id": 5,
  "orderTrackingNumber": "ORD-1705521600000-ABC12345",
  "status": "PENDING",
  "totalPrice": 199.98,
  "items": [
    {
      "productId": 1,
      "quantity": 2,
      "unitPrice": 99.99
    }
  ],
  "billingAddress": {...},
  "shippingAddress": {...}
}
```

### List User Orders ⭐ (Requires JWT)
```
GET /api/orders
Authorization: Bearer USER_JWT_TOKEN

Response 200:
[
  {
    "id": 5,
    "orderTrackingNumber": "ORD-...",
    "status": "PENDING",
    "totalPrice": 199.98,
    "dateCreated": "2024-01-18T10:00:00Z"
  }
]
```

---

## Payment Service (Port 3005)

### Process Payment
```
POST /api/payments
Content-Type: application/json

{
  "orderId": 5,
  "amount": 199.98,
  "method": "COD"
}

Response 200:
{
  "ok": true,
  "payment": {
    "id": 1,
    "payment_id": "pay_1705521600000",
    "status": "completed"
  }
}
```

---

## Shipping Service (Port 3007)

### Health Check
```
GET /health

Response 200:
{
  "status": "ok"
}
```

**Note**: Shipping service processes messages from RabbitMQ queue `shipping.requests`. Orders automatically trigger shipping when placed.

---

## Error Responses

### 400 Bad Request
```json
{
  "message": "Validation error description"
}
```

### 401 Unauthorized (Missing/Invalid JWT)
```json
{
  "message": "Không có token hoặc định dạng sai"
}
```

### 403 Forbidden (Invalid Token)
```json
{
  "message": "Token không hợp lệ hoặc đã hết hạn"
}
```

### 409 Conflict (Email exists)
```json
{
  "message": "Email đã tồn tại trong hệ thống."
}
```

### 500 Internal Server Error
```json
{
  "message": "Lỗi server",
  "error": "error details"
}
```

---

## Rate Limits
- No rate limiting implemented (add in production)
- Recommended: 100 requests/min per IP

## Versioning
- Current API Version: v1
- No versioning in URLs (use headers if needed)

## Testing
Use Postman collection: `./postman/ecommerce-api.json`

## Support
Contact: support@ecommerce.local
