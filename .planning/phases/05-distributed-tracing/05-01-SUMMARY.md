---
phase: 05-distributed-tracing
plan: 01
subsystem: infra
tags: [opentelemetry, jaeger, otel-collector, tracing, otlp, badger]

# Dependency graph
requires:
  - phase: 04-alerting
    provides: Complete observability infrastructure with metrics and logging
provides:
  - Jaeger all-in-one with Badger persistent storage (72h retention)
  - OTel Collector gateway with production-realistic pipeline
  - OTLP receivers on HTTP (4318) and gRPC (4317)
  - Collector pipeline with attribute enrichment, tail sampling, and batching
affects: [05-02-instrumentation, 05-03-async-traces, 05-04-observability-correlation, grafana-dashboards]

# Tech tracking
tech-stack:
  added:
    - jaegertracing/all-in-one:latest
    - otel/opentelemetry-collector-contrib:latest
  patterns:
    - OTel Collector as central gateway for trace processing
    - Tail sampling before batching in Collector pipeline
    - OTLP protocol for trace export (not deprecated Jaeger exporter)
    - Badger persistent storage for trace retention

key-files:
  created:
    - otel-collector/config.yaml
  modified:
    - docker-compose.yml

key-decisions:
  - "Use OTLP exporter to Jaeger (not deprecated Jaeger exporter)"
  - "Tail sampling with 100% probabilistic policy for learning environment"
  - "Processor order: attributes -> tail_sampling -> batch (tail sampling before batch)"
  - "Badger storage with 72h retention matching Loki retention"

patterns-established:
  - "Collector pipeline pattern: enrich attributes -> sample -> batch -> export"
  - "Tracing profile in Docker Compose for optional trace infrastructure"

# Metrics
duration: 2min
completed: 2026-02-12
---

# Phase 05 Plan 01: Deploy Trace Backend Summary

**Jaeger backend with Badger storage and OTel Collector gateway featuring tail sampling, attribute enrichment, and batch processing**

## Performance

- **Duration:** 2 minutes
- **Started:** 2026-02-12T04:17:14Z
- **Completed:** 2026-02-12T04:19:19Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments

- Deployed Jaeger all-in-one with OTLP receiver and Badger persistent storage (72h retention)
- Created OTel Collector configuration with production-realistic pipeline (attributes, tail sampling, batch)
- Added both services to Docker Compose with tracing profile (512M each, ~1GB total)
- Established processor ordering pattern: tail sampling before batching

## Task Commits

Each task was committed atomically:

1. **Task 1: Create OTel Collector configuration with rich pipeline** - `eabd84a` (feat)
2. **Task 2: Add Jaeger and OTel Collector to Docker Compose** - `c6aeca4` (feat)

## Files Created/Modified

- `otel-collector/config.yaml` - OTel Collector pipeline configuration with OTLP receiver, attribute/tail_sampling/batch processors, and OTLP exporter to Jaeger
- `docker-compose.yml` - Added jaeger and otel-collector services in tracing profile with health checks and resource limits

## Decisions Made

**1. Use OTLP exporter instead of deprecated Jaeger exporter**
- Jaeger natively supports OTLP receiver (COLLECTOR_OTLP_ENABLED=true)
- OTel Collector exports to jaeger:4317 via OTLP protocol
- Avoids deprecated Jaeger exporter

**2. Tail sampling BEFORE batch processor**
- Critical ordering per research pitfall #5
- Tail sampling makes sampling decisions on complete traces before batching
- Processors order: attributes -> tail_sampling -> batch

**3. 100% probabilistic sampling for learning environment**
- All traces sampled so learner sees every request
- Production would use 10% or lower
- Errors and slow requests (>1s) always sampled regardless

**4. Badger storage with 72h retention**
- Matches Loki retention (consistency across observability tools)
- Persistent volume (jaeger-badger) survives container restarts
- Non-ephemeral mode (BADGER_EPHEMERAL=false)

**5. Tracing profile in Docker Compose**
- Services only start with `--profile tracing` or `--profile full`
- Resource allocation: Jaeger (512M) + OTel Collector (512M) = ~1GB
- No hard dependencies from app services (OTel SDKs handle retry gracefully)

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

**Ready for Phase 05 Plan 02 (Instrument Services):**
- OTel Collector gateway listening on 4317 (gRPC) and 4318 (HTTP)
- Jaeger UI accessible on port 16686
- Collector pipeline configured with health check extension on 13133
- Badger storage volume created for persistent traces

**Next steps:**
- Instrument web-gateway (Node.js) with OTel SDK and auto-instrumentation
- Instrument order-api (Python) with OTel SDK and gRPC instrumentation
- Instrument fulfillment-worker (Go) with OTel SDK and manual instrumentation

**No blockers or concerns**

---
*Phase: 05-distributed-tracing*
*Completed: 2026-02-12*
