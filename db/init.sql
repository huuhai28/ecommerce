-- Init script for ecommerce sample DB
-- Creates tables and inserts sample products

BEGIN;

CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  password_hash TEXT
);

CREATE TABLE IF NOT EXISTS products (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  price INT NOT NULL,
  category TEXT,
  img TEXT,
  "desc" TEXT
);

CREATE TABLE IF NOT EXISTS orders (
  id SERIAL PRIMARY KEY,
  user_id INT REFERENCES users(id),
  total INT NOT NULL,
  status TEXT DEFAULT 'Pending',
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS order_items (
  id SERIAL PRIMARY KEY,
  order_id INT REFERENCES orders(id) ON DELETE CASCADE,
  product_id TEXT NOT NULL,
  quantity INT NOT NULL,
  price INT NOT NULL
);

CREATE TABLE IF NOT EXISTS payments (
  id SERIAL PRIMARY KEY,
  payment_id TEXT UNIQUE NOT NULL,
  order_id INT,
  amount INT NOT NULL,
  method TEXT,
  status TEXT,
  provider TEXT,
  metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Shipping records
CREATE TABLE IF NOT EXISTS shippings (
  id SERIAL PRIMARY KEY,
  shipping_id TEXT UNIQUE NOT NULL,
  order_id INT,
  user_id INT,
  status TEXT,
  provider TEXT,
  tracking_number TEXT,
  payload JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Ensure FK and index exist (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'payments_order_id_fkey'
  ) THEN
    -- Clean orphaned payments (set to NULL) before adding FK
    UPDATE payments SET order_id = NULL WHERE order_id IS NOT NULL AND order_id NOT IN (SELECT id FROM orders);
    ALTER TABLE payments ADD CONSTRAINT payments_order_id_fkey FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE SET NULL;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes WHERE indexname = 'payments_order_id_idx'
  ) THEN
    CREATE INDEX payments_order_id_idx ON payments(order_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'shippings_order_id_fkey'
  ) THEN
    UPDATE shippings SET order_id = NULL WHERE order_id IS NOT NULL AND order_id NOT IN (SELECT id FROM orders);
    ALTER TABLE shippings ADD CONSTRAINT shippings_order_id_fkey FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE SET NULL;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes WHERE indexname = 'shippings_order_id_idx'
  ) THEN
    CREATE INDEX shippings_order_id_idx ON shippings(order_id);
  END IF;
END$$;

-- Seed sample products used by frontend (ids match SAMPLE in frontend)
INSERT INTO products(id, title, price, category, img, "desc") VALUES
('p1','Áo thun cotton',199000,'Áo','https://picsum.photos/seed/t1/800/600','Áo thun co dãn, thoáng mát.'),
('p2','Quần jean',499000,'Quần','https://picsum.photos/seed/t2/800/600','Quần jean nam form ôm.'),
('p3','Giày sneaker',899000,'Giày','https://picsum.photos/seed/t3/800/600','Giày sneaker thời trang.'),
('p4','Nón lưỡi trai',99000,'Phụ kiện','https://picsum.photos/seed/t4/800/600','Nón chất liệu nhẹ.'),
('p5','Áo khoác',350000,'Áo','https://picsum.photos/seed/t5/800/600','Áo khoác ấm cho mùa đông.')
ON CONFLICT (id) DO NOTHING;

COMMIT;

-- End of script
