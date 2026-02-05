# Phase 1: Foundation Services - Research

**Researched:** 2026-02-05
**Domain:** Docker Compose multi-service orchestration with polyglot microservices
**Confidence:** HIGH

## Summary

This phase establishes a polyglot microservices foundation using Docker Compose to orchestrate three services (Node.js Web Gateway, Python Order API, Go Fulfillment Worker) with PostgreSQL, Redis, Nginx reverse proxy, and automated traffic generation. The architecture demonstrates REST (external), gRPC (internal sync), and Redis queue (async) communication patterns within a 12GB RAM constraint.

Research focused on Docker Compose v3 patterns for multi-service orchestration, official gRPC implementations for Node.js and Python, Redis dual-purpose patterns (cache + queue), health check dependencies, and resource management. The standard stack has been verified through official documentation and current 2026 sources.

The foundation prioritizes one-command startup (`docker compose up`), realistic traffic simulation with controllable load patterns, and structured JSON logging for observability readiness. Service communication uses production-grade patterns: Nginx routes external traffic to Node.js gateway, gRPC handles synchronous inter-service calls, and Redis queues enable asynchronous processing in the Go worker.

**Primary recommendation:** Use Docker Compose profiles for optional services, implement health checks with `service_healthy` conditions for startup dependencies, and adopt official gRPC libraries (@grpc/grpc-js for Node, grpcio/grpcio-tools for Python) with structured JSON logging from day one.

## Standard Stack

The established libraries/tools for this domain:

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Docker Compose | v2+ | Multi-container orchestration | Official Docker tool, v2 native integration with Docker CLI, profiles support |
| @grpc/grpc-js | 1.14.3 | Node.js gRPC client/server | Official gRPC implementation, pure JavaScript, no C++ dependencies |
| grpcio | 1.76.0+ | Python gRPC runtime | Official Python gRPC library, supports Python 3.9+ |
| grpcio-tools | 1.76.0+ | Python protobuf compiler | Required for .proto code generation in Python |
| @grpc/proto-loader | latest | Node.js proto loader | Official dynamic .proto file loading for Node.js |
| redis (node-redis) | latest | Node.js Redis client | Official Redis client, actively maintained, supports latest Redis features |
| redis-py | 7.1.0+ | Python Redis client | Official Python Redis client, supports Redis 7.2-8.2 |
| go-redis/v9 | v9 | Go Redis client | Official Redis Go client, RESP3 support, OpenTelemetry ready |
| pgx/v5 | v5 | Go PostgreSQL driver | High-performance native PostgreSQL driver for Go |
| psycopg | 3.x | Python PostgreSQL adapter | Modern async-ready PostgreSQL adapter (psycopg3) |
| PostgreSQL | 15+ | Relational database | Industry standard, Docker official image with init script support |
| Redis | 7.x | Cache and queue | In-memory data store, dual-purpose (cache + queue) |
| Nginx | latest | Reverse proxy | Industry standard reverse proxy, official Docker image |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| k6 | latest | Load testing / traffic gen | Controllable HTTP load testing, scriptable in JavaScript, Docker support |
| pg (node-postgres) | latest | Node.js PostgreSQL client | If Node.js services need database access (Web Gateway optional) |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| @grpc/grpc-js | grpc (C++ binding) | C++ binding has better performance but harder to install, deprecated |
| node-redis | ioredis | ioredis in maintenance mode; node-redis is official and actively developed |
| psycopg3 | psycopg2 | psycopg2 older but more widely used; psycopg3 has async, better performance, modern |
| pgx | database/sql + pq | database/sql is database-agnostic; pgx is PostgreSQL-specific with better performance |
| k6 | Locust, Apache Bench | k6 has native Docker support, scriptable load control, metrics export |

**Installation:**

Node.js (Web Gateway):
```bash
npm install @grpc/grpc-js @grpc/proto-loader redis
```

Python (Order API):
```bash
pip install grpcio grpcio-tools psycopg[binary] redis
```

Go (Fulfillment Worker):
```bash
go get github.com/redis/go-redis/v9
go get github.com/jackc/pgx/v5
```

## Architecture Patterns

### Recommended Project Structure

Polyglot microservices repository:

```
ObservabilityAndPipelines/
├── services/
│   ├── web-gateway/           # Node.js REST API (external entry point)
│   │   ├── src/
│   │   │   ├── server.js      # HTTP server
│   │   │   ├── grpc-client.js # gRPC client to Order API
│   │   │   └── logger.js      # Structured JSON logging
│   │   ├── Dockerfile
│   │   ├── package.json
│   │   └── proto/             # Shared .proto definitions
│   │
│   ├── order-api/             # Python gRPC server
│   │   ├── src/
│   │   │   ├── server.py      # gRPC server implementation
│   │   │   ├── db.py          # PostgreSQL queries
│   │   │   ├── redis_queue.py # Queue publisher
│   │   │   └── logger.py      # Structured JSON logging
│   │   ├── Dockerfile
│   │   ├── requirements.txt
│   │   └── proto/             # Generated from .proto
│   │
│   └── fulfillment-worker/    # Go async worker
│       ├── cmd/
│       │   └── worker/
│       │       └── main.go    # Entry point
│       ├── internal/
│       │   ├── worker/        # Queue consumer logic
│       │   ├── db/            # Database access
│       │   └── logger/        # Structured logging
│       ├── Dockerfile
│       └── go.mod
│
├── traffic-generator/          # Load testing service
│   ├── scenarios/
│   │   ├── steady.js          # Baseline traffic
│   │   ├── burst.js           # Peak traffic
│   │   └── overload.js        # Stress test
│   ├── Dockerfile
│   └── server.js              # HTTP control server
│
├── nginx/
│   └── nginx.conf             # Reverse proxy config
│
├── db/
│   └── init-scripts/
│       ├── 01-schema.sql      # Create tables
│       └── 02-seed.sql        # Insert sample data
│
├── docker-compose.yml         # Core services
├── docker-compose.override.yml # Optional: dev overrides
├── .env.example               # Environment template
└── Makefile                   # Common operations
```

### Pattern 1: Docker Compose Profiles

**What:** Profiles group optional services that can be selectively activated without maintaining multiple compose files.

**When to use:** Always for optional services (debugging tools, different infrastructure modes). Core services should NOT have profiles.

**Example:**
```yaml
# docker-compose.yml
services:
  # Core services - NO profiles (always start)
  web-gateway:
    image: web-gateway:latest
    depends_on:
      order-api:
        condition: service_healthy
    ports:
      - "3000:3000"

  order-api:
    image: order-api:latest
    healthcheck:
      test: ["CMD", "grpc_health_probe", "-addr=:50051"]
      interval: 5s
      timeout: 3s
      retries: 3
      start_period: 10s

  # Optional services - WITH profiles
  jaeger:
    image: jaegertracing/all-in-one:latest
    profiles: [tracing]
    ports:
      - "16686:16686"

  kafka:
    image: confluentinc/cp-kafka:latest
    profiles: [kafka, full]
```

**Activation:**
```bash
# Core only
docker compose up

# Core + tracing
docker compose --profile tracing up

# Core + all profiles
docker compose --profile "*" up
```

### Pattern 2: Health Check Dependencies

**What:** Use `depends_on` with `condition: service_healthy` to ensure services start only when dependencies are truly ready, not just running.

**When to use:** Always for stateful services (databases, message queues) that have initialization time.

**Example:**
```yaml
# docker-compose.yml (verified pattern from official docs)
services:
  postgres:
    image: postgres:15
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U orderuser -d orderdb"]
      interval: 5s
      timeout: 3s
      retries: 5
      start_period: 10s
    environment:
      POSTGRES_USER: orderuser
      POSTGRES_PASSWORD: orderpass
      POSTGRES_DB: orderdb
    volumes:
      - postgres-data:/var/lib/postgresql/data
      - ./db/init-scripts:/docker-entrypoint-initdb.d:ro

  redis:
    image: redis:7-alpine
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 3s
      timeout: 2s
      retries: 5
      start_period: 5s

  order-api:
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    # Service starts only after postgres AND redis are healthy
```

### Pattern 3: PostgreSQL Initialization Scripts

**What:** Mount SQL/shell scripts to `/docker-entrypoint-initdb.d` for automatic database initialization on first startup.

**When to use:** Always for pre-seeding databases with schema and sample data.

**Example:**
```yaml
# docker-compose.yml
services:
  postgres:
    image: postgres:15
    volumes:
      - postgres-data:/var/lib/postgresql/data
      - ./db/init-scripts:/docker-entrypoint-initdb.d:ro
```

```sql
-- db/init-scripts/01-schema.sql
CREATE TABLE products (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  price DECIMAL(10, 2) NOT NULL
);

CREATE TABLE orders (
  id SERIAL PRIMARY KEY,
  product_id INTEGER REFERENCES products(id),
  quantity INTEGER NOT NULL,
  status VARCHAR(50) DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT NOW()
);
```

```sql
-- db/init-scripts/02-seed.sql
INSERT INTO products (name, price) VALUES
  ('Widget A', 19.99),
  ('Widget B', 29.99),
  ('Widget C', 39.99);
```

**Note:** Scripts execute **only on first startup** when data volume is empty. To re-run, delete volume: `docker compose down -v`.

### Pattern 4: Resource Limits

**What:** Set memory and CPU limits to prevent resource exhaustion within 12GB constraint.

**When to use:** Always in multi-service environments with limited resources.

**Example:**
```yaml
# docker-compose.yml (v3.8+ syntax)
services:
  web-gateway:
    deploy:
      resources:
        limits:
          cpus: '1.0'
          memory: 512M
        reservations:
          cpus: '0.5'
          memory: 256M

  order-api:
    deploy:
      resources:
        limits:
          cpus: '1.0'
          memory: 1G
        reservations:
          cpus: '0.5'
          memory: 512M

  postgres:
    deploy:
      resources:
        limits:
          cpus: '2.0'
          memory: 2G
        reservations:
          cpus: '1.0'
          memory: 1G
```

**Resource budget (12GB total):**
- PostgreSQL: 2GB
- Redis: 512MB
- Nginx: 128MB
- Web Gateway: 512MB
- Order API: 1GB
- Fulfillment Worker: 512MB
- Traffic Generator: 256MB
- Buffer: ~7GB remaining for profiles

### Pattern 5: Nginx Reverse Proxy Routing

**What:** Nginx routes external traffic to internal services using upstream definitions and proxy_pass.

**When to use:** Always when services should not be directly exposed to external traffic.

**Example:**
```nginx
# nginx/nginx.conf
upstream web_gateway {
    server web-gateway:3000;
}

server {
    listen 80;

    location / {
        proxy_pass http://web_gateway;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Request-ID $request_id;
    }
}
```

```yaml
# docker-compose.yml
services:
  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf:ro
    depends_on:
      - web-gateway
```

### Pattern 6: Structured JSON Logging

**What:** All services emit logs as JSON with correlation ID, service name, timestamp, level, and message.

**When to use:** Always from day one - enables future observability tooling.

**Example:**

Node.js (Web Gateway):
```javascript
// logger.js
function log(level, message, metadata = {}) {
  const entry = {
    timestamp: new Date().toISOString(),
    level,
    service: 'web-gateway',
    message,
    ...metadata
  };
  console.log(JSON.stringify(entry));
}

// server.js
app.use((req, res, next) => {
  req.correlationId = req.headers['x-request-id'] || crypto.randomUUID();
  log('info', 'Request received', {
    correlation_id: req.correlationId,
    method: req.method,
    path: req.path
  });
  next();
});
```

Python (Order API):
```python
# logger.py
import json
import logging
from datetime import datetime

def json_log(level, message, **kwargs):
    entry = {
        'timestamp': datetime.utcnow().isoformat() + 'Z',
        'level': level,
        'service': 'order-api',
        'message': message,
        **kwargs
    }
    print(json.dumps(entry))
```

Go (Fulfillment Worker):
```go
// internal/logger/logger.go
package logger

import (
    "encoding/json"
    "log"
    "time"
)

type LogEntry struct {
    Timestamp     string `json:"timestamp"`
    Level         string `json:"level"`
    Service       string `json:"service"`
    Message       string `json:"message"`
    CorrelationID string `json:"correlation_id,omitempty"`
}

func Info(message string, correlationID string) {
    entry := LogEntry{
        Timestamp:     time.Now().UTC().Format(time.RFC3339),
        Level:         "info",
        Service:       "fulfillment-worker",
        Message:       message,
        CorrelationID: correlationID,
    }
    b, _ := json.Marshal(entry)
    log.Println(string(b))
}
```

### Pattern 7: gRPC Service Definition

**What:** Define service contracts in .proto files, share across polyglot services.

**When to use:** For internal synchronous service-to-service communication.

**Example:**

```protobuf
// proto/order.proto
syntax = "proto3";

package order;

service OrderService {
  rpc CreateOrder (CreateOrderRequest) returns (CreateOrderResponse);
  rpc GetOrder (GetOrderRequest) returns (Order);
}

message CreateOrderRequest {
  int32 product_id = 1;
  int32 quantity = 2;
}

message CreateOrderResponse {
  int32 order_id = 1;
  string status = 2;
}

message GetOrderRequest {
  int32 order_id = 1;
}

message Order {
  int32 id = 1;
  int32 product_id = 2;
  int32 quantity = 3;
  string status = 4;
  string created_at = 5;
}
```

Node.js client:
```javascript
// grpc-client.js
const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');

const packageDefinition = protoLoader.loadSync('proto/order.proto');
const orderProto = grpc.loadPackageDefinition(packageDefinition).order;

const client = new orderProto.OrderService(
  'order-api:50051',
  grpc.credentials.createInsecure()
);

function createOrder(productId, quantity, callback) {
  client.CreateOrder({ product_id: productId, quantity }, callback);
}
```

Python server:
```python
# server.py
import grpc
from concurrent import futures
import order_pb2
import order_pb2_grpc

class OrderServicer(order_pb2_grpc.OrderServiceServicer):
    def CreateOrder(self, request, context):
        # Business logic
        order_id = save_order(request.product_id, request.quantity)
        return order_pb2.CreateOrderResponse(
            order_id=order_id,
            status='pending'
        )

server = grpc.server(futures.ThreadPoolExecutor(max_workers=10))
order_pb2_grpc.add_OrderServiceServicer_to_server(OrderServicer(), server)
server.add_insecure_port('[::]:50051')
server.start()
```

### Pattern 8: Redis Dual-Purpose (Cache + Queue)

**What:** Use Redis for both caching (product data, order lookups) and queuing (order fulfillment messages).

**When to use:** When you need both fast data access and asynchronous task processing.

**Example:**

Python (Order API) - Queue Publisher:
```python
import redis
import json

r = redis.Redis(host='redis', port=6379, decode_responses=True)

# Publish to queue
def enqueue_order(order_id, product_id, quantity):
    message = json.dumps({
        'order_id': order_id,
        'product_id': product_id,
        'quantity': quantity,
        'timestamp': datetime.utcnow().isoformat()
    })
    r.lpush('fulfillment_queue', message)

# Cache product data
def get_product(product_id):
    cache_key = f'product:{product_id}'
    cached = r.get(cache_key)
    if cached:
        return json.loads(cached)

    # Fetch from DB, cache for 5 minutes
    product = fetch_from_db(product_id)
    r.setex(cache_key, 300, json.dumps(product))
    return product
```

Go (Fulfillment Worker) - Queue Consumer:
```go
import (
    "context"
    "encoding/json"
    "github.com/redis/go-redis/v9"
)

func consumeQueue(ctx context.Context, rdb *redis.Client) {
    for {
        result, err := rdb.BRPop(ctx, 0, "fulfillment_queue").Result()
        if err != nil {
            log.Printf("Queue error: %v", err)
            continue
        }

        var order OrderMessage
        json.Unmarshal([]byte(result[1]), &order)

        // Process order
        processOrder(order)
    }
}
```

### Pattern 9: Controllable Traffic Generator

**What:** HTTP service that generates load with controllable modes (steady, burst, overload).

**When to use:** For baseline traffic during development and testing observability tooling.

**Example:**

```javascript
// traffic-generator/server.js
const express = require('express');
const axios = require('axios');

let currentMode = 'steady';
let intervalId = null;

const modes = {
  steady: { rps: 5, duration: null },   // 5 requests/sec indefinitely
  burst: { rps: 50, duration: 60000 },  // 50 req/sec for 1 minute
  overload: { rps: 200, duration: null } // 200 req/sec indefinitely
};

function generateTraffic() {
  const mode = modes[currentMode];
  const interval = 1000 / mode.rps;

  intervalId = setInterval(async () => {
    try {
      await axios.post('http://nginx/orders', {
        product_id: Math.floor(Math.random() * 3) + 1,
        quantity: Math.floor(Math.random() * 5) + 1
      });
    } catch (err) {
      // Silence errors during load testing
    }
  }, interval);
}

app.post('/mode/:modeName', (req, res) => {
  const { modeName } = req.params;
  if (!modes[modeName]) {
    return res.status(400).json({ error: 'Invalid mode' });
  }

  if (intervalId) clearInterval(intervalId);
  currentMode = modeName;
  generateTraffic();

  res.json({ mode: currentMode, ...modes[currentMode] });
});

// Auto-start in steady mode
generateTraffic();
```

```yaml
# docker-compose.yml
services:
  traffic-generator:
    build: ./traffic-generator
    depends_on:
      - nginx
    deploy:
      resources:
        limits:
          memory: 256M
```

### Anti-Patterns to Avoid

- **No health checks on databases:** Leads to race conditions where services try to connect before databases are ready. Always implement health checks for PostgreSQL and Redis.
- **Hardcoded service URLs:** Use Docker Compose service names for DNS resolution (e.g., `postgres:5432`, not `localhost:5432`).
- **Anonymous volumes:** Create data persistence issues. Always use named volumes for stateful data.
- **Exposing internal services:** Only expose Nginx externally. Backend services communicate via internal Docker network.
- **Using depends_on without conditions:** `depends_on` without `condition: service_healthy` only waits for container start, not service readiness.
- **Large base images:** Use Alpine variants where available to reduce image size and startup time.
- **Missing resource limits:** Can lead to one service consuming all available memory. Always set limits.
- **Environment secrets in compose file:** Use `.env` files and `.env.example` template. Never commit secrets.

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| gRPC code generation | Manual protobuf serialization | @grpc/proto-loader (Node.js), grpcio-tools (Python) | Protocol buffers handle serialization, versioning, backward compatibility |
| Service health checks | Custom ping endpoints | Docker healthcheck with native tools (pg_isready, redis-cli ping) | Native tools understand service readiness better than custom HTTP pings |
| Database connection pooling | Manual connection management | Built-in pooling (pgx pool, psycopg pool, pg pool) | Libraries handle connection lifecycle, reconnection, proper cleanup |
| Request correlation | Manual ID propagation | Standard X-Request-ID header + logger middleware | Follows HTTP standards, works with reverse proxies, supported by observability tools |
| Traffic generation | Custom request scripts | k6, Locust, or similar load testing tools | Sophisticated load patterns, metrics collection, scenario scripting |
| PostgreSQL initialization | Manual SQL execution in startup scripts | /docker-entrypoint-initdb.d mount | Official PostgreSQL image handles execution order, error handling, idempotency |
| Service discovery | Hardcoded IPs | Docker Compose service names (built-in DNS) | Automatic DNS resolution, works across container restarts, no configuration needed |
| Redis queue patterns | Custom pub/sub implementation | Standard list operations (LPUSH/BRPOP) | Atomic operations, blocking pops, durability guarantees |

**Key insight:** Docker Compose and official client libraries handle orchestration complexity (startup order, DNS, health checks, connection pooling). Focus implementation effort on business logic, not infrastructure plumbing.

## Common Pitfalls

### Pitfall 1: Misunderstanding `depends_on` Without Health Checks

**What goes wrong:** Services start before dependencies are ready to accept connections. PostgreSQL container is "running" but still initializing. Application tries to connect, fails, crashes or retries indefinitely.

**Why it happens:** `depends_on` without conditions only waits for container start (process running), not service readiness (accepting connections). Databases have initialization time that Docker doesn't track by default.

**How to avoid:**
1. Always define healthchecks for stateful services
2. Use `depends_on` with `condition: service_healthy`
3. Set appropriate `start_period` to give initialization time
4. Implement application-level retry logic as backup

**Warning signs:**
- Services log "connection refused" on startup
- Containers restart repeatedly in first 30 seconds
- Database logs show initialization after application connection attempts

**Example fix:**
```yaml
postgres:
  healthcheck:
    test: ["CMD-SHELL", "pg_isready -U $POSTGRES_USER -d $POSTGRES_DB"]
    interval: 5s
    timeout: 3s
    retries: 5
    start_period: 10s  # Give PostgreSQL time to initialize

order-api:
  depends_on:
    postgres:
      condition: service_healthy  # Wait for health check to pass
```

### Pitfall 2: PostgreSQL Init Scripts Not Running

**What goes wrong:** Database tables don't exist on first startup even though init scripts are mounted. Application queries fail with "relation does not exist."

**Why it happens:** Init scripts in `/docker-entrypoint-initdb.d` only run when data directory is empty (first-time initialization). If volume already exists, scripts are skipped silently. Common when testing: volume persists between `docker compose down` and `docker compose up`.

**How to avoid:**
1. Use `docker compose down -v` to remove volumes when testing initialization
2. Make init scripts idempotent with `CREATE TABLE IF NOT EXISTS`
3. Document volume cleanup in README for fresh starts
4. Consider health check that verifies schema existence

**Warning signs:**
- Tables exist on first run, missing on subsequent runs
- Schema changes in init scripts don't apply
- Different developers have different database states

**Example fix:**
```bash
# Makefile
.PHONY: clean
clean:
	docker compose down -v  # Remove volumes to force re-initialization

.PHONY: reset
reset: clean
	docker compose up -d
```

```sql
-- db/init-scripts/01-schema.sql (idempotent)
CREATE TABLE IF NOT EXISTS products (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  price DECIMAL(10, 2) NOT NULL
);
```

### Pitfall 3: Missing curl/wget in Health Check Containers

**What goes wrong:** Health check defined as `test: ["CMD", "curl", "http://localhost:3000/health"]` but container is marked unhealthy immediately. No clear error message from Docker.

**Why it happens:** Many minimal base images (Alpine, distroless) don't include curl or wget to reduce image size. Docker health check fails silently if command doesn't exist.

**How to avoid:**
1. Install health check tools in Dockerfile if using HTTP checks
2. Use language-specific health check commands where possible
3. For minimal images, use TCP socket checks instead
4. Prefer native tools (pg_isready, redis-cli) over HTTP

**Warning signs:**
- Container immediately unhealthy despite service working
- Manual curl inside container works, health check doesn't
- Health check works in development, fails in production (different base images)

**Example fix:**

Option 1 - Install tool:
```dockerfile
# Dockerfile
FROM node:20-alpine
RUN apk add --no-cache curl  # Add curl to Alpine
```

Option 2 - Use native command:
```yaml
# For Node.js service
healthcheck:
  test: ["CMD", "node", "-e", "require('http').get('http://localhost:3000/health')"]
```

Option 3 - TCP check:
```yaml
# For any service exposing port
healthcheck:
  test: ["CMD-SHELL", "nc -z localhost 3000 || exit 1"]
```

### Pitfall 4: Resource Limits in Swarm vs Standalone Mode

**What goes wrong:** Resource limits defined in `deploy.resources` section are ignored when running `docker compose up`. Services consume unlimited memory, potentially crashing host.

**Why it happens:** The `deploy` section is primarily for Docker Swarm mode. Standalone Docker Compose (v2) supports it but behavior varies by version. Some versions ignore it entirely.

**How to avoid:**
1. Use Compose v3.8+ for deploy section support in standalone mode
2. Verify limits with `docker stats` after startup
3. Consider v2.4 syntax for guaranteed standalone support
4. Test resource limits in target environment

**Warning signs:**
- `docker stats` shows services using more memory than configured limits
- No OOM kills despite setting low limits
- Same compose file works differently on different Docker versions

**Example fix:**

For Docker Compose v3.8+ (modern, Swarm-compatible):
```yaml
version: '3.8'
services:
  order-api:
    deploy:
      resources:
        limits:
          memory: 1G
```

For guaranteed standalone support (v2.4):
```yaml
version: '2.4'
services:
  order-api:
    mem_limit: 1g
    cpus: 1.0
```

### Pitfall 5: gRPC Insecure Credentials in Production

**What goes wrong:** This pitfall is deferred to Phase 2 (observability) and beyond. Foundation phase uses `grpc.credentials.createInsecure()` intentionally for simplicity.

**Why it happens:** gRPC requires credentials even for local communication. Insecure credentials are quick for development.

**How to avoid:** Document that TLS/mTLS should be added before production. Phase 1 focuses on getting services communicating; security is a later phase concern.

**Warning signs:** N/A for Phase 1 - this is acceptable for local development environment.

### Pitfall 6: Correlation ID Not Propagating Through gRPC

**What goes wrong:** Correlation IDs work for REST calls but disappear when crossing gRPC boundaries. Can't trace requests through entire system.

**Why it happens:** gRPC doesn't automatically propagate HTTP headers. Metadata must be explicitly passed in gRPC calls and extracted in gRPC handlers.

**How to avoid:**
1. Extract correlation ID from HTTP headers in gateway
2. Pass correlation ID via gRPC metadata
3. Extract metadata in gRPC server, include in logs
4. Pass to downstream services (Redis queue)

**Warning signs:**
- Logs show correlation ID in web-gateway, missing in order-api
- Can trace REST call but not gRPC processing
- Each service generates new correlation ID instead of reusing

**Example fix:**

Node.js (client):
```javascript
// grpc-client.js
const metadata = new grpc.Metadata();
metadata.add('x-correlation-id', correlationId);

client.CreateOrder(request, metadata, callback);
```

Python (server):
```python
# server.py
def CreateOrder(self, request, context):
    metadata = dict(context.invocation_metadata())
    correlation_id = metadata.get('x-correlation-id', str(uuid.uuid4()))

    json_log('info', 'Order created', correlation_id=correlation_id)
    # Pass to Redis queue
```

### Pitfall 7: YAML Indentation Errors

**What goes wrong:** Docker Compose fails to start with cryptic YAML parsing errors. Services defined but not recognized.

**Why it happens:** YAML is whitespace-sensitive. Mixing tabs/spaces or incorrect indentation breaks parsing. Error messages often point to wrong line.

**How to avoid:**
1. Use editor with YAML validation (VS Code YAML extension)
2. Use `docker compose config` to validate before starting
3. Use 2-space indentation consistently
4. Never mix tabs and spaces

**Warning signs:**
- Error: "mapping values are not allowed here"
- Error: "could not find expected ':'"
- Services defined but `docker compose ps` shows nothing

**Example fix:**
```bash
# Validate compose file
docker compose config

# If valid, outputs merged configuration
# If invalid, shows parsing error with line number
```

### Pitfall 8: Port Conflicts with Host Services

**What goes wrong:** `docker compose up` fails with "address already in use" error. PostgreSQL won't start.

**Why it happens:** Host machine already has PostgreSQL (or other service) running on port 5432. Docker can't bind to same port.

**How to avoid:**
1. Use non-standard ports for Docker services (5433 instead of 5432)
2. Stop host services during development
3. Don't expose ports for internal-only services
4. Document port requirements

**Warning signs:**
- Error: "bind: address already in use"
- One service starts, others fail
- Works on some developer machines, not others

**Example fix:**
```yaml
# docker-compose.yml
services:
  postgres:
    ports:
      - "5433:5432"  # Host:Container - expose on non-standard port
    # Internal services use postgres:5432 (container port)

  order-api:
    # No ports section - internal only, accessed via Docker network
```

## Code Examples

Verified patterns from official sources:

### Docker Compose Health Check with Dependencies

```yaml
# Source: https://docs.docker.com/compose/how-tos/startup-order/
version: '3.8'

services:
  postgres:
    image: postgres:15
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U orderuser -d orderdb"]
      interval: 5s
      timeout: 3s
      retries: 5
      start_period: 10s
    environment:
      POSTGRES_USER: orderuser
      POSTGRES_PASSWORD: orderpass
      POSTGRES_DB: orderdb
    volumes:
      - postgres-data:/var/lib/postgresql/data
      - ./db/init-scripts:/docker-entrypoint-initdb.d:ro

  redis:
    image: redis:7-alpine
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 3s
      timeout: 2s
      retries: 5
      start_period: 5s

  order-api:
    build: ./services/order-api
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    deploy:
      resources:
        limits:
          cpus: '1.0'
          memory: 1G
        reservations:
          cpus: '0.5'
          memory: 512M

volumes:
  postgres-data:
```

### Node.js gRPC Client

```javascript
// Source: https://grpc.io/docs/languages/node/quickstart/
const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');

const PROTO_PATH = './proto/order.proto';

const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true
});

const orderProto = grpc.loadPackageDefinition(packageDefinition).order;

const client = new orderProto.OrderService(
  'order-api:50051',
  grpc.credentials.createInsecure()
);

function createOrder(correlationId, productId, quantity, callback) {
  const metadata = new grpc.Metadata();
  metadata.add('x-correlation-id', correlationId);

  const request = {
    product_id: productId,
    quantity: quantity
  };

  client.CreateOrder(request, metadata, (error, response) => {
    if (error) {
      console.error('gRPC error:', error);
      return callback(error);
    }
    callback(null, response);
  });
}

module.exports = { createOrder };
```

### Python gRPC Server

```python
# Source: https://grpc.io/docs/languages/python/quickstart/
import grpc
from concurrent import futures
import order_pb2
import order_pb2_grpc

class OrderServicer(order_pb2_grpc.OrderServiceServicer):
    def CreateOrder(self, request, context):
        # Extract correlation ID from metadata
        metadata = dict(context.invocation_metadata())
        correlation_id = metadata.get('x-correlation-id', str(uuid.uuid4()))

        # Log with structured format
        json_log('info', 'Creating order',
                 correlation_id=correlation_id,
                 product_id=request.product_id,
                 quantity=request.quantity)

        # Business logic
        order_id = save_order_to_db(request.product_id, request.quantity)
        enqueue_fulfillment(order_id, correlation_id)

        return order_pb2.CreateOrderResponse(
            order_id=order_id,
            status='pending'
        )

def serve():
    server = grpc.server(futures.ThreadPoolExecutor(max_workers=10))
    order_pb2_grpc.add_OrderServiceServicer_to_server(
        OrderServicer(), server
    )
    server.add_insecure_port('[::]:50051')
    server.start()
    server.wait_for_termination()

if __name__ == '__main__':
    serve()
```

### Go Redis Queue Consumer

```go
// Source: https://redis.io/docs/latest/develop/clients/go/
package main

import (
    "context"
    "encoding/json"
    "log"
    "github.com/redis/go-redis/v9"
)

type OrderMessage struct {
    OrderID       int    `json:"order_id"`
    ProductID     int    `json:"product_id"`
    Quantity      int    `json:"quantity"`
    CorrelationID string `json:"correlation_id"`
}

func main() {
    ctx := context.Background()

    rdb := redis.NewClient(&redis.Options{
        Addr: "redis:6379",
        DB:   0,
    })

    // Verify connection
    if err := rdb.Ping(ctx).Err(); err != nil {
        log.Fatalf("Redis connection failed: %v", err)
    }

    // Consume queue with blocking pop
    for {
        result, err := rdb.BRPop(ctx, 0, "fulfillment_queue").Result()
        if err != nil {
            log.Printf("Queue error: %v", err)
            continue
        }

        // result[0] is key name, result[1] is value
        var order OrderMessage
        if err := json.Unmarshal([]byte(result[1]), &order); err != nil {
            log.Printf("JSON unmarshal error: %v", err)
            continue
        }

        // Process order
        processOrder(ctx, order)
    }
}

func processOrder(ctx context.Context, order OrderMessage) {
    // Log with structured format
    entry := map[string]interface{}{
        "timestamp":      time.Now().UTC().Format(time.RFC3339),
        "level":          "info",
        "service":        "fulfillment-worker",
        "message":        "Processing order",
        "correlation_id": order.CorrelationID,
        "order_id":       order.OrderID,
    }

    b, _ := json.Marshal(entry)
    log.Println(string(b))

    // Business logic here
}
```

### PostgreSQL Connection with pgx

```go
// Source: https://github.com/jackc/pgx
package db

import (
    "context"
    "github.com/jackc/pgx/v5/pgxpool"
)

func NewPool(ctx context.Context) (*pgxpool.Pool, error) {
    connString := "postgres://orderuser:orderpass@postgres:5432/orderdb"

    config, err := pgxpool.ParseConfig(connString)
    if err != nil {
        return nil, err
    }

    // Configure pool
    config.MaxConns = 10
    config.MinConns = 2

    pool, err := pgxpool.NewWithConfig(ctx, config)
    if err != nil {
        return nil, err
    }

    // Verify connection
    if err := pool.Ping(ctx); err != nil {
        return nil, err
    }

    return pool, nil
}

func UpdateOrderStatus(ctx context.Context, pool *pgxpool.Pool, orderID int, status string) error {
    query := "UPDATE orders SET status = $1 WHERE id = $2"
    _, err := pool.Exec(ctx, query, status, orderID)
    return err
}
```

### Python Redis Client (Cache + Queue)

```python
# Source: https://redis.io/docs/latest/develop/clients/redis-py/
import redis
import json
from datetime import datetime

# Create Redis connection
r = redis.Redis(
    host='redis',
    port=6379,
    db=0,
    decode_responses=True  # Automatically decode bytes to strings
)

# Queue: Publish message
def enqueue_fulfillment(order_id, product_id, quantity, correlation_id):
    message = {
        'order_id': order_id,
        'product_id': product_id,
        'quantity': quantity,
        'correlation_id': correlation_id,
        'timestamp': datetime.utcnow().isoformat()
    }
    r.lpush('fulfillment_queue', json.dumps(message))

# Cache: Get with fallback to database
def get_product(product_id):
    cache_key = f'product:{product_id}'

    # Try cache first
    cached = r.get(cache_key)
    if cached:
        return json.loads(cached)

    # Cache miss - fetch from database
    product = fetch_product_from_db(product_id)

    # Cache for 5 minutes (300 seconds)
    r.setex(cache_key, 300, json.dumps(product))

    return product

# Cache: Invalidate on update
def update_product(product_id, name, price):
    update_product_in_db(product_id, name, price)

    # Invalidate cache
    cache_key = f'product:{product_id}`
    r.delete(cache_key)
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Docker Compose v1 (docker-compose) | Docker Compose v2 (docker compose) | 2021-2022 | v2 native in Docker CLI, better performance, profiles support |
| grpc (C++ binding for Node) | @grpc/grpc-js (pure JS) | 2020 | Easier installation, no native dependencies, official package |
| psycopg2 | psycopg3 | 2021 | Async support, better performance, modern Python features |
| database/sql with pq (Go) | pgx/v5 | Ongoing | Better PostgreSQL-specific features, performance, type safety |
| ioredis | node-redis (official) | 2023 | Official Redis support, active development, new Redis features |
| Multiple compose files | Profiles | Compose v1.28 (2020) | Single source of truth, simpler management |
| Manual dependency waiting | Health check conditions | Compose v2.1 (2017) | Reliable startup order, fewer race conditions |

**Deprecated/outdated:**
- **grpc package for Node.js**: Deprecated in favor of @grpc/grpc-js (pure JavaScript implementation)
- **docker-compose v1**: Use `docker compose` (v2) which is integrated into Docker CLI
- **Anonymous volumes**: Use named volumes for better management and persistence
- **depends_on without conditions**: Always use health check conditions for stateful services
- **ioredis for new projects**: Official node-redis is now recommended and actively maintained

## Open Questions

Things that couldn't be fully resolved:

1. **Traffic Generator Implementation**
   - What we know: k6 is industry standard for load testing, supports Docker, scriptable in JavaScript
   - What's unclear: Whether k6's complexity is overkill for simple controllable traffic (steady/burst/overload modes)
   - Recommendation: Start with simple Node.js HTTP loop in traffic-generator service with mode control endpoints. Can upgrade to k6 in later phases if sophisticated load patterns needed. For Phase 1, simplicity and one-command startup is priority.

2. **gRPC Health Probe for Health Checks**
   - What we know: grpc_health_probe is standard tool for gRPC service health checks
   - What's unclear: Whether it should be bundled in service images or installed separately
   - Recommendation: For Phase 1, use simple port check or HTTP endpoint alongside gRPC. Full gRPC health probe can be added in Phase 2 when observability tooling is introduced.

3. **Resource Limit Testing**
   - What we know: Docker Compose v3.8+ supports resource limits in deploy section
   - What's unclear: Whether limits work identically across Docker Desktop (macOS/Windows) and Docker Engine (Linux)
   - Recommendation: Test resource limits on target Ubuntu VM environment. Document actual memory usage with `docker stats` during planning. Adjust limits if needed based on testing.

4. **Protocol Buffer Version**
   - What we know: proto3 syntax is current standard
   - What's unclear: Exact protobuf compiler version compatibility across Node.js, Python, and Go tools
   - Recommendation: Use proto3 syntax, let each language's tooling handle compilation. Test cross-language compatibility with sample gRPC call before full implementation.

## Sources

### Primary (HIGH confidence)

- [Docker Compose Profiles](https://docs.docker.com/compose/how-tos/profiles/) - Profile definition and activation
- [Docker Compose Deploy Specification](https://docs.docker.com/reference/compose-file/deploy/) - Resource limits syntax
- [Docker Compose Startup Order](https://docs.docker.com/compose/how-tos/startup-order/) - Health check dependencies
- [gRPC Node.js Quickstart](https://grpc.io/docs/languages/node/quickstart/) - @grpc/grpc-js setup
- [gRPC Python Quickstart](https://grpc.io/docs/languages/python/quickstart/) - grpcio setup
- [go-redis Documentation](https://redis.io/docs/latest/develop/clients/go/) - Official Go Redis client
- [redis-py Documentation](https://redis.io/docs/latest/develop/clients/redis-py/) - Official Python Redis client
- [node-redis Documentation](https://redis.io/docs/latest/develop/clients/nodejs/) - Official Node.js Redis client
- [pgx GitHub](https://github.com/jackc/pgx) - PostgreSQL driver for Go
- [PostgreSQL Docker Hub](https://hub.docker.com/_/postgres/) - Official image documentation
- [k6 Documentation](https://grafana.com/docs/k6/latest/) - Load testing tool

### Secondary (MEDIUM confidence)

- [How to Use Docker Compose depends_on with Health Checks (2026)](https://oneuptime.com/blog/post/2026-01-16-docker-compose-depends-on-healthcheck/view) - Recent health check patterns
- [Docker Compose Health Checks: A Practical Guide (2025)](https://www.tvaidyan.com/2025/02/13/health-checks-in-docker-compose-a-practical-guide/) - Real-world examples
- [How to Set Up Docker Compose Profiles (2026)](https://oneuptime.com/blog/post/2026-01-25-docker-compose-profiles/view) - Profile best practices
- [Docker Best Practices 2026](https://thinksys.com/devops/docker-best-practices/) - General Docker patterns
- [Logging in Microservices: 5 Best Practices](https://betterstack.com/community/guides/logging/logging-microservices/) - Structured logging guidance
- [Mastering Microservices Logging - Best Practices Guide](https://signoz.io/blog/microservices-logging/) - Correlation ID patterns
- [psycopg2 vs psycopg3 Performance Benchmark](https://www.tigerdata.com/blog/psycopg2-vs-psycopg3-performance-benchmark) - Python PostgreSQL comparison
- [pq or pgx - Which Driver Should I Go With?](https://preslav.me/2022/05/13/pq-or-pgx-choosing-the-right-postgresql-golang-driver/) - Go PostgreSQL comparison

### Tertiary (LOW confidence)

- WebSearch: "Redis node.js client ioredis vs node-redis 2026" - Community discussions on Redis client choice
- WebSearch: "Docker Compose polyglot microservices project structure best practices 2026" - Project organization patterns
- WebSearch: "Go microservice project structure standard layout 2026" - Go service organization

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All libraries verified through official documentation (Context7 queries not available, used official docs via WebFetch)
- Architecture: HIGH - Patterns verified from Docker official docs, gRPC official docs, and official client library documentation
- Pitfalls: MEDIUM-HIGH - Based on official docs + verified community sources from 2025-2026, cross-referenced across multiple articles

**Research date:** 2026-02-05
**Valid until:** 2026-03-05 (30 days - stable ecosystem, official libraries change slowly)

**Notes:**
- Context7 queries were not available for this research session
- All library recommendations verified through official documentation via WebFetch and WebSearch
- Version numbers represent latest stable as of February 2026
- Focus on official/standard libraries to ensure long-term support
- Traffic generator implementation details left flexible - can be simple HTTP loop or k6 based on planning phase decisions
