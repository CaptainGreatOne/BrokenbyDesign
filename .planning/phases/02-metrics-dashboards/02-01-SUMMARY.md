---
phase: 02-metrics-dashboards
plan: 01
subsystem: observability
tags: [prometheus, metrics, prom-client, prometheus-client, nodejs, python, grpc, http]

# Dependency graph
requires:
  - phase: 01-foundation-services
    provides: web-gateway and order-api services running in Docker
provides:
  - Prometheus metrics endpoints at /metrics for web-gateway and order-api
  - HTTP request counter and duration histogram for web-gateway
  - gRPC request counter and duration histogram for order-api
  - Default runtime metrics (GC, memory, event loop) for both services
affects: [02-02, 02-03, 02-04, 03-centralized-logging]

# Tech tracking
tech-stack:
  added: [prom-client@15.1.3, prometheus-client@0.24.1]
  patterns: [metrics middleware pattern, histogram bucketing, label naming conventions]

key-files:
  created:
    - services/web-gateway/src/metrics.js
    - services/order-api/src/metrics.py
  modified:
    - services/web-gateway/src/server.js
    - services/web-gateway/package.json
    - services/order-api/src/server.py
    - services/order-api/requirements.txt
    - services/order-api/Dockerfile

key-decisions:
  - "Use prom-client for Node.js and prometheus-client for Python (official Prometheus client libraries)"
  - "Expose metrics at standard /metrics endpoint for both services"
  - "Track http_requests_total and http_request_duration_seconds with method, route, status_code labels"
  - "Use histogram buckets [0.001, 0.01, 0.1, 0.5, 1, 2, 5] for latency tracking (1ms to 5s)"
  - "Start separate HTTP server on port 8000 for order-api metrics (separate from gRPC on port 50051)"

patterns-established:
  - "Metrics middleware pattern: track request start time, observe duration and increment counter on res.on('finish')"
  - "Label naming: use snake_case (method, route, status_code, status) following Prometheus conventions"
  - "Metric naming: counters end in _total, durations end in _seconds"
  - "Enable default runtime metrics via collectDefaultMetrics() (Node.js) and auto-collection (Python)"

# Metrics
duration: 2min
completed: 2026-02-06
---

# Phase 02 Plan 01: Application Metrics Instrumentation Summary

**Prometheus metrics endpoints with request counters, latency histograms, and default runtime metrics for web-gateway and order-api**

## Performance

- **Duration:** 2 min
- **Started:** 2026-02-06T22:17:36Z
- **Completed:** 2026-02-06T22:19:36Z
- **Tasks:** 2
- **Files modified:** 7

## Accomplishments
- web-gateway exposes /metrics endpoint with http_requests_total counter, http_request_duration_seconds histogram, and Node.js default metrics (GC, event loop lag, memory heap)
- order-api exposes /metrics endpoint on port 8000 with grpc_requests_total counter, grpc_request_duration_seconds histogram, orders_created_total counter, and Python default metrics
- Both services track all requests with method, route/method, and status_code/status labels following Prometheus naming conventions
- Docker images build successfully with new dependencies and metrics modules

## Task Commits

Each task was committed atomically:

1. **Task 1: Instrument web-gateway with prom-client** - `2fd7fc6` (feat)
2. **Task 2: Instrument order-api with prometheus-client** - `89de0e5` (feat)

## Files Created/Modified

### Created
- `services/web-gateway/src/metrics.js` - Prometheus registry with http_requests_total counter, http_request_duration_seconds histogram, default Node.js runtime metrics
- `services/order-api/src/metrics.py` - Prometheus metrics with grpc_requests_total counter, grpc_request_duration_seconds histogram, orders_created_total counter, and start_metrics_server function

### Modified
- `services/web-gateway/package.json` - Added prom-client@15.1.3 dependency
- `services/web-gateway/src/server.js` - Added /metrics endpoint (before routes), metrics tracking middleware
- `services/order-api/requirements.txt` - Added prometheus-client>=0.24.1 dependency
- `services/order-api/src/server.py` - Added metrics tracking to all gRPC methods (CreateOrder, GetOrder, ListOrders), started metrics HTTP server on port 8000
- `services/order-api/Dockerfile` - Added EXPOSE 8000 for metrics HTTP server

## Decisions Made

1. **Separate metrics port for order-api**: Started HTTP server on port 8000 (separate from gRPC on 50051) using prometheus_client.start_http_server() which automatically serves /metrics in a daemon thread
2. **Histogram bucket selection**: Used [0.001, 0.01, 0.1, 0.5, 1, 2, 5] for latency histograms, covering 1ms to 5s range (typical microservice latency)
3. **Label cardinality management**: Used bounded label values (method, route/method, status_code/status) to avoid cardinality explosion. Route uses req.route?.path || req.path to normalize similar routes
4. **gRPC status labels**: Used gRPC status codes (OK, NOT_FOUND, INTERNAL) instead of HTTP status codes for order-api since it's a gRPC service
5. **Metrics placement in server.js**: Registered /metrics endpoint BEFORE routes mount to prevent it from being intercepted by catch-all route handlers

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None - both services instrumented successfully following standard Prometheus client library patterns. Docker builds completed without errors.

## User Setup Required

None - no external service configuration required. Metrics endpoints will be scraped by Prometheus in subsequent plans.

## Next Phase Readiness

**Ready for Plan 02-02**: fulfillment-worker (Go service) instrumentation can proceed using the same patterns.

**Ready for Plan 02-03**: Prometheus scrape configuration can target:
- web-gateway:3000/metrics (HTTP)
- order-api:8000/metrics (HTTP, separate from gRPC port 50051)

**Metrics available for scraping:**
- `http_requests_total{method, route, status_code}` (web-gateway)
- `http_request_duration_seconds{method, route, status_code}` (web-gateway)
- `grpc_requests_total{method, status}` (order-api)
- `grpc_request_duration_seconds{method}` (order-api)
- `orders_created_total` (order-api)
- Default Node.js runtime metrics (web-gateway)
- Default Python runtime metrics (order-api)

**No blockers**: Both services expose standard Prometheus metrics endpoints ready for scraping.

---
*Phase: 02-metrics-dashboards*
*Completed: 2026-02-06*
