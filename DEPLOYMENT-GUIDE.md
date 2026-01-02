# 🚀 Deployment Guide - E-commerce Microservices

## Prerequisites
- Docker installed
- Docker Hub account (hoặc private registry)
- Kubernetes cluster ready (2 VMs)
- kubectl configured

---

## 📋 STEP-BY-STEP DEPLOYMENT

### **STEP 1: Build All Containers**

#### Windows (PowerShell):
```powershell
# Thay 'yourusername' bằng Docker Hub username của bạn
.\build-all.ps1 -DockerUsername "yourusername" -Version "v1.0"
```

#### Linux/Mac (Bash):
```bash
chmod +x build-all.sh
./build-all.sh yourusername v1.0
```

**Kiểm tra images đã build:**
```bash
docker images | grep ecommerce
```

---

### **STEP 2: Login & Push to Docker Hub**

```bash
# Login Docker Hub
docker login

# Push all images
.\push-all.ps1 -DockerUsername "yourusername" -Version "v1.0"
```

---

### **STEP 3: Update K8s Manifests**

Sửa tất cả file deployment trong `k8s/` folder, thay:
```yaml
# FROM:
image: ecommerce-user:latest

# TO:
image: yourusername/ecommerce-user:v1.0
```

**Hoặc dùng script tự động:**
```powershell
# Tạo file update-manifests.ps1
$username = "yourusername"
$version = "v1.0"

Get-ChildItem -Path "k8s/*-deployment.yaml" | ForEach-Object {
    (Get-Content $_.FullName) -replace 'image: ecommerce-', "image: $username/ecommerce-" `
                              -replace ':latest', ":$version" | 
    Set-Content $_.FullName
}
```

---

### **STEP 4: Deploy to Kubernetes**

**Trên K8s cluster (VMs):**

```bash
# 1. Clone/Pull repo
git clone https://github.com/yourusername/Doan.git
cd Doan

# 2. Create namespace & secrets
kubectl apply -f k8s/namespace.yaml
kubectl apply -f k8s/secret.yaml

# 3. Setup storage
kubectl apply -f k8s/postgres-pv-pvc.yaml

# 4. Deploy databases
kubectl apply -f k8s/user-db-deployment.yaml
kubectl apply -f k8s/catalogue-db-deployment.yaml
kubectl apply -f k8s/order-db-deployment.yaml
kubectl apply -f k8s/payment-db-deployment.yaml
kubectl apply -f k8s/shipping-db-deployment.yaml

# Wait for DBs to be ready
kubectl get pods -n ecommerce -w

# 5. Deploy RabbitMQ
kubectl apply -f k8s/rabbitmq-deployment.yaml

# 6. Deploy microservices
kubectl apply -f k8s/user-deployment.yaml
kubectl apply -f k8s/catalogue-deployment.yaml
kubectl apply -f k8s/cart-deployment.yaml
kubectl apply -f k8s/payment-deployment.yaml
kubectl apply -f k8s/order-deployment.yaml
kubectl apply -f k8s/shipping-deployment.yaml

# 7. Deploy frontend & gateway
kubectl apply -f k8s/backend-deployment.yaml
kubectl apply -f k8s/frontend-deployment.yaml
kubectl apply -f k8s/gateway-deployment.yaml

# 8. Check all pods
kubectl get pods -n ecommerce
kubectl get svc -n ecommerce
```

---

### **STEP 5: Access Application**

```bash
# Get NodePort
kubectl get svc -n ecommerce

# Access via:
# Frontend: http://<NODE_IP>:30080
# Gateway: http://<NODE_IP>:30004
# RabbitMQ UI: http://<NODE_IP>:30672
```

---

## 🔄 UPDATE WORKFLOW

**Khi có code changes:**

```bash
# 1. Build service đã thay đổi
docker build -t yourusername/ecommerce-user:v1.1 ./services/user
docker push yourusername/ecommerce-user:v1.1

# 2. Update K8s deployment
kubectl set image deployment/user-service user=yourusername/ecommerce-user:v1.1 -n ecommerce

# 3. Check rollout status
kubectl rollout status deployment/user-service -n ecommerce

# 4. Rollback nếu cần
kubectl rollout undo deployment/user-service -n ecommerce
```

---

## 🐛 TROUBLESHOOTING

### Pods không start:
```bash
kubectl describe pod <pod-name> -n ecommerce
kubectl logs <pod-name> -n ecommerce
```

### DB connection issues:
```bash
kubectl exec -it <pod-name> -n ecommerce -- sh
ping user-db-service
```

### Check services:
```bash
kubectl get svc -n ecommerce
kubectl get endpoints -n ecommerce
```

---

## 📊 MONITORING

```bash
# Watch all pods
kubectl get pods -n ecommerce -w

# Resource usage
kubectl top pods -n ecommerce
kubectl top nodes

# Logs
kubectl logs -f deployment/user-service -n ecommerce
```

---

## 🎯 NEXT STEPS

- [ ] Build all containers
- [ ] Push to Docker Hub
- [ ] Update K8s manifests
- [ ] Deploy to K8s cluster
- [ ] Test all endpoints
- [ ] Setup monitoring
- [ ] Setup Jenkins CI/CD

---

## 📝 NOTES

**Docker Hub Alternatives:**
- Google Container Registry (GCR)
- Amazon ECR
- Azure Container Registry
- Private Harbor registry

**Production Checklist:**
- [ ] Use secrets for passwords
- [ ] Setup Ingress for HTTPS
- [ ] Configure resource limits
- [ ] Setup persistent volumes
- [ ] Configure health checks
- [ ] Setup monitoring (Prometheus/Grafana)
- [ ] Configure auto-scaling (HPA)
