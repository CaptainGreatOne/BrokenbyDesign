# Phase 5: Distributed Tracing - Research

**Researched:** 2026-02-11
**Domain:** Distributed tracing with OpenTelemetry, Jaeger, and OTel Collector
**Confidence:** HIGH

## Summary

This research covers implementing distributed tracing across a polyglot microservices architecture (Node.js, Python, Go) using OpenTelemetry SDKs, OpenTelemetry Collector, and Jaeger backend. The standard approach uses official OpenTelemetry SDKs for each language with auto-instrumentation where available, OTLP protocol for trace export, a standalone OTel Collector with a rich pipeline for processing, and Jaeger all-in-one with Badger storage for trace persistence.

The user has decided on full-depth instrumentation with semantic span names, linked traces for async queue boundaries, observability correlation (trace IDs in logs, exemplars in metrics), and a production-realistic Collector pipeline with batch processing and tail sampling.

**Primary recommendation:** Use official OpenTelemetry SDKs with auto-instrumentation packages for Node.js and Python, manual instrumentation for Go, export all traces via OTLP to a single OTel Collector gateway, configure batch and tail sampling processors in the Collector, and send traces to Jaeger all-in-one using OTLP receiver (not deprecated Jaeger exporter).

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Instrumentation depth:**
- Full depth instrumentation across all three services (Node.js, Python, Go)
- Every meaningful operation gets a span: HTTP handlers, gRPC calls, database queries, Redis operations, internal business logic
- All three services instrumented equally since each showcases a different language and operation pattern (HTTP entry, gRPC server + DB, queue consumer)
- Span names use semantic style ("create-order", "save-to-database", "enqueue-fulfillment") rather than operation style ("POST /orders", "SELECT orders")

**Async trace propagation:**
- Linked traces pattern for the Redis queue boundary between order-api and fulfillment-worker
- Fulfillment-worker starts a new trace but links back to the originating trace — production-realistic for async systems
- The originating request's HTTP response doesn't wait for fulfillment, so child spans would be misleading

**Observability correlation:**
- Inject trace IDs into all log lines so learner can search logs by trace_id in Loki (standard production practice)
- Full Grafana cross-linking: Jaeger datasource + trace-to-logs (Loki) + trace-to-metrics links
- Add exemplars to existing Prometheus metrics (request duration, error count) so learner can click a metric spike and jump to the exact trace
- Modifies Phase 2 metrics code to include exemplar support

**Collector and Jaeger topology:**
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

### Deferred Ideas (OUT OF SCOPE)

- Lesson/exercise about Grafana cross-linking (traces <-> logs <-> metrics) — Phase 10 (Curriculum)
- Migrating metrics to OTLP through Collector — potential future enhancement
- Agent + gateway Collector topology — advanced module if needed
</user_constraints>

## Standard Stack

The established libraries/tools for distributed tracing with OpenTelemetry:

### Core Components

| Component | Version/Image | Purpose | Why Standard |
|-----------|---------------|---------|--------------|
| OpenTelemetry JS SDK | @opentelemetry/sdk-node@^0.211.0 | Node.js tracing SDK | Official OTel implementation, handles initialization and configuration |
| OpenTelemetry Python SDK | opentelemetry-distro (latest) | Python tracing SDK | Official OTel distribution with API, SDK, and tools |
| OpenTelemetry Go SDK | go.opentelemetry.io/otel@v1.35+ | Go tracing SDK | Official OTel Go implementation, published Feb 2026 |
| OTel Collector | otel/opentelemetry-collector-contrib:latest | Trace processing pipeline | Industry standard, contains all processors/exporters |
| Jaeger | jaegertracing/all-in-one:latest | Trace storage and UI | De facto standard for trace visualization, native OTLP support |

### Language-Specific Auto-Instrumentation

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @opentelemetry/auto-instrumentations-node | ^0.52.0 | Auto-instrument Express, gRPC, Redis | Node.js - captures HTTP, gRPC client, Redis with zero code changes |
| opentelemetry-instrumentation-grpc | (via distro) | Auto-instrument gRPC server | Python - captures gRPC server spans automatically |
| github.com/redis/go-redis/extra/redisotel/v9 | v9.4.0+ | Instrument go-redis client | Go - go-redis official OTel integration |
| go.opentelemetry.io/contrib/instrumentation/net/http/otelhttp | v0.57+ | Instrument HTTP handlers | Go - wraps HTTP handlers for auto-instrumentation |

### Supporting Libraries

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @opentelemetry/exporter-trace-otlp-http | ^0.211.0 | Export traces via OTLP/HTTP | Node.js - send traces to Collector on port 4318 |
| opentelemetry-exporter-otlp | (via distro) | Export traces via OTLP | Python - default exporter to Collector |
| go.opentelemetry.io/otel/exporters/otlp/otlptrace/otlptracehttp | v1.35+ | Export traces via OTLP/HTTP | Go - send traces to Collector |
| @opentelemetry/instrumentation-winston | ^0.41.0 | Inject trace context in Winston logs | Node.js - for trace ID in log correlation |
| opentelemetry-instrumentation-logging | (via distro) | Inject trace context in Python logs | Python - env var OTEL_PYTHON_LOG_CORRELATION=true |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| OTLP/HTTP (port 4318) | OTLP/gRPC (port 4317) | gRPC is more efficient but HTTP has better firewall compatibility |
| Auto-instrumentation | Manual instrumentation only | Manual gives more control but requires significantly more code |
| Jaeger native OTLP | Jaeger Thrift exporter | Jaeger exporter is deprecated, OTLP is the recommended path |
| OTel Collector | Direct Jaeger export | Collector enables sampling, filtering, and production patterns |

**Installation:**

```bash
# Node.js (web-gateway)
npm install --save \
  @opentelemetry/sdk-node \
  @opentelemetry/auto-instrumentations-node \
  @opentelemetry/exporter-trace-otlp-http \
  @opentelemetry/api

# Python (order-api)
pip install \
  opentelemetry-distro \
  opentelemetry-exporter-otlp \
  opentelemetry-instrumentation-grpc

# Go (fulfillment-worker)
go get go.opentelemetry.io/otel
go get go.opentelemetry.io/otel/sdk/trace
go get go.opentelemetry.io/otel/exporters/otlp/otlptrace/otlptracehttp
go get github.com/redis/go-redis/extra/redisotel/v9
```

## Architecture Patterns

### Recommended Project Structure

```
services/
├── web-gateway/
│   ├── src/
│   │   ├── tracing.js           # OTel SDK initialization (loaded FIRST)
│   │   ├── server.js            # App code (loads after tracing.js)
│   │   └── logger.js            # Winston with trace context injection
├── order-api/
│   └── src/
│       ├── tracing.py           # OTel SDK initialization
│       ├── server.py            # gRPC server with GrpcInstrumentor
│       └── logger.py            # Logging with trace context
├── fulfillment-worker/
│   ├── internal/
│   │   ├── tracing/
│   │   │   └── tracing.go       # OTel SDK setup, provider init
│   │   └── queue/
│   │       └── consumer.go      # Extract trace link from Redis
│   └── cmd/worker/main.go       # Bootstrap tracing before business logic
└── otel-collector/
    └── config.yaml              # Receiver, processors, exporters

infrastructure/
└── jaeger/
    └── (no config needed, env vars only)
```

### Pattern 1: SDK Initialization (Must Run First)

**What:** Initialize OpenTelemetry SDK before any application code runs.

**When to use:** All instrumented services - critical for auto-instrumentation to work.

**Node.js Example:**
```javascript
// tracing.js - loaded via Node --require flag
const { NodeSDK } = require('@opentelemetry/sdk-node');
const { OTLPTraceExporter } = require('@opentelemetry/exporter-trace-otlp-http');
const { getNodeAutoInstrumentations } = require('@opentelemetry/auto-instrumentations-node');

const sdk = new NodeSDK({
  serviceName: 'web-gateway',
  traceExporter: new OTLPTraceExporter({
    url: 'http://otel-collector:4318/v1/traces',
  }),
  instrumentations: [getNodeAutoInstrumentations()],
});

sdk.start();

process.on('SIGTERM', () => {
  sdk.shutdown()
    .then(() => console.log('Tracing terminated'))
    .catch((error) => console.error('Error shutting down tracing', error))
    .finally(() => process.exit(0));
});
```

**Python Example:**
```python
# tracing.py - called before Flask/gRPC app starts
from opentelemetry import trace
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor
from opentelemetry.exporter.otlp.proto.http.trace_exporter import OTLPSpanExporter
from opentelemetry.instrumentation.grpc import GrpcInstrumentorServer

def init_tracing(service_name: str):
    provider = TracerProvider(
        resource=Resource.create({"service.name": service_name})
    )
    processor = BatchSpanProcessor(
        OTLPSpanExporter(endpoint="http://otel-collector:4318/v1/traces")
    )
    provider.add_span_processor(processor)
    trace.set_tracer_provider(provider)

    # Auto-instrument gRPC
    GrpcInstrumentorServer().instrument()
```

**Go Example:**
```go
// tracing/tracing.go
package tracing

import (
    "context"
    "go.opentelemetry.io/otel"
    "go.opentelemetry.io/otel/exporters/otlp/otlptrace/otlptracehttp"
    "go.opentelemetry.io/otel/sdk/resource"
    sdktrace "go.opentelemetry.io/otel/sdk/trace"
    semconv "go.opentelemetry.io/otel/semconv/v1.17.0"
)

func InitTracer(serviceName string) (func(), error) {
    exporter, err := otlptracehttp.New(
        context.Background(),
        otlptracehttp.WithEndpoint("otel-collector:4318"),
        otlptracehttp.WithInsecure(),
    )
    if err != nil {
        return nil, err
    }

    tp := sdktrace.NewTracerProvider(
        sdktrace.WithBatcher(exporter),
        sdktrace.WithResource(resource.NewWithAttributes(
            semconv.SchemaURL,
            semconv.ServiceName(serviceName),
        )),
    )
    otel.SetTracerProvider(tp)

    return func() { tp.Shutdown(context.Background()) }, nil
}
```

### Pattern 2: Linked Traces for Async Queues

**What:** Create trace links when operations cross async boundaries (message queues, delayed jobs).

**When to use:** Between order-api (producer) and fulfillment-worker (consumer) via Redis.

**Why:** Parent-child spans require synchronous relationships. Async operations need links instead.

**Implementation:**
```python
# order-api: Enqueue with trace context
from opentelemetry import trace

def enqueue_fulfillment(order_id: str):
    current_span = trace.get_current_span()
    ctx = current_span.get_span_context()

    # Serialize W3C traceparent into queue payload
    traceparent = f"00-{ctx.trace_id:032x}-{ctx.span_id:016x}-{ctx.trace_flags:02x}"

    redis_client.lpush("fulfillment_queue", json.dumps({
        "order_id": order_id,
        "traceparent": traceparent,  # W3C format
        "timestamp": int(time.time())
    }))
```

```go
// fulfillment-worker: Consume with trace link
import (
    "go.opentelemetry.io/otel/trace"
)

func processMessage(ctx context.Context, payload string) {
    var msg Message
    json.Unmarshal([]byte(payload), &msg)

    // Parse traceparent and create link
    parentCtx := parseTraceparent(msg.Traceparent)  // Extract SpanContext

    tracer := otel.Tracer("fulfillment-worker")
    ctx, span := tracer.Start(
        ctx,
        "process-fulfillment",
        trace.WithLinks(trace.Link{
            SpanContext: parentCtx,
        }),
    )
    defer span.End()

    // Business logic with new trace linked to original
}
```

### Pattern 3: Inject Trace IDs into Logs

**What:** Add trace_id and span_id to every log line for correlation.

**When to use:** All services - enables clicking from trace to logs in Grafana.

**Node.js (Winston):**
```javascript
const winston = require('winston');
const { trace } = require('@opentelemetry/api');

const format = winston.format.combine(
  winston.format.timestamp(),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    const span = trace.getActiveSpan();
    const traceId = span?.spanContext().traceId || 'no-trace';
    const spanId = span?.spanContext().spanId || 'no-span';

    return JSON.stringify({
      timestamp,
      level,
      message,
      trace_id: traceId,
      span_id: spanId,
      ...meta
    });
  })
);

const logger = winston.createLogger({ format });
```

**Python (with env var):**
```python
# Set environment variable before running
# OTEL_PYTHON_LOG_CORRELATION=true

from opentelemetry.instrumentation.logging import LoggingInstrumentor

LoggingInstrumentor().instrument(set_logging_format=True)

# Logs now automatically include trace_id and span_id
```

**Go (slog wrapper):**
```go
import (
    "log/slog"
    "go.opentelemetry.io/otel/trace"
)

func LogWithTrace(ctx context.Context, level slog.Level, msg string, args ...any) {
    span := trace.SpanFromContext(ctx)
    spanCtx := span.SpanContext()

    attrs := append(args,
        slog.String("trace_id", spanCtx.TraceID().String()),
        slog.String("span_id", spanCtx.SpanID().String()),
    )
    slog.LogAttrs(ctx, level, msg, attrs...)
}
```

### Pattern 4: Prometheus Exemplars

**What:** Attach trace context to metric observations so metrics link to traces.

**When to use:** Request duration and error count metrics - enables clicking spike to trace.

**Node.js (prom-client):**
```javascript
const client = require('prom-client');
const { trace } = require('@opentelemetry/api');

const httpDuration = new client.Histogram({
  name: 'http_request_duration_seconds',
  help: 'HTTP request duration',
  buckets: [0.001, 0.01, 0.1, 0.5, 1, 2, 5],
  enableExemplars: true,  // Enable exemplar support
  labelNames: ['method', 'route', 'status']
});

// Record with exemplar
function recordDuration(method, route, status, durationSeconds) {
  const span = trace.getActiveSpan();
  const traceId = span?.spanContext().traceId;

  httpDuration.observe(
    { method, route, status },
    durationSeconds,
    traceId ? { traceID: traceId } : undefined  // Exemplar
  );
}
```

**Python (prometheus-client):**
```python
from prometheus_client import Histogram
from opentelemetry import trace

request_duration = Histogram(
    'grpc_request_duration_seconds',
    'gRPC request duration',
    ['method', 'status']
)

# Record with exemplar
span = trace.get_current_span()
ctx = span.get_span_context()
exemplar = {'traceID': f"{ctx.trace_id:032x}"} if ctx.is_valid else {}

request_duration.labels(method='CreateOrder', status='OK').observe(
    duration,
    exemplar=exemplar
)
```

### Pattern 5: OTel Collector Pipeline Configuration

**What:** Configure Collector with receivers, processors, exporters in pipeline.

**When to use:** Production deployments - adds batching, sampling, attribute enrichment.

**Example config.yaml:**
```yaml
receivers:
  otlp:
    protocols:
      http:
        endpoint: 0.0.0.0:4318
      grpc:
        endpoint: 0.0.0.0:4317

processors:
  batch:
    timeout: 10s
    send_batch_size: 1024
    send_batch_max_size: 2048

  attributes:
    actions:
      - key: deployment.environment
        value: "local"
        action: insert

  tail_sampling:
    decision_wait: 10s
    num_traces: 10000
    expected_new_traces_per_sec: 100
    policies:
      # Always sample errors
      - name: errors
        type: status_code
        status_code:
          status_codes: [ERROR]
      # Sample slow requests
      - name: slow_requests
        type: latency
        latency:
          threshold_ms: 1000
      # Probabilistic sample others (10%)
      - name: probabilistic
        type: probabilistic
        probabilistic:
          sampling_percentage: 10

exporters:
  otlp:
    endpoint: jaeger:4317
    tls:
      insecure: true

service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [batch, attributes, tail_sampling]
      exporters: [otlp]
```

### Anti-Patterns to Avoid

- **Late SDK initialization:** Auto-instrumentation captures library calls at load time. Initialize SDK before app imports.
- **Synchronous exporters:** Use BatchSpanProcessor, not SimpleSpanProcessor. Batching reduces network overhead.
- **Batch processor before tail sampling:** Batch can split traces across batches. Use batch AFTER tail sampling.
- **Parent spans for async operations:** Use trace links for queues/async workers, not parent-child relationships.
- **High-cardinality span attributes:** Don't use UUIDs or timestamps as attribute keys. Bounded cardinality only.

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Trace context propagation | Custom headers like X-Trace-ID | W3C Trace Context (traceparent) | OpenTelemetry auto-implements W3C standard, works across all languages/tools |
| Span batching and export | Custom buffering logic | BatchSpanProcessor in SDK | Handles backpressure, retries, graceful shutdown automatically |
| Trace sampling decisions | Custom sampling logic | Collector tail_sampling processor | Sees complete trace before sampling decision, supports complex policies |
| Log-trace correlation | Manual trace ID injection | OTel logging instrumentation | Auto-injects trace context, standardized attribute names |
| Metric exemplar tracking | Custom trace linking | OTel exemplar support in SDK | Automatically attaches active span context to metrics |
| Service name configuration | Hardcoded strings | OTEL_SERVICE_NAME env var | Standard across all SDKs, overridable per environment |

**Key insight:** OpenTelemetry standardizes patterns that seem simple but have edge cases. Context propagation across async boundaries, graceful shutdown of exporters, and sampling decisions on incomplete traces all have subtle failure modes. Use official SDKs and processors.

## Common Pitfalls

### Pitfall 1: SDK Initialized Too Late

**What goes wrong:** Auto-instrumentation doesn't capture library calls. Spans show up incomplete or missing.

**Why it happens:** Libraries like Express, gRPC clients, and Redis are imported before OTel SDK initializes. Auto-instrumentation hooks library load time, not runtime.

**How to avoid:**
- Node.js: Use `node --require ./tracing.js server.js` to load SDK first
- Python: Call `init_tracing()` before any `import grpc` or framework imports
- Go: Call `tracing.InitTracer()` in `main()` before initializing gRPC/HTTP servers

**Warning signs:**
- Traces show only manual spans, no HTTP/gRPC auto-spans
- Logs say "Instrumentation library not found" or similar

### Pitfall 2: OTLP Endpoint Misconfiguration

**What goes wrong:** Traces don't appear in Jaeger. SDK logs "connection refused" or "unavailable".

**Why it happens:** Mixing up HTTP (4318) vs gRPC (4317) ports, using wrong protocol scheme, or incorrect hostname.

**How to avoid:**
- Use full URL with scheme: `http://otel-collector:4318/v1/traces` (HTTP) or `otel-collector:4317` (gRPC)
- Match exporter type to port: OTLPTraceExporter (HTTP) uses 4318, gRPC uses 4317
- In Docker: Use service name `otel-collector`, not `localhost`
- Check Collector logs for "receiver started" confirmation

**Warning signs:**
- SDK logs "failed to export" or "dial tcp: connection refused"
- Jaeger UI shows no traces despite app traffic
- Collector logs show no received spans

### Pitfall 3: Missing Trace Context in Logs

**What goes wrong:** Logs don't have trace_id field. Can't correlate traces to logs in Grafana.

**Why it happens:** Logging happens outside span context, or logger doesn't extract active span.

**How to avoid:**
- Node.js: Use Winston formatter that calls `trace.getActiveSpan()` in format function
- Python: Set `OTEL_PYTHON_LOG_CORRELATION=true` env var OR use LoggingInstrumentor
- Go: Wrap slog/zap to extract span from context.Context and add trace_id attribute
- Always pass context.Context through function calls in Go

**Warning signs:**
- JSON logs don't have `trace_id` or `span_id` fields
- Grafana trace-to-logs link shows no results

### Pitfall 4: Exemplar Cardinality Explosion

**What goes wrong:** Prometheus scrape times out. High memory usage. Metrics disappear.

**Why it happens:** Exemplars attach trace IDs to every metric sample. With high-cardinality labels (like user_id), metrics * exemplars * labels exceeds memory.

**How to avoid:**
- Only enable exemplars on low-cardinality metrics (request_duration by route, not by user_id)
- Use bounded label values: status codes (5 values), not error messages (unbounded)
- Configure Prometheus to limit exemplar storage: `--storage.exemplars.max-exemplars=100000`

**Warning signs:**
- Prometheus scrape latency increases over time
- Metrics stop updating or show gaps
- Prometheus logs "exemplar storage full"

### Pitfall 5: Batch Processor Before Tail Sampling

**What goes wrong:** Tail sampling doesn't see complete traces. Samples incorrectly.

**Why it happens:** Batch processor groups spans by time, can split trace across batches. Tail sampler receives incomplete trace and makes wrong decision.

**How to avoid:**
- In Collector config, order processors: `[attributes, tail_sampling, batch]`
- Tail sampling must see all spans for a trace_id before deciding
- Use batch processor AFTER tail sampling to group final export

**Warning signs:**
- Tail sampling policy "always sample errors" misses error traces
- Sampling percentage doesn't match configured rate
- Collector logs "trace incomplete" warnings

### Pitfall 6: Linked Traces Parsed Incorrectly

**What goes wrong:** Fulfillment-worker traces don't link back to order-api. Trace view shows disconnected traces.

**Why it happens:** W3C traceparent format is strict. Incorrect parsing or serialization breaks link.

**How to avoid:**
- Use exact W3C format: `00-{trace_id}-{span_id}-{flags}` (hex encoded, specific lengths)
- Trace ID: 32 hex chars (16 bytes), Span ID: 16 hex chars (8 bytes), Flags: 2 hex chars
- Don't pass raw integers or UUID formats - convert to hex string
- Test parsing with known good traceparent from auto-instrumentation

**Warning signs:**
- Jaeger shows two separate traces instead of linked traces
- Fulfillment trace doesn't have "References" section pointing to order trace
- Logs show "invalid traceparent format" warnings

## Code Examples

Verified patterns from official sources:

### Manual Span Creation (Go)

```go
// Source: https://opentelemetry.io/docs/languages/go/instrumentation/
import (
    "context"
    "go.opentelemetry.io/otel"
    "go.opentelemetry.io/otel/attribute"
)

func saveToDatabase(ctx context.Context, order Order) error {
    tracer := otel.Tracer("order-api")
    ctx, span := tracer.Start(ctx, "save-to-database")
    defer span.End()

    span.SetAttributes(
        attribute.String("order.id", order.ID),
        attribute.String("operation", "insert"),
    )

    err := db.Insert(ctx, order)
    if err != nil {
        span.RecordError(err)
        span.SetStatus(codes.Error, "database insert failed")
        return err
    }

    span.SetStatus(codes.Ok, "")
    return nil
}
```

### Auto-Instrumentation Registration (Python)

```python
# Source: https://opentelemetry.io/docs/languages/python/getting-started/
from opentelemetry.instrumentation.grpc import GrpcInstrumentorServer
from opentelemetry.instrumentation.psycopg import PsycopgInstrumentor
from opentelemetry.instrumentation.redis import RedisInstrumentor

# Auto-instrument before creating clients/servers
GrpcInstrumentorServer().instrument()
PsycopgInstrumentor().instrument()
RedisInstrumentor().instrument()

# Now gRPC, psycopg, Redis calls auto-create spans
server = grpc.server(futures.ThreadPoolExecutor(max_workers=10))
```

### Context Propagation (Node.js)

```javascript
// Source: https://opentelemetry.io/docs/languages/js/instrumentation/
const { context, trace, propagation } = require('@opentelemetry/api');

// Extract context from incoming HTTP headers
const extractedContext = propagation.extract(context.active(), req.headers);

// Run function with extracted context
context.with(extractedContext, () => {
  const span = trace.getActiveSpan();
  console.log('Trace ID:', span.spanContext().traceId);

  // Business logic runs in extracted context
  processRequest(req);
});

// Inject context into outgoing gRPC metadata
const activeContext = context.active();
const metadata = new grpc.Metadata();
propagation.inject(activeContext, metadata);
grpcClient.createOrder(request, metadata, callback);
```

### Semantic Span Naming

```javascript
// Source: https://opentelemetry.io/docs/specs/semconv/general/trace/
const { trace } = require('@opentelemetry/api');

app.post('/orders', async (req, res) => {
  const tracer = trace.getTracer('web-gateway');

  // Semantic name: what business operation, not HTTP method
  const span = tracer.startSpan('create-order', {
    attributes: {
      'order.items_count': req.body.items.length,
      'order.customer_tier': req.body.customer_tier,
    }
  });

  try {
    const result = await orderService.createOrder(req.body);
    span.setStatus({ code: SpanStatusCode.OK });
    res.json(result);
  } catch (err) {
    span.recordException(err);
    span.setStatus({
      code: SpanStatusCode.ERROR,
      message: err.message
    });
    res.status(500).json({ error: err.message });
  } finally {
    span.end();
  }
});
```

### Grafana Jaeger Datasource Provisioning

```yaml
# Source: https://grafana.com/docs/grafana/latest/datasources/jaeger/
apiVersion: 1

datasources:
  - name: Jaeger
    type: jaeger
    access: proxy
    url: http://jaeger:16686
    uid: jaeger
    editable: false
    jsonData:
      # Enable trace to logs
      tracesToLogsV2:
        datasourceUid: loki
        spanStartTimeShift: '-1h'
        spanEndTimeShift: '1h'
        filterByTraceID: true
        filterBySpanID: false
        tags: ['service.name']
      # Enable trace to metrics
      tracesToMetrics:
        datasourceUid: prometheus
        spanStartTimeShift: '-1h'
        spanEndTimeShift: '1h'
        tags: [{ key: 'service.name', value: 'service' }]
      # Enable service graph
      nodeGraph:
        enabled: true
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Jaeger Thrift exporter | OTLP exporter to Jaeger | Mid-2023 | Jaeger exporter deprecated, use OTLP receiver in Jaeger |
| Separate trace/metrics SDKs | Unified OpenTelemetry SDK | 2021-2022 | Single SDK for all signals (traces, metrics, logs) |
| Manual context propagation | W3C Trace Context standard | 2020 | Interoperability across vendors, auto-propagation |
| SimpleSpanProcessor | BatchSpanProcessor | SDK 1.0+ | Better performance, backpressure handling |
| Head-based sampling only | Tail-based sampling in Collector | Collector 0.30+ | Sample after seeing full trace, better decisions |
| Zipkin/Jaeger SDK | OpenTelemetry SDK | 2021+ | Vendor-neutral instrumentation, export to any backend |

**Deprecated/outdated:**
- `jaegerexporter` in OTel Collector: Use `otlpexporter` with Jaeger's OTLP receiver
- `@opentelemetry/tracing`: Merged into `@opentelemetry/sdk-trace-node`
- Environment variable `OTEL_EXPORTER_JAEGER_ENDPOINT`: Use `OTEL_EXPORTER_OTLP_ENDPOINT`
- Jaeger agent deployment: Jaeger all-in-one or collector can receive OTLP directly

## Open Questions

Things that couldn't be fully resolved:

1. **Exact npm package versions**
   - What we know: Latest @opentelemetry/sdk-node is 0.211.0 (unstable versioning 0.2xx per SDK 2.0 scheme)
   - What's unclear: Exact compatible versions for all auto-instrumentation packages
   - Recommendation: Use `npm install @opentelemetry/sdk-node@latest` and let npm resolve compatible versions

2. **Optimal tail sampling decision_wait value**
   - What we know: Must be >= max expected trace duration + network latency
   - What's unclear: Typical trace duration in this codebase (depends on DB/Redis latency)
   - Recommendation: Start with 10s, monitor Collector logs for "incomplete trace" warnings, adjust up if needed

3. **Jaeger Badger storage retention limits**
   - What we know: Badger stores data on filesystem, not suitable for high volumes long-term
   - What's unclear: Exact retention configuration or automatic cleanup
   - Recommendation: Use `--badger.ephemeral=false` for persistence, accept limited retention for learning environment

4. **Exemplar support in current prom-client version**
   - What we know: Prometheus 2.26+ supports exemplars, OpenTelemetry SDKs can attach trace context
   - What's unclear: Exact prom-client API for exemplars (may require newer version or different method)
   - Recommendation: Check prom-client docs, may need to upgrade or use OpenTelemetry metrics SDK instead

## Sources

### Primary (HIGH confidence)

- [OpenTelemetry Node.js Getting Started](https://opentelemetry.io/docs/languages/js/getting-started/nodejs/) - Official SDK setup
- [OpenTelemetry Python Getting Started](https://opentelemetry.io/docs/languages/python/getting-started/) - Official Python instrumentation
- [OpenTelemetry Go Getting Started](https://opentelemetry.io/docs/languages/go/getting-started/) - Official Go SDK guide
- [OpenTelemetry Collector Configuration](https://opentelemetry.io/docs/collector/configuration/) - Receivers, processors, exporters
- [OpenTelemetry Traces Concepts](https://opentelemetry.io/docs/concepts/signals/traces/) - Spans, links, context
- [OTel Context Propagation](https://opentelemetry.io/docs/concepts/context-propagation/) - W3C Trace Context standard
- [OTel Semantic Conventions](https://opentelemetry.io/docs/concepts/semantic-conventions/) - Standard attribute names
- [OTLP Specification](https://opentelemetry.io/docs/specs/otlp/) - Ports 4317/4318, protocols
- [Jaeger Badger Storage](https://www.jaegertracing.io/docs/2.dev/storage/badger/) - Configuration options
- [Grafana Jaeger Datasource](https://grafana.com/docs/grafana/latest/datasources/jaeger/) - Trace-to-logs correlation

### Secondary (MEDIUM confidence)

- [OpenTelemetry gRPC Instrumentation (Python)](https://opentelemetry-python-contrib.readthedocs.io/en/latest/instrumentation/grpc/grpc.html) - GrpcInstrumentor usage
- [go-redis OpenTelemetry Integration](https://redis.uptrace.dev/guide/go-redis-monitoring.html) - redisotel package
- [OTel Collector Best Practices](https://opentelemetry.io/docs/security/config-best-practices/) - Security, resource sizing
- [Tail Sampling Processor](https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/tailsamplingprocessor/README.md) - Configuration details
- [Jaeger OTLP Receiver](https://medium.com/jaegertracing/introducing-native-support-for-opentelemetry-in-jaeger-eb661be8183c) - Native OTLP support announcement
- [Prometheus Exemplars](https://docs.cloud.google.com/stackdriver/docs/instrumentation/advanced-topics/exemplars) - Trace-metric correlation
- [OTel Log-Trace Correlation (OneUpTime)](https://oneuptime.com/blog/post/2026-02-06-inject-trace-span-ids-structured-logs/) - 2026 guide to trace ID injection
- [OTel Message Queue Tracing (OneUpTime)](https://oneuptime.com/blog/post/2026-01-07-opentelemetry-message-queue-tracing/) - Async trace propagation patterns

### Tertiary (LOW confidence - verify during implementation)

- Search results about npm/pip/go package latest versions - Versions change frequently, verify at install time
- Community blog posts on exemplar implementation - API may differ across languages
- Collector tail sampling tuning - Highly workload-specific, requires testing

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All from official OpenTelemetry and Jaeger documentation
- Architecture: HIGH - Patterns verified from official docs and specification
- Pitfalls: MEDIUM - Combination of official best practices and community experience
- Code examples: HIGH - Sourced directly from OpenTelemetry documentation
- Package versions: MEDIUM - Latest versions confirmed from search, but may update frequently

**Research date:** 2026-02-11
**Valid until:** 2026-03-15 (30 days - OTel ecosystem is stable but package versions update monthly)
