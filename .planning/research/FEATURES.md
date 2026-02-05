# Feature Research

**Domain:** Observability & Pipelines Learning Sandbox
**Researched:** 2026-02-05
**Confidence:** HIGH

## Feature Landscape

### Table Stakes (Learners Expect These)

Features learners assume exist. Missing these = the sandbox feels incomplete.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| One-command startup | Nobody wants 20 setup steps; `docker compose up` and go | LOW | Critical for defeating "setup burnout" |
| Pre-built application services | The whole point; learners shouldn't write apps | MEDIUM | 3-5 small services that talk to each other |
| Working Grafana dashboards | Visual payoff — see data immediately | MEDIUM | Pre-provisioned datasources and dashboards |
| Prometheus metrics collection | Core observability pillar | LOW | Auto-discovery of service metrics |
| Centralized logging | Core observability pillar | MEDIUM | Logs from all services queryable in one place |
| Alert rules that fire | Alerting is a major learning objective | MEDIUM | Pre-configured alerts that actually trigger |
| Traffic generation | Need data flowing to have anything to observe | MEDIUM | Automated requests so dashboards aren't empty |
| Lesson documentation | Curated learning path, not just tools | HIGH | Step-by-step guides within the repo |

### Differentiators (Better Than Random Tutorials)

Features that make this better than following scattered blog posts.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Chaos injection | Services that break, slow down, have bugs — on demand | MEDIUM | What makes it engaging; realistic diagnosis practice |
| Progressive complexity | Start with metrics only, unlock logging, then tracing | MEDIUM | Modular docker-compose profiles |
| Diagnostic challenges | "Find the bottleneck" — scenario-based exercises | HIGH | Graduate from guided to open-ended |
| Multiple programming languages | Polyglot services show real-world tracing across languages | MEDIUM | Python, Node, Go — demonstrates OTel universality |
| Interview prep scenarios | Specific questions and scenarios from real interviews | HIGH | "Explain what you see in this dashboard" exercises |
| CI/CD pipeline integration | Not just observability — pipelines are a learning objective too | HIGH | Gitea + Drone locally |
| Event streaming with Kafka | Message queues are part of the pipeline skillset | HIGH | Producer/consumer services with monitoring |
| Runbooks / incident response | Practice the human side of observability | MEDIUM | "Alert fired — now what?" guided exercises |

### Anti-Features (Commonly Requested, Often Problematic)

Features that seem good but create problems for this use case.

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| Kubernetes deployment | "Real production uses K8s" | Adds massive complexity, distracts from observability learning, needs more RAM | Docker Compose; add K8s as future advanced module |
| Cloud provider integration | "I need to know AWS CloudWatch" | Requires accounts, costs money, vendor lock-in | Learn concepts locally; cloud tools follow same patterns |
| Full ELK stack | "ELK is the standard" | Elasticsearch needs 2-4GB RAM alone; overkill for learning | Loki provides same concepts at 10x less resource cost |
| Production-grade HA setup | "I want to learn production patterns" | Multi-replica setups strain 12GB VM, adds ops complexity | Learn single-instance first; discuss HA in lessons |
| Custom application building | "I want to build my own app to monitor" | This IS the setup tax being avoided | Pre-built apps; advanced lesson: "instrument your own" |
| Real-time streaming dashboards | "Everything should update live" | Adds WebSocket complexity, refresh intervals are fine | Grafana auto-refresh at 5-10 second intervals |

## Feature Dependencies

```
[One-command startup]
    └──requires──> [Pre-built services]
                       └──requires──> [Docker Compose config]

[Working dashboards]
    └──requires──> [Prometheus metrics]
    └──requires──> [Centralized logging]

[Chaos injection]
    └──requires──> [Pre-built services]
    └──requires──> [Working dashboards] (to observe the chaos)

[Diagnostic challenges]
    └──requires──> [Chaos injection]
    └──requires──> [Lesson documentation]

[Distributed tracing]
    └──requires──> [Multiple services communicating]
    └──requires──> [Jaeger + OTel instrumentation]

[CI/CD pipelines]
    └──independent (separate module)

[Kafka streaming]
    └──requires──> [Pre-built services] (producer/consumer)
    └──enhances──> [Distributed tracing] (trace through queues)

[Interview prep]
    └──requires──> [All other features]
```

### Dependency Notes

- **Chaos injection requires dashboards:** You need to SEE the chaos to learn from it
- **Diagnostic challenges require chaos:** Challenges use chaos scenarios as the puzzle
- **Tracing requires multiple services:** Single service tracing teaches nothing
- **CI/CD is independent:** Can be added as a separate module at any phase
- **Kafka enhances tracing:** Tracing through message queues is an advanced lesson

## MVP Definition

### Launch With (v1)

Minimum viable sandbox — what's needed to validate the learning approach.

- [ ] Docker Compose with 3-4 small services (Python, Node, Go) — core services to observe
- [ ] Prometheus + Grafana with pre-built dashboards — metrics pillar
- [ ] Loki + Promtail with log search — logging pillar
- [ ] Alertmanager with alerts that fire — alerting basics
- [ ] Traffic generator — automated requests so there's data to observe
- [ ] Basic chaos injection — slow responses, errors, service crashes
- [ ] 5-8 guided lessons covering metrics, logging, alerting fundamentals
- [ ] Modular startup (profiles) — core, +tracing, +kafka, +cicd

### Add After Validation (v1.x)

Features to add once core learning experience works.

- [ ] Jaeger + OpenTelemetry distributed tracing — third pillar
- [ ] Diagnostic challenges — "find the bottleneck" scenarios
- [ ] Kafka module with producer/consumer services and monitoring
- [ ] CI/CD module with Gitea + Drone
- [ ] Advanced lessons on tracing, streaming, pipelines

### Future Consideration (v2+)

Features to defer until v1 is solid.

- [ ] Kubernetes module — advanced orchestration
- [ ] Data pipeline patterns (ETL workflows)
- [ ] Interview prep scenarios with specific question sets
- [ ] "Instrument your own app" advanced lesson
- [ ] Runbook/incident response exercises

## Feature Prioritization Matrix

| Feature | Learning Value | Implementation Cost | Priority |
|---------|---------------|---------------------|----------|
| Pre-built services | HIGH | MEDIUM | P1 |
| Prometheus + Grafana | HIGH | LOW | P1 |
| Loki logging | HIGH | LOW | P1 |
| Alerting | HIGH | LOW | P1 |
| Traffic generation | HIGH | LOW | P1 |
| Guided lessons | HIGH | HIGH | P1 |
| Chaos injection | HIGH | MEDIUM | P1 |
| Distributed tracing | HIGH | MEDIUM | P2 |
| Kafka streaming | MEDIUM | MEDIUM | P2 |
| CI/CD pipelines | MEDIUM | HIGH | P2 |
| Diagnostic challenges | HIGH | HIGH | P2 |
| Interview prep | HIGH | HIGH | P3 |
| Data pipelines | MEDIUM | HIGH | P3 |

**Priority key:**
- P1: Must have for launch
- P2: Should have, add when possible
- P3: Nice to have, future consideration

## Comparable Learning Environments

| Feature | OpenTelemetry Demo | Random Tutorials | This Sandbox |
|---------|-------------------|-----------------|--------------|
| One-command startup | Yes | No (multi-step) | Yes |
| Pre-built services | Yes (14 services) | Varies | Yes (3-5 services) |
| Curated lessons | No (reference app only) | Yes (but scattered) | Yes (integrated) |
| Chaos injection | No | Rarely | Yes |
| Resource-friendly | No (6GB+ RAM) | Varies | Yes (3-4GB core) |
| Progressive complexity | No (all-or-nothing) | No | Yes (profiles) |
| Interview focus | No | Sometimes | Yes |

## Sources

- [OpenTelemetry Demo](https://opentelemetry.io/docs/demo/) — Reference implementation, feature set comparison
- [Grafana LGTM](https://grafana.com/docs/opentelemetry/docker-lgtm/) — Lightweight all-in-one approach
- [Last9: Observability + Chaos Engineering](https://last9.io/blog/how-to-build-observability-into-chaos-engineering/) — Why chaos matters for learning
- [Master CI/CD Pipeline Locally](https://menraromial.com/blog/2025/master-ci-ci-pipeline-locally/) — Local DevOps lab patterns

---
*Feature research for: Observability & Pipelines Learning Sandbox*
*Researched: 2026-02-05*
