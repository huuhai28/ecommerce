# Mini E-commerce (Dev notes)

Quick guide to run this project (Docker Compose)

- Start services & DB:

```bash
docker compose up -d
```

- If you change backend code, rebuild the specific service:

```bash
docker compose up -d --build catalogue_service
docker compose up -d --build user_service
docker compose up -d --build order_service
```

- Initialize DB (create tables + seed products):

```bash
docker cp db/init.sql postgres_db_main:/tmp/init.sql
docker exec postgres_db_main psql -U postgres -d ecommerce_db -f /tmp/init.sql
```

- Ports used by frontend/API:
  - Frontend container: 80 -> host 8080
  - User service: 3004 (host 3004)
  - Catalogue service: 3002 (host 3002)
  - Order service: 3003 (host 3003)

Notes:
- If features in the web UI don't work, check browser console for network errors and verify the corresponding service is reachable (curl http://localhost:3002/api/products etc.).
- If you change SQL column names that are reserved keywords (e.g. `desc`), make sure to quote them in SQL ("desc").

---

Additional Architecture & Services (continued)

3.1.2 Front-end
- The front-end is a small static single-page app served from the `fontend/` directory. It uses vanilla JS to call microservices:
  - `GET /api/products` from Catalogue Service to list products
  - `POST /api/register` and `POST /api/login` against User Service for auth
  - `POST /api/orders` and `GET /api/orders/me` to create and view orders via Order Service
  - The frontend stores some demo state in `localStorage` (products, cart, demo users).

3.1.3 Order service
- The Order Service (`services/order`) is responsible for placing orders and reading user orders. It:
  - Validates JWT tokens (expects tokens issued by User Service)
  - Saves `orders` and `order_items` inside PostgreSQL (transactional)
  - Calls Payment Service (configurable via `PAYMENT_URL`) to process a payment (mockable)
  - Optionally updates order `status` depending on payment success

3.1.4 Payment service
- The Payment Service is a small, pluggable component meant to accept requests to charge an order and respond with success/failure. In this repo it is left minimal (can be mocked). API contract (suggested):
  - `POST /api/payments` { orderId, amount, method } -> { ok: true, payment: { id, provider, status } }
  - Payment should be idempotent for the same `orderId`.

3.1.5 User service
- The User Service (`services/user`) handles registration and login. It:
  - Stores `users` in PostgreSQL (with `password_hash`)
  - Issues JWT tokens used by other services
  - Exposes `/api/register` and `/api/login`

3.1.6 Catalogue service
- The Catalogue Service (`services/catalogue`) reads from the `products` table and provides product listings for the front-end. It exposes `GET /api/products` and can be extended to support product management endpoints.

3.1.7 Other services
- Cart service: Manages temporary cart/payment info as simple key-value pairs (per-user or per-order). It is suitable for storing payment metadata or transaction references.

- Shipping service: Responsible for scheduling shipping after orders are processed. In the intended architecture shipping is implemented as a separate service (Java is used in your notes) and integrates via a message broker (RabbitMQ):
  - Order Service publishes shipping events to an exchange or queue when the order is ready for shipping
  - Shipping service consumes messages from Queue-Master (e.g. `shipping.requests`) and creates shipping records or calls carriers
  - Use message acknowledgements (ACK) to ensure reliable delivery and requeue on errors

Message Broker (RabbitMQ)
- RabbitMQ is the message broker used to decouple order processing and shipping. Recommended setup in `docker-compose.yml`:
  - `rabbitmq:3-management` image with management plugin enabled (port 5672 and 15672)
  - Use exchanges and routing keys to route `order.created` or `shipping.request` messages

Sample shipping message (JSON):
```
{
  "orderId": 123,
  "userId": 45,
  "items": [{"productId":"p1","qty":2}],
  "address": {"name":"Nguyen","phone":"0123..","addr":"..."},
  "total": 500000
}
```

Deployment & Local Run
- Example docker-compose additions to run RabbitMQ and optional services:
  - Add `rabbitmq` service (image `rabbitmq:3-management`), publish `5672:5672` and `15672:15672`.
  - Add `payment_service`, `cart_service`, `shipping_service` build contexts if you implement them.

Recommendations & Next Steps
- Implement (or mock) a Payment Service API so Order Service can call it reliably and test success/failure flows.
- Add a small Cart Service API for storing key-value payment metadata (or use Redis for persistence if needed).
- Implement Shipping consumer (Java or Node) which listens to RabbitMQ and updates shipping status. Provide sample message schemas and error handling strategy.
- Add basic integration tests for the order flow: place order -> payment -> message to RabbitMQ -> shipping consumer processes message.

If you want, I can:
- (A) finish the documentation as a new `docs/architecture.md` file,
- (B) add a `rabbitmq` service to `docker-compose.yml`, and
- (C) scaffold basic `cart`, `payment` and `shipping` service prototypes (Node) so you have a runnable end-to-end demo.

Tell me which of A/B/C you'd like me to do next and I will proceed.

New services added (for local end-to-end demo):
- `payment_service` on host port 3005 (mock payment API)
- `cart_service` on host port 3006 (simple key-value cart store)
- `shipping_service` on host port 3007 (consumer listens to RabbitMQ and writes to `shipping` table)
- `rabbitmq` with management plugin exposed on 15672 (web UI) and 5672 for AMQP

To run the full stack locally:
```bash
docker compose up -d --build
```
Check RabbitMQ management at http://localhost:15672 (guest/guest)

Notes: The Order Service will publish `shipping.requests` messages to RabbitMQ when orders are created and when payment succeeds. The Shipping Service consumes those messages and stores them in the `shipping` table.
