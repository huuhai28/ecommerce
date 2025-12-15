# Cart service

A lightweight Cart service storing per-user cart data in Redis.

Endpoints:
- GET `/api/cart/:userId`
- POST `/api/cart/:userId` (create/replace)
- PUT `/api/cart/:userId` (update)
- DELETE `/api/cart/:userId`
- GET `/health`

Run locally with:

```bash
cp services/cart/.env.example .env
npm install
npm start
```

Docker:

```bash
docker compose up -d --build cart_service
```
