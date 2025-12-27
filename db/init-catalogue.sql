-- Init script for CATALOGUE service database
-- Creates product and category tables

BEGIN;

-- ==================== PRODUCT CATEGORY & PRODUCT ====================

CREATE TABLE IF NOT EXISTS product_category (
  id SERIAL PRIMARY KEY,
  category_name VARCHAR(255) NOT NULL
);

CREATE TABLE IF NOT EXISTS product (
  id SERIAL PRIMARY KEY,
  sku VARCHAR(255) UNIQUE,
  name VARCHAR(255) NOT NULL,
  description VARCHAR(255),
  unit_price DECIMAL(13,2) NOT NULL DEFAULT 0,
  image_url VARCHAR(255),
  active BOOLEAN DEFAULT TRUE,
  units_in_stock INTEGER DEFAULT 0,
  date_created TIMESTAMP DEFAULT NOW(),
  last_updated TIMESTAMP DEFAULT NOW(),
  category_id BIGINT REFERENCES product_category(id)
);

-- ==================== COUNTRY & STATE ====================

CREATE TABLE IF NOT EXISTS country (
  id SMALLINT PRIMARY KEY,
  code VARCHAR(2),
  name VARCHAR(255) NOT NULL
);

CREATE TABLE IF NOT EXISTS state (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  country_id SMALLINT REFERENCES country(id)
);

-- ==================== SEED DATA ====================

-- Insert product categories
INSERT INTO product_category(category_name) VALUES
('BOOKS'),
('CLOTHING'),
('SHOES'),
('ACCESSORIES')
ON CONFLICT DO NOTHING;

-- Insert sample products (matching frontend categories)
INSERT INTO product(sku, name, description, image_url, active, units_in_stock, unit_price, category_id, date_created) VALUES
('SKU-SHIRT-001','Áo thun cotton','Áo thun co dãn, thoáng mát.','https://picsum.photos/seed/t1/800/600',TRUE,100,199000,2,NOW()),
('SKU-PANTS-001','Quần jean','Quần jean nam form ôm.','https://picsum.photos/seed/t2/800/600',TRUE,100,499000,2,NOW()),
('SKU-SHOES-001','Giày sneaker','Giày sneaker thời trang.','https://picsum.photos/seed/t3/800/600',TRUE,100,899000,3,NOW()),
('SKU-ACCE-001','Nón lưỡi trai','Nón chất liệu nhẹ.','https://picsum.photos/seed/t4/800/600',TRUE,100,99000,4,NOW()),
('SKU-JACKET-001','Áo khoác','Áo khoác ấm cho mùa đông.','https://picsum.photos/seed/t5/800/600',TRUE,100,350000,2,NOW())
ON CONFLICT DO NOTHING;

-- Insert sample countries
INSERT INTO country(id, code, name) VALUES
(1,'VN','Vietnam'),
(2,'US','United States'),
(3,'BR','Brazil'),
(4,'CA','Canada')
ON CONFLICT DO NOTHING;

-- Insert sample states
INSERT INTO state(name, country_id) VALUES
('Hanoi',1),
('Ho Chi Minh',1),
('New York',2),
('California',2)
ON CONFLICT DO NOTHING;

COMMIT;
