"""Prometheus metrics configuration for order-api service."""

from prometheus_client import Counter, Histogram, start_http_server

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


def start_metrics_server(port=8000):
    """
    Start the Prometheus metrics HTTP server.

    The prometheus_client.start_http_server() runs a simple HTTP server
    in a daemon thread that automatically serves metrics at /metrics.

    Args:
        port: Port number for the metrics HTTP server (default: 8000)
    """
    start_http_server(port)
