# Phase 02: Metrics & Dashboards - Research

**Researched:** 2026-02-06
**Domain:** Metrics Collection and Visualization (Prometheus/Grafana Stack)
**Confidence:** HIGH

## Summary

This research investigates the standard approach to implementing metrics collection and visualization for microservices using the Prometheus/Grafana stack. The investigation covered Prometheus metrics collection patterns, Grafana provisioning for Docker Compose, application instrumentation libraries for Node.js, Python, and Go, container and host metrics exporters (cAdvisor, Node Exporter), and common pitfalls in setup and configuration.

The standard approach is to use Prometheus 3.5.x (latest LTS) for metrics collection via pull-based scraping, Grafana 12.x for visualization with pre-provisioned datasources and dashboards, cAdvisor for container metrics, and Node Exporter for host metrics. Application instrumentation is achieved using official Prometheus client libraries: prom-client for Node.js, prometheus-client for Python, and client_golang for Go. All services are configured via Docker Compose using static service discovery based on Docker's built-in DNS.

The critical success factors are proper scrape interval configuration (5-15 seconds), startup dependency management to ensure Prometheus is ready before Grafana provisions datasources, careful label management to avoid cardinality explosion, and resource allocation (Prometheus ~500MB-1GB, Grafana ~256MB-512MB, cAdvisor ~100MB, Node Exporter ~50MB, totaling approximately 1-2GB for the observability stack).

**Primary recommendation:** Use Prometheus 3.5.1 LTS with static Docker Compose service discovery, pre-provision Grafana 12.3 with datasource and dashboard YAML/JSON files mounted as volumes, instrument applications using official Prometheus client libraries with default metrics enabled, and deploy cAdvisor and Node Exporter as separate containers with appropriate volume mounts for host access.

## Standard Stack

The established libraries/tools for metrics collection and visualization in cloud-native environments.

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Prometheus | 3.5.1 (LTS) | Time-series database and metrics scraper | Industry standard, CNCF graduated project, pull-based architecture |
| Grafana | 12.3 | Metrics visualization and dashboards | De facto standard for Prometheus visualization, provisioning support |
| cAdvisor | latest | Container metrics exporter | Google-developed, native Docker integration, automatic container discovery |
| Node Exporter | latest (v1.10.x) | Host-level system metrics exporter | Official Prometheus exporter, comprehensive hardware/kernel metrics |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| prom-client | 15.1.3 | Node.js Prometheus client | Instrumenting Node.js/Express applications |
| prometheus-client | 0.24.1 | Python Prometheus client | Instrumenting Python applications |
| client_golang | 1.x | Go Prometheus client | Instrumenting Go applications |
| prometheus-fastapi-instrumentator | latest | FastAPI auto-instrumentation | If using FastAPI framework specifically |
| express-prom-bundle | latest | Express middleware for metrics | Alternative to manual prom-client setup |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Prometheus | VictoriaMetrics | Better resource efficiency, but less standard, smaller ecosystem |
| Grafana | Prometheus UI | Lighter weight, but limited visualization capabilities |
| Pull-based scraping | Push-based (Pushgateway) | Better for short-lived jobs, but anti-pattern for long-running services |

**Installation (Docker):**
```bash
# Prometheus
docker pull prom/prometheus:v3.5.1

# Grafana
docker pull grafana/grafana:12.3.0

# cAdvisor
docker pull gcr.io/cadvisor/cadvisor:latest

# Node Exporter
docker pull prom/node-exporter:latest
```

**Installation (Application Libraries):**
```bash
# Node.js
npm install prom-client@15.1.3

# Python
pip install prometheus-client==0.24.1

# Go
go get github.com/prometheus/client_golang
```

## Architecture Patterns

### Recommended Docker Compose Structure
```
.
├── docker-compose.yml                    # Main compose file with all services
├── prometheus/
│   ├── prometheus.yml                    # Scrape configuration
│   └── alerts/                           # Alert rules (Phase 3)
├── grafana/
│   ├── provisioning/
│   │   ├── datasources/
│   │   │   └── prometheus.yml            # Auto-provision Prometheus datasource
│   │   └── dashboards/
│   │       ├── dashboards.yml            # Dashboard provider config
│   │       └── service-metrics.json      # Pre-built dashboard JSON
│   └── dashboards/                       # Additional dashboard JSON files
└── services/
    ├── web-gateway/                      # Node.js service
    ├── order-api/                        # Python service
    └── fulfillment-worker/               # Go service
```

### Pattern 1: Prometheus Static Service Discovery
**What:** Configure Prometheus to scrape metrics from Docker Compose services using static targets with service names as DNS hostnames.
**When to use:** All Docker Compose deployments (standard approach, no dynamic discovery needed)
**Example:**
```yaml
# Source: https://prometheus.io/docs/prometheus/latest/configuration/configuration/
# prometheus/prometheus.yml
global:
  scrape_interval: 15s
  evaluation_interval: 15s

scrape_configs:
  # Prometheus itself
  - job_name: 'prometheus'
    static_configs:
      - targets: ['localhost:9090']

  # Application services
  - job_name: 'web-gateway'
    static_configs:
      - targets: ['web-gateway:3000']
    metrics_path: '/metrics'

  - job_name: 'order-api'
    static_configs:
      - targets: ['order-api:8000']
    metrics_path: '/metrics'

  - job_name: 'fulfillment-worker'
    static_configs:
      - targets: ['fulfillment-worker:8080']
    metrics_path: '/metrics'

  # Container metrics
  - job_name: 'cadvisor'
    static_configs:
      - targets: ['cadvisor:8080']
    scrape_interval: 5s

  # Host metrics
  - job_name: 'node-exporter'
    static_configs:
      - targets: ['node-exporter:9100']
```

### Pattern 2: Grafana Provisioning with Docker Volumes
**What:** Mount provisioning configuration files as Docker volumes to auto-configure datasources and dashboards on first boot.
**When to use:** Always in Docker deployments (ensures consistent, version-controlled configuration)
**Example:**
```yaml
# Source: https://grafana.com/docs/grafana/latest/administration/provisioning/
# docker-compose.yml
grafana:
  image: grafana/grafana:12.3.0
  volumes:
    - ./grafana/provisioning:/etc/grafana/provisioning:ro
    - ./grafana/dashboards:/var/lib/grafana/dashboards:ro
    - grafana-data:/var/lib/grafana
  environment:
    - GF_SECURITY_ADMIN_PASSWORD=admin
    - GF_PATHS_PROVISIONING=/etc/grafana/provisioning
  depends_on:
    - prometheus
```

```yaml
# grafana/provisioning/datasources/prometheus.yml
apiVersion: 1

datasources:
  - name: Prometheus
    type: prometheus
    access: proxy
    url: http://prometheus:9090
    isDefault: true
    editable: false
    jsonData:
      timeInterval: 15s
```

```yaml
# grafana/provisioning/dashboards/dashboards.yml
apiVersion: 1

providers:
  - name: 'Service Metrics'
    orgId: 1
    folder: ''
    type: file
    disableDeletion: false
    updateIntervalSeconds: 10
    allowUiUpdates: true
    options:
      path: /var/lib/grafana/dashboards
```

### Pattern 3: Application Instrumentation with Default Metrics
**What:** Use client libraries to expose both default runtime metrics and custom application metrics via /metrics endpoint.
**When to use:** All application services (provides baseline observability out-of-the-box)

**Node.js/Express Example:**
```javascript
// Source: https://github.com/siimon/prom-client
const express = require('express');
const client = require('prom-client');

const app = express();

// Collect default metrics (event loop lag, GC, memory, etc.)
const register = new client.Registry();
client.collectDefaultMetrics({ register });

// Custom metrics
const httpRequestDuration = new client.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.001, 0.01, 0.1, 0.5, 1, 2, 5]
});
register.registerMetric(httpRequestDuration);

// Expose /metrics endpoint
app.get('/metrics', async (req, res) => {
  res.set('Content-Type', register.contentType);
  res.end(await register.metrics());
});

// Middleware to track request duration
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = (Date.now() - start) / 1000;
    httpRequestDuration
      .labels(req.method, req.route?.path || req.path, res.statusCode)
      .observe(duration);
  });
  next();
});
```

**Python Example:**
```python
# Source: https://github.com/prometheus/client_python
from prometheus_client import start_http_server, Counter, Histogram, generate_latest
from flask import Flask, Response
import time

app = Flask(__name__)

# Default metrics are automatically collected
REQUEST_COUNT = Counter('http_requests_total', 'Total HTTP requests', ['method', 'endpoint', 'status'])
REQUEST_DURATION = Histogram('http_request_duration_seconds', 'HTTP request duration', ['method', 'endpoint'])

@app.before_request
def before_request():
    request.start_time = time.time()

@app.after_request
def after_request(response):
    duration = time.time() - request.start_time
    REQUEST_DURATION.labels(request.method, request.endpoint).observe(duration)
    REQUEST_COUNT.labels(request.method, request.endpoint, response.status_code).inc()
    return response

@app.route('/metrics')
def metrics():
    return Response(generate_latest(), mimetype='text/plain')
```

**Go Example:**
```go
// Source: https://prometheus.io/docs/guides/go-application/
package main

import (
    "net/http"
    "github.com/prometheus/client_golang/prometheus"
    "github.com/prometheus/client_golang/prometheus/promauto"
    "github.com/prometheus/client_golang/prometheus/promhttp"
)

var (
    httpRequestsTotal = promauto.NewCounterVec(
        prometheus.CounterOpts{
            Name: "http_requests_total",
            Help: "Total number of HTTP requests",
        },
        []string{"method", "path", "status"},
    )

    httpRequestDuration = promauto.NewHistogramVec(
        prometheus.HistogramOpts{
            Name: "http_request_duration_seconds",
            Help: "HTTP request duration in seconds",
            Buckets: prometheus.DefBuckets,
        },
        []string{"method", "path"},
    )
)

func main() {
    // Expose /metrics endpoint with default Go runtime metrics
    http.Handle("/metrics", promhttp.Handler())
    http.ListenAndServe(":8080", nil)
}
```

### Pattern 4: cAdvisor Container Metrics
**What:** Deploy cAdvisor with Docker socket and filesystem access to expose per-container CPU, memory, network, and disk metrics.
**When to use:** Always (essential for container-level observability)
**Example:**
```yaml
# Source: https://prometheus.io/docs/guides/cadvisor/
cadvisor:
  image: gcr.io/cadvisor/cadvisor:latest
  container_name: cadvisor
  privileged: true
  devices:
    - /dev/kmsg:/dev/kmsg
  volumes:
    - /:/rootfs:ro
    - /var/run:/var/run:ro
    - /sys:/sys:ro
    - /var/lib/docker/:/var/lib/docker:ro
    - /dev/disk/:/dev/disk:ro
  ports:
    - "8080:8080"
  restart: unless-stopped
  deploy:
    resources:
      limits:
        memory: 200M
        cpus: '0.5'
```

### Pattern 5: Node Exporter Host Metrics
**What:** Deploy Node Exporter with host network and filesystem access to expose host-level CPU, memory, disk, and network metrics.
**When to use:** Always (provides infrastructure baseline metrics)
**Example:**
```yaml
# Source: https://prometheus.io/docs/guides/node-exporter/
node-exporter:
  image: prom/node-exporter:latest
  container_name: node-exporter
  command:
    - '--path.rootfs=/host'
  network_mode: host
  pid: host
  volumes:
    - '/:/host:ro,rslave'
  restart: unless-stopped
  deploy:
    resources:
      limits:
        memory: 100M
        cpus: '0.25'
```

### Anti-Patterns to Avoid

- **High-cardinality labels:** Never use unbounded label values like user IDs, email addresses, timestamps, or session IDs. This causes cardinality explosion and memory exhaustion.
- **Pushgateway for long-running services:** Pushgateway is for batch jobs only. Use pull-based scraping for microservices.
- **Missing /metrics endpoint:** Every application service must expose /metrics or Prometheus cannot scrape it.
- **Hardcoded Grafana datasources:** Always use provisioning files, never configure datasources manually through the UI in Docker environments.
- **Ignoring startup timing:** Grafana must wait for Prometheus to be healthy before provisioning datasources, or provisioning will fail silently.
- **Over-scraping:** Don't scrape faster than 5 seconds for container metrics or 15 seconds for application metrics without justification (wastes resources).

## Don't Hand-Roll

Problems that look simple but have existing solutions.

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Histogram bucket configuration | Custom percentile logic | prometheus.DefBuckets or predefined buckets | Percentile calculations require specific bucket boundaries, easy to get wrong |
| Dashboard JSON generation | Custom JSON builders | Grafana UI export or pre-built templates | Dashboard JSON schema is complex (20+ fields), versioned, and changes between Grafana releases |
| Service discovery | Custom scrape target management | Docker Compose DNS-based static configs | Docker provides DNS automatically, no need for dynamic discovery in compose |
| Metric naming conventions | Ad-hoc naming | Follow Prometheus naming guidelines | Metrics must end in _total (counters), use base units (_seconds, _bytes), standardized patterns |
| Grafana datasource provisioning | Manual API calls | Provisioning YAML files | Provisioning is declarative, idempotent, version-controlled, and runs on startup |
| Default metrics collection | Custom runtime metrics | collectDefaultMetrics() (Node.js), auto-collection (Python/Go) | Client libraries expose 20+ runtime metrics (GC, memory, event loop, etc.) |
| Request duration tracking | Manual timestamp tracking | Histogram with middleware | Histograms handle bucketing, percentile calculation, and aggregation automatically |

**Key insight:** Metrics instrumentation has well-established patterns and conventions. Custom solutions miss edge cases (negative durations, counter resets, label cardinality) and break standard tooling (PromQL queries, pre-built dashboards). Always use official client libraries and follow Prometheus naming conventions.

## Common Pitfalls

### Pitfall 1: Startup Race Condition (Grafana provisioning fails)
**What goes wrong:** Grafana provisions datasources before Prometheus is ready, resulting in datasource showing as "down" or dashboards displaying "No data"
**Why it happens:** Docker depends_on only waits for container start, not service readiness. Prometheus takes 5-10 seconds to become ready.
**How to avoid:**
- Use healthcheck in Prometheus service
- Configure Grafana depends_on with condition: service_healthy
- Set Prometheus healthcheck to test actual HTTP endpoint readiness
**Warning signs:** Grafana logs show "provisioning datasource failed" or datasource test fails with connection refused
**Example:**
```yaml
prometheus:
  healthcheck:
    test: ["CMD-SHELL", "wget --spider -q http://localhost:9090/-/ready || exit 1"]
    interval: 5s
    timeout: 3s
    retries: 5
    start_period: 10s

grafana:
  depends_on:
    prometheus:
      condition: service_healthy  # Critical: wait for healthy, not just started
```

### Pitfall 2: Label Cardinality Explosion
**What goes wrong:** Prometheus memory usage grows uncontrollably (multi-GB) and queries become slow or timeout
**Why it happens:** Adding labels with unbounded values (user IDs, request IDs, timestamps) creates a new time series for each unique combination. With 5 labels of 100 values each = 10 billion time series.
**How to avoid:**
- Never use high-cardinality values (IDs, emails, IPs) as labels
- Keep label value sets small (<100 unique values per label)
- Use metric relabeling to drop high-cardinality labels
- Monitor cardinality with Grafana dashboard ID 11304 (Cardinality Explorer)
**Warning signs:** Prometheus memory usage grows continuously, scrape durations increase, queries timeout
**Safe label examples:** method, status_code, service, endpoint, region, environment
**Unsafe label examples:** user_id, request_id, email, session_id, timestamp

### Pitfall 3: Missing or Incorrect Metrics Path
**What goes wrong:** Prometheus scrapes return 404, targets show "down", no metrics collected
**Why it happens:** Default metrics_path is /metrics, but some applications expose at different paths (/prometheus, /actuator/prometheus)
**How to avoid:**
- Always expose metrics at /metrics (standard convention)
- If using non-standard path, explicitly configure metrics_path in scrape config
- Verify endpoint manually: curl http://service:port/metrics
**Warning signs:** Prometheus targets page shows "GET /metrics 404" or "context deadline exceeded"

### Pitfall 4: Histogram Bucket Misconfiguration
**What goes wrong:** p95/p99 latency calculations are inaccurate or show "no data" in Grafana
**Why it happens:** Histogram buckets don't cover the actual latency range (e.g., buckets up to 1s but latencies are 5s+), or too few buckets for granularity
**How to avoid:**
- Use prometheus.DefBuckets for general-purpose histograms (.005, .01, .025, .05, .1, .25, .5, 1, 2.5, 5, 10)
- For latency, use finer buckets: [.001, .01, .1, .5, 1, 2, 5] (1ms to 5s)
- Monitor actual metric values before finalizing buckets
- Buckets are cumulative (le="1" includes everything <=1s)
**Warning signs:** histogram_quantile() returns NaN or shows flat lines in Grafana

### Pitfall 5: Prometheus Data Retention and Disk Space
**What goes wrong:** Prometheus crashes with "out of disk space" or silently stops collecting metrics
**Why it happens:** Default retention is 15 days, but on small disks (20GB) this fills up quickly with high-cardinality metrics
**How to avoid:**
- Set --storage.tsdb.retention.time flag (e.g., "7d" for 7 days)
- Monitor disk usage with node-exporter metrics
- Use --storage.tsdb.retention.size as a safety limit (e.g., "10GB")
- Estimate: ~1-2 bytes per sample, 15s interval = 5,760 samples/day/series
**Warning signs:** Prometheus logs "insufficient space" or metrics stop updating after X days

### Pitfall 6: Docker Compose Service Discovery After Scaling
**What goes wrong:** After using docker-compose up --scale web-gateway=3, Prometheus scrapes random instances and metrics show huge spikes/drops
**Why it happens:** Static config targets single DNS name, Docker load-balances across instances, each scrape hits different container
**How to avoid:**
- Don't use --scale with static targets in Prometheus
- For scaled services, use DNS service discovery (dns_sd_config) instead
- Or: Expose metrics through load balancer and scrape aggregated endpoint
- Or: Use Docker Swarm mode with docker_sd_config
**Warning signs:** Counter values reset randomly, metrics show sawtooth patterns, Prometheus shows "target changed"

### Pitfall 7: Grafana Dashboard Time Range Mismatch
**What goes wrong:** Dashboard queries timeout or show "no data" despite Prometheus having metrics
**Why it happens:** Dashboard time range is too long (e.g., "Last 30 days") for high-resolution metrics with 15s interval, causing Prometheus to load millions of samples
**How to avoid:**
- Default dashboard time range to last 1 hour or 6 hours
- Use recording rules for long-term queries (Phase 3)
- Set max_samples_per_query limit in Prometheus config
- Use coarser resolution for historical queries (rate[5m] vs rate[15s])
**Warning signs:** Queries timeout after 60s, browser console shows "query processing timeout"

## Code Examples

Verified patterns from official sources.

### Express Middleware for Comprehensive Metrics
```javascript
// Source: https://github.com/siimon/prom-client
const express = require('express');
const client = require('prom-client');

const app = express();
const register = new client.Registry();

// Enable default metrics (event loop lag, GC, memory heap, etc.)
client.collectDefaultMetrics({
  register,
  prefix: 'nodejs_',
  gcDurationBuckets: [0.001, 0.01, 0.1, 1, 2, 5]
});

// HTTP request metrics
const httpRequestCounter = new client.Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code'],
  registers: [register]
});

const httpRequestDuration = new client.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.001, 0.01, 0.1, 0.5, 1, 2, 5],
  registers: [register]
});

// Middleware to track all requests
app.use((req, res, next) => {
  const start = Date.now();

  res.on('finish', () => {
    const duration = (Date.now() - start) / 1000;
    const route = req.route?.path || req.path;

    httpRequestCounter.labels(req.method, route, res.statusCode).inc();
    httpRequestDuration.labels(req.method, route, res.statusCode).observe(duration);
  });

  next();
});

// Expose metrics endpoint
app.get('/metrics', async (req, res) => {
  res.set('Content-Type', register.contentType);
  res.end(await register.metrics());
});

app.listen(3000);
```

### Python Flask with Prometheus Metrics
```python
# Source: https://github.com/prometheus/client_python
from flask import Flask, request
from prometheus_client import Counter, Histogram, generate_latest, CONTENT_TYPE_LATEST
import time

app = Flask(__name__)

# Metrics
REQUEST_COUNT = Counter(
    'http_requests_total',
    'Total HTTP requests',
    ['method', 'endpoint', 'status_code']
)

REQUEST_DURATION = Histogram(
    'http_request_duration_seconds',
    'HTTP request duration',
    ['method', 'endpoint'],
    buckets=[0.001, 0.01, 0.1, 0.5, 1, 2, 5]
)

@app.before_request
def before_request():
    request.start_time = time.time()

@app.after_request
def after_request(response):
    duration = time.time() - request.start_time
    endpoint = request.endpoint or 'unknown'

    REQUEST_DURATION.labels(request.method, endpoint).observe(duration)
    REQUEST_COUNT.labels(request.method, endpoint, response.status_code).inc()

    return response

@app.route('/metrics')
def metrics():
    return generate_latest(), 200, {'Content-Type': CONTENT_TYPE_LATEST}

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=8000)
```

### Grafana Dashboard JSON Template
```json
{
  "dashboard": {
    "title": "Service Metrics",
    "tags": ["prometheus", "microservices"],
    "timezone": "browser",
    "refresh": "10s",
    "time": {
      "from": "now-1h",
      "to": "now"
    },
    "panels": [
      {
        "id": 1,
        "title": "Request Rate",
        "type": "graph",
        "datasource": "Prometheus",
        "targets": [
          {
            "expr": "sum(rate(http_requests_total[5m])) by (service)",
            "legendFormat": "{{service}}"
          }
        ],
        "gridPos": {"h": 8, "w": 12, "x": 0, "y": 0}
      },
      {
        "id": 2,
        "title": "Error Rate",
        "type": "graph",
        "datasource": "Prometheus",
        "targets": [
          {
            "expr": "sum(rate(http_requests_total{status_code=~\"5..\"}[5m])) by (service) / sum(rate(http_requests_total[5m])) by (service) * 100",
            "legendFormat": "{{service}} error %"
          }
        ],
        "gridPos": {"h": 8, "w": 12, "x": 12, "y": 0}
      },
      {
        "id": 3,
        "title": "p95 Latency",
        "type": "graph",
        "datasource": "Prometheus",
        "targets": [
          {
            "expr": "histogram_quantile(0.95, sum(rate(http_request_duration_seconds_bucket[5m])) by (le, service)) * 1000",
            "legendFormat": "{{service}} p95"
          }
        ],
        "yaxes": [{"format": "ms"}],
        "gridPos": {"h": 8, "w": 12, "x": 0, "y": 8}
      },
      {
        "id": 4,
        "title": "Container Memory Usage",
        "type": "graph",
        "datasource": "Prometheus",
        "targets": [
          {
            "expr": "container_memory_usage_bytes{name=~\".+\"} / 1024 / 1024",
            "legendFormat": "{{name}}"
          }
        ],
        "yaxes": [{"format": "MB"}],
        "gridPos": {"h": 8, "w": 12, "x": 12, "y": 8}
      }
    ]
  }
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Prometheus 2.x | Prometheus 3.x LTS | January 2026 | New LTS release cycle, improved performance, breaking config changes |
| Manual Grafana config | Provisioning files | Grafana v5.0 (2018) | Infrastructure-as-code, GitOps-friendly, repeatable deployments |
| Push-based metrics (StatsD) | Pull-based (Prometheus) | ~2015 | Service discovery, consistent scraping, fewer network connections |
| Percentiles in clients (Summary) | Histogram with server-side quantiles | ~2016 | Aggregatable across instances, flexible percentile calculation |
| Single Prometheus instance | Prometheus with remote write | ~2019 | Long-term storage, horizontal scalability (not needed for local dev) |

**Deprecated/outdated:**
- **Prometheus 1.x storage format:** Replaced by TSDB in 2.0 (2017), completely incompatible
- **Grafana manual datasource config in Docker:** Provisioning is standard since v5.0, manual config doesn't persist across container restarts
- **Summary metric type for latencies:** Use Histogram instead; Summaries can't be aggregated across instances
- **`collect()` method pattern:** Modern client libraries use Registry pattern with automatic collection

## Open Questions

Things that couldn't be fully resolved.

1. **Optimal scrape interval for resource-constrained environments**
   - What we know: Standard is 15s, cAdvisor recommends 5s, lower interval = more storage/CPU
   - What's unclear: Performance impact on 12GB system with 6 services
   - Recommendation: Start with 15s for apps, 10s for cAdvisor, monitor Prometheus resource usage, adjust if needed

2. **Grafana dashboard population delay ("within 60 seconds" requirement)**
   - What we know: Scrape interval + evaluation interval + dashboard refresh = total delay
   - What's unclear: Whether startup delay (container start → first scrape) counts toward 60s
   - Recommendation: Configure 15s scrape interval + 15s evaluation + 10s dashboard refresh = ~40s operational delay. Startup timing handled by healthchecks.

3. **Docker Compose service discovery for future scaling**
   - What we know: Static configs break with --scale, DNS SD requires manual configuration per service
   - What's unclear: Whether project needs scaling support (not mentioned in requirements)
   - Recommendation: Use static configs for now (simpler), document DNS SD pattern for Phase 4+ if scaling is needed

## Sources

### Primary (HIGH confidence)
- Prometheus Official Documentation - https://prometheus.io/docs/ (guides/cadvisor, guides/node-exporter, guides/go-application, configuration)
- Grafana Official Documentation - https://grafana.com/docs/grafana/latest/administration/provisioning/ (datasources, dashboards)
- GitHub prometheus/client_golang - https://github.com/prometheus/client_golang (official Go client)
- GitHub siimon/prom-client - https://github.com/siimon/prom-client (official Node.js client)
- GitHub prometheus/client_python - https://github.com/prometheus/client_python (official Python client)
- Prometheus Releases - https://github.com/prometheus/prometheus/releases (version 3.5.1 LTS)
- Grafana Releases - https://github.com/grafana/grafana/releases (version 12.3)

### Secondary (MEDIUM confidence)
- Better Stack - Prometheus Best Practices - https://betterstack.com/community/guides/monitoring/prometheus-best-practices/
- Better Stack - Node Exporter Guide - https://betterstack.com/community/guides/monitoring/monitor-linux-prometheus-node-exporter/
- Better Stack - Prometheus Golang - https://betterstack.com/community/guides/monitoring/prometheus-golang/
- Last9 - High Cardinality Metrics - https://last9.io/blog/how-to-manage-high-cardinality-metrics-in-prometheus/
- CNCF Blog - Prometheus Labels Best Practices - https://www.cncf.io/blog/2025/07/22/prometheus-labels-understanding-and-best-practices/
- Medium - Docker Compose Prometheus Grafana cAdvisor - https://medium.com/@varunjain2108/monitoring-docker-containers-with-cadvisor-prometheus-and-grafana-d101b4dbbc84
- Grafana Community Forums - Dashboard Provisioning - https://community.grafana.com/t/trouble-with-loading-dashboards-and-datasources-into-grafana-in-docker-compose/53699

### Tertiary (LOW confidence)
- WebSearch results on Prometheus memory sizing (GitHub issues, user groups) - Various recommendations, not official guidance
- WebSearch results on scrape interval optimization - Community consensus, not benchmarked for this specific setup

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Verified from official Prometheus/Grafana documentation and release pages
- Architecture: HIGH - Patterns from official guides (Prometheus/Grafana docs) and official client library repositories
- Pitfalls: MEDIUM - Mix of official documentation, community forums, and GitHub issues. Cardinality and startup timing are well-documented; scaling issues less so.

**Research date:** 2026-02-06
**Valid until:** 2026-03-06 (30 days - Prometheus/Grafana are stable, monthly Grafana releases may introduce minor changes)
