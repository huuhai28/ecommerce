# 🏗️ Detailed Architecture Diagram

## Microservice E-Commerce Architecture

```mermaid
graph TB
    subgraph internet["🌐 Internet"]
        user["👥 Clients<br/>(Browser/Mobile)"]
    end

    subgraph ingress_zone["🔐 Ingress Zone"]
        ingress["⚙️ Ingress Controller<br/>(api.example.com:80/443)"]
    end

    subgraph gateway_zone["🚪 API Gateway Zone"]
        gateway["🔀 API Gateway<br/>(Nginx Proxy)<br/>Port: 80/443"]
    end

    subgraph service_zone["🔷 Microservices Zone"]
        subgraph user_module["👤 User Module"]
            user_svc["🔷 User Service<br/>Port: 3004<br/>Node.js + Express"]
            user_db["🗄️ user_db<br/>PostgreSQL"]
        end

        subgraph catalogue_module["📦 Catalogue Module"]
            cat_svc["🔷 Catalogue Service<br/>Port: 3002<br/>Node.js + Express"]
            cat_db["🗄️ catalogue_db<br/>PostgreSQL"]
        end

        subgraph order_module["📋 Order Module"]
            order_svc["🔷 Order Service<br/>Port: 3003<br/>Node.js + Express"]
            order_db["🗄️ order_db<br/>PostgreSQL"]
        end

        subgraph payment_module["💳 Payment Module"]
            payment_svc["🔷 Payment Service<br/>Port: 3005<br/>Node.js + Express"]
            payment_db["🗄️ payment_db<br/>PostgreSQL"]
        end

        subgraph shipping_module["🚚 Shipping Module"]
            shipping_svc["🔷 Shipping Service<br/>Port: 3005<br/>Node.js + Express"]
            shipping_db["🗄️ shipping_db<br/>PostgreSQL"]
        end

        subgraph cart_module["🛒 Cart Module"]
            cart_svc["🔷 Cart Service<br/>Port: 3006<br/>In-Memory Store"]
        end
    end

    subgraph frontend_zone["🎨 Frontend Zone"]
        frontend["🖥️ Frontend<br/>(React/Vue)<br/>Port: 80<br/>Nginx"]
    end

    subgraph messaging["📨 Message Queue Zone"]
        rabbitmq["🐰 RabbitMQ<br/>Port: 5672<br/>Async Messaging"]
    end

    subgraph cache["⚡ Cache Zone"]
        redis["📊 Redis Cache<br/>Optional"]
    end

    %% User connections
    user -->|HTTP| ingress
    ingress -->|Route| gateway
    
    %% Gateway to Services
    gateway -->|/api/users| user_svc
    gateway -->|/api/products| cat_svc
    gateway -->|/api/orders| order_svc
    gateway -->|/api/payments| payment_svc
    gateway -->|/api/shipping| shipping_svc
    gateway -->|/api/cart| cart_svc
    gateway -->|Static| frontend

    %% Database connections
    user_svc -->|Query/Insert| user_db
    cat_svc -->|Query| cat_db
    order_svc -->|Query/Insert| order_db
    payment_svc -->|Query/Insert| payment_db
    shipping_svc -->|Query/Insert| shipping_db

    %% Async Messaging
    order_svc -->|Publish<br/>shipping.requests| rabbitmq
    rabbitmq -->|Subscribe<br/>Consume| shipping_svc

    %% Optional Cache
    order_svc -.->|Cache hits| redis
    cat_svc -.->|Cache hits| redis

    %% Frontend to Gateway
    frontend -->|API Calls| gateway

    %% Styling
    classDef zone fill:#e1f5ff,stroke:#01579b,stroke-width:3px
    classDef service fill:#bbdefb,stroke:#0d47a1,stroke-width:2px
    classDef database fill:#fff9c4,stroke:#f57f17,stroke-width:2px
    classDef infrastructure fill:#c8e6c9,stroke:#1b5e20,stroke-width:2px
    classDef external fill:#ffccbc,stroke:#bf360c,stroke-width:2px

    class ingress_zone,gateway_zone,service_zone,frontend_zone,messaging,cache zone
    class user_svc,cat_svc,order_svc,payment_svc,shipping_svc,cart_svc service
    class user_db,cat_db,order_db,payment_db,shipping_db database
    class rabbitmq,redis infrastructure
    class user,ingress,gateway,frontend external
```

---

## 🔄 Data Flow Patterns

### Pattern 1: User Registration & Login

```mermaid
sequenceDiagram
    participant C as Client
    participant GW as API Gateway
    participant U as User Service
    participant DB as PostgreSQL

    C->>GW: POST /users/register
    GW->>U: POST /api/register
    U->>U: Hash password (bcryptjs)
    U->>DB: INSERT customer
    DB-->>U: Return customer_id
    U->>U: Sign JWT token
    U-->>GW: 201 + token
    GW-->>C: 201 + token
```

### Pattern 2: Order Processing with Async Shipping

```mermaid
sequenceDiagram
    participant C as Client
    participant GW as API Gateway
    participant O as Order Service
    participant DB as PostgreSQL
    participant RMQ as RabbitMQ
    participant S as Shipping Service

    C->>GW: POST /orders
    GW->>O: POST /api/orders
    O->>O: Validate items
    O->>DB: INSERT order + order_items
    DB-->>O: order_id
    O->>RMQ: Publish shipping.requests
    O-->>GW: 201 + order_id
    GW-->>C: 201 + order_id
    
    RMQ->>S: Consume message
    S->>S: Process shipping
    S->>DB: INSERT shipping record
    DB-->>S: Done
```

### Pattern 3: Product Catalog Browse

```mermaid
sequenceDiagram
    participant C as Client
    participant FE as Frontend
    participant GW as API Gateway
    participant CAT as Catalogue Service
    participant DB as PostgreSQL

    C->>FE: Browse products
    FE->>GW: GET /products
    GW->>CAT: GET /api/products
    CAT->>DB: SELECT products
    DB-->>CAT: Products list
    CAT-->>GW: Products JSON
    GW-->>FE: Products JSON
    FE->>FE: Render UI
    FE-->>C: Display products
```

---

## 📊 Deployment Zones

```
┌─────────────────────────────────────────────────────────────┐
│                    KUBERNETES CLUSTER                        │
│  ┌──────────────────────────────────────────────────────┐   │
│  │                  INGRESS ZONE                        │   │
│  │  • Ingress Controller (api.example.com)              │   │
│  │  • SSL/TLS Termination                               │   │
│  └───────────────────────┬────────────────────────────┐ │   │
│                          │                            │ │   │
│  ┌──────────────────────────────────────────────────┐ │ │   │
│  │          API GATEWAY ZONE (Nginx)                │ │ │   │
│  │  • Route requests to services                    │ │ │   │
│  │  • Rate limiting (future)                        │ │ │   │
│  │  • Request logging                               │ │ │   │
│  └──────────────────────────────────────────────────┘ │ │   │
│         │         │         │       │       │         │ │   │
│  ┌──────┴─────────┴─────────┴───────┴───────┴────┐    │ │   │
│  │        MICROSERVICES ZONE                    │    │ │   │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  │    │ │   │
│  │  │  User    │  │Catalogue │  │  Order   │  │    │ │   │
│  │  │ Service  │  │ Service  │  │ Service  │  │    │ │   │
│  │  └────┬─────┘  └────┬─────┘  └────┬─────┘  │    │ │   │
│  │       │             │             │        │    │ │   │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  │    │ │   │
│  │  │ Payment  │  │Shipping  │  │  Cart    │  │    │ │   │
│  │  │ Service  │  │ Service  │  │ Service  │  │    │ │   │
│  │  └──────────┘  └──────────┘  └──────────┘  │    │ │   │
│  └──────────────────────────────────────────────┘    │ │   │
│         │                                             │ │   │
│  ┌──────┴──────────────────────────────────────┐     │ │   │
│  │      DATABASE ZONE (PostgreSQL)             │     │ │   │
│  │  • user_db (separate PVC)                   │     │ │   │
│  │  • catalogue_db (separate PVC)              │     │ │   │
│  │  • order_db (separate PVC)                  │     │ │   │
│  │  • payment_db (separate PVC)                │     │ │   │
│  │  • shipping_db (separate PVC)               │     │ │   │
│  └──────────────────────────────────────────────┘    │ │   │
│         │                                             │ │   │
│  ┌──────┴──────────────────────────────────────┐     │ │   │
│  │    MESSAGE QUEUE ZONE (RabbitMQ)            │     │ │   │
│  │  • shipping.requests queue                  │     │ │   │
│  │  • order.events (future)                    │     │ │   │
│  └──────────────────────────────────────────────┘    │ │   │
│                                                      │ │   │
│  ┌──────────────────────────────────────────────┐   │ │   │
│  │     FRONTEND ZONE (Static + Nginx)           │   │ │   │
│  │  • React/Vue application                     │   │ │   │
│  │  • Port 80 (external)                        │   │ │   │
│  └──────────────────────────────────────────────┘   │ │   │
└─────────────────────────────────────────────────────┘ │   │
└────────────────────────────────────────────────────────┘
```

---

## 🔍 Service Dependencies

```mermaid
graph LR
    FE["🎨 Frontend"]
    GW["🚪 Gateway"]
    
    FE -->|HTTP| GW
    
    GW -->|REST| US["👤 User<br/>Service"]
    GW -->|REST| CS["📦 Catalogue<br/>Service"]
    GW -->|REST| OS["📋 Order<br/>Service"]
    GW -->|REST| PS["💳 Payment<br/>Service"]
    GW -->|REST| SS["🚚 Shipping<br/>Service"]
    GW -->|REST| CAS["🛒 Cart<br/>Service"]
    
    OS -->|AMQP| RMQ["🐰 RabbitMQ"]
    SS -->|AMQP| RMQ
    
    US -->|SQL| UDB["🗄️ user_db"]
    CS -->|SQL| CDB["🗄️ catalogue_db"]
    OS -->|SQL| ODB["🗄️ order_db"]
    PS -->|SQL| PDB["🗄️ payment_db"]
    SS -->|SQL| SDB["🗄️ shipping_db"]
    
    OS -.->|Query| CS
    
    style FE fill:#90caf9
    style GW fill:#90caf9
    style US fill:#a5d6a7
    style CS fill:#a5d6a7
    style OS fill:#a5d6a7
    style PS fill:#a5d6a7
    style SS fill:#a5d6a7
    style CAS fill:#a5d6a7
    style RMQ fill:#ffe082
    style UDB fill:#ffab91
    style CDB fill:#ffab91
    style ODB fill:#ffab91
    style PDB fill:#ffab91
    style SDB fill:#ffab91
```

---

## ⚙️ Technology Stack

| Layer | Technology | Port | Purpose |
|-------|-----------|------|---------|
| **Load Balancer** | Ingress (K8s) | 80/443 | Entry point, SSL termination |
| **API Gateway** | Nginx | 80/443 | Service routing, reverse proxy |
| **Frontend** | Nginx (React/Vue) | 80 | Static content delivery |
| **Services** | Node.js + Express | 3002-3006 | Business logic |
| **Databases** | PostgreSQL 14 | 5432 | Persistent data storage |
| **Message Queue** | RabbitMQ | 5672 | Async messaging |
| **Orchestration** | Kubernetes | - | Container orchestration |
| **Container Runtime** | Docker | - | Containerization |

---

## 📈 Scalability

```mermaid
graph LR
    A["Load"] -->|Increases| B["Horizontal Pod Autoscaler"]
    B -->|Scale up| C["More Pods"]
    C -->|Distribute| D["Multiple Replicas"]
    D -->|Better| E["Performance"]
    
    style A fill:#ffab91
    style B fill:#ffe082
    style C fill:#a5d6a7
    style D fill:#a5d6a7
    style E fill:#90caf9
```

---

## 🔐 Security Layers

```
Client Request
    ↓
[SSL/TLS Termination at Ingress]
    ↓
[Ingress Authentication/Authorization]
    ↓
[API Gateway Rate Limiting]
    ↓
[Service-level JWT Validation]
    ↓
[Database Query Validation]
    ↓
Secure Response
```

---

## 📝 Notes

- **Database per Service**: Each microservice has its own PostgreSQL database
- **Async Communication**: Order → Shipping via RabbitMQ (eventual consistency)
- **API Gateway**: Single entry point for all client requests
- **Load Balancing**: K8s handles pod-level load balancing
- **Health Checks**: Each service has `/health` endpoint for K8s probes
- **Logging**: Centralized logging (future: ELK Stack)
- **Monitoring**: Prometheus + Grafana (future)

---

*Generated: January 2026 | Microservice E-Commerce Platform*
