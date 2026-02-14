---
phase: 06-chaos-engineering
plan: 04
subsystem: chaos
tags: [node, express, chaos-engineering, rest-api, docker, web-ui]

# Dependency graph
requires:
  - phase: 06-01
    provides: web-gateway chaos endpoints on port 3000 (/chaos/*)
  - phase: 06-02
    provides: order-api chaos endpoints on port 8000 (/chaos/*)
  - phase: 06-03
    provides: fulfillment-worker chaos endpoints on port 2112 (/chaos/*)
provides:
  - chaos-controller REST API orchestrating chaos across all 3 services
  - "all" broadcast target enabling single-call chaos injection across entire system
  - Web UI at port 9095 with live status, controls, and severity presets
  - Named presets (mild/severe) via quick-action buttons
  - Optional duration_seconds passthrough for time-limited chaos injection
affects:
  - 06-05 (chaos exercises reference chaos-controller as primary interaction point)

# Tech tracking
tech-stack:
  added: [express@4.18, Node.js 20 native fetch]
  patterns: [service proxy pattern, aggregated multi-service calls, graceful partial failure]

key-files:
  created:
    - chaos-controller/package.json
    - chaos-controller/src/server.js
    - chaos-controller/src/services.js
    - chaos-controller/src/ui.html
    - chaos-controller/Dockerfile

key-decisions:
  - "Port 9095 for chaos-controller: avoids all existing service ports, memorable controller port"
  - "Native fetch (Node 20) over axios/node-fetch: no extra dependency, sufficient for proxy calls"
  - "Partial failure tolerance: per-service try/catch allows 'all' target to return mixed results"
  - "5-second fetch timeout per service: fast enough to fail gracefully if service is down"
  - "Severity presets in UI (not API): presets are convenience shortcuts, not first-class API concept"
  - "duration_seconds omitted when null: preserves default toggle behavior on services"

patterns-established:
  - "Service proxy pattern: chaos-controller proxies all calls to service-level chaos endpoints"
  - "Aggregated broadcast: 'all' target fans out to each service concurrently via Promise.all"
  - "Graceful degradation: unreachable services return error object, don't crash controller"

# Metrics
duration: 2min
completed: 2026-02-14
---

# Phase 6 Plan 04: Chaos Controller Summary

**Node.js Express chaos-controller on port 9095 orchestrating chaos across all 3 services via REST API, web UI with live status cards, and preset-based injection buttons**

## Performance

- **Duration:** ~2 min
- **Started:** 2026-02-14T14:32:25Z
- **Completed:** 2026-02-14T14:34:36Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments
- REST API with enable/disable/reset/status endpoints proxying to web-gateway, order-api, and fulfillment-worker
- Service registry with graceful error handling (5s timeout, partial failure tolerance for "all" target)
- Single-page web UI with dark control panel aesthetic, live 5-second status refresh, and severity presets

## Task Commits

Each task was committed atomically:

1. **Task 1: Create chaos-controller REST API and service proxy** - `1ea5914` (feat)
2. **Task 2: Create web UI and Dockerfile for chaos-controller** - `f791811` (feat)

**Plan metadata:** (docs commit follows)

## Files Created/Modified
- `chaos-controller/package.json` - Express dependency, Node 20 engine constraint
- `chaos-controller/src/server.js` - Express server on port 9095 with all REST endpoints
- `chaos-controller/src/services.js` - Service registry and proxy functions with error handling
- `chaos-controller/src/ui.html` - Single-page UI with status grid, control form, and presets
- `chaos-controller/Dockerfile` - Node 20-alpine build with wget healthcheck

## Decisions Made
- Port 9095 chosen to avoid all existing service ports (3000, 8000, 2112, 9090, 3001, etc.)
- Node.js 20 native `fetch` used instead of axios — no extra dependency needed for simple proxy calls
- `duration_seconds` only included in proxied request body when not null, preserving default toggle behavior on services that expect it
- Severity presets (mild/severe) implemented as UI convenience buttons, not as named API concepts — keeps API surface minimal

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required. The chaos-controller is wired to service hostnames that resolve within Docker Compose networking.

## Next Phase Readiness
- Chaos-controller is ready to be added to docker-compose.yml (06-05 will handle compose integration if applicable)
- All 4 chaos services now exist: web-gateway, order-api, fulfillment-worker, chaos-controller
- Plan 06-05 (chaos exercises/scenarios) can reference chaos-controller as the primary interaction surface

---
*Phase: 06-chaos-engineering*
*Completed: 2026-02-14*
