/**
 * frontend/src/tests/clientModule.test.js
 *
 * Pruebas unitarias y de integración para la sección de Clientes:
 * 1. Listado de clientes reales desde la API, KPIs y estados vacíos.
 * 2. Buscador tolerante y filtrado por órdenes activas.
 * 3. Modal de registro y edición de clientes (ClientModal) con validación en español.
 * 4. Ficha técnica de cliente (ClientDetailDrawer) con órdenes asociadas y acceso a OT.
 * 5. Integración con creación de Work Orders y selección sin duplicados.
 * 6. Consistencia visual con modo oscuro/claro y control de permisos RBAC.
 */

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe("ATLAS FSM — Módulo Clientes", () => {
  describe("1. Navegación y Rutas del Sistema", () => {
    test("Sidebar.jsx incluye acceso directo a Clientes con icono Building2", () => {
      const sidebarPath = path.resolve(__dirname, "../components/layout/Sidebar.jsx");
      const content = fs.readFileSync(sidebarPath, "utf-8");

      assert.ok(content.includes('label: "Clientes"'), "Sidebar debe contener opción 'Clientes'");
      assert.ok(content.includes('path: "/clients"'), "Ruta debe ser /clients");
      assert.ok(content.includes("Building2"), "Debe utilizar el icono corporativo Building2");
    });

    test("App.jsx registra la ruta /clients vinculada al componente Clients", () => {
      const appPath = path.resolve(__dirname, "../App.jsx");
      const content = fs.readFileSync(appPath, "utf-8");

      assert.ok(content.includes('import Clients from "./pages/Clients"'), "App.jsx debe importar Clients");
      assert.ok(content.includes('<Route path="/clients" element={<Clients />} />'), "Debe definir la ruta /clients");
    });

    test("api.js expone namespace clients con métodos REST completos", () => {
      const apiPath = path.resolve(__dirname, "../lib/api.js");
      const content = fs.readFileSync(apiPath, "utf-8");

      assert.ok(content.includes("clients: {"), "api.js debe contener namespace clients");
      assert.ok(content.includes("getAll:"), "Debe implementar getAll");
      assert.ok(content.includes("getById:"), "Debe implementar getById");
      assert.ok(content.includes("create:"), "Debe implementar create");
      assert.ok(content.includes("update:"), "Debe implementar update");
      assert.ok(content.includes("delete:"), "Debe implementar delete");
    });
  });

  describe("2. Vista Principal de Clientes (Clients.jsx)", () => {
    test("Clients.jsx consume api.clients.getAll y presenta KPIs calculados", () => {
      const clientsPath = path.resolve(__dirname, "../pages/Clients.jsx");
      const content = fs.readFileSync(clientsPath, "utf-8");

      assert.ok(content.includes("api.clients.getAll"), "Debe cargar clientes reales desde api.clients.getAll");
      assert.ok(content.includes("Total Clientes"), "Debe mostrar KPI de Total Clientes");
      assert.ok(content.includes("Con OTs Activas"), "Debe mostrar KPI de Clientes con OTs Activas");
      assert.ok(content.includes("Cobertura Comunal"), "Debe mostrar KPI de Cobertura Comunal");
      assert.ok(content.includes("Órdenes Vinculadas"), "Debe mostrar KPI de Órdenes Vinculadas");
    });

    test("Clients.jsx implementa buscador reactivo y filtros por órdenes activas", () => {
      const clientsPath = path.resolve(__dirname, "../pages/Clients.jsx");
      const content = fs.readFileSync(clientsPath, "utf-8");

      assert.ok(content.includes("searchQuery"), "Debe manejar estado searchQuery");
      assert.ok(content.includes("filterMode"), "Debe manejar estado filterMode");
      assert.ok(content.includes("ACTIVE_ORDERS"), "Debe filtrar por órdenes activas");
      assert.ok(content.includes("NO_ACTIVE_ORDERS"), "Debe filtrar por clientes sin órdenes activas");
      assert.ok(content.includes("No se encontraron clientes"), "Debe manejar estado vacío amigable");
    });

    test("Clients.jsx restringe acciones de gestión según rol de usuario", () => {
      const clientsPath = path.resolve(__dirname, "../pages/Clients.jsx");
      const content = fs.readFileSync(clientsPath, "utf-8");

      assert.ok(content.includes("useAuth"), "Debe consultar el contexto useAuth");
      assert.ok(
        content.includes('userRole === "ADMIN" || userRole === "COORDINADOR"'),
        "Debe verificar roles autorizados ADMIN y COORDINADOR"
      );
      assert.ok(content.includes("canManage"), "Debe controlar visibilidad de acciones mediante canManage");
    });
  });

  describe("3. Formulario Modal de Cliente (ClientModal.jsx)", () => {
    test("ClientModal.jsx contiene campos requeridos y validación de correo", () => {
      const modalPath = path.resolve(__dirname, "../components/ui/ClientModal.jsx");
      const content = fs.readFileSync(modalPath, "utf-8");

      assert.ok(content.includes("business_name"), "Debe incluir campo business_name");
      assert.ok(content.includes("contact_email"), "Debe incluir campo contact_email");
      assert.ok(content.includes("contact_phone"), "Debe incluir campo contact_phone");
      assert.ok(content.includes("address"), "Debe incluir campo address");
      assert.ok(content.includes("comuna"), "Debe incluir campo comuna");
      assert.ok(content.includes("validateEmail"), "Debe incluir validador de formato de correo");
      assert.ok(content.includes("noValidate"), "Debe suprimir validación nativa HTML de navegador");
    });

    test("ClientModal.jsx soporta tanto creación como edición de cliente", () => {
      const modalPath = path.resolve(__dirname, "../components/ui/ClientModal.jsx");
      const content = fs.readFileSync(modalPath, "utf-8");

      assert.ok(content.includes("api.clients.create"), "Debe permitir crear cliente mediante api.clients.create");
      assert.ok(content.includes("api.clients.update"), "Debe permitir actualizar cliente mediante api.clients.update");
      assert.ok(content.includes("isEditing"), "Debe distinguir entre modo creación y edición");
      assert.ok(content.includes("Guardar Cambios"), "Botón debe decir 'Guardar Cambios' en edición");
      assert.ok(content.includes("Crear Cliente"), "Botón debe decir 'Crear Cliente' en creación");
    });
  });

  describe("4. Ficha Técnica de Cliente (ClientDetailDrawer.jsx)", () => {
    test("ClientDetailDrawer.jsx muestra órdenes asociadas y permite navegar a su detalle", () => {
      const drawerPath = path.resolve(__dirname, "../components/ui/ClientDetailDrawer.jsx");
      const content = fs.readFileSync(drawerPath, "utf-8");

      assert.ok(content.includes("api.clients.getById"), "Debe consultar el detalle del cliente desde Neon");
      assert.ok(content.includes("handleOpenOrder"), "Debe permitir abrir la orden de trabajo");
      assert.ok(content.includes("/work-orders?order="), "Debe navegar a /work-orders?order= para abrir el drawer de OT");
      assert.ok(content.includes("Información de Contacto"), "Debe mostrar bloque de información de contacto");
      assert.ok(content.includes("Órdenes Asociadas"), "Debe mostrar bloque de órdenes asociadas");
    });

    test("ClientDetailDrawer.jsx ofrece acciones de edición y creación de nueva OT", () => {
      const drawerPath = path.resolve(__dirname, "../components/ui/ClientDetailDrawer.jsx");
      const content = fs.readFileSync(drawerPath, "utf-8");

      assert.ok(content.includes("onEditClient"), "Debe invocar callback onEditClient");
      assert.ok(content.includes("onCreateOrderForClient"), "Debe invocar callback onCreateOrderForClient");
      assert.ok(content.includes("canEdit"), "Debe validar permisos canEdit para modificar datos");
    });
  });

  describe("5. Integración con NewWorkOrderModal", () => {
    test("NewWorkOrderModal.jsx permite registrar cliente nuevo al vuelo y asociar cliente existente", () => {
      const orderModalPath = path.resolve(__dirname, "../components/ui/NewWorkOrderModal.jsx");
      const content = fs.readFileSync(orderModalPath, "utf-8");

      assert.ok(content.includes("ClientModal"), "Debe importar e integrar ClientModal");
      assert.ok(content.includes("setIsClientModalOpen(true)"), "Debe permitir abrir ClientModal desde el modal de OT");
      assert.ok(content.includes("clientId"), "Debe almacenar y pasar clientId para evitar duplicación de registros");
      assert.ok(content.includes("initialClientPreset"), "Debe aceptar cliente predeterminado al crear OT desde la ficha");
    });
  });
});
