 Phase 1 Deployment Verification Steps

  1. Check services: docker compose ps — all 7 should show healthy
  2. Create order: curl -X POST http://localhost:80/orders -H "Content-Type: application/json" -d '{"product_id": 1, "quantity": 3}'
  3. Check fulfillment: curl http://localhost:80/orders/{order_id} (wait a few seconds, status → "fulfilled")
  4. List orders: curl http://localhost:80/orders
  5. Traffic generator: curl http://localhost:8089/status — should show steady mode
  6. Mode switching: curl -X POST http://localhost:8089/mode/burst then curl http://localhost:8089/status
  7. Structured logs: docker compose logs web-gateway --tail=5
  8. Resources: docker stats --no-stream


  