# Pitfalls Research

**Domain:** Observability & Pipelines Learning Sandbox
**Researched:** 2026-02-05
**Confidence:** HIGH

## Critical Pitfalls

### Pitfall 1: Resource Exhaustion on VM

**What goes wrong:**
Docker containers collectively consume all available RAM, causing the VM to swap heavily or OOM-kill containers. Prometheus, Elasticsearch, and Kafka are the usual culprits.

**Why it happens:**
Default configs for observability tools assume production hardware. Prometheus default retention is 15 days, Elasticsearch wants 2GB heap minimum, Kafka JVM defaults to 1GB+.

**How to avoid:**
- Use Loki instead of ELK (10x less RAM)
- Use `apache/kafka-native` (GraalVM, ~50% less RAM than JVM)
- Set explicit memory limits in docker-compose: `deploy.resources.limits.memory`
- Configure Prometheus retention to 2-3 days for learning
- Use docker-compose profiles — never run everything at once initially

**Warning signs:**
- Containers restarting unexpectedly
- `docker stats` showing >80% memory usage
- Grafana dashboards loading slowly or timing out

**Phase to address:**
Phase 1 (Core services) — set resource limits from the start

---

### Pitfall 2: Setup Tax Sneaking Back In

**What goes wrong:**
Despite the goal being "pre-built and ready," the learner spends hours debugging Docker networking, config file syntax, or version incompatibilities before seeing a single metric.

**Why it happens:**
Config files reference wrong hostnames (localhost vs service name), version mismatches between tools, missing volume mounts, or port conflicts with existing local services.

**How to avoid:**
- Test the entire stack end-to-end before writing any lessons
- Use Docker service names (e.g., `prometheus:9090`) not `localhost`
- Pin all image versions — never use `latest` in compose files
- Include a health check / smoke test script: `make health-check`
- Document required ports and check for conflicts on startup

**Warning signs:**
- More than 5 minutes from `docker compose up` to seeing data in Grafana
- Any manual configuration step required after startup

**Phase to address:**
Phase 1 & 2 — smoke test must pass before moving on

---

### Pitfall 3: Empty Dashboards Syndrome

**What goes wrong:**
Everything starts up, Grafana loads, but dashboards show "No data" or empty panels. Learner has no idea if the tool is broken or misconfigured.

**Why it happens:**
Prometheus hasn't scraped yet (default 15s interval), services aren't generating traffic yet, datasource names don't match dashboard references, or time range is wrong.

**How to avoid:**
- Include a traffic generator that starts automatically
- Pre-provision Grafana datasources with exact names dashboards expect
- Set Grafana default time range to "Last 15 minutes"
- Add a "Getting Started" dashboard that shows system health
- First lesson should explain what's happening and why there might be a brief delay

**Warning signs:**
- Dashboard panels showing "No data" after 30+ seconds
- Prometheus targets page showing targets as "DOWN"

**Phase to address:**
Phase 2 (Metrics) — traffic generator must be part of core stack

---

### Pitfall 4: Teaching Tools Instead of Concepts

**What goes wrong:**
Lessons become "click here, type this" Grafana tutorials rather than teaching observability concepts that transfer to any toolset.

**Why it happens:**
It's easier to write "create a panel with this PromQL query" than to explain why you'd want that metric and what it tells you about system health.

**How to avoid:**
- Structure lessons around questions ("Is my system healthy?" "Where is the bottleneck?") not tools ("How to use Grafana")
- Each lesson should state the concept before the tool usage
- Include "What did you learn?" reflection at end of each lesson
- Explain the "why" before the "how"

**Warning signs:**
- Lessons that could be replaced by tool documentation
- No mention of concepts that apply beyond the specific tool

**Phase to address:**
Phase 9 (Lessons) — lesson quality criteria must include concept coverage

---

### Pitfall 5: Chaos Without Context

**What goes wrong:**
Chaos scenarios exist but the learner doesn't know what to look for, what "normal" looks like, or how to diagnose the injected problem.

**Why it happens:**
Chaos is added before the learner has built mental models of normal system behavior. They see red on a dashboard but don't know what baseline is.

**How to avoid:**
- Lessons establish "normal" first — learner spends time observing healthy system
- Each chaos scenario has a guided diagnosis path for beginners
- "Before/after" comparison is built into chaos exercises
- Start with obvious failures (service crash), graduate to subtle ones (slow queries)

**Warning signs:**
- Learner can trigger chaos but can't explain what changed
- No baseline reference for comparison

**Phase to address:**
Phase 5 (Chaos) — must come AFTER learner has completed metrics/logging/alerting lessons

---

### Pitfall 6: Metric Cardinality Explosion

**What goes wrong:**
Too many labels on metrics (especially user IDs, request IDs, or unbounded values) cause Prometheus memory usage to spike and queries to become slow.

**Why it happens:**
Enthusiastic instrumentation without understanding cardinality. Each unique label combination is a separate time series.

**How to avoid:**
- Pre-configure services with sensible metric labels
- Include a lesson specifically about cardinality
- Add a Prometheus dashboard showing TSDB statistics (series count)
- Keep label values bounded (HTTP methods, status code ranges, service names)

**Warning signs:**
- Prometheus memory climbing steadily
- `prometheus_tsdb_head_series` growing beyond 10k for a small setup

**Phase to address:**
Phase 2 (Metrics) — good metric design from the start; advanced lesson on cardinality

---

### Pitfall 7: Log Volume Overwhelming Storage

**What goes wrong:**
Services in debug mode or with request logging generate GBs of logs that fill up disk space, causing Loki or Docker to fail.

**Why it happens:**
Default log levels set to DEBUG, traffic generator runs continuously, no log rotation configured.

**How to avoid:**
- Set default log level to INFO (DEBUG only for specific lessons)
- Configure Docker log driver with max-size and max-file limits
- Configure Loki retention period (3-7 days for learning)
- Add disk usage monitoring to Grafana

**Warning signs:**
- `docker system df` showing multi-GB log usage
- Loki queries becoming slow

**Phase to address:**
Phase 3 (Logging) — configure log rotation and retention

---

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Using `latest` image tags | Don't need to track versions | Builds break when images update | Never — always pin versions |
| Hardcoded config values | Quick to set up | Can't customize per-lesson | Acceptable for v1, parameterize later |
| Single docker-compose.yml | Simple to start | Unmanageable at 20+ services | Never — use profiles/overlays from start |
| Skipping health checks | Faster startup config | Services start before dependencies ready | Never — always add depends_on + healthcheck |

## Integration Gotchas

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| Grafana → Prometheus | Using `localhost:9090` as datasource URL | Use `prometheus:9090` (Docker service name) |
| Promtail → Loki | Mounting wrong Docker socket path | Mount `/var/run/docker.sock` and use Docker log driver discovery |
| OTel Collector → Jaeger | Wrong exporter protocol (gRPC vs HTTP) | Match Jaeger receiver protocol with OTel exporter config |
| Prometheus → App Services | Services not exposing /metrics endpoint | Ensure each service has a /metrics endpoint with prometheus client library |
| Kafka → App Services | Listener configuration wrong | Use separate HOST and DOCKER listeners with correct advertised addresses |

## Performance Traps

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Prometheus scraping too frequently | High CPU, slow queries | Set scrape interval to 15-30s for learning | < 5s intervals with many targets |
| Grafana dashboard auto-refresh too fast | Browser lag, high Prometheus load | Set refresh to 10-30s | 1s refresh with complex queries |
| Traffic generator too aggressive | Services overwhelmed, high CPU | Start with 1 req/s, increase for load testing lessons | > 50 req/s on VM |
| Kafka topic with no cleanup policy | Disk fills up | Set retention.ms and segment.bytes | Days of continuous message production |

## "Looks Done But Isn't" Checklist

- [ ] **Prometheus scraping:** All targets show "UP" on /targets page — verify each service is actually scraped
- [ ] **Grafana dashboards:** All panels show data — verify datasource names match exactly
- [ ] **Alerting:** Alerts actually fire and show up — verify Alertmanager is receiving from Prometheus
- [ ] **Logging:** Logs from ALL services appear in Loki — verify Promtail is discovering all containers
- [ ] **Tracing:** Traces show full request path across services — verify OTel propagation headers are forwarded
- [ ] **Chaos recovery:** Services recover after chaos is disabled — verify reset endpoints work
- [ ] **Cold start:** Everything works after `docker compose down && docker compose up` — verify no state dependencies

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| Resource exhaustion | LOW | `docker compose down`, increase memory limits, restart |
| Disk full from logs | LOW | `docker system prune`, configure log rotation, restart |
| Metric cardinality explosion | MEDIUM | Identify high-cardinality labels, remove from code, restart Prometheus |
| Broken configs after changes | LOW | Git revert to last working commit, re-apply changes carefully |
| Port conflicts | LOW | Check `docker compose ps`, change conflicting ports in compose file |

## Pitfall-to-Phase Mapping

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| Resource exhaustion | Phase 1 | `docker stats` shows <80% memory usage with core stack |
| Setup tax | Phase 1-2 | Fresh clone → `docker compose up` → data in Grafana < 5 min |
| Empty dashboards | Phase 2 | All dashboard panels show data within 60s of startup |
| Tools not concepts | Phase 9 | Each lesson mentions transferable concepts, not just tool steps |
| Chaos without context | Phase 5 | Chaos lessons reference specific baselines from earlier lessons |
| Metric cardinality | Phase 2 | TSDB head series < 10k with all services running |
| Log volume | Phase 3 | Docker log size stays under 500MB after 24h of traffic |

## Sources

- [Grafana PLG Stack troubleshooting](https://blog.elest.io/grafana-prometheus-loki-build-a-complete-observability-stack/) — Common configuration mistakes
- [Docker Kafka listener configuration](https://docs.docker.com/guides/kafka/) — Network gotchas
- [Observability + Chaos Engineering](https://last9.io/blog/how-to-build-observability-into-chaos-engineering/) — Best practices for combining
- [ChaosOrca for Docker](https://www.sciencedirect.com/science/article/abs/pii/S0167739X21001163) — Docker-native chaos engineering

---
*Pitfalls research for: Observability & Pipelines Learning Sandbox*
*Researched: 2026-02-05*
