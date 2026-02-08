---
phase: 03-centralized-logging
plan: 04
subsystem: logging
tags: [loki, alloy, grafana, log-aggregation, docker-discovery, observability]

# Dependency graph
requires:
  - phase: 03-01
    provides: "Plain text logs from web-gateway"
  - phase: 03-02
    provides: "Plain text logs from order-api"
  - phase: 03-03
    provides: "Plain text logs from fulfillment-worker"
  - phase: 02-04
    provides: "Grafana with datasource provisioning pattern"
provides:
  - "Loki log storage with 72h retention"
  - "Alloy log collector with Docker discovery"
  - "Grafana Loki datasource for log exploration"
  - "Complete centralized logging pipeline"
affects: [future-logging-phases, 04-alerting, dashboard-enhancements]

# Tech tracking
tech-stack:
  added:
    - "grafana/loki:3.6.0"
    - "grafana/alloy:latest"
  patterns:
    - "Monolithic Loki with filesystem storage for local development"
    - "Alloy Docker discovery with service filtering"
    - "Multi-datasource Grafana (Prometheus + Loki)"

key-files:
  created:
    - "loki/loki-config.yaml"
    - "alloy/config.alloy"
    - "grafana/provisioning/datasources/loki.yml"
  modified:
    - "docker-compose.yml"

key-decisions:
  - "Alloy over Promtail: Grafana's unified agent for logs, metrics, and traces"
  - "Service filtering in Alloy: Only collect from 3 application services to reduce noise"
  - "Loki monolithic mode: Simpler deployment for local learning environment"
  - "72h retention: Balances learning exploration with storage constraints"
  - "Docker socket access for Alloy: Enables automatic container discovery"

patterns-established:
  - "Loki storage in Docker volume (loki-data) for persistence"
  - "Alloy relabeling to extract service name from container name"
  - "Grafana multi-datasource pattern: uid-based stable references"
  - "Healthcheck-based service orchestration: Alloy depends on Loki, Grafana depends on Loki"

# Metrics
duration: 2min
completed: 2026-02-08
---

# Phase 03 Plan 04: Loki & Alloy Deployment Summary

**Loki log storage with Alloy Docker discovery auto-ships logs from 3 application services to Grafana for centralized exploration**

## Performance

- **Duration:** 2 min
- **Started:** 2026-02-08T13:17:39Z
- **Completed:** 2026-02-08T13:20:01Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments
- Loki deployed in monolithic mode with filesystem storage and 72h retention
- Alloy automatically discovers Docker containers and ships logs from web-gateway, order-api, and fulfillment-worker
- Grafana provisions Loki datasource (uid: loki) alongside Prometheus for unified observability
- Complete logging pipeline: app logs → Alloy → Loki → Grafana Explore

## Task Commits

Each task was committed atomically:

1. **Task 1: Create Loki and Alloy configuration files** - `12503ce` (feat)
2. **Task 2: Add Loki and Alloy to Docker Compose and provision Grafana datasource** - `a080ff9` (feat)

## Files Created/Modified
- `loki/loki-config.yaml` - Monolithic Loki config with filesystem storage, TSDB schema v13, 72h retention, compactor enabled
- `alloy/config.alloy` - Docker discovery with service name extraction and filtering (web-gateway|order-api|fulfillment-worker)
- `grafana/provisioning/datasources/loki.yml` - Loki datasource with uid: loki, 1000 max lines, proxy access
- `docker-compose.yml` - Added loki and alloy services, loki-data volume, updated resource budget to ~7.1GB

## Decisions Made

1. **Alloy over Promtail:** Grafana's Alloy is the next-generation unified agent supporting logs, metrics, and traces. While Promtail is Loki-specific, Alloy provides a path to OpenTelemetry integration (Phase 5) using the same agent.

2. **Service filtering in Alloy:** Configuration explicitly filters to only collect logs from the 3 application services (web-gateway, order-api, fulfillment-worker). This prevents log noise from infrastructure services (postgres, redis, prometheus, etc.) and focuses learner exploration on relevant application logs.

3. **Loki monolithic mode:** Simpler than microservices mode for local learning. All Loki components (ingester, distributor, querier, compactor) run in single container with filesystem storage. Production would use microservices mode with object storage.

4. **72h retention:** Balances learning exploration (3 days of logs for time-based queries) with storage constraints (~512M limit). Compactor runs every 10 minutes to enforce retention.

5. **Docker socket access:** Alloy mounts `/var/run/docker.sock` read-only for automatic container discovery. This enables zero-config log collection when new services are added, but requires Docker socket access (acceptable for local development, would use different discovery in production).

6. **Resource limits:** Loki 512M limit/256M reservation, Alloy 256M limit/128M reservation. Total observability stack now ~2.1GB, within 12GB project budget.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

Ready for log exploration and future logging enhancements:
- All 3 application services ship logs to Loki via Alloy
- Logs labeled by service name for filtering
- Grafana Explore supports LogQL queries against Loki
- Plain text log format (from plans 03-01, 03-02, 03-03) is human-readable in Grafana

Learner can now:
1. Navigate to Grafana Explore
2. Select Loki datasource
3. Query logs by service: `{service="web-gateway"}`
4. Filter by handler: `{service="web-gateway"} |~ "handler=/api/orders"`
5. Search error logs: `{service=~".*"} |= "ERROR"`

No blockers or concerns. Phase 3 complete - centralized logging pipeline is fully operational.

---
*Phase: 03-centralized-logging*
*Completed: 2026-02-08*
