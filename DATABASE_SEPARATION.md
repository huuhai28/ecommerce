# Tách Database Cho Từng Service

## Tổng Quan

Dự án đã được cấu hình lại để mỗi microservice có database PostgreSQL riêng thay vì dùng chung một database. Điều này tuân theo nguyên tắc microservice architecture và database-per-service pattern.

## Các Database Đã Tạo

1. **user_db** - Cho User Service
   - Tables: customer, address
   
2. **catalogue_db** - Cho Catalogue Service  
   - Tables: product, product_category, country, state
   
3. **order_db** - Cho Order Service
   - Tables: orders, order_item, address
   
4. **payment_db** - Cho Payment Service
   - Tables: payments
   
5. **shipping_db** - Cho Shipping Service
   - Tables: shipping

## Các File Đã Thay Đổi

### 1. Database Init Scripts (db/)

Đã tạo các file init SQL riêng:
- `db/init-user.sql` - Khởi tạo user_db
- `db/init-catalogue.sql` - Khởi tạo catalogue_db  
- `db/init-order.sql` - Khởi tạo order_db
- `db/init-payment.sql` - Khởi tạo payment_db
- `db/init-shipping.sql` - Khởi tạo shipping_db

### 2. Docker Compose (docker-compose.yml)

**Thay đổi:**
- Xóa `postgres_db` chung
- Thêm 5 PostgreSQL containers riêng: `user_db`, `catalogue_db`, `order_db`, `payment_db`, `shipping_db`
- Cập nhật environment variables của các services để kết nối đúng database
- Thay đổi volumes từ `postgres_data` thành các volume riêng

**Các services cập nhật:**
```yaml
user_service:
  environment:
    DB_HOST: user_db
    DB_DATABASE: user_db

catalogue_service:  
  environment:
    DB_HOST: catalogue_db
    DB_DATABASE: catalogue_db

order_service:
  environment:
    DB_HOST: order_db
    DB_DATABASE: order_db

payment_service:
  environment:
    DB_HOST: payment_db
    DB_DATABASE: payment_db

shipping_service:
  environment:
    DB_HOST: shipping_db
    DB_DATABASE: shipping_db
```

### 3. Kubernetes Deployments (k8s/)

**Đã tạo mới:**
- `k8s/user-db-deployment.yaml`
- `k8s/catalogue-db-deployment.yaml`
- `k8s/order-db-deployment.yaml`
- `k8s/payment-db-deployment.yaml`
- `k8s/shipping-db-deployment.yaml`

**Đã cập nhật:**
- `k8s/user-deployment.yaml` - Kết nối đến `user-db`
- `k8s/catalogue-deployment.yaml` - Kết nối đến `catalogue-db`
- `k8s/order-deployment.yaml` - Kết nối đến `order-db`
- `k8s/payment-deployment.yaml` - Kết nối đến `payment-db`
- `k8s/shipping-deployment.yaml` - Kết nối đến `shipping-db`

## Lưu Ý Quan Trọng

### Foreign Keys Giữa Databases

Do mỗi service giờ có database riêng, các foreign key constraints giữa các bảng thuộc services khác nhau đã bị loại bỏ:

- `orders.customer_id` - Không còn FK constraint đến `customer.id` (khác DB)
- `order_item.product_id` - Không còn FK constraint đến `product.id` (khác DB)
- `payments.order_id` - Không còn FK constraint đến `orders.id` (khác DB)
- `shipping.order_id` - Không còn FK constraint đến `orders.id` (khác DB)

**Hệ quả:** Các services phải tự quản lý referential integrity thông qua application logic và API calls.

### Data Migration

Nếu bạn đã có dữ liệu từ database cũ, bạn cần:

1. Export dữ liệu từ `postgres_db` cũ
2. Chia dữ liệu theo các tables thuộc về mỗi service
3. Import vào các database tương ứng

## Cách Chạy

### Docker Compose

```bash
# Dừng containers cũ và xóa volumes cũ (nếu có)
docker-compose down -v

# Khởi động với cấu hình mới
docker-compose up -d

# Kiểm tra logs
docker-compose logs -f
```

### Kubernetes

```bash
# Apply các database deployments trước
kubectl apply -f k8s/namespace.yaml
kubectl apply -f k8s/secret.yaml
kubectl apply -f k8s/user-db-deployment.yaml
kubectl apply -f k8s/catalogue-db-deployment.yaml
kubectl apply -f k8s/order-db-deployment.yaml
kubectl apply -f k8s/payment-db-deployment.yaml
kubectl apply -f k8s/shipping-db-deployment.yaml

# Chờ databases khởi động
kubectl wait --for=condition=ready pod -l app=user-db -n ecommerce --timeout=60s
kubectl wait --for=condition=ready pod -l app=catalogue-db -n ecommerce --timeout=60s
kubectl wait --for=condition=ready pod -l app=order-db -n ecommerce --timeout=60s
kubectl wait --for=condition=ready pod -l app=payment-db -n ecommerce --timeout=60s
kubectl wait --for=condition=ready pod -l app=shipping-db -n ecommerce --timeout=60s

# Apply các service deployments
kubectl apply -f k8s/user-deployment.yaml
kubectl apply -f k8s/catalogue-deployment.yaml
kubectl apply -f k8s/order-deployment.yaml
kubectl apply -f k8s/payment-deployment.yaml
kubectl apply -f k8s/shipping-deployment.yaml
```

## Kiểm Tra Kết Nối Database

### Docker Compose

```bash
# Kiểm tra user_db
docker exec -it user_db psql -U postgres -d user_db -c "\dt"

# Kiểm tra catalogue_db  
docker exec -it catalogue_db psql -U postgres -d catalogue_db -c "\dt"

# Kiểm tra order_db
docker exec -it order_db psql -U postgres -d order_db -c "\dt"

# Kiểm tra payment_db
docker exec -it payment_db psql -U postgres -d payment_db -c "\dt"

# Kiểm tra shipping_db
docker exec -it shipping_db psql -U postgres -d shipping_db -c "\dt"
```

### Kubernetes

```bash
# Kiểm tra user-db
kubectl exec -it -n ecommerce deployment/user-db -- psql -U postgres -d user_db -c "\dt"

# Kiểm tra catalogue-db
kubectl exec -it -n ecommerce deployment/catalogue-db -- psql -U postgres -d catalogue_db -c "\dt"

# Tương tự cho các database khác...
```

## Lợi Ích Của Kiến Trúc Mới

1. **Độc lập dữ liệu**: Mỗi service quản lý dữ liệu riêng, dễ scale và maintain
2. **Fault isolation**: Lỗi database của một service không ảnh hưởng đến services khác
3. **Flexibility**: Mỗi service có thể chọn DB engine khác nhau trong tương lai
4. **Team autonomy**: Các team có thể làm việc độc lập trên database của service mình

## Nhược Điểm Cần Lưu Ý

1. **No foreign key constraints**: Phải đảm bảo data integrity ở application layer
2. **Transactions**: Không thể dùng ACID transactions giữa các services
3. **Joins**: Không thể JOIN giữa tables của các services khác nhau
4. **Data duplication**: Có thể cần duplicate một số dữ liệu (như address)

## Recommendations

1. Implement eventual consistency cho cross-service operations
2. Sử dụng saga pattern cho distributed transactions
3. Implement API-based joins thay vì database joins
4. Monitor database performance của từng service riêng
5. Backup từng database độc lập

---

Được tạo ngày: 25/12/2025
