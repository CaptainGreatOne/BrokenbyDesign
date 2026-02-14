#!/bin/bash
# chaos-enable.sh - Enable a chaos scenario on a service via the chaos-controller
# Usage: ./scripts/chaos-enable.sh <service> <scenario> <severity> [duration_seconds]
# Examples:
#   ./scripts/chaos-enable.sh web-gateway latency mild
#   ./scripts/chaos-enable.sh all errors severe
#   ./scripts/chaos-enable.sh order-api crash mild
#   ./scripts/chaos-enable.sh web-gateway latency severe 60   # auto-disables after 60s
#
# Start the chaos environment with:
#   docker compose -f docker-compose.yml -f docker-compose.chaos.yml --profile chaos up -d

CONTROLLER_URL="${CHAOS_CONTROLLER_URL:-http://localhost:9095}"

SERVICE="${1:?Usage: $0 <service> <scenario> <severity> [duration_seconds]}"
SCENARIO="${2:?Usage: $0 <service> <scenario> <severity> [duration_seconds]}"
SEVERITY="${3:?Usage: $0 <service> <scenario> <severity> [duration_seconds]}"
DURATION="${4:-}"

echo "Enabling chaos: service=$SERVICE scenario=$SCENARIO severity=$SEVERITY"
if [ -n "$DURATION" ]; then
  echo "Duration: ${DURATION}s (auto-disables after timeout)"
fi
echo ""

# Build JSON body with optional duration_seconds
JSON_BODY="{\"service\": \"$SERVICE\", \"scenario\": \"$SCENARIO\", \"severity\": \"$SEVERITY\""
if [ -n "$DURATION" ]; then
  JSON_BODY="$JSON_BODY, \"duration_seconds\": $DURATION"
fi
JSON_BODY="$JSON_BODY}"

RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$CONTROLLER_URL/api/chaos/enable" \
  -H "Content-Type: application/json" \
  -d "$JSON_BODY")

HTTP_CODE=$(echo "$RESPONSE" | tail -1)
BODY=$(echo "$RESPONSE" | head -n -1)

if [ "$HTTP_CODE" -eq 200 ]; then
  echo "SUCCESS: Chaos enabled"
  echo "$BODY" | python3 -m json.tool 2>/dev/null || echo "$BODY"
else
  echo "ERROR: HTTP $HTTP_CODE"
  echo "$BODY"
  exit 1
fi
