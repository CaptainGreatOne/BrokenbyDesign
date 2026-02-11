# Phase 1: Foundation Services - Context

**Gathered:** 2026-02-05
**Status:** Ready for planning

<domain>
## Phase Boundary

Pre-built polyglot microservices with automated traffic and one-command Docker Compose startup. Delivers 3 services (Python, Node.js, Go) with PostgreSQL, Redis, and Nginx. Services communicate via multiple protocols. Traffic generator provides continuous baseline data. No observability tooling in this phase — that starts in Phase 2.

</domain>

<decisions>
## Implementation Decisions

### Application domain
- Order processing system: Web Gateway (Node.js) → Order API (Python) → Fulfillment Worker (Go)
- Each service has clear, distinct responsibility
- Data model: slightly realistic — orders have items with quantities, products have names and prices
- Pre-seeded PostgreSQL database with products and sample orders
- Domain is secondary to observability learning — keep business logic minimal

### Service communication
- **Web Gateway (Node.js):** Receives external REST requests from Nginx, communicates with Order API via gRPC
- **Order API (Python):** Exposes gRPC server for Web Gateway, pushes fulfilled orders to Redis queue for Worker
- **Fulfillment Worker (Go):** Consumes from Redis queue (async), processes orders
- Communication type split: REST (external) + gRPC (internal sync) + Redis queue (internal async)
- Only the Go Worker uses async processing; the other two services are synchronous
- This combination teaches 3 distinct communication patterns in observability

### Redis usage
- Redis serves dual purpose: caching (product data, order status lookups) and queue (order fulfillment messages)
- Queue provides unique observability: queue depth, processing rate, consumer lag, memory usage under load
- Redis queue in Phase 1 → Kafka replaces/supplements as enterprise streaming in Phase 7

### Traffic generation
- Traffic generator auto-starts with the stack in steady mode
- Controllable via HTTP endpoints: /mode/steady, /mode/burst, /mode/overload, /mode/pause
- Steady mode: clean baseline, no errors (errors come from chaos injection in Phase 6)
- Burst mode: simulates peak traffic periods
- Overload mode: pushes services to capacity limits
- Traffic hits the Nginx entry point, flowing through the full service chain

### Service realism
- Minimal business logic — just enough to generate realistic data flow
- Real PostgreSQL with pre-seeded data and real SQL queries (enables DB monitoring later)
- Structured JSON logging from day one (request ID, service name, duration) — ready for Loki in Phase 3
- /metrics endpoints NOT included in Phase 1 — added in Phase 2 to show the "before/after" of monitoring instrumentation
- OTel instrumentation NOT included in Phase 1 — added in Phase 5

### Nginx routing
- External REST → Nginx → Web Gateway (Node.js)
- No direct access to Order API or Worker from outside

### Docker Compose profiles
- Profiles: core (3 services + databases + nginx + traffic gen), tracing, kafka, cicd, full
- All images use pinned versions
- Resource limits on all containers

### Claude's Discretion
- Redis caching strategy specifics (what to cache, TTLs)
- Exact data model schema (tables, columns)
- Health check implementation details
- Traffic generator request variety and patterns
- Makefile shortcuts for common operations
- Pre-seed data volume and variety

</decisions>

<specifics>
## Specific Ideas

- The 3 services should feel like a realistic microservices system — not a toy demo, but not over-engineered
- Communication pattern variety (REST + gRPC + Redis queue) is specifically for learning how different protocols appear in observability tools
- Go Worker using Redis queue teaches pub/sub concepts before Kafka in Phase 7
- The traffic mode switch via HTTP endpoint is deliberate — learner controls it programmatically

</specifics>

<deferred>
## Deferred Ideas

- Kafka integration for the Worker — Phase 7 (Event Streaming)
- Prometheus /metrics endpoints — Phase 2 (Metrics & Dashboards)
- OpenTelemetry instrumentation — Phase 5 (Distributed Tracing)
- Chaos injection endpoints — Phase 6 (Chaos Engineering)

</deferred>

---

*Phase: 01-foundation-services*
*Context gathered: 2026-02-05*
