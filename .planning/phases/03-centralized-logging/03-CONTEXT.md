# Phase 3: Centralized Logging - Context

**Gathered:** 2026-02-06
**Status:** Ready for planning

<domain>
## Phase Boundary

Aggregate logs from all application services (web-gateway, order-api, fulfillment-worker) into Loki via Promtail. Learner searches and filters logs through Grafana Explore. No pre-built dashboards — learner builds their own exploration skills. Docker log rotation and Loki retention prevent resource exhaustion.

</domain>

<decisions>
## Implementation Decisions

### Log format
- Plain text, not structured JSON
- Format: `[timestamp] [level] [service] [process/handler] [record/action ID] [contextual details] message`
- Examples:
  - `2026-02-06T14:32:01Z INFO order-api CreateOrder order=abc123 user=user42 Processing new order`
  - `2026-02-06T14:32:01Z WARN fulfillment-worker ProcessQueue item=abc123 Retry attempt 2/3`
  - `2026-02-06T14:32:02Z ERROR web-gateway /api/orders req=xyz789 Upstream timeout after 5000ms`
- Every log line includes: timestamp, level, service name, specific process/handler within the service, relevant ID for the record or action, and any other specific information

### Log levels & realism
- Services emit a realistic mix of INFO, WARN, and ERROR logs
- Services should produce occasional realistic errors/warnings even without chaos injection — timeouts, retries, connection hiccups, edge cases
- This gives the learner real error patterns to search and filter in Grafana Explore from day one
- Chaos engineering (Phase 6) will layer additional controlled failures on top

### Grafana log exploration
- No pre-built log dashboards — learner explores through Grafana Explore interface
- No saved queries or guided experience — blank slate for learning
- Loki added as a second datasource alongside existing Prometheus

### Log filtering requirements
- Learner must be able to filter by service name
- Learner must be able to filter by log level
- Learner must be able to filter by both service and level combined

### Retention & resources
- Short retention is sufficient — sessions are hours, not days
- Must fit within the existing 12GB RAM budget alongside all Phase 1-2 services

### Claude's Discretion
- Loki label strategy (how to implement service/level filtering — label cardinality vs LogQL parsing)
- Promtail pipeline stages for log parsing
- Exact Loki retention period and storage limits
- Memory/resource limits for Loki and Promtail containers
- Docker log rotation settings (max-size, max-file)
- Whether to modify existing service logging code or rely on Promtail parsing

</decisions>

<specifics>
## Specific Ideas

- Log format inspired by production patterns — rich enough to trace an action through the system, not just bare messages
- The experience should feel like opening a real logging tool for the first time and learning to query it

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 03-centralized-logging*
*Context gathered: 2026-02-06*
