---
phase: 05-distributed-tracing
plan: 04
subsystem: tracing
tags: [opentelemetry, go, otlp, trace-linking, exemplars, redis-queue]

# Dependency graph
requires:
  - phase: 05-01
    provides: Jaeger UI and OTel Collector infrastructure for receiving traces
  - phase: 01-06
    provides: Fulfillment-worker service with Redis queue consumer
provides:
  - Manual OTel SDK initialization for Go service with OTLP HTTP exporter
  - W3C traceparent parsing from Redis queue messages with trace linking
  - Context-aware logging with trace_id/span_id injection
  - Metric exemplars linking metrics to traces
  - Semantic spans wrapping business logic operations
affects: [05-05-verification, logging-analysis, metrics-correlation]

# Tech tracking
tech-stack:
  added:
    - go.opentelemetry.io/otel v1.24.0
    - go.opentelemetry.io/otel/exporters/otlp/otlptrace/otlptracehttp v1.24.0
    - go.opentelemetry.io/otel/sdk v1.24.0
  patterns:
    - Manual OTel SDK setup pattern for Go services
    - W3C traceparent parsing and linked trace creation across async boundaries
    - Context-aware logging functions extracting trace context
    - Prometheus exemplar integration with OTel trace IDs
    - Semantic span naming for business operations

key-files:
  created:
    - services/fulfillment-worker/internal/tracing/tracing.go
  modified:
    - services/fulfillment-worker/internal/queue/consumer.go
    - services/fulfillment-worker/internal/logger/logger.go
    - services/fulfillment-worker/internal/metrics/metrics.go
    - services/fulfillment-worker/cmd/worker/main.go
    - services/fulfillment-worker/go.mod

key-decisions:
  - "Use attribute.String for resource creation instead of semconv package for simpler OTel SDK setup"
  - "Parse W3C traceparent manually from queue messages and create trace links (not propagation context) for async queue pattern"
  - "Add context-aware logging functions (InfoCtx, WarnCtx, ErrorCtx) alongside original functions for gradual adoption"
  - "TraceExemplar returns nil for invalid contexts, allowing graceful degradation in metrics recording"

patterns-established:
  - "OTel SDK initialization with OTLP HTTP exporter to otel-collector:4318"
  - "Trace link creation using trace.WithLinks for async message processing"
  - "Trace context extraction pattern: span := oteltrace.SpanFromContext(ctx); spanCtx := span.SpanContext()"
  - "Exemplar pattern: if exemplar := metrics.TraceExemplar(ctx); exemplar != nil { metric.ObserveWithExemplar() } else { metric.Observe() }"

# Metrics
duration: 10min
completed: 2026-02-12
---

# Phase 05 Plan 04: Instrument Fulfillment-Worker Summary

**Go service with manual OTel SDK, W3C traceparent parsing from Redis queue, linked trace creation, context-aware logging with trace IDs, and metric exemplars**

## Performance

- **Duration:** 10 min
- **Started:** 2026-02-12T13:49:06Z
- **Completed:** 2026-02-12T14:00:00Z (estimated)
- **Tasks:** 2
- **Files modified:** 6

## Accomplishments
- Manual OTel SDK initialization with TracerProvider and OTLP HTTP exporter for Go service
- W3C traceparent parsing from Redis queue payload with trace link creation to originating order-api trace
- Context-aware logging functions (InfoCtx, WarnCtx, ErrorCtx) injecting trace_id and span_id into log lines
- TraceExemplar helper function linking metrics to traces via Prometheus exemplar labels
- Semantic spans wrapping business operations (process-fulfillment, update-order-status-processing, update-order-status-fulfilled)

## Task Commits

Each task was committed atomically:

1. **Task 1: Create OTel SDK initialization and update dependencies** - `1f45bba` (feat)
2. **Task 2: Add linked trace parsing, trace context in logs, exemplars in metrics, and semantic spans** - `bbe48cf` (feat)

## Files Created/Modified
- `services/fulfillment-worker/internal/tracing/tracing.go` - OTel SDK initialization with TracerProvider, OTLP HTTP exporter to otel-collector:4318, and resource with service.name
- `services/fulfillment-worker/internal/queue/consumer.go` - Traceparent field in OrderMessage, parseTraceparent function, trace link creation with trace.WithLinks, root span for message processing
- `services/fulfillment-worker/internal/logger/logger.go` - Context-aware logging functions (InfoCtx, ErrorCtx, WarnCtx) with traceFields extraction
- `services/fulfillment-worker/internal/metrics/metrics.go` - TraceExemplar helper returning prometheus.Labels with traceID
- `services/fulfillment-worker/cmd/worker/main.go` - tracing.InitTracer call before business logic, context-aware logging in processOrder, semantic sub-spans for status updates, exemplar-aware metric recording
- `services/fulfillment-worker/go.mod` - OTel dependencies added (otel, sdk, otlptrace, exporters)

## Decisions Made
- Use attribute.String for resource creation instead of semconv package: Avoids complex versioned path imports (go.opentelemetry.io/otel/semconv/v1.24.0) which caused go mod parse errors. Direct attribute creation is simpler and equally effective for service.name.
- Parse W3C traceparent manually and use trace links: Queue consumer creates NEW trace with link to originating trace (not a child span). This is correct pattern for async boundaries where context propagation doesn't apply.
- Add context-aware logging functions alongside originals: InfoCtx/WarnCtx/ErrorCtx coexist with Info/Warn/Error, allowing gradual adoption without breaking existing code.
- TraceExemplar returns nil for invalid contexts: Enables graceful fallback to non-exemplar metrics when trace context is unavailable, avoiding runtime errors.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Add missing prometheus import to cmd/worker/main.go**
- **Found during:** Task 2 verification (compilation check)
- **Issue:** main.go used prometheus.ExemplarObserver and prometheus.ExemplarAdder without importing prometheus package, causing undefined identifier compilation errors
- **Fix:** Added `"github.com/prometheus/client_golang/prometheus"` to imports
- **Files modified:** services/fulfillment-worker/cmd/worker/main.go
- **Verification:** Docker build succeeds
- **Committed in:** bbe48cf (Task 2 commit)

**2. [Rule 1 - Bug] Fix malformed semconv import in internal/tracing/tracing.go**
- **Found during:** Docker build (go mod download failed)
- **Issue:** Import used `semconv "go.opentelemetry.io/otel/semconv/v1.24.0"` and go.mod had duplicate version `go.opentelemetry.io/otel/semconv/v1.24.0 v1.24.0`, causing "malformed module path" error. Versioned path pattern was incorrect.
- **Fix:** Removed semconv import entirely, used `attribute.String("service.name", serviceName)` directly for resource creation
- **Files modified:** services/fulfillment-worker/internal/tracing/tracing.go, services/fulfillment-worker/go.mod
- **Verification:** Docker build succeeds, go mod download works, service.name attribute correctly set in traces
- **Committed in:** bbe48cf (Task 2 commit)

---

**Total deviations:** 2 auto-fixed (2 bugs)
**Impact on plan:** Both auto-fixes necessary for compilation. Simplified approach (direct attribute creation) is cleaner than complex semconv versioning. No scope creep.

## Issues Encountered
- Task 1 was already committed from previous partial execution (commit 1f45bba)
- Task 2 had uncommitted changes that were verified, fixed, and committed
- Go compiler not available in host environment; used Docker build for compilation verification

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- All three services (web-gateway, order-api, fulfillment-worker) now instrumented with OpenTelemetry
- Traces being sent to OTel Collector via OTLP (HTTP for web-gateway and fulfillment-worker, gRPC for order-api)
- Trace links established across async Redis queue boundary
- Log lines include trace_id/span_id for correlation in Loki
- Metrics include exemplars linking to traces
- Ready for end-to-end verification in Phase 05 Plan 05

---
*Phase: 05-distributed-tracing*
*Completed: 2026-02-12*
