---
phase: 06-chaos-engineering
plan: 01
subsystem: chaos
tags: [chaos-engineering, express, middleware, opentelemetry, nodejs]

# Dependency graph
requires:
  - phase: 05-distributed-tracing
    provides: OTel SDK in web-gateway, active span context for error annotation
provides:
  - In-memory chaos state module (chaos.js) with five scenario types
  - Express middleware that injects latency, errors, crash behavior
  - REST control endpoints /chaos/enable, /chaos/disable, /chaos/reset, /chaos/status
  - OTel span error marking for injected errors (visible in Jaeger traces)
affects:
  - 06-chaos-engineering (plans 02-05 extend or observe this foundation)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Chaos middleware skips observability/control paths (/chaos/*, /metrics, /health)"
    - "In-memory chaos state resets on restart (no persistence needed for learning sandbox)"
    - "Severity presets (mild/severe) with optional param overrides for flexibility"
    - "OTel span annotation pattern: getActiveSpan() → setStatus(ERROR) for injected errors"
    - "Auto-disable via setTimeout stored on chaos state for duration_seconds support"

key-files:
  created:
    - services/web-gateway/src/chaos.js
  modified:
    - services/web-gateway/src/server.js

key-decisions:
  - "Middleware ordering: chaos routes before chaos middleware prevents self-sabotage"
  - "OTel span marking in error injection path makes chaos errors visible in Jaeger traces"
  - "In-memory only state: chaos resets on restart, no DB needed for learning sandbox"
  - "Crash scenario returns 503 to current request then process.exit(1) after 100ms log flush"
  - "Memory/disk scenarios hold references in state arrays to allow explicit cleanup on disable"

patterns-established:
  - "Chaos state: { enabled, severity, timer } per scenario with resetScenario() helper"
  - "PRESETS object defines mild/severe config per scenario type"
  - "handler: 'ChaosMiddleware' in all log entries for Loki filtering"

# Metrics
duration: 7min
completed: 2026-02-14
---

# Phase 6 Plan 01: Chaos State Module and Express Integration Summary

**In-memory chaos middleware for web-gateway with five injectable failure scenarios (latency/errors/crash/memory/disk), OTel span error marking, severity presets, and REST control endpoints**

## Performance

- **Duration:** ~7 min
- **Started:** 2026-02-14T14:25:57Z
- **Completed:** 2026-02-14T14:32:00Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- Created chaos.js with in-memory chaosState, PRESETS (mild/severe), chaosMiddleware, and chaosRouter
- Chaos middleware correctly skips /chaos/*, /metrics, /health paths
- Error injection marks active OTel span as ERROR via SpanStatusCode so injected errors are visible in Jaeger traces
- Five REST endpoints wired into server.js with correct middleware ordering (chaos routes before middleware, middleware before business routes)
- Optional duration_seconds auto-disable via setTimeout with clearTimeout on re-enable

## Task Commits

Each task was committed atomically:

1. **Task 1: Create chaos state module with middleware and control endpoints** - `7101556` (feat)
2. **Task 2: Integrate chaos middleware and routes into Express server** - `d281a4f` (feat)

**Plan metadata:** (included in final docs commit)

## Files Created/Modified
- `services/web-gateway/src/chaos.js` - Chaos state, PRESETS, chaosMiddleware, chaosRouter, resetScenario helper
- `services/web-gateway/src/server.js` - Import and mount chaos routes + middleware in correct order

## Decisions Made
- Middleware ordering: chaos routes mounted before chaosMiddleware so control endpoints are never affected by chaos
- OTel span annotation via `trace.getActiveSpan()` + `span.setStatus(ERROR)` in error injection path — makes injected errors appear as errors in Jaeger trace view
- Crash scenario returns 503 to the triggering request then exits after 100ms to allow log flush
- Memory/disk allocations held in arrays on chaosState to enable explicit cleanup when disabled
- resetScenario() helper centralizes disable logic for both /chaos/disable and /chaos/reset

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Chaos module is ready for Plan 02 (chaos endpoints for order-api, Python service)
- All five scenario types are stackable simultaneously
- Control endpoints are accessible and immune to chaos effects
- OTel integration ensures chaos-injected errors appear in Jaeger for learners to observe

---
*Phase: 06-chaos-engineering*
*Completed: 2026-02-14*
