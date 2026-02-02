#!/bin/bash
# Setup script to prepare worker node for persistent storage
# Run this on the worker-node with sudo privileges

echo "Creating storage directories on worker node..."

# Create the data directories
mkdir -p /mnt/k8s-data/user-db
mkdir -p /mnt/k8s-data/catalogue-db
mkdir -p /mnt/k8s-data/order-db
mkdir -p /mnt/k8s-data/payment-db
mkdir -p /mnt/k8s-data/shipping-db

# Set proper permissions (1000:1000 is the postgres user:group in the container)
chown -R 999:999 /mnt/k8s-data/user-db
chown -R 999:999 /mnt/k8s-data/catalogue-db
chown -R 999:999 /mnt/k8s-data/order-db
chown -R 999:999 /mnt/k8s-data/payment-db
chown -R 999:999 /mnt/k8s-data/shipping-db

chmod -R 700 /mnt/k8s-data/user-db
chmod -R 700 /mnt/k8s-data/catalogue-db
chmod -R 700 /mnt/k8s-data/order-db
chmod -R 700 /mnt/k8s-data/payment-db
chmod -R 700 /mnt/k8s-data/shipping-db

echo "Storage directories created successfully!"
echo "Verifying directories..."
ls -la /mnt/k8s-data/
