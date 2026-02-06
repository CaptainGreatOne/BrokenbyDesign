# Roadmap: Observability & Pipelines Learning Sandbox

## Overview

This roadmap builds a complete, modular learning environment for observability and data pipelines. Starting with foundation services and progressing through the three pillars of observability (metrics, logging, tracing), we layer in chaos engineering, event streaming, CI/CD, and data pipelines. The journey concludes with curated curriculum and diagnostic challenges that synthesize all concepts. Each phase delivers a complete, verifiable capability that builds on previous work.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [x] **Phase 1: Foundation Services** - Pre-built polyglot microservices with automated traffic and one-command startup
- [ ] **Phase 2: Metrics & Dashboards** - Prometheus + Grafana with working dashboards showing service health
- [ ] **Phase 3: Centralized Logging** - Loki + Promtail for aggregated log search across all services
- [ ] **Phase 4: Alerting** - Alertmanager with rules that detect and route common failure patterns
- [ ] **Phase 5: Distributed Tracing** - Jaeger + OpenTelemetry for cross-service request visualization
- [ ] **Phase 6: Chaos Engineering** - Controllable failure injection showing observable impact on metrics/logs/traces
- [ ] **Phase 7: Event Streaming** - Kafka with producers, consumers, and observable message flow
- [ ] **Phase 8: CI/CD Pipelines** - Gitea + Drone for build/test/deploy automation
- [ ] **Phase 9: Data Pipelines** - ETL workflow examples with observable execution
- [ ] **Phase 10: Curriculum** - Guided lessons teaching observability and pipeline concepts
- [ ] **Phase 11: Diagnostic Challenges** - Scenario-based problems requiring full observability toolkit
- [ ] **Phase 12: Interview Preparation** - Interview-style exercises with example answers

## Phase Details

### Phase 1: Foundation Services
**Goal**: Learner can start working application services with realistic traffic using one command
**Depends on**: Nothing (first phase)
**Requirements**: FOUND-01, FOUND-02, FOUND-03, FOUND-04, FOUND-05, FOUND-06, FOUND-07, FOUND-08, FOUND-09, FOUND-10
**Success Criteria** (what must be TRUE):
  1. Running `docker compose up` starts all core services without errors
  2. Three polyglot microservices (Python, Node.js, Go) are running and responding to requests
  3. Services communicate with each other via HTTP/gRPC showing realistic inter-service traffic
  4. PostgreSQL and Redis are accessible to application services
  5. Nginx reverse proxy successfully routes external traffic to application services
  6. Automated traffic generator produces continuous requests without manual intervention
  7. Docker Compose profiles enable/disable module groups (core, tracing, kafka, cicd, full)
  8. All containers stay within 12GB total RAM budget with configured resource limits
  9. Health check script confirms all services are running and healthy
**Plans**: 6 plans

Plans:
- [x] 01-01-PLAN.md -- Project scaffolding, Docker Compose, infra configs, proto contract
- [x] 01-02-PLAN.md -- Order API (Python gRPC server + PostgreSQL + Redis queue)
- [x] 01-03-PLAN.md -- Web Gateway (Node.js REST + gRPC client)
- [x] 01-04-PLAN.md -- Fulfillment Worker (Go Redis queue consumer)
- [x] 01-05-PLAN.md -- Traffic generator + profiles + resource limits
- [x] 01-06-PLAN.md -- Health check script + end-to-end verification

### Phase 2: Metrics & Dashboards
**Goal**: Learner can visualize service health, request rates, errors, and latency in Grafana dashboards
**Depends on**: Phase 1
**Requirements**: METR-01, METR-02, METR-03, METR-04, METR-05, METR-06
**Success Criteria** (what must be TRUE):
  1. Prometheus scrapes metrics from all application services via /metrics endpoints
  2. Grafana launches with pre-configured datasources (Prometheus) automatically on first boot
  3. Pre-built Grafana dashboards show service health, request rates, error rates, and p95/p99 latency
  4. cAdvisor exposes per-container CPU and memory usage visible in Grafana
  5. Node Exporter exposes host-level system metrics visible in Grafana
  6. Dashboards populate with data within 60 seconds of environment startup
**Plans**: 4 plans

Plans:
- [ ] 02-01-PLAN.md -- Instrument web-gateway (Node.js) and order-api (Python) with /metrics endpoints
- [ ] 02-02-PLAN.md -- Instrument fulfillment-worker (Go) with HTTP metrics server + /metrics endpoint
- [ ] 02-03-PLAN.md -- Prometheus + cAdvisor + Node Exporter Docker Compose services
- [ ] 02-04-PLAN.md -- Grafana provisioning with pre-built dashboards

### Phase 3: Centralized Logging
**Goal**: Learner can search and filter logs from all services in one place
**Depends on**: Phase 2
**Requirements**: LOGG-01, LOGG-02, LOGG-03, LOGG-04, LOGG-05, LOGG-06
**Success Criteria** (what must be TRUE):
  1. Loki receives and stores logs from all application services
  2. Promtail automatically discovers container logs and ships them to Loki
  3. Learner can search logs across all services from Grafana Explore interface
  4. Logs are labeled by service name, enabling per-service filtering
  5. Docker log rotation prevents disk exhaustion (max-size and max-file configured)
  6. Loki retention (3-7 days) prevents unbounded storage growth
**Plans**: TBD

Plans:
- [ ] TBD during planning

### Phase 4: Alerting
**Goal**: Learner sees alerts fire when services fail or degrade, and can explore alert history
**Depends on**: Phase 3
**Requirements**: ALRT-01, ALRT-02, ALRT-03, ALRT-04, ALRT-05
**Success Criteria** (what must be TRUE):
  1. Alertmanager receives and displays alerts from Prometheus
  2. Pre-configured alert rules detect high error rate, high latency, and service down conditions
  3. Alerts appear in both Alertmanager UI and Grafana when conditions trigger
  4. Alertmanager groups and deduplicates related alerts
  5. Learner can view current firing alerts and historical alert activity
**Plans**: TBD

Plans:
- [ ] TBD during planning

### Phase 5: Distributed Tracing
**Goal**: Learner can view the complete path of a request across multiple services with timing breakdowns
**Depends on**: Phase 4
**Requirements**: TRAC-01, TRAC-02, TRAC-03, TRAC-04, TRAC-05, TRAC-06
**Success Criteria** (what must be TRUE):
  1. Jaeger backend receives and stores distributed traces
  2. OpenTelemetry Collector receives traces from services and forwards to Jaeger
  3. All application services send traces using OpenTelemetry SDKs
  4. Traces show the full request path across multiple services with parent-child relationships
  5. Learner can view trace timelines (waterfall diagrams) and service dependency graphs in Jaeger UI
  6. Grafana dashboards link to Jaeger traces for correlated exploration
**Plans**: TBD

Plans:
- [ ] TBD during planning

### Phase 6: Chaos Engineering
**Goal**: Learner can inject failures and observe their impact across metrics, logs, and traces
**Depends on**: Phase 5
**Requirements**: CAOS-01, CAOS-02, CAOS-03, CAOS-04, CAOS-05, CAOS-06
**Success Criteria** (what must be TRUE):
  1. Each application service exposes chaos control endpoints (slow, error, crash, reset)
  2. Chaos scenarios include slow database queries, service crashes, memory pressure, and network latency
  3. Chaos can be triggered via shell scripts or direct HTTP calls
  4. Chaos effects are immediately visible in Prometheus metrics, Loki logs, and Jaeger traces
  5. Services return to normal behavior after chaos reset endpoint is called
  6. Each chaos scenario has documented before/after comparison showing observable differences
**Plans**: TBD

Plans:
- [ ] TBD during planning

### Phase 7: Event Streaming
**Goal**: Learner can observe asynchronous message flow through Kafka topics with producer/consumer monitoring
**Depends on**: Phase 6
**Requirements**: STRM-01, STRM-02, STRM-03, STRM-04, STRM-05, STRM-06
**Success Criteria** (what must be TRUE):
  1. Kafka runs in KRaft mode using the native GraalVM image (no Zookeeper)
  2. Kafka UI provides visual topic management, consumer lag monitoring, and test message publishing
  3. At least one service produces messages to Kafka topics
  4. At least one service consumes messages from Kafka topics
  5. Kafka metrics (throughput, lag, errors) are scraped by Prometheus and visible in Grafana
  6. Kafka module activates via Docker Compose profile without impacting core stack
**Plans**: TBD

Plans:
- [ ] TBD during planning

### Phase 8: CI/CD Pipelines
**Goal**: Learner can push code to Git, watch automated builds, and see deployment results
**Depends on**: Phase 7
**Requirements**: CICD-01, CICD-02, CICD-03, CICD-04, CICD-05
**Success Criteria** (what must be TRUE):
  1. Gitea provides a self-hosted Git server accessible via web UI
  2. Drone CI integrates with Gitea for automated pipeline triggering
  3. Example pipeline builds, tests, and deploys an application service
  4. Pipeline execution status and logs are visible in Drone CI dashboard
  5. CI/CD module activates via Docker Compose profile without impacting core stack
**Plans**: TBD

Plans:
- [ ] TBD during planning

### Phase 9: Data Pipelines
**Goal**: Learner can execute ETL workflows and observe their execution through the monitoring stack
**Depends on**: Phase 8
**Requirements**: DATA-01, DATA-02, DATA-03
**Success Criteria** (what must be TRUE):
  1. At least one ETL workflow demonstrates data extraction, transformation, and loading
  2. Data pipeline execution is observable through metrics, logs, and traces
  3. Documentation explains different pipeline patterns and when to use each
**Plans**: TBD

Plans:
- [ ] TBD during planning

### Phase 10: Curriculum
**Goal**: Learner can follow structured lessons that teach observability and pipeline concepts using the sandbox
**Depends on**: Phase 9
**Requirements**: CURR-01, CURR-02, CURR-03, CURR-04, CURR-05, CURR-06, CURR-07, CURR-08, CURR-09, CURR-10
**Success Criteria** (what must be TRUE):
  1. Guided lessons cover metrics fundamentals (what metrics are, why they matter, how to read them)
  2. Guided lessons cover logging fundamentals (centralized logging, searching, correlation)
  3. Guided lessons cover alerting fundamentals (when to alert, alert design, routing)
  4. Guided lessons cover distributed tracing (what traces show, reading waterfall diagrams)
  5. Guided lessons cover event streaming (producers, consumers, topics, monitoring)
  6. Guided lessons cover CI/CD pipelines (build, test, deploy cycles)
  7. Each lesson explains the concept first, then demonstrates with sandbox tools
  8. Each lesson includes hands-on exercises the learner completes in the sandbox
  9. Lessons progress from guided (step-by-step) to independent (challenge-based)
  10. Solutions are provided for all exercises
**Plans**: TBD

Plans:
- [ ] TBD during planning

### Phase 11: Diagnostic Challenges
**Goal**: Learner can diagnose increasingly complex production-like issues using the full observability toolkit
**Depends on**: Phase 10
**Requirements**: DIAG-01, DIAG-02, DIAG-03, DIAG-04
**Success Criteria** (what must be TRUE):
  1. Scenario-based challenges present a broken or degraded system to diagnose
  2. Challenges increase in difficulty from single-service issues to cross-service issues to subtle degradation
  3. Each challenge has hints available if the learner is stuck
  4. Each challenge has a detailed solution with the diagnostic reasoning explained
**Plans**: TBD

Plans:
- [ ] TBD during planning

### Phase 12: Interview Preparation
**Goal**: Learner can answer common observability interview questions and demonstrate diagnostic reasoning
**Depends on**: Phase 11
**Requirements**: INTV-01, INTV-02, INTV-03, INTV-04
**Success Criteria** (what must be TRUE):
  1. Interview prep scenarios cover common observability interview questions
  2. Scenarios include "explain what you see in this dashboard" exercises
  3. Scenarios include "how would you diagnose this issue" exercises
  4. Each scenario includes example answers and discussion points
**Plans**: TBD

Plans:
- [ ] TBD during planning

## Progress

**Execution Order:**
Phases execute in numeric order: 1 -> 2 -> 3 -> 4 -> 5 -> 6 -> 7 -> 8 -> 9 -> 10 -> 11 -> 12

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Foundation Services | 6/6 | Complete | 2026-02-06 |
| 2. Metrics & Dashboards | 0/4 | Planning complete | - |
| 3. Centralized Logging | 0/TBD | Not started | - |
| 4. Alerting | 0/TBD | Not started | - |
| 5. Distributed Tracing | 0/TBD | Not started | - |
| 6. Chaos Engineering | 0/TBD | Not started | - |
| 7. Event Streaming | 0/TBD | Not started | - |
| 8. CI/CD Pipelines | 0/TBD | Not started | - |
| 9. Data Pipelines | 0/TBD | Not started | - |
| 10. Curriculum | 0/TBD | Not started | - |
| 11. Diagnostic Challenges | 0/TBD | Not started | - |
| 12. Interview Preparation | 0/TBD | Not started | - |
