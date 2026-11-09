import test from 'node:test';
import assert from 'node:assert/strict';

import { sendOrderLocation } from '../api/orders.ts';
import { formatTimeAgo } from '../utils/helpers.ts';
import { apiRequest, setAuthToken, getAuthToken } from '../api/client.ts';
import { setStored } from '../api/storage.ts';
import {
  ATLAS_LOCATION_TASK,
  startTracking,
  stopTracking,
  getTrackingStatus,
  subscribeTrackingStatus,
  isTrackingActive,
  getActiveTrackingOrderId,
} from '../services/trackingService.ts';

import { resetMocks as resetLocationMocks, mockLocationState } from './mock-expo-location.mjs';
import mockTaskManager, { getDefinedTask } from './mock-expo-task-manager.mjs';

test('formatTimeAgo formatea intervalos relativos en español correctamente', () => {
  const now = 1000000000;
  assert.equal(formatTimeAgo(0, now), 'hace un momento');
  assert.equal(formatTimeAgo(now - 5000, now), 'hace un momento');
  assert.equal(formatTimeAgo(now - 25000, now), 'hace 25s');
  assert.equal(formatTimeAgo(now - 65000, now), 'hace 1 min');
  assert.equal(formatTimeAgo(now - 300000, now), 'hace 5 min');
  assert.equal(formatTimeAgo(now - 3600000, now), 'hace 1 h');
  assert.equal(formatTimeAgo(now - 7200000, now), 'hace 2 h');
});

test('sendOrderLocation realiza POST a /orders/{orderId}/location con coordenadas WGS84', async (t) => {
  const originalFetch = globalThis.fetch;
  t.after(() => {
    globalThis.fetch = originalFetch;
  });

  let requestedUrl = '';
  let requestedMethod = '';
  let requestedBody = '';

  globalThis.fetch = async (url, options = {}) => {
    requestedUrl = String(url);
    requestedMethod = options.method || 'GET';
    requestedBody = String(options.body || '');

    return {
      ok: true,
      status: 200,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: async () => ({
        success: true,
        order_id: 'test-order-123',
        technician_id: 'tech-uuid-456',
        current_lat: -33.4489,
        current_lng: -70.6693,
        last_location_at: '2026-11-05T22:00:00Z',
        status: 'EN_RUTA',
      }),
    };
  };

  const res = await sendOrderLocation('test-order-123', -33.4489, -70.6693);

  assert.equal(requestedMethod, 'POST');
  assert.ok(requestedUrl.includes('/orders/test-order-123/location'));
  const parsed = JSON.parse(requestedBody);
  assert.equal(parsed.lat, -33.4489);
  assert.equal(parsed.lng, -70.6693);
  assert.equal(res.success, true);
});

test('client: restaura automáticamente el token persistido cuando authToken en memoria es null', async (t) => {
  const originalFetch = globalThis.fetch;
  t.after(() => {
    globalThis.fetch = originalFetch;
    setAuthToken(null);
  });

  // Guardar token en storage persistente simulado
  await setStored('atlas.token', 'persisted-jwt-token-12345');
  setAuthToken(null);
  assert.equal(getAuthToken(), null);

  let capturedAuthHeader = null;
  globalThis.fetch = async (url, options = {}) => {
    capturedAuthHeader = options.headers?.Authorization;
    return {
      ok: true,
      status: 200,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: async () => ({ status: 'online' }),
    };
  };

  await apiRequest('/health', { auth: true });

  assert.equal(capturedAuthHeader, 'Bearer persisted-jwt-token-12345');
  assert.equal(getAuthToken(), 'persisted-jwt-token-12345');
});

test('trackingService: define la tarea ATLAS_LOCATION_TASK en TaskManager', () => {
  assert.ok(mockTaskManager.isTaskDefined(ATLAS_LOCATION_TASK));
  assert.ok(typeof getDefinedTask(ATLAS_LOCATION_TASK) === 'function');
});

test('trackingService: startTracking inicia Location.startLocationUpdatesAsync y envía posición inicial', async (t) => {
  resetLocationMocks();
  await stopTracking();

  const originalFetch = globalThis.fetch;
  t.after(async () => {
    globalThis.fetch = originalFetch;
    await stopTracking();
    resetLocationMocks();
  });

  const sentLocations = [];
  globalThis.fetch = async (url, options = {}) => {
    if (String(url).includes('/location')) {
      sentLocations.push(JSON.parse(String(options.body)));
      return {
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({ success: true }),
      };
    }
    return { ok: true, status: 200, json: async () => ({}) };
  };

  const started = await startTracking('order-xyz-789');
  assert.equal(started, true);

  // Verifica que se llamó startLocationUpdatesAsync
  assert.equal(mockLocationState.startLocationUpdatesCalls.length, 1);
  const call = mockLocationState.startLocationUpdatesCalls[0];
  assert.equal(call.taskName, ATLAS_LOCATION_TASK);
  assert.ok(call.options.foregroundService);
  assert.equal(call.options.foregroundService.notificationTitle, 'Atlas Técnico en ruta');
  assert.equal(call.options.timeInterval, 30000);
  assert.equal(call.options.distanceInterval, 15);

  // Verifica posición inicial enviada
  assert.equal(sentLocations.length, 1);
  assert.equal(sentLocations[0].lat, -33.45);
  assert.equal(sentLocations[0].lng, -70.65);

  // Verifica estado
  assert.equal(getActiveTrackingOrderId(), 'order-xyz-789');
  const status = getTrackingStatus();
  assert.equal(status.isTracking, true);
  assert.equal(status.state, 'active');
  assert.equal(status.orderId, 'order-xyz-789');
  assert.ok(status.lastSentAt !== null);

  const isActive = await isTrackingActive('order-xyz-789');
  assert.equal(isActive, true);
});

test('trackingService: no duplica startLocationUpdatesAsync si ya está iniciado', async (t) => {
  resetLocationMocks();
  await stopTracking();

  const originalFetch = globalThis.fetch;
  t.after(async () => {
    globalThis.fetch = originalFetch;
    await stopTracking();
    resetLocationMocks();
  });

  globalThis.fetch = async () => ({
    ok: true,
    status: 200,
    headers: new Headers({ 'content-type': 'application/json' }),
    json: async () => ({ success: true }),
  });

  await startTracking('order-xyz-789');
  assert.equal(mockLocationState.startLocationUpdatesCalls.length, 1);

  // Segunda llamada para la misma orden cuando ya está iniciado
  await startTracking('order-xyz-789');
  assert.equal(mockLocationState.startLocationUpdatesCalls.length, 1);
});

test('trackingService: tarea de fondo envía ubicaciones y actualiza trackingStatus', async (t) => {
  resetLocationMocks();
  await stopTracking();

  const originalFetch = globalThis.fetch;
  t.after(async () => {
    globalThis.fetch = originalFetch;
    await stopTracking();
    resetLocationMocks();
  });

  const sent = [];
  globalThis.fetch = async (url, options = {}) => {
    if (String(url).includes('/location')) {
      sent.push(JSON.parse(String(options.body)));
      return {
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({ success: true }),
      };
    }
    return { ok: true, status: 200, json: async () => ({}) };
  };

  await startTracking('order-bg-1');
  sent.length = 0; // Limpiar reporte inicial

  const taskFn = getDefinedTask(ATLAS_LOCATION_TASK);
  assert.ok(taskFn);

  // Ejecutar tarea de fondo simulando evento del OS
  await taskFn({
    data: {
      locations: [
        { coords: { latitude: -33.4567, longitude: -70.6543 } },
      ],
    },
  });

  assert.equal(sent.length, 1);
  assert.equal(sent[0].lat, -33.4567);
  assert.equal(sent[0].lng, -70.6543);

  const status = getTrackingStatus();
  assert.equal(status.state, 'active');
  assert.equal(status.lastLat, -33.4567);
  assert.equal(status.lastLng, -70.6543);
});

test('trackingService: tarea de fondo detiene seguimiento ante HTTP 409 (orden fuera de EN_RUTA)', async (t) => {
  resetLocationMocks();
  await stopTracking();

  const originalFetch = globalThis.fetch;
  t.after(async () => {
    globalThis.fetch = originalFetch;
    await stopTracking();
    resetLocationMocks();
  });

  let shouldFail = false;
  globalThis.fetch = async (url) => {
    if (String(url).includes('/location') && shouldFail) {
      return {
        ok: false,
        status: 409,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({ detail: 'La orden no se encuentra en estado EN_RUTA' }),
      };
    }
    return {
      ok: true,
      status: 200,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: async () => ({ success: true }),
    };
  };

  await startTracking('order-409');
  shouldFail = true;

  const taskFn = getDefinedTask(ATLAS_LOCATION_TASK);
  await taskFn({
    data: {
      locations: [
        { coords: { latitude: -33.46, longitude: -70.66 } },
      ],
    },
  });

  // Debe haberse detenido el seguimiento
  assert.equal(getActiveTrackingOrderId(), null);
  const status = getTrackingStatus();
  assert.equal(status.isTracking, false);
  assert.equal(status.errorMessage, 'La orden ya no se encuentra en ruta');
});

test('trackingService: stopTracking detiene ubicación y resetea trackingStatus', async (t) => {
  resetLocationMocks();
  await stopTracking();

  const originalFetch = globalThis.fetch;
  t.after(async () => {
    globalThis.fetch = originalFetch;
    await stopTracking();
    resetLocationMocks();
  });

  globalThis.fetch = async () => ({
    ok: true,
    status: 200,
    headers: new Headers({ 'content-type': 'application/json' }),
    json: async () => ({ success: true }),
  });

  await startTracking('order-stop-test');
  assert.equal(getActiveTrackingOrderId(), 'order-stop-test');

  await stopTracking();

  assert.equal(getActiveTrackingOrderId(), null);
  assert.equal(mockLocationState.stopLocationUpdatesCalls, 1);
  const status = getTrackingStatus();
  assert.equal(status.isTracking, false);
  assert.equal(status.state, 'idle');
  assert.equal(status.orderId, null);
});

test('trackingService: subscribeTrackingStatus notifica a los listeners cuando cambia el estado', async () => {
  const events = [];
  const unsubscribe = subscribeTrackingStatus((s) => {
    events.push(s.state);
  });

  await stopTracking();
  assert.ok(events.includes('idle'));

  unsubscribe();
});
