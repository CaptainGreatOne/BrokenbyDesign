/**
 * Structured JSON logger for traffic-generator service
 */

function log(level, message, metadata = {}) {
  const logEntry = {
    timestamp: new Date().toISOString(),
    level,
    service: 'traffic-generator',
    message,
    ...metadata
  };

  console.log(JSON.stringify(logEntry));
}

module.exports = { log };
