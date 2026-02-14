---
status: testing
phase: 06-chaos-engineering
source: [06-01-SUMMARY.md, 06-02-SUMMARY.md, 06-03-SUMMARY.md, 06-04-SUMMARY.md, 06-05-SUMMARY.md]
started: 2026-02-14T15:15:00Z
updated: 2026-02-14T15:15:00Z
---

## Current Test

number: 1
name: Environment starts with chaos profile
expected: |
  Run: docker compose -f docker-compose.yml -f docker-compose.chaos.yml --profile chaos up -d --build
  All core services + chaos-controller should start. chaos-controller should reach healthy status.
  Verify with: docker compose ps
  Expected: chaos-controller on port 9095 shows "healthy"
awaiting: user response

## Tests

### 1. Environment starts with chaos profile
expected: docker compose up with --profile chaos starts all core services plus chaos-controller. chaos-controller reaches healthy status on port 9095.
result: [pending]

### 2. Chaos controller web UI loads
expected: Open http://localhost:9095 in browser. Dark control panel UI loads with three service status cards (web-gateway, order-api, fulfillment-worker), a control form, and a "Reset All" button.
result: [pending]

### 3. Enable chaos via shell script
expected: Run ./scripts/chaos-enable.sh web-gateway latency mild — prints SUCCESS with JSON response showing latency enabled with 300ms delay.
result: [pending]

### 4. Chaos status reflects active scenario
expected: After enabling latency on web-gateway, the chaos controller UI (http://localhost:9095) shows web-gateway card in yellow/active state indicating latency is enabled. Also: curl http://localhost:9095/api/chaos/status?service=all shows web-gateway latency enabled.
result: [pending]

### 5. Reset chaos via shell script
expected: Run ./scripts/chaos-reset.sh — prints SUCCESS, shows final status with all scenarios disabled across all services.
result: [pending]

### 6. Named scenarios list
expected: Run ./scripts/chaos-scenarios.sh --list — shows 6 named scenarios (slow-gateway, slow-database, error-storm, cascade-failure, worker-slowdown, total-chaos) with descriptions and observation hints (Grafana, Prometheus, Jaeger URLs).
result: [pending]

### 7. Latency injection visible in Grafana
expected: Run ./scripts/chaos-scenarios.sh slow-gateway, wait 30-60 seconds, then check Grafana (http://localhost:3001) request duration panels. The p95/p99 latency for web-gateway should show a visible spike (~300ms added). Reset with ./scripts/chaos-reset.sh after testing.
result: [pending]

### 8. Error injection with OTel span marking in Jaeger
expected: Start tracing profile if not running (--profile tracing). Run ./scripts/chaos-enable.sh web-gateway errors severe. Wait for traffic generator to send requests. Open Jaeger (http://localhost:16686), select web-gateway service, find traces — some traces should show ERROR status with chaos.injected=true attribute. Reset after testing.
result: [pending]

### 9. Crash scenario leaves service down
expected: Run ./scripts/chaos-enable.sh web-gateway crash severe (countdown=3). After ~3 requests from traffic generator, web-gateway container should stop. Run docker compose ps — web-gateway should show exited/stopped (restart: "no" from override prevents auto-restart). Bring it back with: docker compose -f docker-compose.yml -f docker-compose.chaos.yml --profile chaos up -d web-gateway
result: [pending]

### 10. Duration auto-disable
expected: Run ./scripts/chaos-enable.sh web-gateway latency mild 15 (15-second duration). Verify chaos is active via status endpoint, wait 15+ seconds, check status again — latency should be automatically disabled without manual reset.
result: [pending]

## Summary

total: 10
passed: 0
issues: 0
pending: 10
skipped: 0

## Gaps

[none yet]
