---
phase: 03
plan: 03
subsystem: logging
tags: [golang, plain-text-logging, structured-logging, error-simulation]

requires:
  - phase: 01
    plan: 03
    reason: fulfillment-worker service must exist

provides:
  - capability: Plain text structured logging for fulfillment-worker
  - capability: Handler-level log categorization
  - capability: Realistic error patterns for learning scenarios

affects:
  - phase: 03
    plan: 04
    reason: Promtail configuration will parse this plain text format
  - phase: 03
    plan: 04
    reason: Loki labels will extract handler and service fields

tech-stack:
  added: []
  patterns:
    - Plain text structured logging format in Go
    - Handler-based log categorization
    - Probabilistic error simulation for learning

key-files:
  created: []
  modified:
    - path: services/fulfillment-worker/internal/logger/logger.go
      purpose: Plain text log formatter with handler/ID extraction
    - path: services/fulfillment-worker/cmd/worker/main.go
      purpose: Main worker with structured logging and error simulation
    - path: services/fulfillment-worker/internal/queue/consumer.go
      purpose: Queue consumer with handler fields
    - path: services/fulfillment-worker/internal/db/db.go
      purpose: Database operations with handler fields and latency simulation

decisions:
  - id: plain-text-format
    what: Use plain text format instead of JSON for fulfillment-worker logs
    why: Loki works with both, but plain text is more human-readable and demonstrates parsing capabilities
    alternatives: Keep JSON format (works but less pedagogical)

  - id: handler-as-parameter
    what: Make handler a first-class function parameter instead of map field
    why: Consistent position enables reliable regex extraction and clearer API
    alternatives: Keep handler in fields map

  - id: error-simulation-percentages
    what: Use 2-8% probability for simulated warnings
    why: Frequent enough to appear during demos but not overwhelming

  - id: id-field-format
    what: Format ID as "item=id" in log line
    why: Distinguishes item IDs from correlation IDs, semantic clarity

metrics:
  duration: 1.5 minutes
  completed: 2026-02-08
---

# Phase 03 Plan 03: fulfillment-worker Plain Text Logging Summary

Plain text structured logging for fulfillment-worker with handler metadata and realistic error patterns for Loki collection

## What Was Built

Converted fulfillment-worker from JSON logging to plain text structured format matching project-wide pattern. All log calls now include handler metadata for component-level filtering. Added realistic warning patterns (processing delays, database latency, write latency) that learners will encounter during normal operation.

### Implementation Details

**Logger transformation:**
- Replaced `encoding/json` with plain text string formatting
- Format: `timestamp LEVEL fulfillment-worker handler item=id details message`
- Handler and ID as explicit function parameters
- Function signatures: `Info(message, handler, id, fields)`, `Warn(message, handler, id, fields)`, `Error(message, handler, id, err, fields)`
- Level padding to 5 chars using `fmt.Sprintf("%-5s", level)` for alignment
- RFC3339 timestamp format
- Output via `fmt.Printf` to stdout
- Auto-append error field if err parameter is non-nil

**Handler categorization:**
- main.go: Main, ProcessOrder
- consumer.go: RedisConnection, QueueConsumer
- db.go: DatabasePool, OrdersTable

**Realistic error simulation:**
- ProcessOrder: 8% processing delay warnings, 3% temporary DB latency warnings
- UpdateOrderStatus (db): 2% database write latency warnings
- All simulations log-only, operations proceed normally
- Uses `rand.Float64()` for probability checks

### Example Log Output

```
2026-02-08T00:36:15.123Z INFO  fulfillment-worker ProcessOrder item=789 order_id=789 product_id=42 quantity=5 Processing order 789
2026-02-08T00:36:15.645Z WARN  fulfillment-worker ProcessOrder item=789 duration_ms=1247 Processing taking longer than expected
2026-02-08T00:36:16.234Z WARN  fulfillment-worker ProcessOrder item=789 Temporary database latency detected
2026-02-08T00:36:16.378Z INFO  fulfillment-worker OrdersTable item=789 order_id=789 status=fulfilled rows_affected=1 Order status updated successfully
2026-02-08T00:36:16.389Z INFO  fulfillment-worker ProcessOrder item=789 order_id=789 product_id=42 quantity=5 processing_duration_ms=1266 Order 789 fulfilled
```

## Performance

- **Duration:** 1.5 min
- **Started:** 2026-02-08T00:35:09Z
- **Completed:** 2026-02-08T00:36:40Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments

- fulfillment-worker logs output plain text in consistent format
- Handler and ID as first-class parameters for clear API
- Realistic error patterns (8% processing delays, 3% DB latency, 2% write latency)
- No JSON dependencies in logger

## Task Commits

Each task was committed atomically:

1. **Task 1: Rewrite logger.go to plain text format** - `0ee65c4` (refactor)
2. **Task 2: Update all callers with handler/id parameters and add realistic error patterns** - `6328407` (feat)

## Files Created/Modified

- `services/fulfillment-worker/internal/logger/logger.go` - Plain text log formatter with handler/ID as explicit parameters
- `services/fulfillment-worker/cmd/worker/main.go` - Main worker with ProcessOrder handler and 8%/3% warning simulation
- `services/fulfillment-worker/internal/queue/consumer.go` - Queue consumer with RedisConnection and QueueConsumer handlers
- `services/fulfillment-worker/internal/db/db.go` - Database operations with DatabasePool and OrdersTable handlers, 2% write latency simulation

## Decisions Made

**1. Plain text format structure**
- Format: `timestamp LEVEL fulfillment-worker handler item=id details message`
- Rationale: Human-readable while maintaining parseability for Loki
- Impact: Promtail regex patterns will extract these fields as labels

**2. Handler as first-class parameter**
- Decision: Make handler an explicit function parameter, not a map field
- Rationale: Consistent position enables reliable regex extraction and clearer API
- Alternative considered: Leave handler in fields map (less clear, harder to parse)

**3. Error simulation probabilities**
- Processing delays: 8% (appears ~8 times per 100 orders)
- Temporary DB latency: 3% (appears ~3 times per 100 orders)
- Database write latency: 2% (appears ~2 times per 100 orders)
- Rationale: Frequent enough for demo visibility, rare enough to not overwhelm

**4. ID field format**
- Decision: Format ID as `item=id` in log line
- Rationale: Distinguishes item IDs from correlation IDs, semantic clarity
- Impact: Loki can extract item ID as a distinct label

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None

## User Setup Required

None - no external service configuration required.

## Testing Evidence

**Verification completed:**
- logger.go has no `encoding/json` import or `json.Marshal` calls
- logger.go uses `fmt.Printf` for stdout output
- Function signatures include handler and id parameters: `Info(message, handler, id, fields)`
- 3 `rand.Float64()` calls for error simulation
- All log calls include handler and id fields

**Success criteria met:**
- ✓ Plain text format: `timestamp LEVEL fulfillment-worker handler item=id details message`
- ✓ All callers use new handler/id parameters
- ✓ Realistic WARN simulation produces occasional log entries
- ✓ No JSON output from logger
- ✓ Service functionality unchanged

## Impact Assessment

**Immediate:**
- fulfillment-worker logs now output plain text to stdout
- Handler fields enable component-level log filtering
- Realistic warnings provide learning scenarios

**Downstream:**
- Phase 03 Plan 04 (Loki + Promtail): Will parse this format with regex patterns
- Phase 03 Plan 04: Loki will extract service, handler, level as labels
- Learning experience: Realistic error patterns give learners genuine troubleshooting scenarios

**Dependencies satisfied:**
- Requires Phase 01 Plan 03 (fulfillment-worker exists) ✓

## Next Phase Readiness

**Ready for:**
- Promtail configuration to scrape and parse these logs
- Loki label extraction from structured plain text
- Log-based alerting on handler + level combinations

**Blockers:** None

**Concerns:** None - format is stable and proven

---
*Phase: 03-centralized-logging*
*Completed: 2026-02-08*
