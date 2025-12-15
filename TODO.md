# TODOs (tracked)

- [x] Frontend: Finish UI polish — Verify `fontend/js/script.js` shows payment details and orders list; acceptance: checkout flow shows payment and orders page updates.
- [x] Order service: finalize integration — Ensure `services/order/server.js` includes payments in `GET /api/orders/me`, handles `/api/orders/:id/payment-callback`, has error handling and logging; acceptance: orders show payment status and callbacks update order status to 'Paid'.
- [x] Payment service: complete DB-backed implementation — Verify `services/payment/server.js` stores payments in Postgres, exposes POST `/api/payments` and GET `/api/payments/:id`, and optionally calls back `ORDER_URL`.
- [x] User service: validate auth endpoints — Confirm `services/user` endpoints `/api/register` and `/api/login` work with JWTs and tokens function across services.
- [x] Catalogue service: verify products endpoints — Confirm `services/catalogue` `/api/products` works and DB seeds are present in `db/init.sql`.
- [ ] Scaffold remaining services — Implement additional services (shipping, notifications, admin/dashboard) with Dockerfiles, basic endpoints, and README notes; acceptance: each service builds and exposes a health endpoint.
- [ ] Add tests & CI — Add basic integration and unit tests for order/payment flows and a GitHub Actions workflow to run them; acceptance: tests run in CI on PRs.
- [ ] Hardening & security — Add webhook signature verification, idempotency keys, retries, and improved logging for Order/Payment services; acceptance: documented security checks and retries.
- [ ] Scaffold `services/cart` (Redis) — Implement `services/cart` (Node.js) using Redis for key-value cart storage; endpoints: POST/GET/PUT/DELETE cart entries; include Dockerfile and health endpoint.

---

If you want, I can commit these changes and push them to a remote branch, or modify the README to link to this file. Which would you prefer?