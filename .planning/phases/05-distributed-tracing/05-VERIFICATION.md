---
phase: 05-distributed-tracing
verified: 2026-02-12T14:02:20Z
status: passed
score: 23/23 must-haves verified
re_verification: false
---

# Phase 5: Distributed Tracing Verification Report

**Phase Goal:** Learner can view the complete path of a request across multiple services with timing breakdowns
**Verified:** 2026-02-12T14:02:20Z
**Status:** PASSED
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | OTel Collector container starts and listens on ports 4317 (gRPC) and 4318 (HTTP) | ✓ VERIFIED | docker-compose.yml lines 538-539: ports exposed, otel-collector/config.yaml lines 7-10: receivers configured |
| 2 | Jaeger all-in-one container starts with Badger persistent storage and OTLP receiver | ✓ VERIFIED | docker-compose.yml lines 503-508: COLLECTOR_OTLP_ENABLED=true, BADGER_EPHEMERAL=false, volume mount jaeger-badger |
| 3 | Collector pipeline has batch, tail sampling, and attribute processors in correct order | ✓ VERIFIED | otel-collector/config.yaml lines 68: processors=[attributes, tail_sampling, batch] |
| 4 | Jaeger UI is accessible on port 16686 | ✓ VERIFIED | docker-compose.yml line 510: port 16686 exposed |
| 5 | Web-gateway sends traces to OTel Collector with auto-instrumented Express HTTP spans | ✓ VERIFIED | services/web-gateway/src/tracing.js lines 10-14: NodeSDK with OTLPTraceExporter, auto-instrumentations, Dockerfile line 24: --require flag |
| 6 | gRPC client calls to order-api propagate W3C trace context in metadata | ✓ VERIFIED | services/web-gateway/src/tracing.js line 16: getNodeAutoInstrumentations auto-instruments @grpc/grpc-js |
| 7 | Web-gateway log lines include trace_id and span_id fields | ✓ VERIFIED | services/web-gateway/src/logger.js line 48: trace_id added to log output |
| 8 | Web-gateway HTTP request duration histogram includes trace ID exemplars | ✓ VERIFIED | services/web-gateway/src/metrics.js lines 20,31: enableExemplars:true, server.js lines 74-79: exemplar passed to metrics |
| 9 | Web-gateway manual semantic spans wrap business logic (create-order, get-order, list-orders) | ✓ VERIFIED | services/web-gateway/src/routes.js lines 23,121,191: semantic spans created |
| 10 | Order-api sends traces to OTel Collector with auto-instrumented gRPC server spans | ✓ VERIFIED | services/order-api/src/tracing.py lines 40,43,46: GrpcInstrumentorServer, PsycopgInstrumentor, RedisInstrumentor, server.py lines 13-14: tracing imported and initialized before grpc |
| 11 | Order-api database queries (psycopg) and Redis operations are auto-instrumented | ✓ VERIFIED | services/order-api/src/tracing.py lines 43,46: PsycopgInstrumentor and RedisInstrumentor registered |
| 12 | Order-api manual semantic spans wrap business logic | ✓ VERIFIED | services/order-api/src/server.py lines 77,193,277: create-order, get-order, list-orders spans, redis_queue.py line 85: enqueue-fulfillment span |
| 13 | Order-api log lines include trace_id and span_id fields | ✓ VERIFIED | services/order-api/src/logger.py lines 43-49: trace_id and span_id extracted and formatted |
| 14 | Order-api gRPC request duration histogram includes trace ID exemplars | ✓ VERIFIED | services/order-api/src/metrics.py lines 35-40: get_trace_exemplar() helper, server.py lines 106-146,168-324: exemplar passed to all metrics |
| 15 | Order-api Redis queue payload includes W3C traceparent for linked trace propagation | ✓ VERIFIED | services/order-api/src/redis_queue.py lines 100-111: traceparent serialized in W3C format and added to message dict |
| 16 | Fulfillment-worker sends traces to OTel Collector via OTLP HTTP | ✓ VERIFIED | services/fulfillment-worker/internal/tracing/tracing.go lines 25-30: OTLP HTTP exporter configured, cmd/worker/main.go line 26: InitTracer called |
| 17 | Fulfillment-worker parses W3C traceparent from queue payload and creates linked trace | ✓ VERIFIED | services/fulfillment-worker/internal/queue/consumer.go lines 32-80: parseTraceparent function, lines 197-200: WithLinks used to create trace link |
| 18 | Fulfillment-worker manual semantic spans wrap business logic | ✓ VERIFIED | services/fulfillment-worker/internal/queue/consumer.go line 204: process-fulfillment span, cmd/worker/main.go: update-order-status-processing and update-order-status-fulfilled spans (semantic sub-spans in processOrder) |
| 19 | Fulfillment-worker log lines include trace_id and span_id fields | ✓ VERIFIED | services/fulfillment-worker/internal/logger/logger.go lines 33,52,61,110: InfoCtx/ErrorCtx/WarnCtx functions with traceFields helper |
| 20 | Fulfillment-worker processing duration histogram includes trace ID exemplars | ✓ VERIFIED | services/fulfillment-worker/internal/metrics/metrics.go lines 50-62: TraceExemplar helper, cmd/worker/main.go lines 120-183: ObserveWithExemplar calls |
| 21 | Grafana has Jaeger as a provisioned datasource accessible in Explore view | ✓ VERIFIED | grafana/provisioning/datasources/jaeger.yml lines 4-8: datasource with uid:jaeger, url:http://jaeger:16686 |
| 22 | Grafana Jaeger datasource links to Loki for trace-to-logs and Prometheus for trace-to-metrics | ✓ VERIFIED | grafana/provisioning/datasources/jaeger.yml lines 13-20: tracesToLogsV2 with datasourceUid:loki, lines 22-35: tracesToMetrics with datasourceUid:prometheus |
| 23 | Prometheus datasource has exemplar configuration pointing to Jaeger | ✓ VERIFIED | grafana/provisioning/datasources/prometheus.yml lines 14-16: exemplarTraceIdDestinations with datasourceUid:jaeger |

**Score:** 23/23 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `otel-collector/config.yaml` | OTel Collector pipeline configuration with tail_sampling | ✓ VERIFIED | EXISTS (70 lines), SUBSTANTIVE (receivers, processors, exporters, service pipeline), WIRED (exported otlp to jaeger:4317 line 54) |
| `docker-compose.yml` | Jaeger and OTel Collector service definitions | ✓ VERIFIED | EXISTS, SUBSTANTIVE (jaeger service lines 498-524, otel-collector service lines 530-554), WIRED (otel-collector depends on jaeger line 541, profiles=[tracing,full] lines 519,548) |
| `services/web-gateway/src/tracing.js` | OTel SDK initialization with auto-instrumentation | ✓ VERIFIED | EXISTS (32 lines), SUBSTANTIVE (NodeSDK, OTLPTraceExporter, auto-instrumentations), WIRED (imported via --require flag in Dockerfile line 24) |
| `services/web-gateway/src/logger.js` | Logger with trace context injection | ✓ VERIFIED | EXISTS, SUBSTANTIVE (trace_id extraction and formatting), WIRED (used in routes/server) |
| `services/web-gateway/src/metrics.js` | Metrics with exemplar support | ✓ VERIFIED | EXISTS, SUBSTANTIVE (enableExemplars:true on histograms and counters), WIRED (used in server.js with exemplar parameter) |
| `services/order-api/src/tracing.py` | OTel SDK initialization with auto-instrumentation for gRPC, psycopg, Redis | ✓ VERIFIED | EXISTS (55 lines), SUBSTANTIVE (TracerProvider, GrpcInstrumentorServer, PsycopgInstrumentor, RedisInstrumentor, LoggingInstrumentor), WIRED (imported first in server.py line 13) |
| `services/order-api/src/redis_queue.py` | Fulfillment queue producer with W3C traceparent in payload | ✓ VERIFIED | EXISTS, SUBSTANTIVE (traceparent serialization W3C format lines 100-104), WIRED (used in enqueue_fulfillment, called from server.py CreateOrder handler) |
| `services/order-api/src/logger.py` | Logger with trace context injection | ✓ VERIFIED | EXISTS, SUBSTANTIVE (trace_id/span_id extraction and formatting), WIRED (used throughout server.py) |
| `services/order-api/src/metrics.py` | Metrics with exemplar support | ✓ VERIFIED | EXISTS, SUBSTANTIVE (get_trace_exemplar helper function), WIRED (used throughout server.py with exemplar parameter) |
| `services/fulfillment-worker/internal/tracing/tracing.go` | OTel SDK setup with TracerProvider and OTLP exporter | ✓ VERIFIED | EXISTS (56 lines), SUBSTANTIVE (TracerProvider, OTLP HTTP exporter, resource config), WIRED (called from main.go line 26) |
| `services/fulfillment-worker/internal/queue/consumer.go` | Queue consumer with W3C traceparent parsing and trace link creation | ✓ VERIFIED | EXISTS, SUBSTANTIVE (parseTraceparent function lines 32-80, WithLinks usage lines 197-200), WIRED (used in Consume function to create linked traces) |
| `services/fulfillment-worker/internal/logger/logger.go` | Logger with trace context injection from context.Context | ✓ VERIFIED | EXISTS, SUBSTANTIVE (InfoCtx/ErrorCtx/WarnCtx functions, traceFields helper), WIRED (used throughout main.go processOrder) |
| `services/fulfillment-worker/internal/metrics/metrics.go` | Metrics with exemplar support | ✓ VERIFIED | EXISTS, SUBSTANTIVE (TraceExemplar helper function), WIRED (used in main.go with ObserveWithExemplar) |
| `grafana/provisioning/datasources/jaeger.yml` | Jaeger datasource with trace-to-logs and trace-to-metrics cross-linking | ✓ VERIFIED | EXISTS (39 lines), SUBSTANTIVE (tracesToLogsV2, tracesToMetrics, nodeGraph configs), WIRED (datasourceUid references to loki and prometheus) |
| `grafana/provisioning/datasources/prometheus.yml` | Prometheus datasource with exemplar datasource pointing to Jaeger | ✓ VERIFIED | EXISTS, SUBSTANTIVE (exemplarTraceIdDestinations config), WIRED (datasourceUid:jaeger reference) |

### Key Link Verification

| From | To | Via | Status | Details |
|------|-----|-----|--------|---------|
| otel-collector | jaeger:4317 | OTLP exporter | ✓ WIRED | config.yaml line 54: endpoint:jaeger:4317 |
| docker-compose.yml | otel-collector/config.yaml | volume mount | ✓ WIRED | docker-compose.yml line 536: volume mount |
| services/web-gateway/src/tracing.js | otel-collector:4318 | OTLP HTTP exporter | ✓ WIRED | tracing.js line 13: url points to otel-collector:4318/v1/traces |
| services/web-gateway/Dockerfile | services/web-gateway/src/tracing.js | node --require flag | ✓ WIRED | Dockerfile line 24: --require ./src/tracing.js |
| services/order-api/src/tracing.py | otel-collector:4318 | OTLP HTTP exporter | ✓ WIRED | tracing.py line 27: endpoint defaults to otel-collector:4318/v1/traces |
| services/order-api/src/redis_queue.py | services/fulfillment-worker/internal/queue/consumer.go | W3C traceparent in Redis queue payload | ✓ WIRED | redis_queue.py lines 100-111: traceparent serialized, consumer.go lines 32-80: parseTraceparent function |
| services/order-api/Dockerfile | services/order-api/src/tracing.py | tracing import before gRPC server starts | ✓ WIRED | server.py line 13: import tracing before import grpc |
| services/fulfillment-worker/internal/tracing/tracing.go | otel-collector:4318 | OTLP HTTP exporter | ✓ WIRED | tracing.go line 23: endpoint defaults to otel-collector:4318 |
| services/fulfillment-worker/internal/queue/consumer.go | services/order-api/src/redis_queue.py | Parse W3C traceparent, create trace link | ✓ WIRED | consumer.go line 197: parseTraceparent, line 198: WithLinks creates link |
| services/fulfillment-worker/cmd/worker/main.go | services/fulfillment-worker/internal/tracing/tracing.go | InitTracer called before business logic | ✓ WIRED | main.go line 26: tracing.InitTracer called at start of main() |
| grafana/provisioning/datasources/jaeger.yml | jaeger:16686 | Jaeger HTTP API | ✓ WIRED | jaeger.yml line 7: url:http://jaeger:16686 |
| grafana/provisioning/datasources/jaeger.yml | grafana/provisioning/datasources/loki.yml | tracesToLogsV2 datasourceUid referencing loki | ✓ WIRED | jaeger.yml line 14: datasourceUid:loki |
| grafana/provisioning/datasources/jaeger.yml | grafana/provisioning/datasources/prometheus.yml | tracesToMetrics datasourceUid referencing prometheus | ✓ WIRED | jaeger.yml line 23: datasourceUid:prometheus |
| grafana/provisioning/datasources/prometheus.yml | grafana/provisioning/datasources/jaeger.yml | exemplarTraceIdDestinations datasourceUid referencing jaeger | ✓ WIRED | prometheus.yml line 16: datasourceUid:jaeger |

### Requirements Coverage

| Requirement | Status | Evidence |
|-------------|--------|----------|
| TRAC-01: Jaeger receives and stores distributed traces | ✓ SATISFIED | Jaeger service configured with OTLP receiver and Badger persistent storage (docker-compose.yml lines 503-508), OTel Collector forwards to Jaeger (otel-collector/config.yaml line 54) |
| TRAC-02: OpenTelemetry Collector receives traces from services and forwards to Jaeger | ✓ SATISFIED | OTel Collector receives OTLP on 4317/4318 (config.yaml lines 7-10), exports to jaeger:4317 (line 54), all 3 services send to otel-collector:4318 |
| TRAC-03: All application services are instrumented with OpenTelemetry SDKs | ✓ SATISFIED | web-gateway (tracing.js), order-api (tracing.py), fulfillment-worker (tracing.go) all have OTel SDK initialization |
| TRAC-04: Traces show the full request path across multiple services | ✓ SATISFIED | web-gateway auto-propagates via gRPC metadata, order-api receives trace context via GrpcInstrumentorServer, fulfillment-worker creates linked trace from W3C traceparent in queue |
| TRAC-05: Learner can view trace timelines and service dependency graphs in Jaeger UI | ✓ SATISFIED | Jaeger UI exposed on port 16686 (docker-compose.yml line 510), nodeGraph enabled in Grafana Jaeger datasource (jaeger.yml line 37) |
| TRAC-06: Grafana links to Jaeger traces from dashboard panels | ✓ SATISFIED | Prometheus datasource has exemplarTraceIdDestinations pointing to Jaeger (prometheus.yml lines 14-16), Jaeger datasource has tracesToLogsV2 and tracesToMetrics (jaeger.yml lines 13-35) |

### Anti-Patterns Found

**No blocking anti-patterns detected.**

Minor findings:
- Comment in main.go line 29 has typo: "/ Non-fatal" should be "// Non-fatal" (single slash instead of double) - cosmetic only, does not affect functionality

### Implementation Quality Assessment

**Strengths:**
1. **Complete distributed tracing infrastructure**: Jaeger backend with persistent storage, OTel Collector with production-realistic pipeline (tail sampling, batch processing, attribute enrichment)
2. **Full service instrumentation**: All 3 services (Node.js, Python, Go) properly instrumented with OTel SDKs
3. **Auto-instrumentation utilized**: Express, gRPC client/server, psycopg, Redis all auto-instrumented - minimal manual work
4. **Semantic manual spans**: Business logic wrapped in semantic spans (create-order, get-order, list-orders, enqueue-fulfillment, process-fulfillment, update-order-status-*)
5. **Trace context in logs**: All services inject trace_id and span_id into log lines for correlation
6. **Exemplar support**: All services record trace ID exemplars on metrics for trace-to-metric linking
7. **Linked traces across async boundary**: W3C traceparent serialized through Redis queue enables trace linking from order-api to fulfillment-worker
8. **Full Grafana cross-linking**: trace-to-logs, trace-to-metrics, exemplar-to-trace all configured
9. **Correct processor order**: tail_sampling BEFORE batch (research pitfall #5 avoided)
10. **Resource configuration**: Memory limits, health checks, persistent storage all properly configured

**Critical path verified:**
- HTTP request hits web-gateway → auto-instrumented Express span created
- web-gateway calls order-api via gRPC → auto-instrumented gRPC client propagates W3C trace context in metadata
- order-api receives gRPC call → auto-instrumented gRPC server extracts trace context, creates child span
- order-api enqueues to Redis → traceparent serialized into queue message payload
- fulfillment-worker consumes from Redis → parses traceparent, creates NEW trace with link to originating trace
- All spans sent to OTel Collector → processed (attributes, tail_sampling, batch) → exported to Jaeger
- Jaeger stores spans in Badger persistent storage → visible in Jaeger UI
- Grafana can navigate: trace → logs (via trace_id filter), trace → metrics (via service queries), metrics → trace (via exemplars)

**No gaps found.**

## Summary

Phase 5 has **PASSED** all verification checks. All 23 must-haves from the 5 plans are verified as implemented, substantive, and wired correctly.

The distributed tracing system is complete and production-realistic:
- Infrastructure (Jaeger, OTel Collector) properly deployed with persistent storage
- All 3 polyglot services instrumented with OpenTelemetry SDKs
- Auto-instrumentation for frameworks (Express, gRPC, psycopg, Redis)
- Semantic manual spans for business logic visibility
- Trace context propagation across synchronous (gRPC) and asynchronous (Redis queue) boundaries
- Linked traces pattern correctly implemented for async queue processing
- Full observability correlation triangle: traces ↔ logs ↔ metrics
- Grafana cross-linking enables seamless navigation between observability signals

**The phase goal is achieved:** Learner can view the complete path of a request across multiple services with timing breakdowns. A request flow from web-gateway → order-api → fulfillment-worker will show:
1. Parent span in web-gateway (HTTP request + gRPC call)
2. Child span in order-api (gRPC server + database operations + Redis enqueue)
3. Linked span in fulfillment-worker (queue consumption + database updates)
4. Full timing waterfall showing where time was spent
5. Service dependency graph showing service relationships
6. Clickable links to related logs (filtered by trace_id) and metrics (filtered by service)

All success criteria from ROADMAP.md are satisfied. Ready to proceed to Phase 6.

---

_Verified: 2026-02-12T14:02:20Z_
_Verifier: Claude (gsd-verifier)_
