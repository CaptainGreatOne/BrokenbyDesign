# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-04)

**Core value:** Remove the setup tax so learning happens immediately. Services already exist and misbehave. Tools are pre-wired. You just learn.
**Current focus:** Phase 5: Distributed Tracing

## Current Position

Phase: 5 of 12 (Distributed Tracing)
Plan: 1 of 5 in current phase
Status: In progress
Last activity: 2026-02-12 - Completed 05-01-PLAN.md (Deploy Trace Backend)

Progress: [█████░░░░░] 67% (18 plans completed)

## Performance Metrics

**Velocity:**
- Total plans completed: 18
- Average duration: ~3.0 minutes
- Total execution time: ~0.96 hours

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 01-foundation-services | 6 | ~18 min | ~3 min |
| 02-metrics-dashboards | 4 | ~10 min | ~2.5 min |
| 03-centralized-logging | 4 | ~10.8 min | ~2.7 min |
| 04-alerting | 3 | ~18.5 min | ~6.2 min |
| 05-distributed-tracing | 1 | ~2 min | ~2 min |

**Recent Trend:**
- Last 8 plans: 03-02 (2.3 min), 03-03 (1.5 min), 03-04 (2 min), 04-01 (4.7 min), 04-02 (3 min), 04-03 (10.8 min), 05-01 (2 min)
- Trend: Phase 5 started, 05-01 completed quickly (simple config + Docker Compose changes)

*Updated after each plan completion*

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- Docker over Kubernetes: Simpler to run locally, K8s is orchestration not observability
- Pre-built services over tutorials: Eliminates setup tax, learner focuses on observability
- Modular architecture: Allows starting small on limited resources, scaling up
- Standard stack first: Prometheus/Grafana/ELK are industry standards, interview-relevant
- Resource budget ~5GB core services: Leaves ~7GB for profile services (tracing, kafka, cicd)
- Use prom-client for Node.js and prometheus-client for Python: Official Prometheus client libraries with standard patterns
- Histogram buckets [0.001, 0.01, 0.1, 0.5, 1, 2, 5]: Cover 1ms to 5s latency range for typical microservice performance
- Separate metrics port for order-api: Port 8000 for metrics HTTP server, separate from gRPC on 50051
- Use promauto for Go metrics registration: Automatic default registry registration includes Go runtime metrics
- Port 2112 for Go metrics: Conventional Prometheus port for Go services
- Metrics server as goroutine: HTTP server runs alongside queue consumer without blocking
- cAdvisor port 8081: Mapped to avoid conflict with internal 8080
- Node Exporter with --path.rootfs=/host: Preserves Docker DNS while providing host metrics
- Prometheus retention 7d/5GB: Balances learning usage with storage constraints
- Service health orchestration: Prometheus depends on service_healthy for all app services
- Grafana port 3001: Avoids confusion with web-gateway internal port 3000
- Grafana datasource uid 'prometheus': Stable reference for dashboards, supports future Loki/Jaeger datasources
- Service Overview as default home dashboard: Learner sees value immediately on first login
- Grafana provisioning for multi-datasource: Directory structure supports adding Loki (Phase 3) and Jaeger (Phase 5) without modification
- Plain text over JSON for logs: Loki's human-readable log browsing benefits from plain text format
- Handler metadata pattern: Every logger call includes handler field for component identification and filtering
- Probabilistic error simulation: 2-5% chance of realistic WARN/ERROR logs without breaking functionality
- Log ID field priority: order_id → req_id → correlation_id extraction for consistent filtering
- Handler as first-class parameter in Go: Makes handler explicit in function signature for clearer API and reliable parsing
- Item ID format in Go logs: Use "item=id" prefix to distinguish from correlation IDs, semantic clarity for filtering
- Alloy over Promtail: Grafana's unified agent for logs, metrics, and traces
- Service filtering in Alloy: Only collect from 3 application services to reduce noise
- Loki monolithic mode: Simpler deployment for local learning environment
- 72h retention: Balances learning exploration with storage constraints
- Docker socket access for Alloy: Enables automatic container discovery
- Service health gauge pattern: Gauge initialized to 1 at startup, updated by health endpoint for degraded service detection
- Gauge persists value: Set once at startup, remains 1 unless explicitly changed, enabling ServiceUnhealthy vs InstanceDown distinction
- Flask for webhook receivers with gunicorn: Production-ready Python server for Alertmanager webhooks
- In-memory alert storage with FIFO: Max 100 for webhook-receiver, 200 for mock Slack UI
- Thread-safe alert storage: threading.Lock for concurrent webhook access
- Webhook receiver port 5001: Avoids Flask dev server default 5000 conflicts
- Mock Slack UI port 8080: Standard HTTP port for notification UI
- Mock Slack receives webhooks directly: Teaches full webhook flow without proxying
- Severity color coding: critical=red, warning=orange, info=blue, resolved=green
- Auto-refresh polling: 5-second interval via JavaScript fetch
- PromQL alert rules target HTTP metrics: HighErrorRate and HighLatency use http_requests_total and http_request_duration_seconds_bucket from web-gateway (HTTP entry point)
- ServiceUnhealthy vs InstanceDown distinction: ServiceUnhealthy (service_healthy==0) for degraded services, InstanceDown (up==0) for unreachable services
- Severity-based routing: Critical alerts have faster group_wait (5s vs 10s) and repeat_interval (1h vs 4h)
- Alert grouping by alertname and service: Deduplicates multiple instances of same alert from same service
- Python urllib healthchecks: Use Python's built-in urllib for healthchecks in python:slim containers (wget not available)
- Loki healthcheck disabled: Distroless image has no shell utilities, use service_started dependency condition
- OTLP exporter over deprecated Jaeger exporter: Jaeger natively supports OTLP receiver, OTel Collector exports via OTLP protocol
- Tail sampling before batch in Collector: Sampling decisions made on complete traces before batching for efficiency
- 100% probabilistic sampling in dev: All traces sampled for learning visibility, production would use 10% or lower
- Badger storage with 72h retention: Matches Loki retention for consistency across observability tools
- Tracing profile in Docker Compose: Optional trace infrastructure (~1GB) activated with --profile tracing or --profile full

### Pending Todos

None yet.

### Blockers/Concerns

None yet.

## Session Continuity

Last session: 2026-02-12T04:19:19Z
Stopped at: Completed 05-01-PLAN.md (Deploy Trace Backend)
Resume file: None
Next: Execute 05-02-PLAN.md (Instrument Services)
