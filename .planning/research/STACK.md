# Stack Research

**Domain:** Observability & Pipelines Learning Sandbox
**Researched:** 2026-02-05
**Confidence:** HIGH

## Recommended Stack

### Core Technologies

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| Docker + Docker Compose | v2.0+ | Container runtime & orchestration | Industry standard, user already familiar, everything runs here |
| Prometheus | 2.x (latest) | Metrics collection & storage | De facto standard for metrics, every observability guide uses it, interview-essential |
| Grafana | 11.x | Visualization & dashboards | Unified dashboards for metrics, logs, traces; industry standard |
| Loki | 3.x | Log aggregation | Lightweight alternative to ELK, same label model as Prometheus, ~10x less memory |
| Promtail | 3.x | Log shipping | Ships container logs to Loki, pairs naturally with Loki |
| Alertmanager | 0.27+ | Alert routing & management | Standard companion to Prometheus, handles dedup/grouping/routing |
| Jaeger | 1.x | Distributed tracing | CNCF project, well-documented, good learning UI for trace visualization |
| OpenTelemetry Collector | 0.96+ | Telemetry pipeline | Vendor-neutral instrumentation standard, increasingly required interview knowledge |
| Apache Kafka | 3.7+ (KRaft) | Event streaming | Industry standard for event-driven architecture, no Zookeeper needed in KRaft mode |

### Supporting Tools

| Tool | Version | Purpose | When to Use |
|------|---------|---------|-------------|
| Kafka UI (kafbat) | latest | Visual Kafka management | Viewing topics, consumers, publishing test messages |
| Node Exporter | latest | Host metrics for Prometheus | Exposing VM-level CPU/memory/disk metrics |
| cAdvisor | latest | Container metrics | Exposing per-container resource usage to Prometheus |
| Gitea | latest | Self-hosted Git server | Local CI/CD pipeline learning (lightweight GitHub alternative) |
| Drone CI | 2.x | CI/CD pipeline execution | Container-native CI/CD, integrates with Gitea |
| Grafana LGTM image | latest | All-in-one observability backend | Quick-start option bundling Loki, Grafana, Tempo, Mimir |

### Sample Application Services

| Technology | Purpose | Why |
|------------|---------|-----|
| Python (Flask/FastAPI) | API service | Common, easy to instrument with OpenTelemetry |
| Node.js (Express) | Web service | Polyglot demonstrates real-world tracing across languages |
| Go (net/http) | Worker/processor | Lightweight, shows different instrumentation patterns |
| PostgreSQL | Relational database | Standard, generates interesting query metrics |
| Redis | Cache/queue | Common infrastructure, easy to monitor |
| Nginx | Reverse proxy/load balancer | Standard entry point, generates access logs |

### Development Tools

| Tool | Purpose | Notes |
|------|---------|-------|
| docker-compose profiles | Module enable/disable | Use profiles to start minimal or full stack |
| Makefile | Command shortcuts | `make lesson-1`, `make chaos-slow-db`, etc. |
| curl / httpie | API testing | Generate traffic for observability |
| hey / vegeta | Load testing | Generate realistic traffic patterns |

## Installation

```bash
# Everything runs via Docker Compose - no local installs needed
docker compose up -d                    # Start core stack
docker compose --profile kafka up -d    # Add Kafka module
docker compose --profile cicd up -d     # Add CI/CD module
docker compose --profile full up -d     # Everything
```

## Alternatives Considered

| Recommended | Alternative | When to Use Alternative |
|-------------|-------------|-------------------------|
| Loki | ELK Stack (Elasticsearch + Logstash + Kibana) | When learning ELK is specifically required; uses 4-8GB RAM vs Loki's ~500MB |
| Jaeger | Grafana Tempo | If staying fully within Grafana ecosystem; Jaeger has better standalone learning UI |
| Drone CI | Jenkins | If learning Jenkins specifically; Jenkins uses more RAM but has larger plugin ecosystem |
| Gitea | Forgejo | Functionally equivalent; Gitea has broader adoption |
| Prometheus | VictoriaMetrics | If Prometheus memory becomes an issue; less common in interviews |
| Kafka native image | Kafka JVM image | If GraalVM startup isn't important; JVM image is more battle-tested |

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| ELK Stack for logging | Elasticsearch alone needs 2-4GB RAM; overkill for learning on a VM | Loki (~500MB) |
| Zookeeper with Kafka | Deprecated; KRaft mode is simpler and uses fewer resources | Kafka KRaft mode |
| Kubernetes | Adds orchestration complexity that distracts from observability learning | Docker Compose |
| Datadog/New Relic/etc. | Cloud SaaS tools don't teach you to build observability from scratch | Open source stack |
| Fluentd/Fluent Bit for first pass | Adds another tool to learn before you understand the basics | Promtail (simpler) |
| Full OpenTelemetry Demo | Requires 6GB RAM just for the app services, 14GB disk; may strain the VM | Custom lightweight services |

## Resource Budget (12GB RAM target)

| Component | Estimated RAM | Notes |
|-----------|---------------|-------|
| Prometheus | 500MB-1GB | Depends on metric cardinality |
| Grafana | 200-300MB | Lightweight |
| Loki | 300-500MB | Much lighter than Elasticsearch |
| Promtail | 50-100MB | Lightweight agent |
| Alertmanager | 50MB | Very lightweight |
| Jaeger | 200-400MB | All-in-one mode for learning |
| OTel Collector | 100-200MB | Lightweight pipeline |
| Kafka (native) | 500MB-1GB | GraalVM native uses less than JVM |
| Kafka UI | 200MB | JVM-based |
| 3 app services | 300-600MB | Python, Node, Go |
| PostgreSQL | 200-400MB | Default config |
| Redis | 50-100MB | Minimal dataset |
| Nginx | 50MB | Very lightweight |
| **Total (core)** | **~3-4GB** | Leaves headroom for growth |
| **Total (full)** | **~5-7GB** | With Kafka, CI/CD modules |

## Sources

- [Grafana LGTM Docker image](https://grafana.com/docs/opentelemetry/docker-lgtm/) — All-in-one observability backend
- [OpenTelemetry Demo Docker deployment](https://opentelemetry.io/docs/demo/docker-deployment/) — Reference architecture
- [Apache Kafka Docker images](https://hub.docker.com/r/apache/kafka) — Official images, KRaft mode docs
- [Docker Kafka guide](https://docs.docker.com/guides/kafka/) — Official Docker + Kafka guide
- [PLG Stack guide](https://medium.com/@sre999/mastering-the-plg-stack-locally-prometheus-loki-grafana-with-docker-compose-beginner-friendly-c5e2df614378) — Prometheus + Loki + Grafana local setup
- [Gitea + Drone CI](https://dev.to/ruanbekker/self-hosted-cicd-with-gitea-and-drone-ci-200l) — Self-hosted CI/CD
- [GitHub: mransbro/observability](https://github.com/mransbro/observability) — Prometheus + Grafana + Loki + Jaeger Docker Compose

---
*Stack research for: Observability & Pipelines Learning Sandbox*
*Researched: 2026-02-05*
