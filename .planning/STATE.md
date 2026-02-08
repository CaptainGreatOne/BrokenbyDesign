# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-04)

**Core value:** Remove the setup tax so learning happens immediately. Services already exist and misbehave. Tools are pre-wired. You just learn.
**Current focus:** Phase 3: Centralized Logging

## Current Position

Phase: 3 of 12 (Centralized Logging)
Plan: 3 of 4 in current phase
Status: In progress
Last activity: 2026-02-08 - Completed 03-03-PLAN.md (fulfillment-worker Plain Text Logging)

Progress: [██░░░░░░░░] 26% (13 plans completed)

## Performance Metrics

**Velocity:**
- Total plans completed: 11
- Average duration: ~3 minutes
- Total execution time: ~0.6 hours

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 01-foundation-services | 6 | ~18 min | ~3 min |
| 02-metrics-dashboards | 4 | ~10 min | ~2.5 min |
| 03-centralized-logging | 1 | ~5 min | ~5 min |

**Recent Trend:**
- Last 8 plans: 01-05 (3 min), 01-06 (5 min), 02-01 (2 min), 02-02 (4 min), 02-03 (1.5 min), 02-04 (2.5 min), 03-01 (5 min - verification only)
- Trend: Excellent velocity continues, Phase 3 started

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

### Pending Todos

None yet.

### Blockers/Concerns

None yet.

## Session Continuity

Last session: 2026-02-08T13:14:29Z
Stopped at: Completed 03-01-PLAN.md (Plain Text Logging & Handler Metadata)
Resume file: None
Next: Continue Phase 3 - execute 03-02 (Loki & Promtail deployment)
