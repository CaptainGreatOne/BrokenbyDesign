---
phase: 01-foundation-services
plan: 05
subsystem: infra
tags: [traffic-generation, docker-compose, resource-management, express, axios, node]

# Dependency graph
requires:
  - phase: 01-01
    provides: Docker Compose base with postgres, redis, nginx services
  - phase: 01-02
    provides: Order API gRPC service for order creation
  - phase: 01-03
    provides: Web Gateway REST API as HTTP entry point
  - phase: 01-04
    provides: Fulfillment Worker queue consumer
provides:
  - Controllable traffic generator auto-starting in steady mode (2 RPS)
  - Mode switching HTTP endpoints (steady/burst/overload/pause)
  - Docker Compose resource limits for all 7 services (~5GB total)
  - Logging rotation and restart policies for container management
  - Profile placeholder comments for future phase expansion
affects: [02-metrics-pipeline, 03-logging-pipeline, 05-distributed-tracing]

# Tech tracking
tech-stack:
  added: [express, axios]
  patterns: [traffic-generation, ring-buffer-for-ids, jitter-in-request-timing, resource-budgeting]

key-files:
  created:
    - traffic-generator/src/server.js
    - traffic-generator/src/traffic.js
    - traffic-generator/src/logger.js
    - traffic-generator/package.json
    - traffic-generator/Dockerfile
  modified:
    - docker-compose.yml

key-decisions:
  - "Axios over node-fetch: Better HTTP client error handling and simpler API"
  - "Traffic auto-starts in steady mode (2 RPS): Ensures system is observable from startup"
  - "10-second startup delay: Allows services to initialize before traffic begins"
  - "Mixed request distribution (60% create, 25% list, 15% get-by-id): Realistic traffic patterns"
  - "Ring buffer of 50 recent order IDs: Enables GET-by-ID requests without database queries"
  - "Jitter +/- 20% on intervals: Avoids perfectly uniform traffic, more realistic"
  - "Resource budget ~5GB core services: Leaves ~7GB for profile services (tracing, kafka, cicd)"
  - "json-file logging with rotation (10m max, 3 files): Prevents disk exhaustion"

patterns-established:
  - "Traffic generation pattern: Mode-based RPS configuration with mixed request types"
  - "Resource budgeting pattern: Explicit limits and reservations for all containers"
  - "Logging rotation pattern: json-file driver with max-size and max-file limits"
  - "Restart policy pattern: unless-stopped for automatic recovery without manual-stop interference"

# Metrics
duration: 3min
completed: 2026-02-05
---

# Phase 01 Plan 05: Traffic Generator and Compose Finalization Summary

**Controllable traffic generator with 4 modes (steady/burst/overload/pause) auto-starting at 2 RPS, Docker Compose resource limits totaling ~5GB across 7 services**

## Performance

- **Duration:** 3 min
- **Started:** 2026-02-05T23:37:36Z
- **Completed:** 2026-02-05T23:40:43Z
- **Tasks:** 2
- **Files modified:** 6

## Accomplishments

- Traffic generator auto-starts in steady mode (2 RPS) after 10-second delay, immediately making the system observable
- Mode switching via HTTP: POST /mode/{steady,burst,overload,pause} for dynamic traffic control
- Mixed request distribution (60% POST /orders, 25% GET /orders, 15% GET /orders/:id) creates realistic load patterns
- Resource limits for all 7 services (~5GB total): postgres 2G, redis 512M, nginx 128M, web-gateway 512M, order-api 1G, fulfillment-worker 512M, traffic-generator 256M
- Logging rotation (json-file, 10m max, 3 files) prevents disk exhaustion
- Profile placeholder comments document future expansion (tracing, kafka, cicd, full)

## Task Commits

Each task was committed atomically:

1. **Task 1: Create traffic generator service** - `343744d` (feat)
2. **Task 2: Update Docker Compose with profiles and resource limits** - `e673006` (feat)

**Plan metadata:** (will be added in final commit)

## Files Created/Modified

### Created
- `traffic-generator/src/server.js` - Express HTTP control server with mode switching endpoints and health/status endpoints
- `traffic-generator/src/traffic.js` - Traffic generation engine with 4 modes, mixed request types, jitter, and statistics tracking
- `traffic-generator/src/logger.js` - Structured JSON logging aligned with other services
- `traffic-generator/package.json` - Node.js dependencies (express, axios)
- `traffic-generator/Dockerfile` - Multi-stage container build from node:20-alpine

### Modified
- `docker-compose.yml` - Added resource limits, restart policies, logging rotation, and profile comments for all 7 services

## Decisions Made

1. **Axios over node-fetch** - Better HTTP client error handling, simpler API for making requests
2. **Traffic auto-starts in steady mode (2 RPS)** - Ensures system is observable from the moment it starts, no manual triggering needed
3. **10-second startup delay** - Allows dependent services (nginx, web-gateway, order-api) to fully initialize before traffic begins
4. **Mixed request distribution** - 60% POST /orders, 25% GET /orders, 15% GET /orders/:id creates realistic traffic patterns that exercise all endpoints
5. **Ring buffer of 50 recent order IDs** - Enables GET-by-ID requests without database queries, realistic read-after-write patterns
6. **Jitter +/- 20% on intervals** - Avoids perfectly uniform traffic, more realistic than metronomic requests
7. **Resource budget ~5GB for core services** - Leaves ~7GB of 12GB budget for future profile services (tracing in Phase 5, kafka in Phase 7, cicd in Phase 8)
8. **json-file logging with rotation** - 10m max size, 3 max files prevents runaway disk usage from container logs
9. **unless-stopped restart policy** - Containers restart on failure but not after manual `docker compose stop`, best of both worlds

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None - all implementations worked as expected.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

**Ready for Phase 02 (Metrics Pipeline)**

The system now has:
- Complete 3-tier microservice architecture (web-gateway, order-api, fulfillment-worker)
- Continuous traffic generation creating observable HTTP requests, database operations, and queue processing
- Resource limits ensuring system runs within hardware constraints
- Structured JSON logging ready for collection
- All services auto-start and self-recover

**Next phase can:**
- Instrument services with Prometheus metrics (counters, histograms, gauges)
- Add Prometheus scraping and Grafana dashboards
- Observe real traffic patterns immediately (no manual setup needed)

**No blockers or concerns.**

---
*Phase: 01-foundation-services*
*Completed: 2026-02-05*
