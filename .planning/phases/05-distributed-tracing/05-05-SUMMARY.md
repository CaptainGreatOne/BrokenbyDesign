---
phase: 05-distributed-tracing
plan: 05
subsystem: infra
tags: [grafana, jaeger, prometheus, loki, datasources, correlation, exemplars]

# Dependency graph
requires:
  - phase: 05-01
    provides: Jaeger trace backend running at jaeger:16686
  - phase: 05-02
    provides: Trace context in logs with trace_id field for correlation
  - phase: 05-03
    provides: Exemplar traceID field in metrics for metric-to-trace linking
  - phase: 05-04
    provides: Full trace instrumentation across all three services
  - phase: 03-01
    provides: Loki datasource with uid 'loki' in Grafana
  - phase: 02-01
    provides: Prometheus datasource with uid 'prometheus' in Grafana
provides:
  - Jaeger datasource in Grafana with trace-to-logs and trace-to-metrics cross-linking
  - Prometheus datasource configured for exemplar-to-trace navigation
  - Complete observability correlation triangle (traces <-> logs <-> metrics)
  - Service dependency graph visualization via Jaeger nodeGraph
affects: [06-kafka-integration, future-observability-phases]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "tracesToLogsV2 for Jaeger-to-Loki correlation using trace_id filter"
    - "tracesToMetrics for Jaeger-to-Prometheus with service-specific queries"
    - "exemplarTraceIdDestinations for Prometheus-to-Jaeger navigation"
    - "nodeGraph for service dependency visualization"

key-files:
  created:
    - grafana/provisioning/datasources/jaeger.yml
  modified:
    - grafana/provisioning/datasources/prometheus.yml

key-decisions:
  - "tracesToLogsV2 with custom query filtering by service_name and trace_id for precise log correlation"
  - "tracesToMetrics with predefined queries for Request Rate, Error Rate, and Latency P95"
  - "exemplarTraceIdDestinations matching traceID label used across all three services"
  - "nodeGraph enabled for automatic service dependency visualization from span relationships"

patterns-established:
  - "Cross-datasource correlation via stable uid references (jaeger, loki, prometheus)"
  - "5-minute time shift window for trace-to-logs and trace-to-metrics for context around trace timespan"

# Metrics
duration: 1min
completed: 2026-02-12
---

# Phase 5 Plan 5: Provision Grafana Datasources Summary

**Jaeger datasource with bidirectional cross-linking to Loki logs and Prometheus metrics, completing the observability correlation triangle**

## Performance

- **Duration:** 1 min
- **Started:** 2026-02-12T13:57:23Z
- **Completed:** 2026-02-12T13:58:21Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- Created Jaeger datasource with tracesToLogsV2 for seamless navigation from traces to related logs
- Configured tracesToMetrics with Request Rate, Error Rate, and Latency P95 queries for service context
- Added exemplar-to-trace linking in Prometheus datasource for jumping from metric spikes to specific traces
- Enabled nodeGraph for automatic service dependency visualization
- Completed full observability correlation: traces ↔ logs ↔ metrics all interconnected

## Task Commits

Each task was committed atomically:

1. **Task 1: Create Jaeger datasource with trace-to-logs and trace-to-metrics cross-linking** - `fe77701` (feat)
2. **Task 2: Update Prometheus datasource with exemplar-to-trace configuration** - `820120b` (feat)

## Files Created/Modified
- `grafana/provisioning/datasources/jaeger.yml` - Jaeger datasource with tracesToLogsV2 (Loki), tracesToMetrics (Prometheus), and nodeGraph
- `grafana/provisioning/datasources/prometheus.yml` - Added exemplarTraceIdDestinations pointing to Jaeger

## Decisions Made

**tracesToLogsV2 custom query pattern:**
- Used `{service_name="${__span.serviceName}"} | trace_id="${__span.traceId}"` to filter logs by service and trace ID
- Provides precise correlation without noise from other services

**tracesToMetrics predefined queries:**
- Included Request Rate, Error Rate, and Latency P95 as standard RED metrics
- Queries use `${__tags.service}` variable populated from span's service.name attribute

**exemplarTraceIdDestinations label matching:**
- Used `name: traceID` to match the exemplar label all three services emit
- Consistent with instrumentation from plans 05-02, 05-03, and 05-04

**5-minute time shift window:**
- `spanStartTimeShift: '-5m'` and `spanEndTimeShift: '5m'` provide context around trace
- Captures logs and metrics before/after trace for debugging

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

**Ready for Phase 6 (Kafka Integration) or beyond:**
- Grafana datasources fully configured with cross-linking
- Learner can explore traces in Jaeger, click to see related logs in Loki, click to see metrics in Prometheus
- From Prometheus metric with exemplar, can click to jump to specific trace that contributed to that metric
- Service dependency graph available in Jaeger for understanding service relationships

**Verification workflow:**
1. Access Grafana at http://localhost:3001
2. Navigate to Explore view
3. Select Jaeger datasource
4. View traces, click trace to see span details
5. Click "Logs for this span" to jump to Loki with trace_id filter
6. Click "Metrics for this service" to see Prometheus queries
7. Switch to Prometheus datasource, query metrics with exemplars enabled
8. Click exemplar point to jump back to Jaeger trace

**No blockers or concerns.**

---
*Phase: 05-distributed-tracing*
*Completed: 2026-02-12*
