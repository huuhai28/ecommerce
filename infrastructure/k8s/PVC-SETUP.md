# Hướng dẫn apply PVC và update databases

## 1. Tạo thư mục lưu trữ trên worker node

Trên worker node, tạo các thư mục:
```bash
# SSH vào worker node, hoặc chạy trên worker
sudo mkdir -p /mnt/k8s-data/{user-db,catalogue-db,order-db,payment-db,shipping-db}
sudo chmod -R 777 /mnt/k8s-data
```

## 2. Apply PVC (trên master node)

```bash
kubectl apply -f k8s/postgres-pv-pvc.yaml
```

Kiểm tra PV và PVC:
```bash
kubectl get pv
kubectl get pvc -n ecommerce
```

## 3. Xóa pods cũ để recreate với PVC

```bash
# Xóa deployment databases cũ
kubectl delete deployment user-db catalogue-db order-db payment-db shipping-db -n ecommerce

# Apply lại với config mới (dùng PVC)
kubectl apply -f k8s/user-db-deployment.yaml
kubectl apply -f k8s/catalogue-db-deployment.yaml
kubectl apply -f k8s/order-db-deployment.yaml
kubectl apply -f k8s/payment-db-deployment.yaml
kubectl apply -f k8s/shipping-db-deployment.yaml
```

## 4. Kiểm tra pods mới

```bash
kubectl get pods -n ecommerce | grep db
```

## 5. Seed lại dữ liệu (chỉ cần 1 lần duy nhất)

```bash
# Lấy tên pod mới
kubectl get pods -n ecommerce | grep catalogue-db
kubectl get pods -n ecommerce | grep user-db

# Copy và import SQL
kubectl cp ./db/init-catalogue.sql -n ecommerce <catalogue-db-pod>:/tmp/init.sql
kubectl exec -n ecommerce <catalogue-db-pod> -- \
  psql -U postgres -d catalogue_db -f /tmp/init.sql

kubectl cp ./db/init-user.sql -n ecommerce <user-db-pod>:/tmp/init.sql
kubectl exec -n ecommerce <user-db-pod> -- \
  psql -U postgres -d user_db -f /tmp/init.sql

kubectl cp ./db/init-order.sql -n ecommerce <order-db-pod>:/tmp/init.sql
kubectl exec -n ecommerce <order-db-pod> -- \
  psql -U postgres -d order_db -f /tmp/init.sql

kubectl cp ./db/init-payment.sql -n ecommerce <payment-db-pod>:/tmp/init.sql
kubectl exec -n ecommerce <payment-db-pod> -- \
  psql -U postgres -d payment_db -f /tmp/init.sql

kubectl cp ./db/init-shipping.sql -n ecommerce <shipping-db-pod>:/tmp/init.sql
kubectl exec -n ecommerce <shipping-db-pod> -- \
  psql -U postgres -d shipping_db -f /tmp/init.sql
```

## 6. Kiểm tra dữ liệu

```bash
kubectl exec -n ecommerce <catalogue-db-pod> -- \
  psql -U postgres -d catalogue_db -c "select count(*) from product"

kubectl exec -n ecommerce <user-db-pod> -- \
  psql -U postgres -d user_db -c "select count(*) from customer"
```

## 7. Lợi ích

Sau khi apply PVC:
- Dữ liệu sẽ lưu trong `/mnt/k8s-data/` trên worker node
- Khi pod restart hoặc bị xóa, dữ liệu vẫn còn
- Chỉ cần seed 1 lần, không phải seed lại sau mỗi lần bật/tắt máy ảo
- Pod database sẽ luôn schedule trên worker-node (do nodeAffinity)

## 8. Backup dữ liệu

Để backup:
```bash
# Trên worker node
sudo tar -czf ~/ecommerce-db-backup.tar.gz /mnt/k8s-data/
```

Để restore:
```bash
# Trên worker node
sudo tar -xzf ~/ecommerce-db-backup.tar.gz -C /
```
