"""OpenTelemetry SDK initialization for order-api service.

IMPORTANT: This module must be imported BEFORE grpc, psycopg, or redis
are imported so auto-instrumentation hooks can be registered.
"""

from opentelemetry import trace
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor
from opentelemetry.sdk.resources import Resource
from opentelemetry.exporter.otlp.proto.http.trace_exporter import OTLPSpanExporter
from opentelemetry.instrumentation.grpc import GrpcInstrumentorServer
from opentelemetry.instrumentation.psycopg import PsycopgInstrumentor
from opentelemetry.instrumentation.redis import RedisInstrumentor
from opentelemetry.instrumentation.logging import LoggingInstrumentor
import os


def init_tracing(service_name: str = "order-api"):
    """Initialize OpenTelemetry tracing with auto-instrumentation.

    Args:
        service_name: Name of this service for trace identification
    """
    endpoint = os.getenv(
        "OTEL_EXPORTER_OTLP_ENDPOINT",
        "http://otel-collector:4318/v1/traces"
    )

    resource = Resource.create({"service.name": service_name})

    provider = TracerProvider(resource=resource)
    processor = BatchSpanProcessor(
        OTLPSpanExporter(endpoint=endpoint)
    )
    provider.add_span_processor(processor)
    trace.set_tracer_provider(provider)

    # Auto-instrument gRPC server (captures incoming RPCs, extracts W3C trace context from metadata)
    GrpcInstrumentorServer().instrument()

    # Auto-instrument psycopg3 (captures SQL queries as spans)
    PsycopgInstrumentor().instrument()

    # Auto-instrument redis-py (captures Redis commands as spans)
    RedisInstrumentor().instrument()

    # Auto-inject trace context into Python logging records
    # This adds otelTraceID, otelSpanID, otelServiceName to LogRecords
    LoggingInstrumentor().instrument(set_logging_format=True)

    print(f"OpenTelemetry SDK initialized for {service_name}")

    return provider
