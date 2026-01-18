# API Documentation & Deployment Guide
# Generated automatically - review and update with actual details

## Architecture Overview

This is a microservices eCommerce platform with 6 services:
- **User Service** (3004): Authentication & user management
- **Catalogue Service** (3002): Product catalog management  
- **Order Service** (3003): Order processing & checkout
- **Payment Service** (3005): Payment handling
- **Shipping Service** (3007): Shipping & logistics (RabbitMQ consumer)
- **Cart Service** (3006): Shopping cart (PostgreSQL backed)

## Service Dependencies

```
Frontend → API Gateway → [User, Catalogue, Order, Payment, Cart]
Order Service → RabbitMQ → Shipping Service
```

## Quick Start - Local Development

### Prerequisites
- Docker & Docker Compose
- Node.js 16+ (for local development)
- PostgreSQL 14+ (or use Docker)

### Setup

1. Navigate to infrastructure directory:
```bash
cd infrastructure/docker
```

2. Create `.env` file with secure credentials:
```bash
cp .env.example .env
# Edit .env and change all CHANGE_ME values!
```

3. Start all services:
```bash
docker-compose up -d
```

4. Verify services are healthy:
```bash
docker ps
curl http://localhost:3004/health  # User service
curl http://localhost:3002/health  # Catalogue
curl http://localhost:3003/health  # Order
curl http://localhost:3005/health  # Payment
curl http://localhost:3006/health  # Cart
curl http://localhost:3007/health  # Shipping
curl http://localhost:15672       # RabbitMQ UI (guest:guest)
```

## Kubernetes Deployment

### Prerequisites
- Kubernetes cluster (via Rancher)
- kubectl configured
- Docker images pushed to registry

### Deploy to Rancher

1. Create namespace:
```bash
kubectl create namespace ecommerce
```

2. Create secrets with secure values:
```bash
# Edit secret.yaml with base64 encoded values
kubectl apply -f infrastructure/k8s/secret.yaml
```

3. Deploy services:
```bash
# Create namespace and base resources
kubectl apply -f infrastructure/k8s/namespace.yaml
kubectl apply -f infrastructure/k8s/secret.yaml

# Deploy databases
kubectl apply -f infrastructure/k8s/postgres-deployment.yaml
kubectl apply -f infrastructure/k8s/postgres-pv-pvc.yaml

# Deploy services
kubectl apply -f infrastructure/k8s/user-deployment.yaml
kubectl apply -f infrastructure/k8s/catalogue-deployment.yaml
kubectl apply -f infrastructure/k8s/order-deployment.yaml
kubectl apply -f infrastructure/k8s/payment-deployment.yaml
kubectl apply -f infrastructure/k8s/cart-deployment.yaml
kubectl apply -f infrastructure/k8s/shipping-deployment.yaml

# Deploy RabbitMQ
kubectl apply -f infrastructure/k8s/rabbitmq-deployment.yaml

# Deploy Ingress
kubectl apply -f infrastructure/k8s/ingress.yaml
```

## API Endpoints

### User Service
- `POST /api/register` - Register new user
- `POST /api/login` - Login user
- `GET /api/users/:id` - Get user details
- `GET /health` - Health check

### Catalogue Service
- `GET /api/products` - List all products
- `GET /api/products/:id` - Get product details
- `POST /api/products` - Create product (admin)
- `GET /health` - Health check

### Order Service
- `POST /api/orders` - Create order (requires JWT)
- `GET /api/orders/:id` - Get order details
- `GET /api/orders` - List user orders
- `GET /health` - Health check + RabbitMQ status

### Payment Service
- `POST /api/payments` - Process payment
- `GET /health` - Health check

### Cart Service
- `GET /api/cart/:user` - Get user cart
- `POST /api/cart/:user` - Update cart
- `DELETE /api/cart/:user` - Clear cart
- `GET /health` - Health check

### Shipping Service
- `GET /health` - Health check
- Consumes messages from RabbitMQ `shipping.requests` queue

## Security Best Practices

### ✅ Implemented
- [x] Environment variables for all credentials
- [x] Base64 encoded Kubernetes secrets
- [x] JWT authentication on Order service
- [x] Database password externalization
- [x] RabbitMQ credentials management
- [x] Pod security context (non-root user)
- [x] Resource limits on containers
- [x] Health checks for auto-recovery

### 🔄 Recommended Next Steps
1. **SSL/TLS**: Enable HTTPS on Ingress
2. **Network Policies**: Restrict pod-to-pod communication
3. **Monitoring**: Deploy Prometheus + Grafana for metrics
4. **Logging**: Setup ELK stack for centralized logging
5. **Rate Limiting**: Add rate limits to prevent abuse
6. **Backup**: Configure database backups
7. **Auto-scaling**: Setup HPA based on CPU/memory
8. **Service Mesh**: Consider Istio for advanced traffic management

## Environment Variables

### Critical Variables (Must be set for production)
- `DB_PASSWORD` - Database password (strong, 16+ chars)
- `JWT_SECRET` - JWT signing key (min 32 chars, random)
- `RABBITMQ_USER` & `RABBITMQ_PASS` - RabbitMQ credentials

### Optional Variables
- `NODE_ENV` - `development`, `staging`, `production`
- `LOG_LEVEL` - `debug`, `info`, `warn`, `error`

## Monitoring & Debugging

### Docker Compose
```bash
# View logs
docker-compose logs -f [service-name]

# Connect to database
docker exec -it cart_db psql -U postgres -d cart_db

# RabbitMQ Management UI
http://localhost:15672  # admin:admin
```

### Kubernetes
```bash
# View pod logs
kubectl logs -f deployment/order-deployment -n ecommerce

# Execute command in pod
kubectl exec -it pod/[pod-name] -n ecommerce -- /bin/sh

# Port forward for debugging
kubectl port-forward svc/order-service 3003:3003 -n ecommerce
```

## CI/CD Integration

### Jenkins Pipeline Steps
1. Build Docker images
2. Push to registry
3. Update image tags in deployments
4. Apply Kubernetes manifests via `kubectl apply`
5. Verify health checks
6. Run integration tests

### Rancher Integration
- Import repository webhooks
- Enable automatic image pulls
- Configure health checks per service
- Setup Prometheus scraping

## Troubleshooting

### Service won't start
1. Check environment variables: `docker-compose config`
2. Check logs: `docker logs [container]`
3. Verify database connectivity: `docker exec [container] nc -zv db_host 5432`

### RabbitMQ not processing messages
1. Check RabbitMQ UI: http://localhost:15672
2. Verify queue exists: `RABBITMQ_QUEUE=shipping.requests`
3. Check service connection: curl `amqp://user:pass@rabbitmq:5672/`

### Database connection errors
1. Verify DB container is healthy: `docker ps`
2. Check credentials match
3. Verify network connectivity: `docker network ls`

## Version History

- **v1.0.0** - Initial microservices setup
- **v1.1.0** - Add Cart persistence (Postgres)
- **v1.2.0** - Security hardening (env externalization)
- **v2.0.0** - Production-ready K8s deployment

---

For questions or issues, create an issue in the repository.
