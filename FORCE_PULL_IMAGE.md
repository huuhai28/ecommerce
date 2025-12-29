# QUAN TRỌNG - Chạy lệnh này trên Master Node

## Vấn đề: imagePullPolicy
Pod mới vẫn dùng image cũ vì `imagePullPolicy: IfNotPresent` không pull image mới từ Docker Hub.

## Giải pháp

### Cách 1: Apply deployment mới và restart
```bash
# Trên master node, cd vào thư mục chứa file yaml
cd /path/to/k8s/

# Apply deployment với imagePullPolicy: Always
kubectl apply -f order-deployment.yaml

# Xóa pod để tạo lại với image mới
kubectl delete pod -n ecommerce -l app=order-service

# Kiểm tra pod mới
kubectl get pod -n ecommerce -l app=order-service -w
```

### Cách 2: Xóa image cũ trên worker node (nhanh hơn)
```bash
# SSH vào worker-node (vì pod order-service đang chạy ở worker-node)
ssh worker-node

# Xóa image cũ
docker rmi huuhai123/order-service:latest

# Exit về master node
exit

# Xóa pod để tạo lại (sẽ pull image mới)
kubectl delete pod -n ecommerce -l app=order-service

# Kiểm tra
kubectl get pod -n ecommerce -l app=order-service
```

### Cách 3: Dùng digest để force pull (khuyến nghị)
```bash
# Sửa deployment để dùng digest thay vì tag latest
kubectl set image deployment/order-service order-service=huuhai123/order-service@sha256:f66dea4558594618d5e3c3742e2a671edf0e4bd1f8e711118cf32d16fb3e02f7 -n ecommerce
```

## Khuyến nghị
**CHẠY CÁCH 2** - xóa image trên worker node, nhanh và đảm bảo pull image mới.
