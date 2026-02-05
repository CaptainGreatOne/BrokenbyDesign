---
phase: 01-foundation-services
plan: 03
subsystem: api
tags: [nodejs, express, grpc, redis, rest-api, correlation-id, structured-logging]

# Dependency graph
requires:
  - phase: 01-01
    provides: proto/order.proto gRPC contract, docker-compose.yml orchestration, shared infrastructure
provides:
  - Web Gateway Express HTTP server
  - REST-to-gRPC translation layer
  - Correlation ID propagation (HTTP X-Request-ID to gRPC metadata)
  - Structured JSON logging
  - Redis client with graceful fallback
  - REST endpoints: POST /orders, GET /orders/:id, GET /orders, GET /health
affects: [01-04-fulfillment-worker, 01-05-traffic-generator, phase-02-logging, phase-03-distributed-tracing]

# Tech tracking
tech-stack:
  added: [express, @grpc/grpc-js, @grpc/proto-loader, redis, uuid]
  patterns: [REST-to-gRPC translation, correlation ID propagation, middleware pipeline, graceful degradation]

key-files:
  created:
    - services/web-gateway/src/server.js
    - services/web-gateway/src/routes.js
    - services/web-gateway/src/grpc-client.js
    - services/web-gateway/src/redis-client.js
    - services/web-gateway/src/logger.js
    - services/web-gateway/package.json
    - services/web-gateway/Dockerfile
  modified: []

key-decisions:
  - "Correlation ID middleware extracts X-Request-ID header or generates UUID - ensures every request traceable"
  - "gRPC error codes mapped to HTTP status codes - maintains REST semantics"
  - "Redis failures handled gracefully - cache miss instead of service error"
  - "Request timing middleware logs duration on response finish - non-blocking observability"

patterns-established:
  - "Correlation ID flow: HTTP header → req.correlationId → gRPC metadata x-correlation-id"
  - "Structured logging: all logs include correlation_id, method, path, duration"
  - "Error handling: try/catch in all route handlers, map gRPC status to HTTP status"
  - "Middleware order: JSON parser → correlation ID → request logging → response timing → routes"

# Metrics
duration: 2min
completed: 2026-02-05
---

# Phase 1 Plan 3: Web Gateway Summary

**Express REST API with gRPC translation, correlation ID propagation via HTTP headers to gRPC metadata, and structured JSON logging**

## Performance

- **Duration:** 2 min
- **Started:** 2026-02-05T23:28:14Z
- **Completed:** 2026-02-05T23:30:40Z
- **Tasks:** 2
- **Files modified:** 7

## Accomplishments
- Web Gateway service translates REST requests to gRPC Order API calls
- Correlation ID flows from HTTP X-Request-ID header through gRPC metadata to backend services
- Structured JSON logging captures method, path, status, duration, and correlation_id on every request
- Redis client provides caching with graceful fallback when unavailable
- Request validation returns 400 for malformed POST /orders payloads

## Task Commits

Each task was committed atomically:

1. **Task 1: Create Web Gateway gRPC client, Redis client, and logger** - `33c7abc` (feat)
2. **Task 2: Create Web Gateway Express server, routes, and Dockerfile** - `41f815f` (feat)

## Files Created/Modified
- `services/web-gateway/package.json` - Node.js dependencies: express, gRPC, redis, uuid
- `services/web-gateway/src/server.js` - Express app with correlation ID, request logging, timing middleware
- `services/web-gateway/src/routes.js` - REST endpoints: POST /orders, GET /orders/:id, GET /orders, GET /health
- `services/web-gateway/src/grpc-client.js` - gRPC OrderService client with correlation ID in metadata
- `services/web-gateway/src/redis-client.js` - Cache operations with connection retry and graceful degradation
- `services/web-gateway/src/logger.js` - Structured JSON logging with timestamp, level, service fields
- `services/web-gateway/Dockerfile` - Node 20 Alpine with wget, repo root build context for proto access

## Decisions Made

**Correlation ID Propagation Pattern:**
- Extract from X-Request-ID header or generate UUID
- Attach to request object (req.correlationId)
- Return in response header
- Pass to gRPC via metadata (x-correlation-id)
- Include in all structured logs

**gRPC Error Mapping:**
- NOT_FOUND (5) → HTTP 404
- INVALID_ARGUMENT (3) → HTTP 400
- INTERNAL (13) → HTTP 500
- Preserves REST semantics for clients

**Redis Graceful Degradation:**
- Cache operations return null/false on failure
- Service continues without cache
- Connection retry with exponential backoff (max 10 retries)
- Enables service availability despite cache failures

**Request Timing via Middleware:**
- Capture start time in middleware
- Log duration on response 'finish' event
- Non-blocking, doesn't affect request processing
- Provides per-request performance metrics

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None - all tasks completed successfully.

## Next Phase Readiness

**Ready for:**
- Fulfillment Worker (01-04) - can connect to same gRPC Order API
- Traffic Generator (01-05) - can send HTTP requests to /orders endpoints
- Logging phase - structured JSON already emitted, ready for aggregation
- Distributed Tracing phase - correlation ID infrastructure in place

**Integration points verified:**
- Docker build succeeds with repo root context
- Proto files accessible at /app/proto/ in container
- Environment variables configured in docker-compose.yml
- Health check endpoint available for Docker healthcheck
- wget installed for health check execution

**No blockers:** All dependencies satisfied, service ready for docker-compose up.

---
*Phase: 01-foundation-services*
*Completed: 2026-02-05*
