#!/bin/bash
# Build all microservices containers

DOCKER_USERNAME="${1:-yourusername}"  # Thay bằng Docker Hub username của bạn
VERSION="${2:-latest}"

echo "🔨 Building all containers..."
echo "Docker Username: $DOCKER_USERNAME"
echo "Version: $VERSION"
echo ""

# Build Backend Service
echo "📦 Building backend service..."
docker build -t $DOCKER_USERNAME/ecommerce-backend:$VERSION ./backend

# Build Frontend
echo "📦 Building frontend..."
docker build -t $DOCKER_USERNAME/ecommerce-frontend:$VERSION ./frontend

# Build Gateway
echo "📦 Building gateway..."
docker build -t $DOCKER_USERNAME/ecommerce-gateway:$VERSION ./gateway

# Build User Service
echo "📦 Building user service..."
docker build -t $DOCKER_USERNAME/ecommerce-user:$VERSION ./services/user

# Build Catalogue Service
echo "📦 Building catalogue service..."
docker build -t $DOCKER_USERNAME/ecommerce-catalogue:$VERSION ./services/catalogue

# Build Order Service
echo "📦 Building order service..."
docker build -t $DOCKER_USERNAME/ecommerce-order:$VERSION ./services/order

# Build Payment Service
echo "📦 Building payment service..."
docker build -t $DOCKER_USERNAME/ecommerce-payment:$VERSION ./services/payment

# Build Cart Service
echo "📦 Building cart service..."
docker build -t $DOCKER_USERNAME/ecommerce-cart:$VERSION ./services/cart

# Build Shipping Service
echo "📦 Building shipping service..."
docker build -t $DOCKER_USERNAME/ecommerce-shipping:$VERSION ./services/shipping

echo ""
echo "✅ All containers built successfully!"
echo ""
echo "📋 List of images:"
docker images | grep ecommerce

echo ""
echo "🚀 Next steps:"
echo "1. docker login"
echo "2. ./push-all.sh $DOCKER_USERNAME $VERSION"
