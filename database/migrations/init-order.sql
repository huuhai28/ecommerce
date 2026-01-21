

BEGIN;


CREATE TABLE IF NOT EXISTS address (
  id SERIAL PRIMARY KEY,
  street VARCHAR(255),
  city VARCHAR(255),
  state VARCHAR(255),
  country VARCHAR(255),
  zip_code VARCHAR(255)
);


CREATE TABLE IF NOT EXISTS orders (
  id SERIAL PRIMARY KEY,
  order_tracking_number VARCHAR(255) UNIQUE,
  total_price DECIMAL(19,2),
  total_quantity INTEGER,
  billing_address_id BIGINT REFERENCES address(id),
  customer_id BIGINT, 
  shipping_address_id BIGINT REFERENCES address(id),
  status VARCHAR(128) DEFAULT 'PENDING',
  date_created TIMESTAMP DEFAULT NOW(),
  last_updated TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS order_item (
  id SERIAL PRIMARY KEY,
  image_url VARCHAR(255),
  quantity INTEGER,
  unit_price DECIMAL(19,2),
  order_id BIGINT REFERENCES orders(id) ON DELETE CASCADE,
  product_id BIGINT -- Reference to product in catalogue_db (no FK since different DB)
);

COMMIT;
