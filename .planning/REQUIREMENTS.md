# Requirements: Observability & Pipelines Learning Sandbox

**Defined:** 2026-02-05
**Core Value:** Remove the setup tax so learning happens immediately. Services already exist and misbehave. Tools are pre-wired. You just learn.

## v1 Requirements

### Foundation

- [ ] **FOUND-01**: Learner can start the entire core environment with a single `docker compose up` command
- [ ] **FOUND-02**: Environment includes at least 3 pre-built microservices in different languages (Python, Node.js, Go)
- [ ] **FOUND-03**: Services communicate with each other via HTTP/gRPC to simulate real inter-service traffic
- [ ] **FOUND-04**: Environment includes PostgreSQL and Redis as backing data stores
- [ ] **FOUND-05**: Nginx reverse proxy routes traffic to application services
- [ ] **FOUND-06**: Automated traffic generator produces continuous realistic requests without manual intervention
- [ ] **FOUND-07**: Docker Compose profiles allow enabling/disabling modules (core, tracing, kafka, cicd, full)
- [ ] **FOUND-08**: All Docker images use pinned versions (no `latest` tags)
- [ ] **FOUND-09**: Resource limits are set on all containers to stay within 12GB RAM budget
- [ ] **FOUND-10**: Health check / smoke test script verifies all services are running correctly

### Metrics

- [ ] **METR-01**: Prometheus scrapes metrics from all application services via /metrics endpoints
- [ ] **METR-02**: Grafana launches with pre-provisioned datasources (Prometheus, Loki, Jaeger) on first boot
- [ ] **METR-03**: Grafana includes pre-built dashboards showing service health, request rates, error rates, and latency
- [ ] **METR-04**: cAdvisor exposes per-container resource usage (CPU, memory) to Prometheus
- [ ] **METR-05**: Node Exporter exposes host-level metrics (CPU, memory, disk) to Prometheus
- [ ] **METR-06**: Dashboards show data within 60 seconds of environment startup

### Logging

- [ ] **LOGG-01**: Loki receives and stores logs from all application services
- [ ] **LOGG-02**: Promtail automatically discovers and ships container logs to Loki
- [ ] **LOGG-03**: Learner can search and filter logs across all services from Grafana
- [ ] **LOGG-04**: Logs are labeled by service name, enabling per-service filtering
- [ ] **LOGG-05**: Docker log rotation is configured to prevent disk exhaustion (max-size, max-file)
- [ ] **LOGG-06**: Loki retention is set to 3-7 days to manage storage

### Alerting

- [ ] **ALRT-01**: Alertmanager receives alerts from Prometheus
- [ ] **ALRT-02**: Pre-configured alert rules detect common issues (high error rate, high latency, service down)
- [ ] **ALRT-03**: Alerts fire and are visible in both Alertmanager UI and Grafana
- [ ] **ALRT-04**: Alertmanager groups, deduplicates, and routes alerts
- [ ] **ALRT-05**: Learner can view alert history and current firing alerts

### Distributed Tracing

- [ ] **TRAC-01**: Jaeger receives and stores distributed traces
- [ ] **TRAC-02**: OpenTelemetry Collector receives traces from services and forwards to Jaeger
- [ ] **TRAC-03**: All application services are instrumented with OpenTelemetry SDKs
- [ ] **TRAC-04**: Traces show the full request path across multiple services
- [ ] **TRAC-05**: Learner can view trace timelines and service dependency graphs in Jaeger UI
- [ ] **TRAC-06**: Grafana links to Jaeger traces from dashboard panels

### Chaos Engineering

- [ ] **CAOS-01**: Each application service exposes chaos control endpoints (slow, error, crash, reset)
- [ ] **CAOS-02**: Chaos scenarios include: slow database queries, service crashes, memory pressure, network latency
- [ ] **CAOS-03**: Chaos can be triggered via shell scripts or HTTP calls
- [ ] **CAOS-04**: Chaos effects are visible in metrics, logs, and traces
- [ ] **CAOS-05**: Services recover to normal after chaos is disabled via reset endpoint
- [ ] **CAOS-06**: Each chaos scenario has a before/after comparison reference

### Event Streaming

- [ ] **STRM-01**: Apache Kafka runs in KRaft mode (no Zookeeper) using the native GraalVM image
- [ ] **STRM-02**: Kafka UI provides visual topic management, consumer monitoring, and test message publishing
- [ ] **STRM-03**: At least one service produces messages to Kafka topics
- [ ] **STRM-04**: At least one service consumes messages from Kafka topics
- [ ] **STRM-05**: Kafka metrics are scraped by Prometheus and visible in Grafana
- [ ] **STRM-06**: Kafka module activates via Docker Compose profile without affecting core stack

### CI/CD Pipelines

- [ ] **CICD-01**: Gitea provides a self-hosted Git server accessible via web UI
- [ ] **CICD-02**: Drone CI integrates with Gitea for automated pipeline execution
- [ ] **CICD-03**: Example pipeline builds, tests, and deploys an application service
- [ ] **CICD-04**: Pipeline execution is visible in Drone CI dashboard
- [ ] **CICD-05**: CI/CD module activates via Docker Compose profile without affecting core stack

### Data Pipelines

- [ ] **DATA-01**: At least one ETL workflow example demonstrates data extraction, transformation, and loading
- [ ] **DATA-02**: Data pipeline results are observable through the monitoring stack
- [ ] **DATA-03**: Data pipeline patterns are documented with explanations of when to use each

### Curriculum

- [ ] **CURR-01**: Guided lessons cover metrics fundamentals (what metrics are, why they matter, how to read them)
- [ ] **CURR-02**: Guided lessons cover logging fundamentals (centralized logging, searching, filtering, correlation)
- [ ] **CURR-03**: Guided lessons cover alerting fundamentals (when to alert, alert design, routing)
- [ ] **CURR-04**: Guided lessons cover distributed tracing (what traces show, reading waterfall diagrams)
- [ ] **CURR-05**: Guided lessons cover event streaming (producers, consumers, topics, monitoring)
- [ ] **CURR-06**: Guided lessons cover CI/CD pipelines (build, test, deploy cycles)
- [ ] **CURR-07**: Each lesson explains the concept first, then demonstrates with the sandbox tools
- [ ] **CURR-08**: Each lesson includes hands-on exercises the learner completes in the sandbox
- [ ] **CURR-09**: Lessons progress from guided to increasingly independent
- [ ] **CURR-10**: Solutions are provided for all exercises

### Diagnostic Challenges

- [ ] **DIAG-01**: Scenario-based challenges present a broken/degraded system to diagnose
- [ ] **DIAG-02**: Challenges increase in difficulty (single service issues → cross-service issues → subtle degradation)
- [ ] **DIAG-03**: Each challenge has hints available if the learner is stuck
- [ ] **DIAG-04**: Each challenge has a detailed solution with the diagnostic reasoning explained

### Interview Preparation

- [ ] **INTV-01**: Interview prep scenarios cover common observability interview questions
- [ ] **INTV-02**: Scenarios include "explain what you see in this dashboard" exercises
- [ ] **INTV-03**: Scenarios include "how would you diagnose this issue" exercises
- [ ] **INTV-04**: Each scenario includes example answers and discussion points

## v2 Requirements

### Advanced Modules

- **ADV-01**: Kubernetes deployment module for learning container orchestration
- **ADV-02**: "Instrument your own app" lesson for custom application monitoring
- **ADV-03**: Incident response / runbook exercises with simulated on-call scenarios
- **ADV-04**: Cloud provider comparison guides (how concepts map to AWS CloudWatch, GCP Monitoring, etc.)

## Out of Scope

| Feature | Reason |
|---------|--------|
| Kubernetes in v1 | Adds orchestration complexity that distracts from observability learning; needs more RAM |
| Cloud provider integration | Requires accounts, costs money; concepts transfer from local learning |
| Full ELK stack | Elasticsearch needs 2-4GB RAM alone; Loki provides same concepts at 10x less cost |
| Production-grade HA setup | Multi-replica setups strain 12GB VM; learn single-instance first |
| Real-time WebSocket dashboards | Grafana auto-refresh at 5-10 second intervals is sufficient |
| Mobile/web frontend | Focus is backend observability and pipelines |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| FOUND-01 | Phase 1 | Pending |
| FOUND-02 | Phase 1 | Pending |
| FOUND-03 | Phase 1 | Pending |
| FOUND-04 | Phase 1 | Pending |
| FOUND-05 | Phase 1 | Pending |
| FOUND-06 | Phase 1 | Pending |
| FOUND-07 | Phase 1 | Pending |
| FOUND-08 | Phase 1 | Pending |
| FOUND-09 | Phase 1 | Pending |
| FOUND-10 | Phase 1 | Pending |
| METR-01 | Phase 2 | Pending |
| METR-02 | Phase 2 | Pending |
| METR-03 | Phase 2 | Pending |
| METR-04 | Phase 2 | Pending |
| METR-05 | Phase 2 | Pending |
| METR-06 | Phase 2 | Pending |
| LOGG-01 | Phase 3 | Pending |
| LOGG-02 | Phase 3 | Pending |
| LOGG-03 | Phase 3 | Pending |
| LOGG-04 | Phase 3 | Pending |
| LOGG-05 | Phase 3 | Pending |
| LOGG-06 | Phase 3 | Pending |
| ALRT-01 | Phase 4 | Pending |
| ALRT-02 | Phase 4 | Pending |
| ALRT-03 | Phase 4 | Pending |
| ALRT-04 | Phase 4 | Pending |
| ALRT-05 | Phase 4 | Pending |
| TRAC-01 | Phase 5 | Pending |
| TRAC-02 | Phase 5 | Pending |
| TRAC-03 | Phase 5 | Pending |
| TRAC-04 | Phase 5 | Pending |
| TRAC-05 | Phase 5 | Pending |
| TRAC-06 | Phase 5 | Pending |
| CAOS-01 | Phase 6 | Pending |
| CAOS-02 | Phase 6 | Pending |
| CAOS-03 | Phase 6 | Pending |
| CAOS-04 | Phase 6 | Pending |
| CAOS-05 | Phase 6 | Pending |
| CAOS-06 | Phase 6 | Pending |
| STRM-01 | Phase 7 | Pending |
| STRM-02 | Phase 7 | Pending |
| STRM-03 | Phase 7 | Pending |
| STRM-04 | Phase 7 | Pending |
| STRM-05 | Phase 7 | Pending |
| STRM-06 | Phase 7 | Pending |
| CICD-01 | Phase 8 | Pending |
| CICD-02 | Phase 8 | Pending |
| CICD-03 | Phase 8 | Pending |
| CICD-04 | Phase 8 | Pending |
| CICD-05 | Phase 8 | Pending |
| DATA-01 | Phase 9 | Pending |
| DATA-02 | Phase 9 | Pending |
| DATA-03 | Phase 9 | Pending |
| CURR-01 | Phase 10 | Pending |
| CURR-02 | Phase 10 | Pending |
| CURR-03 | Phase 10 | Pending |
| CURR-04 | Phase 10 | Pending |
| CURR-05 | Phase 10 | Pending |
| CURR-06 | Phase 10 | Pending |
| CURR-07 | Phase 10 | Pending |
| CURR-08 | Phase 10 | Pending |
| CURR-09 | Phase 10 | Pending |
| CURR-10 | Phase 10 | Pending |
| DIAG-01 | Phase 11 | Pending |
| DIAG-02 | Phase 11 | Pending |
| DIAG-03 | Phase 11 | Pending |
| DIAG-04 | Phase 11 | Pending |
| INTV-01 | Phase 12 | Pending |
| INTV-02 | Phase 12 | Pending |
| INTV-03 | Phase 12 | Pending |
| INTV-04 | Phase 12 | Pending |

**Coverage:**
- v1 requirements: 62 total
- Mapped to phases: 62
- Unmapped: 0

---
*Requirements defined: 2026-02-05*
*Last updated: 2026-02-05 after initial definition*
