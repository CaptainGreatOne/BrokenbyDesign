'use strict';

const express = require('express');
const path = require('path');
const { enableChaos, disableChaos, resetChaos, getStatus, SERVICE_TARGETS } = require('./services');

const app = express();
const PORT = process.env.PORT || 9095;

const VALID_SERVICES = [...Object.keys(SERVICE_TARGETS), 'all'];
const VALID_SCENARIOS = ['latency', 'errors', 'crash', 'memory', 'disk'];

app.use(express.json());

// Request logging
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', service: 'chaos-controller' });
});

// Static UI
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'ui.html'));
});

// List available services
app.get('/api/services', (req, res) => {
  const services = Object.entries(SERVICE_TARGETS).map(([name, cfg]) => ({
    name,
    url: cfg.url,
    chaosPath: cfg.chaosPath
  }));
  res.json({ services });
});

// POST /api/chaos/enable
app.post('/api/chaos/enable', async (req, res) => {
  const { service, scenario, severity = 'mild', params = {}, duration_seconds } = req.body;

  if (!service || !VALID_SERVICES.includes(service)) {
    return res.status(400).json({ error: `Invalid service. Must be one of: ${VALID_SERVICES.join(', ')}` });
  }
  if (!scenario || !VALID_SCENARIOS.includes(scenario)) {
    return res.status(400).json({ error: `Invalid scenario. Must be one of: ${VALID_SCENARIOS.join(', ')}` });
  }

  const durationSeconds = duration_seconds != null ? Number(duration_seconds) : null;

  try {
    const result = await enableChaos(service, scenario, severity, params, durationSeconds);
    console.log(`[chaos] enable ${scenario} (${severity}) on ${service}${durationSeconds ? ` for ${durationSeconds}s` : ''}`);
    res.json({ action: 'enable', service, scenario, severity, duration_seconds: durationSeconds, result });
  } catch (err) {
    console.error('[chaos] enable error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/chaos/disable
app.post('/api/chaos/disable', async (req, res) => {
  const { service, scenario } = req.body;

  if (!service || !VALID_SERVICES.includes(service)) {
    return res.status(400).json({ error: `Invalid service. Must be one of: ${VALID_SERVICES.join(', ')}` });
  }
  if (!scenario || !VALID_SCENARIOS.includes(scenario)) {
    return res.status(400).json({ error: `Invalid scenario. Must be one of: ${VALID_SCENARIOS.join(', ')}` });
  }

  try {
    const result = await disableChaos(service, scenario);
    console.log(`[chaos] disable ${scenario} on ${service}`);
    res.json({ action: 'disable', service, scenario, result });
  } catch (err) {
    console.error('[chaos] disable error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/chaos/reset
app.post('/api/chaos/reset', async (req, res) => {
  const { service = 'all' } = req.body || {};

  if (!VALID_SERVICES.includes(service)) {
    return res.status(400).json({ error: `Invalid service. Must be one of: ${VALID_SERVICES.join(', ')}` });
  }

  try {
    const result = await resetChaos(service);
    console.log(`[chaos] reset all chaos on ${service}`);
    res.json({ action: 'reset', service, result });
  } catch (err) {
    console.error('[chaos] reset error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/chaos/status
app.get('/api/chaos/status', async (req, res) => {
  const service = req.query.service || 'all';

  if (!VALID_SERVICES.includes(service)) {
    return res.status(400).json({ error: `Invalid service. Must be one of: ${VALID_SERVICES.join(', ')}` });
  }

  try {
    const result = await getStatus(service);
    res.json({ service, status: result });
  } catch (err) {
    console.error('[chaos] status error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`[chaos-controller] Listening on port ${PORT}`);
  console.log(`[chaos-controller] UI: http://localhost:${PORT}/`);
  console.log(`[chaos-controller] API: http://localhost:${PORT}/api/chaos/status`);
});
