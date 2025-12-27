-- Init script for PAYMENT service database
-- Creates payment table

BEGIN;

-- ==================== PAYMENTS ====================

CREATE TABLE IF NOT EXISTS payments (
  id SERIAL PRIMARY KEY,
  payment_id VARCHAR(255) UNIQUE NOT NULL,
  order_id BIGINT, -- Reference to order in order_db (no FK since different DB)
  provider VARCHAR(255),
  amount DECIMAL(19,2),
  status VARCHAR(128),
  metadata JSONB,
  date_created TIMESTAMP DEFAULT NOW()
);

COMMIT;
