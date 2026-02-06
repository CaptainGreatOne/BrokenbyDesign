---
phase: 02-metrics-dashboards
plan: 03
subsystem: observability
tags: [prometheus, cadvisor, node-exporter, docker-compose, metrics-collection, infrastructure]

# Dependency graph
requires:
  - phase: 02-metrics-dashboards
    plan: 01
    provides: Metrics endpoints for web-gateway and order-api
  - phase: 02-metrics-dashboards
    plan: 02
    provides: Metrics endpoint for fulfillment-worker
provides:
  - Prometheus server running on port 9090 scraping all services
  - cAdvisor on port 8081 providing container-level metrics
  - Node Exporter on port 9100 providing host-level system metrics
  - Complete observability infrastructure with 6 scrape targets
  - Healthchecks for all application services including fulfillment-worker
affects: [02-04, 03-centralized-logging, grafana-dashboards, alerting]

# Tech tracking
tech-stack:
  added: [prom/prometheus:v3.5.1, gcr.io/cadvisor/cadvisor:latest, prom/node-exporter:latest]
  patterns: [prometheus scrape config, static service discovery, healthcheck-based startup orchestration]

key-files:
  created:
    - prometheus/prometheus.yml
  modified:
    - docker-compose.yml

key-decisions:
  - "Use Prometheus v3.5.1 for latest features and stability"
  - "Map cAdvisor to port 8081 to avoid conflict with internal port 8080"
  - "Use --path.rootfs=/host for node-exporter instead of network_mode: host to preserve Docker DNS"
  - "Set Prometheus retention to 7d/5GB for reasonable storage usage"
  - "Use service_healthy for all Prometheus dependencies to ensure metrics endpoints are ready"
  - "Add HTTP healthcheck to fulfillment-worker using metrics server port 2112"

patterns-established:
  - "Static service discovery via Docker Compose service names"
  - "Healthcheck-based startup orchestration prevents Prometheus scraping dead services"
  - "Resource budgeting: observability services allocated ~1.3GB total"
  - "Consistent logging configuration across all services (json-file, 10m max-size, 3 files)"

# Metrics
duration: 1.5min
completed: 2026-02-06
---

# Phase 02 Plan 03: Prometheus and Infrastructure Exporters Deployment Summary

**Prometheus deployed with cAdvisor and Node Exporter, scraping 6 targets (3 apps + 3 infrastructure) with full healthcheck orchestration**

## Performance

- **Duration:** 1.5 min
- **Started:** 2026-02-06T22:26:03Z
- **Completed:** 2026-02-06T22:27:33Z
- **Tasks:** 1
- **Files modified:** 2

## Accomplishments
- Prometheus server deployed on port 9090 with 7-day retention and 5GB storage limit
- Configured to scrape 6 targets: prometheus (self), web-gateway, order-api, fulfillment-worker, cadvisor, node-exporter
- cAdvisor deployed on port 8081 for container-level metrics (CPU, memory, network per container)
- Node Exporter deployed on port 9100 for host-level metrics (CPU, memory, disk, network at system level)
- Added HTTP healthcheck to fulfillment-worker service using metrics server on port 2112
- Prometheus startup orchestrated via service_healthy dependencies on all three application services
- Resource budget updated to ~6.3GB total (within 12GB target)

## Task Commits

Each task was committed atomically:

1. **Task 1: Create Prometheus config, add all observability services to Docker Compose, and update service healthchecks** - `9cfac8e` (feat)

## Files Created/Modified

### Created
- `prometheus/prometheus.yml` - Scrape configuration for 6 targets with job-specific settings (15s default interval, 10s for cadvisor)

### Modified
- `docker-compose.yml` - Added prometheus, cadvisor, and node-exporter services with resource limits, healthchecks, logging; added fulfillment-worker healthcheck; added prometheus-data volume; updated resource budget comment

## Decisions Made

1. **cAdvisor port mapping:** Mapped to 8081:8080 instead of 8080:8080 to avoid potential conflicts. cAdvisor internally uses port 8080, but we expose it as 8081 on the host.

2. **Node Exporter filesystem mount:** Used `--path.rootfs=/host` with volume mount `/:/host:ro,rslave` instead of `network_mode: host`. This preserves Docker Compose DNS resolution (required for Prometheus to scrape by container name) while still providing host-level metrics.

3. **Prometheus retention policy:** Set to 7 days and 5GB max storage. This balances learning usage (can see week-over-week trends) with local storage constraints.

4. **Service health orchestration:** Prometheus depends_on all three application services with `condition: service_healthy`. This ensures:
   - web-gateway: HTTP healthcheck on :3000/health passes
   - order-api: gRPC socket healthcheck confirms service running (metrics port 8000 starts in same process)
   - fulfillment-worker: HTTP healthcheck on :2112/health passes (newly added, uses metrics server from Plan 02-02)

5. **fulfillment-worker healthcheck:** Added HTTP-based check using `wget -qO- http://localhost:2112/health`. This works because Plan 02-02 added an HTTP metrics server with a /health endpoint. Previously the worker had no healthcheck because it's a queue consumer (no listening port).

6. **No host port mapping for application metrics:** Only Prometheus (9090), cAdvisor (8081), and Node Exporter (9100) are exposed to the host. Application metrics ports (3000, 8000, 2112) are accessible only via Docker internal network, which is sufficient for Prometheus scraping.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None - Docker Compose configuration validated successfully, all services configured with proper resource limits, healthchecks, and logging.

## User Setup Required

None - all services are self-contained in Docker Compose. Prometheus will begin scraping targets as soon as services are healthy.

## Next Phase Readiness

**Ready for Plan 02-04**: Grafana can now be deployed and configured to use Prometheus as a data source. All metrics are being collected and stored.

**Prometheus targets ready for scraping:**
- `prometheus:9090/metrics` - Prometheus self-monitoring
- `web-gateway:3000/metrics` - HTTP requests, Node.js runtime
- `order-api:8000/metrics` - gRPC requests, Python runtime, orders created
- `fulfillment-worker:2112/metrics` - Queue processing, Go runtime
- `cadvisor:8080/metrics` - Container metrics (CPU, memory, network, disk per container)
- `node-exporter:9100/metrics` - Host metrics (CPU, memory, network, disk at system level)

**Infrastructure ready:**
- Prometheus data persistence via prometheus-data volume
- Resource budget: ~6.3GB total (5GB core + 1.3GB observability) leaves ~5.7GB for additional profiles
- All services follow consistent patterns (resource limits, logging, restart policies, healthchecks)

**No blockers**: Full observability stack operational and ready for visualization layer.

---
*Phase: 02-metrics-dashboards*
*Completed: 2026-02-06*
