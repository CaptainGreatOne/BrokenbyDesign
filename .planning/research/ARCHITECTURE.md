# Architecture Research

**Domain:** Observability & Pipelines Learning Sandbox
**Researched:** 2026-02-05
**Confidence:** HIGH

## Standard Architecture

### System Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                        VISUALIZATION LAYER                          │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │                    Grafana (dashboards)                        │  │
│  └───────────┬──────────────┬──────────────┬────────────────────┘  │
│              │              │              │                        │
├──────────────┼──────────────┼──────────────┼────────────────────────┤
│              TELEMETRY BACKENDS                                     │
│  ┌───────────┴──┐  ┌───────┴──────┐  ┌───┴────────────┐           │
│  │  Prometheus   │  │    Loki      │  │    Jaeger       │           │
│  │  (metrics)    │  │   (logs)     │  │   (traces)      │           │
│  └───────┬───── ┘  └──────┬───────┘  └───────┬─────────┘           │
│          │                │                   │                     │
│  ┌───────┴──┐     ┌──────┴──────┐    ┌───────┴─────────┐           │
│  │Alertmgr  │     │  Promtail   │    │  OTel Collector  │           │
│  │(alerts)  │     │ (log ship)  │    │  (trace pipe)    │           │
│  └──────────┘     └─────────────┘    └──────────────────┘           │
├─────────────────────────────────────────────────────────────────────┤
│                        APPLICATION LAYER                            │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────────────┐   │
│  │  API      │  │  Web     │  │  Worker  │  │  Traffic Gen     │   │
│  │ (Python)  │  │ (Node)   │  │  (Go)    │  │  (load driver)   │   │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └──────────────────┘   │
│       │              │              │                                │
├───────┴──────────────┴──────────────┴────────────────────────────────┤
│                        DATA LAYER                                    │
│  ┌──────────┐  ┌──────────┐  ┌──────────────┐                      │
│  │PostgreSQL│  │  Redis   │  │  Kafka (opt) │                      │
│  └──────────┘  └──────────┘  └──────────────┘                      │
├─────────────────────────────────────────────────────────────────────┤
│                        INFRASTRUCTURE                                │
│  ┌──────────┐  ┌──────────┐  ┌──────────────┐                      │
│  │  Nginx   │  │ cAdvisor │  │ Node Exporter│                      │
│  │ (proxy)  │  │(container│  │ (host metrics)│                      │
│  │          │  │ metrics) │  │              │                       │
│  └──────────┘  └──────────┘  └──────────────┘                      │
├─────────────────────────────────────────────────────────────────────┤
│                        CI/CD MODULE (optional)                       │
│  ┌──────────┐  ┌──────────┐                                         │
│  │  Gitea   │  │ Drone CI │                                         │
│  │  (git)   │  │(pipelines)│                                        │
│  └──────────┘  └──────────┘                                         │
└─────────────────────────────────────────────────────────────────────┘
```

### Component Responsibilities

| Component | Responsibility | Typical Implementation |
|-----------|----------------|------------------------|
| API Service (Python) | REST API, business logic, DB queries | Flask/FastAPI with OTel instrumentation |
| Web Service (Node) | Frontend-facing service, calls API | Express with OTel instrumentation |
| Worker Service (Go) | Background processing, queue consumer | net/http with OTel instrumentation |
| Nginx | Reverse proxy, entry point, access logs | Routes traffic to web/API services |
| PostgreSQL | Persistent data storage | Standard Postgres, exports metrics via pg_exporter |
| Redis | Caching, session store, simple queue | Standard Redis with redis_exporter |
| Prometheus | Scrapes metrics from all services | Pull-based, scrape configs for each service |
| Loki | Receives and stores logs | Receives from Promtail |
| Promtail | Ships container logs to Loki | Reads Docker container logs |
| Jaeger | Receives and stores traces | Receives from OTel Collector |
| OTel Collector | Receives traces from apps, forwards to Jaeger | Receives OTLP, exports to Jaeger |
| Grafana | Unified visualization | Datasources: Prometheus, Loki, Jaeger |
| Alertmanager | Routes alerts from Prometheus | Webhook/log receivers for learning |
| Traffic Generator | Simulates user traffic | Scripts that call API/Web endpoints |
| Chaos Controller | Injects failures on demand | Scripts/configs that trigger slow/error modes |

## Recommended Project Structure

```
observability-sandbox/
├── docker-compose.yml           # Core services + observability
├── docker-compose.kafka.yml     # Kafka overlay
├── docker-compose.cicd.yml      # CI/CD overlay
├── Makefile                     # Shortcut commands
├── services/
│   ├── api-python/              # Python API service
│   │   ├── Dockerfile
│   │   ├── app.py
│   │   ├── requirements.txt
│   │   └── chaos.py             # Chaos injection endpoints
│   ├── web-node/                # Node.js web service
│   │   ├── Dockerfile
│   │   ├── server.js
│   │   └── package.json
│   ├── worker-go/               # Go worker service
│   │   ├── Dockerfile
│   │   ├── main.go
│   │   └── go.mod
│   └── traffic-gen/             # Traffic generator
│       ├── Dockerfile
│       └── generate.sh
├── config/
│   ├── prometheus/
│   │   ├── prometheus.yml       # Scrape config
│   │   └── alerts.yml           # Alert rules
│   ├── grafana/
│   │   ├── provisioning/        # Auto-provision datasources + dashboards
│   │   │   ├── datasources/
│   │   │   └── dashboards/
│   │   └── dashboards/          # JSON dashboard files
│   ├── loki/
│   │   └── loki-config.yml
│   ├── promtail/
│   │   └── promtail-config.yml
│   ├── alertmanager/
│   │   └── alertmanager.yml
│   ├── otel-collector/
│   │   └── otel-config.yml
│   └── nginx/
│       └── nginx.conf
├── chaos/
│   ├── scenarios/               # Chaos scenario definitions
│   │   ├── slow-database.sh
│   │   ├── service-crash.sh
│   │   ├── memory-leak.sh
│   │   └── network-latency.sh
│   └── README.md
├── lessons/
│   ├── 01-metrics-basics/
│   │   ├── README.md            # Lesson content
│   │   ├── exercises.md         # Hands-on exercises
│   │   └── solutions.md         # Solutions (spoiler-protected)
│   ├── 02-dashboards/
│   ├── 03-logging/
│   ├── 04-alerting/
│   ├── 05-tracing/
│   ├── 06-chaos-diagnosis/
│   ├── 07-event-streaming/
│   ├── 08-cicd-pipelines/
│   └── 09-putting-it-together/
└── .planning/                   # GSD planning docs
```

### Structure Rationale

- **services/:** Each application service is self-contained with its own Dockerfile; easy to understand and modify
- **config/:** All observability tool configs in one place; learner can see how each tool is configured
- **chaos/:** Separate from services; chaos is injected externally, not baked into app code
- **lessons/:** Numbered progression; each lesson builds on previous knowledge
- **docker-compose overlays:** Separate files for optional modules avoid a massive single file

## Architectural Patterns

### Pattern 1: Docker Compose Profiles for Modularity

**What:** Use Docker Compose profiles to group services into modules that can be enabled/disabled.
**When to use:** Core pattern — enables progressive complexity.
**Trade-offs:** Slightly more complex compose file, but huge win for resource management and learning progression.

**Example:**
```yaml
services:
  prometheus:
    image: prom/prometheus
    profiles: ["core", "full"]

  jaeger:
    image: jaegertracing/all-in-one
    profiles: ["tracing", "full"]

  kafka:
    image: apache/kafka-native
    profiles: ["kafka", "full"]
```

### Pattern 2: Sidecar-less Observability (Pull Model)

**What:** Prometheus scrapes metrics from services (pull model) rather than services pushing metrics. Promtail reads Docker logs rather than apps shipping their own.
**When to use:** Default for this project. Simpler for learners — apps don't need complex SDKs.
**Trade-offs:** Less flexible than push model, but much easier to understand and debug.

### Pattern 3: Chaos via HTTP Endpoints

**What:** Each service exposes chaos control endpoints (e.g., `/chaos/slow`, `/chaos/error`, `/chaos/reset`) that scripts can toggle.
**When to use:** For all chaos scenarios.
**Trade-offs:** Requires minimal code in services, but gives precise control over failure modes.

**Example:**
```python
# In the Python API service
@app.route('/chaos/slow', methods=['POST'])
def enable_slow_mode():
    app.config['CHAOS_DELAY'] = request.json.get('delay_ms', 2000)
    return {"status": "slow mode enabled"}
```

## Data Flow

### Metrics Flow

```
[App Services] ──expose /metrics──> [Prometheus scrapes] ──stores──> [Prometheus TSDB]
                                                                           │
[cAdvisor] ──expose /metrics──> [Prometheus scrapes]                       │
[Node Exporter] ──expose /metrics──> [Prometheus scrapes]                  ↓
                                                              [Grafana queries Prometheus]
                                                              [Alertmanager evaluates rules]
```

### Logging Flow

```
[App Services] ──stdout/stderr──> [Docker log driver]
                                        │
                                        ↓
                              [Promtail reads logs]
                                        │
                                        ↓
                                  [Loki stores]
                                        │
                                        ↓
                              [Grafana queries Loki]
```

### Tracing Flow

```
[App Services] ──OTLP──> [OTel Collector] ──exports──> [Jaeger]
                                                           │
                                                           ↓
                                                [Grafana links to Jaeger UI]
```

### Event Streaming Flow (Kafka module)

```
[API Service] ──produces──> [Kafka Topic] ──consumes──> [Worker Service]
                                 │
                                 ↓
                          [Kafka UI visualizes]
                          [Prometheus scrapes Kafka metrics]
```

### Key Data Flows

1. **Request flow:** Client → Nginx → Web Service → API Service → PostgreSQL → Response
2. **Metric flow:** Services expose → Prometheus scrapes → Grafana visualizes → Alertmanager alerts
3. **Log flow:** Services write stdout → Docker captures → Promtail ships → Loki stores → Grafana queries
4. **Trace flow:** Services instrument → OTel Collector receives → Jaeger stores → Grafana/Jaeger UI shows

## Modularity Strategy

Modules are activated via Docker Compose profiles:

| Module | Profile | Services Added | Additional RAM |
|--------|---------|----------------|----------------|
| Core | `core` | Prometheus, Grafana, Loki, Promtail, Alertmanager, 3 app services, Postgres, Redis, Nginx, traffic-gen | ~3-4GB |
| Tracing | `tracing` | Jaeger, OTel Collector | ~500MB |
| Kafka | `kafka` | Kafka (native), Kafka UI, producer/consumer services | ~1-1.5GB |
| CI/CD | `cicd` | Gitea, Drone CI, Drone Agent | ~1GB |
| Full | `full` | All above | ~6-7GB |

### Build Order (Phase Dependencies)

```
Phase 1: Core services (apps + databases)
    ↓
Phase 2: Metrics (Prometheus + Grafana)
    ↓
Phase 3: Logging (Loki + Promtail)
    ↓
Phase 4: Alerting (Alertmanager + rules)
    ↓
Phase 5: Chaos (injection + scenarios)
    ↓
Phase 6: Tracing (Jaeger + OTel)
    ↓
Phase 7: Event Streaming (Kafka)
    ↓
Phase 8: CI/CD (Gitea + Drone)
    ↓
Phase 9: Lessons & Curriculum
    ↓
Phase 10: Diagnostic Challenges
```

## Anti-Patterns

### Anti-Pattern 1: Monolithic Docker Compose

**What people do:** Put everything in one massive docker-compose.yml with 20+ services
**Why it's wrong:** Can't start subset, resource hungry, hard to understand
**Do this instead:** Use compose profiles and overlay files for modules

### Anti-Pattern 2: Over-instrumented Services

**What people do:** Add every possible metric, log every line, trace every function
**Why it's wrong:** Noisy data obscures real signals; learners can't find what matters
**Do this instead:** Instrument key endpoints and business metrics; add more in advanced lessons

### Anti-Pattern 3: Configuration as Magic

**What people do:** Pre-configure everything so it "just works" with zero explanation
**Why it's wrong:** Learners don't understand what's configured or why
**Do this instead:** Pre-configure for startup, but lessons walk through each config file and explain what it does

## Sources

- [Grafana LGTM stack](https://grafana.com/docs/opentelemetry/docker-lgtm/) — All-in-one observability architecture
- [OpenTelemetry Demo architecture](https://opentelemetry.io/docs/demo/requirements/architecture/) — Reference microservices architecture
- [PLG Stack guide](https://medium.com/@sre999/mastering-the-plg-stack-locally-prometheus-loki-grafana-with-docker-compose-beginner-friendly-c5e2df614378) — Prometheus + Loki + Grafana patterns
- [mransbro/observability](https://github.com/mransbro/observability) — Docker Compose observability stack reference

---
*Architecture research for: Observability & Pipelines Learning Sandbox*
*Researched: 2026-02-05*
