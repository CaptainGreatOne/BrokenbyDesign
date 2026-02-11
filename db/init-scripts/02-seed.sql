-- Seed data for development and testing
-- Uses ON CONFLICT DO NOTHING for idempotency

-- Insert sample products
INSERT INTO products (name, price) VALUES
  ('Widget Alpha', 19.99),
  ('Sensor Beta', 49.99),
  ('Controller Gamma', 89.99),
  ('Display Delta', 129.99),
  ('Module Epsilon', 39.99),
  ('Adapter Zeta', 14.99),
  ('Cable Eta', 9.99),
  ('Power Supply Theta', 59.99),
  ('Enclosure Iota', 79.99),
  ('Connector Kit Kappa', 24.99)
ON CONFLICT (name) DO NOTHING;

-- Insert sample orders in various statuses
INSERT INTO orders (product_id, quantity, status, created_at) VALUES
  (1, 2, 'pending', NOW() - INTERVAL '5 minutes'),
  (3, 1, 'processing', NOW() - INTERVAL '10 minutes'),
  (5, 5, 'fulfilled', NOW() - INTERVAL '1 hour'),
  (2, 3, 'pending', NOW() - INTERVAL '2 minutes'),
  (7, 10, 'fulfilled', NOW() - INTERVAL '3 hours')
ON CONFLICT DO NOTHING;
