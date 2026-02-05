.PHONY: up down restart logs logs-service status clean reset health stats proto-gen

# Start all services
up:
	docker compose up -d

# Stop all services
down:
	docker compose down

# Restart all services
restart:
	docker compose restart

# Follow logs for all services
logs:
	docker compose logs -f

# Follow logs for a specific service (usage: make logs-service SERVICE=web-gateway)
logs-service:
	docker compose logs -f $(SERVICE)

# Show service status
status:
	docker compose ps

# Stop services and remove volumes (fresh start)
clean:
	docker compose down -v

# Clean and restart (full reset)
reset: clean up

# Run health checks (will be created in Plan 06)
health:
	./scripts/health-check.sh

# Show container resource usage
stats:
	docker stats --no-stream

# Generate Python protobuf files from proto/order.proto
proto-gen:
	@echo "Generating Python protobuf files..."
	python -m grpc_tools.protoc -I./proto --python_out=./services/order-api --grpc_python_out=./services/order-api proto/order.proto
	@echo "Protobuf generation complete"
