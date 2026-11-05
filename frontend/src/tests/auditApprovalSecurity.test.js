import test from "node:test";
import assert from "node:assert/strict";

import { getOrderAuditPackage } from "../lib/auditAndHardwareData.js";
import { normalizeOrderItem } from "../lib/workOrderOptions.js";

// ─── 1. P1: Seguridad de Magic Links en el detalle de la orden ──────────────
test("getOrderAuditPackage no expone tokens criptográficos secretos en tokenHash", () => {
  const secretToken = "super_secret_32_byte_cryptographic_token_abcd1234efgh5678";
  const order = {
    id: "10202a6a-80da-40b8-ad99-809238dc83aa",
    order_number: "#OT-08492",
    status: "COMPLETADA",
    active_magic_link_token: secretToken,
  };
  const apiDetail = {
    id: "10202a6a-80da-40b8-ad99-809238dc83aa",
    order_number: "#OT-08492",
    active_magic_link_token: secretToken,
    evidences: [],
  };

  const auditDataUnsigned = getOrderAuditPackage(order, {}, apiDetail, {
    hardwareInventory: [],
    apiEvidences: [],
    isAudited: false,
  });

  // Sin firma: debe mostrar PENDIENTE y nunca el token secreto
  assert.equal(auditDataUnsigned.conformity.tokenHash, "PENDIENTE");
  assert.notEqual(auditDataUnsigned.conformity.tokenHash, secretToken);

  // Con firma: debe mostrar el identificador público ACTA-OT-08492 y nunca el token secreto
  const signedEvidences = [
    {
      id: "ev-firma-1",
      evidence_type: "FIRMA_CLIENTE",
      storage_url: "https://storage.neon.tech/firma.png",
      notes: "Receptor Prueba ATLAS",
    },
  ];
  const auditDataSigned = getOrderAuditPackage(order, {}, apiDetail, {
    hardwareInventory: [],
    apiEvidences: signedEvidences,
    isAudited: false,
  });

  assert.equal(auditDataSigned.conformity.tokenHash, "ACTA-OT-08492");
  assert.notEqual(auditDataSigned.conformity.tokenHash, secretToken);
  assert.equal(auditDataSigned.conformity.isSigned, true);
});

// ─── 2. P2 / P4: Persistencia y visualización de auditoría administrativa ─────
test("getOrderAuditPackage preserva el estado de auditoría persistido desde el backend", () => {
  const order = {
    id: "10202a6a-80da-40b8-ad99-809238dc83aa",
    order_number: "#OT-08492",
    status: "COMPLETADA",
    is_audited: true,
    audited_at: "2026-11-04T22:30:00Z",
    audited_by_user_id: "user-uuid-1",
    auditor: {
      id: "user-uuid-1",
      full_name: "Constanza Coordinadora",
      email: "coordinador@atlasfsm.cl",
      role: "COORDINADOR",
    },
    audit_notes: "Cierre técnico y actas de conformidad validadas.",
  };

  const auditData = getOrderAuditPackage(order, {}, null, {
    hardwareInventory: [],
    apiEvidences: [],
    isAudited: false,
  });

  assert.equal(auditData.auditStatus.isAudited, true);
  assert.equal(auditData.auditStatus.auditorName, "Constanza Coordinadora");
  assert.equal(auditData.auditStatus.auditNotes, "Cierre técnico y actas de conformidad validadas.");
  assert.ok(auditData.auditStatus.auditedAtText.includes("2026") || auditData.auditStatus.auditedAtText.includes(":"));
});

// ─── 3. P3: Detección de evidencias obligatorias (FOTO_DESPUES y FIRMA_CLIENTE)
test("getOrderAuditPackage clasifica hasPhotoAfter y hasSignature según evidencias reales", () => {
  const order = {
    id: "10202a6a-80da-40b8-ad99-809238dc83aa",
    order_number: "#OT-08492",
    status: "COMPLETADA",
  };

  // Sin evidencias
  const emptyAudit = getOrderAuditPackage(order, {}, null, {
    hardwareInventory: [],
    apiEvidences: [],
    isAudited: false,
  });
  assert.equal(emptyAudit.hasPhotoAfter, false);
  assert.equal(emptyAudit.hasSignature, false);

  // Con solo foto
  const photoOnlyAudit = getOrderAuditPackage(order, {}, null, {
    hardwareInventory: [],
    apiEvidences: [
      { id: "ev-1", evidence_type: "FOTO_DESPUES", storage_url: "https://storage/foto.jpg" },
    ],
    isAudited: false,
  });
  assert.equal(photoOnlyAudit.hasPhotoAfter, true);
  assert.equal(photoOnlyAudit.hasSignature, false);

  // Con foto y firma
  const fullAudit = getOrderAuditPackage(order, {}, null, {
    hardwareInventory: [],
    apiEvidences: [
      { id: "ev-1", evidence_type: "FOTO_DESPUES", storage_url: "https://storage/foto.jpg" },
      { id: "ev-2", evidence_type: "FIRMA_CLIENTE", storage_url: "https://storage/firma.png" },
    ],
    isAudited: false,
  });
  assert.equal(fullAudit.hasPhotoAfter, true);
  assert.equal(fullAudit.hasSignature, true);
});

// ─── 4. normalizeOrderItem preserva campos de auditoría ─────────────────────
test("normalizeOrderItem mapea is_audited, audited_at y auditor", () => {
  const rawApiOrder = {
    id: "10202a6a-80da-40b8-ad99-809238dc83aa",
    order_number: "#OT-08492",
    title: "Instalación Router",
    status: "COMPLETADA",
    is_audited: true,
    audited_at: "2026-11-04T22:30:00Z",
    audited_by_user_id: "u-123",
    auditor: { full_name: "Constanza Coordinadora" },
    audit_notes: "Notas OK",
  };

  const norm = normalizeOrderItem(rawApiOrder);
  assert.equal(norm.is_audited, true);
  assert.equal(norm.audited_at, "2026-11-04T22:30:00Z");
  assert.equal(norm.auditor?.full_name, "Constanza Coordinadora");
  assert.equal(norm.audit_notes, "Notas OK");
});
