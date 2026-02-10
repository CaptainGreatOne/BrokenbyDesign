# Phase 4: Alerting - Context

**Gathered:** 2026-02-10
**Status:** Ready for planning

<domain>
## Phase Boundary

Pre-configured alerting infrastructure that detects service failures and degradation using Prometheus alert rules and Alertmanager. Includes trigger/resolve scripts for on-demand demonstration, webhook receiver, and mock Slack-like notification UI. Grafana Alerting is enabled but not pre-configured — lab exercises guide learners through comparing both systems.

</domain>

<decisions>
## Implementation Decisions

### Alert rule coverage
- Core trio only: service down, high error rate, high latency
- Additional rules deferred to lab instructions (learner writes them)
- Instance down: Prometheus `up == 0` for 1 minute (target absent)
- Service unhealthy: Custom health endpoint failure check (service running but unhealthy)
- High error rate: 5xx rate > 5% sustained for 5 minutes
- High latency: p95 > 1s sustained for 5 minutes
- Three severity levels: critical (service down), warning (error rate, latency), info (available for labs)
- Total pre-configured rules: 4 (instance down, service unhealthy, high error rate, high latency)

### Alert triggering experience
- Alerts can fire naturally from existing 2-5% error simulation in services
- Provide trigger scripts for on-demand demonstration of each alert type
- Claude's discretion on trigger mechanisms (docker stop/pause, traffic manipulation, etc.)
- Auto-resolve built-in (standard Prometheus/Alertmanager behavior)
- Companion resolve scripts that explicitly restore triggered conditions
- Learner can trigger → observe → resolve → observe the full alert lifecycle

### Notification routing
- Alertmanager UI as primary alert viewer
- Webhook receiver: lightweight container that logs received alerts — teaches webhook integration
- Mock Slack-like notification UI: simplest possible implementation that shows alerts with timestamps and severity colors — proves routing works
- Group alerts by service name (one notification per service, not per alert)
- Silence and inhibition rules skipped — deferred to lab instructions

### Grafana integration
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

</decisions>

<specifics>
## Specific Ideas

- Trigger + resolve script pairs for each alert type — learner experiences the full lifecycle
- Mock Slack UI should be dead simple to implement while still looking like notifications with color-coded severity
- Lab progression: (1) explore pre-configured Prometheus alerts, (2) add Alertmanager datasource in Grafana, (3) compare Grafana Alerting vs Prometheus alerting, (4) rewrite existing rules in Grafana, (5) write new rules in either system, (6) build an alerts dashboard

</specifics>

<deferred>
## Deferred Ideas

- Additional alert rules (memory pressure, queue depth, log error spikes) — lab instructions
- Silence and inhibition rule configuration — lab instructions
- Dedicated Grafana alerts dashboard — lab instructions
- Alert annotations on time-series graphs — future consideration

</deferred>

---

*Phase: 04-alerting*
*Context gathered: 2026-02-10*
