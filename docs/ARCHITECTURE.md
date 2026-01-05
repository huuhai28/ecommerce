# Kiến trúc Hệ thống E-commerce Microservices

## Tổng quan
Hệ thống e-commerce được xây dựng theo kiến trúc microservices với Node.js, PostgreSQL, RabbitMQ và được deploy trên Kubernetes.

## Cấu trúc thư mục

```
project-root/
├── services/                    # Các microservices
│   ├── user/                   # Service quản lý người dùng
│   │   ├── src/
│   │   │   └── server.js
│   │   ├── tests/
│   │   ├── Dockerfile
│   │   └── package.json
│   ├── catalogue/              # Service quản lý sản phẩm
│   ├── order/                  # Service quản lý đơn hàng
│   ├── payment/                # Service thanh toán
│   ├── cart/                   # Service giỏ hàng
│   └── shipping/               # Service vận chuyển
│
├── frontend/                    # Frontend application
│   ├── src/
│   │   ├── js/                 # JavaScript files
│   │   ├── css/                # Stylesheets
│   │   └── assets/             # Images, fonts
│   └── public/
│       ├── index.html
│       └── Dockerfile
│
├── gateway/                     # NGINX API Gateway
│   ├── nginx.conf
│   └── Dockerfile
│
├── infrastructure/              # Infrastructure as Code
│   ├── k8s/                    # Kubernetes manifests
│   │   ├── *-deployment.yaml
│   │   ├── *-db-deployment.yaml
│   │   └── secret.yaml
│   └── docker/
│       └── docker-compose.yml
│
├── database/                    # Database scripts
│   └── migrations/
│       ├── init-user.sql
│       ├── init-catalogue.sql
│       ├── init-order.sql
│       ├── init-payment.sql
│       └── init-shipping.sql
│
├── docs/                        # Documentation
│   ├── ARCHITECTURE.md
│   └── DEPLOYMENT.md
│
├── scripts/                     # Deployment & utility scripts
│
└── README.md
```

## Kiến trúc Services

### 1. User Service (Port 3001)
- Quản lý authentication, registration, login
- JWT token generation
- Database: user_db (PostgreSQL)

### 2. Catalogue Service (Port 3002)
- Quản lý danh sách sản phẩm
- Search, filter sản phẩm
- Database: catalogue_db (PostgreSQL)

### 3. Order Service (Port 3003)
- Tạo và quản lý đơn hàng
- Publish events đến RabbitMQ
- Database: order_db (PostgreSQL)

### 4. Payment Service (Port 3005)
- Xử lý thanh toán
- Consume order events từ RabbitMQ
- Database: payment_db (PostgreSQL)

### 5. Cart Service (Port 3006)
- Quản lý giỏ hàng

### 6. Shipping Service (Port 3007)
- Quản lý vận chuyển
- Consume order events
- Database: shipping_db (PostgreSQL)

## API Gateway
- **NGINX** reverse proxy
- Routes:
  - `/users` → User Service
  - `/products` → Catalogue Service
  - `/orders` → Order Service
  - `/payments` → Payment Service
  - `/cart` → Cart Service
  - `/shipping` → Shipping Service

## Message Queue
- **RabbitMQ** cho event-driven communication
- Order events: order.created, order.updated
- Consumed by: Payment Service, Shipping Service

## Databases
Mỗi service có database riêng (Database per Service pattern):
- PostgreSQL 14-Alpine
- Persistent volumes (K8s PVC/PV)
- Init scripts trong `database/migrations/`

## Deployment
- **Development**: Docker Compose
- **Production**: Kubernetes (K8s)
  - Namespace: `ecommerce`
  - Services type: ClusterIP (internal), NodePort (external)
  - Resource limits: memory 256Mi, CPU 200m
  - Secrets: JWT, DB credentials, RabbitMQ URL

## Security
- JWT authentication
- K8s Secrets cho sensitive data
- Database credentials không hardcode
- CORS configured

## Monitoring & Logging
- Container logs: `kubectl logs`
- Health checks: PostgreSQL pg_isready
- Service discovery: K8s DNS

## Tech Stack
- **Backend**: Node.js (Express)
- **Frontend**: Vanilla JS, HTML, CSS
- **Database**: PostgreSQL
- **Message Broker**: RabbitMQ
- **Gateway**: NGINX
- **Orchestration**: Kubernetes
- **Containerization**: Docker
