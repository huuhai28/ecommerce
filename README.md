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
  - Payment service: 3005 (host 3005)
  - RabbitMQ management UI: 15672 (guest/guest)
  - Shipping service: 3007 (host 3007)
  - Cart service: 3006 (host 3006) — Redis-backed cart service
  - Redis: 6379 (host 6379)

Notes:
- If features in the web UI don't work, check browser console for network errors and verify the corresponding service is reachable (curl http://localhost:3002/api/products etc.).
- If you change SQL column names that are reserved keywords (e.g. `desc`), make sure to quote them in SQL ("desc").

## TODOs
- See `TODO.md` for the current tracked work and statuses.

