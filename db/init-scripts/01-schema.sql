-- Database schema for orders system
-- This file is executed automatically by PostgreSQL on first startup

-- Products table: catalog of available products
CREATE TABLE IF NOT EXISTS products (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL UNIQUE,
  price DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Orders table: customer orders
CREATE TABLE IF NOT EXISTS orders (
  id SERIAL PRIMARY KEY,
  product_id INTEGER NOT NULL REFERENCES products(id),
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  status VARCHAR(50) DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Index for fulfillment worker status queries
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);

-- Index for product lookups
CREATE INDEX IF NOT EXISTS idx_orders_product_id ON orders(product_id);
