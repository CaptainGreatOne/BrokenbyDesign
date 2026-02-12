---
phase: 05-distributed-tracing
plan: 03
subsystem: api
tags: [opentelemetry, python, grpc, tracing, psycopg, redis, exemplars, w3c-traceparent]

# Dependency graph
requires:
  - phase: 05-01
    provides: "Jaeger backend and OTel Collector with trace pipeline"
provides:
  - "Order-api sends traces to OTel Collector with auto-instrumented gRPC/psycopg/Redis spans"
  - "Manual semantic spans for business logic (create-order, get-order, list-orders, enqueue-fulfillment)"
  - "Log lines include trace_id and span_id fields for Loki correlation"
  - "Prometheus metrics include trace ID exemplars for trace-metric linking"
  - "W3C traceparent in Redis queue payload enables linked trace propagation to fulfillment-worker"
affects: [05-04-fulfillment-worker, 06-queues, 07-correlation]

# Tech tracking
tech-stack:
  added:
    - "opentelemetry-distro>=0.48b0"
    - "opentelemetry-exporter-otlp>=1.27.0"
    - "opentelemetry-instrumentation-grpc>=0.48b0"
    - "opentelemetry-instrumentation-psycopg>=0.48b0"
    - "opentelemetry-instrumentation-redis>=0.48b0"
    - "opentelemetry-instrumentation-logging>=0.48b0"
  patterns:
    - "OTel SDK initialization before service imports (tracing.py imported first in server.py)"
    - "Auto-instrumentation for gRPC server, psycopg, Redis via instrumentors"
    - "Semantic spans wrapping business logic with descriptive span names"
    - "Trace context injection into structured logs (trace_id, span_id)"
    - "Exemplar attachment to Prometheus metrics for trace-metric correlation"
    - "W3C traceparent serialization in queue payloads for linked trace propagation"

key-files:
  created:
    - services/order-api/src/tracing.py
  modified:
    - services/order-api/src/server.py
    - services/order-api/src/logger.py
    - services/order-api/src/metrics.py
    - services/order-api/src/redis_queue.py
    - services/order-api/requirements.txt

key-decisions:
  - "OTel SDK initialized in dedicated tracing.py module imported before grpc/db/redis"
  - "Auto-instrumentation covers gRPC server (trace context propagation), psycopg (DB spans), Redis (cache/queue spans)"
  - "Semantic spans use descriptive names (create-order vs generic process-request)"
  - "Trace context extracted from active span for log injection and exemplar creation"
  - "W3C traceparent format (00-{trace_id}-{span_id}-{flags}) in queue payload for downstream linked traces"

patterns-established:
  - "Tracing initialization pattern: Import tracing module first, call init_tracing() before service imports"
  - "Semantic span pattern: tracer.start_as_current_span(name, attributes={}) wrapping business logic"
  - "Trace context pattern: trace.get_current_span() → get_span_context() → extract trace_id/span_id"
  - "Exemplar pattern: get_trace_exemplar() returns {traceID: trace_id} dict for metric observations"
  - "Linked trace pattern: Serialize span context as W3C traceparent, include in message payload"

# Metrics
duration: ~5min
completed: 2026-02-12
---

# Phase 5 Plan 3: Instrument Order-API Summary

**Order-api sends distributed traces to OTel Collector with auto-instrumented gRPC/psycopg/Redis spans, semantic business logic spans, trace-correlated logs, metric exemplars, and W3C traceparent in queue for linked worker traces**

## Performance

- **Duration:** ~5 min
- **Started:** 2026-02-12T13:44:42Z (estimated, continuation from previous agent)
- **Completed:** 2026-02-12T13:49:42Z
- **Tasks:** 2
- **Files modified:** 6

## Accomplishments
- OTel SDK initialized with TracerProvider, BatchSpanProcessor, OTLPSpanExporter before gRPC server starts
- Auto-instrumentation captures gRPC server spans (with W3C trace context propagation), psycopg database queries, and Redis operations
- Semantic manual spans wrap business logic (create-order, get-order, list-orders, enqueue-fulfillment) with descriptive attributes
- Log lines include trace_id and span_id fields extracted from active span for Loki trace-log correlation
- Prometheus metrics record trace ID exemplars enabling jump from metrics to traces in Grafana
- Redis queue payload includes W3C traceparent string for linked trace propagation to fulfillment-worker

## Task Commits

Each task was committed atomically:

1. **Task 1: Create OTel SDK initialization and update build files** - `7789922` (feat)
2. **Task 2: Add trace context to logs, exemplars to metrics, semantic spans, and W3C traceparent to queue** - `8384694` (feat)

## Files Created/Modified
- `services/order-api/src/tracing.py` - OTel SDK initialization with TracerProvider, GrpcInstrumentorServer, PsycopgInstrumentor, RedisInstrumentor, LoggingInstrumentor
- `services/order-api/src/logger.py` - Injects trace_id and span_id into log lines for correlation
- `services/order-api/src/metrics.py` - Provides get_trace_exemplar() helper returning {traceID: trace_id}
- `services/order-api/src/server.py` - Wraps CreateOrder, GetOrder, ListOrders in semantic spans with exemplar recording
- `services/order-api/src/redis_queue.py` - Serializes W3C traceparent into fulfillment queue payload, wraps enqueue in semantic span
- `services/order-api/requirements.txt` - Added 6 opentelemetry packages (distro, exporter-otlp, instrumentation-grpc/psycopg/redis/logging)

## Decisions Made

**1. Tracing initialization order**
- Created dedicated `tracing.py` module imported at very top of `server.py` (after stdlib, before grpc/db/redis)
- Ensures auto-instrumentation hooks register before libraries are imported
- Pattern: `import tracing; tracing.init_tracing()` as first non-stdlib import

**2. Auto-instrumentation coverage**
- GrpcInstrumentorServer: Auto-creates spans for incoming gRPC RPCs, extracts W3C trace context from metadata
- PsycopgInstrumentor: Auto-creates spans for psycopg3 database queries
- RedisInstrumentor: Auto-creates spans for Redis operations (get, set, lpush)
- LoggingInstrumentor: Auto-injects trace context into Python logging records

**3. Semantic span design**
- Manual spans use descriptive business logic names: `create-order`, `get-order`, `list-orders`, `enqueue-fulfillment`
- Attributes capture business context: `order.product_id`, `order.quantity`, `order.id`, `queue.name`
- Spans set status on success/error for trace sampling and alerting

**4. Trace context extraction**
- Logger and metrics both call `trace.get_current_span().get_span_context()` to extract trace_id/span_id
- Format: 32-char hex trace_id, 16-char hex span_id (W3C trace context format)
- Injected into log lines as `trace_id=<id> span_id=<id>` key-value pairs for Loki parsing

**5. Exemplar attachment**
- Prometheus metrics support exemplars via `exemplar` parameter on `.observe()` and `.inc()` methods
- Helper function `get_trace_exemplar()` returns `{"traceID": trace_id}` dict
- Attached to all metric observations in success/error paths for trace-metric correlation

**6. W3C traceparent serialization**
- Queue payload includes `traceparent` field with W3C format: `00-{trace_id:032x}-{span_id:016x}-{trace_flags:02x}`
- Fulfillment-worker (plan 05-04) will parse this to create linked trace (same trace_id, new span_id, trace.Link reference)
- Critical link for distributed trace across queue boundary

## Deviations from Plan

None - plan executed exactly as written. All changes matched plan specifications for Task 1 (OTel SDK initialization) and Task 2 (trace context, exemplars, semantic spans, W3C traceparent).

## Issues Encountered

None. Task 1 was already committed from previous agent execution. Task 2 had uncommitted changes that were verified to match plan requirements. The only missing piece was the W3C traceparent in redis_queue.py, which was added according to plan specification.

## User Setup Required

None - no external service configuration required. Order-api sends traces to OTel Collector (already running from plan 05-01) via OTLP HTTP endpoint at otel-collector:4318/v1/traces.

## Next Phase Readiness

**Ready for:**
- Plan 05-04 (Instrument fulfillment-worker): Can parse W3C traceparent from queue payload and create linked traces
- Plan 05-05 (Verify trace correlation): Traces flow from web-gateway → order-api → fulfillment-worker with linked trace propagation
- Phase 06 (Queue observability): Redis queue already includes traceparent for correlation
- Phase 07 (Distributed tracing patterns): Full trace context propagation across HTTP → gRPC → Queue boundaries

**Key outputs for downstream plans:**
- `services/order-api/src/tracing.py` pattern: Reference for instrumenting other Python services
- W3C traceparent in queue: Fulfillment-worker parses this to create linked trace
- Exemplar pattern: Reference for other services adding trace-metric correlation
- Semantic span pattern: Reference for meaningful span names vs auto-instrumentation generics

**No blockers.**

---
*Phase: 05-distributed-tracing*
*Completed: 2026-02-12*
