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
('Shirts'),
('Jackets'),
('Pants'),
('Accessories')
ON CONFLICT DO NOTHING;

-- Insert sample products (Fashion items matching frontend design)
INSERT INTO product(sku, name, description, image_url, active, units_in_stock, unit_price, category_id, date_created) VALUES
-- Hawaiian Shirts Collection
('SKU-SHIRT-001','Colorful Hawaiian T-Shirt','Premium cotton Hawaiian print shirt with vibrant colors','https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?w=800&h=600&fit=crop',TRUE,50,139000,1,NOW()),
('SKU-SHIRT-002','Tropical Print Short Sleeve','Comfortable tropical pattern shirt for summer','https://images.unsplash.com/photo-1621072156002-e2fccdc0b176?w=800&h=600&fit=crop',TRUE,45,149000,1,NOW()),
('SKU-SHIRT-003','Green Leaf Pattern Shirt','Casual shirt with modern leaf design','https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=800&h=600&fit=crop',TRUE,60,129000,1,NOW()),
('SKU-SHIRT-004','Brown Floral Hawaiian Shirt','Classic Hawaiian style with brown tones','https://images.unsplash.com/photo-1594938298603-c8148c4dae35?w=800&h=600&fit=crop',TRUE,40,159000,1,NOW()),
('SKU-SHIRT-005','Pink Floral Short Sleeve','Light pink shirt with floral patterns','https://images.unsplash.com/photo-1596755389378-c31d21fd1273?w=800&h=600&fit=crop',TRUE,55,145000,1,NOW()),

-- Jackets & Outerwear
('SKU-JACKET-001','Red & Blue Bomber Jacket','Stylish color-block bomber jacket','https://images.unsplash.com/photo-1591047139829-d91aecb6caea?w=800&h=600&fit=crop',TRUE,30,599000,2,NOW()),
('SKU-JACKET-002','Orange Sport Jacket','Modern orange windbreaker jacket','https://images.unsplash.com/photo-1551028719-00167b16eac5?w=800&h=600&fit=crop',TRUE,35,549000,2,NOW()),
('SKU-JACKET-003','Beige Trench Coat','Classic beige trench coat for autumn','https://images.unsplash.com/photo-1539533018447-63fcce2678e3?w=800&h=600&fit=crop',TRUE,25,899000,2,NOW()),
('SKU-JACKET-004','Navy Blue Blazer','Formal navy blazer for business','https://images.unsplash.com/photo-1593030761757-71fae45fa0e7?w=800&h=600&fit=crop',TRUE,40,799000,2,NOW()),
('SKU-JACKET-005','Light Gray Hoodie','Comfortable gray hooded jacket','https://images.unsplash.com/photo-1556821840-3a63f95609a7?w=800&h=600&fit=crop',TRUE,50,349000,2,NOW()),
('SKU-JACKET-006','Green Olive Shirt Jacket','Utility style shirt jacket','https://images.unsplash.com/photo-1591213369363-1155cda2c50a?w=800&h=600&fit=crop',TRUE,45,459000,2,NOW()),

-- Pants Collection
('SKU-PANTS-001','Classic Blue Denim Jeans','Premium denim jeans with perfect fit','https://images.unsplash.com/photo-1542272604-787c3835535d?w=800&h=600&fit=crop',TRUE,70,499000,3,NOW()),
('SKU-PANTS-002','Black Slim Fit Jeans','Modern slim fit black jeans','https://images.unsplash.com/photo-1541099649105-f69ad21f3246?w=800&h=600&fit=crop',TRUE,65,529000,3,NOW()),
('SKU-PANTS-003','Khaki Chino Pants','Comfortable khaki chinos for casual wear','https://images.unsplash.com/photo-1473966968600-fa801b869a1a?w=800&h=600&fit=crop',TRUE,55,399000,3,NOW()),
('SKU-PANTS-004','Navy Cargo Pants','Functional cargo pants with multiple pockets','https://images.unsplash.com/photo-1624378439575-d8705ad7ae80?w=800&h=600&fit=crop',TRUE,60,449000,3,NOW()),

-- Accessories
('SKU-ACC-001','Black Cap','Classic black baseball cap','https://images.unsplash.com/photo-1588850561407-ed78c282e89b?w=800&h=600&fit=crop',TRUE,100,99000,4,NOW()),
('SKU-ACC-002','Brown Leather Belt','Premium leather belt with silver buckle','https://images.unsplash.com/photo-1624222247344-550fb60583dc?w=800&h=600&fit=crop',TRUE,80,199000,4,NOW()),
('SKU-ACC-003','Navy Beanie Hat','Warm winter beanie','https://images.unsplash.com/photo-1576871337622-98d48d1cf531?w=800&h=600&fit=crop',TRUE,90,79000,4,NOW()),
('SKU-ACC-004','Aviator Sunglasses','Classic aviator style sunglasses','https://images.unsplash.com/photo-1511499767150-a48a237f0083?w=800&h=600&fit=crop',TRUE,75,299000,4,NOW())
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
