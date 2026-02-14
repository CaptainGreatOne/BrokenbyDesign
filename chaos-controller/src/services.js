'use strict';

const SERVICE_TARGETS = {
  'web-gateway': { url: 'http://web-gateway:3000', chaosPath: '/chaos' },
  'order-api': { url: 'http://order-api:8000', chaosPath: '/chaos' },
  'fulfillment-worker': { url: 'http://fulfillment-worker:2112', chaosPath: '/chaos' }
};

const FETCH_TIMEOUT_MS = 5000;

function buildFetchOptions(method, body = null) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  const options = {
    method,
    signal: controller.signal,
    headers: { 'Content-Type': 'application/json' }
  };
  if (body !== null) {
    options.body = JSON.stringify(body);
  }
  return { options, timeoutId };
}

async function proxyPost(service, path, body) {
  const target = SERVICE_TARGETS[service];
  if (!target) {
    return { service, status: 'error', error: `Unknown service: ${service}` };
  }
  const url = `${target.url}${target.chaosPath}${path}`;
  const { options, timeoutId } = buildFetchOptions('POST', body);
  try {
    const res = await fetch(url, options);
    clearTimeout(timeoutId);
    let json;
    try { json = await res.json(); } catch (_) { json = null; }
    return { service, status: res.ok ? 'ok' : 'error', httpStatus: res.status, response: json };
  } catch (err) {
    clearTimeout(timeoutId);
    return { service, status: 'error', error: err.message };
  }
}

async function proxyGet(service, path) {
  const target = SERVICE_TARGETS[service];
  if (!target) {
    return { service, status: 'error', error: `Unknown service: ${service}` };
  }
  const url = `${target.url}${target.chaosPath}${path}`;
  const { options, timeoutId } = buildFetchOptions('GET');
  try {
    const res = await fetch(url, options);
    clearTimeout(timeoutId);
    let json;
    try { json = await res.json(); } catch (_) { json = null; }
    return { service, status: res.ok ? 'ok' : 'error', httpStatus: res.status, response: json };
  } catch (err) {
    clearTimeout(timeoutId);
    return { service, status: 'error', error: err.message };
  }
}

async function enableChaos(service, scenario, severity, params = {}, durationSeconds = null) {
  if (service === 'all') {
    const results = await Promise.all(
      Object.keys(SERVICE_TARGETS).map(svc =>
        enableChaos(svc, scenario, severity, params, durationSeconds)
      )
    );
    return results;
  }
  const body = { scenario, severity, params };
  if (durationSeconds !== null && durationSeconds !== undefined) {
    body.duration_seconds = durationSeconds;
  }
  const result = await proxyPost(service, '/enable', body);
  return { ...result, duration_seconds: durationSeconds };
}

async function disableChaos(service, scenario) {
  if (service === 'all') {
    return Promise.all(
      Object.keys(SERVICE_TARGETS).map(svc => disableChaos(svc, scenario))
    );
  }
  return proxyPost(service, '/disable', { scenario });
}

async function resetChaos(service) {
  if (service === 'all') {
    return Promise.all(
      Object.keys(SERVICE_TARGETS).map(svc => resetChaos(svc))
    );
  }
  return proxyPost(service, '/reset', {});
}

async function getStatus(service) {
  if (service === 'all') {
    const results = await Promise.all(
      Object.keys(SERVICE_TARGETS).map(svc => getStatus(svc))
    );
    const aggregated = {};
    results.forEach(r => {
      aggregated[r.service] = r.response || { error: r.error };
    });
    return aggregated;
  }
  const result = await proxyGet(service, '/status');
  return { service, ...result };
}

module.exports = { enableChaos, disableChaos, resetChaos, getStatus, SERVICE_TARGETS };
