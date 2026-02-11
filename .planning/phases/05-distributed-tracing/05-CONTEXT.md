# Phase 5: Distributed Tracing - Context

**Gathered:** 2026-02-11
**Status:** Ready for planning

<domain>
## Phase Boundary

Instrument all three application services with OpenTelemetry, deploy an OTel Collector and Jaeger backend, and wire Grafana for correlated trace exploration. The learner can view the complete path of a request across services with timing breakdowns. Chaos injection and diagnostic challenges are separate phases.

</domain>

<decisions>
## Implementation Decisions

### Instrumentation depth
- Full depth instrumentation across all three services (Node.js, Python, Go)
- Every meaningful operation gets a span: HTTP handlers, gRPC calls, database queries, Redis operations, internal business logic
- All three services instrumented equally since each showcases a different language and operation pattern (HTTP entry, gRPC server + DB, queue consumer)
- Span names use semantic style ("create-order", "save-to-database", "enqueue-fulfillment") rather than operation style ("POST /orders", "SELECT orders")

### Async trace propagation
- Linked traces pattern for the Redis queue boundary between order-api and fulfillment-worker
- Fulfillment-worker starts a new trace but links back to the originating trace — production-realistic for async systems
- The originating request's HTTP response doesn't wait for fulfillment, so child spans would be misleading
- Claude's discretion on link mechanism: W3C traceparent in queue payload vs reusing existing order_id correlation

### Observability correlation
- Inject trace IDs into all log lines so learner can search logs by trace_id in Loki (standard production practice)
- Full Grafana cross-linking: Jaeger datasource + trace-to-logs (Loki) + trace-to-metrics links
- Add exemplars to existing Prometheus metrics (request duration, error count) so learner can click a metric spike and jump to the exact trace
- Modifies Phase 2 metrics code to include exemplar support

### Collector and Jaeger topology
- Standalone OTel Collector gateway — one container, all services send traces to it
- Rich pipeline config: batch processor, tail sampling, attribute processor — learner sees a real production pipeline configuration
- Traces only through Collector; Prometheus continues scraping metrics directly (no disruption to Phase 2 setup)
- Jaeger all-in-one with Badger persistent storage — traces survive container restarts

### Claude's Discretion
- W3C traceparent vs order_id for async trace link mechanism
- Exact tail sampling rules in Collector config
- Attribute enrichment choices in Collector pipeline
- Jaeger retention duration and Badger storage limits
- Exact exemplar implementation per language

</decisions>

<specifics>
## Specific Ideas

- User has never worked with trace IDs before — instrumentation should be educational, not just functional
- User wants production-realistic patterns over simplified ones (chose linked traces over full propagation, chose rich pipeline over minimal)
- User prefers semantic span names for readability ("create-order" not "POST /orders")
- Full cross-linking in Grafana is desired, with a lesson about it planned for Phase 10

</specifics>

<deferred>
## Deferred Ideas

- Lesson/exercise about Grafana cross-linking (traces <-> logs <-> metrics) — Phase 10 (Curriculum)
- Migrating metrics to OTLP through Collector — potential future enhancement
- Agent + gateway Collector topology — advanced module if needed

</deferred>

---

*Phase: 05-distributed-tracing*
*Context gathered: 2026-02-11*
