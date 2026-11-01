import test from "node:test";
import assert from "node:assert/strict";

// Substring identificador del píxel dummy transparente
const DISALLOWED_SIGNATURE_SUBSTRINGS = [
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAAB",
  "AAAAEAAAABCAYAAAAfFcSJ",
];

// Helper de validación de firma en frontend antes del envío
function validateSignatureSubmission(signedByName, signatureBase64, hasDrawing) {
  const name = (signedByName || "").trim();
  if (!name) {
    return { valid: false, error: "El nombre del receptor es obligatorio." };
  }

  if (!hasDrawing || !signatureBase64) {
    return { valid: false, error: "Debe dibujar su firma antes de enviar la conformidad." };
  }

  for (const marker of DISALLOWED_SIGNATURE_SUBSTRINGS) {
    if (signatureBase64.includes(marker)) {
      return {
        valid: false,
        error: "Firma inválida: se detectó un píxel de prueba transparente o simulado.",
      };
    }
  }

  if (!signatureBase64.startsWith("data:image/png;base64,")) {
    return { valid: false, error: "Formato no válido. Debe ser PNG codificado en base64." };
  }

  return { valid: true, error: null };
}

test("validateSignatureSubmission rechaza cuando el nombre está vacío", () => {
  const dummySignature = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAKAAAABaCAYAAAA...";
  const res = validateSignatureSubmission("", dummySignature, true);
  assert.equal(res.valid, false);
  assert.match(res.error, /nombre/i);
});

test("validateSignatureSubmission rechaza cuando el canvas está vacío (hasDrawing = false)", () => {
  const res = validateSignatureSubmission("Juan Perez", null, false);
  assert.equal(res.valid, false);
  assert.match(res.error, /dibujar su firma/i);
});

test("validateSignatureSubmission rechaza explícitamente el píxel transparente dummy", () => {
  const dummy1x1 =
    "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";
  const res = validateSignatureSubmission("Cliente Receptor", dummy1x1, true);
  assert.equal(res.valid, false);
  assert.match(res.error, /píxel de prueba transparente/i);
});

test("validateSignatureSubmission acepta firma manuscrita válida generada por canvas", () => {
  // Simulando salida real de un canvas con trazo
  const validCanvasSignature =
    "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAZAAAADIAQMAAACy+8...valid_stroke";
  const res = validateSignatureSubmission("Carlos Mendoza", validCanvasSignature, true);
  assert.equal(res.valid, true);
  assert.equal(res.error, null);
});
