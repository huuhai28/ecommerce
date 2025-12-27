# Migration Notes: Do an → Fullstack Schema

## 📋 Tóm tắt các thay đổi

Dự án **"Do an"** đã được cập nhật để sử dụng schema database giống như **"Fullstack-Ecommerce-Web"**, nhưng vẫn giữ nguyên:
- ✅ Frontend: HTML/CSS/JavaScript vanilla
- ✅ Backend: Node.js
- ✅ Database: PostgreSQL

---

## 🗄️ Database Schema Changes

### 1. **Users → Customer**
**Old:** 
```sql
users (id, email, name, password_hash)
```

**New:**
```sql
customer (id, first_name, last_name, email, password_hash, date_created, last_updated)
```

**Impact:** Auth endpoints now require `firstName` và `lastName` instead of `name`

---

### 2. **Products → Product + Product_Category**
**Old:**
```sql
products (id TEXT PRIMARY KEY, title, price, category, img, desc)
```

**New:**
```sql
product (id SERIAL, sku, name, description, unit_price, image_url, active, units_in_stock, date_created, last_updated, category_id)
product_category (id, category_name)
```

**Impact:** Products now have proper relationships with categories

---

### 3. **Orders Restructure**
**Old:**
```sql
orders (id, user_id, total, status, created_at)
order_items (id, order_id, product_id, quantity, price)
```

**New:**
```sql
orders (id, order_tracking_number, total_price, total_quantity, customer_id, 
        billing_address_id, shipping_address_id, status, date_created, last_updated)
order_item (id, image_url, quantity, unit_price, order_id, product_id)
address (id, street, city, state, country, zip_code)
```

**Impact:** 
- Orders now have tracking numbers
- Support for billing & shipping addresses
- Better order management

---

### 4. **New Tables Added**
- ✅ `address` - For billing & shipping addresses
- ✅ `product_category` - For product categories
- ✅ `country` - Available countries
- ✅ `state` - States/regions
- ✅ `payment` - Payment records
- ✅ `shipping` - Shipping records

---

## 🔄 API Endpoint Changes

### User Service (Port 3004)

**Register:**
```javascript
// Before
POST /api/register
{ email, password, name }

// After
POST /api/register
{ email, password, firstName, lastName }
```

**Response:**
```javascript
// Before
{ token, user: { id, name, email } }

// After
{ token, customer: { id, firstName, lastName, email } }
```

---

### Catalogue Service (Port 3002)

**List Products:**
```javascript
// Response now includes
{
    id, sku, title, price, category, desc, img,
    active, unitsInStock, dateCreated, categoryId
}
```

**New Endpoints:**
- `GET /api/products/:id` - Get product details
- `GET /api/categories` - Get all categories

---

### Order Service (Port 3003)

**Create Order:**
```javascript
// Before
POST /api/orders
{ items: [{id, quantity, price}], total }

// After
POST /api/orders
{
    items: [{productId, quantity, unitPrice, imageUrl}],
    totalPrice,
    totalQuantity,
    billingAddress: {street, city, state, country, zipCode},
    shippingAddress: {street, city, state, country, zipCode}
}
```

**Response:**
```javascript
{
    orderId,
    trackingNumber,  // NEW
    status: 'PENDING'
}
```

**New Endpoints:**
- `GET /api/orders/:id` - Get order details
- `GET /api/orders/me` - Get customer's orders

---

## 🎨 Frontend Changes

### Authentication
```javascript
// Before: User splits into firstName/lastName automatically
// After: Register form still uses single name, but splits on frontend

const nameParts = name.split(/\s+/);
const firstName = nameParts[0];
const lastName = nameParts.slice(1).join(' ');
```

### Order Creation
```javascript
// Before: Simple checkout with phone & address text
// After: Structured form with street, city, state, country, zipCode

const shippingAddress = {
    street: form.street,
    city: form.city,
    state: form.state,
    country: form.country,
    zipCode: form.zipCode
};
```

### Order Display
```javascript
// Before: order.created_at, order.total
// After: order.dateCreated, order.totalPrice, order.trackingNumber
```

---

## 📦 Sample Data

### Product Categories
- BOOKS
- CLOTHING
- SHOES
- ACCESSORIES

### Countries
- Vietnam (VN)
- United States (US)
- Brazil (BR)
- Canada (CA)

---

## 🚀 Running the Application

```bash
# 1. Start Docker Compose
docker-compose up -d

# 2. Check services are healthy
curl http://localhost:3010/health

# 3. Test endpoints
curl http://localhost:3010/api/products
curl http://localhost:3010/api/categories
```

---

## ⚠️ Breaking Changes

| Component | Breaking Change | Migration |
|-----------|-----------------|-----------|
| Auth | `name` → `firstName`, `lastName` | Update register form |
| Auth Response | `user` → `customer` | Update frontend parsing |
| Products | `id` is now SERIAL, `sku` is unique | Update product creation |
| Orders | `total` → `totalPrice`, `user_id` → `customer_id` | All order logic updated |
| JWT Claims | `userId` → `customerId` | Backend services updated |

---

## ✅ Testing Checklist

- [ ] Database initializes correctly with new schema
- [ ] Register new customer with firstName/lastName
- [ ] Login works and returns JWT token
- [ ] Products load with categories
- [ ] Add products to cart
- [ ] Checkout creates order with addresses
- [ ] View order history
- [ ] Orders show tracking number and correct status

---

## 📝 Notes

- All backend services use `customerId` instead of `userId` from JWT
- Product images are stored as URLs
- Orders include tracking numbers for reference
- Addresses are linked to orders via foreign keys
- No data loss migration needed (fresh database)
