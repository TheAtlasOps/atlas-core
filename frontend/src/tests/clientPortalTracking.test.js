import test from "node:test";
import assert from "node:assert/strict";

import {
  mapApiSummaryToTrackingOrder,
  formatCompletedDateDisplay,
  getPortalAccessError,
} from "../lib/magicLinksData.js";

// ─── 1. Orden completada sin firma digital ──────────────────────────────────
test("Orden completada sin firma digital se mapea con is_signed=false y firma pendiente", () => {
  const summaryApi = {
    order_id: "10202a6a-80da-40b8-ad99-809238dc83aa",
    order_number: "#OT-08492",
    title: "Instalación Router - Prueba ATLAS 02",
    status: "Completada",
    status_key: "completada",
    service_type: "DIAGNOSTICO_ROUTER",
    scheduled_date: null,
    completed_at: "2026-11-01T23:55:14.373Z",
    eta: null,
    eta_label: "Servicio finalizado",
    address: "Av. Apoquindo 3000, Las Condes",
    comuna: "Las Condes",
    contact_person: "Cliente Prueba ATLAS 02",
    contact_phone: "+56 9 8000 0000",
    client_confirmed_at: null,
    is_confirmed: false,
    signature_url: null, // Sin firma registrada
    is_completed: true,
  };

  const order = mapApiSummaryToTrackingOrder(summaryApi);

  assert.equal(order.is_completed, true);
  assert.equal(order.signature_url, null);
  assert.equal(order.is_signed, false, "Una orden completada no debe considerarse firmada sin signature_url");
  assert.equal(order.eta, null, "ETA debe ser null para órdenes completadas (no mezclar con completed_at)");
  assert.ok(order.completed_at, "Debe tener completed_at registrado");
  assert.match(order.completed_at, /:55/, "completed_at debe reflejar la hora real de término");
});

// ─── 2. Orden completada con firma digital confirmada por backend ───────────
test("Orden completada con firma digital válida se mapea con is_signed=true y signature_url", () => {
  const summaryApi = {
    order_id: "10202a6a-80da-40b8-ad99-809238dc83aa",
    order_number: "#OT-08492",
    status: "Completada",
    status_key: "completada",
    service_type: "DIAGNOSTICO_ROUTER",
    completed_at: "2026-11-01T23:55:14.373Z",
    is_confirmed: true,
    client_confirmed_at: "2026-11-01T23:58:00.000Z",
    signature_url: "https://neon-storage.local/signatures/10202a6a_abcdef12.png",
    is_completed: true,
  };

  const order = mapApiSummaryToTrackingOrder(summaryApi);

  assert.equal(order.is_completed, true);
  assert.equal(order.is_signed, true);
  assert.ok(order.signature_url);
  assert.match(order.signature_url, /signatures/);
});

// ─── 3. Confirmación de visita ausente ──────────────────────────────────────
test("Confirmación de visita es false cuando el cliente no ha interactuado (client_confirmed_at=null)", () => {
  const summaryApi = {
    order_id: "10202a6a-80da-40b8-ad99-809238dc83aa",
    order_number: "#OT-08492",
    status: "Completada",
    status_key: "completada",
    client_confirmed_at: null,
    is_confirmed: false, // Backend fiel sin confirmación previa
    signature_url: null,
    is_completed: true,
  };

  const order = mapApiSummaryToTrackingOrder(summaryApi);

  assert.equal(order.is_confirmed, false, "No debe marcar visita confirmada sin client_confirmed_at");
  assert.equal(order.client_confirmed_at, null);
});

// ─── 4. Hito EN_RUTA omitido en terreno no debe marcarse como completed ─────
test("Timeline steps preserva que hitos omitidos (EN_RUTA) no figuren como completados", () => {
  const summaryApi = {
    order_id: "10202a6a-80da-40b8-ad99-809238dc83aa",
    status_key: "completada",
    timeline_steps: [
      { key: "confirmada", label: "Visita confirmada", completed: true, current: false, timestamp: "17:03" },
      { key: "en_ruta", label: "Técnico en ruta", completed: false, current: false, timestamp: null, description: "Etapa no registrada en terreno" },
      { key: "en_sitio", label: "Técnico en el lugar", completed: true, current: false, timestamp: "23:55" },
      { key: "completada", label: "Servicio completado", completed: true, current: true, timestamp: "23:55" },
    ],
  };

  const order = mapApiSummaryToTrackingOrder(summaryApi);
  const stepsByKey = Object.fromEntries(order.timeline_steps.map((s) => [s.key, s]));

  assert.equal(stepsByKey.confirmada.completed, true);
  assert.equal(stepsByKey.en_sitio.completed, true);
  assert.equal(stepsByKey.completada.completed, true);

  // Verificación estricta: EN_RUTA omitido no debe figurar completado ni con timestamp falso
  assert.equal(stepsByKey.en_ruta.completed, false);
  assert.equal(stepsByKey.en_ruta.timestamp, null);
  assert.match(stepsByKey.en_ruta.description, /no registrada/i);
});

// ─── 5. Formateador de fecha real de finalización ───────────────────────────
test("formatCompletedDateDisplay formatea horas válidas y gestiona nulos adecuadamente", () => {
  assert.equal(formatCompletedDateDisplay(null), "");
  assert.equal(formatCompletedDateDisplay(undefined), "");

  const formatted = formatCompletedDateDisplay("2026-11-01T23:55:14.373Z");
  assert.ok(formatted.length > 0);
  assert.match(formatted, /hrs/);
});

// ─── 6. Verificación de errores de acceso a Magic Link ──────────────────────
test("getPortalAccessError clasifica 410 (expirado/revocado), 404 (inválido) y otros", () => {
  const err410 = getPortalAccessError({ status: 410 });
  assert.equal(err410.kind, "expired");
  assert.match(err410.message, /vencido o fue revocado/i);

  const err404 = getPortalAccessError({ status: 404 });
  assert.equal(err404.kind, "invalid");
  assert.match(err404.message, /no es válido o no existe/i);

  const err500 = getPortalAccessError({ status: 500 });
  assert.equal(err500.kind, "unavailable");
  assert.match(err500.message, /no pudimos consultar/i);
});

// ─── 7. Orden auditada y firmada con metadatos reales ────────────────────────
test("Orden auditada y firmada mapea correctamente is_audited, audited_at, audit_notes, signed_by_name y signed_at", () => {
  const summaryApi = {
    order_id: "10202a6a-80da-40b8-ad99-809238dc83aa",
    order_number: "#OT-08492",
    status: "Completada",
    status_key: "completada",
    is_signed: true,
    signature_url: "https://storage.neon.tech/firma_08492.png",
    signed_by_name: "Receptor Autorizado Entel",
    signed_at: "2026-11-04T18:30:00.000Z",
    is_audited: true,
    audited_at: "2026-11-04T19:00:00.000Z",
    audit_notes: "Cierre administrativo aprobado y conforme",
    technician: {
      name: "Juan Técnico",
      phone: "No disponible",
      avatar: "JT",
      vehicle_plate: null,
      credential_id: "16.111.222-3",
    },
  };

  const order = mapApiSummaryToTrackingOrder(summaryApi);

  assert.equal(order.is_audited, true);
  assert.equal(order.audited_at, "2026-11-04T19:00:00.000Z");
  assert.equal(order.audit_notes, "Cierre administrativo aprobado y conforme");
  assert.equal(order.is_signed, true);
  assert.equal(order.signature_url, "https://storage.neon.tech/firma_08492.png");
  assert.equal(order.signed_by_name, "Receptor Autorizado Entel");
  assert.equal(order.signed_at, "2026-11-04T18:30:00.000Z");
  assert.equal(order.technician.vehicle_plate, "No disponible");
  assert.equal(order.technician.credential_id, "16.111.222-3");
});
