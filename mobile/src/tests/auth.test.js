import test from 'node:test';
import assert from 'node:assert/strict';

import { isValidEmail } from '../utils/helpers.ts';
import { requestPasswordReset } from '../api/auth.ts';
import { ApiError } from '../api/client.ts';

test('isValidEmail valida formatos de correos válidos e inválidos', () => {
  // Casos válidos
  assert.equal(isValidEmail('tecnico@atlasops.cl'), true);
  assert.equal(isValidEmail('diego.jimenez@entel.cl'), true);
  assert.equal(isValidEmail('usuario_123@sub.dominio.com'), true);
  assert.equal(isValidEmail('  tecnico.pr@atlasops.cl  '), true); // con espacios a recortar

  // Casos inválidos
  assert.equal(isValidEmail(''), false);
  assert.equal(isValidEmail('   '), false);
  assert.equal(isValidEmail(null), false);
  assert.equal(isValidEmail(undefined), false);
  assert.equal(isValidEmail('sin-arroba.cl'), false);
  assert.equal(isValidEmail('@sin-usuario.cl'), false);
  assert.equal(isValidEmail('usuario@'), false);
  assert.equal(isValidEmail('usuario@dominio'), false); // sin TLD
  assert.equal(isValidEmail('usuario@.cl'), false);
  assert.equal(isValidEmail('usuario con espacios@dominio.cl'), false);
});

test('requestPasswordReset realiza POST a /auth/password-reset/request con email normalizado sin auth', async (t) => {
  const originalFetch = globalThis.fetch;
  t.after(() => {
    globalThis.fetch = originalFetch;
  });

  let requestedUrl = '';
  let requestedMethod = '';
  let requestedHeaders = {};
  let requestedBody = '';

  globalThis.fetch = async (url, options = {}) => {
    requestedUrl = String(url);
    requestedMethod = options.method || 'GET';
    requestedHeaders = options.headers || {};
    requestedBody = String(options.body || '');

    return {
      ok: true,
      status: 202,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: async () => ({
        message: 'Si el correo corresponde a una cuenta habilitada, recibirás instrucciones para recuperar el acceso.',
      }),
    };
  };

  const response = await requestPasswordReset('  TECNICO.PR@ATLASOPS.CL  ');

  assert.equal(requestedMethod, 'POST');
  assert.ok(requestedUrl.endsWith('/auth/password-reset/request'));
  assert.equal(requestedHeaders.Authorization, undefined, 'No debe enviar token de autorización');
  
  const payload = JSON.parse(requestedBody);
  assert.equal(payload.email, 'tecnico.pr@atlasops.cl', 'Debe normalizar a minúsculas y sin espacios');
  assert.equal(response.message, 'Si el correo corresponde a una cuenta habilitada, recibirás instrucciones para recuperar el acceso.');
});

test('requestPasswordReset propaga ApiError cuando el servidor responde con error', async (t) => {
  const originalFetch = globalThis.fetch;
  t.after(() => {
    globalThis.fetch = originalFetch;
  });

  globalThis.fetch = async () => ({
    ok: false,
    status: 429,
    headers: new Headers({ 'content-type': 'application/json' }),
    json: async () => ({
      detail: 'Demasiadas solicitudes de recuperación. Intenta más tarde.',
    }),
  });

  await assert.rejects(
    async () => {
      await requestPasswordReset('tecnico@atlasops.cl');
    },
    (err) => {
      assert.ok(err instanceof ApiError);
      assert.equal(err.status, 429);
      assert.equal(err.message, 'Demasiadas solicitudes de recuperación. Intenta más tarde.');
      return true;
    }
  );
});
