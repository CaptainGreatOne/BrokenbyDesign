---
phase: 06-chaos-engineering
plan: "02"
subsystem: chaos
tags: [flask, grpc, interceptor, chaos-engineering, prometheus, python, threading]

requires:
  - phase: 01-foundation
    provides: order-api gRPC service (server.py, metrics.py)
  - phase: 05-distributed-tracing
    provides: OTel tracing integration in order-api

provides:
  - chaos.py module with in-memory state, gRPC interceptor, and Flask HTTP endpoints
  - /chaos/enable|disable|reset|status on port 8000 (order-api metrics port)
  - ChaosInterceptor registered in gRPC server
  - Combined Flask server for both /metrics and /chaos/* on port 8000

affects:
  - 06-03 (web-gateway chaos — parallel service, similar pattern)
  - 06-04 (chaos playbooks — uses these endpoints)
  - 06-05 (observability validation — injects conditions observed in dashboards)

tech-stack:
  added: [flask>=3.0.0]
  patterns:
    - "Flask daemon thread serving chaos control + Prometheus metrics on unified port"
    - "gRPC ServerInterceptor for cross-cutting chaos injection"
    - "threading.Timer for optional auto-disable of chaos scenarios"
    - "In-memory chaos state with per-scenario reset/cleanup"

key-files:
  created:
    - services/order-api/src/chaos.py
  modified:
    - services/order-api/src/server.py
    - services/order-api/src/metrics.py
    - services/order-api/requirements.txt

key-decisions:
  - "Higher latency presets (500ms mild, 5000ms severe) vs web-gateway to simulate slow DB queries"
  - "Flask replaces prometheus_client.start_http_server so chaos endpoints share port 8000"
  - "ChaosInterceptor uses _replace on handler to wrap unary_unary without changing handler type"
  - "All chaos state in-memory only — resets on container restart (intentional design)"

patterns-established:
  - "Chaos HTTP server pattern: Flask daemon thread on existing metrics port, /metrics proxied via generate_latest()"
  - "gRPC interceptor pattern: intercept_service wraps unary_unary via handler._replace"
  - "Auto-disable pattern: threading.Timer with daemon=True, timer ref stored in chaos_state for cancellation on re-enable"

duration: 2min
completed: 2026-02-14
---

# Phase 6 Plan 02: Order-API Chaos Engineering Summary

**gRPC server interceptor with Flask chaos control API (latency/errors/crash/memory/disk) on order-api port 8000, replacing prometheus start_http_server with unified Flask serving /metrics and /chaos/***

## Performance

- **Duration:** 2 min
- **Started:** 2026-02-14T14:26:53Z
- **Completed:** 2026-02-14T14:28:21Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments

- Created chaos.py with five scenario types (latency, errors, crash, memory, disk) with mild/severe presets tailored for database simulation (500ms/5000ms)
- ChaosInterceptor registered as gRPC server interceptor — injects latency, error responses, and crash countdown on every RPC call
- Flask app unified on port 8000 serves both Prometheus /metrics and /chaos/* control endpoints
- Optional duration_seconds on /chaos/enable starts a daemon threading.Timer that auto-disables the scenario

## Task Commits

1. **Task 1: Create chaos state module with gRPC interceptor and HTTP endpoints** - `b783bcb` (feat)
2. **Task 2: Integrate chaos interceptor and HTTP server into order-api** - `82bbb22` (feat)

## Files Created/Modified

- `services/order-api/src/chaos.py` - In-memory chaos state, PRESETS, ChaosInterceptor, Flask chaos_app, start_chaos_server
- `services/order-api/src/server.py` - Imports ChaosInterceptor + start_chaos_server; registers interceptor in gRPC server; replaces metrics server call
- `services/order-api/src/metrics.py` - Removed start_http_server import and start_metrics_server function (now handled by chaos.py)
- `services/order-api/requirements.txt` - Added flask>=3.0.0

## Decisions Made

- Higher latency presets (500ms mild, 5000ms severe) than web-gateway defaults to realistically simulate slow database queries rather than network latency
- Flask replaces `prometheus_client.start_http_server` so both concerns share port 8000 without needing an additional port
- `handler._replace(unary_unary=...)` used in interceptor to avoid breaking grpc handler namedtuple type while wrapping
- `os._exit(1)` (not `sys.exit`) for crash scenario because it bypasses Python cleanup and immediately terminates like a real crash

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Order-api chaos endpoints ready at port 8000 (/chaos/enable|disable|reset|status)
- Prometheus metrics continue to be available at port 8000 /metrics
- Ready for Phase 6 Plan 03 (web-gateway chaos) which follows the same Flask + interceptor pattern
- After both services have chaos, Plan 04 (playbooks) can exercise both simultaneously

---
*Phase: 06-chaos-engineering*
*Completed: 2026-02-14*
