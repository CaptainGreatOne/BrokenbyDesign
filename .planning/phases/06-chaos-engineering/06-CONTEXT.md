# Phase 6: Chaos Engineering - Context

**Gathered:** 2026-02-12
**Status:** Ready for planning

<domain>
## Phase Boundary

Controllable failure injection for all application services, with a central chaos hub that orchestrates scenarios. Chaos effects must be immediately visible across Prometheus metrics, Loki logs, and Jaeger traces. Before/after documentation is deferred to Phase 10 (Curriculum).

</domain>

<decisions>
## Implementation Decisions

### Chaos control interface
- Standalone chaos-controller service (new container, own port, Docker profile)
- Central hub that can target all services at once or individual services
- Communicates with target services via HTTP calls to chaos endpoints on each service
- Each application service (web-gateway, order-api, fulfillment-worker) exposes /chaos/* REST endpoints
- Chaos-controller proxies/orchestrates calls to service-level chaos endpoints

### Failure scenario design
- Six scenario types: slow DB queries, service crashes, memory pressure, network latency, error rate injection (HTTP 500s/gRPC errors), and disk pressure
- Named severity presets: "mild" and "severe" with distinct observable impact
- Optional parameter override for advanced/custom usage (e.g., exact latency ms, error rate %)
- Default is toggle-based (stays active until reset), with optional duration parameter for time-limited injection
- Multiple chaos scenarios are stackable on the same service (e.g., slow DB + high error rate simultaneously)

### Reset & recovery model
- Per-scenario reset for granular control (clear one scenario, keep others active)
- Reset-all endpoint for quick cleanup (clears everything on a service or all services)
- Crashed services stay down until explicitly reset (no Docker auto-restart during chaos)
- Status endpoint (GET /chaos/status) shows all active scenarios across services — available for verification, but labs can instruct learners to diagnose blind first
- Standalone service design supports future lab versioning via Docker Compose file changes

### Claude's Discretion
- Whether chaos-controller gets a Web UI or REST API only (or both)
- Chaos injection/recovery logging strategy (whether services log chaos events to Loki)
- Exact preset values for mild vs severe (latency ms, error rates, etc.)
- Chaos-controller language/framework choice
- Port assignments for chaos-controller and service chaos endpoints
- Implementation of disk pressure and memory pressure simulation within containers

</decisions>

<specifics>
## Specific Ideas

- "In production environments, there is a difference between ignoring small latency versus being forced to deal with huge performance issues" — mild vs severe presets should create distinctly different observability signatures
- Standalone service enables easier lab progression — learners can step between lab stages by changing Docker Compose file versions (Phase 10 concern, but influences architecture now)
- Stackable scenarios teach compounding failure diagnosis — a key real-world skill

</specifics>

<deferred>
## Deferred Ideas

- Before/after documentation and comparison guides — Phase 10 (Curriculum) when labs are written
- Lab versioning via Docker Compose file changes — Phase 10 (Curriculum)

</deferred>

---

*Phase: 06-chaos-engineering*
*Context gathered: 2026-02-12*
