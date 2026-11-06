import test from 'node:test';
import assert from 'node:assert/strict';

import { sendOrderLocation } from '../api/orders.ts';

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
