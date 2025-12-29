# Hướng dẫn Debug lỗi "Không đặt được đơn hàng"

## Vấn đề
- Giỏ hàng có sản phẩm nhưng không đặt được đơn
- Thông báo lỗi: "Thiếu thông tin giỏ hàng hoặc tổng tiền"

## Các bước kiểm tra

### 1. Xóa cache trình duyệt
```
1. Mở DevTools (F12)
2. Vào tab Application
3. Xóa localStorage và cache
4. Hoặc nhấn Ctrl+Shift+Delete để xóa cache
5. Refresh lại trang (Ctrl+F5)
```

### 2. Kiểm tra console trình duyệt
Mở DevTools (F12) > Console và xem:
- Có request nào tới `/api/orders` không?
- Response trả về là gì?
- Có lỗi CORS hoặc Network không?

### 3. Kiểm tra log của order-service
```bash
# Xem log order-service
kubectl logs -n ecommerce -l app=order-service --tail=100

# Hoặc follow log real-time
kubectl logs -n ecommerce -l app=order-service -f
```

### 4. Test API trực tiếp
```bash
# Login trước để lấy token
curl -X POST http://192.168.1.112:30004/api/users/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"123456"}'

# Sau đó test tạo order (thay <TOKEN> bằng token từ bước trên)
curl -X POST http://192.168.1.112:30004/api/orders \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <TOKEN>" \
  -d '{
    "items": [
      {
        "productId": "p2",
        "quantity": 4,
        "unitPrice": 499000,
        "imageUrl": "https://picsum.photos/seed/t2/800/600"
      }
    ],
    "totalPrice": 2026000,
    "totalQuantity": 4,
    "shippingAddress": {
      "street": "Test - 0123456789 - 123 ABC",
      "city": "N/A",
      "state": "N/A",
      "country": "Vietnam",
      "zipCode": "000000"
    }
  }'
```

### 5. Rebuild frontend nếu cần
Nếu trình duyệt vẫn dùng code cũ:
```powershell
cd c:\fullstack\Doan\frontend
docker build -t huuhai123/frontend-service:latest .
docker push huuhai123/frontend-service:latest

# Restart pod
kubectl rollout restart deployment frontend-service -n ecommerce
```

## Code đã sửa

### ✅ Shipping Service đã fix
File: `services/shipping/server.js`
- Đã xóa foreign key constraint `REFERENCES orders(id)` 
- Giờ chỉ còn `order_id INT` (không có ràng buộc)

### ✅ Frontend đang gửi đúng data
File: `frontend/js/script.v2.js` (line 353-374)
```javascript
{
  items: [
    {
      productId: "p2",
      quantity: 4,
      unitPrice: 499000,
      imageUrl: "..."
    }
  ],
  totalPrice: 2026000,
  totalQuantity: 4,
  shippingAddress: {
    street: "Name - Phone - Address",
    city: "N/A",
    state: "N/A",
    country: "Vietnam",
    zipCode: "000000"
  }
}
```

### ✅ Backend đang validate đúng
File: `services/order/server.js` (line 78-84)
- Backend chỉ báo lỗi "Giỏ hàng trống" nếu `!items || items.length === 0`
- Thông báo "Thiếu thông tin giỏ hàng hoặc tổng tiền" không có trong backend

## Kết luận
Rất có thể trình duyệt đang cache code cũ. Hãy thử:
1. Hard refresh (Ctrl+F5)
2. Xóa cache trình duyệt
3. Kiểm tra DevTools Console xem request thực tế
4. Xem log order-service để biết request có tới không

## Test nhanh
1. Mở DevTools (F12)
2. Vào tab Network
3. Thử đặt hàng lại
4. Tìm request `/api/orders` 
5. Xem Request Payload và Response để biết chính xác lỗi gì
