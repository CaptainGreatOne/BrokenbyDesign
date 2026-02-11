  What Built in Phase 4                                                                                                                            
                                                                                                                                                                
  Phase 4 creates a complete alert pipeline — the system that detects problems and tells you about them. It has four layers:                                      
                                                                                                                                                                  
  1. Service Health Gauges (Plan 04-01)

  Each of the three application services now exposes a service_healthy Prometheus metric:

  - web-gateway (services/web-gateway/src/metrics.js:34) — prom-client Gauge, updated on each /health call
  - order-api (services/order-api/src/metrics.py:28) — prometheus-client Gauge, set to 1 at startup
  - fulfillment-worker (services/fulfillment-worker/internal/metrics/metrics.go:43) — promauto Gauge, set to 1 at startup

  The gauge reads 1 when healthy, 0 when degraded. This enables a key distinction: InstanceDown (Prometheus can't reach the service at all) vs ServiceUnhealthy
  (service is running but reporting problems).

  2. Notification Receivers (Plan 04-02)

  Two lightweight Flask services that receive webhook POSTs from Alertmanager:

  - webhook-receiver (webhook-receiver/app.py) — accepts POST /alerts, logs each alert to stdout, stores up to 100 in memory, exposes GET /api/alerts to retrieve
  them as JSON
  - mock-slack-ui (mock-slack-ui/server.py + static/index.html) — accepts POST /webhook, stores up to 200 alerts, serves a browser UI that polls every 5 seconds
  and displays alerts with severity color coding (critical=red, warning=orange, resolved=green)

  3. Alert Rules (Plan 04-03)

  Four PromQL rules in prometheus/alerts/service-alerts.yml, evaluated every 15 seconds:
  ┌──────────────────┬──────────────────────────────┬─────────────────────────────────────┬──────────┐
  │       Rule       │          Expression          │             Fires when              │ Severity │
  ├──────────────────┼──────────────────────────────┼─────────────────────────────────────┼──────────┤
  │ InstanceDown     │ up == 0                      │ Service unreachable for 1m          │ critical │
  ├──────────────────┼──────────────────────────────┼─────────────────────────────────────┼──────────┤
  │ ServiceUnhealthy │ service_healthy == 0         │ Service running but degraded for 1m │ critical │
  ├──────────────────┼──────────────────────────────┼─────────────────────────────────────┼──────────┤
  │ HighErrorRate    │ 5xx rate / total rate > 0.05 │ >5% errors for 5m                   │ warning  │
  ├──────────────────┼──────────────────────────────┼─────────────────────────────────────┼──────────┤
  │ HighLatency      │ p95 latency > 1s             │ p95 > 1 second for 5m               │ warning  │
  └──────────────────┴──────────────────────────────┴─────────────────────────────────────┴──────────┘
  HighErrorRate and HighLatency target http_requests_total and http_request_duration_seconds_bucket from web-gateway (the HTTP entry point).

  4. Alertmanager Routing (alertmanager/alertmanager.yml)

  Alertmanager groups alerts by [alertname, service] and routes them:

  - Critical alerts (InstanceDown, ServiceUnhealthy): 5s group wait, 1h repeat — fast notification
  - Warning alerts (HighErrorRate, HighLatency): 10s group wait, 4h repeat — less aggressive

  Both severity levels route to both webhook-receiver and mock-slack-ui.

  ---
  How to View It

  After docker compose up -d, these UIs are available:
  ┌──────────────────────────────────┬───────────────────────────────────────────────────────────────────────────────────┐
  │               URL                │                                   What you see                                    │
  ├──────────────────────────────────┼───────────────────────────────────────────────────────────────────────────────────┤
  │ http://localhost:9093            │ Alertmanager UI — current firing alerts, silences, alert groups                   │
  ├──────────────────────────────────┼───────────────────────────────────────────────────────────────────────────────────┤
  │ http://localhost:9090/alerts     │ Prometheus alert rules — all 4 rules with current state (inactive/pending/firing) │
  ├──────────────────────────────────┼───────────────────────────────────────────────────────────────────────────────────┤
  │ http://localhost:8085            │ Mock Slack UI — color-coded alert cards with auto-refresh                         │
  ├──────────────────────────────────┼───────────────────────────────────────────────────────────────────────────────────┤
  │ http://localhost:5001/api/alerts │ Webhook receiver JSON API — raw alert payloads                                    │
  ├──────────────────────────────────┼───────────────────────────────────────────────────────────────────────────────────┤
  │ http://localhost:3001            │ Grafana — can explore alert-related metrics                                       │
  └──────────────────────────────────┴───────────────────────────────────────────────────────────────────────────────────┘
  What to look at in each:

  Prometheus (:9090/alerts) — Shows all four rules. Under normal conditions they'll all say "inactive" (green). This is where rules are evaluated.

  Alertmanager (:9093) — Shows alerts that have fired. Under normal conditions this will be empty. This is where alerts are grouped, deduplicated, and routed.

  Mock Slack UI (:8085) — Shows alert notifications as they arrive. Color-coded cards. Under normal conditions, empty with "No alerts received yet."

  ---
  How to Use It / Trigger Alerts

  Under normal operation, all services are healthy and no alerts fire. To see the system in action:

  Trigger an InstanceDown alert (easiest):
  # Stop a service — Prometheus can't scrape it anymore
  docker compose stop order-api

  # Wait ~1 minute (the `for: 1m` threshold)
  # Then check:
  # - http://localhost:9090/alerts  → InstanceDown shows "firing"
  # - http://localhost:9093         → alert appears in Alertmanager
  # - http://localhost:8085         → red card appears in mock Slack UI

  # Restore it:
  docker compose start order-api
  # After ~5 minutes (resolve_timeout), a green "RESOLVED" card appears

  Check the webhook receiver logs:
  docker compose logs webhook-receiver
  # You'll see: ALERT [firing] severity=critical service=order-api alertname=InstanceDown ...

  Query the webhook receiver API:
  curl -s http://localhost:5001/api/alerts | python3 -m json.tool

  Manually send a test alert (without waiting for Prometheus):
  curl -s -X POST http://localhost:8085/webhook \
    -H 'Content-Type: application/json' \
    -d '{"version":"4","status":"firing","alerts":[{"status":"firing","labels":{"alertname":"TestAlert","severity":"warning","service":"test"},"annotations":{"sum
  mary":"Manual test alert"},"startsAt":"2026-02-11T10:00:00Z","endsAt":"0001-01-01T00:00:00Z","fingerprint":"test123"}]}'

  ---
  The Data Flow

  Services expose metrics
          |
          v
  Prometheus scrapes every 15s
          |
          v
  Prometheus evaluates 4 alert rules every 15s
          |
          v  (if rule condition met for `for` duration)
  Alertmanager receives firing alert
          |
          v
  Alertmanager groups by [alertname, service]
          |
          v
  Alertmanager POSTs webhook to both receivers
         / \
        v   v
  webhook-receiver    mock-slack-ui
  (logs + JSON API)   (browser UI)

  The key learning concept: alerts are a pipeline, not just a binary on/off. Prometheus detects, Alertmanager routes and deduplicates, receivers display. Each
  layer is independently configurable.
