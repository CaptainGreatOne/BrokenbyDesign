"""Prometheus metrics configuration for order-api service."""

from prometheus_client import Counter, Histogram, Gauge
from opentelemetry import trace

# gRPC request counter with labels: method, status
grpc_requests_total = Counter(
    'grpc_requests_total',
    'Total number of gRPC requests',
    ['method', 'status']
)

# gRPC request duration histogram with labels: method
# Buckets: 1ms, 10ms, 100ms, 500ms, 1s, 2s, 5s
grpc_request_duration_seconds = Histogram(
    'grpc_request_duration_seconds',
    'Duration of gRPC requests in seconds',
    ['method'],
    buckets=[0.001, 0.01, 0.1, 0.5, 1, 2, 5]
)

# Counter for total orders created (application-specific metric)
orders_created_total = Counter(
    'orders_created_total',
    'Total number of orders created successfully'
)

# Service health gauge: 1=healthy, 0=unhealthy
service_healthy = Gauge(
    'service_healthy',
    'Service health status (1=healthy, 0=unhealthy)'
)


def get_trace_exemplar():
    """Get exemplar dict with current trace ID, or empty dict if no trace context."""
    span = trace.get_current_span()
    span_ctx = span.get_span_context() if span else None
    if span_ctx and span_ctx.is_valid:
        return {"traceID": f"{span_ctx.trace_id:032x}"}
    return {}


# NOTE: start_metrics_server was removed in Phase 6 (chaos engineering).
# Prometheus metrics are now served by the Flask chaos server in chaos.py
# on the same port 8000 alongside /chaos/* endpoints.
