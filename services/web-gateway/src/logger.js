/**
 * Structured JSON logger for web-gateway service
 * Outputs logs in JSON format for easy parsing by log aggregation systems
 */

function log(level, message, metadata = {}) {
  const logEntry = {
    timestamp: new Date().toISOString(),
    level,
    service: 'web-gateway',
    message,
    ...metadata
  };

  const output = JSON.stringify(logEntry);

  if (level === 'error') {
    console.error(output);
  } else {
    console.log(output);
  }
}

function info(message, metadata = {}) {
  log('info', message, metadata);
}

function error(message, metadata = {}) {
  log('error', message, metadata);
}

function warn(message, metadata = {}) {
  log('warn', message, metadata);
}

module.exports = {
  log,
  info,
  error,
  warn
};
