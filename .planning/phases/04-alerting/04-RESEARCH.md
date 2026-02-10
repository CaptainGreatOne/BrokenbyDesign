# Phase 4: Alerting - Research

**Researched:** 2026-02-10
**Domain:** Prometheus Alerting, Alertmanager, Webhook Integration
**Confidence:** HIGH

## Summary

Phase 4 implements a pre-configured alerting infrastructure using Prometheus alert rules and Alertmanager. The standard approach uses Prometheus to evaluate PromQL-based alert rules and send firing/resolved alerts to Alertmanager, which handles grouping, deduplication, and routing to notification receivers. The implementation includes four pre-configured alert rules (instance down, service unhealthy, high error rate, high latency) with trigger/resolve scripts for on-demand demonstration. Alertmanager routes alerts to its built-in UI (primary viewer), a webhook receiver (for logging/teaching), and a mock Slack-like notification UI (proving routing works). Grafana Alerting is enabled but not pre-configured, allowing learners to compare both alerting systems as a lab exercise.

**Research validates:** All user decisions are implementable using standard Prometheus/Alertmanager patterns. PromQL expressions for the four alert types are well-established. Webhook receivers and mock UIs have simple, lightweight implementations. Trigger scripts can use docker pause/stop or traffic manipulation.

**Primary recommendation:** Use Alertmanager v0.31.0 with file-based configuration, Python Flask or Node.js Express for webhook receiver, and static HTML+JavaScript for mock Slack UI. Alert rules in separate YAML file mounted to Prometheus. Trigger scripts using docker commands are most reliable.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Alert rule coverage:**
- Core trio only: service down, high error rate, high latency
- Additional rules deferred to lab instructions (learner writes them)
- Instance down: Prometheus `up == 0` for 1 minute (target absent)
- Service unhealthy: Custom health endpoint failure check (service running but unhealthy)
- High error rate: 5xx rate > 5% sustained for 5 minutes
- High latency: p95 > 1s sustained for 5 minutes
- Three severity levels: critical (service down), warning (error rate, latency), info (available for labs)
- Total pre-configured rules: 4 (instance down, service unhealthy, high error rate, high latency)

**Alert triggering experience:**
- Alerts can fire naturally from existing 2-5% error simulation in services
- Provide trigger scripts for on-demand demonstration of each alert type
- Auto-resolve built-in (standard Prometheus/Alertmanager behavior)
- Companion resolve scripts that explicitly restore triggered conditions
- Learner can trigger → observe → resolve → observe the full alert lifecycle

**Notification routing:**
- Alertmanager UI as primary alert viewer
- Webhook receiver: lightweight container that logs received alerts — teaches webhook integration
- Mock Slack-like notification UI: simplest possible implementation that shows alerts with timestamps and severity colors — proves routing works
- Group alerts by service name (one notification per service, not per alert)
- Silence and inhibition rules skipped — deferred to lab instructions

**Grafana integration:**
- Grafana Alerting enabled and ready for use but NOT pre-configured with rules
- Alertmanager datasource NOT pre-provisioned — learner adds it as a lab exercise
- No alert annotations on existing dashboard graphs — keep graphs clean
- No dedicated alerts dashboard pre-built — deferred to lab instructions
- Lab exercise planned: learner compares Prometheus/Alertmanager alerts vs Grafana-native alerts, rewrites existing rules in Grafana, writes new rules in either system

### Claude's Discretion

- Trigger script implementation details (which docker/traffic mechanisms reliably fire each alert)
- Webhook receiver technology choice (minimal container)
- Mock Slack UI technology and layout (simplest approach that shows alerts with timestamps + severity colors)
- Alertmanager group_wait, group_interval, repeat_interval timing values
- Exact PromQL expressions for alert rules

### Deferred Ideas (OUT OF SCOPE)

- Additional alert rules (memory pressure, queue depth, log error spikes) — lab instructions
- Silence and inhibition rule configuration — lab instructions
- Dedicated Grafana alerts dashboard — lab instructions
- Alert annotations on time-series graphs — future consideration
</user_constraints>

## Standard Stack

The established libraries/tools for Prometheus alerting:

### Core

| Component | Version | Purpose | Why Standard |
|-----------|---------|---------|--------------|
| Prometheus | v3.5.1 (existing) | Alert rule evaluation and firing | De facto standard for metrics-based alerting |
| Alertmanager | v0.31.0 | Alert grouping, deduplication, routing, silencing | Official Prometheus component, latest stable release (Feb 2026) |
| PromQL | N/A | Alert rule expression language | Prometheus's native query language |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Python Flask | 3.x | Webhook receiver implementation | Minimal, well-understood web framework |
| Node.js Express | 4.x | Alternative webhook receiver | If polyglot consistency preferred |
| Static HTML/JS | N/A | Mock notification UI | Simplest approach, no build step |
| amtool | (bundled with Alertmanager) | Configuration testing, alert simulation | CLI tool for testing alertmanager.yml |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Alertmanager | Grafana Alerting only | Alertmanager is better for teaching separation of concerns; Grafana Alerting couples alerting with dashboards |
| Flask webhook | Go HTTP server | Go is more lightweight but Flask is simpler for learners unfamiliar with Go |
| Static HTML UI | React/Vue component | Framework adds complexity; static HTML teaches fundamentals |

**Installation:**
```bash
# Alertmanager via Docker
docker pull prom/alertmanager:v0.31.0

# Webhook receiver dependencies (Python)
pip install flask==3.0.0

# Webhook receiver dependencies (Node.js)
npm install express@4.18.2
```

## Architecture Patterns

### Recommended Project Structure

```
alerting/
├── prometheus/
│   ├── prometheus.yml              # Existing Prometheus config
│   └── alerts/
│       └── service-alerts.yml      # Alert rules file
├── alertmanager/
│   ├── alertmanager.yml            # Alertmanager config (routing, receivers)
│   └── templates/                  # (Optional) Custom notification templates
├── webhook-receiver/
│   ├── Dockerfile
│   ├── requirements.txt (or package.json)
│   └── app.py (or app.js)          # Webhook endpoint that logs alerts
├── mock-slack-ui/
│   ├── Dockerfile (nginx:alpine)
│   ├── index.html                  # Static notification display
│   └── alerts.js                   # Fetch alerts from webhook receiver API
└── scripts/
    ├── trigger-instance-down.sh
    ├── resolve-instance-down.sh
    ├── trigger-high-error-rate.sh
    ├── resolve-high-error-rate.sh
    ├── trigger-high-latency.sh
    └── resolve-high-latency.sh
```

### Pattern 1: Alert Rule Definition

**What:** Prometheus alert rules use PromQL expressions evaluated at `evaluation_interval` (default 15s). When expression is true for `for` duration, alert transitions from pending → firing.

**When to use:** All metric-based alerting scenarios.

**Example:**
```yaml
# Source: https://prometheus.io/docs/prometheus/latest/configuration/alerting_rules/
groups:
  - name: service_alerts
    interval: 15s
    rules:
      - alert: InstanceDown
        expr: up == 0
        for: 1m
        labels:
          severity: critical
          service: "{{ $labels.job }}"
        annotations:
          summary: "Instance {{ $labels.instance }} down"
          description: "{{ $labels.job }} instance {{ $labels.instance }} has been down for more than 1 minute."

      - alert: HighErrorRate
        expr: |
          sum by (job) (rate(http_requests_total{status_code=~"5.."}[5m]))
          /
          sum by (job) (rate(http_requests_total[5m]))
          > 0.05
        for: 5m
        labels:
          severity: warning
          service: "{{ $labels.job }}"
        annotations:
          summary: "High 5xx error rate on {{ $labels.job }}"
          description: "{{ $labels.job }} has {{ $value | humanizePercentage }} 5xx errors over the last 5 minutes."

      - alert: HighLatency
        expr: |
          histogram_quantile(0.95,
            sum by (job, le) (rate(http_request_duration_seconds_bucket[5m]))
          ) > 1
        for: 5m
        labels:
          severity: warning
          service: "{{ $labels.job }}"
        annotations:
          summary: "High latency on {{ $labels.job }}"
          description: "{{ $labels.job }} p95 latency is {{ $value }}s (threshold: 1s)."
```

**Key insights:**
- `up == 0` is the standard service-down check (Prometheus auto-generates `up` metric for all scrape targets)
- Error rate calculation: `rate(errors) / rate(total_requests)` over time window
- `histogram_quantile(0.95, ...)` calculates p95 from histogram buckets with `le` label
- `for` clause prevents flapping from transient spikes
- Template variables: `{{ $labels.job }}`, `{{ $value }}`, `{{ $labels.instance }}`

### Pattern 2: Alertmanager Configuration

**What:** Alertmanager receives alerts from Prometheus, applies grouping/deduplication, routes to receivers.

**When to use:** All scenarios requiring notification routing, grouping, or multiple receivers.

**Example:**
```yaml
# Source: https://prometheus.io/docs/alerting/latest/configuration/
global:
  resolve_timeout: 5m

route:
  # Root route - catches all alerts
  receiver: 'default-receiver'
  group_by: ['alertname', 'service']
  group_wait: 10s           # Wait before sending first notification for new group
  group_interval: 5m        # Wait before sending updates for existing group
  repeat_interval: 4h       # Wait before repeating last notification

  routes:
    # Critical alerts get faster notification
    - match:
        severity: critical
      receiver: 'critical-receiver'
      group_wait: 5s
      group_interval: 2m
      repeat_interval: 1h

receivers:
  - name: 'default-receiver'
    webhook_configs:
      - url: 'http://webhook-receiver:5000/alerts'
        send_resolved: true
      - url: 'http://mock-slack-ui:8080/webhook'
        send_resolved: true

  - name: 'critical-receiver'
    webhook_configs:
      - url: 'http://webhook-receiver:5000/alerts'
        send_resolved: true
      - url: 'http://mock-slack-ui:8080/webhook'
        send_resolved: true

inhibit_rules: []  # Skipped per user requirements
```

**Timing best practices:**
- `group_wait`: 10-30s for normal alerts, 5-10s for critical (balance speed vs. grouping)
- `group_interval`: 5m standard, 1-2m for critical (updates to existing groups)
- `repeat_interval`: 4h standard, 1h for critical (must be multiple of group_interval)
- Critical alerts use shorter intervals for faster visibility
- Source: [How to Create Alert Grouping Strategies](https://oneuptime.com/blog/post/2026-01-30-alert-grouping-strategies/view)

### Pattern 3: Webhook Receiver Implementation

**What:** Lightweight HTTP server that receives Alertmanager webhook POSTs and logs alert payloads.

**When to use:** Teaching webhook integration, persisting alert history, custom routing logic.

**Example (Python Flask):**
```python
# Source: https://github.com/ruanbekker/webhook-for-alertmanager
from flask import Flask, request, jsonify
import json
import logging

app = Flask(__name__)
logging.basicConfig(level=logging.INFO)

@app.route('/alerts', methods=['POST'])
def receive_alert():
    """Receive alerts from Alertmanager."""
    try:
        alert_data = request.json

        # Log full payload
        logging.info(f"Received alert: {json.dumps(alert_data, indent=2)}")

        # Extract key info
        status = alert_data.get('status')
        alerts = alert_data.get('alerts', [])

        for alert in alerts:
            alertname = alert['labels'].get('alertname')
            severity = alert['labels'].get('severity')
            summary = alert['annotations'].get('summary')
            logging.info(f"Alert: {alertname} | Severity: {severity} | Status: {status} | Summary: {summary}")

        return jsonify({'status': 'success'}), 200

    except Exception as e:
        logging.error(f"Error processing alert: {str(e)}")
        return jsonify({'status': 'error', 'message': str(e)}), 500

@app.route('/health', methods=['GET'])
def health():
    return jsonify({'status': 'healthy'}), 200

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)
```

**Alertmanager webhook payload format:**
```json
{
  "version": "4",
  "groupKey": "<string>",
  "truncatedAlerts": 0,
  "status": "firing",
  "receiver": "default-receiver",
  "groupLabels": {
    "alertname": "HighErrorRate",
    "service": "web-gateway"
  },
  "commonLabels": {
    "alertname": "HighErrorRate",
    "severity": "warning",
    "service": "web-gateway"
  },
  "commonAnnotations": {
    "summary": "High 5xx error rate on web-gateway",
    "description": "web-gateway has 8.5% 5xx errors over the last 5 minutes."
  },
  "externalURL": "http://alertmanager:9093",
  "alerts": [
    {
      "status": "firing",
      "labels": {
        "alertname": "HighErrorRate",
        "severity": "warning",
        "service": "web-gateway"
      },
      "annotations": {
        "summary": "High 5xx error rate on web-gateway",
        "description": "web-gateway has 8.5% 5xx errors over the last 5 minutes."
      },
      "startsAt": "2026-02-10T10:15:00Z",
      "endsAt": "0001-01-01T00:00:00Z",
      "generatorURL": "http://prometheus:9090/graph?g0.expr=...",
      "fingerprint": "abc123def456"
    }
  ]
}
```

**Key fields:**
- `status`: "firing" or "resolved"
- `groupLabels`: Labels used for grouping (from `group_by`)
- `alerts[]`: Array of individual alerts in this group
- `startsAt`: When alert started firing
- `endsAt`: When alert resolved (0001-01-01 means still firing)

### Pattern 4: Mock Slack UI

**What:** Static HTML page that displays alerts in a Slack-like interface with color-coded severity.

**When to use:** Demonstrating notification routing without external service dependencies.

**Example (index.html):**
```html
<!DOCTYPE html>
<html>
<head>
    <title>Alert Notifications</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; background: #f4f4f4; }
        .alert {
            padding: 15px;
            margin: 10px 0;
            border-radius: 5px;
            border-left: 5px solid;
        }
        .critical {
            background: #ffebee;
            border-color: #d32f2f;
            color: #b71c1c;
        }
        .warning {
            background: #fff3e0;
            border-color: #f57c00;
            color: #e65100;
        }
        .info {
            background: #e3f2fd;
            border-color: #1976d2;
            color: #0d47a1;
        }
        .resolved {
            background: #e8f5e9;
            border-color: #388e3c;
            color: #1b5e20;
        }
        .timestamp { font-size: 0.85em; color: #666; }
        .service { font-weight: bold; }
    </style>
</head>
<body>
    <h1>🔔 Alert Notifications</h1>
    <div id="alerts"></div>

    <script>
        // In real implementation, this would poll webhook-receiver API or use SSE
        // For demo purposes, shown with mock data
        const mockAlerts = [
            {
                alertname: 'InstanceDown',
                severity: 'critical',
                service: 'order-api',
                summary: 'Instance order-api:8000 down',
                status: 'firing',
                timestamp: '2026-02-10T10:15:00Z'
            },
            {
                alertname: 'HighErrorRate',
                severity: 'warning',
                service: 'web-gateway',
                summary: 'High 5xx error rate on web-gateway',
                status: 'firing',
                timestamp: '2026-02-10T10:16:30Z'
            },
            {
                alertname: 'InstanceDown',
                severity: 'critical',
                service: 'order-api',
                summary: 'Instance order-api:8000 down',
                status: 'resolved',
                timestamp: '2026-02-10T10:20:00Z'
            }
        ];

        function renderAlerts(alerts) {
            const container = document.getElementById('alerts');
            container.innerHTML = alerts.map(alert => {
                const cssClass = alert.status === 'resolved' ? 'resolved' : alert.severity;
                const statusEmoji = alert.status === 'firing' ? '🔥' : '✅';
                return `
                    <div class="alert ${cssClass}">
                        <div class="service">${statusEmoji} ${alert.service} - ${alert.alertname}</div>
                        <div>${alert.summary}</div>
                        <div class="timestamp">${new Date(alert.timestamp).toLocaleString()}</div>
                    </div>
                `;
            }).join('');
        }

        renderAlerts(mockAlerts);
    </script>
</body>
</html>
```

**Production approach:** Webhook receiver stores alerts in memory (list), exposes `/api/alerts` endpoint, mock UI polls this endpoint every 5s or uses Server-Sent Events.

### Pattern 5: Trigger Scripts

**What:** Bash scripts that manipulate containers or traffic to trigger specific alert conditions.

**When to use:** On-demand alert demonstration for learning/testing.

**Example (trigger-instance-down.sh):**
```bash
#!/bin/bash
# Trigger InstanceDown alert by pausing a container

SERVICE=${1:-order-api}

echo "Pausing $SERVICE container to trigger InstanceDown alert..."
docker pause $SERVICE

echo "Alert will fire after ~1 minute (Prometheus scrape + 'for' duration)"
echo "Check Alertmanager UI: http://localhost:9093"
echo "To resolve: ./scripts/resolve-instance-down.sh $SERVICE"
```

**Example (resolve-instance-down.sh):**
```bash
#!/bin/bash
# Resolve InstanceDown alert by unpausing container

SERVICE=${1:-order-api}

echo "Unpausing $SERVICE container..."
docker unpause $SERVICE

echo "Alert will resolve after next Prometheus scrape (~15s)"
echo "Check Alertmanager UI: http://localhost:9093"
```

**Example (trigger-high-error-rate.sh):**
```bash
#!/bin/bash
# Trigger HighErrorRate by stopping a dependency temporarily

echo "Stopping postgres to cause 5xx errors in order-api..."
docker stop postgres

echo "Traffic generator will cause sustained 5xx errors"
echo "Alert will fire after ~5 minutes (sustained 'for' duration)"
echo "To resolve: ./scripts/resolve-high-error-rate.sh"
```

**Docker manipulation techniques:**
- `docker pause <service>`: Freezes container, Prometheus scrape fails → `up == 0` → InstanceDown
- `docker stop <service>`: Same effect but container exits
- `docker stop <dependency>`: Causes service errors → HighErrorRate
- Preferred: `docker pause` over `stop` for faster recovery and no restart overhead
- Source: [Docker container pause docs](https://docs.docker.com/reference/cli/docker/container/pause/)

**Alternative approach for latency:** Inject network delay using `tc` (traffic control) on container interface, but this is complex and requires privileged containers. Docker pause/stop is simpler and sufficient.

### Anti-Patterns to Avoid

- **Alert on every metric spike:** Use `for` clause to wait for sustained conditions (prevents flapping)
- **Too many alert rules:** Start with core trio (down, errors, latency), add more based on real incidents
- **Generic alert messages:** Use template variables for actionable annotations: `"{{ $labels.instance }} down"` not `"Service down"`
- **Ignoring resolved notifications:** Set `send_resolved: true` in webhook configs so learners see full lifecycle
- **Complex PromQL in first iteration:** Start with simple expressions (`up == 0`), refine after testing

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Alert grouping & deduplication | Custom alert aggregator | Alertmanager | Handles complex grouping, time windows, fingerprinting; proven at scale |
| Alert routing logic | If/else trees in code | Alertmanager routing tree | Declarative YAML routing with matchers, inheritance, fallbacks |
| Notification retry/backoff | Manual retry loops | Alertmanager built-in retry | Exponential backoff, max attempts, per-receiver configuration |
| Alert silencing | Database of muted alerts | Alertmanager silences | Time-based, label-matcher based, API and UI support |
| Histogram quantile calculation | Manual bucket interpolation | `histogram_quantile()` function | Linear interpolation across buckets, handles edge cases correctly |

**Key insight:** Prometheus + Alertmanager is a mature alerting stack (10+ years) with edge cases already solved. Custom solutions introduce bugs around time handling, deduplication, and retry logic. Use the standard stack unless you have specific requirements it can't meet.

## Common Pitfalls

### Pitfall 1: Alert Rule PromQL Mistakes

**What goes wrong:** Alert doesn't fire when expected, or fires incorrectly.

**Why it happens:**
- Forgetting to use `rate()` for counter metrics: `http_requests_total` (counter) needs `rate(http_requests_total[5m])` not raw value
- Wrong histogram quantile syntax: Missing `le` label in `group by` causes incorrect p95 calculation
- Using instant vector where range vector needed: `http_requests_total[5m]` can't be used directly in comparisons

**How to avoid:**
- Test expressions in Prometheus UI before adding to alert rules
- Counters always use `rate()` or `increase()`
- Histogram quantiles must group by `le`: `histogram_quantile(0.95, sum by (job, le) (rate(...))`
- Use `for` clause to wait for sustained conditions (reduces false positives)

**Warning signs:**
- Alert never fires even when manually testing condition
- Alert shows "no data" in Alertmanager
- Alert fires/resolves rapidly (flapping)

### Pitfall 2: Prometheus Config Not Reloaded

**What goes wrong:** New alert rules don't appear, or changes don't take effect.

**Why it happens:** Prometheus reads `prometheus.yml` and alert rule files only at startup or manual reload.

**How to avoid:**
- Reload Prometheus after config changes: `curl -X POST http://localhost:9090/-/reload` (requires `--web.enable-lifecycle` flag)
- Or restart Prometheus container: `docker restart prometheus`
- Use `promtool check rules <file>` to validate syntax before reloading
- Verify rules loaded: Check Prometheus UI → Status → Rules

**Warning signs:**
- Alert rules don't appear in Prometheus UI
- Old alert thresholds still apply after editing
- Prometheus logs show config parse errors

### Pitfall 3: Alertmanager Webhook Receiver Returns Non-200

**What goes wrong:** Alertmanager stops sending alerts to webhook receiver, retries pile up.

**Why it happens:**
- Webhook endpoint crashes, returns 500 error
- Endpoint returns non-2xx status code (Alertmanager expects 200-299)
- Slow endpoint times out

**How to avoid:**
- Always return 200 OK from webhook endpoint, even if processing fails internally
- Process alerts asynchronously if needed (don't block webhook response)
- Add timeout and error handling in webhook receiver
- Monitor webhook receiver health endpoint

**Warning signs:**
- Alertmanager logs show "failed to notify webhook"
- Alerts appear in Alertmanager UI but not in webhook receiver logs
- Webhook receiver logs show no recent requests

### Pitfall 4: Alert Fatigue from Inappropriate `for` Duration

**What goes wrong:** Alerts fire too frequently (transient spikes) or too slowly (delayed response to real issues).

**Why it happens:**
- No `for` clause: Alert fires immediately on single scrape meeting condition
- `for` too short: Transient spikes (e.g., 30s) cause false alerts
- `for` too long: Real incidents delayed (e.g., service down for 10m before alert)

**How to avoid:**
- Instance down: 1m `for` (fast detection, scrape failures are serious)
- High error rate: 5m `for` (sustained problem, not transient spike)
- High latency: 5m `for` (sustained problem)
- Test alert firing by manually triggering conditions

**Warning signs:**
- Alerts fire and resolve within seconds (flapping)
- Team ignores alerts due to false positives
- Real incidents go undetected for too long

### Pitfall 5: Grouping Labels Don't Match Alert Labels

**What goes wrong:** Alerts aren't grouped as expected, each alert becomes its own notification.

**Why it happens:** `group_by` labels in alertmanager.yml don't exist on alert labels.

**How to avoid:**
- Ensure `group_by` labels exist on all alerts: `group_by: ['alertname', 'service']` requires `service` label
- Common grouping labels: `alertname`, `service`, `severity`, `job`, `instance`
- Use `group_by: ['...']` to group by all labels (for testing)
- Check Alertmanager UI → Groups to see actual grouping

**Warning signs:**
- One notification per alert instead of grouped
- Alertmanager shows many groups with single alert each

## Code Examples

Verified patterns from official sources:

### Complete Alert Rules File

```yaml
# File: prometheus/alerts/service-alerts.yml
# Mount to Prometheus: /etc/prometheus/alerts/service-alerts.yml
# Source: https://prometheus.io/docs/prometheus/latest/configuration/alerting_rules/

groups:
  - name: service_health
    interval: 15s
    rules:
      # 1. Instance Down - Service completely unreachable
      - alert: InstanceDown
        expr: up == 0
        for: 1m
        labels:
          severity: critical
          service: "{{ $labels.job }}"
        annotations:
          summary: "Instance {{ $labels.instance }} is down"
          description: "{{ $labels.job }} instance {{ $labels.instance }} has been unreachable for more than 1 minute."

      # 2. Service Unhealthy - Instance reachable but health check fails
      # Note: Requires health endpoint to export a metric like 'up{health="unhealthy"}'
      # or custom metric like 'service_healthy{} == 0'
      - alert: ServiceUnhealthy
        expr: up{job=~"web-gateway|order-api|fulfillment-worker"} == 1 and on(instance, job) service_healthy == 0
        for: 1m
        labels:
          severity: critical
          service: "{{ $labels.job }}"
        annotations:
          summary: "Service {{ $labels.job }} is unhealthy"
          description: "{{ $labels.job }} instance {{ $labels.instance }} is running but failing health checks."

      # 3. High Error Rate - Too many 5xx responses
      - alert: HighErrorRate
        expr: |
          (
            sum by (job) (rate(http_requests_total{status_code=~"5.."}[5m]))
            /
            sum by (job) (rate(http_requests_total[5m]))
          ) > 0.05
        for: 5m
        labels:
          severity: warning
          service: "{{ $labels.job }}"
        annotations:
          summary: "High error rate on {{ $labels.job }}"
          description: "{{ $labels.job }} has {{ $value | humanizePercentage }} 5xx errors (threshold: 5%)."

      # 4. High Latency - p95 latency exceeds threshold
      - alert: HighLatency
        expr: |
          histogram_quantile(0.95,
            sum by (job, le) (rate(http_request_duration_seconds_bucket[5m]))
          ) > 1
        for: 5m
        labels:
          severity: warning
          service: "{{ $labels.job }}"
        annotations:
          summary: "High latency on {{ $labels.job }}"
          description: "{{ $labels.job }} p95 latency is {{ $value | humanizeDuration }} (threshold: 1s)."
```

**Note on ServiceUnhealthy alert:** Requires services to export a `service_healthy` metric (0=unhealthy, 1=healthy). Alternatively, can use probe_success metric from Blackbox Exporter probing /health endpoints, but that's out of scope. Simpler approach: Services export `service_healthy` gauge.

### Prometheus Configuration with Alert Rules

```yaml
# File: prometheus/prometheus.yml
# Add to existing config:

global:
  scrape_interval: 15s
  evaluation_interval: 15s  # How often to evaluate alert rules

# Alert rule files
rule_files:
  - '/etc/prometheus/alerts/*.yml'

# Alertmanager configuration
alerting:
  alertmanagers:
    - static_configs:
        - targets:
            - 'alertmanager:9093'
```

### Complete Alertmanager Configuration

```yaml
# File: alertmanager/alertmanager.yml
# Source: https://prometheus.io/docs/alerting/latest/configuration/

global:
  resolve_timeout: 5m

route:
  # Root route receives all alerts
  receiver: 'all-receivers'
  group_by: ['alertname', 'service']
  group_wait: 10s           # Wait 10s to collect related alerts before sending
  group_interval: 5m        # Send updates every 5m for existing groups
  repeat_interval: 4h       # Repeat notification every 4h if still firing

  # Child routes for specific severities
  routes:
    - match:
        severity: critical
      receiver: 'critical-receivers'
      group_wait: 5s          # Faster notification for critical alerts
      group_interval: 2m
      repeat_interval: 1h

receivers:
  - name: 'all-receivers'
    webhook_configs:
      - url: 'http://webhook-receiver:5000/alerts'
        send_resolved: true
        max_alerts: 0  # Include all alerts in webhook (0 = unlimited)
      - url: 'http://mock-slack-ui:8080/webhook'
        send_resolved: true

  - name: 'critical-receivers'
    webhook_configs:
      - url: 'http://webhook-receiver:5000/alerts'
        send_resolved: true
      - url: 'http://mock-slack-ui:8080/webhook'
        send_resolved: true

inhibit_rules: []  # Empty per user requirements
```

### Docker Compose Alerting Stack

```yaml
# File: docker-compose.yml
# Add to existing services:

  alertmanager:
    image: prom/alertmanager:v0.31.0
    container_name: alertmanager
    restart: unless-stopped
    volumes:
      - ./alertmanager/alertmanager.yml:/etc/alertmanager/alertmanager.yml:ro
      - alertmanager-data:/alertmanager
    command:
      - '--config.file=/etc/alertmanager/alertmanager.yml'
      - '--storage.path=/alertmanager'
      - '--web.external-url=http://localhost:9093'
    ports:
      - "9093:9093"
    depends_on:
      prometheus:
        condition: service_healthy
    healthcheck:
      test: ["CMD-SHELL", "wget --spider -q http://localhost:9093/-/healthy || exit 1"]
      interval: 5s
      timeout: 3s
      retries: 3
      start_period: 10s
    deploy:
      resources:
        limits:
          memory: 256M
          cpus: '0.5'

  webhook-receiver:
    build: ./webhook-receiver
    container_name: webhook-receiver
    restart: unless-stopped
    ports:
      - "5000:5000"
    depends_on:
      alertmanager:
        condition: service_healthy
    deploy:
      resources:
        limits:
          memory: 128M
          cpus: '0.25'

  mock-slack-ui:
    image: nginx:alpine
    container_name: mock-slack-ui
    restart: unless-stopped
    volumes:
      - ./mock-slack-ui:/usr/share/nginx/html:ro
    ports:
      - "8080:80"
    deploy:
      resources:
        limits:
          memory: 64M
          cpus: '0.25'

volumes:
  alertmanager-data:
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| One Alertmanager per Prometheus | Clustered Alertmanager with HA | 2018 (Alertmanager 0.15) | Multiple Alertmanagers deduplicate alerts, preventing duplicate notifications |
| Recording rules for alert queries | Direct alert expressions | N/A | Recording rules still useful for complex/expensive queries, but simple alerts don't need them |
| Email-only notifications | Webhook-based integrations | 2016 | Flexible routing to Slack, PagerDuty, OpsGenie, custom systems |
| Prometheus built-in UI | Dedicated Alertmanager UI | 2016 (Alertmanager released) | Better alert management, silencing, grouping visualization |
| `absent()` for service down | `up == 0` | Always preferred | `up` metric is automatically generated, `absent()` is for missing metrics |

**Deprecated/outdated:**
- Prometheus v1.x alert syntax (pre-2017): Used `ALERT` keyword instead of YAML `alert:` field
- Alertmanager v0.x mesh clustering: Replaced with gossip protocol in 0.5+ (2016)
- `external_labels` for alert routing: Use alert labels directly, external_labels is for federation

**Current best practices (2026):**
- Prometheus 3.x with improved query performance for complex alert expressions
- Alertmanager 0.31.x with enhanced webhook retry logic and API improvements
- Histogram-based SLO alerting (burn rate alerts) for sophisticated SLA monitoring (out of scope for this phase)

## Open Questions

Things that couldn't be fully resolved:

1. **Service health metric implementation**
   - What we know: ServiceUnhealthy alert requires services to export `service_healthy` gauge (0/1)
   - What's unclear: Current services have /health endpoints but may not expose as Prometheus metric
   - Recommendation: Add `service_healthy` gauge to each service's metrics, set by /health endpoint logic. Alternatively, simplify to only use InstanceDown alert (simpler for Phase 4).

2. **Mock Slack UI polling vs push**
   - What we know: Static HTML needs to fetch alerts from somewhere
   - What's unclear: Best approach for Phase 4 simplicity: (A) Mock UI polls webhook-receiver API, (B) Mock UI has its own webhook endpoint and stores alerts in memory, (C) Mock UI just shows static mock data
   - Recommendation: Option B (mock UI receives webhooks, stores in memory, serves API). Simplest to implement and teaches full webhook flow. Option A requires webhook-receiver to expose API. Option C doesn't teach anything.

3. **Error rate metric label names**
   - What we know: Alert rule assumes `http_requests_total{status_code="5xx"}`
   - What's unclear: Existing services use `status_code` label (web-gateway, order-api uses `status`, fulfillment-worker doesn't expose HTTP metrics)
   - Recommendation: Verify label names in existing metrics, adjust alert rule PromQL to match. May need separate alert rules per service if label names differ.

## Sources

### Primary (HIGH confidence)

- [Prometheus Alerting Rules Documentation](https://prometheus.io/docs/prometheus/latest/configuration/alerting_rules/) - Alert rule syntax and structure
- [Alertmanager Configuration Documentation](https://prometheus.io/docs/alerting/latest/configuration/) - Complete config reference, webhook payload format
- [Prometheus Histograms and Summaries](https://prometheus.io/docs/practices/histograms/) - Histogram quantile usage
- [Prometheus Query Functions](https://prometheus.io/docs/prometheus/latest/querying/functions/) - histogram_quantile() function reference
- [Docker Hub: prom/alertmanager](https://hub.docker.com/r/prom/alertmanager) - Official Alertmanager v0.31.0 image
- [Docker container pause documentation](https://docs.docker.com/reference/cli/docker/container/pause/) - Container manipulation for trigger scripts
- [Grafana Alertmanager Datasource Documentation](https://grafana.com/docs/grafana/latest/datasources/alertmanager/) - Alertmanager datasource provisioning

### Secondary (MEDIUM confidence)

- [Awesome Prometheus Alerts](https://samber.github.io/awesome-prometheus-alerts/rules.html) - Community alert rule examples verified against official docs
- [Prometheus Alertmanager GitHub](https://github.com/prometheus/alertmanager/releases) - Version 0.31.0 release notes
- [Basic Python Flask Webhook for Alertmanager](https://github.com/ruanbekker/webhook-for-alertmanager) - Flask webhook implementation pattern
- [What's the difference between group_interval, group_wait, and repeat_interval?](https://www.robustperception.io/whats-the-difference-between-group_interval-group_wait-and-repeat_interval/) - Timing parameter explanation
- [How to Create Alert Grouping Strategies](https://oneuptime.com/blog/post/2026-01-30-alert-grouping-strategies/view) - Grouping best practices
- [Effective Alerting with Prometheus Alertmanager](https://betterstack.com/community/guides/monitoring/prometheus-alertmanager/) - Setup guide and patterns
- [Grafana Alerting vs Prometheus Alertmanager comparison](https://alexandre-vazquez.com/grafana-alerting-vs-alert-manager/) - Comparison of both systems
- [How to Calculate 95th Percentile in Prometheus](https://signoz.io/guides/how-to-get-the-95th-percentile-of-an-average-in-prometheus/) - histogram_quantile() usage
- [Send dummy alert to Alertmanager](https://gist.github.com/cherti/61ec48deaaab7d288c9fcf17e700853a) - Alert testing with curl

### Tertiary (LOW confidence)

- [Node.js Express webhook receiver guides](https://reintech.io/blog/how-to-use-node-js-to-create-a-webhook-receiver) - Alternative implementation
- [Docker container lifecycle](https://last9.io/blog/docker-container-lifecycle/) - Container state management

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Official Prometheus/Alertmanager docs, Docker Hub
- Architecture: HIGH - Official docs for alert rules, Alertmanager config, webhook format
- Pitfalls: MEDIUM - Mix of official docs and community experience (Robust Perception blog)
- PromQL expressions: HIGH - Verified against official query function docs and Awesome Prometheus Alerts
- Grafana integration: HIGH - Official Grafana documentation for Alertmanager datasource
- Trigger scripts: MEDIUM - Docker pause/stop is documented, but specific alert triggering is experiential
- Webhook receiver: MEDIUM - Community implementations verified against webhook payload format

**Research date:** 2026-02-10
**Valid until:** 2026-03-10 (30 days - stable domain, Prometheus/Alertmanager changes infrequently)
