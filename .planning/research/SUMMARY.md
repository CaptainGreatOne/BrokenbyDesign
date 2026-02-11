# Project Research Summary

**Project:** Observability & Pipelines Learning Sandbox
**Domain:** DevOps / Observability / Pipelines Education
**Researched:** 2026-02-05
**Confidence:** HIGH

## Executive Summary

The standard observability stack in 2025-2026 centers on Prometheus (metrics), Loki (logs), and Grafana (visualization) — the PLG stack — complemented by Jaeger or Tempo for distributed tracing and OpenTelemetry for vendor-neutral instrumentation. This "Grafana ecosystem" approach keeps integration simple and resource usage low, which is ideal for a VM-based learning environment. The full core stack (3 app services + observability tools) fits comfortably in ~3-4GB RAM, leaving headroom for Kafka, CI/CD, and growth.

The key architectural decision is modularity via Docker Compose profiles. Rather than a monolithic stack, the environment starts with core services and metrics, then layers in logging, alerting, tracing, streaming, and CI/CD as the learner progresses. This directly addresses the "setup burnout" problem: lesson 1 only starts the services needed for lesson 1.

The primary risks are resource exhaustion (solvable with explicit memory limits and lightweight tool choices), empty dashboard syndrome (solvable with auto-starting traffic generator), and teaching tools instead of concepts (solvable with concept-first lesson design). All are preventable with upfront design decisions.

## Key Findings

### Recommended Stack

The PLG stack (Prometheus + Loki + Grafana) is the de facto standard for self-hosted observability. Loki was chosen over the ELK stack because it uses ~10x less RAM — critical on a 12GB VM. Jaeger provides the best standalone learning UI for distributed tracing. Apache Kafka in KRaft mode (no Zookeeper) handles event streaming with the native GraalVM image using ~50% less memory than the JVM version. Gitea + Drone CI provides lightweight, container-native CI/CD.

**Core technologies:**
- Prometheus + Alertmanager: Metrics collection, storage, and alerting — industry standard
- Loki + Promtail: Log aggregation — lightweight, same label model as Prometheus
- Grafana: Unified visualization for metrics, logs, and traces — interview-essential
- Jaeger + OTel Collector: Distributed tracing with vendor-neutral instrumentation
- Kafka (native): Event streaming — KRaft mode, no Zookeeper dependency
- Gitea + Drone: Self-hosted Git + CI/CD — lightweight, container-native

### Expected Features

**Must have (table stakes):**
- One-command startup (`docker compose up`)
- Pre-built polyglot services (Python, Node, Go)
- Working Grafana dashboards on first boot
- Automated traffic generation
- Curated lesson progression

**Should have (competitive advantage over tutorials):**
- Chaos injection (service failures, slowdowns, bugs)
- Progressive complexity via Docker Compose profiles
- Diagnostic challenges ("find the bottleneck")
- Interview prep scenarios

**Defer (v2+):**
- Kubernetes module
- Data pipeline patterns (ETL)
- Incident response / runbook exercises

### Architecture Approach

A layered architecture with application services at the bottom, telemetry collection in the middle, and visualization at the top. Services communicate via HTTP/gRPC, expose `/metrics` endpoints for Prometheus, write logs to stdout for Promtail, and send traces via OTLP to the OpenTelemetry Collector. Docker Compose profiles enable/disable entire modules (core, tracing, kafka, cicd, full).

**Major components:**
1. Application Layer — 3 polyglot services + traffic generator + chaos controller
2. Data Layer — PostgreSQL, Redis, optional Kafka
3. Telemetry Collection — Prometheus (pull), Promtail (log shipping), OTel Collector (traces)
4. Telemetry Backends — Prometheus TSDB, Loki, Jaeger
5. Visualization — Grafana (unified dashboards), Alertmanager

### Critical Pitfalls

1. **Resource exhaustion** — Set explicit Docker memory limits, use lightweight tool variants (Loki over ELK, Kafka native over JVM)
2. **Setup tax sneaking back** — Pin image versions, use Docker service names not localhost, include smoke test
3. **Empty dashboards** — Auto-start traffic generator, pre-provision Grafana datasources
4. **Teaching tools not concepts** — Structure lessons around questions ("Is my system healthy?"), not tool walkthroughs
5. **Chaos without context** — Establish baselines first, then inject chaos

## Implications for Roadmap

### Phase 1: Foundation Services
**Rationale:** Everything depends on having working application services first
**Delivers:** 3 polyglot microservices + PostgreSQL + Redis + Nginx + traffic generator, all in Docker Compose
**Addresses:** Pre-built services, one-command startup
**Avoids:** Setup tax (services are pre-built and tested)

### Phase 2: Metrics & Dashboards
**Rationale:** Metrics are the first pillar of observability; visual payoff keeps learners engaged
**Delivers:** Prometheus + Grafana with pre-provisioned dashboards, cAdvisor, Node Exporter
**Addresses:** Prometheus metrics, working dashboards
**Avoids:** Empty dashboards (traffic generator ensures data)

### Phase 3: Logging
**Rationale:** Logging is the second pillar; depends on services already running
**Delivers:** Loki + Promtail + Grafana log exploration
**Addresses:** Centralized logging
**Avoids:** Log volume (configure rotation and retention)

### Phase 4: Alerting
**Rationale:** Alerting builds on metrics; needs Prometheus already configured
**Delivers:** Alertmanager + alert rules + Grafana alert panels
**Addresses:** Alert rules that fire
**Avoids:** Alert fatigue (start with meaningful alerts)

### Phase 5: Chaos Engineering
**Rationale:** Must come AFTER learner understands normal behavior from phases 2-4
**Delivers:** Chaos injection endpoints + scenarios (slow DB, crashes, latency)
**Addresses:** Chaos injection, realistic diagnosis
**Avoids:** Chaos without context

### Phase 6: Distributed Tracing
**Rationale:** More advanced concept; requires understanding of cross-service communication
**Delivers:** Jaeger + OpenTelemetry Collector + service instrumentation
**Addresses:** Distributed tracing introduction
**Avoids:** Over-instrumentation

### Phase 7: Event Streaming
**Rationale:** Separate module; requires understanding of async communication patterns
**Delivers:** Kafka (native) + Kafka UI + producer/consumer services + monitoring
**Addresses:** Kafka event streaming
**Avoids:** Resource exhaustion (uses native image)

### Phase 8: CI/CD Pipelines
**Rationale:** Independent module; most value after understanding what to monitor in a pipeline
**Delivers:** Gitea + Drone CI + example pipeline that builds/tests/deploys a service
**Addresses:** CI/CD pipeline learning
**Avoids:** Setup complexity (uses lightweight tools)

### Phase 9: Curriculum & Lessons
**Rationale:** Content creation after infrastructure is stable; lessons reference actual running services
**Delivers:** Guided lessons for each topic + exercises + solutions
**Addresses:** Curated curriculum, guided-to-challenge progression
**Avoids:** Teaching tools instead of concepts

### Phase 10: Diagnostic Challenges
**Rationale:** Capstone; requires all previous phases as building blocks
**Delivers:** Scenario-based challenges with increasing difficulty, interview prep
**Addresses:** Diagnostic challenges, interview confidence
**Avoids:** Shallow learning (forces application of all skills)

### Phase Ordering Rationale

- Phases 1-4 follow the natural dependency chain: services → metrics → logs → alerts
- Phase 5 (chaos) deliberately comes after understanding normal behavior
- Phases 6-8 are relatively independent modules that build on the core
- Phase 9-10 are content phases that reference all infrastructure phases

### Research Flags

Phases likely needing deeper research during planning:
- **Phase 5:** Chaos injection patterns specific to Docker (ChaosOrca or custom)
- **Phase 7:** Kafka + observability integration (tracing through message queues)
- **Phase 8:** Gitea + Drone integration specifics and pipeline YAML format

Phases with standard patterns (skip research-phase):
- **Phase 1:** Standard Docker Compose multi-service setup
- **Phase 2:** Well-documented PLG stack setup
- **Phase 3:** Standard Loki + Promtail configuration
- **Phase 4:** Standard Alertmanager setup

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | PLG stack is well-documented, actively maintained, widely adopted |
| Features | HIGH | Clear feature landscape from comparable tools and tutorials |
| Architecture | HIGH | Docker Compose microservices with observability is a well-established pattern |
| Pitfalls | HIGH | Common issues are well-documented in community posts and official docs |

**Overall confidence:** HIGH

### Gaps to Address

- Exact OTel SDK versions per language (Python, Node, Go) — verify during phase 6 planning
- Drone CI current status and best alternatives — verify during phase 8 planning
- Optimal chaos injection approach for Docker (custom endpoints vs tools) — decide during phase 5 planning

## Sources

### Primary (HIGH confidence)
- [OpenTelemetry Demo](https://opentelemetry.io/docs/demo/docker-deployment/) — Reference architecture, resource requirements
- [Grafana LGTM](https://grafana.com/docs/opentelemetry/docker-lgtm/) — All-in-one observability backend
- [Apache Kafka Docker](https://hub.docker.com/r/apache/kafka) — Official images, KRaft mode
- [Docker Kafka guide](https://docs.docker.com/guides/kafka/) — Official Docker + Kafka documentation

### Secondary (MEDIUM confidence)
- [PLG Stack guide](https://medium.com/@sre999/mastering-the-plg-stack-locally-prometheus-loki-grafana-with-docker-compose-beginner-friendly-c5e2df614378) — Local setup patterns
- [Gitea + Drone CI](https://dev.to/ruanbekker/self-hosted-cicd-with-gitea-and-drone-ci-200l) — Self-hosted CI/CD setup
- [Local CI/CD Lab](https://menraromial.com/blog/2025/master-ci-ci-pipeline-locally/) — Full local DevOps lab
- [Observability + Chaos](https://last9.io/blog/how-to-build-observability-into-chaos-engineering/) — Combining observability with chaos engineering

### Tertiary (LOW confidence)
- [mransbro/observability](https://github.com/mransbro/observability) — Community Docker Compose stack (needs version verification)

---
*Research completed: 2026-02-05*
*Ready for roadmap: yes*
