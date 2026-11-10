import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

import {
  parseDateSafe,
  formatChileanTime,
  formatCompletedDateDisplay,
} from "../lib/magicLinksData.js";
import { getOrderAuditPackage } from "../lib/auditAndHardwareData.js";

// Helper para instanciar Vite SSR y cargar módulos JSX en entorno Node
async function loadMagicLinksModules() {
  const { createServer } = await import("vite");
  const server = await createServer({
    root: path.resolve(__dirname, "../../"),
    server: { middlewareMode: true, hmr: false },
  });
  const React = (await import("react")).default;
  const { renderToString } = await import("react-dom/server");
  const { SignatureStatusBadge } = await server.ssrLoadModule("/src/pages/MagicLinks.jsx");

  return { server, React, renderToString, SignatureStatusBadge };
}

// ─── 1. Indicador Visual de Firma en Tabla de Magic Links (CAMBIO 1) ──────────

test("SignatureStatusBadge renderiza 'Firmada' en verde cuando existe firma persistida", async () => {
  const { server, React, renderToString, SignatureStatusBadge } = await loadMagicLinksModules();
  try {
    const html = renderToString(
      React.createElement(SignatureStatusBadge, {
        hasSignature: true,
        orderStatus: "COMPLETADA",
      })
    );

    assert.ok(html.includes("Firmada"), "Debe mostrar el texto 'Firmada'");
    assert.ok(html.includes("bg-emerald-500/15"), "Debe incluir estilo verde de fondo esmeralda");
    assert.ok(html.includes("text-emerald-600"), "Debe incluir texto verde esmeralda");
  } finally {
    await server.close();
  }
});

test("SignatureStatusBadge renderiza 'Firmada' en verde incluso en estados intermedios si el backend confirma firma", async () => {
  const { server, React, renderToString, SignatureStatusBadge } = await loadMagicLinksModules();
  try {
    const html = renderToString(
      React.createElement(SignatureStatusBadge, {
        hasSignature: true,
        orderStatus: "EN_SITIO",
      })
    );

    assert.ok(html.includes("Firmada"));
    assert.ok(html.includes("bg-emerald-500/15"));
  } finally {
    await server.close();
  }
});

test("SignatureStatusBadge renderiza 'Pendiente de firma' en amarillo cuando está COMPLETADA y sin firma", async () => {
  const { server, React, renderToString, SignatureStatusBadge } = await loadMagicLinksModules();
  try {
    const html = renderToString(
      React.createElement(SignatureStatusBadge, {
        hasSignature: false,
        orderStatus: "COMPLETADA",
      })
    );

    assert.ok(html.includes("Pendiente de firma"), "Debe mostrar 'Pendiente de firma'");
    assert.ok(html.includes("bg-amber-500/15"), "Debe incluir estilo amarillo/ámbar de fondo");
    assert.ok(html.includes("text-amber-600"), "Debe incluir texto amarillo/ámbar");
  } finally {
    await server.close();
  }
});

test("SignatureStatusBadge renderiza 'Pendiente de firma' en amarillo cuando está EN_SITIO y sin firma", async () => {
  const { server, React, renderToString, SignatureStatusBadge } = await loadMagicLinksModules();
  try {
    const html = renderToString(
      React.createElement(SignatureStatusBadge, {
        hasSignature: false,
        orderStatus: "EN_SITIO",
      })
    );

    assert.ok(html.includes("Pendiente de firma"), "Debe mostrar 'Pendiente de firma'");
    assert.ok(html.includes("bg-amber-500/15"), "Debe incluir estilo amarillo/ámbar de fondo");
    assert.ok(html.includes("text-amber-600"), "Debe incluir texto amarillo/ámbar");
  } finally {
    await server.close();
  }
});

test("SignatureStatusBadge renderiza 'Firma no disponible' en estados anteriores (CONFIRMADA, EN_RUTA, IDLE, CANCELADA)", async () => {
  const { server, React, renderToString, SignatureStatusBadge } = await loadMagicLinksModules();
  try {
    const priorStatuses = ["CONFIRMADA", "EN_RUTA", "IDLE", "CANCELADA", "DESCONOCIDO"];

    for (const st of priorStatuses) {
      const html = renderToString(
        React.createElement(SignatureStatusBadge, {
          hasSignature: false,
          orderStatus: st,
        })
      );

      assert.ok(
        html.includes("Firma no disponible"),
        `Para estado ${st} sin firma debe mostrar 'Firma no disponible'`
      );
      assert.ok(
        html.includes("text-slate-400"),
        `Para estado ${st} debe usar color sutil neutro`
      );
    }
  } finally {
    await server.close();
  }
});

// ─── 2. Contrato de Persistencia del Backend para Magic Links ────────────────

test("El mapeo de MagicLinks clasifica hasSignature=true a partir de datos del backend", () => {
  function mapOrderRow(o) {
    const detail = o.magic_link_detail || null;
    const hasSignature = Boolean(
      o.has_signature ||
      detail?.has_signature ||
      o.is_signed ||
      o.signature_url ||
      detail?.signature_url
    );
    return {
      orderId: o.id,
      hasSignature,
      orderStatus: o.status,
    };
  }

  // Caso A: Con has_signature confirmado por backend
  const rowA = mapOrderRow({
    id: "ord-1",
    status: "COMPLETADA",
    has_signature: true,
    magic_link_detail: { has_signature: true },
  });
  assert.equal(rowA.hasSignature, true);

  // Caso B: Con signature_url persistida
  const rowB = mapOrderRow({
    id: "ord-2",
    status: "EN_SITIO",
    signature_url: "https://storage.neon.tech/signatures/sig-123.png",
  });
  assert.equal(rowB.hasSignature, true);

  // Caso C: Completada sin firma persistida
  const rowC = mapOrderRow({
    id: "ord-3",
    status: "COMPLETADA",
    has_signature: false,
    signature_url: null,
    magic_link_detail: { has_signature: false, signature_url: null },
  });
  assert.equal(rowC.hasSignature, false);

  // Caso D: Borrador local no influye (si backend tiene has_signature=false)
  const rowD = mapOrderRow({
    id: "ord-4",
    status: "COMPLETADA",
    has_signature: false,
    signature_url: null,
  });
  assert.equal(rowD.hasSignature, false, "Trazos en borrador local no deben marcar la orden como firmada");
});

// ─── 3. Horarios y Zona Horaria America/Santiago (CAMBIO 3) ──────────────────

test("parseDateSafe interpreta cadenas UTC con 'Z' y normaliza cadenas naive asumiendo UTC", () => {
  // Cadena ISO con 'Z'
  const dWithZ = parseDateSafe("2026-11-09T23:17:00Z");
  assert.ok(dWithZ instanceof Date);
  assert.equal(dWithZ.getUTCHours(), 23);
  assert.equal(dWithZ.getUTCMinutes(), 17);

  // Cadena ISO naive (sin Z) devuelta por backend desde la base de datos
  const dNaive = parseDateSafe("2026-11-09T23:17:00");
  assert.ok(dNaive instanceof Date);
  assert.equal(dNaive.getUTCHours(), 23, "Debe asumir UTC para cadenas ISO sin zona horaria");
  assert.equal(dNaive.getUTCMinutes(), 17);

  // Instancia Date existente
  const existingDate = new Date("2026-11-09T20:17:00Z");
  assert.equal(parseDateSafe(existingDate), existingDate);

  // Casos nulos o vacíos
  assert.equal(parseDateSafe(null), null);
  assert.equal(parseDateSafe(undefined), null);
  assert.equal(parseDateSafe(""), null);
});

test("formatCompletedDateDisplay formatea timestamp #OT-08494 a las 20:17 hrs en America/Santiago (Verano UTC-3)", () => {
  // Timestamp UTC de la firma de #OT-08494 en verano chileno (Noviembre: UTC-3)
  // 23:17 UTC = 20:17 Santiago (09 de nov)
  const formattedWithZ = formatCompletedDateDisplay("2026-11-09T23:17:00Z");
  assert.equal(formattedWithZ, "20:17 hrs (09-nov)");

  const formattedNaive = formatCompletedDateDisplay("2026-11-09T23:17:00");
  assert.equal(formattedNaive, "20:17 hrs (09-nov)");
});

test("formatCompletedDateDisplay respeta el horario de invierno en America/Santiago (Invierno UTC-4)", () => {
  // Timestamp UTC en invierno chileno (Julio: UTC-4)
  // 23:17 UTC = 19:17 Santiago (09 de jul)
  const formattedWinterWithZ = formatCompletedDateDisplay("2026-07-09T23:17:00Z");
  assert.equal(formattedWinterWithZ, "19:17 hrs (09-jul)");

  const formattedWinterNaive = formatCompletedDateDisplay("2026-07-09T23:17:00");
  assert.equal(formattedWinterNaive, "19:17 hrs (09-jul)");
});

test("formatChileanTime convierte timestamps ISO UTC a hora local de Santiago", () => {
  // 23:17 UTC -> 20:17 en verano (Noviembre)
  assert.equal(formatChileanTime("2026-11-09T23:17:00Z"), "20:17");
  assert.equal(formatChileanTime("2026-11-09T23:17:00"), "20:17");

  // Hora ya formateada HH:MM se conserva
  assert.equal(formatChileanTime("20:17"), "20:17");
  assert.equal(formatChileanTime(null), "—");
});

// ─── 4. Trazabilidad en Work Orders y Auditoría (CAMBIO 2) ───────────────────

test("getOrderAuditPackage clasifica chk-sign como 'Firmada' y passed=true cuando existe firma persistida", () => {
  const order = {
    id: "ord-test-sign",
    order_number: "#OT-08494",
    status: "COMPLETADA",
  };
  const apiDetail = {
    signature_url: "https://storage.neon.tech/signatures/f75b9563.png",
    signed_at: "2026-11-09T23:17:00Z",
    has_signature: true,
  };
  const evidences = [
    {
      id: "ev-sign-1",
      evidence_type: "FIRMA_CLIENTE",
      storage_url: "https://storage.neon.tech/signatures/f75b9563.png",
      captured_at: "2026-11-09T23:17:00Z",
    },
  ];

  const auditData = getOrderAuditPackage(order, {}, apiDetail, { apiEvidences: evidences });
  const chkSign = auditData.checklist.find((c) => c.id === "chk-sign");

  assert.ok(chkSign, "Debe existir checklist item chk-sign");
  assert.equal(chkSign.metric, "Firmada");
  assert.equal(chkSign.passed, true);
  assert.equal(auditData.conformity.isSigned, true);
  assert.ok(auditData.conformity.signedAt.includes("20:17"), "La hora de firma debe convertirse a 20:17 hrs Santiago");
});

test("getOrderAuditPackage clasifica chk-sign como 'Pendiente' y passed=false cuando no hay firma", () => {
  const order = {
    id: "ord-test-unsigned",
    order_number: "#OT-08495",
    status: "COMPLETADA",
  };
  const apiDetail = {
    signature_url: null,
    signed_at: null,
    has_signature: false,
  };

  const auditData = getOrderAuditPackage(order, {}, apiDetail, { apiEvidences: [] });
  const chkSign = auditData.checklist.find((c) => c.id === "chk-sign");

  assert.ok(chkSign);
  assert.equal(chkSign.metric, "Pendiente");
  assert.equal(chkSign.passed, false);
  assert.equal(auditData.conformity.isSigned, false);
  assert.equal(auditData.conformity.signedAt, "Pendiente de firma");
});
