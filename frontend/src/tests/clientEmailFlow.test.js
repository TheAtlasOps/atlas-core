import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { api } from "../lib/api.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe("ATLAS FSM — Flujo de Correo del Cliente y Magic Link", () => {
  const drawerCode = fs.readFileSync(
    path.join(__dirname, "../components/ui/WorkOrderDetailDrawer.jsx"),
    "utf-8"
  );
  const magicLinksCode = fs.readFileSync(
    path.join(__dirname, "../pages/MagicLinks.jsx"),
    "utf-8"
  );
  const apiCode = fs.readFileSync(
    path.join(__dirname, "../lib/api.js"),
    "utf-8"
  );

  it("1. api.js: expone endpoints para actualizar correo y datos del cliente", () => {
    assert.equal(typeof api.orders.updateClientEmail, "function");
    assert.equal(typeof api.orders.updateClient, "function");
    assert.ok(
      apiCode.includes("/orders/${orderId}/client-email"),
      "api.orders.updateClientEmail debe apuntar a /orders/{orderId}/client-email"
    );
    assert.ok(
      apiCode.includes("/orders/clients/${clientId}"),
      "api.orders.updateClient debe apuntar a /orders/clients/{clientId}"
    );
  });

  it("2. WorkOrderDetailDrawer: visualiza datos de contacto del cliente (empresa, teléfono y correo)", () => {
    assert.ok(
      drawerCode.includes("Contacto del Cliente"),
      "El Drawer debe tener una sección de Contacto del Cliente"
    );
    assert.ok(
      drawerCode.includes("currentClientEmail"),
      "El Drawer debe resolver el correo del cliente actual"
    );
    assert.ok(
      drawerCode.includes("clientPhone"),
      "El Drawer debe mostrar el teléfono del cliente"
    );
  });

  it("3. WorkOrderDetailDrawer: restringe la edición de correo a roles autorizados (ADMIN y COORDINADOR)", () => {
    assert.ok(
      drawerCode.includes('canEditClient = user?.role === "ADMIN" || user?.role === "COORDINADOR"'),
      "Solo ADMIN y COORDINADOR deben tener habilitada la edición del correo del cliente"
    );
    assert.ok(
      drawerCode.includes("canEditClient && !isEditingEmail"),
      "El botón de edición solo debe renderizarse cuando canEditClient es verdadero"
    );
  });

  it("4. WorkOrderDetailDrawer: implementa validación de formato de correo y guardado vía api.orders.updateClientEmail", () => {
    assert.ok(
      drawerCode.includes("handleSaveClientEmail"),
      "Debe existir una función para guardar el correo del cliente"
    );
    assert.ok(
      drawerCode.includes("api.orders.updateClientEmail"),
      "Debe invocar api.orders.updateClientEmail para persistir en Neon"
    );
    assert.ok(
      drawerCode.includes("@") && drawerCode.includes("test(cleanEmail)"),
      "Debe validar el formato de correo electrónico antes de enviar"
    );
  });

  it("5. WorkOrderDetailDrawer: botón «Enviar Magic Link» recupera automáticamente el correo fresco del cliente", () => {
    assert.ok(
      drawerCode.includes("handleOpenSendMagicModal"),
      "Debe existir handler para abrir modal de Magic Link"
    );
    assert.ok(
      drawerCode.includes("api.orders.getById"),
      "Debe consultar api.orders.getById para recuperar el correo actualizado del cliente"
    );
    assert.ok(
      drawerCode.includes("MODAL: ENVIAR MAGIC LINK POR CORREO DIRECTO"),
      "El Drawer debe contar con el modal para enviar Magic Link"
    );
  });

  it("6. MagicLinks.jsx: handleOpenSendModal recupera automáticamente el correo actualizado del cliente", () => {
    assert.ok(
      magicLinksCode.includes("handleOpenSendModal = async"),
      "handleOpenSendModal debe ser asíncrono para recuperar datos frescos"
    );
    assert.ok(
      magicLinksCode.includes("await api.orders.getById(row.workOrderId)"),
      "handleOpenSendModal debe llamar a api.orders.getById para obtener el correo actualizado"
    );
  });

  it("7. Permite ingresar destinatario alternativo sin modificar el correo principal", () => {
    // Ambos modales permiten editar magicRecipientEmail / sendModalEmail
    assert.ok(
      drawerCode.includes("magicRecipientEmail") &&
        drawerCode.includes("onChange={(e) => setMagicRecipientEmail(e.target.value)}"),
      "El modal de envío en el Drawer debe permitir tipear un correo destinatario alternativo"
    );
    assert.ok(
      magicLinksCode.includes("sendModalEmail") &&
        magicLinksCode.includes("onChange={(e) => setSendModalEmail(e.target.value)}"),
      "El modal de envío en MagicLinks debe permitir tipear un correo destinatario alternativo"
    );
  });

  it("8. Muestra errores reales reportados por el servicio de correo", () => {
    assert.ok(
      drawerCode.includes("magicSendToast") &&
        drawerCode.includes("err.message || \"No se pudo despachar el correo transaccional.\""),
      "El Drawer debe mostrar el error real capturado en magicSendToast"
    );
    assert.ok(
      magicLinksCode.includes("err.message || \"No se pudo despachar el correo transaccional.\""),
      "MagicLinks debe mostrar el error real capturado en el toast"
    );
  });
});
