-- Init script for SHIPPING service database
-- Creates shipping table

BEGIN;

-- ==================== SHIPPING ====================

CREATE TABLE IF NOT EXISTS shipping (
  id SERIAL PRIMARY KEY,
  order_id BIGINT, -- Reference to order in order_db (no FK since different DB)
  user_id BIGINT, -- Reference to customer in user_db (no FK since different DB)
  address TEXT, -- Shipping address
  items JSONB, -- Order items as JSON
  status VARCHAR(128) DEFAULT 'pending',
  date_created TIMESTAMP DEFAULT NOW(),
  processed_at TIMESTAMP
);

COMMIT;
