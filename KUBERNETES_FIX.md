# Kubernetes Deployment Troubleshooting

## Problems Found and Fixed

### 1. **PersistentVolume Namespace Issue** ✅ FIXED
- **Problem**: PersistentVolumes had `namespace: ecommerce` in their metadata, but PVs are cluster-wide resources and should NOT have a namespace
- **Impact**: This caused volume binding failures, leading to `CreateContainerConfigError`
- **Files Fixed**:
  - `infrastructure/k8s/postgres-pv-pvc.yaml` - Removed namespace from all PV definitions

### 2. **Missing nodeSelector on Database Deployments** ✅ FIXED
- **Problem**: Database deployments (order-db, payment-db, shipping-db, user-db) were missing `nodeSelector` to constrain pods to the worker node where persistent storage directories exist
- **Impact**: Pods could be scheduled on any node, but the storage would only exist on worker-node
- **Files Fixed**:
  - `infrastructure/k8s/order-db-deployment.yaml`
  - `infrastructure/k8s/payment-db-deployment.yaml`
  - `infrastructure/k8s/shipping-db-deployment.yaml`
  - `infrastructure/k8s/user-db-deployment.yaml`

### 3. **Missing Storage Directories on Worker Node** ⚠️ ACTION REQUIRED
- **Problem**: The hostPath directories referenced in PVs don't exist on the worker node
- **Solution**: SSH into your worker-node and run the setup script

## Action Items

### On Your Worker Node:
1. SSH into your worker node:
   ```bash
   ssh <worker-node-ip>
   # or if you have direct access
   cd /
   ```

2. Create the required directories with proper permissions:
   ```bash
   sudo mkdir -p /mnt/k8s-data/{user-db,catalogue-db,order-db,payment-db,shipping-db}
   
   # Set proper ownership to postgres user (UID 999)
   sudo chown -R 999:999 /mnt/k8s-data/
   
   # Set proper permissions
   sudo chmod -R 700 /mnt/k8s-data/
   ```

   OR use the provided setup script:
   ```bash
   bash scripts/setup-worker-node.sh
   ```

### On Your Master Node:
1. Pull the latest changes:
   ```bash
   git pull
   ```

2. Delete the current failing deployments and secrets:
   ```bash
   kubectl delete -f infrastructure/k8s/ -n ecommerce
   kubectl delete secret ecommerce-secrets -n ecommerce
   ```

3. Reapply the manifests:
   ```bash
   kubectl apply -f infrastructure/k8s/ -n ecommerce
   ```

4. Monitor pod startup:
   ```bash
   kubectl get pods -n ecommerce -w
   ```

## Expected Results After Fix

All database pods should transition from `CreateContainerConfigError` to `Running`:
- `order-db` ✓
- `payment-db` ✓
- `shipping-db` ✓
- `user-db` ✓
- `catalogue-db` ✓

The migration jobs will then automatically run and initialize the databases.

## Cluster Setup Summary

- **Master Nodes**: 2
- **Worker Nodes**: 1 (must have `/mnt/k8s-data/` directories)
- **Rancher Node**: 1
- **Jenkins Node**: 1

All database pods are constrained to `worker-node` via nodeSelector.
