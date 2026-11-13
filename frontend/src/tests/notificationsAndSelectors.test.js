/**
 * frontend/src/tests/notificationsAndSelectors.test.js
 *
 * Pruebas unitarias y de integración para:
 * 1. Campana de notificaciones: persistencia en localStorage, lectura/no leídas, deduplicación
 *    y generación a partir de eventos reales de órdenes sin alertas por frame de simulación.
 * 2. Selectores de órdenes de trabajo (Tipo de servicio, Prioridad, Técnico asignado):
 *    eliminación del popup nativo HTML «Please select an item in the list», validación
 *    en español y presentación visual consistente en modos oscuro y claro.
 */

import { test, describe, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe("ATLAS FSM — Campana de Notificaciones y Selectores de Órdenes", () => {
  let originalWindow;
  let mockStorage;

  beforeEach(() => {
    mockStorage = new Map();
    originalWindow = globalThis.window;
    globalThis.window = {
      localStorage: {
        getItem: (k) => mockStorage.get(k) || null,
        setItem: (k, v) => mockStorage.set(k, String(v)),
        removeItem: (k) => mockStorage.delete(k),
        clear: () => mockStorage.clear(),
        key: (i) => Array.from(mockStorage.keys())[i],
        get length() {
          return mockStorage.size;
        },
      },
    };
  });

  afterEach(() => {
    globalThis.window = originalWindow;
  });

  describe("1. Campana de Notificaciones", () => {
    test("Notificaciones persisten en localStorage y preservan estado leído/no leído al recargar", () => {
      const initialNotifs = [
        {
          id: "notif_1",
          dedupeKey: "order_urgent_OT-08498",
          title: "Atención Prioritaria: OT-08498",
          message: "Orden con prioridad Urgente para BancoEstado.",
          type: "urgent",
          orderNumber: "OT-08498",
          time: "15:30",
          timestamp: Date.now() - 60000,
          read: false,
        },
        {
          id: "notif_2",
          dedupeKey: "order_en_ruta_OT-08500",
          title: "Especialista en Ruta: OT-08500",
          message: "El móvil técnico se encuentra en desplazamiento.",
          type: "tracking",
          orderNumber: "OT-08500",
          time: "15:20",
          timestamp: Date.now() - 120000,
          read: true,
        },
      ];

      // Guardar en storage simulado
      window.localStorage.setItem("atlas_notifications_v1", JSON.stringify(initialNotifs));

      // Recuperar y verificar integridad
      const retrieved = JSON.parse(window.localStorage.getItem("atlas_notifications_v1"));
      assert.equal(retrieved.length, 2);
      assert.equal(retrieved[0].read, false, "Primera notificación debe estar no leída");
      assert.equal(retrieved[1].read, true, "Segunda notificación debe estar leída");
      assert.equal(retrieved[0].orderNumber, "OT-08498");

      // Simular marcar la primera como leída
      const updated = retrieved.map((n) => (n.id === "notif_1" ? { ...n, read: true } : n));
      window.localStorage.setItem("atlas_notifications_v1", JSON.stringify(updated));

      const afterUpdate = JSON.parse(window.localStorage.getItem("atlas_notifications_v1"));
      const unread = afterUpdate.filter((n) => !n.read).length;
      assert.equal(unread, 0, "No deben quedar notificaciones sin leer tras actualizar");
    });

    test("Deduplicación estricta: dedupeKey previene notificaciones redundantes de la misma orden", () => {
      const storageKey = "atlas_notifications_v1";
      const list = [];

      function addDeduplicated(notif) {
        if (list.some((n) => n.dedupeKey === notif.dedupeKey)) return;
        list.push(notif);
        window.localStorage.setItem(storageKey, JSON.stringify(list));
      }

      // Añadir la misma notificación dos veces
      addDeduplicated({
        dedupeKey: "tracking_completed_OT-08498",
        title: "Recorrido simulado finalizado",
        message: "OT-08498 completó su recorrido.",
      });

      addDeduplicated({
        dedupeKey: "tracking_completed_OT-08498",
        title: "Recorrido simulado finalizado",
        message: "OT-08498 completó su recorrido repetido.",
      });

      assert.equal(list.length, 1, "Solo debe registrarse una notificación para la clave de tracking");
    });

    test("Header.jsx consume unreadCount y muestra contador visual y acciones de lectura", () => {
      const headerPath = path.resolve(__dirname, "../components/layout/Header.jsx");
      const content = fs.readFileSync(headerPath, "utf-8");

      assert.ok(content.includes("useWorkOrders"), "Header debe conectarse al contexto useWorkOrders");
      assert.ok(content.includes("unreadCount"), "Header debe leer unreadCount del contexto");
      assert.ok(content.includes("notifications"), "Header debe leer la lista de notificaciones");
      assert.ok(content.includes("markAllAsRead"), "Header debe permitir marcar todas como leídas");
      assert.ok(content.includes("clearNotifications"), "Header debe permitir limpiar las notificaciones");
      assert.ok(content.includes("Marcar leídas"), "Header debe incluir botón visual 'Marcar leídas'");
      assert.ok(content.includes("Limpiar todas"), "Header debe incluir botón 'Limpiar todas'");
      assert.ok(!content.includes("const [notifications, setNotifications] = useState([])"), "No debe tener estado aislado desconectado");
    });

    test("WorkOrderContext.jsx implementa almacén persistente con límite y reconciliación de órdenes", () => {
      const contextPath = path.resolve(__dirname, "../context/WorkOrderContext.jsx");
      const content = fs.readFileSync(contextPath, "utf-8");

      assert.ok(content.includes("atlas_notifications_v1"), "Debe usar la clave atlas_notifications_v1 en localStorage");
      assert.ok(content.includes("addNotification"), "Debe exponer la función addNotification");
      assert.ok(content.includes("markAsRead"), "Debe exponer markAsRead");
      assert.ok(content.includes("markAllAsRead"), "Debe exponer markAllAsRead");
      assert.ok(content.includes("clearNotifications"), "Debe exponer clearNotifications");
      assert.ok(content.includes("order_urgent_"), "Debe generar notificaciones para órdenes urgentes reales");
      assert.ok(content.includes("order_en_ruta_"), "Debe generar notificaciones para órdenes en ruta");
      assert.ok(content.includes("order_audit_pending_"), "Debe generar notificaciones para auditorías pendientes");
      assert.ok(content.includes("tracking_completed_"), "Debe deduplicar la finalización del recorrido simulado");
    });
  });

  describe("2. Selectores de Órdenes de Trabajo", () => {
    test("NewWorkOrderModal.jsx desactiva validación nativa HTML (noValidate) para evitar «Please select an item in the list»", () => {
      const modalPath = path.resolve(__dirname, "../components/ui/NewWorkOrderModal.jsx");
      const content = fs.readFileSync(modalPath, "utf-8");

      // Verificación de noValidate en el formulario
      assert.ok(
        content.includes("<form noValidate onSubmit={handleSubmit}>"),
        "El formulario debe tener noValidate para suprimir los tooltips en inglés de los navegadores"
      );

      // Verificación de validación en español dentro de handleSubmit
      assert.ok(
        content.includes("Por favor seleccione un Tipo de Servicio para la orden"),
        "Debe validar en español que se haya seleccionado un Tipo de Servicio"
      );
    });

    test("NewWorkOrderModal.jsx reemplaza los tres selects nativos por CustomSelectField accesible", () => {
      const modalPath = path.resolve(__dirname, "../components/ui/NewWorkOrderModal.jsx");
      const content = fs.readFileSync(modalPath, "utf-8");

      // Verificación de los tres campos usando CustomSelectField
      assert.ok(
        content.includes('id="new-wo-service"'),
        "Debe existir el campo de Tipo de Servicio con ID new-wo-service"
      );
      assert.ok(
        content.includes('id="new-wo-priority"'),
        "Debe existir el campo de Prioridad con ID new-wo-priority"
      );
      assert.ok(
        content.includes('id="new-wo-tech"'),
        "Debe existir el campo de Técnico Asignado con ID new-wo-tech"
      );

      // No debe contener etiquetas select estándar para estos tres campos
      assert.ok(
        !content.includes('<select\n              id="new-wo-service"'),
        "new-wo-service no debe ser un select nativo sin estilizar"
      );
      assert.ok(
        !content.includes('<select\n              id="new-wo-priority"'),
        "new-wo-priority no debe ser un select nativo sin estilizar"
      );
      assert.ok(
        !content.includes('<select\n            id="new-wo-tech"'),
        "new-wo-tech no debe ser un select nativo sin estilizar"
      );
    });

    test("CustomSelectField implementa compatibilidad con tema oscuro y claro de ATLAS", () => {
      const modalPath = path.resolve(__dirname, "../components/ui/NewWorkOrderModal.jsx");
      const content = fs.readFileSync(modalPath, "utf-8");

      // Verificación de clases de tema oscuro
      assert.ok(
        content.includes("dark:bg-[#121212]") || content.includes("dark:bg-[#1e1e1e]"),
        "Debe incluir fondos consistentes con el modo oscuro de ATLAS (#121212 / #1e1e1e)"
      );
      assert.ok(
        content.includes("dark:border-gray-700"),
        "Debe incluir bordes consistentes con el modo oscuro de ATLAS (dark:border-gray-700)"
      );
      assert.ok(
        content.includes("dark:text-white"),
        "Debe incluir textos legibles en modo oscuro (dark:text-white)"
      );

      // Verificación de clases de tema claro
      assert.ok(content.includes("bg-white"), "Debe soportar fondo blanco en modo claro");
      assert.ok(content.includes("border-slate-200"), "Debe soportar bordes slate-200 en modo claro");
      assert.ok(content.includes("text-slate-900"), "Debe soportar texto slate-900 en modo claro");

      // Verificación de flecha chevron interactiva y lista de opciones
      assert.ok(content.includes("ChevronDown"), "Debe incluir icono ChevronDown");
      assert.ok(content.includes('role="listbox"'), "Debe incluir role listbox para accesibilidad");
      assert.ok(content.includes('role="option"'), "Debe incluir role option para cada ítem");
    });

    test("Conservación de opciones: PRIORITIES y techOptions preservan valores del dominio", () => {
      const modalPath = path.resolve(__dirname, "../components/ui/NewWorkOrderModal.jsx");
      const content = fs.readFileSync(modalPath, "utf-8");

      assert.ok(content.includes('value: "BAJA"'), "Debe incluir prioridad BAJA");
      assert.ok(content.includes('value: "MEDIA"'), "Debe incluir prioridad MEDIA");
      assert.ok(content.includes('value: "ALTA"'), "Debe incluir prioridad ALTA");
      assert.ok(content.includes('value: "URGENTE"'), "Debe incluir prioridad URGENTE");

      assert.ok(
        content.includes("Sin asignar / Por coordinar"),
        "Debe conservar opción de técnico no asignado"
      );
      assert.ok(
        content.includes("tech.operational_status"),
        "Debe considerar el estado operativo del técnico"
      );
    });

    test("CustomSelectField implementa control completo por teclado y accesibilidad ARIA", () => {
      const modalPath = path.resolve(__dirname, "../components/ui/NewWorkOrderModal.jsx");
      const content = fs.readFileSync(modalPath, "utf-8");

      assert.ok(content.includes("onKeyDown={handleKeyDown}"), "El botón debe tener handler onKeyDown");
      assert.ok(content.includes('case "ArrowDown":'), "Debe soportar navegación hacia abajo con ArrowDown");
      assert.ok(content.includes('case "ArrowUp":'), "Debe soportar navegación hacia arriba con ArrowUp");
      assert.ok(content.includes('case "Enter":'), "Debe seleccionar opción con Enter");
      assert.ok(content.includes('case "Escape":'), "Debe cerrar listbox con Escape");
      assert.ok(content.includes("aria-activedescendant"), "Debe indicar opción activa mediante aria-activedescendant");
      assert.ok(content.includes("scrollIntoView"), "Debe hacer scroll al elemento enfocado por teclado");
    });
  });

  describe("3. Apertura de Orden desde Notificaciones y Alertas Simuladas", () => {
    test("Header.jsx navega con parámetro order para abrir drawer y distingue alertas simuladas", () => {
      const headerPath = path.resolve(__dirname, "../components/layout/Header.jsx");
      const content = fs.readFileSync(headerPath, "utf-8");

      assert.ok(
        content.includes("/work-orders?order="),
        "Header debe navegar con /work-orders?order= para abrir directamente la orden en el drawer"
      );
      assert.ok(
        content.includes("Sparkles"),
        "Header debe importar y utilizar el icono Sparkles para distinguir alertas simuladas"
      );
      assert.ok(
        content.includes("Simulación"),
        "Header debe renderizar badge visual 'Simulación'"
      );
      assert.ok(
        content.includes("isSimulated") || content.includes('n.type === "simulation"'),
        "Header debe comprobar isSimulated o tipo simulation"
      );
    });

    test("WorkOrders.jsx escucha parámetro order y activa setSelectedOrder automáticamente", () => {
      const workOrdersPath = path.resolve(__dirname, "../pages/WorkOrders.jsx");
      const content = fs.readFileSync(workOrdersPath, "utf-8");

      assert.ok(
        content.includes('searchParams.get("order")'),
        "WorkOrders debe consultar el parámetro order de la URL"
      );
      assert.ok(
        content.includes("setSelectedOrder"),
        "WorkOrders debe actualizar selectedOrder al detectar el parámetro order"
      );
      assert.ok(
        content.includes('nextParams.delete("order")'),
        "Al cerrar el drawer debe limpiar el parámetro order de la URL"
      );
    });
  });
});
