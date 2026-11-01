import { test, describe, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';

import { orderToVisit } from '../api/mappers.ts';
import { setAuthToken, apiRequest, apiUpload } from '../api/client.ts';
import {
  uploadEvidenceFile,
  createEvidenceRecord,
  saveSignalMeasurement,
  fetchOrderEvidences,
} from '../api/evidences.ts';
import { updateOrderStatus } from '../api/orders.ts';

describe('ATLAS Mobile — Suite de Integración de Evidencias y Hardware Real', () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    setAuthToken('mock-technician-jwt-token-xyz');
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    setAuthToken(null);
  });

  // ─── 1. Subida de Archivos a Neon Object Storage ───────────────────────────
  test('uploadEvidenceFile envía multipart con JWT, work_order_id y folder a Neon', async () => {
    let capturedUrl = '';
    let capturedMethod = '';
    let capturedHeaders = null;
    let capturedBody = null;

    globalThis.fetch = async (url, init) => {
      capturedUrl = String(url);
      capturedMethod = init?.method || 'GET';
      capturedHeaders = init?.headers;
      capturedBody = init?.body;

      return new Response(
        JSON.stringify({
          success: true,
          filename: 'uuid-12345.jpg',
          mime_type: 'image/jpeg',
          size_bytes: 54321,
          storage_url: 'evidences/2026/11/01/uuid-12345.jpg',
          message: 'Archivo validado y almacenado correctamente en Neon Object Storage',
        }),
        { status: 201, headers: { 'Content-Type': 'application/json' } }
      );
    };

    const res = await uploadEvidenceFile('wo-uuid-001', 'file:///test/mock_photo.jpg');

    assert.equal(res.success, true);
    assert.equal(res.storage_url, 'evidences/2026/11/01/uuid-12345.jpg');
    assert.match(capturedUrl, /\/evidences\/upload$/);
    assert.equal(capturedMethod, 'POST');
    assert.equal(capturedHeaders.Authorization, 'Bearer mock-technician-jwt-token-xyz');
    assert.equal(capturedHeaders['Content-Type'], undefined, 'No debe fijar Content-Type para permitir multipart boundary');
    assert.ok(capturedBody instanceof FormData);
  });

  // ─── 2. Registro de Evidencia con Clave Persistente ─────────────────────────
  test('createEvidenceRecord vincula la clave persistente de Neon a la orden', async () => {
    let capturedBody = null;

    globalThis.fetch = async (url, init) => {
      capturedBody = JSON.parse(init?.body || '{}');

      return new Response(
        JSON.stringify({
          id: 'ev-uuid-999',
          work_order_id: capturedBody.work_order_id,
          technician_id: 'tech-uuid-001',
          evidence_type: capturedBody.evidence_type,
          storage_url: capturedBody.storage_url,
          notes: capturedBody.notes,
          captured_at: '2026-11-01T18:00:00Z',
        }),
        { status: 201, headers: { 'Content-Type': 'application/json' } }
      );
    };

    const res = await createEvidenceRecord({
      work_order_id: 'wo-uuid-001',
      evidence_type: 'FOTO_ANTES',
      storage_url: 'evidences/2026/11/01/uuid-12345.jpg',
      notes: 'Fotografía previa tomada en terreno',
    });

    assert.equal(res.id, 'ev-uuid-999');
    assert.equal(res.evidence_type, 'FOTO_ANTES');
    assert.equal(res.storage_url, 'evidences/2026/11/01/uuid-12345.jpg');
    assert.equal(capturedBody.work_order_id, 'wo-uuid-001');
  });

  // ─── 3. Mediciones Técnicas Manuales (dBm) ──────────────────────────────────
  test('saveSignalMeasurement persiste signal_dbm identificando medición manual del técnico', async () => {
    let capturedBody = null;

    globalThis.fetch = async (url, init) => {
      capturedBody = JSON.parse(init?.body || '{}');

      return new Response(
        JSON.stringify({
          id: 'ev-dbm-777',
          work_order_id: capturedBody.work_order_id,
          technician_id: 'tech-uuid-001',
          evidence_type: capturedBody.evidence_type,
          storage_url: capturedBody.storage_url,
          signal_dbm: capturedBody.signal_dbm,
          notes: capturedBody.notes,
          captured_at: '2026-11-01T18:05:00Z',
        }),
        { status: 201, headers: { 'Content-Type': 'application/json' } }
      );
    };

    const res = await saveSignalMeasurement('wo-uuid-001', -78);

    assert.equal(res.id, 'ev-dbm-777');
    assert.equal(capturedBody.evidence_type, 'DIAGNOSTICO_DBM');
    assert.equal(capturedBody.signal_dbm, -78);
    assert.equal(capturedBody.storage_url, 'telemetry/signal_dbm');
    assert.match(capturedBody.notes, /Medición manual/i, 'Debe identificar que fue manual y no automática');
  });

  // ─── 4. Control de Errores y Permisos RBAC (403, 401, 500) ──────────────────
  test('Lanza ApiError con status 403 cuando el técnico no tiene permisos sobre la orden', async () => {
    globalThis.fetch = async () => {
      return new Response(
        JSON.stringify({ detail: 'No tienes permisos para registrar evidencias en esta orden' }),
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      );
    };

    await assert.rejects(
      async () => {
        await createEvidenceRecord({
          work_order_id: 'wo-uuid-other-tech',
          evidence_type: 'FOTO_DESPUES',
          storage_url: 'evidences/test.jpg',
        });
      },
      (err) => {
        assert.equal(err.name, 'ApiError');
        assert.equal(err.status, 403);
        assert.match(err.message, /No tienes permisos/);
        return true;
      }
    );
  });

  test('Lanza ApiError de red cuando falla la conexión al backend o Neon', async () => {
    globalThis.fetch = async () => {
      throw new Error('Connection refused');
    };

    await assert.rejects(
      async () => {
        await uploadEvidenceFile('wo-uuid-001', 'file:///test/mock.jpg');
      },
      (err) => {
        assert.equal(err.name, 'ApiError');
        assert.equal(err.kind, 'network');
        assert.match(err.message, /No se pudo conectar con el servidor/);
        return true;
      }
    );
  });

  // ─── 5. Reintentos y Prevención de Registros Duplicados ───────────────────────
  test('El flujo de reintento reutiliza storage_url persistida sin duplicar subida binaria', async () => {
    let uploadCount = 0;
    let createCount = 0;

    globalThis.fetch = async (url, init) => {
      const u = String(url);
      if (u.includes('/evidences/upload')) {
        uploadCount++;
        return new Response(
          JSON.stringify({
            success: true,
            filename: 'retry-photo.jpg',
            mime_type: 'image/jpeg',
            size_bytes: 1024,
            storage_url: 'evidences/persisted_once.jpg',
            message: 'OK',
          }),
          { status: 201, headers: { 'Content-Type': 'application/json' } }
        );
      }
      if (u.includes('/evidences')) {
        createCount++;
        return new Response(
          JSON.stringify({
            id: 'ev-retry-success',
            work_order_id: 'wo-uuid-001',
            technician_id: 'tech-001',
            evidence_type: 'FOTO_DESPUES',
            storage_url: 'evidences/persisted_once.jpg',
            captured_at: '2026-11-01T18:10:00Z',
          }),
          { status: 201, headers: { 'Content-Type': 'application/json' } }
        );
      }
      return new Response('Not Found', { status: 404 });
    };

    // Simular estado local: la foto ya obtuvo storageUrl en el primer intento que falló en PostgreSQL
    const failedItem = {
      id: 'photo-1',
      uri: 'file:///photo.jpg',
      type: 'FOTO_DESPUES',
      status: 'error',
      storageUrl: 'evidences/persisted_once.jpg',
    };

    // Al reintentar teniendo ya storageUrl, no se vuelve a invocar uploadEvidenceFile
    let finalStorageUrl = failedItem.storageUrl;
    if (!finalStorageUrl) {
      const up = await uploadEvidenceFile('wo-uuid-001', failedItem.uri);
      finalStorageUrl = up.storage_url;
    }

    const reg = await createEvidenceRecord({
      work_order_id: 'wo-uuid-001',
      evidence_type: failedItem.type,
      storage_url: finalStorageUrl,
    });

    assert.equal(uploadCount, 0, 'No debe volver a subir el archivo si storageUrl ya existe');
    assert.equal(createCount, 1, 'Debe registrar la evidencia con la clave existente');
    assert.equal(reg.id, 'ev-retry-success');
  });

  // ─── 6. Hardware Asignado Real (orderToVisit con order.items) ───────────────
  test('orderToVisit extrae router y SIM reales asociados a order.items', () => {
    const mockOrderWithItems = {
      id: 'wo-08492-uuid',
      order_number: 'OT-08492',
      title: 'Instalación Entel Corporativo',
      description: 'Instalación y checklist de hardware',
      service_type: 'INSTALACION_FIBRA',
      priority: 'ALTA',
      status: 'CONFIRMADA',
      client_id: 'client-02-uuid',
      technician_id: 'tech-01-uuid',
      scheduled_date: '2026-11-01T10:00:00Z',
      eta: null,
      address_override: 'Av. Providencia 1234',
      comuna_override: 'Providencia',
      client: {
        id: 'client-02-uuid',
        business_name: 'Cliente Prueba ATLAS 02',
        contact_person: 'Admin Cliente',
        contact_phone: '+56912345678',
        contact_email: 'cliente@atlas.cl',
        address: 'Av. Providencia 1234',
        comuna: 'Providencia',
      },
      items: [
        {
          id: 'item-01',
          work_order_id: 'wo-08492-uuid',
          equipment_id: 'equip-router-uuid',
          equipment_serial: 'RTR-ENTEL-2024-001',
          equipment_model: 'Teltonika RUTX50',
          equipment_brand: 'Teltonika',
          action_type: 'INSTALACION',
        },
        {
          id: 'item-02',
          work_order_id: 'wo-08492-uuid',
          sim_card_id: 'sim-uuid-001',
          sim_iccid: '89560200102400018501',
          action_type: 'INSTALACION',
        },
      ],
    };

    const visit = orderToVisit(mockOrderWithItems);

    assert.ok(visit !== null);
    assert.equal(visit.code, 'OT-08492');
    assert.equal(visit.equipo.modelo, 'Teltonika RUTX50');
    assert.equal(visit.equipo.serie, 'RTR-ENTEL-2024-001');
    assert.equal(visit.equipo.iccid, '89560200102400018501');
  });

  test('orderToVisit muestra «Sin información» cuando la orden no tiene hardware asociado', () => {
    const mockOrderEmpty = {
      id: 'wo-08491-uuid',
      order_number: 'OT-08491',
      title: 'Diagnóstico preliminar',
      description: null,
      service_type: 'DIAGNOSTICO_ROUTER',
      priority: 'MEDIA',
      status: 'CONFIRMADA',
      client_id: 'client-01-uuid',
      technician_id: 'tech-01-uuid',
      scheduled_date: '2026-11-01T12:00:00Z',
      eta: null,
      address_override: null,
      comuna_override: null,
      client: null,
      items: [],
    };

    const visit = orderToVisit(mockOrderEmpty);

    assert.ok(visit !== null);
    assert.equal(visit.equipo.modelo, 'Sin información');
    assert.equal(visit.equipo.serie, 'Sin información');
    assert.equal(visit.equipo.iccid, 'Sin información');
  });

  // ─── 7. Transiciones de Estado y Finalización de Visita ─────────────────────
  test('updateOrderStatus realiza transiciones autorizadas por FastAPI', async () => {
    let patchedStatus = '';
    let patchedComment = '';

    globalThis.fetch = async (url, init) => {
      const body = JSON.parse(init?.body || '{}');
      patchedStatus = body.new_status;
      patchedComment = body.comment;

      return new Response(
        JSON.stringify({
          id: 'wo-uuid-001',
          order_number: 'OT-08492',
          status: body.new_status,
          title: 'OT Test',
          service_type: 'INSTALACION_FIBRA',
          priority: 'ALTA',
          client_id: 'c-1',
          technician_id: 't-1',
          scheduled_date: '2026-11-01T10:00:00Z',
          eta: null,
          address_override: null,
          comuna_override: null,
          client: null,
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    };

    const res = await updateOrderStatus('wo-uuid-001', 'COMPLETADA', 'Cierre formal con evidencias en Neon');

    assert.equal(patchedStatus, 'COMPLETADA');
    assert.match(patchedComment, /Cierre formal/);
    assert.equal(res.status, 'COMPLETADA');
  });

  // ─── 8. Carga e Hidratación de Evidencias Guardadas ─────────────────────────
  test('fetchOrderEvidences consulta las evidencias existentes en Neon para hidratar la UI', async () => {
    globalThis.fetch = async (url) => {
      const u = String(url);
      if (u.includes('/evidences/order/wo-uuid-001')) {
        return new Response(
          JSON.stringify({
            work_order_id: 'wo-uuid-001',
            order_number: 'OT-08492',
            total_evidences: 2,
            has_photo_before: true,
            has_photo_after: false,
            has_signature: false,
            has_signal_check: true,
            is_ready_for_closing: false,
            items: [
              {
                id: 'ev-photo-1',
                work_order_id: 'wo-uuid-001',
                technician_id: 'tech-001',
                evidence_type: 'FOTO_ANTES',
                storage_url: 'https://storage.neon.tech/presigned-photo-1.jpg',
                captured_at: '2026-11-01T12:00:00Z',
              },
              {
                id: 'ev-signal-1',
                work_order_id: 'wo-uuid-001',
                technician_id: 'tech-001',
                evidence_type: 'DIAGNOSTICO_DBM',
                storage_url: 'telemetry/signal_dbm',
                signal_dbm: -75,
                captured_at: '2026-11-01T12:01:00Z',
              },
            ],
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      }
      return new Response('Not Found', { status: 404 });
    };

    const audit = await fetchOrderEvidences('wo-uuid-001');

    assert.equal(audit.items.length, 2);
    assert.equal(audit.items[0].evidence_type, 'FOTO_ANTES');
    assert.equal(audit.items[1].evidence_type, 'DIAGNOSTICO_DBM');
    assert.equal(audit.items[1].signal_dbm, -75);
  });
});
