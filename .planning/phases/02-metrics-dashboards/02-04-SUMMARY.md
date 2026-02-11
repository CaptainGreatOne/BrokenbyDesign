---
phase: 02-metrics-dashboards
plan: 04
subsystem: observability
tags: [grafana, prometheus, dashboards, visualization, provisioning]

# Dependency graph
requires:
  - phase: 02-metrics-dashboards
    plan: 03
    provides: Prometheus server with cAdvisor and Node Exporter
provides:
  - Grafana running on port 3001 with auto-provisioned Prometheus datasource
  - Three pre-built dashboards (Service Overview, Container Resources, Host Metrics)
  - Dashboard provisioning structure supporting future Loki and Jaeger datasources
  - Complete observability visualization layer
affects: [03-centralized-logging, 04-alerting, 05-distributed-tracing]

# Tech tracking
tech-stack:
  added: [grafana/grafana:12.3.0]
  patterns: [grafana provisioning, file-based dashboard provisioning, datasource auto-configuration]

key-files:
  created:
    - grafana/provisioning/datasources/prometheus.yml
    - grafana/provisioning/dashboards/dashboards.yml
    - grafana/dashboards/service-overview.json
    - grafana/dashboards/container-resources.json
    - grafana/dashboards/host-metrics.json
  modified:
    - docker-compose.yml

key-decisions:
  - "Use Grafana 12.3.0 for latest features and provisioning support"
  - "Port 3001 for Grafana to avoid confusion with web-gateway internal port 3000"
  - "Datasource uid 'prometheus' for stable dashboard references"
  - "Service Overview as default home dashboard for learner-first UX"
  - "Support both HTTP and gRPC metrics in Service Overview dashboard"
  - "Provisioning directory structure designed for future Loki (Phase 3) and Jaeger (Phase 5) datasources"
  - "All dashboards editable to encourage learner exploration"
  - "10s auto-refresh and 1h time range for responsive learning experience"

patterns-established:
  - "Grafana depends_on prometheus with service_healthy condition"
  - "Provisioning files mounted as read-only volumes"
  - "Dashboard JSONs use raw format (not wrapped in envelope)"
  - "Resource allocation: 512M limit, 256M reservation for Grafana"
  - "Consistent panel structure: stat panels for overview, timeseries for trends"

# Metrics
duration: 2.5min
completed: 2026-02-06
---

# Phase 02 Plan 04: Grafana with Pre-Provisioned Dashboards Summary

**Grafana deployed with auto-configured Prometheus datasource and three pre-built dashboards showing service health, container resources, and host metrics**

## Performance

- **Duration:** 2.5 min
- **Started:** 2026-02-06T22:31:36Z
- **Completed:** 2026-02-06T22:34:14Z
- **Tasks:** 2
- **Files created:** 5

## Accomplishments
- Grafana 12.3.0 deployed on port 3001 with auto-provisioned Prometheus datasource
- Prometheus datasource configured with uid 'prometheus' for stable dashboard references
- Dashboard provider configured to auto-load dashboards from /var/lib/grafana/dashboards
- Service Overview dashboard created with 10 panels:
  - Row 1: Services Up, Total Request Rate, Error Rate %, Orders Processed (stat panels)
  - Row 2: Request Rate by Service, Request Rate by Status Code (timeseries)
  - Row 3: p95 Latency by Service, p99 Latency by Service (timeseries)
  - Row 4: Error Rate by Service, Fulfillment Processing (timeseries)
- Container Resources dashboard created with 8 panels:
  - Row 1: Total Containers, Total CPU, Total Memory, Network RX Rate (stat panels)
  - Row 2: CPU Usage by Container (timeseries)
  - Row 3: Memory Usage by Container (timeseries)
  - Row 4: Network Receive, Network Transmit (timeseries)
- Host Metrics dashboard created with 8 panels:
  - Row 1: CPU Usage %, Memory Usage %, Disk Usage %, System Load (stat panels)
  - Row 2: CPU Usage by Mode (stacked timeseries)
  - Row 3: Memory Usage (Total/Used/Available timeseries)
  - Row 4: Disk Space Usage (bargauge), Disk I/O (timeseries)
- Grafana service configured with healthcheck and depends_on prometheus (service_healthy)
- grafana-data volume added for persistent dashboard configuration and user preferences
- Service Overview set as default home dashboard for immediate learner value
- All dashboards support both HTTP metrics (web-gateway) and gRPC metrics (order-api)

## Task Commits

Each task was committed atomically:

1. **Task 1: Create Grafana provisioning config and add to Docker Compose** - `88858c1` (feat)
2. **Task 2: Create pre-built Grafana dashboard JSON files** - `9512b64` (feat)

## Files Created/Modified

### Created
- `grafana/provisioning/datasources/prometheus.yml` - Auto-provision Prometheus datasource with uid and 15s time interval
- `grafana/provisioning/dashboards/dashboards.yml` - Dashboard provider pointing to /var/lib/grafana/dashboards
- `grafana/dashboards/service-overview.json` - Primary learner dashboard with service health, request rates, latency, errors
- `grafana/dashboards/container-resources.json` - Container-level CPU, memory, network metrics from cAdvisor
- `grafana/dashboards/host-metrics.json` - Host-level CPU, memory, disk, I/O metrics from Node Exporter

### Modified
- `docker-compose.yml` - Added grafana service with provisioning volume mounts, healthcheck, depends_on, resource limits; added grafana-data volume

## Decisions Made

1. **Grafana port mapping:** Used 3001:3000 to expose Grafana on host port 3001. While web-gateway's internal port 3000 is not mapped to host (nginx proxies to it), using 3001 avoids confusion and potential future conflicts.

2. **Datasource uid:** Set datasource uid to 'prometheus' in provisioning YAML. This provides a stable reference for dashboard panels and supports future datasource additions (Loki in Phase 3 will use uid 'loki', Jaeger in Phase 5 will use uid 'jaeger').

3. **Default home dashboard:** Set GF_DASHBOARDS_DEFAULT_HOME_DASHBOARD_PATH to service-overview.json. This ensures learners see meaningful data immediately on first login without navigating menus.

4. **Multi-protocol metrics support:** Service Overview dashboard uses separate query targets for HTTP metrics (web-gateway) and gRPC metrics (order-api). This handles the difference between http_requests_total and grpc_requests_total metric names while presenting a unified view.

5. **Dashboard editability:** All dashboards set `"editable": true` to encourage learner exploration and customization. This aligns with the learning-first philosophy.

6. **Provisioning structure for future phases:** The grafana/provisioning/datasources/ directory is designed so that:
   - Phase 3 (Centralized Logging) can add loki.yml
   - Phase 5 (Distributed Tracing) can add jaeger.yml
   - Grafana auto-discovers all YAML files in the directory
   - No modification to existing prometheus.yml required

7. **Resource limits:** Grafana configured with 512M memory limit and 256M reservation. This is standard for Grafana and fits within the overall ~7GB observability stack budget (Prometheus 1G, Grafana 512M, cAdvisor 200M, Node Exporter 100M).

8. **Auto-refresh and time range:** All dashboards use 10s refresh and 1h time range. This provides responsive updates for learning activities while keeping query load reasonable.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None - Docker Compose configuration validated successfully, all JSON dashboards are valid, provisioning structure ready for multi-datasource support.

## User Setup Required

None - all configuration is automated via provisioning. On first startup:
1. Grafana will auto-configure the Prometheus datasource
2. Dashboards will auto-load from the dashboards directory
3. Default admin credentials are admin/admin (can be changed on first login)
4. Service Overview dashboard will be the default home page

## Next Phase Readiness

**Phase 2 (Metrics & Dashboards) is COMPLETE**: All 4 plans executed successfully. The observability stack is fully operational with metrics collection, storage, and visualization.

**Ready for Phase 3 (Centralized Logging)**: Grafana provisioning structure supports adding Loki datasource in Phase 3 without modifying existing prometheus.yml. Simply add loki.yml to grafana/provisioning/datasources/ directory.

**Infrastructure delivered:**
- Metrics: Prometheus scraping 6 targets (3 apps + 3 infrastructure)
- Visualization: Grafana with 3 pre-built dashboards
- Container metrics: cAdvisor providing per-container CPU, memory, network
- Host metrics: Node Exporter providing system-level metrics
- Persistence: prometheus-data and grafana-data volumes

**Learner experience:**
- Visit http://localhost:3001 to access Grafana
- Login with admin/admin
- Service Overview dashboard loads by default
- All metrics populate within 60 seconds of startup (15s scrape + 15s eval + 10s refresh)
- Can explore Container Resources and Host Metrics dashboards
- Can edit dashboards to learn PromQL query language

**Resource usage:**
- Total observability stack: ~1.8GB (Prometheus 1G + Grafana 512M + cAdvisor 200M + Node Exporter 100M)
- Core services: ~5GB
- Combined: ~6.8GB, leaving ~5.2GB for profile services (tracing, kafka, cicd)

**No blockers**: Phase 2 complete. Ready to begin Phase 3 planning.

---
*Phase: 02-metrics-dashboards*
*Completed: 2026-02-06*
