/**
 * Express HTTP server for web-gateway service
 * Receives REST requests and proxies to gRPC Order API
 */

const express = require('express');
const { v4: uuidv4 } = require('uuid');
const logger = require('./logger');
const routes = require('./routes');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware: JSON body parser
app.use(express.json());

// Middleware: Correlation ID
app.use((req, res, next) => {
  // Extract X-Request-ID header or generate new UUID
  const correlationId = req.headers['x-request-id'] || uuidv4();
  req.correlationId = correlationId;

  // Set correlation ID on response header
  res.setHeader('X-Request-ID', correlationId);

  next();
});

// Middleware: Request logging
app.use((req, res, next) => {
  logger.info('Request received', {
    correlation_id: req.correlationId,
    method: req.method,
    path: req.path,
    query: req.query,
    ip: req.ip
  });

  next();
});

// Middleware: Response timing
app.use((req, res, next) => {
  const startTime = Date.now();

  // Log when response finishes
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    logger.info('Request completed', {
      correlation_id: req.correlationId,
      method: req.method,
      path: req.path,
      status_code: res.statusCode,
      duration_ms: duration
    });
  });

  next();
});

// Mount routes
app.use('/', routes);

// Error handling middleware
app.use((err, req, res, next) => {
  const correlationId = req.correlationId || 'unknown';

  logger.error('Unhandled error', {
    correlation_id: correlationId,
    error: err.message,
    stack: err.stack
  });

  res.status(500).json({
    error: 'Internal server error',
    correlation_id: correlationId
  });
});

// Start server
const server = app.listen(PORT, () => {
  logger.info('Web Gateway started', {
    port: PORT,
    node_version: process.version,
    pid: process.pid
  });
});

// Graceful shutdown on SIGTERM
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');

  server.close(() => {
    logger.info('Server closed, exiting');
    process.exit(0);
  });

  // Force shutdown after 10 seconds
  setTimeout(() => {
    logger.error('Forced shutdown after timeout');
    process.exit(1);
  }, 10000);
});

module.exports = app;
