#!/bin/bash
# Quick deploy script - Build, Push, Update K8s

SERVICE=$1
VERSION=${2:-$(date +%Y%m%d-%H%M%S)}
DOCKER_USERNAME="huuhai28"  # Thay bằng Docker Hub username của bạn

if [ -z "$SERVICE" ]; then
    echo "Usage: ./quick-deploy.sh <service> [version]"
    echo "Example: ./quick-deploy.sh frontend v1.1"
    echo ""
    echo "Available services: frontend, user, catalogue, order, payment, cart, shipping, gateway"
    exit 1
fi

echo "🚀 Deploying $SERVICE version $VERSION"
echo ""

# Build image
echo "📦 Building Docker image..."
docker build -t $DOCKER_USERNAME/ecommerce-$SERVICE:$VERSION ./$SERVICE
docker tag $DOCKER_USERNAME/ecommerce-$SERVICE:$VERSION $DOCKER_USERNAME/ecommerce-$SERVICE:latest

# Push to registry
echo "⬆️  Pushing to Docker Hub..."
docker push $DOCKER_USERNAME/ecommerce-$SERVICE:$VERSION
docker push $DOCKER_USERNAME/ecommerce-$SERVICE:latest

echo ""
echo "✅ Image pushed successfully!"
echo ""
echo "🔄 Now update K8s deployment:"
echo ""
echo "kubectl set image deployment/$SERVICE-service $SERVICE=$DOCKER_USERNAME/ecommerce-$SERVICE:$VERSION -n ecommerce"
echo "kubectl rollout status deployment/$SERVICE-service -n ecommerce"
