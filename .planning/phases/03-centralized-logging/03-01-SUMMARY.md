---
phase: 03-centralized-logging
plan: 01
subsystem: logging
tags: [plain-text-logging, structured-logging, loki, observability, error-simulation]

# Dependency graph
requires:
  - phase: 01-foundation
    provides: "web-gateway service with JSON logging"
  - phase: 02-metrics-dashboards
    provides: "Prometheus metrics infrastructure"
provides:
  - "Plain text logging format for Loki collection"
  - "Handler metadata pattern for log filtering"
  - "Realistic error simulation pattern for learning scenarios"
affects: [03-02-loki-promtail, 03-03-log-aggregation, future-logging-phases]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Plain text log format: timestamp LEVEL service handler id details message"
    - "Handler metadata extraction pattern"
    - "Probabilistic error simulation for realistic log patterns"

key-files:
  created: []
  modified:
    - "services/web-gateway/src/logger.js"
    - "services/web-gateway/src/routes.js"
    - "services/web-gateway/src/server.js"
    - "services/web-gateway/src/grpc-client.js"
    - "services/web-gateway/src/redis-client.js"

key-decisions:
  - "Plain text format over JSON for human-readable Loki logs"
  - "Handler field pattern for identifying log source components"
  - "Probabilistic error simulation (~2-5% chance) for realistic WARN/ERROR logs without breaking functionality"

patterns-established:
  - "Log format: {timestamp} {LEVEL} {service} {handler} {id} {key=value} {message}"
  - "All logger calls include handler metadata for filtering"
  - "Error simulation is log-only, never breaks request processing"

# Metrics
duration: 5min
completed: 2026-02-08
---

# Phase 03 Plan 01: Plain Text Logging & Handler Metadata Summary

**Web-gateway outputs plain text logs with handler/ID extraction and realistic WARN/ERROR simulation for Loki collection**

## Performance

- **Duration:** 5 min (code already committed, verification and summary only)
- **Started:** 2026-02-08T13:07:12Z (previous session)
- **Completed:** 2026-02-08T13:14:29Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments
- Plain text logger replacing JSON output with format: `timestamp LEVEL service handler id details message`
- All web-gateway logger calls include `handler` metadata for component identification
- Realistic error simulation: ~5% timeout warnings, ~3% validation edge cases, ~2% gRPC reconnection logs
- Backward-compatible logger API (info/warn/error functions unchanged)

## Task Commits

Each task was committed atomically:

1. **Task 1: Rewrite logger.js to plain text format** - `fff34f8` (refactor)
2. **Task 2: Update all callers with handler metadata and add realistic error patterns** - `d533460` (feat)

## Files Created/Modified
- `services/web-gateway/src/logger.js` - Plain text formatter with handler/ID extraction from metadata
- `services/web-gateway/src/routes.js` - Added handler fields (`/api/orders`, `/api/orders/:id`) and error simulation (~5% timeout, ~3% quantity warning)
- `services/web-gateway/src/server.js` - Added handler fields (`RequestMiddleware`, `ErrorMiddleware`, `Server`)
- `services/web-gateway/src/grpc-client.js` - Added handler fields (`gRPC:CreateOrder`, `gRPC:GetOrder`, `gRPC:ListOrders`) and ~2% reconnection warnings
- `services/web-gateway/src/redis-client.js` - Added handler field (`RedisClient`)

## Decisions Made

1. **Plain text over JSON:** Loki's human-readable log browsing in Grafana Explore benefits from plain text format. JSON parsing adds unnecessary complexity for this learning environment.

2. **Handler metadata pattern:** Every logger call includes a `handler` field identifying the component/route. This enables learners to filter logs by handler in Grafana (e.g., "show me all gRPC errors" or "show me all /api/orders logs").

3. **Probabilistic error simulation:** Rather than creating artificial failure modes, realistic warnings/errors occur randomly during normal traffic:
   - 5% of POST /orders requests log slow upstream warnings
   - 3% of large quantity orders log validation edge case warnings
   - 2% of gRPC calls log reconnection warnings

   This gives learners real WARN/ERROR entries to discover in Grafana without breaking functionality.

4. **ID field priority:** Logger extracts `order_id` → `req_id` → `correlation_id` in that order, formatting as `order=X`, `req=X`, or `corr=X` for consistent log filtering.

## Deviations from Plan

None - plan executed exactly as written. Code was already committed from previous session, verification confirmed all requirements met.

## Issues Encountered

None

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

Ready for Phase 03-02 (Loki & Promtail deployment):
- Plain text logs are being emitted to stdout
- Log format includes all required fields for Loki label extraction
- Realistic error patterns will populate Loki with diverse log levels
- Handler metadata enables rich filtering in Grafana Explore

No blockers or concerns.

---
*Phase: 03-centralized-logging*
*Completed: 2026-02-08*
