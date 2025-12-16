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
  order_id INT REFERENCES orders(id),
  provider TEXT,
  amount INT,
  status TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS shipping (
  id SERIAL PRIMARY KEY,
  order_id INT REFERENCES orders(id),
  user_id INT,
  address JSONB,
  items JSONB,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT NOW(),
  processed_at TIMESTAMP
);

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
