/**
 * Chaos engineering module for web-gateway
 * Provides in-memory chaos state, Express middleware, and control endpoints.
 * State resets on service restart (in-memory only).
 */

const express = require('express');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const { trace, SpanStatusCode } = require('@opentelemetry/api');
const logger = require('./logger');

// ---------------------------------------------------------------------------
// Chaos State (in-memory, resets on restart)
// ---------------------------------------------------------------------------

const chaosState = {
  latency: { enabled: false, severity: null, delayMs: 0, timer: null },
  errors:  { enabled: false, severity: null, errorRate: 0, timer: null },
  crash:   { enabled: false, severity: null, countdown: null, timer: null },
  memory:  { enabled: false, severity: null, allocations: [], timer: null },
  disk:    { enabled: false, severity: null, files: [], timer: null }
};

// ---------------------------------------------------------------------------
// Severity Presets
// ---------------------------------------------------------------------------

const PRESETS = {
  latency: { mild: { delayMs: 300 },  severe: { delayMs: 3000 } },
  errors:  { mild: { errorRate: 0.10 }, severe: { errorRate: 0.50 } },
  crash:   { mild: { countdown: 10 }, severe: { countdown: 3 } },
  memory:  { mild: { sizeMB: 50 },    severe: { sizeMB: 200 } },
  disk:    { mild: { sizeMB: 10 },    severe: { sizeMB: 50 } }
};

const VALID_SCENARIOS = Object.keys(PRESETS);

// ---------------------------------------------------------------------------
// Helper: reset a single scenario to defaults
// ---------------------------------------------------------------------------

function resetScenario(scenario) {
  if (chaosState[scenario].timer) {
    clearTimeout(chaosState[scenario].timer);
    chaosState[scenario].timer = null;
  }

  if (scenario === 'memory') {
    chaosState.memory.allocations = [];
  }

  if (scenario === 'disk') {
    for (const filePath of chaosState.disk.files) {
      try {
        fs.unlinkSync(filePath);
      } catch (_) { /* file may already be gone */ }
    }
    chaosState.disk.files = [];
  }

  Object.assign(chaosState[scenario], {
    enabled: false,
    severity: null,
    ...(scenario === 'latency' ? { delayMs: 0 } : {}),
    ...(scenario === 'errors'  ? { errorRate: 0 } : {}),
    ...(scenario === 'crash'   ? { countdown: null } : {}),
    timer: null
  });
}

// ---------------------------------------------------------------------------
// Chaos Middleware
// ---------------------------------------------------------------------------

function chaosMiddleware(req, res, next) {
  // Skip chaos for control/observability paths
  if (
    req.path.startsWith('/chaos') ||
    req.path === '/metrics' ||
    req.path === '/health'
  ) {
    return next();
  }

  // Decrement crash countdown first (always, if enabled)
  if (chaosState.crash.enabled) {
    chaosState.crash.countdown -= 1;
    if (chaosState.crash.countdown <= 0) {
      logger.error('Chaos: service crash triggered', {
        handler: 'ChaosMiddleware',
        scenario: 'crash'
      });
      setTimeout(() => process.exit(1), 100);
      // Allow current request to short-circuit cleanly
      return res.status(503).json({ error: 'Chaos: service crash triggered', chaos: true });
    }
  }

  // Error injection — may short-circuit before calling next()
  if (chaosState.errors.enabled && Math.random() < chaosState.errors.errorRate) {
    logger.warn('Chaos: injecting error response', {
      handler: 'ChaosMiddleware',
      scenario: 'errors',
      error_rate: chaosState.errors.errorRate
    });

    // Mark the active OTel span as ERROR so the injected error is visible in Jaeger
    const span = trace.getActiveSpan();
    if (span) {
      span.setStatus({ code: SpanStatusCode.ERROR, message: 'Chaos: injected error' });
      span.setAttribute('chaos.injected', true);
    }

    return res.status(500).json({ error: 'Chaos: injected error', chaos: true });
  }

  // Latency injection — wraps next() in a delay
  if (chaosState.latency.enabled) {
    logger.warn('Chaos: injecting latency', {
      handler: 'ChaosMiddleware',
      scenario: 'latency',
      delay_ms: chaosState.latency.delayMs
    });
    return setTimeout(next, chaosState.latency.delayMs);
  }

  next();
}

// ---------------------------------------------------------------------------
// Chaos Router (control endpoints)
// ---------------------------------------------------------------------------

const chaosRouter = express.Router();

// POST /chaos/enable
chaosRouter.post('/enable', (req, res) => {
  const { scenario, severity, params = {}, duration_seconds } = req.body || {};

  if (!VALID_SCENARIOS.includes(scenario)) {
    return res.status(400).json({
      error: `Invalid scenario. Must be one of: ${VALID_SCENARIOS.join(', ')}`
    });
  }

  const validSeverities = ['mild', 'severe'];
  const resolvedSeverity = severity || 'mild';
  if (!validSeverities.includes(resolvedSeverity)) {
    return res.status(400).json({
      error: `Invalid severity. Must be one of: ${validSeverities.join(', ')}`
    });
  }

  const preset = PRESETS[scenario][resolvedSeverity];

  // Clear any existing auto-disable timer
  if (chaosState[scenario].timer) {
    clearTimeout(chaosState[scenario].timer);
    chaosState[scenario].timer = null;
  }

  // Apply preset values, then override with explicit params
  const config = { ...preset, ...params };

  // Enable the scenario
  chaosState[scenario].enabled = true;
  chaosState[scenario].severity = resolvedSeverity;

  switch (scenario) {
    case 'latency':
      chaosState.latency.delayMs = Number(config.delayMs);
      break;

    case 'errors':
      chaosState.errors.errorRate = Number(config.errorRate);
      break;

    case 'crash':
      chaosState.crash.countdown = Number(config.countdown);
      break;

    case 'memory': {
      const sizeMB = Number(config.sizeMB);
      const buf = Buffer.alloc(sizeMB * 1024 * 1024);
      chaosState.memory.allocations.push(buf);
      config.sizeMB = sizeMB;
      break;
    }

    case 'disk': {
      const sizeMB = Number(config.sizeMB);
      const filePath = path.join('/tmp', `chaos-${uuidv4()}.dat`);
      const data = Buffer.alloc(sizeMB * 1024 * 1024, 'x');
      fs.writeFileSync(filePath, data);
      chaosState.disk.files.push(filePath);
      config.sizeMB = sizeMB;
      config.filePath = filePath;
      break;
    }
  }

  // Optional auto-disable via duration_seconds
  const durationSec = (duration_seconds && Number(duration_seconds) > 0)
    ? Number(duration_seconds)
    : null;

  if (durationSec !== null) {
    chaosState[scenario].timer = setTimeout(() => {
      logger.info('Chaos: scenario auto-disabled after duration', {
        handler: 'ChaosMiddleware',
        scenario,
        duration_seconds: durationSec
      });
      resetScenario(scenario);
    }, durationSec * 1000);
  }

  logger.warn('Chaos: scenario enabled', {
    handler: 'ChaosMiddleware',
    scenario,
    severity: resolvedSeverity,
    duration_seconds: durationSec,
    ...config
  });

  return res.status(200).json({
    status: 'enabled',
    scenario,
    config,
    duration_seconds: durationSec
  });
});

// POST /chaos/disable
chaosRouter.post('/disable', (req, res) => {
  const { scenario } = req.body || {};

  if (!VALID_SCENARIOS.includes(scenario)) {
    return res.status(400).json({
      error: `Invalid scenario. Must be one of: ${VALID_SCENARIOS.join(', ')}`
    });
  }

  resetScenario(scenario);

  logger.info('Chaos: scenario disabled', {
    handler: 'ChaosMiddleware',
    scenario
  });

  return res.status(200).json({ status: 'disabled', scenario });
});

// POST /chaos/reset
chaosRouter.post('/reset', (_req, res) => {
  for (const scenario of VALID_SCENARIOS) {
    resetScenario(scenario);
  }

  logger.info('Chaos: all scenarios reset', {
    handler: 'ChaosMiddleware'
  });

  return res.status(200).json({
    status: 'reset',
    message: 'All chaos scenarios disabled'
  });
});

// GET /chaos/status
chaosRouter.get('/status', (_req, res) => {
  const status = {
    latency: {
      enabled: chaosState.latency.enabled,
      severity: chaosState.latency.severity,
      delayMs: chaosState.latency.delayMs
    },
    errors: {
      enabled: chaosState.errors.enabled,
      severity: chaosState.errors.severity,
      errorRate: chaosState.errors.errorRate
    },
    crash: {
      enabled: chaosState.crash.enabled,
      severity: chaosState.crash.severity,
      countdown: chaosState.crash.countdown
    },
    memory: {
      enabled: chaosState.memory.enabled,
      severity: chaosState.memory.severity,
      allocationCount: chaosState.memory.allocations.length
    },
    disk: {
      enabled: chaosState.disk.enabled,
      severity: chaosState.disk.severity,
      fileCount: chaosState.disk.files.length,
      files: chaosState.disk.files
    }
  };

  return res.status(200).json(status);
});

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

module.exports = { chaosMiddleware, chaosRouter, chaosState };
