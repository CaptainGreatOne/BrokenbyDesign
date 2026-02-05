/**
 * HTTP control server for traffic mode switching
 */

const express = require('express');
const { log } = require('./logger');
const TrafficGenerator = require('./traffic');

const PORT = process.env.PORT || 8089;
const TARGET_URL = process.env.TARGET_URL || 'http://nginx';
const STARTUP_DELAY = 10000; // 10 seconds

const app = express();
app.use(express.json());

// Initialize traffic generator
const trafficGen = new TrafficGenerator(TARGET_URL);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'traffic-generator'
  });
});

// Status endpoint
app.get('/status', (req, res) => {
  const status = trafficGen.getStatus();
  res.json(status);
});

// Mode switching endpoints
app.post('/mode/steady', (req, res) => {
  const success = trafficGen.setMode('steady');
  if (success) {
    res.json({ mode: 'steady', rps: 2 });
  } else {
    res.status(400).json({ error: 'Failed to set mode' });
  }
});

app.post('/mode/burst', (req, res) => {
  const success = trafficGen.setMode('burst');
  if (success) {
    res.json({ mode: 'burst', rps: 20 });
  } else {
    res.status(400).json({ error: 'Failed to set mode' });
  }
});

app.post('/mode/overload', (req, res) => {
  const success = trafficGen.setMode('overload');
  if (success) {
    res.json({ mode: 'overload', rps: 100 });
  } else {
    res.status(400).json({ error: 'Failed to set mode' });
  }
});

app.post('/mode/pause', (req, res) => {
  const success = trafficGen.setMode('pause');
  if (success) {
    res.json({ mode: 'pause', rps: 0 });
  } else {
    res.status(400).json({ error: 'Failed to set mode' });
  }
});

// Start server
app.listen(PORT, () => {
  log('info', `Traffic generator control server listening on port ${PORT}`, {
    target_url: TARGET_URL,
    port: PORT
  });

  // Wait for services to initialize, then start in steady mode
  setTimeout(() => {
    trafficGen.start();
    trafficGen.setMode('steady');
    log('info', 'Traffic generator started in steady mode', {
      rps: 2,
      delay_ms: STARTUP_DELAY
    });
  }, STARTUP_DELAY);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  log('info', 'SIGTERM received, shutting down gracefully');
  trafficGen.stop();
  process.exit(0);
});

process.on('SIGINT', () => {
  log('info', 'SIGINT received, shutting down gracefully');
  trafficGen.stop();
  process.exit(0);
});
