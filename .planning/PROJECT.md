# Observability & Pipelines Learning Sandbox

## What This Is

A modular, Docker-based local environment with pre-built microservices that exhibit realistic chaos — failures, slowdowns, and bugs to diagnose. Comes with a full observability stack and pipeline components, plus a curated curriculum of lessons. Designed for someone who wants to learn observability and pipelines without spending weeks building throwaway applications first.

## Core Value

Remove the setup tax so learning happens immediately. Services already exist and misbehave. Tools are pre-wired. You just learn.

## Requirements

### Validated

(None yet — ship to validate)

### Active

- [ ] Pre-built microservices that generate realistic traffic and exhibit chaos
- [ ] Observability stack: Prometheus, Grafana, logging (ELK or Loki), alerting
- [ ] Distributed tracing introduction (Jaeger or Zipkin)
- [ ] CI/CD pipeline examples (GitHub Actions or local equivalent)
- [ ] Data pipeline components (ETL workflow examples)
- [ ] Event streaming with Kafka
- [ ] Modular architecture — start minimal, add complexity via lessons
- [ ] Curated curriculum: guided exercises progressing to diagnostic challenges
- [ ] All runs locally via Docker on 12GB RAM / 6 cores

### Out of Scope

- Kubernetes — orchestration, not observability; can add as advanced module later
- Cloud deployments — this is a local learning environment
- Building production applications — the apps exist to be observed, not shipped
- Mobile or web frontend learning — focus is backend observability and pipelines

## Context

**The problem being solved:**
Learning observability and pipelines typically requires building an application first, setting up databases, configuring infrastructure — by the time you're ready to learn the actual skills, you're burnt out. This project flips that: the applications already exist and misbehave in educational ways.

**Target learner:**
Someone with basic Docker familiarity who wants interview confidence in observability and pipelines. Not a complete beginner, but hasn't had real hands-on experience with production-style monitoring, logging, tracing, or pipeline setup.

**Learning philosophy:**
- Start with guided exercises that explain the "why"
- Graduate to diagnostic challenges ("find the bottleneck")
- Realistic chaos makes it interesting — services break, slow down, have bugs
- Modular progression — each lesson may introduce new services or tools

**Technical environment:**
- Ubuntu VM with 12GB RAM, 6 cores (can scale to ~24GB if needed)
- Host machine: 32GB RAM, 32 cores
- Docker and docker-compose as the runtime

**Tools to cover:**
- Metrics: Prometheus, Grafana
- Logging: ELK stack or Loki (lighter weight)
- Tracing: Jaeger (introduction to distributed tracing)
- Alerting: Alertmanager or Grafana alerting
- Streaming: Kafka
- Pipelines: CI/CD examples, data pipeline patterns
- Instrumentation: OpenTelemetry (modern standard, vendor-neutral)

## Constraints

- **Compute**: Must run comfortably on 12GB RAM / 6 cores; design for resource efficiency
- **Local-only**: Everything runs via Docker, no cloud dependencies
- **Modular**: Each component can be enabled/disabled; start minimal
- **No Kubernetes**: Keep orchestration simple; K8s is a future advanced module

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Docker over Kubernetes | Simpler to run locally, K8s is orchestration not observability | — Pending |
| Pre-built services over tutorials | Eliminates setup tax, learner focuses on observability | — Pending |
| Modular architecture | Allows starting small on limited resources, scaling up | — Pending |
| Standard stack first | Prometheus/Grafana/ELK are industry standards, interview-relevant | — Pending |

---
*Last updated: 2026-02-04 after initialization*
