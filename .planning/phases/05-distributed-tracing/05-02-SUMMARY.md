---
phase: 05-distributed-tracing
plan: 02
subsystem: instrumentation
tags: [opentelemetry, nodejs, tracing, exemplars, w3c-trace-context, otlp]

# Dependency graph
requires:
  - phase: 05-01
    provides: "Jaeger UI and OTel Collector with tail sampling and OTLP receiver"
provides:
  - "Web-gateway instrumented with OpenTelemetry SDK and auto-instrumentation for Express and gRPC"
  - "Trace context propagation via W3C headers in logs (trace_id, span_id) and metrics (exemplars)"
  - "Semantic manual spans wrapping business logic (create-order, get-order, list-orders)"
  - "OTLP HTTP exporter sending traces to otel-collector:4318"
affects: [05-03, 05-04, 05-05]

# Tech tracking
tech-stack:
  added:
    - "@opentelemetry/sdk-node"
    - "@opentelemetry/auto-instrumentations-node"
    - "@opentelemetry/exporter-trace-otlp-http"
    - "@opentelemetry/api"
  patterns:
    - "OTel SDK initialization via --require flag before application code"
    - "Auto-instrumentation for Express HTTP server and gRPC client"
    - "Manual semantic spans for business operations"
    - "Trace context injection into structured logs"
    - "Prometheus exemplars linking metrics to traces"

key-files:
  created:
    - services/web-gateway/src/tracing.js
  modified:
    - services/web-gateway/package.json
    - services/web-gateway/Dockerfile
    - services/web-gateway/src/logger.js
    - services/web-gateway/src/metrics.js
    - services/web-gateway/src/routes.js
    - services/web-gateway/src/server.js

key-decisions:
  - "Use --require flag in Dockerfile CMD to initialize OTel SDK before application code for auto-instrumentation"
  - "Disable fs instrumentation to reduce trace noise in local development"
  - "Add trace_id and span_id to log lines for Loki correlation with Jaeger"
  - "Enable exemplars on http_requests_total counter and http_request_duration_seconds histogram"
  - "Create semantic manual spans for business operations (not just auto-instrumented HTTP/gRPC)"

patterns-established:
  - "Node.js tracing pattern: tracing.js loaded via --require before server.js"
  - "Trace context extraction: trace.getActiveSpan() for log injection and exemplar recording"
  - "Manual span lifecycle: startSpan → business logic → setStatus → end in finally block"
  - "Exemplar format: { traceID: trace_id } passed to Prometheus observe/inc calls"

# Metrics
duration: 5min
completed: 2026-02-12
---

# Phase 5 Plan 02: Instrument Web-Gateway Summary

**Web-gateway sends auto-instrumented Express/gRPC traces to OTel Collector with trace context in logs and exemplars in metrics**

## Performance

- **Duration:** 5 min (verification and summary only - tasks pre-committed)
- **Started:** 2026-02-12T13:48:09Z
- **Completed:** 2026-02-12T13:53:09Z
- **Tasks:** 2 (verified)
- **Files modified:** 7

## Accomplishments

- OpenTelemetry SDK initialized with auto-instrumentation for Express HTTP server and gRPC client
- Trace context (trace_id, span_id) injected into every log line for Loki-Jaeger correlation
- Prometheus metrics include exemplars linking HTTP request histograms to trace IDs
- Manual semantic spans wrap business logic (create-order, get-order, list-orders) for better trace visualization
- OTLP HTTP exporter sends traces to otel-collector:4318 for tail sampling and storage in Jaeger

## Task Commits

Each task was committed atomically:

1. **Task 1: Create OTel SDK initialization and update build files** - `1073670` (feat)
2. **Task 2: Add trace context to logs, exemplars to metrics, and semantic spans to routes** - `54cff27` (feat)

_Note: Tasks were pre-committed. This execution verified completeness and created summary._

## Files Created/Modified

- `services/web-gateway/src/tracing.js` - OTel SDK initialization with NodeSDK, OTLP exporter, auto-instrumentations
- `services/web-gateway/package.json` - Added @opentelemetry dependencies
- `services/web-gateway/Dockerfile` - Changed CMD to use --require flag for tracing.js
- `services/web-gateway/src/logger.js` - Inject trace_id and span_id into log lines
- `services/web-gateway/src/metrics.js` - Enable exemplars on counter and histogram
- `services/web-gateway/src/routes.js` - Add manual semantic spans for business operations
- `services/web-gateway/src/server.js` - Extract trace ID for exemplar recording in metrics middleware

## Decisions Made

**Use --require flag for OTel initialization:**
Ensures OpenTelemetry SDK starts before Express and gRPC libraries are imported, enabling auto-instrumentation. Pattern: `node --require ./src/tracing.js src/server.js`.

**Disable fs instrumentation:**
File system operations generate noisy traces not useful for microservice observability learning. Reduces trace volume without losing HTTP/gRPC visibility.

**Add trace context to logs:**
Extract trace_id and span_id from active span and include in log lines. Enables Loki → Jaeger correlation (click trace ID in log to jump to trace in Jaeger).

**Enable exemplars on metrics:**
Prometheus exemplars attach trace IDs to histogram/counter observations. Grafana can link high-latency metrics to specific trace examples in Jaeger.

**Manual semantic spans for business logic:**
Auto-instrumentation creates spans for HTTP requests and gRPC calls. Manual spans (create-order, get-order, list-orders) add semantic meaning to traces, making it easier to understand what the service is doing.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None - all dependencies resolved, verifications passed.

## User Setup Required

None - no external service configuration required. Service automatically sends traces to otel-collector when started with Docker Compose tracing profile.

## Next Phase Readiness

**Ready for 05-03 (Instrument order-api Python service):**
- OTel Collector running and accepting OTLP traces
- Jaeger UI ready to visualize traces
- Web-gateway creating trace roots with W3C context propagation
- Pattern established: SDK init → auto-instrumentation → manual spans → log/metric correlation

**Pattern to replicate in order-api:**
1. Initialize OTel SDK before application code (Python: import tracing at top of main)
2. Auto-instrument gRPC server and Redis client
3. Add manual spans for business logic (create_order, get_order, list_orders handlers)
4. Inject trace context into logs
5. Add exemplars to Prometheus metrics
6. Propagate W3C trace context to fulfillment-worker via Redis

---
*Phase: 05-distributed-tracing*
*Completed: 2026-02-12*
