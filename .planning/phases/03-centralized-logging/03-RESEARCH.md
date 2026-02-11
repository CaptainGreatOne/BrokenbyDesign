# Phase 3: Centralized Logging - Research

**Researched:** 2026-02-08
**Domain:** Centralized logging with Grafana Loki and Alloy
**Confidence:** HIGH

## Summary

Centralized logging aggregates application logs from multiple services into a single searchable store. The modern Grafana stack uses **Grafana Loki** (log aggregation database) and **Grafana Alloy** (log collection agent) to provide a powerful, label-based logging solution similar to Prometheus but for logs.

**Critical finding:** Promtail (the traditional log shipper for Loki) is deprecated and reaches End-of-Life on **March 2, 2026** (22 days from today). All new implementations must use **Grafana Alloy** instead, which is the actively developed successor with ongoing feature development.

Loki uses a unique approach: instead of indexing the full text of log messages (like Elasticsearch), it only indexes metadata labels (service name, log level, etc.) and stores log content in compressed chunks. This makes it extremely cost-effective and performant for high-volume logging while still enabling powerful filtering through LogQL queries.

**Primary recommendation:** Deploy Loki in monolithic mode (single binary) with Grafana Alloy for log collection. Use minimal labels (service name only) and rely on LogQL filter expressions for searching log content. Configure plain text logging in application services with structured format for easy parsing.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Log format:**
- Plain text, not structured JSON
- Format: `[timestamp] [level] [service] [process/handler] [record/action ID] [contextual details] message`
- Examples:
  - `2026-02-06T14:32:01Z INFO order-api CreateOrder order=abc123 user=user42 Processing new order`
  - `2026-02-06T14:32:01Z WARN fulfillment-worker ProcessQueue item=abc123 Retry attempt 2/3`
  - `2026-02-06T14:32:02Z ERROR web-gateway /api/orders req=xyz789 Upstream timeout after 5000ms`
- Every log line includes: timestamp, level, service name, specific process/handler within the service, relevant ID for the record or action, and any other specific information

**Log levels & realism:**
- Services emit a realistic mix of INFO, WARN, and ERROR logs
- Services should produce occasional realistic errors/warnings even without chaos injection — timeouts, retries, connection hiccups, edge cases
- This gives the learner real error patterns to search and filter in Grafana Explore from day one
- Chaos engineering (Phase 6) will layer additional controlled failures on top

**Grafana log exploration:**
- No pre-built log dashboards — learner explores through Grafana Explore interface
- No saved queries or guided experience — blank slate for learning
- Loki added as a second datasource alongside existing Prometheus

**Log filtering requirements:**
- Learner must be able to filter by service name
- Learner must be able to filter by log level
- Learner must be able to filter by both service and level combined

**Retention & resources:**
- Short retention is sufficient — sessions are hours, not days
- Must fit within the existing 12GB RAM budget alongside all Phase 1-2 services

### Claude's Discretion

- Loki label strategy (how to implement service/level filtering — label cardinality vs LogQL parsing)
- Promtail pipeline stages for log parsing
- Exact Loki retention period and storage limits
- Memory/resource limits for Loki and Alloy containers
- Docker log rotation settings (max-size, max-file)
- Whether to modify existing service logging code or rely on Alloy parsing

### Deferred Ideas (OUT OF SCOPE)

None — discussion stayed within phase scope

</user_constraints>

## Standard Stack

### Core Components

| Component | Version | Purpose | Why Standard |
|-----------|---------|---------|--------------|
| Grafana Loki | 3.6.0 | Log aggregation database | Industry standard for Kubernetes/cloud-native logging, label-based indexing, cost-effective storage |
| Grafana Alloy | latest | Log collection agent | Official successor to Promtail, unified telemetry collector, actively developed |
| Grafana | 12.3.0 (already installed) | Log exploration UI | Unified interface for metrics (Prometheus) and logs (Loki) |

**CRITICAL:** Do NOT use Promtail. It is deprecated and reaches End-of-Life on March 2, 2026. Use Grafana Alloy instead.

### Deployment Mode

| Mode | Use Case | Recommendation |
|------|----------|----------------|
| Monolithic (single binary) | Learning, experimentation, <20GB/day | **Use this** - simplest, perfect for learning environment |
| Simple Scalable Deployment | Production, ~1TB/day | Not needed - overkill for learning |
| Microservices | Large-scale production | Not needed - maximum complexity |

**Installation:**
```bash
# Via Docker Compose - services to add:
# - loki (grafana/loki:3.6.0)
# - alloy (grafana/alloy:latest)
```

## Architecture Patterns

### Recommended Component Flow

```
Application Services (stdout/stderr)
    ↓
Docker json-file logging driver
    ↓
Grafana Alloy (discovers containers, reads logs)
    ↓
Loki (stores logs with labels)
    ↓
Grafana Explore (query interface)
```

### Loki Label Strategy (Addressing User Constraint)

**CRITICAL DECISION: Use minimal labels, rely on LogQL filter expressions**

According to official Grafana best practices, the **fewer labels the better**. Loki has a default limit of 15 index labels, but production recommendations suggest keeping total streams under 10,000.

**Recommended approach for this project:**
- **Static label:** `service` (web-gateway, order-api, fulfillment-worker) - 3 values
- **NO label for log level** - use filter expressions instead: `{service="order-api"} |= "ERROR"`
- Total streams: 3 (excellent - well under recommended limits)

**Why NOT use log level as a label:**
- Creates 3x more streams (service × level = 9 streams)
- Grafana documentation states: `|= "level=error"` queries match the performance of `level="error"` labels
- Avoids stream fragmentation
- Filter expressions work comparably for medium-to-low volume applications (which this is)

**How filtering requirements are met:**
- Filter by service: `{service="web-gateway"}`
- Filter by log level: `{service="web-gateway"} |= "ERROR"`
- Filter by both: `{service="web-gateway"} |= "ERROR"` (already combined)

### Alloy Configuration Pattern

**Discovery → Relabel → Source → Process → Write**

```alloy
// 1. Discover Docker containers
discovery.docker "containers" {
  host = "unix:///var/run/docker.sock"
}

// 2. Relabel to extract service name
discovery.relabel "logs" {
  targets = discovery.docker.containers.targets

  rule {
    source_labels = ["__meta_docker_container_name"]
    target_label  = "service"
  }
}

// 3. Collect logs from containers
loki.source.docker "default" {
  host       = "unix:///var/run/docker.sock"
  targets    = discovery.relabel.logs.output
  forward_to = [loki.process.parse.receiver]
}

// 4. Process logs (optional - for parsing)
loki.process "parse" {
  forward_to = [loki.write.endpoint.receiver]

  // Can add parsing stages here if needed
}

// 5. Write to Loki
loki.write "endpoint" {
  endpoint {
    url = "http://loki:3100/loki/api/v1/push"
  }
}
```

### Plain Text Logging Pattern

**Current state:** All services use JSON logging
**Required change:** Switch to plain text with structured format

**Pattern (Node.js - web-gateway):**
```javascript
function formatLog(level, message, context = {}) {
  const timestamp = new Date().toISOString();
  const service = process.env.SERVICE_NAME || 'web-gateway';
  const handler = context.handler || 'unknown';
  const id = context.orderId || context.reqId || '';
  const details = Object.keys(context)
    .filter(k => !['handler', 'orderId', 'reqId'].includes(k))
    .map(k => `${k}=${context[k]}`)
    .join(' ');

  return `${timestamp} ${level.padEnd(5)} ${service} ${handler} ${id} ${details} ${message}`;
}

// Usage:
console.log(formatLog('INFO', 'Processing new order', {
  handler: 'CreateOrder',
  orderId: 'abc123',
  userId: 'user42'
}));
// Output: 2026-02-08T14:32:01Z INFO  web-gateway CreateOrder abc123 userId=user42 Processing new order
```

**Pattern (Python - order-api):**
```python
import sys
from datetime import datetime, timezone

def format_log(level: str, message: str, **context):
    timestamp = datetime.now(timezone.utc).isoformat()
    service = os.getenv('SERVICE_NAME', 'order-api')
    handler = context.pop('handler', 'unknown')
    record_id = context.pop('order_id', context.pop('req_id', ''))
    details = ' '.join(f'{k}={v}' for k, v in context.items())

    log_line = f"{timestamp} {level:<5} {service} {handler} {record_id} {details} {message}"
    print(log_line, file=sys.stdout, flush=True)

# Usage:
format_log('INFO', 'Processing new order',
           handler='CreateOrder',
           order_id='abc123',
           user_id='user42')
```

**Pattern (Go - fulfillment-worker):**
```go
func FormatLog(level, message, handler, id string, fields map[string]interface{}) {
    timestamp := time.Now().UTC().Format(time.RFC3339)
    service := os.Getenv("SERVICE_NAME")
    if service == "" {
        service = "fulfillment-worker"
    }

    var details strings.Builder
    for k, v := range fields {
        fmt.Fprintf(&details, "%s=%v ", k, v)
    }

    fmt.Printf("%s %-5s %s %s %s %s%s\n",
               timestamp, level, service, handler, id, details.String(), message)
}
```

### Loki Configuration Pattern

**Monolithic mode with filesystem storage:**

```yaml
auth_enabled: false

server:
  http_listen_port: 3100

common:
  path_prefix: /loki
  storage:
    filesystem:
      chunks_directory: /loki/chunks
      rules_directory: /loki/rules
  replication_factor: 1
  ring:
    kvstore:
      store: inmemory

schema_config:
  configs:
    - from: 2024-01-01
      store: tsdb
      object_store: filesystem
      schema: v13
      index:
        prefix: index_
        period: 24h

limits_config:
  retention_period: 72h  # 3 days - sufficient for learning sessions
  max_query_lookback: 72h

compactor:
  working_directory: /loki/compactor
  compaction_interval: 10m
  retention_enabled: true
  retention_delete_delay: 2h
  retention_delete_worker_count: 150
```

### Resource Allocation

Based on research and 12GB total RAM budget:

| Service | Memory Limit | Memory Reservation | Justification |
|---------|--------------|-------------------|---------------|
| Loki | 512M | 256M | Monolithic mode, filesystem storage, 3-day retention |
| Alloy | 256M | 128M | Lightweight agent, log forwarding only |

**Total logging stack:** ~768M reserved, ~768M burst
**Remaining budget:** Plenty - Phase 1-2 services use ~6.3GB

### Anti-Patterns to Avoid

- **DON'T use Promtail** - it's deprecated and EOL in 22 days
- **DON'T create labels for high-cardinality values** - request IDs, order IDs, user IDs should be in log content, not labels
- **DON'T over-index** - Loki's strength is minimal labels + powerful filtering
- **DON'T use structured logging (JSON) when plain text is specified** - user explicitly chose plain text format
- **DON'T create pre-built dashboards** - user wants learner to explore Grafana Explore interface

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Log collection from Docker containers | Custom log scraper, docker logs scripts | Grafana Alloy with loki.source.docker | Handles container discovery, lifecycle, position tracking, retries |
| Log parsing and regex extraction | Custom parsing code in each service | Alloy loki.process stages | Centralized parsing, reusable, testable |
| Log rotation | Custom rotation scripts | Docker json-file driver with max-size/max-file | Built-in, battle-tested, works with all logging drivers |
| Log retention | Cron jobs deleting old files | Loki compactor with retention_enabled | Understands Loki's chunk format, safe deletion |
| Label extraction from logs | Manual log prefix parsing | Alloy stage.regex + stage.labels | Optimized, handles edge cases, supports complex patterns |

**Key insight:** Loki + Alloy is a complete logging pipeline solution. The only custom code needed is the application log format itself - everything else (collection, parsing, storage, retention, querying) is handled by the stack.

## Common Pitfalls

### Pitfall 1: Using Promtail in New Projects

**What goes wrong:** Promtail is deprecated and reaches EOL on March 2, 2026. No new features, only critical bug fixes until then.

**Why it happens:** Many tutorials and examples online still reference Promtail because it was the standard tool until recently.

**How to avoid:** Use Grafana Alloy instead. Alloy is the official successor with active development and all future features.

**Warning signs:** Any documentation or example dated before 2025 likely uses Promtail. Always verify tool selection against current Grafana documentation.

### Pitfall 2: High Cardinality Labels

**What goes wrong:** Creating labels for dynamic values (order IDs, request IDs, user IDs) creates thousands of log streams, degrading Loki performance and causing ingestion failures.

**Why it happens:** Coming from traditional logging systems (Elasticsearch), developers assume more indexing = better performance. Loki works differently.

**How to avoid:**
- Only use static, low-cardinality values as labels (service name, environment, region)
- Keep total streams under 10,000 (ideally much lower)
- Put dynamic values in log content and use filter expressions: `{service="api"} |= "order=abc123"`

**Warning signs:**
- Labels with unbounded value sets (IDs, timestamps, URLs)
- More than 10-15 labels per log stream
- Loki ingestion errors mentioning "stream limit exceeded"

### Pitfall 3: Over-Parsing in Alloy Pipeline

**What goes wrong:** Extracting every field from logs into labels creates complexity, high cardinality, and doesn't improve query performance.

**Why it happens:** Developers try to "structure" logs by parsing everything into labels, recreating JSON logging in Loki.

**How to avoid:**
- Keep parsing minimal - extract only what you need as labels
- Use LogQL filter expressions to search log content: `|= "ERROR"`, `|~ "timeout.*ms"`
- Let Loki do what it does best: fast full-text search on log content

**Warning signs:**
- Complex multi-stage Alloy pipelines with 10+ parsing stages
- Labels for data that's only searched occasionally
- Regex patterns trying to extract every field from log lines

### Pitfall 4: Insufficient Docker Log Rotation

**What goes wrong:** Docker containers accumulate GB of logs on disk, eventually filling up the filesystem.

**Why it happens:** Default Docker logging configuration doesn't limit log file size or count.

**How to avoid:**
- Configure `max-size` (e.g., "10m") and `max-file` (e.g., "3") in docker-compose.yml
- Apply to all services, including infrastructure (postgres, redis, nginx)
- Test by generating logs and verifying rotation occurs

**Warning signs:**
- Disk usage growing continuously
- `/var/lib/docker/containers/*/*-json.log` files over 100MB
- Out of disk space errors

### Pitfall 5: JSON Logging When Plain Text is Better

**What goes wrong:** JSON logs require parsing stages in Alloy and don't work well with the specified plain text format.

**Why it happens:** Many logging libraries default to JSON. Developers assume structured = better.

**How to avoid:**
- Use plain text with consistent format (as specified in user constraints)
- Put structure in the format itself: `timestamp level service handler id details message`
- JSON parsing in Alloy is slower than simple regex on plain text

**Warning signs:**
- Logs with `{"timestamp":...,"level":...}` structure
- Need for `stage.json` in Alloy configuration
- Conflict with user's plain text requirement

### Pitfall 6: Missing Healthchecks for Loki

**What goes wrong:** Other services start before Loki is ready, logs are lost, Alloy keeps retrying and timing out.

**Why it happens:** Loki takes 10-15 seconds to initialize, especially with filesystem storage.

**How to avoid:**
- Add healthcheck to Loki service using `/-/ready` endpoint
- Configure Alloy to depend on Loki health
- Use `start_period` to give Loki time to initialize

**Warning signs:**
- Alloy logs showing "connection refused" errors
- Missing logs from service startup
- Loki not responding to queries immediately after startup

## Code Examples

Verified patterns from official sources and research:

### Grafana Datasource Provisioning for Loki

```yaml
# grafana/provisioning/datasources/loki.yml
apiVersion: 1

datasources:
  - name: Loki
    type: loki
    access: proxy
    url: http://loki:3100
    uid: loki
    isDefault: false
    editable: false
    jsonData:
      maxLines: 1000
```

Source: Grafana provisioning documentation, adapted from existing prometheus.yml pattern

### Docker Compose Service Definitions

```yaml
# Loki service
loki:
  image: grafana/loki:3.6.0
  container_name: loki
  restart: unless-stopped
  volumes:
    - ./loki/loki-config.yaml:/etc/loki/local-config.yaml:ro
    - loki-data:/loki
  command: -config.file=/etc/loki/local-config.yaml
  ports:
    - "3100:3100"
  healthcheck:
    test: ["CMD-SHELL", "wget --spider -q http://localhost:3100/ready || exit 1"]
    interval: 5s
    timeout: 3s
    retries: 5
    start_period: 15s
  deploy:
    resources:
      limits:
        memory: 512M
        cpus: '1.0'
      reservations:
        memory: 256M
        cpus: '0.5'
  logging:
    driver: json-file
    options:
      max-size: "10m"
      max-file: "3"

# Alloy service
alloy:
  image: grafana/alloy:latest
  container_name: alloy
  restart: unless-stopped
  volumes:
    - ./alloy/config.alloy:/etc/alloy/config.alloy:ro
    - /var/run/docker.sock:/var/run/docker.sock:ro
  command:
    - run
    - --server.http.listen-addr=0.0.0.0:12345
    - /etc/alloy/config.alloy
  ports:
    - "12345:12345"
  depends_on:
    loki:
      condition: service_healthy
  deploy:
    resources:
      limits:
        memory: 256M
        cpus: '0.5'
      reservations:
        memory: 128M
        cpus: '0.25'
  logging:
    driver: json-file
    options:
      max-size: "10m"
      max-file: "3"
```

Source: Compiled from Grafana Loki and Alloy documentation with resource limits based on research

### Complete Alloy Configuration for Docker Log Collection

```alloy
// Discover Docker containers
discovery.docker "containers" {
  host = "unix:///var/run/docker.sock"
}

// Extract service name from container name
discovery.relabel "logs" {
  targets = discovery.docker.containers.targets

  // Extract container name without leading slash
  rule {
    source_labels = ["__meta_docker_container_name"]
    regex         = "/(.*)"
    target_label  = "service"
  }

  // Only collect logs from application services
  rule {
    source_labels = ["service"]
    regex         = "(web-gateway|order-api|fulfillment-worker)"
    action        = "keep"
  }
}

// Collect logs from Docker containers
loki.source.docker "app_logs" {
  host       = "unix:///var/run/docker.sock"
  targets    = discovery.relabel.logs.output
  forward_to = [loki.write.endpoint.receiver]

  // Relabel to ensure clean service labels
  relabel_rules {
    // Keep service label from discovery
    rule {
      source_labels = ["service"]
      target_label  = "service"
    }
  }
}

// Write logs to Loki
loki.write "endpoint" {
  endpoint {
    url = "http://loki:3100/loki/api/v1/push"
  }
}
```

Source: Grafana Alloy loki.source.docker documentation

### LogQL Query Examples (for learner exploration)

These are examples of queries the learner will discover through Grafana Explore:

```logql
# All logs from order-api service
{service="order-api"}

# All ERROR logs from order-api
{service="order-api"} |= "ERROR"

# All logs containing "timeout"
{service="web-gateway"} |= "timeout"

# Logs matching regex pattern (specific order ID)
{service="order-api"} |~ "order=abc123"

# Multiple filters (ERROR or WARN)
{service="fulfillment-worker"} |~ "ERROR|WARN"

# Exclude certain messages
{service="order-api"} != "health check"

# Last 5 minutes of logs
{service="web-gateway"} |= "ERROR" [5m]
```

Source: Grafana LogQL documentation

### Realistic Error Patterns (for service implementation)

```javascript
// web-gateway - realistic timeout errors
app.post('/api/orders', async (req, res) => {
  const reqId = uuidv4();

  try {
    logger.info('Incoming order request', {
      handler: '/api/orders',
      reqId,
      userId: req.body.userId
    });

    // Simulate occasional timeout
    const timeout = Math.random() < 0.05 ? 6000 : 1000;
    const response = await grpcClient.createOrder(req.body, timeout);

    logger.info('Order created successfully', {
      handler: '/api/orders',
      reqId,
      orderId: response.orderId
    });

    res.json(response);
  } catch (error) {
    if (error.code === 'DEADLINE_EXCEEDED') {
      logger.error('Upstream timeout', {
        handler: '/api/orders',
        reqId,
        timeout: '5000ms'
      });
      // Output: 2026-02-08T14:32:02Z ERROR web-gateway /api/orders req=xyz789 timeout=5000ms Upstream timeout
    } else {
      logger.error('Order creation failed', {
        handler: '/api/orders',
        reqId,
        error: error.message
      });
    }
    res.status(500).json({error: error.message});
  }
});
```

```python
# order-api - realistic database retry logic
def create_order(order_data):
    order_id = str(uuid.uuid4())
    retry_count = 0
    max_retries = 3

    while retry_count < max_retries:
        try:
            logger.info('Attempting to create order',
                       handler='CreateOrder',
                       order_id=order_id,
                       attempt=retry_count + 1)

            # Simulate occasional connection issues
            if random.random() < 0.03:
                raise psycopg2.OperationalError("connection timeout")

            db.execute("INSERT INTO orders ...")
            logger.info('Order created successfully',
                       handler='CreateOrder',
                       order_id=order_id)
            return order_id

        except psycopg2.OperationalError as e:
            retry_count += 1
            if retry_count >= max_retries:
                logger.error('Max retries exceeded',
                           handler='CreateOrder',
                           order_id=order_id,
                           retries=max_retries,
                           error=str(e))
                raise
            else:
                logger.warn('Database connection failed, retrying',
                          handler='CreateOrder',
                          order_id=order_id,
                          attempt=retry_count,
                          error=str(e))
                time.sleep(0.5 * retry_count)
```

```go
// fulfillment-worker - realistic queue processing issues
func processItem(item QueueItem) error {
    logger.Info("Processing queue item", "ProcessQueue", item.ID, map[string]interface{}{
        "status": item.Status,
    })

    // Simulate occasional processing failures
    if rand.Float64() < 0.08 {
        if item.RetryCount < 3 {
            logger.Warn("Processing failed, will retry", "ProcessQueue", item.ID, map[string]interface{}{
                "attempt": fmt.Sprintf("%d/3", item.RetryCount+1),
                "reason": "temporary error",
            })
            // Output: 2026-02-08T14:32:01Z WARN fulfillment-worker ProcessQueue item=abc123 attempt=2/3 reason=temporary error Processing failed, will retry
            item.RetryCount++
            return ErrRetryable
        } else {
            logger.Error("Max retries exceeded, moving to DLQ", "ProcessQueue", item.ID, map[string]interface{}{
                "attempts": item.RetryCount,
            })
            return ErrMaxRetries
        }
    }

    logger.Info("Item processed successfully", "ProcessQueue", item.ID, map[string]interface{}{
        "duration_ms": 250,
    })
    return nil
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Promtail for log collection | Grafana Alloy | Feb 2025 | Promtail deprecated, Alloy is unified telemetry collector (logs, metrics, traces) |
| BoltDB Shipper index | TSDB index | Loki 2.8+ | Better performance, lower resource usage |
| JSON logging everywhere | Plain text or structured metadata | 2024+ | Lower parsing overhead, simpler pipelines, better Loki performance |
| Deep log indexing (Elasticsearch) | Label-based indexing (Loki) | 2019+ | Massive cost reduction, simpler operations, fast enough for most use cases |

**Deprecated/outdated:**
- **Promtail**: Deprecated Feb 13, 2025. EOL March 2, 2026. Use Grafana Alloy.
- **BoltDB Shipper**: Replaced by TSDB index in Loki 2.8+. Still supported but not recommended.
- **Docker Loki logging driver**: Alternative to Alloy, but less flexible and harder to configure parsing/filtering.

## Open Questions

### Question 1: Alloy vs Promtail for Learning Environment

**What we know:**
- Promtail reaches EOL in 22 days (March 2, 2026)
- Alloy is the official successor with active development
- Many online tutorials still reference Promtail

**What's unclear:**
- Is Alloy stable enough for production use? (Research suggests yes - it's the recommended tool)
- Are there any Alloy rough edges for Docker log collection? (Documentation appears complete)

**Recommendation:**
Use Grafana Alloy. While Promtail would technically work until March 2, the EOL date is too close. Building a learning environment on deprecated technology sends the wrong message. Alloy is production-ready and future-proof.

**Confidence:** HIGH - based on official Grafana deprecation notice and Alloy documentation

### Question 2: Should we modify existing service loggers or use Alloy parsing?

**What we know:**
- Services currently log JSON
- User wants plain text format
- Alloy can parse logs with pipeline stages

**Options:**
1. **Modify service code:** Change logger.js/py/go to output plain text format
2. **Parse in Alloy:** Keep JSON, use Alloy `stage.json` to extract fields

**Recommendation:**
Modify service code to output plain text. Reasons:
- User explicitly specified plain text format as a decision (not Claude's discretion)
- Plain text is easier to read in console during development
- No parsing overhead in Alloy pipeline
- Simpler Alloy configuration (just collection, no processing)
- Better learning experience (logs look like production logs)

**Confidence:** HIGH - user constraint clearly specifies plain text format

### Question 3: Exact retention period

**What we know:**
- User wants "short retention" for "sessions are hours, not days"
- Loki minimum retention is 24 hours
- Default is 30 days if not specified

**Options:**
- 24h (minimum)
- 72h (3 days)
- 168h (7 days)

**Recommendation:**
72h (3 days). Reasons:
- 24h is too short - learner might want to explore yesterday's session
- 3 days provides multi-session history without wasting resources
- Well within storage constraints for this volume

**Confidence:** MEDIUM - based on common development practices, not hard requirements

## Sources

### Primary (HIGH confidence)

- [Grafana Loki Docker Installation](https://grafana.com/docs/loki/latest/setup/install/docker/) - Installation methods and current version
- [Grafana Loki Label Best Practices](https://grafana.com/docs/loki/latest/get-started/labels/bp-labels/) - Cardinality limits, label vs filter tradeoffs
- [Grafana Loki Retention Configuration](https://grafana.com/docs/loki/latest/operations/storage/retention/) - Retention setup and limits
- [Grafana Loki Deployment Modes](https://grafana.com/docs/loki/latest/get-started/deployment-modes/) - Monolithic vs scalable vs microservices
- [Promtail Deprecation Notice](https://grafana.com/docs/loki/latest/send-data/promtail/) - EOL timeline and Alloy migration
- [Grafana Alloy loki.source.docker](https://grafana.com/docs/alloy/latest/reference/components/loki/loki.source.docker/) - Docker log collection configuration
- [Grafana Alloy loki.process](https://grafana.com/docs/alloy/latest/reference/components/loki.process/) - Log processing pipeline stages
- [Grafana Alloy discovery.relabel](https://grafana.com/docs/alloy/latest/reference/components/discovery.relabel/) - Relabeling rules and patterns
- [Grafana Alloy discovery.docker](https://grafana.com/docs/alloy/latest/reference/components/discovery.docker/) - Docker container discovery
- [Grafana Alloy Send Logs to Loki Tutorial](https://grafana.com/docs/alloy/latest/tutorials/send-logs-to-loki/) - End-to-end configuration example

### Secondary (MEDIUM confidence)

- [How to Optimize Loki Label Cardinality](https://oneuptime.com/blog/post/2026-01-21-loki-label-cardinality/view) - January 2026 blog post on cardinality
- [How to Ship Logs to Loki with Promtail](https://oneuptime.com/blog/post/2026-01-21-loki-promtail-log-shipping/view) - January 2026 tutorial (note: Promtail deprecated)
- [How to Run Loki in Docker and Docker Compose](https://oneuptime.com/blog/post/2026-01-21-loki-docker-compose/view) - January 2026 deployment guide
- [Grafana Alloy Scenarios Repository](https://github.com/grafana/alloy-scenarios) - Official example configurations
- [Grafana Loki Getting Started Example](https://github.com/grafana/loki/blob/main/examples/getting-started/docker-compose.yaml) - Official docker-compose examples

### Tertiary (LOW confidence - for awareness only)

- Various Medium articles on Loki + Alloy integration (dates unknown, not verified)
- Stack Overflow discussions on Loki label strategy (various dates)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Official Grafana documentation, clear deprecation notices
- Architecture: HIGH - Official documentation and examples, well-established patterns
- Label strategy: HIGH - Official best practices documentation directly addresses service/level question
- Alloy configuration: HIGH - Official component reference documentation with examples
- Pitfalls: MEDIUM-HIGH - Combination of official warnings and practical experience patterns

**Research date:** 2026-02-08
**Valid until:** 2026-03-08 (30 days) - Loki is stable technology, but Alloy is actively developed

**Critical time sensitivity:**
Promtail EOL is March 2, 2026 (22 days from research date). Any plan using Promtail must acknowledge this is deprecated technology being used for short-term purposes only.
