# Phase 6: Chaos Engineering - Research

**Researched:** 2026-02-12
**Domain:** Application-level chaos engineering with controlled fault injection
**Confidence:** MEDIUM-HIGH

## Summary

This research covers implementing chaos engineering capabilities directly within application services (Node.js, Python, Go) through HTTP control endpoints that enable controlled failure injection. The standard approach for educational/development environments is to add application-level chaos capabilities (delay, error, crash, memory pressure) rather than using infrastructure-level tools like Chaos Mesh or AWS FIS, since this phase focuses on observability correlation rather than production chaos testing.

The key insight is that chaos engineering serves two purposes: (1) testing system resilience, and (2) demonstrating observability capabilities. For this phase, the latter is primary — learners need to see how failures manifest in metrics, logs, and traces. Application-level chaos endpoints provide immediate, deterministic control without requiring complex infrastructure tools or Kubernetes.

No CONTEXT.md exists for this phase, so all implementation decisions are at Claude's discretion. The recommended approach is simple HTTP endpoints on each service (`POST /chaos/slow`, `POST /chaos/error`, `POST /chaos/crash`, `POST /chaos/reset`) with in-memory state management, plus helper shell scripts for triggering scenarios.

**Primary recommendation:** Implement application-level chaos control endpoints in each service using language-native patterns (Express middleware for Node.js, Flask decorators for Python, HTTP middleware for Go). Use simple in-memory state flags to control chaos behavior. Provide shell scripts for common scenarios that trigger chaos, wait for observable effects, and capture before/after screenshots from Grafana/Prometheus/Jaeger. Document observable differences in metrics (error rate spikes, latency increases), logs (error messages, stack traces), and traces (span errors, duration anomalies).

## Standard Stack

The established approach for chaos engineering varies by environment and goals:

### Production-Grade Chaos Platforms (NOT recommended for this phase)

| Tool | Purpose | Why NOT Used Here |
|------|---------|-------------------|
| Chaos Mesh | Kubernetes-native chaos orchestration | Requires K8s, overkill for learning environment |
| AWS FIS | Cloud-native chaos experiments | AWS-specific, not portable to local Docker |
| Gremlin | Enterprise chaos engineering SaaS | Commercial tool, adds external dependency |
| LitmusChaos | CNCF chaos engineering platform | Kubernetes-required, too heavy for this use case |

These tools are excellent for production chaos testing but add complexity inappropriate for an observability learning sandbox.

### Application-Level Chaos Libraries

For educational environments where observability demonstration is the goal, application-level libraries provide simpler integration:

| Language | Library/Pattern | Version | Purpose | Why Standard |
|----------|----------------|---------|---------|--------------|
| Node.js | Custom middleware | N/A | In-process fault injection | Simple, no dependencies, full control |
| Node.js | node-chaos-monkey | npm package | Express middleware for chaos | Community pattern, but dated (last update unclear) |
| Python | Custom decorator | N/A | Function-level fault injection | Pythonic, no dependencies |
| Python | Chaos middleware (Proofdock style) | Pattern | Flask middleware for chaos | Demonstrated in blog posts, simple pattern |
| Go | Custom middleware | N/A | HTTP handler wrapper | Idiomatic Go, no dependencies |
| Go | github.com/falzm/chaos | Unmaintained | HTTP middleware for chaos | Good pattern reference, but not actively maintained |

**Recommendation for this phase:** Implement custom chaos logic in each service rather than adding libraries. This approach:
- Avoids dependency management (especially for dated or unmaintained packages)
- Gives complete control over chaos scenarios
- Demonstrates language-specific patterns clearly
- Keeps implementation simple and educational

### Supporting Tools (for comprehensive testing, not core requirement)

| Tool | Purpose | Use Case |
|------|---------|----------|
| Toxiproxy | Network-level proxy chaos | TCP/network-level latency, connection issues |
| stress-ng | System resource stress | CPU/memory/disk stress at OS level |
| psutil (Python) | Resource monitoring | Verify memory pressure effects |

### Architecture Pattern for This Phase

```
Application Services (web-gateway, order-api, fulfillment-worker)
├── Chaos Control Endpoints
│   ├── POST /chaos/slow      # Inject artificial delay
│   ├── POST /chaos/error     # Return HTTP 500 errors
│   ├── POST /chaos/crash     # Exit process (Docker restarts)
│   ├── POST /chaos/memory    # Allocate memory pressure
│   └── POST /chaos/reset     # Clear all chaos state
├── Chaos State (in-memory)
│   ├── enabled: boolean
│   ├── mode: "slow" | "error" | "crash" | "memory"
│   ├── config: { delay_ms, error_rate, memory_mb }
└── Chaos Middleware/Decorator
    └── Apply chaos before normal handler execution
```

**Installation:**
None required — implement directly in existing services using native language features.

## Architecture Patterns

### Pattern 1: Chaos State Management

**What:** In-memory global state object that tracks chaos configuration
**When to use:** All services need shared state across requests

**Node.js Example:**
```javascript
// chaos.js
const chaosState = {
  enabled: false,
  mode: null,        // "slow" | "error" | "crash" | "memory"
  delay_ms: 0,       // for slow mode
  error_rate: 0,     // for error mode (0.0 - 1.0)
  memory_mb: 0       // for memory mode
};

function enableChaos(mode, config) {
  chaosState.enabled = true;
  chaosState.mode = mode;
  Object.assign(chaosState, config);
}

function resetChaos() {
  chaosState.enabled = false;
  chaosState.mode = null;
  chaosState.delay_ms = 0;
  chaosState.error_rate = 0;
  chaosState.memory_mb = 0;
}

module.exports = { chaosState, enableChaos, resetChaos };
```

**Python Example:**
```python
# chaos.py
chaos_state = {
    "enabled": False,
    "mode": None,  # "slow" | "error" | "crash" | "memory"
    "delay_ms": 0,
    "error_rate": 0.0,
    "memory_mb": 0
}

def enable_chaos(mode: str, config: dict):
    chaos_state["enabled"] = True
    chaos_state["mode"] = mode
    chaos_state.update(config)

def reset_chaos():
    chaos_state.update({
        "enabled": False,
        "mode": None,
        "delay_ms": 0,
        "error_rate": 0.0,
        "memory_mb": 0
    })
```

**Go Example:**
```go
// chaos/chaos.go
package chaos

import "sync"

type State struct {
    mu        sync.RWMutex
    Enabled   bool
    Mode      string  // "slow" | "error" | "crash" | "memory"
    DelayMs   int
    ErrorRate float64
    MemoryMB  int
}

var GlobalState = &State{}

func (s *State) Enable(mode string, delayMs int, errorRate float64, memoryMB int) {
    s.mu.Lock()
    defer s.mu.Unlock()
    s.Enabled = true
    s.Mode = mode
    s.DelayMs = delayMs
    s.ErrorRate = errorRate
    s.MemoryMB = memoryMB
}

func (s *State) Reset() {
    s.mu.Lock()
    defer s.mu.Unlock()
    s.Enabled = false
    s.Mode = ""
    s.DelayMs = 0
    s.ErrorRate = 0.0
    s.MemoryMB = 0
}
```

### Pattern 2: Chaos Middleware/Interceptor

**What:** Middleware that runs before request handlers and injects failures based on chaos state
**When to use:** To intercept all application requests and apply chaos systematically

**Node.js Express Middleware:**
```javascript
// chaosMiddleware.js
const { chaosState } = require('./chaos');
const logger = require('./logger');

async function chaosMiddleware(req, res, next) {
  // Skip chaos for /chaos/* and /metrics endpoints
  if (req.path.startsWith('/chaos') || req.path === '/metrics' || req.path === '/health') {
    return next();
  }

  if (!chaosState.enabled) {
    return next();
  }

  // Apply chaos based on mode
  if (chaosState.mode === 'slow') {
    logger.warn('Chaos: injecting delay', { delay_ms: chaosState.delay_ms });
    await new Promise(resolve => setTimeout(resolve, chaosState.delay_ms));
  }

  if (chaosState.mode === 'error' && Math.random() < chaosState.error_rate) {
    logger.error('Chaos: injecting error');
    return res.status(500).json({ error: 'Chaos engineering: injected error' });
  }

  if (chaosState.mode === 'crash') {
    logger.error('Chaos: crashing process');
    process.exit(1);
  }

  if (chaosState.mode === 'memory' && chaosState.memory_mb > 0) {
    // Allocate memory
    const buffer = Buffer.alloc(chaosState.memory_mb * 1024 * 1024);
    logger.warn('Chaos: memory pressure', { memory_mb: chaosState.memory_mb });
  }

  next();
}

module.exports = chaosMiddleware;
```

**Python Decorator (for Flask):**
```python
# chaos_decorator.py
import time
import random
import sys
from functools import wraps
from flask import jsonify
from chaos import chaos_state
import logging

logger = logging.getLogger(__name__)

def with_chaos(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if not chaos_state["enabled"]:
            return f(*args, **kwargs)

        # Apply chaos based on mode
        if chaos_state["mode"] == "slow":
            delay_sec = chaos_state["delay_ms"] / 1000.0
            logger.warning(f"Chaos: injecting delay {delay_sec}s")
            time.sleep(delay_sec)

        if chaos_state["mode"] == "error":
            if random.random() < chaos_state["error_rate"]:
                logger.error("Chaos: injecting error")
                return jsonify({"error": "Chaos engineering: injected error"}), 500

        if chaos_state["mode"] == "crash":
            logger.error("Chaos: crashing process")
            sys.exit(1)

        if chaos_state["mode"] == "memory" and chaos_state["memory_mb"] > 0:
            # Allocate memory (will be GC'd eventually)
            size = chaos_state["memory_mb"] * 1024 * 1024
            _ = bytearray(size)
            logger.warning(f"Chaos: memory pressure {chaos_state['memory_mb']}MB")

        return f(*args, **kwargs)

    return decorated_function
```

**Go HTTP Middleware:**
```go
// chaos/middleware.go
package chaos

import (
    "math/rand"
    "net/http"
    "os"
    "time"
    "log"
)

func Middleware(next http.Handler) http.Handler {
    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        // Skip chaos for /chaos/* and /metrics endpoints
        if strings.HasPrefix(r.URL.Path, "/chaos") ||
           r.URL.Path == "/metrics" ||
           r.URL.Path == "/health" {
            next.ServeHTTP(w, r)
            return
        }

        GlobalState.mu.RLock()
        enabled := GlobalState.Enabled
        mode := GlobalState.Mode
        delayMs := GlobalState.DelayMs
        errorRate := GlobalState.ErrorRate
        memoryMB := GlobalState.MemoryMB
        GlobalState.mu.RUnlock()

        if !enabled {
            next.ServeHTTP(w, r)
            return
        }

        // Apply chaos based on mode
        if mode == "slow" && delayMs > 0 {
            log.Printf("Chaos: injecting delay %dms", delayMs)
            time.Sleep(time.Duration(delayMs) * time.Millisecond)
        }

        if mode == "error" && rand.Float64() < errorRate {
            log.Println("Chaos: injecting error")
            http.Error(w, "Chaos engineering: injected error", http.StatusInternalServerError)
            return
        }

        if mode == "crash" {
            log.Println("Chaos: crashing process")
            os.Exit(1)
        }

        if mode == "memory" && memoryMB > 0 {
            // Allocate memory
            buffer := make([]byte, memoryMB*1024*1024)
            _ = buffer
            log.Printf("Chaos: memory pressure %dMB", memoryMB)
        }

        next.ServeHTTP(w, r)
    })
}
```

### Pattern 3: Chaos Control Endpoints

**What:** HTTP endpoints that enable/disable chaos modes
**When to use:** All services need external control interface

**Node.js Express Routes:**
```javascript
// chaosRoutes.js
const express = require('express');
const { chaosState, enableChaos, resetChaos } = require('./chaos');
const router = express.Router();

router.post('/chaos/slow', (req, res) => {
  const delay_ms = req.body.delay_ms || 3000;
  enableChaos('slow', { delay_ms });
  res.json({ status: 'chaos enabled', mode: 'slow', delay_ms });
});

router.post('/chaos/error', (req, res) => {
  const error_rate = req.body.error_rate || 0.5;
  enableChaos('error', { error_rate });
  res.json({ status: 'chaos enabled', mode: 'error', error_rate });
});

router.post('/chaos/crash', (req, res) => {
  enableChaos('crash', {});
  res.json({ status: 'chaos enabled', mode: 'crash' });
  // Will crash on next request
});

router.post('/chaos/memory', (req, res) => {
  const memory_mb = req.body.memory_mb || 256;
  enableChaos('memory', { memory_mb });
  res.json({ status: 'chaos enabled', mode: 'memory', memory_mb });
});

router.post('/chaos/reset', (req, res) => {
  resetChaos();
  res.json({ status: 'chaos disabled' });
});

router.get('/chaos/status', (req, res) => {
  res.json(chaosState);
});

module.exports = router;
```

### Pattern 4: Shell Script Orchestration

**What:** Helper scripts that trigger chaos scenarios and document observable effects
**When to use:** To make chaos experiments repeatable and educational

**Example Script:**
```bash
#!/bin/bash
# scripts/chaos-slow-database.sh
# Demonstrates slow database query chaos

echo "=== Chaos Scenario: Slow Database Queries ==="
echo "1. Capturing baseline metrics..."
curl -s http://localhost:9090/api/v1/query?query=rate\(http_requests_total\[1m\]\) > /tmp/baseline.json

echo "2. Enabling slow chaos on order-api (3s delay)..."
curl -X POST http://localhost:8000/chaos/slow -H "Content-Type: application/json" -d '{"delay_ms": 3000}'

echo "3. Generating traffic for 30 seconds..."
for i in {1..30}; do
  curl -X POST http://localhost/orders -H "Content-Type: application/json" -d '{"product_id": 123, "quantity": 5}' &
  sleep 1
done
wait

echo "4. Capturing chaos metrics..."
curl -s http://localhost:9090/api/v1/query?query=rate\(http_requests_total\[1m\]\) > /tmp/chaos.json

echo "5. Resetting chaos..."
curl -X POST http://localhost:8000/chaos/reset

echo ""
echo "=== Observable Effects ==="
echo "Metrics: Check Prometheus - request duration should show p99 > 3000ms"
echo "Logs: Check Loki - should see 'Chaos: injecting delay' warnings"
echo "Traces: Check Jaeger - spans should show 3+ second durations"
echo ""
echo "Visit: http://localhost:3001 (Grafana), http://localhost:16686 (Jaeger)"
```

### Anti-Patterns to Avoid

- **Running chaos in production without safety controls:** Always have kill switches and blast radius limits
- **No observability before chaos:** Chaos is useless if you can't observe the effects — establish metrics/logs/traces first
- **Forgetting to reset chaos state:** Failed experiments can leave chaos enabled, confusing later tests
- **Chaos on infrastructure endpoints:** Don't break `/metrics`, `/health`, or chaos control endpoints themselves
- **Synchronous memory allocation without GC:** In long-running chaos, memory balloons can OOM-kill containers
- **Chaos without documentation:** Learners won't understand what changed unless you document before/after comparisons

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Kubernetes chaos | Custom pod killer | Chaos Mesh, Litmus | Complex orchestration, safety controls, audit logs |
| Network chaos | Custom proxy | Toxiproxy, tc (Linux) | TCP-level manipulation, multiple failure modes |
| Production chaos platform | Custom experiment runner | Gremlin, AWS FIS | Blast radius controls, scheduled experiments, rollback |
| Memory stress testing | Naive allocation loops | stress-ng, psutil monitoring | Realistic memory pressure patterns |

**Key insight for this phase:** Since this is a learning environment focused on observability (not production resilience testing), custom application-level chaos is appropriate. In production, use established platforms with safety controls, audit logs, and blast radius limits.

## Common Pitfalls

### Pitfall 1: Chaos Without Observability Baseline

**What goes wrong:** Enabling chaos without first capturing baseline metrics/logs/traces makes it impossible to demonstrate observable differences.

**Why it happens:** Eager to break things, skip the "boring" baseline capture step.

**How to avoid:**
- Always capture baseline screenshots from Grafana, Prometheus, Jaeger before enabling chaos
- Run a load test to establish normal-state metrics
- Document expected behavior (e.g., "p99 latency normally 50ms")

**Warning signs:**
- Can't explain what changed after chaos
- Confusion about whether observed behavior is normal or chaos-induced

### Pitfall 2: Chaos State Survives Restarts

**What goes wrong:** In-memory chaos state is fine, but if persisted (Redis, file), chaos can remain enabled after container restarts, causing confusion.

**Why it happens:** Trying to be "production-realistic" by persisting state.

**How to avoid:**
- Use in-memory state only for educational environments
- If persistence needed, add startup logic that resets chaos state
- Document that chaos is ephemeral and requires re-enablement after restarts

**Warning signs:**
- Service behaves weirdly after restart
- Forgot chaos was enabled from previous experiment

### Pitfall 3: Chaos Breaks Chaos Control Endpoints

**What goes wrong:** Applying chaos middleware to ALL routes, including `/chaos/*`, prevents disabling chaos.

**Why it happens:** Middleware runs globally without path exclusions.

**How to avoid:**
- Always skip chaos for `/chaos/*`, `/metrics`, `/health` endpoints
- Test that you can call `/chaos/reset` while chaos is active
- Use endpoint path filtering in middleware

**Warning signs:**
- Can't call `/chaos/reset` when slow chaos is enabled (timeouts)
- Metrics endpoint returns 500 errors during error chaos

### Pitfall 4: Memory Chaos Causes OOM Kills

**What goes wrong:** Allocating large buffers without releasing them leads to out-of-memory crashes.

**Why it happens:** Naive memory allocation without considering GC and container limits.

**How to avoid:**
- Keep memory chaos allocations smaller than container limits
- Use realistic amounts (256MB, not 2GB)
- In Go, explicitly let GC reclaim; in Python, use ephemeral allocations
- Monitor actual memory usage with `docker stats`

**Warning signs:**
- Container exits with OOMKilled status
- Docker restarts service unexpectedly during memory chaos

### Pitfall 5: Crash Chaos Without Restart Policy

**What goes wrong:** Triggering `process.exit(1)` or `sys.exit(1)` permanently kills service if no restart policy.

**Why it happens:** Forgot that crash chaos requires container orchestration to restart.

**How to avoid:**
- Ensure Docker Compose has `restart: unless-stopped` or `restart: always`
- Test that service comes back healthy after crash chaos
- Document that crash chaos demonstrates self-healing via Docker restarts

**Warning signs:**
- Service stays down after crash chaos
- Docker Compose shows service in "Exited" state

### Pitfall 6: No Before/After Documentation

**What goes wrong:** Running chaos experiments without capturing observable differences makes learning impossible.

**Why it happens:** Focus on technical implementation, forget educational goal.

**How to avoid:**
- Create `.planning/phases/06-chaos-engineering/scenarios/` directory
- For each scenario, document: description, how to trigger, expected observable effects, before/after screenshots
- Provide clear instructions on where to look (Prometheus query, Loki filter, Jaeger trace ID)

**Warning signs:**
- Learner says "I enabled chaos, now what?"
- Can't demonstrate clear cause-and-effect from chaos to observability

## Code Examples

Verified patterns from research and industry practice:

### Example 1: Complete Node.js Chaos Integration

```javascript
// server.js
const express = require('express');
const chaosMiddleware = require('./chaosMiddleware');
const chaosRoutes = require('./chaosRoutes');
const routes = require('./routes');

const app = express();
app.use(express.json());

// Chaos control endpoints (no chaos applied to these)
app.use('/chaos', chaosRoutes);

// Metrics endpoint (no chaos applied)
app.get('/metrics', async (req, res) => {
  res.set('Content-Type', register.contentType);
  res.end(await register.metrics());
});

// Health check (no chaos applied)
app.get('/health', (req, res) => {
  res.json({ status: 'healthy' });
});

// Apply chaos middleware to all other routes
app.use(chaosMiddleware);

// Application routes (chaos applies here)
app.use('/', routes);

app.listen(3000, () => {
  console.log('Server started with chaos engineering capabilities');
});
```

### Example 2: Python Flask with Chaos Decorator

```python
# app.py
from flask import Flask, jsonify, request
from chaos import chaos_state, enable_chaos, reset_chaos
from chaos_decorator import with_chaos
import logging

app = Flask(__name__)
logger = logging.getLogger(__name__)

# Chaos control endpoints (no decorator)
@app.route('/chaos/slow', methods=['POST'])
def chaos_slow():
    delay_ms = request.json.get('delay_ms', 3000)
    enable_chaos('slow', {'delay_ms': delay_ms})
    return jsonify({'status': 'chaos enabled', 'mode': 'slow', 'delay_ms': delay_ms})

@app.route('/chaos/error', methods=['POST'])
def chaos_error():
    error_rate = request.json.get('error_rate', 0.5)
    enable_chaos('error', {'error_rate': error_rate})
    return jsonify({'status': 'chaos enabled', 'mode': 'error', 'error_rate': error_rate})

@app.route('/chaos/reset', methods=['POST'])
def chaos_reset():
    reset_chaos()
    return jsonify({'status': 'chaos disabled'})

@app.route('/chaos/status', methods=['GET'])
def chaos_status():
    return jsonify(chaos_state)

# Application endpoints (with chaos)
@app.route('/orders', methods=['POST'])
@with_chaos
def create_order():
    # Normal business logic
    return jsonify({'order_id': 123, 'status': 'pending'})

@app.route('/orders/<int:order_id>', methods=['GET'])
@with_chaos
def get_order(order_id):
    # Normal business logic
    return jsonify({'order_id': order_id, 'status': 'fulfilled'})
```

### Example 3: Go HTTP Server with Chaos Middleware

```go
// main.go
package main

import (
    "net/http"
    "log"
    "myapp/chaos"
    "myapp/handlers"
)

func main() {
    mux := http.NewServeMux()

    // Chaos control endpoints (no middleware)
    mux.HandleFunc("/chaos/slow", chaos.HandleSlow)
    mux.HandleFunc("/chaos/error", chaos.HandleError)
    mux.HandleFunc("/chaos/crash", chaos.HandleCrash)
    mux.HandleFunc("/chaos/reset", chaos.HandleReset)
    mux.HandleFunc("/chaos/status", chaos.HandleStatus)

    // Metrics and health (no middleware)
    mux.Handle("/metrics", promhttp.Handler())
    mux.HandleFunc("/health", handlers.Health)

    // Application routes (with chaos middleware)
    mux.HandleFunc("/orders", handlers.CreateOrder)
    mux.HandleFunc("/orders/", handlers.GetOrder)

    // Wrap with chaos middleware
    handler := chaos.Middleware(mux)

    log.Println("Server starting with chaos engineering on :8080")
    log.Fatal(http.ListenAndServe(":8080", handler))
}
```

### Example 4: Shell Script for Scenario Documentation

```bash
#!/bin/bash
# scenarios/01-slow-database.sh
# Demonstrates observable effects of slow database queries

set -e

SCENARIO="Slow Database Queries"
SERVICE="order-api"
PORT="8000"

echo "============================================="
echo "Chaos Scenario: $SCENARIO"
echo "============================================="
echo ""

echo "Step 1: Capture baseline metrics"
echo "  - Open Grafana: http://localhost:3001"
echo "  - Note current p99 latency for order-api"
echo "  - Take screenshot: docs/chaos/01-baseline.png"
read -p "Press Enter when ready to continue..."

echo ""
echo "Step 2: Enable slow chaos (5 second delay)"
curl -X POST http://localhost:$PORT/chaos/slow \
  -H "Content-Type: application/json" \
  -d '{"delay_ms": 5000}' | jq

echo ""
echo "Step 3: Generate traffic (60 seconds)"
echo "  - Traffic generator is running continuously"
echo "  - Wait 60 seconds for metrics to reflect chaos"
sleep 60

echo ""
echo "Step 4: Observe effects"
echo "  Prometheus (http://localhost:9090):"
echo "    Query: histogram_quantile(0.99, rate(http_request_duration_seconds_bucket[1m]))"
echo "    Expected: p99 latency > 5 seconds"
echo ""
echo "  Loki (http://localhost:3001/explore):"
echo "    Query: {service=\"order-api\"} |= \"Chaos\""
echo "    Expected: Log lines with 'Chaos: injecting delay 5000ms'"
echo ""
echo "  Jaeger (http://localhost:16686):"
echo "    Search: service=order-api"
echo "    Expected: Traces with duration > 5s"
echo ""
read -p "Press Enter after observing effects and taking screenshots..."

echo ""
echo "Step 5: Reset chaos"
curl -X POST http://localhost:$PORT/chaos/reset | jq

echo ""
echo "Step 6: Verify recovery (60 seconds)"
sleep 60
echo "  - Check Prometheus: latency should return to baseline"
echo "  - Check Loki: no more chaos log lines"
echo "  - Take screenshot: docs/chaos/01-recovery.png"

echo ""
echo "============================================="
echo "Scenario Complete!"
echo "============================================="
echo ""
echo "Summary:"
echo "  Before: p99 latency ~50ms, no errors, clean traces"
echo "  During: p99 latency >5s, chaos warnings in logs, slow spans in traces"
echo "  After: p99 latency ~50ms, system recovered automatically"
```

## State of the Art

Current trends in chaos engineering (2026):

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Infrastructure-only chaos (pod kills, network failures) | Application-level + infrastructure chaos | 2023-2024 | Application-level provides more realistic failure modes for microservices |
| Manual chaos experiments | Automated continuous chaos | 2024-2025 | Netflix-style continuous validation, but most orgs still use scheduled experiments |
| Chaos without observability | Observability-first chaos | 2023-present | Chaos is useless without metrics/logs/traces to observe effects |
| Kubernetes-required | Kubernetes-optional, Docker-friendly | 2024-present | Chaos Toolkit, Toxiproxy, app-level chaos work without K8s |
| Separate chaos tools | Observability platform integration | 2025-2026 | Grafana, Datadog, New Relic adding chaos experiment tracking |

**Deprecated/outdated:**
- **Jaeger Thrift exporter:** Deprecated in favor of OTLP (same pattern as Phase 5)
- **Netflix Chaos Monkey:** Original tool is archived; modern equivalents are Chaos Mesh, Litmus, Gremlin
- **Manual fault injection in code:** Replaced by feature flags and failure injection libraries like Gremlin Failure Flags

**2026 trends:**
- **AI-powered chaos:** ML models suggest experiments based on system topology (not ready for learning environments)
- **Observability-driven chaos:** Platforms like Gremlin use metrics to auto-generate experiments (emerging, not standard)
- **Security chaos engineering:** Chaos Engineering principles applied to security testing, testing resilience against attacks (niche, not core)

## Open Questions

Things that couldn't be fully resolved:

1. **Memory chaos realism**
   - What we know: Simple Buffer/bytearray allocation simulates memory pressure
   - What's unclear: Whether this produces realistic memory patterns (fragmentation, GC pressure) or just static allocation
   - Recommendation: Use simple allocation for educational purposes; production memory chaos requires tools like stress-ng or cgroup limits

2. **Network latency simulation without Toxiproxy**
   - What we know: Application-level `sleep()` simulates slow internal operations but not network latency
   - What's unclear: Whether learners need to distinguish between "slow database query" vs "network latency to database"
   - Recommendation: Document that app-level delay is a proxy for any slowness (DB, network, external API); Toxiproxy can be added later if needed

3. **Chaos scenario realism**
   - What we know: Simple scenarios (slow, error, crash, memory) demonstrate observability well
   - What's unclear: Whether more complex scenarios (cascading failures, partial degradation) add educational value or just complexity
   - Recommendation: Start simple; phase goal is observability demonstration, not comprehensive chaos testing

4. **Production applicability**
   - What we know: Application-level chaos endpoints are not production-safe without authentication, authorization, blast radius limits
   - What's unclear: Whether to add safety controls (auth, rate limits) or document "not production-ready"
   - Recommendation: Document clearly that this is for learning only; production chaos requires platforms with safety controls

## Sources

### Primary (HIGH confidence)

**Chaos Engineering Principles and Best Practices:**
- [Chaos Engineering: the history, principles, and practice](https://www.gremlin.com/community/tutorials/chaos-engineering-the-history-principles-and-practice) - Core principles and industry standards
- [Chaos Engineering for Microservices (DZone)](https://dzone.com/articles/chaos-engineering-for-microservices) - Patterns specific to microservices architectures
- [Chaos Engineering: Definition, Principles, Best Practices (PhoenixNAP)](https://phoenixnap.com/blog/chaos-engineering) - Comprehensive best practices guide
- [Principles of Chaos Engineering](https://principlesofchaos.org/) - Official principles document
- [Splunk: Chaos Engineering Benefits and Best Practices](https://www.splunk.com/en_us/blog/learn/chaos-engineering.html) - Industry best practices

**Application-Level Chaos Libraries:**
- [GitHub: dastergon/awesome-chaos-engineering](https://github.com/dastergon/awesome-chaos-engineering) - Curated list of chaos engineering resources
- [Chaos Toolkit](https://chaostoolkit.org/) - Open-source Python chaos framework
- [GitHub: goldbergyoni/node-chaos-monkey](https://github.com/goldbergyoni/node-chaos-monkey) - Node.js chaos monkey library
- [Medium: Introduce a chaos middleware for Python Flask](https://medium.com/proofdock/introduce-a-chaos-middleware-for-python-flask-simulate-disruptions-to-improve-resiliency-aa3aad25ecd2) - Flask chaos patterns
- [GitHub: falzm/chaos](https://github.com/falzm/chaos) - Go HTTP chaos middleware

**Observability and Chaos Integration:**
- [Last9: How to Build Observability into Chaos Engineering](https://last9.io/blog/how-to-build-observability-into-chaos-engineering/) - Integration patterns
- [NAB: Observability in the realm of Chaos Engineering](https://medium.com/@nabtechblog/observability-in-the-realm-of-chaos-engineering-99089226ca51) - Real-world case study
- [Grafana: Chaos Engineering X observability](https://grafana.com/events/observabilitycon/2020/chaos-engineering-x-observability-exposing-the-unknowns/) - Conference talk on integration
- [Zuniweb: What is Observability in 2026? Metrics, Logs, Traces](https://zuniweb.com/blog/observability-101-a-practical-guide-to-metrics-logs-and-traces/) - Current observability patterns

**Network and Infrastructure Chaos Tools:**
- [GitHub: Shopify/toxiproxy](https://github.com/Shopify/toxiproxy) - TCP proxy for network chaos
- [Chaos Mesh: Simulate Stress Scenarios](https://chaos-mesh.org/docs/simulate-heavy-stress-on-kubernetes/) - Stress testing patterns
- [Medium: Simulating Customized Chaos in Golang using Toxiproxy](https://medium.com/tokopedia-engineering/simulating-customized-chaos-in-golang-using-toxiproxy-b913584d88a7) - Go + Toxiproxy integration

### Secondary (MEDIUM confidence)

**Common Pitfalls and Mistakes:**
- [Thoughtworks: Four chaos engineering mistakes to avoid](https://www.thoughtworks.com/en-us/insights/blog/agile-engineering-practices/four-chaos-engineering-mistakes-to-avoid) - Industry experience
- [Equal Experts: 5 Common Mistakes to Avoid at your Chaos Day](https://www.equalexperts.com/blog/tech-focus/chaos-days-common-mistakes/) - Practical lessons learned
- [Nagarro: Chaos engineering best practices to avoid outages](https://www.nagarro.com/en/blog/chaos-engineering-best-practices) - Production experience

**Language-Specific Implementation:**
- [Node.js slow database query simulation techniques](https://www.oreilly.com/library/view/learning-node-js-development/9781788395540/50c6e581-f9a4-4004-850c-3260a8d7c37e.xhtml) - setTimeout patterns
- [GitHub: emiliocolo/memory-stress-test](https://github.com/emiliocolo/memory-stress-test) - Python memory stress patterns
- [Go gRPC latency package](https://pkg.go.dev/google.golang.org/grpc/benchmark/latency) - Network latency simulation

**2026 Platform Updates:**
- [Google Cloud Chaos Engineering Framework (InfoQ)](https://www.infoq.com/news/2025/11/google-chaos-engineering/) - Recent platform announcement
- [LitmusChaos - Open Source Chaos Engineering Platform](https://litmuschaos.io/) - CNCF chaos platform
- [Harness Chaos Engineering release notes](https://developer.harness.io/release-notes/chaos-engineering/) - Current platform features

### Tertiary (LOW confidence)

**Emerging Patterns:**
- [k6: Democratizing Chaos Engineering with Fault Injection](https://k6.io/blog/democratize-chaos-testing/) - Load testing + chaos integration
- [Gremlin: Using Observability to Automatically Generate Chaos Experiments](https://www.gremlin.com/community/tutorials/using-observability-to-automatically-generate-chaos-experiments) - AI-driven experiments (emerging)
- [OneUpTime: How to Use Docker for Chaos Engineering with Toxiproxy](https://oneuptime.com/blog/post/2026-02-08-how-to-use-docker-for-chaos-engineering-with-toxiproxy/view) - Recent blog post (single source)

## Metadata

**Confidence breakdown:**
- Standard stack: MEDIUM - Custom implementation recommended over libraries (libraries exist but are dated or overkill)
- Architecture patterns: HIGH - Middleware/decorator patterns well-established across languages
- Pitfalls: MEDIUM-HIGH - Based on industry blogs and conference talks, some from single sources
- Observability integration: HIGH - Well-documented pattern, critical for phase success
- Production applicability: LOW - This research focuses on learning environments, not production chaos platforms

**Research date:** 2026-02-12
**Valid until:** ~30 days (stable domain, but tools and libraries evolve)

**Research scope:**
- Application-level chaos engineering for educational purposes
- Polyglot implementation patterns (Node.js, Python, Go)
- Observability integration (metrics, logs, traces)
- Docker-based local development environments

**Out of scope:**
- Production chaos platforms (Chaos Mesh, AWS FIS, Gremlin)
- Kubernetes-specific chaos tools
- Advanced scenarios (cascading failures, byzantine faults)
- Security chaos engineering
- Chaos automation and CI/CD integration
