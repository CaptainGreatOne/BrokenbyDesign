---
phase: 06-chaos-engineering
plan: "05"
subsystem: infra
tags: [docker-compose, chaos-engineering, shell-scripts, bash, chaos-controller]

# Dependency graph
requires:
  - phase: 06-01
    provides: chaos-controller Express API with /api/chaos/enable and /api/chaos/reset endpoints
  - phase: 06-02
    provides: web-gateway chaos middleware and chaos endpoints
  - phase: 06-03
    provides: order-api and fulfillment-worker chaos endpoints
provides:
  - chaos-controller service in docker-compose.yml with chaos/full profiles on port 9095
  - docker-compose.chaos.yml override disabling auto-restart on app services during chaos
  - scripts/chaos-enable.sh for triggering individual chaos scenarios
  - scripts/chaos-reset.sh for resetting all chaos with status display
  - scripts/chaos-scenarios.sh with 6 pre-built named scenarios and --list flag
affects: [07-kafka, 08-cicd, docs, learner-exercises]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Docker Compose override file pattern for chaos mode (restart: no on app services)"
    - "Profile-based optional infrastructure (--profile chaos activates chaos-controller)"
    - "CHAOS_CONTROLLER_URL env var with localhost:9095 default for script portability"
    - "Named chaos scenario library with observable hints pointing to Grafana/Loki/Jaeger"

key-files:
  created:
    - docker-compose.chaos.yml
    - scripts/chaos-enable.sh
    - scripts/chaos-reset.sh
    - scripts/chaos-scenarios.sh
  modified:
    - docker-compose.yml

key-decisions:
  - "chaos profile added to docker-compose.yml alongside full profile for chaos-controller activation"
  - "docker-compose.chaos.yml override file sets restart: no on 3 app services so crashed services stay down"
  - "chaos-controller itself keeps restart: unless-stopped (control plane, not chaos target)"
  - "chaos-controller depends_on all 3 app services being healthy before starting"
  - "128M memory limit for chaos-controller (lightweight Express API)"
  - "Scripts use CHAOS_CONTROLLER_URL env var with localhost:9095 default for portability"
  - "chaos-scenarios.sh --list shows all scenarios with Grafana/Prometheus/Jaeger observation hints"

patterns-established:
  - "Named scenario library: pre-built named scenarios make experiments repeatable and documented"
  - "Observer hints: each scenario tells learner what to watch in which tool"
  - "Compose override pattern: docker-compose.chaos.yml modifies only what chaos mode needs"

# Metrics
duration: 6min
completed: 2026-02-14
---

# Phase 6 Plan 05: Docker Compose Integration and Chaos Shell Scripts Summary

**Chaos-controller integrated via `--profile chaos` with `docker-compose.chaos.yml` override disabling app service auto-restart, plus three shell scripts providing named scenario library (slow-gateway, slow-database, error-storm, cascade-failure, worker-slowdown, total-chaos)**

## Performance

- **Duration:** ~6 min
- **Started:** 2026-02-14T14:40:23Z
- **Completed:** 2026-02-14T14:46:23Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments

- Chaos-controller added to docker-compose.yml with chaos/full profiles, 128M memory limit, healthcheck, and depends_on all 3 app services
- docker-compose.chaos.yml override created setting restart: "no" for web-gateway, order-api, fulfillment-worker so crash scenarios leave services down until explicitly reset
- Three executable shell scripts provide learner-friendly chaos interface covering individual scenario enablement, bulk reset, and 6 pre-built named scenarios

## Task Commits

Each task was committed atomically:

1. **Task 1: Add chaos-controller to Docker Compose with chaos profile** - `6b7ca0b` (feat)
2. **Task 2: Create shell scripts for chaos scenarios** - `8d858e7` (feat)

**Plan metadata:** (docs commit below)

## Files Created/Modified

- `docker-compose.yml` - Added chaos-controller service with chaos/full profiles, port 9095, healthcheck, depends_on, 128M limit; updated resource budget comment and profiles comment
- `docker-compose.chaos.yml` - New override file: restart: "no" for web-gateway, order-api, fulfillment-worker during chaos mode
- `scripts/chaos-enable.sh` - General-purpose chaos enabler accepting service/scenario/severity/duration_seconds args, uses CHAOS_CONTROLLER_URL env var
- `scripts/chaos-reset.sh` - Resets all (or one) service chaos and shows final status; documents how to restart crashed services
- `scripts/chaos-scenarios.sh` - 6 named scenarios with --list flag and Grafana/Prometheus/Jaeger observation hints per scenario

## Decisions Made

- **restart: "no" via override file** rather than modifying main compose file keeps the main compose usable without chaos mode while the override cleanly applies only when running chaos profile
- **chaos-controller keeps restart: unless-stopped** because it is the control plane that learners use to inject and reset chaos - it should not be a target of its own chaos
- **CHAOS_CONTROLLER_URL env var** allows scripts to work against remote or port-forwarded controllers without code changes
- **Named scenarios with observation hints** make learning self-contained - each scenario tells the learner exactly what dashboard/query to look at, reducing context switching

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

To use:
```bash
# Start with chaos engineering enabled
docker compose -f docker-compose.yml -f docker-compose.chaos.yml --profile chaos up -d

# List available scenarios
./scripts/chaos-scenarios.sh --list

# Run a pre-built scenario
./scripts/chaos-scenarios.sh slow-gateway

# Enable specific chaos with duration
./scripts/chaos-enable.sh web-gateway latency mild 60

# Reset all chaos
./scripts/chaos-reset.sh
```

## Next Phase Readiness

- Phase 6 chaos engineering is now complete (all 5 plans)
- Chaos infrastructure (services 06-01/02/03), exercises/runbooks (06-04), and Docker Compose integration (06-05) are all delivered
- Phase 7 (Kafka) can proceed independently - chaos profile is additive and does not conflict with kafka profile
- The docker-compose.yml profiles pattern is established for future phases (kafka, cicd)

---
*Phase: 06-chaos-engineering*
*Completed: 2026-02-14*
