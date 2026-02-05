---
phase: 01-foundation-services
plan: 02
subsystem: api
tags: [grpc, python, postgresql, redis, psycopg3, protobuf]

# Dependency graph
requires:
  - phase: 01-foundation-services
    plan: 01
    provides: Docker orchestration, proto contracts, database schema
provides:
  - Python gRPC server implementing OrderService contract
  - PostgreSQL database layer with connection pooling
  - Redis dual-purpose operations (queue + cache)
  - Structured JSON logging with correlation_id
  - Dockerfile with protobuf code generation
affects: [01-03, fulfillment-service, observability-instrumentation]

# Tech tracking
tech-stack:
  added: [grpcio, psycopg3, psycopg-pool, redis-py, grpc-tools]
  patterns: [gRPC servicer pattern, correlation ID propagation, cache-aside pattern, connection pooling, retry logic]

key-files:
  created:
    - services/order-api/src/server.py
    - services/order-api/src/db.py
    - services/order-api/src/redis_queue.py
    - services/order-api/src/logger.py
    - services/order-api/Dockerfile
    - services/order-api/requirements.txt
  modified: []

key-decisions:
  - "Generated protobuf code at Docker build time from shared proto/ directory"
  - "Cache-first product lookup pattern (Redis cache before PostgreSQL)"
  - "Connection retry logic (5 retries, 2s delay) for PostgreSQL and Redis startup ordering"
  - "Thread pool executor with 10 workers for gRPC concurrent request handling"

patterns-established:
  - "Cache-aside pattern: check cache first, query DB on miss, populate cache"
  - "Correlation ID propagation: extract from gRPC metadata or generate UUID"
  - "Structured JSON logging: all operations log with correlation_id, service name, timestamp"
  - "Graceful shutdown: handle SIGTERM/SIGINT with 5-second grace period"
  - "Parameterized queries: all SQL uses placeholders, never string formatting"

# Metrics
duration: 3min
completed: 2026-02-05
---

# Phase 01 Plan 02: Order API Summary

**Python gRPC server with PostgreSQL connection pooling, Redis dual-purpose operations (fulfillment queue + product cache), and structured JSON logging with correlation_id propagation**

## Performance

- **Duration:** 3 min
- **Started:** 2026-02-05T23:27:18Z
- **Completed:** 2026-02-05T23:29:54Z
- **Tasks:** 2
- **Files modified:** 6

## Accomplishments
- Complete Order API gRPC service implementing all 3 OrderService RPCs (CreateOrder, GetOrder, ListOrders)
- Database layer with psycopg3 connection pooling and parameterized queries for security
- Redis dual-purpose: fulfillment queue (LPUSH) and product caching (SETEX/GET/DELETE) with 5-minute TTL
- Structured JSON logging with correlation_id extracted from gRPC metadata for distributed tracing
- Dockerfile generating protobuf code at build time from shared proto/ directory

## Task Commits

Each task was committed atomically:

1. **Task 1: Create Order API database layer and Redis operations** - `958a885` (feat)
2. **Task 2: Create Order API gRPC server and Dockerfile** - `1a7131d` (feat)

**Plan metadata:** (pending final docs commit)

## Files Created/Modified

### Created
- `services/order-api/src/server.py` - gRPC server with OrderServicer implementing CreateOrder, GetOrder, ListOrders RPCs
- `services/order-api/src/db.py` - PostgreSQL layer with connection pool (psycopg3), CRUD operations, retry logic
- `services/order-api/src/redis_queue.py` - Redis operations for fulfillment queue (LPUSH) and product cache (SETEX/GET/DELETE)
- `services/order-api/src/logger.py` - Structured JSON logging utility with timestamp, level, service, correlation_id
- `services/order-api/src/__init__.py` - Python package marker
- `services/order-api/Dockerfile` - Multi-stage build with protobuf generation, Python 3.12-slim base
- `services/order-api/requirements.txt` - Python dependencies (grpcio, psycopg, redis)

### Modified
- None

## Decisions Made

1. **Protobuf generation at build time**: Generate Python protobuf code during Docker build instead of pre-generating. This ensures consistency with proto/ contracts and simplifies CI/CD. Build context is repo root to access shared proto/.

2. **Cache-first product lookup**: Check Redis cache before PostgreSQL for product data. On cache miss, query database and populate cache with 5-minute TTL. Reduces database load for frequently accessed products.

3. **Connection retry logic**: Both PostgreSQL and Redis clients retry connection up to 5 times with 2-second delay. Handles docker-compose startup ordering when services start concurrently.

4. **Thread pool sizing**: gRPC server uses ThreadPoolExecutor with max_workers=10. Balances concurrency with resource usage for local development environment.

5. **Correlation ID strategy**: Extract x-correlation-id from gRPC metadata, generate UUID if missing. Enables distributed tracing when upstream services provide correlation IDs, fallback when they don't.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Created /app/src directory before protobuf generation**
- **Found during:** Task 2 (Docker build)
- **Issue:** Dockerfile attempted to generate protobuf code to /app/src before directory existed, causing build failure: "/app/src/: No such file or directory"
- **Fix:** Added `RUN mkdir -p /app/src` before protoc command in Dockerfile
- **Files modified:** services/order-api/Dockerfile
- **Verification:** Docker build succeeded, generated order_pb2.py and order_pb2_grpc.py exist in /app/src
- **Committed in:** 1a7131d (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (1 blocking issue)
**Impact on plan:** Blocking fix necessary for Docker build to succeed. No scope changes.

## Issues Encountered

None - Docker build failed once due to missing directory, fixed immediately via deviation Rule 3.

## User Setup Required

None - no external service configuration required. Order API uses infrastructure services (PostgreSQL, Redis) configured in docker-compose.yml from plan 01-01.

## Next Phase Readiness

**Ready for:**
- Plan 01-03 (Web Gateway): Order API provides gRPC server on port 50051 for gateway to call
- Fulfillment service development: Redis fulfillment_queue populated with order messages
- Observability instrumentation: Structured JSON logs ready for ELK stack ingestion

**Notes:**
- Order API starts successfully when PostgreSQL and Redis are healthy (retry logic handles startup ordering)
- Product cache reduces database load - observability phase can measure cache hit rates
- Correlation IDs flow through all operations - ready for distributed tracing setup

---
*Phase: 01-foundation-services*
*Completed: 2026-02-05*
