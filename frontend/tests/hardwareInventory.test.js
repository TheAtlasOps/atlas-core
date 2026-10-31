import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  mapApiRouterToInventoryItem,
  mapApiSimToInventoryItem,
  getOrderAuditPackage,
} from "../src/lib/auditAndHardwareData.js";

describe("Inventario SIM y Routers - Pruebas de Unidad y Regresión", () => {
  // ─── 1. Validación de Formato de Dirección MAC ─────────────────────────────
  describe("1. Validación de Dirección MAC en Routers", () => {
    const MAC_REGEX = /^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$/;

    it("debe validar correctamente direcciones MAC con dos puntos", () => {
      assert.ok(MAC_REGEX.test("B8:27:EB:99:10:AA"));
      assert.ok(MAC_REGEX.test("00:1A:2B:3C:4D:5E"));
      assert.ok(MAC_REGEX.test("ff:ff:ff:ff:ff:ff"));
    });

    it("debe validar correctamente direcciones MAC con guiones", () => {
      assert.ok(MAC_REGEX.test("B8-27-EB-99-10-AA"));
      assert.ok(MAC_REGEX.test("00-1A-2B-3C-4D-5E"));
    });

    it("debe rechazar formatos de MAC inválidos", () => {
      assert.equal(MAC_REGEX.test("B8:27:EB:99:10"), false, "Incompleta");
      assert.equal(MAC_REGEX.test("B8:27:EB:99:10:ZZ"), false, "Caracteres no hexadecimales");
      assert.equal(MAC_REGEX.test("B827EB9910AA"), false, "Sin separadores");
      assert.equal(MAC_REGEX.test(""), false, "Cadena vacía");
      assert.equal(MAC_REGEX.test("invalid-mac"), false, "Texto libre");
    });
  });

  // ─── 2. Operadores de Tarjetas SIM y APN Dinámico ──────────────────────────
  describe("2. Selección de Operador y APN Dinámico en SIM Cards", () => {
    it("debe mapear el operador ingresado y no forzar siempre Entel", () => {
      const simClaro = {
        id: "sim-1",
        iccid: "89560200102400018501",
        operator: "Claro",
        status: "DISPONIBLE",
        notes: "SIM M2M 5G",
      };
      const mappedClaro = mapApiSimToInventoryItem(simClaro);
      assert.equal(mappedClaro.operator, "Claro");

      const simMovistar = {
        id: "sim-2",
        iccid: "89560200102400018502",
        operator: "Movistar",
        status: "DISPONIBLE",
        notes: "SIM M2M 4G",
      };
      const mappedMovistar = mapApiSimToInventoryItem(simMovistar);
      assert.equal(mappedMovistar.operator, "Movistar");

      const simWom = {
        id: "sim-3",
        iccid: "89560200102400018503",
        operator: "WOM",
        status: "DISPONIBLE",
      };
      const mappedWom = mapApiSimToInventoryItem(simWom);
      assert.equal(mappedWom.operator, "WOM");
    });

    it("debe calcular el APN dinámicamente según el operador en getOrderAuditPackage", () => {
      const order = { id: "order-1", order_number: "#OT-08491", status: "CONFIRMADA" };
      const inventory = [
        {
          id: "sim-claro",
          deviceType: "SIM",
          identifier: "89560200102400018501",
          orderId: "#OT-08491",
          operator: "Claro Chile",
          status: "INSTALADA",
          technology: "5G",
        },
      ];

      const auditPackage = getOrderAuditPackage(order, {}, null, { hardwareInventory: inventory });
      assert.ok(auditPackage.hardware.sim.isLinked);
      assert.equal(auditPackage.hardware.sim.operator, "Claro Chile");
      assert.equal(auditPackage.hardware.sim.apn, "bam.clarochile.cl");
    });
  });

  // ─── 3. Mapeo de Hardware Vinculado con Órdenes (Persistencia) ─────────────
  describe("3. Vinculación y Mapeo de Hardware con Órdenes de Trabajo", () => {
    it("mapApiRouterToInventoryItem debe asociar la orden cuando router.work_order_number está presente", () => {
      const apiRouter = {
        id: "router-uuid-01",
        serial_number: "RTR-ENTEL-2024-001",
        mac_address: "B8:27:EB:11:22:33",
        brand: "Teltonika",
        model: "RUTX50 Industrial",
        type: "ROUTER_5G",
        status: "INSTALADO",
        work_order_number: "#OT-08491",
        work_order_id: "order-uuid-01",
      };

      const ordersList = [
        {
          id: "order-uuid-01",
          order_number: "#OT-08491",
          technician_summary: { full_name: "Técnico Prueba ATLAS 01" },
          client: { business_name: "Cliente Prueba ATLAS 01" },
        },
      ];

      const item = mapApiRouterToInventoryItem(apiRouter, ordersList);
      assert.equal(item.orderId, "#OT-08491");
      assert.equal(item.technician, "Técnico Prueba ATLAS 01");
      assert.equal(item.client, "Cliente Prueba ATLAS 01");
      assert.equal(item.identifier, "RTR-ENTEL-2024-001");
      assert.equal(item.secondaryId, "MAC: B8:27:EB:11:22:33");
    });

    it("mapApiRouterToInventoryItem debe guardar NULL en MAC cuando no se proporciona", () => {
      const apiRouterWithoutMac = {
        id: "router-uuid-02",
        serial_number: "RTR-ENTEL-2024-002",
        mac_address: null,
        brand: "Teltonika",
        model: "RUTX50 Industrial",
        type: "ROUTER_5G",
        status: "DISPONIBLE",
      };

      const item = mapApiRouterToInventoryItem(apiRouterWithoutMac);
      assert.equal(item.identifier, "RTR-ENTEL-2024-002");
      assert.equal(item.secondaryId, "Tipo: ROUTER_5G");
    });

    it("mapApiSimToInventoryItem debe asociar la orden cuando sim.work_order_number está presente", () => {
      const apiSim = {
        id: "sim-uuid-01",
        iccid: "89560200102400018501",
        operator: "Entel",
        status: "INSTALADA",
        work_order_number: "#OT-08491",
        work_order_id: "order-uuid-01",
      };

      const ordersList = [
        {
          id: "order-uuid-01",
          order_number: "#OT-08491",
          technician_summary: { full_name: "Técnico Prueba ATLAS 01" },
          client: { business_name: "Cliente Prueba ATLAS 01" },
        },
      ];

      const item = mapApiSimToInventoryItem(apiSim, ordersList);
      assert.equal(item.orderId, "#OT-08491");
      assert.equal(item.technician, "Técnico Prueba ATLAS 01");
      assert.equal(item.client, "Cliente Prueba ATLAS 01");
    });

    it("getOrderAuditPackage debe vincular hardware cuando la orden contiene items directos desde el backend", () => {
      const order = { id: "order-uuid-01", order_number: "#OT-08491", status: "CONFIRMADA" };
      const apiOrderDetail = {
        id: "order-uuid-01",
        order_number: "#OT-08491",
        items: [
          {
            id: "item-01",
            work_order_id: "order-uuid-01",
            equipment_serial: "RTR-ENTEL-2024-001",
            sim_iccid: "89560200102400018501",
            action_type: "INSTALACION",
          },
        ],
      };

      const audit = getOrderAuditPackage(order, {}, apiOrderDetail, { hardwareInventory: [] });
      assert.ok(audit.hardware.router.isLinked, "Router debe figurar vinculado por los items de la OT");
      assert.equal(audit.hardware.router.serial, "RTR-ENTEL-2024-001");
      assert.ok(audit.hardware.sim.isLinked, "SIM debe figurar vinculada por los items de la OT");
      assert.equal(audit.hardware.sim.iccid, "89560200102400018501");
    });
  });
});
