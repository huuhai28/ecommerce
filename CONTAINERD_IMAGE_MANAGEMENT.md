# Xóa Image với Containerd (crictl)

## Kubernetes sử dụng containerd, không phải Docker

### Bước 1: Liệt kê images
```bash
# Trên worker-node
sudo crictl images | grep order-service
```

### Bước 2: Xóa image bằng IMAGE ID
```bash
# Lấy IMAGE ID từ kết quả trên, rồi xóa
sudo crictl rmi <IMAGE_ID>

# Hoặc xóa theo tên:tag
sudo crictl rmi huuhai123/order-service:latest
```

### Bước 3: Xóa pod trên master node để pull image mới
```bash
# Quay lại master node
kubectl delete pod -n ecommerce -l app=order-service

# Kiểm tra pod mới
kubectl get pod -n ecommerce -l app=order-service -w
```

## Lệnh đầy đủ

```bash
# Trên worker-node
sudo crictl images | grep order-service
sudo crictl rmi huuhai123/order-service:latest

# Quay lại master node
kubectl delete pod -n ecommerce -l app=order-service
kubectl get pod -n ecommerce -l app=order-service
```

---

## HOẶC Cách đơn giản hơn - Dùng kubectl từ master node

Không cần SSH vào worker node, chỉ cần dùng digest để force pull image mới:

```bash
# Trên master node
kubectl set image deployment/order-service \
  order-service=huuhai123/order-service@sha256:f66dea4558594618d5e3c3742e2a671edf0e4bd1f8e711118cf32d16fb3e02f7 \
  -n ecommerce

# Deployment sẽ tự động recreate pod với image mới
kubectl get pod -n ecommerce -l app=order-service -w
```

## Khuyến nghị
**Dùng cách 2 (kubectl set image với digest)** - Không cần SSH, chỉ chạy 1 lệnh từ master node!
