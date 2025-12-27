# Deploy E-commerce lên Kubernetes

## 1. Push Docker Images lên Docker Hub

```powershell
# Đã push thành công các images:
- huuhai123/ecommerce-user:latest
- huuhai123/ecommerce-catalogue:latest
- huuhai123/ecommerce-order:latest
- huuhai123/ecommerce-payment:latest
- huuhai123/ecommerce-cart:latest
- huuhai123/ecommerce-shipping:latest
- huuhai123/ecommerce-frontend:latest
- huuhai123/ecommerce-gateway:latest
```

## 2. Kiểm tra K8s Cluster

```bash
kubectl cluster-info
kubectl get nodes
```

## 3. Tạo Namespace

```bash
kubectl apply -f k8s/namespace.yaml
```

## 4. Tạo Secrets

```bash
kubectl apply -f k8s/secret.yaml
```

## 5. Deploy Databases

```bash
# Deploy các database trước
kubectl apply -f k8s/user-db-deployment.yaml
kubectl apply -f k8s/catalogue-db-deployment.yaml
kubectl apply -f k8s/order-db-deployment.yaml
kubectl apply -f k8s/payment-db-deployment.yaml
kubectl apply -f k8s/shipping-db-deployment.yaml

# Kiểm tra databases đã sẵn sàng
kubectl get pods -n ecommerce -w
```

## 6. Deploy RabbitMQ

```bash
kubectl apply -f k8s/rabbitmq-deployment.yaml
```

## 7. Deploy Services

```bash
# Deploy tất cả services
kubectl apply -f k8s/user-deployment.yaml
kubectl apply -f k8s/catalogue-deployment.yaml
kubectl apply -f k8s/order-deployment.yaml
kubectl apply -f k8s/payment-deployment.yaml
kubectl apply -f k8s/cart-deployment.yaml
kubectl apply -f k8s/shipping-deployment.yaml
```

## 8. Deploy Gateway và Frontend

```bash
kubectl apply -f k8s/gateway-deployment.yaml
kubectl apply -f k8s/frontend-deployment.yaml
```

## 9. Kiểm tra Deployment

```bash
# Xem tất cả pods
kubectl get pods -n ecommerce

# Xem services
kubectl get svc -n ecommerce

# Xem logs
kubectl logs -f <pod-name> -n ecommerce
```

## 10. Truy cập Application

**Frontend:** http://<node-ip>:30080  
**API Gateway:** http://<node-ip>:30004  
**RabbitMQ Management:** http://<node-ip>:31672

## Troubleshooting

### Nếu pod ImagePullBackOff:
```bash
# Kiểm tra image tồn tại trên Docker Hub
docker pull huuhai123/ecommerce-user:latest

# Kiểm tra pod events
kubectl describe pod <pod-name> -n ecommerce
```

### Nếu pod CrashLoopBackOff:
```bash
# Xem logs
kubectl logs <pod-name> -n ecommerce

# Xem events
kubectl describe pod <pod-name> -n ecommerce
```

### Xóa và deploy lại:
```bash
kubectl delete -f k8s/ --all
kubectl apply -f k8s/namespace.yaml
kubectl apply -f k8s/secret.yaml
# ... deploy lại theo thứ tự trên
```

## Update Images

Khi có thay đổi code:

```powershell
# 1. Build lại image
docker build -t huuhai123/ecommerce-user:latest ./services/user

# 2. Push lên Docker Hub
docker push huuhai123/ecommerce-user:latest

# 3. Restart deployment trong K8s
kubectl rollout restart deployment user-service -n ecommerce

# 4. Xem trạng thái
kubectl rollout status deployment user-service -n ecommerce
```
