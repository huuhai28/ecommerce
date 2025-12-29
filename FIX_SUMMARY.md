# Lệnh cần chạy trên Master Node

## Bước 1: Xóa pod order-service cũ
```bash
kubectl delete pod -n ecommerce -l app=order-service
```

## Bước 2: Kiểm tra pod mới đã chạy
```bash
kubectl get pod -n ecommerce -l app=order-service
```

## Bước 3: Test API lại
Sau khi pod mới chạy, test lại API bằng PowerShell (chạy từ Windows):

```powershell
# 1. Login
$loginResponse = Invoke-WebRequest -Uri "http://192.168.1.112:30004/api/users/login" -Method POST -ContentType "application/json" -Body '{"email":"hai@gmail.com","password":"123"}' -UseBasicParsing
$loginData = $loginResponse.Content | ConvertFrom-Json
$token = $loginData.token
Write-Host "Token: $token"

# 2. Tạo đơn hàng
$orderBody = @{
  items = @(
    @{
      productId = "p2"
      quantity = 4
      unitPrice = 499000
      imageUrl = "https://picsum.photos/seed/t2/800/600"
    }
  )
  totalPrice = 2026000
  totalQuantity = 4
  shippingAddress = @{
    street = "Hai - 0123456789 - 123 Test Street"
    city = "N/A"
    state = "N/A"
    country = "Vietnam"
    zipCode = "000000"
  }
} | ConvertTo-Json -Depth 10

$orderResponse = Invoke-WebRequest -Uri "http://192.168.1.112:30004/api/orders" -Method POST -ContentType "application/json" -Headers @{Authorization="Bearer $token"} -Body $orderBody -UseBasicParsing
$orderData = $orderResponse.Content | ConvertFrom-Json

Write-Host "Order ID: $($orderData.orderId)"
Write-Host "Tracking Number: $($orderData.trackingNumber)"
Write-Host "Status: $($orderData.status)"
```

## Bước 4: Test từ trình duyệt
Sau khi API hoạt động, refresh trình duyệt (Ctrl+F5) và thử đặt hàng lại.

---

## Kết quả đã test

### ✅ API đang hoạt động
- Login: **THÀNH CÔNG** với user "hai@gmail.com"
- Token được tạo đúng

### ❌ Order API trả lỗi
- Lỗi: "Thiếu thông tin giỏ hàng hoặc tổng tiền"
- Nguyên nhân: **Order-service đang chạy IMAGE CŨ**

### ✅ Đã rebuild và push image mới
- Image mới: `huuhai123/order-service:latest`
- Digest: `sha256:f66dea4558594618d5e3c3742e2a671edf0e4bd1f8e711118cf32d16fb3e02f7`

### 🔧 Cần làm tiếp
1. SSH vào master node
2. Chạy: `kubectl delete pod -n ecommerce -l app=order-service`
3. Đợi pod mới khởi động
4. Test lại API

---

## Các vấn đề đã phát hiện

### 1. Shipping-service: ✅ ĐÃ SỬA
- File: `services/shipping/server.js`
- Lỗi: Foreign key constraint `REFERENCES orders(id)`
- Sửa: Đã xóa constraint, chỉ còn `order_id INT`
- **CẦN: Rebuild và restart pod**

### 2. Order-service: ✅ IMAGE MỚI ĐÃ PUSH
- Lỗi: Đang chạy code cũ
- Sửa: Đã build và push image mới
- **CẦN: Xóa pod cũ để pull image mới**

### 3. Frontend: ⚠️ CÓ THỂ BỊ CACHE
- Code đúng nhưng trình duyệt có thể cache
- Giải pháp: Ctrl+F5 để hard refresh
