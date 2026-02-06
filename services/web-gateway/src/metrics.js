/**
 * Prometheus metrics configuration for web-gateway
 * Exposes request counters, latency histograms, and default Node.js runtime metrics
 */

const client = require('prom-client');

// Create a Registry to register metrics
const register = new client.Registry();

// Collect default Node.js metrics (GC, event loop lag, memory heap, etc.)
client.collectDefaultMetrics({ register });

// HTTP request counter with labels: method, route, status_code
const httpRequestCounter = new client.Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code'],
  registers: [register]
});

// HTTP request duration histogram with labels: method, route, status_code
// Buckets: 1ms, 10ms, 100ms, 500ms, 1s, 2s, 5s
const httpRequestDuration = new client.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.001, 0.01, 0.1, 0.5, 1, 2, 5],
  registers: [register]
});

module.exports = {
  register,
  httpRequestCounter,
  httpRequestDuration
};
