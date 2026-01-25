#!/usr/bin/env bash
set -euo pipefail

GATEWAY_HOST=${GATEWAY_HOST:-192.168.1.111}
GATEWAY_PORT=${GATEWAY_PORT:-30004}
BASE="http://${GATEWAY_HOST}:${GATEWAY_PORT}"

echo "[E2E] Hitting products ..."
curl -sf "${BASE}/api/products" -o /dev/null

EMAIL="e2e+$(date +%s)@example.com"
PASS="123456"
NAME="Smoke User"

echo "[E2E] Register user ${EMAIL} ..."
REG_JSON=$(curl -sf -X POST "${BASE}/api/users/register" \
  -H 'Content-Type: application/json' \
  -d '{"email":"'"${EMAIL}"'","firstName":"'"${NAME%% *}"'","lastName":"'"${NAME#* }"'","password":"'"${PASS}"'"}')
TOKEN=$(echo "$REG_JSON" | sed -n 's/.*"token":"\([^"]*\)".*/\1/p')

if [[ -z "$TOKEN" ]]; then
  echo "[E2E] Register did not return token, try login ..."
  LOGIN_JSON=$(curl -sf -X POST "${BASE}/api/users/login" \
    -H 'Content-Type: application/json' \
    -d '{"email":"'"${EMAIL}"'","password":"'"${PASS}"'"}')
  TOKEN=$(echo "$LOGIN_JSON" | sed -n 's/.*"token":"\([^"]*\)".*/\1/p')
fi

if [[ -z "$TOKEN" ]]; then
  echo "[E2E] ERROR: cannot obtain token" >&2
  exit 1
fi

echo "[E2E] Create order ..."
ORDER_PAYLOAD='{
  "items": [{"productId":1, "quantity":1, "unitPrice":100000}],
  "shippingAddress": {"name": "'"${NAME}"'", "phone": "0909000000", "address": "123 Test St"},
  "paymentMethod": "COD"
}'

curl -sf -X POST "${BASE}/api/orders" \
  -H 'Content-Type: application/json' \
  -H "Authorization: Bearer ${TOKEN}" \
  -d "${ORDER_PAYLOAD}" | sed -n '1,120p' >/dev/null

echo "[E2E] Done."
