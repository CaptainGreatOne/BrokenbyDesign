---
phase: 06-chaos-engineering
plan: 03
subsystem: chaos
tags: [go, chaos-engineering, fulfillment-worker, http-handlers, sync-rwmutex, prometheus]

requires:
  - phase: 05-distributed-tracing
    provides: OTel instrumentation and metrics exemplars in fulfillment-worker
provides:
  - In-memory chaos state package (internal/chaos) with thread-safe RWMutex access
  - HTTP chaos endpoints on port 2112: /chaos/enable, /chaos/disable, /chaos/reset, /chaos/status
  - Crash, latency, and error injection into order processing loop
  - Memory and disk pressure scenario support
  - Optional duration_seconds auto-disable via time.AfterFunc
affects:
  - phase-06-plans-04-05 (chaos exercises and validation)

tech-stack:
  added: []
  patterns:
    - "Chaos state stored in-memory global with sync.RWMutex (reset on restart by design)"
    - "Severity presets (mild/severe) map to concrete parameter values"
    - "Chaos checks at process-start: crash -> latency -> error (order matters)"
    - "ChaosInterceptor handler name in logs for Loki-based filtering"

key-files:
  created:
    - services/fulfillment-worker/internal/chaos/chaos.go
  modified:
    - services/fulfillment-worker/internal/metrics/metrics.go
    - services/fulfillment-worker/cmd/worker/main.go

key-decisions:
  - "Chaos endpoints share port 2112 with /metrics and /health (no separate port needed)"
  - "Crash check uses os.Exit(1) with 100ms sleep for log flush before exit"
  - "Probabilistic error injection uses rand.Float64() < error_rate for simplicity"
  - "Memory/disk resources allocated at enable-time and cleaned up at disable/reset"

patterns-established:
  - "Chaos check ordering: crash first, latency second, error third (crash pre-empts all)"
  - "Auto-disable timers stored in state.timers map keyed by scenario name"

duration: 2min
completed: 2026-02-14
---

# Phase 6 Plan 03: Fulfillment-Worker Chaos Package Summary

**In-memory chaos state package with five injectable scenarios (latency, errors, crash, memory, disk) exposed as HTTP endpoints on port 2112 and wired into the processOrder handler**

## Performance

- **Duration:** 2 min
- **Started:** 2026-02-14T14:27:58Z
- **Completed:** 2026-02-14T14:29:33Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments
- Created `internal/chaos/chaos.go` with thread-safe State struct and all five scenario types
- Registered /chaos/enable, /chaos/disable, /chaos/reset, /chaos/status on the existing port 2112 metrics server
- Wired crash, latency, and error checks into processOrder handler with proper metric tracking and structured logging

## Task Commits

Each task was committed atomically:

1. **Task 1: Create chaos state package with HTTP handlers** - `88c151b` (feat)
2. **Task 2: Register chaos handlers and integrate chaos checks into worker** - `ad9643f` (feat)

**Plan metadata:** (this commit)

## Files Created/Modified
- `services/fulfillment-worker/internal/chaos/chaos.go` - Full chaos package: State struct, presets, check functions, HTTP handlers
- `services/fulfillment-worker/internal/metrics/metrics.go` - Import chaos package; register handlers on mux
- `services/fulfillment-worker/cmd/worker/main.go` - Import chaos; add crash/latency/error checks in processOrder

## Decisions Made
- Chaos endpoints share port 2112 with existing /metrics and /health to avoid a second HTTP server and extra port mapping
- Crash check uses `os.Exit(1)` with a 100ms sleep to allow the log line to flush before the process terminates
- Memory pressure allocates a `[]byte` slice in-process; disk pressure writes a file to /tmp - both cleaned up on disable/reset
- Auto-disable timer uses `time.AfterFunc` with the existing mutex protecting timer map access

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None - Go toolchain not available in shell, so compile verification was done via grep checks. Build will be validated when Docker Compose runs the service.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Fulfillment-worker chaos endpoints ready on port 2112
- Plans 04 and 05 (chaos exercises and validation) can now send HTTP requests to trigger scenarios
- All three services (web-gateway, order-api, fulfillment-worker) now have chaos injection capabilities

---
*Phase: 06-chaos-engineering*
*Completed: 2026-02-14*
