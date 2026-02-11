/**
 * Plain text logger for web-gateway service
 * Outputs logs in human-readable format for Loki collection
 * Format: {timestamp} {LEVEL} web-gateway {handler} {id} {key=value pairs} {message}
 */

function log(level, message, metadata = {}) {
  const timestamp = new Date().toISOString();

  // Pad level to 5 characters and uppercase
  const levelStr = level.toUpperCase().padEnd(5, ' ');

  // Extract handler (default to empty string)
  const handler = metadata.handler || '';

  // Extract ID field (priority: order_id, req_id, correlation_id)
  let idField = '';
  let idKey = null;
  if (metadata.order_id !== undefined) {
    idField = `order=${metadata.order_id}`;
    idKey = 'order_id';
  } else if (metadata.req_id !== undefined) {
    idField = `req=${metadata.req_id}`;
    idKey = 'req_id';
  } else if (metadata.correlation_id !== undefined) {
    idField = `req=${metadata.correlation_id}`;
    idKey = 'correlation_id';
  }

  // Build details from remaining metadata (exclude handler and extracted ID key)
  const details = [];
  for (const [key, value] of Object.entries(metadata)) {
    if (key === 'handler' || key === idKey) {
      continue;
    }
    details.push(`${key}=${value}`);
  }
  const detailsStr = details.join(' ');

  // Construct log line
  const parts = [
    timestamp,
    levelStr,
    'web-gateway',
    handler,
    idField,
    detailsStr,
    message
  ];

  // Filter out empty parts (except timestamp, level, service, message which are always present)
  const output = parts.filter(p => p !== '').join(' ');

  // All output goes to stdout (console.log)
  console.log(output);
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
