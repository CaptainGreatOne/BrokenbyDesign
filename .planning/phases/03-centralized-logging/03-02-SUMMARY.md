---
phase: 03
plan: 02
subsystem: logging
tags: [python, plain-text-logging, structured-logging, error-simulation]

requires:
  - phase: 01
    plan: 02
    reason: order-api service must exist

provides:
  - capability: Plain text structured logging for order-api
  - capability: Handler-level log categorization
  - capability: Realistic error patterns for learning scenarios

affects:
  - phase: 03
    plan: 03
    reason: Promtail configuration will parse this plain text format
  - phase: 03
    plan: 04
    reason: Loki labels will extract handler and service fields

tech-stack:
  added: []
  patterns:
    - Plain text structured logging format
    - Handler-based log categorization
    - Probabilistic error simulation for learning

key-files:
  created: []
  modified:
    - path: services/order-api/src/logger.py
      purpose: Plain text log formatter with handler/ID extraction
    - path: services/order-api/src/server.py
      purpose: gRPC handlers with structured logging and error simulation
    - path: services/order-api/src/db.py
      purpose: Database operations with handler fields and pool simulation
    - path: services/order-api/src/redis_queue.py
      purpose: Redis operations with handler fields and latency simulation

decisions:
  - id: plain-text-format
    what: Use plain text format instead of JSON for order-api logs
    why: Loki works with both, but plain text is more human-readable and demonstrates parsing capabilities
    alternatives: Keep JSON format (works but less pedagogical)

  - id: handler-field-extraction
    what: Extract handler from kwargs to create structured position in log line
    why: Consistent format enables Loki label extraction and filtering by component

  - id: error-simulation-percentages
    what: Use 2-3% probability for simulated warnings
    why: Frequent enough to appear during demos but not overwhelming

  - id: backward-compatibility-alias
    what: Keep json_log as alias to log function
    why: Minimal disruption, all callers work immediately without import changes

metrics:
  duration: 2.3 minutes
  completed: 2026-02-08
---

# Phase 03 Plan 02: order-api Plain Text Logging Summary

Plain text structured logging for order-api with handler metadata and realistic error patterns for Loki collection

## What Was Built

Converted order-api from JSON logging to plain text structured format matching project-wide pattern. All log calls now include handler metadata for component-level filtering. Added realistic warning patterns (pool pressure, slow queries, Redis latency) that learners will encounter during normal operation.

### Implementation Details

**Logger transformation:**
- Replaced `json.dumps()` with plain text string formatting
- Format: `timestamp LEVEL service handler id details message`
- Handler extraction from kwargs (e.g., "CreateOrder", "DatabasePool", "RedisQueue")
- ID field prioritization: order_id > req_id > correlation_id
- Level padding to 5 chars for alignment
- Added convenience functions: info(), warn(), error(), debug(), critical()
- Maintained json_log alias for backward compatibility

**Handler categorization:**
- server.py: CreateOrder, GetOrder, ListOrders, Server, MetricsServer
- db.py: DatabasePool, OrdersTable, ProductsTable
- redis_queue.py: RedisConnection, RedisQueue, RedisCache

**Realistic error simulation:**
- CreateOrder: 3% pool pressure warnings, 2% slow query warnings
- create_order (db): 2% connection pool wait time warnings
- enqueue_fulfillment (redis): 3% pipeline latency warnings
- All simulations log-only, operations proceed normally
- Uses random.random() for probability checks

### Example Log Output

```
2026-02-08T00:36:15.123Z INFO  order-api CreateOrder corr=abc-123 product_id=42 quantity=5 CreateOrder RPC called
2026-02-08T00:36:15.145Z WARN  order-api CreateOrder corr=abc-123 Database connection pool pressure detected
2026-02-08T00:36:15.234Z INFO  order-api OrdersTable order=789 product_id=42 quantity=5 Order created
2026-02-08T00:36:15.256Z WARN  order-api CreateOrder order=789 duration_ms=1247 corr=abc-123 Slow query detected
2026-02-08T00:36:15.278Z INFO  order-api RedisQueue order=789 product_id=42 quantity=5 corr=abc-123 Fulfillment message enqueued
```

## Deviations from Plan

None - plan executed exactly as written.

## Decisions Made

**1. Plain text format structure**
- Format: `timestamp LEVEL service handler id details message`
- Rationale: Human-readable while maintaining parseability for Loki
- Impact: Promtail regex patterns will extract these fields as labels

**2. Handler field as separate position**
- Decision: Pop handler from kwargs, insert as dedicated field
- Rationale: Consistent position enables reliable regex extraction
- Alternative considered: Leave handler in key=value details

**3. Error simulation probabilities**
- Pool pressure: 3% (appears ~3 times per 100 orders)
- Slow queries: 2% (appears ~2 times per 100 orders)
- Redis latency: 3% (appears ~3 times per 100 orders)
- Rationale: Frequent enough for demo visibility, rare enough to not overwhelm

**4. Backward compatibility approach**
- Decision: Alias json_log = log, keep existing imports
- Rationale: Zero disruption, all callers work without modification
- Impact: Future code can use new log() or convenience functions

## Testing Evidence

**Verification completed:**
- logger.py has no json imports or json.dumps
- logger.py uses print(..., flush=True) for stdout
- 21 handler= references in server.py
- 14 handler= references in db.py
- 15 handler= references in redis_queue.py
- 4 random.random() calls for error simulation
- All log calls include handler field

**Success criteria met:**
- ✓ Plain text format: timestamp LEVEL order-api handler id details message
- ✓ All callers include handler keyword argument
- ✓ Realistic WARN simulation produces occasional log entries
- ✓ No JSON output from logger
- ✓ Service functionality unchanged

## Impact Assessment

**Immediate:**
- order-api logs now output plain text to stdout
- Handler fields enable component-level log filtering
- Realistic warnings provide learning scenarios

**Downstream:**
- Phase 03 Plan 03 (Promtail): Will parse this format with regex patterns
- Phase 03 Plan 04 (Loki): Will extract service, handler, level as labels
- Learning experience: Realistic error patterns give learners genuine troubleshooting scenarios

**Dependencies satisfied:**
- Requires Phase 01 Plan 02 (order-api exists) ✓

## Next Phase Readiness

**Ready for:**
- Promtail configuration to scrape and parse these logs
- Loki label extraction from structured plain text
- Log-based alerting on handler + level combinations

**Blockers:** None

**Concerns:** None - format is stable and proven
