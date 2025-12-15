# Shipping service

Consumes shipping messages from RabbitMQ (`shipping.queue`) and persists to Postgres in `shippings` table.

Endpoints:
- GET `/health`
- GET `/api/shippings/:orderId`

Run locally:

```bash
cp services/shipping/.env.example .env
npm install
npm start
```

Docker:

```bash
docker compose up -d --build shipping_service rabbitmq
```
