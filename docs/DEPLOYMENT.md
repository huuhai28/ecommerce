# Hướng dẫn Deploy E-commerce System

## Prerequisites
- Docker & Docker Compose
- Kubernetes cluster (minikube, k3s, hoặc cloud provider)
- kubectl CLI
- Git

## Development (Docker Compose)

### 1. Clone repository
```bash
git clone <repository-url>
cd Doan
```

### 2. Khởi động services
```bash
cd infrastructure/docker
docker-compose up -d
```

### 3. Kiểm tra services
```bash
docker-compose ps
docker-compose logs -f [service-name]
```

### 4. Dừng services
```bash
docker-compose down
# Xóa volumes (reset database):
docker-compose down -v
```

## Production (Kubernetes)

### 1. Tạo namespace
```bash
kubectl create namespace ecommerce
```

### 2. Tạo secrets
```bash
kubectl apply -f infrastructure/k8s/secret.yaml
```

### 3. Setup Persistent Volumes
```bash
kubectl apply -f infrastructure/k8s/postgres-pv-pvc.yaml
```

### 4. Deploy databases
```bash
kubectl apply -f infrastructure/k8s/user-db-deployment.yaml
kubectl apply -f infrastructure/k8s/catalogue-db-deployment.yaml
kubectl apply -f infrastructure/k8s/order-db-deployment.yaml
kubectl apply -f infrastructure/k8s/payment-db-deployment.yaml
kubectl apply -f infrastructure/k8s/shipping-db-deployment.yaml
```

### 5. Deploy RabbitMQ
```bash
kubectl apply -f infrastructure/k8s/rabbitmq-deployment.yaml
```

### 6. Deploy microservices
```bash
kubectl apply -f infrastructure/k8s/user-deployment.yaml
kubectl apply -f infrastructure/k8s/catalogue-deployment.yaml
kubectl apply -f infrastructure/k8s/order-deployment.yaml
kubectl apply -f infrastructure/k8s/payment-deployment.yaml
kubectl apply -f infrastructure/k8s/cart-deployment.yaml
kubectl apply -f infrastructure/k8s/shipping-deployment.yaml
```

### 7. Deploy frontend & gateway
```bash
kubectl apply -f infrastructure/k8s/frontend-deployment.yaml
kubectl apply -f infrastructure/k8s/gateway-deployment.yaml
```

### 8. Kiểm tra deployments
```bash
kubectl get all -n ecommerce
kubectl get pods -n ecommerce
kubectl logs -n ecommerce <pod-name>
```

### 9. Truy cập ứng dụng
```bash
# Get NodePort của frontend
kubectl get svc frontend-service -n ecommerce

# Get NodePort của API gateway
kubectl get svc api-gateway -n ecommerce

# Access:
# Frontend: http://<node-ip>:30001
# API Gateway: http://<node-ip>:30004
```

## Build & Push Docker Images

### Services
```bash
# User service
docker build -t <dockerhub-username>/ecommerce-user:latest ./services/user
docker push <dockerhub-username>/ecommerce-user:latest

# Catalogue service
docker build -t <dockerhub-username>/ecommerce-catalogue:latest ./services/catalogue
docker push <dockerhub-username>/ecommerce-catalogue:latest

# Order service
docker build -t <dockerhub-username>/ecommerce-order:latest ./services/order
docker push <dockerhub-username>/ecommerce-order:latest

# Payment service
docker build -t <dockerhub-username>/ecommerce-payment:latest ./services/payment
docker push <dockerhub-username>/ecommerce-payment:latest

# Cart service
docker build -t <dockerhub-username>/ecommerce-cart:latest ./services/cart
docker push <dockerhub-username>/ecommerce-cart:latest

# Shipping service
docker build -t <dockerhub-username>/ecommerce-shipping:latest ./services/shipping
docker push <dockerhub-username>/ecommerce-shipping:latest
```

### Frontend
```bash
cd frontend/public
docker build -t <dockerhub-username>/ecommerce-frontend:latest .
docker push <dockerhub-username>/ecommerce-frontend:latest
```

### Gateway
```bash
docker build -t <dockerhub-username>/ecommerce-gateway:latest ./gateway
docker push <dockerhub-username>/ecommerce-gateway:latest
```

## Update Deployment
```bash
# Sau khi push image mới
kubectl rollout restart deployment/<deployment-name> -n ecommerce

# Ví dụ:
kubectl rollout restart deployment/order-service -n ecommerce

# Kiểm tra rollout status
kubectl rollout status deployment/<deployment-name> -n ecommerce
```

## Troubleshooting

### Pod không start
```bash
kubectl describe pod <pod-name> -n ecommerce
kubectl logs <pod-name> -n ecommerce
```

### Database connection issues
```bash
# Kiểm tra database pods
kubectl get pods -n ecommerce | grep db

# Check database logs
kubectl logs <db-pod-name> -n ecommerce

# Test connection từ service pod
kubectl exec -it <service-pod> -n ecommerce -- sh
# Inside pod:
nc -zv <db-service-name> 5432
```

### Service không accessible
```bash
# Kiểm tra services
kubectl get svc -n ecommerce

# Check endpoints
kubectl get endpoints -n ecommerce

# Port forward để test
kubectl port-forward svc/<service-name> <local-port>:<service-port> -n ecommerce
```

## Database Seeding

### Add sample data
```bash
# Connect to database pod
kubectl exec -it <db-pod-name> -n ecommerce -- psql -U postgres -d <database-name>

# Run SQL commands hoặc copy SQL file vào pod
kubectl cp database/migrations/seed-data.sql <db-pod-name>:/tmp/ -n ecommerce
kubectl exec -it <db-pod-name> -n ecommerce -- psql -U postgres -d <database-name> -f /tmp/seed-data.sql
```

## Clean Up
```bash
# Xóa toàn bộ namespace (caution!)
kubectl delete namespace ecommerce

# Xóa specific resources
kubectl delete -f infrastructure/k8s/ -n ecommerce
```

## Notes
- Đảm bảo secrets được tạo trước khi deploy services
- Databases phải ready trước khi services start
- RabbitMQ phải running trước order/payment/shipping services
- Frontend cần cấu hình BACKEND_API_GATEWAY_IP và PORT đúng
- Update image tags trong K8s manifests sau khi push images mới
