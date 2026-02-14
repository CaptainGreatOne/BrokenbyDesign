#!/bin/bash
# chaos-scenarios.sh - Run pre-built chaos scenarios
# Usage: ./scripts/chaos-scenarios.sh <scenario-name>
# Available scenarios:
#   slow-gateway     - Mild latency on web-gateway (simulates network issues)
#   slow-database    - Severe latency on order-api (simulates slow DB queries)
#   error-storm      - High error rate across all services
#   cascade-failure  - Latency on order-api + errors on web-gateway (compounding failure)
#   worker-slowdown  - Severe latency on fulfillment-worker (queue backs up)
#   total-chaos      - Mild latency + mild errors on ALL services simultaneously

CONTROLLER_URL="${CHAOS_CONTROLLER_URL:-http://localhost:9095}"

enable() {
  local service=$1 scenario=$2 severity=$3
  echo "  -> $service: $scenario ($severity)"
  curl -s -X POST "$CONTROLLER_URL/api/chaos/enable" \
    -H "Content-Type: application/json" \
    -d "{\"service\": \"$service\", \"scenario\": \"$scenario\", \"severity\": \"$severity\"}" > /dev/null
}

SCENARIO="${1:?Usage: $0 <scenario-name>. Run with --list to see available scenarios.}"

case "$SCENARIO" in
  --list)
    echo "Available chaos scenarios:"
    echo "  slow-gateway     - Mild latency on web-gateway"
    echo "  slow-database    - Severe latency on order-api"
    echo "  error-storm      - High error rate across all services"
    echo "  cascade-failure  - Latency on order-api + errors on web-gateway"
    echo "  worker-slowdown  - Severe latency on fulfillment-worker"
    echo "  total-chaos      - Mild latency + mild errors on ALL services"
    echo ""
    echo "After running a scenario, observe the impact in:"
    echo "  - Grafana:     http://localhost:3001"
    echo "  - Prometheus:  http://localhost:9090"
    echo "  - Jaeger:      http://localhost:16686 (requires --profile tracing)"
    echo ""
    echo "Reset with: ./scripts/chaos-reset.sh"
    ;;

  slow-gateway)
    echo "Scenario: Slow Gateway"
    echo "Effect: All requests through web-gateway get 300ms added latency"
    echo "Observe: http_request_duration_seconds histogram shift in Grafana"
    echo ""
    enable web-gateway latency mild
    ;;

  slow-database)
    echo "Scenario: Slow Database Queries"
    echo "Effect: Order-api gRPC calls get 5000ms added latency (simulates slow DB)"
    echo "Observe: grpc_request_duration_seconds spike, upstream timeouts in web-gateway"
    echo ""
    enable order-api latency severe
    ;;

  error-storm)
    echo "Scenario: Error Storm"
    echo "Effect: 50% of requests fail across all services"
    echo "Observe: Error rate spike in Grafana, alert rules fire, error logs in Loki"
    echo ""
    enable all errors severe
    ;;

  cascade-failure)
    echo "Scenario: Cascade Failure"
    echo "Effect: Order-api slow + web-gateway errors (compounding failure pattern)"
    echo "Observe: How downstream latency causes upstream errors, visible in traces"
    echo ""
    enable order-api latency severe
    sleep 1
    enable web-gateway errors mild
    ;;

  worker-slowdown)
    echo "Scenario: Worker Slowdown"
    echo "Effect: Fulfillment worker processing gets 5000ms added latency"
    echo "Observe: Queue depth grows, processing duration spikes, orders stuck in 'processing'"
    echo ""
    enable fulfillment-worker latency severe
    ;;

  total-chaos)
    echo "Scenario: Total Chaos"
    echo "Effect: Mild latency + mild errors on ALL services simultaneously"
    echo "Observe: System-wide degradation, all dashboards show impact"
    echo ""
    enable all latency mild
    sleep 1
    enable all errors mild
    ;;

  *)
    echo "Unknown scenario: $SCENARIO"
    echo "Run with --list to see available scenarios"
    exit 1
    ;;
esac

echo ""
echo "Chaos active! Observe impact in Grafana (http://localhost:3001)"
echo "Reset with: ./scripts/chaos-reset.sh"
