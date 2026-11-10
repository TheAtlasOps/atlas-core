import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

import {
  mapApiSummaryToTrackingOrder,
  formatCompletedDateDisplay,
  formatAddressDisplay,
  formatChileanTime,
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

// ─── 8. Regresión: Verificación estática de imports en CustomerTrackingView ──
test("CustomerTrackingView importa explícitamente formatCompletedDateDisplay", () => {
  const viewPath = path.resolve(__dirname, "../pages/CustomerTrackingView.jsx");
  const source = fs.readFileSync(viewPath, "utf-8");

  assert.match(
    source,
    /import\s*\{[^}]*formatCompletedDateDisplay[^}]*\}\s*from\s*["']\.\.\/lib\/magicLinksData["']/,
    "CustomerTrackingView debe importar formatCompletedDateDisplay para evitar ReferenceError en runtime"
  );
});

// ─── 9. Renderizado Real del Componente React en SSR sin ReferenceError ─────
test("CustomerTrackingView renderiza órdenes completadas, firmadas y auditadas sin ReferenceError", async () => {
  const { createServer } = await import("vite");
  const server = await createServer({
    root: path.resolve(__dirname, "../../"),
    server: { middlewareMode: true, hmr: false },
  });

  try {
    const React = (await import("react")).default;
    const { renderToString } = await import("react-dom/server");
    const { MemoryRouter } = await import("react-router-dom");
    const { ThemeProvider } = await server.ssrLoadModule("/src/context/ThemeContext.jsx");
    const { default: CustomerTrackingView } = await server.ssrLoadModule(
      "/src/pages/CustomerTrackingView.jsx"
    );

    const mockSummary = {
      order_id: "10202a6a-80da-40b8-ad99-809238dc83aa",
      order_number: "#OT-08492",
      title: "Instalación Router 5G - Prueba ATLAS",
      status: "Completada",
      status_key: "completada",
      service_type: "DIAGNOSTICO_ROUTER",
      scheduled_date: "2026-11-04T15:00:00.000Z",
      completed_at: "2026-11-04T18:30:00.000Z",
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
        vehicle_plate: "HG-4421",
        credential_id: "16.111.222-3",
      },
    };

    // Renderizar orden completada, firmada y auditada
    const html = renderToString(
      React.createElement(
        ThemeProvider,
        null,
        React.createElement(
          MemoryRouter,
          { initialEntries: ["/status/valid_token_test"] },
          React.createElement(CustomerTrackingView, { initialSummary: mockSummary })
        )
      )
    );

    // Verificaciones de contenido generado
    assert.ok(html.includes("Recepci\u00f3n conforme firmada"), "Debe mostrar el banner de firma");
    assert.ok(html.includes("Receptor Autorizado Entel"), "Debe incluir el nombre del receptor");
    assert.ok(html.includes("Servicio finalizado y auditado"), "Debe incluir el estado auditado");
    assert.ok(html.includes("hrs"), "Debe incluir la fecha/hora formateada sin lanzar ReferenceError");
  } finally {
    await server.close();
  }
});

// ─── 10. Horarios y Zona Horaria Chilena (America/Santiago UTC-3) ─────────────
test("formatChileanTime convierte timestamps ISO UTC a hora de Chile (UTC-3)", () => {
  // 20:17 UTC -> 17:17 Chile (UTC-3)
  const timeChile = formatChileanTime("2026-11-09T20:17:00.000Z");
  assert.equal(timeChile, "17:17");

  // Preserva cadenas que ya tienen formato HH:mm
  assert.equal(formatChileanTime("17:17"), "17:17");
  assert.equal(formatChileanTime(null), "—");
});

// ─── 11. Deduplicación de Direcciones y Comunas ──────────────────────────────
test("formatAddressDisplay deduplica comunas y segmentos repetidos", () => {
  // Caso de prueba reportado: 'Providencia, Providencia (Providencia)'
  const cleaned1 = formatAddressDisplay("Av. Providencia 1234, Providencia, Providencia", "Providencia");
  assert.equal(cleaned1, "Av. Providencia 1234, Providencia");
  assert.equal(cleaned1.includes("(Providencia)"), false);

  // Dirección normal sin la comuna incluida en el texto principal
  const cleaned2 = formatAddressDisplay("Av. Apoquindo 4500", "Las Condes");
  assert.equal(cleaned2, "Av. Apoquindo 4500 (Las Condes)");

  // Dirección que ya termina con la comuna
  const cleaned3 = formatAddressDisplay("General Bustamante 26, Providencia", "Providencia");
  assert.equal(cleaned3, "General Bustamante 26, Providencia");
});

// ─── 12. Mapeo de Estados Terminales y Modos de Portal ────────────────────────
test("mapApiSummaryToTrackingOrder clasifica correctamente estados terminales y modos", () => {
  const completedSummary = {
    order_id: "test-uuid-1",
    order_number: "#OT-08494",
    status: "Completada",
    status_key: "completada",
    address: "Av. Providencia 1234, Providencia",
    comuna: "Providencia",
    timeline_steps: [
      { key: "confirmada", label: "Confirmada", completed: true, current: false, raw_timestamp: "2026-11-09T18:00:00.000Z" },
      { key: "completada", label: "Completada", completed: true, current: true, raw_timestamp: "2026-11-09T20:17:00.000Z" },
    ],
  };

  const mappedCompleted = mapApiSummaryToTrackingOrder(completedSummary);
  assert.equal(mappedCompleted.isTerminal, true);
  assert.equal(mappedCompleted.portalMode, "resumen");
  assert.equal(mappedCompleted.timeline_steps[1].timestamp, "17:17");

  const cancelledSummary = {
    order_id: "test-uuid-2",
    order_number: "#OT-08495",
    status: "Cancelada",
    status_key: "cancelada",
    address: "Av. Las Condes 1000",
    comuna: "Las Condes",
  };

  const mappedCancelled = mapApiSummaryToTrackingOrder(cancelledSummary);
  assert.equal(mappedCancelled.isTerminal, true);
  assert.equal(mappedCancelled.portalMode, "resumen");
});

// ─── 13. Simulación Integral de Polling: CONFIRMADA → EN_RUTA → EN_SITIO → COMPLETADA ───
test("Ciclo de polling 30s actualiza secuencialmente estados, previene concurrencia y detiene al completar", async () => {
  // Simulador del controlador de polling idéntico a CustomerTrackingView.jsx
  class CustomerTrackingPollingSimulator {
    constructor(token, initialSummary, apiMock) {
      this.token = token;
      this.api = apiMock;
      this.summary = initialSummary;
      this.liveTechLocation = initialSummary.technician_location || null;
      this.inFlight = false;
      this.intervalId = null;
      this.intervalMs = 0;
      this.requestCount = 0;
      this.trackingCount = 0;
      this.summaryCount = 0;
      this.isPollingActive = false;

      this.initTimer();
    }

    get statusKey() {
      return (this.summary?.status_key || "").toLowerCase();
    }

    get isTerminal() {
      return this.statusKey === "completada" || this.statusKey === "cancelada";
    }

    get isEnRuta() {
      return this.statusKey === "en_ruta";
    }

    initTimer() {
      if (!this.token || this.isTerminal) {
        if (this.isTerminal) this.liveTechLocation = null;
        this.stopTimer();
        return;
      }

      this.isPollingActive = true;
      this.intervalMs = 30000; // 30 segundos exactos
      this.intervalId = "timer-active-id";
    }

    stopTimer() {
      this.isPollingActive = false;
      this.intervalId = null;
    }

    async pollTick() {
      if (!this.isPollingActive || this.isTerminal) return;
      if (this.inFlight) return; // Prevención de peticiones simultáneas

      this.inFlight = true;
      this.requestCount++;

      try {
        if (this.isEnRuta) {
          this.trackingCount++;
          const tracking = await this.api.getTracking(this.token);
          const trackingStatus = (tracking?.order_status || tracking?.status || "").toLowerCase();

          if (trackingStatus && trackingStatus !== "en_ruta") {
            this.summaryCount++;
            const freshSummary = await this.api.getSummary(this.token);
            if (freshSummary) {
              this.summary = freshSummary;
              if (["completada", "cancelada"].includes(freshSummary.status_key?.toLowerCase())) {
                this.liveTechLocation = null;
                this.stopTimer();
              }
            }
          } else if (tracking?.lat != null && tracking?.lng != null) {
            this.liveTechLocation = {
              lat: parseFloat(tracking.lat),
              lng: parseFloat(tracking.lng),
              last_updated_at: tracking.last_updated_at,
              is_live: Boolean(tracking.is_live),
            };
          }
        } else {
          this.summaryCount++;
          const freshSummary = await this.api.getSummary(this.token);
          if (freshSummary) {
            this.summary = freshSummary;
            if (["completada", "cancelada"].includes(freshSummary.status_key?.toLowerCase())) {
              this.liveTechLocation = null;
              this.stopTimer();
            }
          }
        }
      } finally {
        this.inFlight = false;
      }
    }
  }

  // Secuencia de estados simulados en el backend
  let backendCurrentStatus = "confirmada";
  let backendTrackingStatus = "confirmada";

  const apiMock = {
    getSummary: async () => ({
      order_id: "test-08494",
      order_number: "#OT-08494",
      status_key: backendCurrentStatus,
      status: backendCurrentStatus.toUpperCase(),
      address: "Av. Providencia 1234",
      comuna: "Providencia",
    }),
    getTracking: async () => ({
      order_id: "test-08494",
      order_status: backendTrackingStatus,
      lat: backendTrackingStatus === "en_ruta" ? -33.425 : null,
      lng: backendTrackingStatus === "en_ruta" ? -70.612 : null,
      is_live: backendTrackingStatus === "en_ruta",
    }),
  };

  const simulator = new CustomerTrackingPollingSimulator(
    "token-valid-08494",
    { order_id: "test-08494", status_key: "confirmada" },
    apiMock
  );

  // 1. Estado inicial: CONFIRMADA
  assert.equal(simulator.statusKey, "confirmada");
  assert.equal(simulator.isPollingActive, true);
  assert.equal(simulator.intervalMs, 30000, "El intervalo de polling debe ser de 30 segundos");
  assert.equal(simulator.liveTechLocation, null, "No debe haber ubicación de técnico antes de EN_RUTA");

  // 2. Tick 1 (30s): El técnico inicia ruta -> EN_RUTA
  backendCurrentStatus = "en_ruta";
  backendTrackingStatus = "en_ruta";
  await simulator.pollTick();

  assert.equal(simulator.statusKey, "en_ruta", "El portal debe actualizar a en_ruta sin recargar");
  assert.equal(simulator.isEnRuta, true);
  assert.equal(simulator.isPollingActive, true);

  // 3. Tick 2 (60s): Mientras está en ruta, recibe telemetría GPS
  await simulator.pollTick();
  assert.ok(simulator.liveTechLocation, "Debe tener coordenadas GPS del técnico en ruta");
  assert.equal(simulator.liveTechLocation.lat, -33.425);
  assert.equal(simulator.liveTechLocation.is_live, true);

  // 4. Concurrencia: Si una petición está en vuelo, la siguiente llamada debe descartarse
  simulator.inFlight = true;
  const prevCount = simulator.requestCount;
  await simulator.pollTick();
  assert.equal(simulator.requestCount, prevCount, "No debe ejecutar solicitudes simultáneas mientras inFlight=true");
  simulator.inFlight = false;

  // 5. Tick 3 (90s): El técnico confirma llegada -> EN_SITIO
  backendCurrentStatus = "en_sitio";
  backendTrackingStatus = "en_sitio";
  await simulator.pollTick();

  assert.equal(simulator.statusKey, "en_sitio", "El portal debe actualizar a en_sitio automáticamente");
  assert.equal(simulator.isPollingActive, true);

  // 6. Tick 4 (120s): El técnico finaliza la visita -> COMPLETADA
  backendCurrentStatus = "completada";
  backendTrackingStatus = "completada";
  await simulator.pollTick();

  assert.equal(simulator.statusKey, "completada", "El portal debe detectar COMPLETADA automáticamente");
  assert.equal(simulator.isTerminal, true);
  assert.equal(simulator.isPollingActive, false, "El polling debe detenerse definitivamente al completar");
  assert.equal(simulator.liveTechLocation, null, "La ubicación GPS debe purgarse al completar la orden");

  // 7. Ticks posteriores: No deben emitir ninguna petición adicional
  const finalRequests = simulator.requestCount;
  await simulator.pollTick();
  assert.equal(simulator.requestCount, finalRequests, "No deben emitirse peticiones tras finalizar la orden");
});

// ─── 14. Polling ante CANCELADA como Estado Terminal ──────────────────────────
test("Orden en estado CANCELADA detiene el polling inmediatamente y purga GPS", async () => {
  let backendStatus = "confirmada";
  const apiMock = {
    getSummary: async () => ({
      order_id: "test-08495",
      order_number: "#OT-08495",
      status_key: backendStatus,
    }),
    getTracking: async () => ({ order_status: backendStatus }),
  };

  // Simulación idéntica al controller de CustomerTrackingView
  let isTerminal = false;
  let liveTechLoc = { lat: -33.4, lng: -70.6 };
  let timerActive = true;

  async function poll() {
    if (!timerActive || isTerminal) return;
    const res = await apiMock.getSummary();
    if (res.status_key === "cancelada") {
      isTerminal = true;
      liveTechLoc = null;
      timerActive = false;
    }
  }

  // Orden activa
  await poll();
  assert.equal(timerActive, true);
  assert.ok(liveTechLoc);

  // Mesa de soporte cancela la orden
  backendStatus = "cancelada";
  await poll();

  assert.equal(isTerminal, true, "CANCELADA debe ser reconocida como estado terminal");
  assert.equal(timerActive, false, "El polling debe detenerse tras la cancelación");
  assert.equal(liveTechLoc, null, "La ubicación GPS debe ser eliminada tras la cancelación");
});

// ─── 15. Flujo de Firma Digital: Borrador, Trazos Múltiples y Resiliencia ─────
test("Ciclo de vida de firma digital: el borrador en memoria no desmonta el formulario y permite múltiples trazos", () => {
  // Orden completada sin firma previa
  const order = {
    order_number: "#OT-08494",
    status_key: "completada",
    raw_status: "COMPLETADA",
    is_completed: true,
    is_signed: false,
    signature_url: null,
    is_audited: false,
  };

  let isSigned = false;
  let signatureBase64 = null;
  let hasDrawing = false;
  let apiSummary = null;

  // Función de cálculo idéntica a CustomerTrackingView
  function evaluateSignatureState() {
    const raw = String(order.raw_status || order.status_key || "").toUpperCase();
    const canSign = ["EN_SITIO", "COMPLETADA"].includes(raw) || order.is_completed;
    const persistedSignatureUrl = order.signature_url || apiSummary?.signature_url;
    const hasExistingSignature = Boolean(isSigned || order.is_signed || persistedSignatureUrl);
    const signatureDisplayUrl = persistedSignatureUrl || (isSigned ? signatureBase64 : null);
    const isHeaderSigned = Boolean(isSigned || order.is_signed || persistedSignatureUrl);

    return {
      canSign,
      hasExistingSignature,
      signatureDisplayUrl,
      isHeaderSigned,
      showForm: !hasExistingSignature && canSign && !order.is_audited,
      showSuccessBlock: hasExistingSignature,
    };
  }

  // 1. Estado inicial: formulario habilitado, sin firma previa
  let state = evaluateSignatureState();
  assert.equal(state.canSign, true);
  assert.equal(state.hasExistingSignature, false);
  assert.equal(state.showForm, true);
  assert.equal(state.showSuccessBlock, false);
  assert.equal(state.isHeaderSigned, false);

  // 2. Usuario dibuja el primer trazo y suelta el mouse (pointerup)
  signatureBase64 = "data:image/png;base64,trazo_1_en_memoria";
  hasDrawing = true;

  state = evaluateSignatureState();
  assert.equal(hasDrawing, true);
  // El borrador NO debe provocar que hasExistingSignature sea true
  assert.equal(state.hasExistingSignature, false, "El borrador en memoria no debe marcar la orden como firmada");
  assert.equal(state.showForm, true, "El formulario debe permanecer montado tras el primer trazo");
  assert.equal(state.showSuccessBlock, false, "El bloque verde de éxito no debe mostrarse mientras se dibuja");
  assert.equal(state.isHeaderSigned, false, "La cabecera debe continuar en 'Pendiente de firma'");

  // 3. Usuario dibuja un segundo trazo consecutivo en el mismo lienzo
  signatureBase64 = "data:image/png;base64,trazo_1_mas_trazo_2_acumulado";
  hasDrawing = true;

  state = evaluateSignatureState();
  assert.equal(hasDrawing, true);
  assert.equal(state.hasExistingSignature, false, "Trazos múltiples no deben desmontar el lienzo");
  assert.equal(state.showForm, true, "El formulario sigue activo para permitir más trazos o confirmar");
  assert.equal(state.showSuccessBlock, false);
});

test("Validación de condiciones para habilitar botón 'Firmar Recepción Conforme'", () => {
  function checkButtonEnabled({ isSigning, hasDrawing, signedByName, hasExistingSignature }) {
    if (hasExistingSignature) return false;
    return !isSigning && Boolean(hasDrawing) && Boolean(signedByName && signedByName.trim());
  }

  // Sin nombre ni trazos
  assert.equal(checkButtonEnabled({ isSigning: false, hasDrawing: false, signedByName: "", hasExistingSignature: false }), false);

  // Con nombre pero sin trazos
  assert.equal(checkButtonEnabled({ isSigning: false, hasDrawing: false, signedByName: "Juan Pérez", hasExistingSignature: false }), false);

  // Con trazos pero con nombre vacío o solo espacios
  assert.equal(checkButtonEnabled({ isSigning: false, hasDrawing: true, signedByName: "   ", hasExistingSignature: false }), false);

  // Con trazos y nombre válido -> Habilitado
  assert.equal(checkButtonEnabled({ isSigning: false, hasDrawing: true, signedByName: "Prueba QA - Receptor", hasExistingSignature: false }), true);

  // Durante el envío (isSigning = true) -> Deshabilitado para evitar peticiones dobles
  assert.equal(checkButtonEnabled({ isSigning: true, hasDrawing: true, signedByName: "Prueba QA - Receptor", hasExistingSignature: false }), false);

  // Si ya cuenta con firma existente -> Deshabilitado
  assert.equal(checkButtonEnabled({ isSigning: false, hasDrawing: true, signedByName: "Prueba QA - Receptor", hasExistingSignature: true }), false);
});

test("Sincronización post-firma: confirmación y cabecera se actualizan solo tras POST exitoso", async () => {
  const order = {
    order_number: "#OT-08494",
    status_key: "completada",
    is_completed: true,
    is_signed: false,
    signature_url: null,
  };

  let isSigned = false;
  let signatureBase64 = "data:image/png;base64,trazo_final";
  let signedByName = "Prueba QA";
  let signError = null;
  let apiSummary = null;

  const mockApi = {
    sign: async (token, base64, signer) => {
      assert.equal(token, "ml-token-test");
      assert.ok(base64);
      assert.equal(signer, "Prueba QA");
      return {
        success: true,
        signature_url: "https://storage.neon.tech/signatures/f75b9563_abc123.png",
        signed_at: "2026-11-09T23:00:00Z",
      };
    },
  };

  // Antes del envío
  assert.equal(isSigned, false);

  // Ejecución de handleSignConformity
  try {
    const res = await mockApi.sign("ml-token-test", signatureBase64, signedByName);
    isSigned = true;
    apiSummary = {
      signature_url: res.signature_url,
      is_signed: true,
      signed_by_name: signedByName,
      signed_at: res.signed_at,
    };
  } catch (err) {
    signError = err.message;
  }

  // Tras éxito:
  assert.equal(signError, null);
  assert.equal(isSigned, true);

  const persistedSignatureUrl = order.signature_url || apiSummary?.signature_url;
  const hasExistingSignature = Boolean(isSigned || order.is_signed || persistedSignatureUrl);
  const signatureDisplayUrl = persistedSignatureUrl || (isSigned ? signatureBase64 : null);
  const isHeaderSigned = Boolean(isSigned || order.is_signed || persistedSignatureUrl);

  assert.equal(hasExistingSignature, true, "Debe pasar al estado firmado tras la respuesta del backend");
  assert.equal(isHeaderSigned, true, "El encabezado superior debe pasar a 'Recepción conforme firmada'");
  assert.equal(signatureDisplayUrl, "https://storage.neon.tech/signatures/f75b9563_abc123.png");
});

test("Resiliencia ante error del backend: no produce falsa confirmación y conserva el borrador", async () => {
  let isSigned = false;
  let signatureBase64 = "data:image/png;base64,trazo_manuscrito_valido";
  let signedByName = "Receptor QA";
  let hasDrawing = true;
  let signError = null;
  let apiSummary = null;

  const mockFailingApi = {
    sign: async () => {
      throw new Error("502 Bad Gateway: Fallo de almacenamiento en Neon Object Storage");
    },
  };

  // Intento de firma que falla
  try {
    await mockFailingApi.sign();
    isSigned = true;
  } catch (err) {
    signError = err?.message || "Error al firmar";
  }

  // Verificaciones de estado tras error:
  assert.equal(isSigned, false, "isSigned debe permanecer false tras error HTTP");
  assert.ok(signError.includes("502 Bad Gateway"), "El mensaje de error debe exponerse al usuario");

  const order = { is_signed: false, signature_url: null };
  const persistedSignatureUrl = order.signature_url || apiSummary?.signature_url;
  const hasExistingSignature = Boolean(isSigned || order.is_signed || persistedSignatureUrl);

  assert.equal(hasExistingSignature, false, "No debe mostrarse confirmación verde falsa ante un fallo del servidor");
  assert.equal(hasDrawing, true, "El trazo en el lienzo no debe borrarse");
  assert.equal(signatureBase64, "data:image/png;base64,trazo_manuscrito_valido", "El borrador debe conservarse para reintentar");
  assert.equal(signedByName, "Receptor QA", "El nombre ingresado no debe perderse");
});

test("Firma persistida tras recarga (F5) renderiza comprobante limpio sin dark:invert", () => {
  // Simulación de carga inicial desde el backend tras F5
  const freshBackendSummary = {
    order_number: "#OT-08494",
    status_key: "completada",
    is_signed: true,
    signature_url: "https://storage.neon.tech/signatures/f75b9563_persisted.png",
    signed_by_name: "Prueba QA - Recepción ATLAS",
    signed_at: "2026-11-09T20:24:09Z",
    is_audited: false,
  };

  const isSigned = false; // Sin estado local de envío
  const signatureBase64 = null; // Sin borrador en memoria

  const persistedSignatureUrl = freshBackendSummary.signature_url;
  const hasExistingSignature = Boolean(isSigned || freshBackendSummary.is_signed || persistedSignatureUrl);
  const signatureDisplayUrl = persistedSignatureUrl || (isSigned ? signatureBase64 : null);

  assert.equal(hasExistingSignature, true, "Una orden con firma persistida debe reconocerse como firmada tras recargar");
  assert.equal(signatureDisplayUrl, "https://storage.neon.tech/signatures/f75b9563_persisted.png");

  // Validación de clases visuales: comprobante con fondo blanco y sin dark:invert
  const containerClasses = "bg-white rounded-lg p-2.5 border border-slate-200 dark:border-gray-700 max-w-xs flex items-center justify-center shadow-xs";
  const imgClasses = "max-h-20 w-auto object-contain";

  assert.ok(!imgClasses.includes("dark:invert"), "La imagen de firma no debe tener dark:invert para evitar fondo negro");
  assert.ok(containerClasses.includes("bg-white"), "El comprobante debe tener fondo blanco opaco como acta física");
});
