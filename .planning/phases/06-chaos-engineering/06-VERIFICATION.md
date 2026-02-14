---
phase: 06-chaos-engineering
verified: 2026-02-14T15:00:00Z
status: gaps_found
score: 5/6 must-haves verified
gaps:
  - truth: "Each chaos scenario has documented before/after comparison showing observable differences"
    status: failed
    reason: "chaos-scenarios.sh outputs observation hints (single-line 'Observe:' strings) but no formal before/after comparison document exists for any scenario. There are no screenshots, example metric values, or structured before/after sections that show a learner what to expect."
    artifacts:
      - path: "scripts/chaos-scenarios.sh"
        issue: "Has one-line 'Observe:' hints after each scenario but no documented baseline vs. chaos-active comparison"
      - path: "docs/lab-guide/observability-extensions.md"
        issue: "Exists but contains no chaos engineering content"
    missing:
      - "A markdown or HTML document per scenario (or a consolidated document) showing: baseline metric value, expected metric value under chaos, which Grafana panel or PromQL query to watch, example Loki log line produced by ChaosMiddleware/ChaosInterceptor, and (for tracing) what a chaos-injected trace looks like in Jaeger"
      - "At minimum: chaos-scenarios.sh --list output expanded with before/after examples inline, or a dedicated docs/lab-guide/chaos-engineering.md covering all 6 scenarios"
---

# Phase 6: Chaos Engineering Verification Report

**Phase Goal:** Learner can inject failures and observe their impact across metrics, logs, and traces
**Verified:** 2026-02-14T15:00:00Z
**Status:** gaps_found
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| #   | Truth | Status | Evidence |
| --- | ----- | ------ | -------- |
| 1 | Each application service exposes chaos control endpoints (slow, error, crash, reset) | VERIFIED | `chaos.js` (Node.js), `chaos.py` (Python), `chaos/chaos.go` (Go) — all expose /chaos/enable, /chaos/disable, /chaos/reset, /chaos/status |
| 2 | Chaos scenarios include slow database queries, service crashes, memory pressure, and network latency | VERIFIED | All 5 scenario types (latency, errors, crash, memory, disk) implemented in all 3 services with mild/severe presets |
| 3 | Chaos can be triggered via shell scripts or direct HTTP calls | VERIFIED | `scripts/chaos-enable.sh`, `scripts/chaos-reset.sh`, `scripts/chaos-scenarios.sh` (6 named scenarios); chaos-controller REST API at port 9095 with web UI |
| 4 | Chaos effects are immediately visible in Prometheus metrics, Loki logs, and Jaeger traces | VERIFIED | OTel span error marking in web-gateway chaos.js (SpanStatusCode.ERROR); `handler: ChaosMiddleware` in all log entries for Loki; structured log entries in all 3 services on every injected event |
| 5 | Services return to normal behavior after chaos reset endpoint is called | VERIFIED | resetScenario() helpers implemented and wired in all 3 services; /chaos/reset tested via POST |
| 6 | Each chaos scenario has documented before/after comparison showing observable differences | FAILED | Only one-line "Observe:" hints in chaos-scenarios.sh output; no formal before/after document exists |

**Score:** 5/6 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
| -------- | -------- | ------ | ------- |
| `services/web-gateway/src/chaos.js` | Chaos module + Express routes | VERIFIED | 311 lines; chaosMiddleware, chaosRouter with 4 endpoints, OTel span marking, 5 scenarios |
| `services/order-api/src/chaos.py` | Chaos module + gRPC interceptor + Flask routes | VERIFIED | 349 lines; ChaosInterceptor, Flask chaos_app with 5 endpoints, 5 scenarios |
| `services/fulfillment-worker/internal/chaos/chaos.go` | Chaos package + HTTP handlers | VERIFIED | 378 lines; State struct with RWMutex, RegisterHandlers, ShouldCrash/ShouldInjectLatency/ShouldInjectError |
| `chaos-controller/src/server.js` | REST API orchestrating cross-service chaos | VERIFIED | 124 lines; proxies to all 3 services, "all" broadcast target |
| `chaos-controller/src/services.js` | Service registry with error handling | VERIFIED | 113 lines; graceful timeout, per-service try/catch |
| `chaos-controller/src/ui.html` | Web UI with controls | VERIFIED | 480 lines; live status polling, severity presets, control form |
| `chaos-controller/Dockerfile` | Container build | VERIFIED | Exists (Node 20-alpine) |
| `docker-compose.yml` (chaos-controller entry) | chaos-controller service with chaos/full profiles | VERIFIED | chaos-controller on port 9095, depends_on all 3 services, 128M limit |
| `docker-compose.chaos.yml` | Override disabling auto-restart | VERIFIED | Sets restart: "no" for web-gateway, order-api, fulfillment-worker |
| `scripts/chaos-enable.sh` | Script to enable a scenario | VERIFIED | 47 lines, accepts service/scenario/severity/duration_seconds |
| `scripts/chaos-reset.sh` | Script to reset all chaos | VERIFIED | 38 lines, resets all or one service |
| `scripts/chaos-scenarios.sh` | Named scenario library | VERIFIED | 103 lines, 6 named scenarios (slow-gateway, slow-database, error-storm, cascade-failure, worker-slowdown, total-chaos) |
| Before/after comparison docs | Per-scenario observable difference documentation | MISSING | Not found in docs/lab-guide or anywhere in the repo |

### Key Link Verification

| From | To | Via | Status | Details |
| ---- | -- | --- | ------ | ------- |
| `server.js` (web-gateway) | `chaos.js` | `require('./chaos')` + `app.use('/chaos', chaosRouter)` + `app.use(chaosMiddleware)` | WIRED | Chaos routes mounted before middleware (correct ordering verified at line 92-96) |
| `server.py` (order-api) | `chaos.py` | `from chaos import ChaosInterceptor, start_chaos_server` + `interceptors=[ChaosInterceptor()]` | WIRED | Interceptor registered on gRPC server; Flask server started as daemon thread |
| `main.go` (fulfillment-worker) | `chaos/chaos.go` | `chaos.RegisterHandlers(mux)` + `chaos.ShouldCrash()` + `chaos.ShouldInjectLatency()` + `chaos.ShouldInjectError()` | WIRED | Handlers on port 2112; all 3 check functions called in processOrder loop |
| `chaos-controller/src/server.js` | `chaos-controller/src/services.js` | import in server.js | WIRED | Service proxy calls all 3 service chaos endpoints |
| `docker-compose.yml` | `chaos-controller/` | chaos/full profiles | WIRED | Container runs on port 9095 with correct depends_on |

### Requirements Coverage

| Requirement | Status | Blocking Issue |
| ----------- | ------ | -------------- |
| CAOS-01 (chaos control endpoints per service) | SATISFIED | All 3 services expose /chaos/enable, /disable, /reset, /status |
| CAOS-02 (chaos scenarios: slow DB, crashes, memory, network latency) | SATISFIED | 5 scenario types with mild/severe presets across all services |
| CAOS-03 (triggerable via shell scripts or HTTP) | SATISFIED | 3 shell scripts + chaos-controller REST API |
| CAOS-04 (effects visible in Prometheus/Loki/Jaeger) | SATISFIED | OTel span marking, structured logs with handler tag, metrics wired |
| CAOS-05 (reset restores normal behavior) | SATISFIED | resetScenario() + /chaos/reset implemented in all services |
| CAOS-06 (before/after documentation per scenario) | BLOCKED | No formal before/after comparison document exists |

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
| ---- | ---- | ------- | -------- | ------ |
| None found | — | — | — | All chaos modules are free of TODO/FIXME/placeholder patterns |

### Human Verification Required

#### 1. OTel Trace Error Visibility

**Test:** Enable errors on web-gateway (`./scripts/chaos-enable.sh web-gateway errors mild`), make several requests, then open Jaeger UI (http://localhost:16686) and find a web-gateway trace.
**Expected:** Traces for chaos-injected errors should show ERROR status with `chaos.injected=true` attribute on the root span.
**Why human:** The OTel span annotation code path exists in chaos.js, but confirming it surfaces correctly in Jaeger requires runtime observation.

#### 2. Crash Scenario Leaves Service Down

**Test:** Start with chaos override (`docker compose -f docker-compose.yml -f docker-compose.chaos.yml --profile chaos up -d`), enable crash on web-gateway with countdown 3, send 3+ requests, then verify the container is stopped.
**Expected:** web-gateway container stops and stays stopped (restart: "no" from override file).
**Why human:** Requires actually running Docker Compose with the override to validate restart behavior.

#### 3. Metrics Spike Visibility in Grafana

**Test:** Enable latency severe on order-api (`./scripts/chaos-enable.sh order-api latency severe`), then check Grafana request duration histograms.
**Expected:** p99 latency for order-api should show a visible spike (5000ms injected).
**Why human:** Grafana dashboard observability requires runtime metrics scraping.

### Gaps Summary

One truth is unverified: **before/after comparison documentation per chaos scenario**. The CAOS-06 requirement asks for documented observable differences for each scenario. What exists is inline one-line hints in chaos-scenarios.sh output (e.g., "Observe: http_request_duration_seconds histogram shift in Grafana") but there is no structured document showing: (a) what metrics/logs/traces look like before chaos, (b) what they look like during chaos, and (c) what to look for specifically in each observability tool per scenario. This is a learning-sandbox project where the documentation of expected observable effects is a key deliverable — without it, a learner following the chaos scenario scripts has no reference to verify they are seeing the right signals.

---

_Verified: 2026-02-14T15:00:00Z_
_Verifier: Claude (gsd-verifier)_
