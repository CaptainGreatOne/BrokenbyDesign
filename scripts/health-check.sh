#!/bin/bash
set -e

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Counters
TOTAL_CHECKS=0
PASSED_CHECKS=0
FAILED_CHECKS=0

echo ""
echo "========================================="
echo "  Foundation Services Health Check"
echo "========================================="
echo ""

# Function to check service
check_service() {
    local service_name=$1
    local check_description=$2
    local check_command=$3

    TOTAL_CHECKS=$((TOTAL_CHECKS + 1))

    if eval "$check_command" > /dev/null 2>&1; then
        echo -e "${GREEN}[PASS]${NC} $check_description"
        PASSED_CHECKS=$((PASSED_CHECKS + 1))
        return 0
    else
        echo -e "${RED}[FAIL]${NC} $check_description"
        FAILED_CHECKS=$((FAILED_CHECKS + 1))
        return 1
    fi
}

# Check Docker Compose services are running
echo "Container Status Checks:"
echo "------------------------"

EXPECTED_SERVICES=("postgres" "redis" "nginx" "web-gateway" "order-api" "fulfillment-worker" "traffic-generator")

for service in "${EXPECTED_SERVICES[@]}"; do
    check_service "$service" "$service container running" \
        "docker compose ps $service --format json 2>/dev/null | grep -q '\"State\":\"running\"' || docker compose ps $service 2>/dev/null | grep -q 'Up'"
done

echo ""
echo "HTTP Endpoint Checks:"
echo "---------------------"

# Nginx health check
check_service "nginx" "Nginx responding on port 80" \
    "curl -sf http://localhost:80/ -o /dev/null"

# Web Gateway health endpoint
check_service "web-gateway" "Web Gateway /health endpoint" \
    "curl -sf http://localhost:80/health -o /dev/null"

# Traffic Generator health endpoint
check_service "traffic-generator" "Traffic Generator /health endpoint" \
    "curl -sf http://localhost:8089/health -o /dev/null"

echo ""
echo "Database & Cache Checks:"
echo "------------------------"

# PostgreSQL check
check_service "postgres" "PostgreSQL accepting connections" \
    "docker compose exec -T postgres pg_isready -U orderuser -d orderdb"

# Redis check
check_service "redis" "Redis responding to PING" \
    "docker compose exec -T redis redis-cli ping | grep -q PONG"

echo ""
echo "========================================="
echo "  Summary"
echo "========================================="
echo "Total Checks: $TOTAL_CHECKS"
echo -e "Passed: ${GREEN}$PASSED_CHECKS${NC}"
echo -e "Failed: ${RED}$FAILED_CHECKS${NC}"
echo ""

if [ $FAILED_CHECKS -eq 0 ]; then
    echo -e "${GREEN}All health checks passed!${NC}"
    exit 0
else
    echo -e "${RED}Some health checks failed!${NC}"
    exit 1
fi
