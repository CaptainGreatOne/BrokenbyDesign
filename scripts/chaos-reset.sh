#!/bin/bash
# chaos-reset.sh - Reset all chaos scenarios across all services
# Usage: ./scripts/chaos-reset.sh [service]
# Examples:
#   ./scripts/chaos-reset.sh           # Reset all services
#   ./scripts/chaos-reset.sh web-gateway  # Reset only web-gateway
#
# NOTE: If a service was crashed by a chaos crash scenario, it stays down
# (docker-compose.chaos.yml sets restart: "no" for app services).
# To bring it back up after reset:
#   docker compose -f docker-compose.yml -f docker-compose.chaos.yml --profile chaos up -d

CONTROLLER_URL="${CHAOS_CONTROLLER_URL:-http://localhost:9095}"
SERVICE="${1:-all}"

echo "Resetting chaos on: $SERVICE"
echo ""

RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$CONTROLLER_URL/api/chaos/reset" \
  -H "Content-Type: application/json" \
  -d "{\"service\": \"$SERVICE\"}")

HTTP_CODE=$(echo "$RESPONSE" | tail -1)
BODY=$(echo "$RESPONSE" | head -n -1)

if [ "$HTTP_CODE" -eq 200 ]; then
  echo "SUCCESS: Chaos reset"
  echo "$BODY" | python3 -m json.tool 2>/dev/null || echo "$BODY"
else
  echo "ERROR: HTTP $HTTP_CODE"
  echo "$BODY"
  exit 1
fi

# Show final status
echo ""
echo "Current chaos status:"
curl -s "$CONTROLLER_URL/api/chaos/status?service=all" | python3 -m json.tool 2>/dev/null
