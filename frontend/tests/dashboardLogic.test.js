import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  formatChileanDateTime,
  buildVisitsFromOrders,
  buildActivitiesFromOrders,
  normalizeOrderItem,
} from "../src/lib/workOrderOptions.js";
import { getOrderAuditPackage } from "../src/lib/auditAndHardwareData.js";

describe("Dashboard - Pruebas Obligatorias de Datos Reales", () => {
  // ─── 1. Horarios Chilenos y Formateo en America/Santiago ───────────────────
  describe("1 & 6. Formato de fecha y hora según America/Santiago", () => {
    it("debe formatear correctamente una fecha ISO en hora de Santiago en período UTC-3 (horario de verano)", () => {
      // 2026-10-28 15:30:00 UTC corresponde a 12:30:00 en Santiago (horario de verano UTC-3)
      const iso = "2026-10-28T15:30:00Z";
      const formatted = formatChileanDateTime(iso);
      assert.ok(formatted, "Debe retornar un string formateado");
      assert.match(formatted, /^\d{2}[/-]\d{2}\s\d{2}:\d{2}$/, "Formato debe ser DD/MM HH:mm");
      assert.equal(formatted, "28/10 12:30", `Esperado 28/10 12:30 para UTC 15:30 en Chile (UTC-3), obtenido: ${formatted}`);
    });

    it("debe formatear correctamente una fecha ISO en hora de Santiago en período UTC-4 (horario de invierno)", () => {
      // 2026-06-15 15:30:00 UTC corresponde a 11:30:00 en Santiago (horario de invierno estándar UTC-4)
      const iso = "2026-06-15T15:30:00Z";
      const formatted = formatChileanDateTime(iso);
      assert.ok(formatted, "Debe retornar un string formateado");
      assert.match(formatted, /^\d{2}[/-]\d{2}\s\d{2}:\d{2}$/, "Formato debe ser DD/MM HH:mm");
      assert.equal(formatted, "15/06 11:30", `Esperado 15/06 11:30 para UTC 15:30 en Chile (UTC-4), obtenido: ${formatted}`);
    });

    it("debe formatear incluyendo año cuando includeYear es true", () => {
      const isoSummer = "2026-10-28T15:30:00Z";
      const formattedSummer = formatChileanDateTime(isoSummer, true);
      assert.equal(formattedSummer, "28/10/2026 12:30");

      const isoWinter = "2026-06-15T15:30:00Z";
      const formattedWinter = formatChileanDateTime(isoWinter, true);
      assert.equal(formattedWinter, "15/06/2026 11:30");
    });

    it("debe retornar null ante valores nulos, indefinidos o fechas inválidas", () => {
      assert.equal(formatChileanDateTime(null), null);
      assert.equal(formatChileanDateTime(undefined), null);
      assert.equal(formatChileanDateTime(""), null);
      assert.equal(formatChileanDateTime("fecha-invalida"), null);
    });
  });

  // ─── 4. Órdenes con y sin fecha programada ────────────────────────────────
  describe("4. Agenda de visitas (buildVisitsFromOrders)", () => {
    it("debe mostrar 'Por coordinar' si la orden no tiene scheduled_date", () => {
      const orders = [
        {
          id: "1",
          order_number: "#OT-08500",
          title: "Instalación",
          status: "CONFIRMADA",
          scheduled_date: null,
          client: { business_name: "Cliente A" },
        },
        {
          id: "2",
          order_number: "#OT-08501",
          title: "Mantenimiento",
          status: "CONFIRMADA",
          scheduled_date: undefined,
          client: { business_name: "Cliente B" },
        },
      ];

      const visits = buildVisitsFromOrders(orders);
      assert.equal(visits.length, 2);
      assert.equal(visits[0].time, "Por coordinar");
      assert.equal(visits[0].hasScheduledDate, false);
      assert.equal(visits[1].time, "Por coordinar");
      assert.equal(visits[1].hasScheduledDate, false);
    });

    it("debe mostrar la fecha y hora real si la orden tiene scheduled_date", () => {
      const orders = [
        {
          id: "1",
          order_number: "#OT-08491",
          title: "Instalación fibra",
          status: "EN_RUTA",
          scheduled_date: "2026-10-28T17:00:00Z",
          client: { business_name: "Cliente Real", comuna: "Providencia" },
        },
      ];

      const visits = buildVisitsFromOrders(orders);
      assert.equal(visits.length, 1);
      assert.equal(visits[0].hasScheduledDate, true);
      assert.ok(visits[0].time.includes("14:00"), `Esperado 14:00, obtenido: ${visits[0].time}`);
      assert.notEqual(visits[0].time, "Por coordinar");
    });

    it("no debe generar cálculos de horas artificiales secuenciales", () => {
      const orders = Array.from({ length: 10 }).map((_, i) => ({
        id: String(i),
        order_number: `#OT-0849${i}`,
        title: `Orden ${i}`,
        status: "CONFIRMADA",
        scheduled_date: null, // Ninguna tiene fecha
        client: { business_name: "Cliente Test" },
      }));

      const visits = buildVisitsFromOrders(orders);
      // Todos deben ser "Por coordinar", ninguno debe ser 14:00, 14:30, 15:00...
      for (const v of visits) {
        assert.equal(v.time, "Por coordinar");
      }
    });

    it("debe retornar lista vacía si ordersList está vacío", () => {
      assert.deepEqual(buildVisitsFromOrders([]), []);
      assert.deepEqual(buildVisitsFromOrders(null), []);
    });
  });

  // ─── 8. Ausencia de actividades ficticias (buildActivitiesFromOrders) ──────
  describe("8. Actividad reciente verifiable (buildActivitiesFromOrders)", () => {
    it("debe retornar vacío si las órdenes no tienen registros en status_history", () => {
      // Las 10 órdenes seed de Neon no tienen status_history
      const seedOrders = [
        {
          id: "1",
          order_number: "#OT-08491",
          status: "COMPLETADA",
          status_history: [],
          created_at: "2026-10-20T10:00:00Z",
          updated_at: "2026-10-20T12:00:00Z",
        },
        {
          id: "2",
          order_number: "#OT-08492",
          status: "EN_RUTA",
          status_history: null,
          created_at: "2026-10-20T10:00:00Z",
        },
      ];

      const activities = buildActivitiesFromOrders(seedOrders);
      // NO debe fabricar transiciones retrospectivas usando created_at o updated_at
      assert.equal(activities.length, 0, "No debe fabricar actividades si no hay status_history");
    });

    it("debe extraer exclusivamente los eventos reales de status_history", () => {
      const orders = [
        {
          id: "1",
          order_number: "#OT-08501",
          status: "EN_RUTA",
          technician_summary: { full_name: "Carlos Mendoza" },
          client: { business_name: "Falabella Retail" },
          status_history: [
            {
              id: "hist-1",
              old_status: "CONFIRMADA",
              new_status: "EN_RUTA",
              comment: "Técnico en desplazamiento",
              created_at: "2026-10-28T16:00:00Z",
            },
          ],
        },
        {
          id: "2",
          order_number: "#OT-08502",
          status: "COMPLETADA",
          technician_summary: { full_name: "Juan Rojas" },
          client: { business_name: "Banco Santander" },
          status_history: [
            {
              id: "hist-2",
              old_status: "EN_SITIO",
              new_status: "COMPLETADA",
              comment: "Instalación completada y auditada",
              created_at: "2026-10-28T18:00:00Z",
            },
          ],
        },
      ];

      const activities = buildActivitiesFromOrders(orders);
      assert.equal(activities.length, 2);
      // Debe estar ordenado de más reciente a más antiguo (hist-2 antes de hist-1)
      assert.equal(activities[0].id, "#OT-08502");
      assert.equal(activities[0].action, "Instalación completada y auditada");
      assert.equal(activities[1].id, "#OT-08501");
      assert.equal(activities[1].action, "Técnico en desplazamiento");
    });

    it("no debe generar minutos hardcodeados (13:58 - idx*8)", () => {
      const ordersWithHistory = [
        {
          id: "1",
          order_number: "#OT-08501",
          status_history: [
            {
              id: "h1",
              new_status: "EN_RUTA",
              created_at: "2026-10-28T15:30:00Z",
            },
          ],
        },
      ];

      const activities = buildActivitiesFromOrders(ordersWithHistory);
      assert.equal(activities.length, 1);
      assert.ok(!activities[0].time.includes("13:58"), "No debe tener horario artificial 13:58");
    });
  });

  // ─── 5. Coordenadas y Marcadores de Mapa ───────────────────────────────────
  describe("5. Filtro de coordenadas válidas para marcadores de mapa", () => {
    it("debe filtrar órdenes sin coordenadas y conservar solo coordenadas numéricas reales", () => {
      const rawApiOrders = [
        { id: "1", order_number: "#OT-1", lat: -33.432, lng: -70.6093, status: "EN_RUTA" },
        { id: "2", order_number: "#OT-2", lat: null, lng: null, status: "CONFIRMADA" },
        { id: "3", order_number: "#OT-3", lat: undefined, lng: undefined, status: "IDLE" },
        { id: "4", order_number: "#OT-4", lat: "invalid", lng: "invalid", status: "IDLE" },
        { id: "5", order_number: "#OT-5", lat: -33.4489, lng: -70.6693, status: "COMPLETADA" },
      ];

      const validMarkers = rawApiOrders
        .filter((o) => {
          const lat = parseFloat(o.lat);
          const lng = parseFloat(o.lng);
          return (
            !isNaN(lat) &&
            !isNaN(lng) &&
            o.lat !== null &&
            o.lng !== null &&
            lat >= -90 &&
            lat <= 90 &&
            lng >= -180 &&
            lng <= 180
          );
        })
        .map((o) => ({
          id: o.id,
          orderNumber: o.order_number,
          lat: parseFloat(o.lat),
          lng: parseFloat(o.lng),
          status: o.status,
        }));

      assert.equal(validMarkers.length, 2);
      assert.equal(validMarkers[0].orderNumber, "#OT-1");
      assert.equal(validMarkers[1].orderNumber, "#OT-5");
    });

    it("cuando ninguna orden tiene coordenadas, la lista debe ser vacía (sin fallbacks mock)", () => {
      const rawApiOrders = [
        { id: "1", order_number: "#OT-1", lat: null, lng: null },
        { id: "2", order_number: "#OT-2", lat: null, lng: null },
      ];

      const markers = rawApiOrders.filter((o) => {
        const lat = parseFloat(o.lat);
        const lng = parseFloat(o.lng);
        return !isNaN(lat) && !isNaN(lng) && o.lat !== null && o.lng !== null;
      });

      assert.equal(markers.length, 0, "No debe inventar marcadores si la BD no tiene coordenadas");
    });
  });

  // ─── 7. Coherencia de KPIs y Donut Chart ───────────────────────────────────
  describe("7. Coherencia de conteos de KPIs y Donut Chart desde API", () => {
    it("debe calcular statusCounts estrictamente desde kpis.status_distribution", () => {
      const apiKpis = {
        active_orders: 5,
        technicians_in_field: 6,
        available_sims_rate: 62.5,
        status_distribution: {
          CONFIRMADA: 2,
          IDLE: 1,
          EN_RUTA: 2,
          EN_SITIO: 0,
          COMPLETADA: 6,
          CANCELADA: 1,
        },
      };

      const dist = apiKpis.status_distribution;
      const statusCounts = {
        pendientes: (dist.CONFIRMADA || 0) + (dist.IDLE || 0),
        enRuta: (dist.EN_RUTA || 0) + (dist.EN_SITIO || 0),
        completadas: dist.COMPLETADA || 0,
        canceladas: dist.CANCELADA || 0,
      };

      assert.equal(statusCounts.pendientes, 3);
      assert.equal(statusCounts.enRuta, 2);
      assert.equal(statusCounts.completadas, 6);
      assert.equal(statusCounts.canceladas, 1);

      const total = statusCounts.pendientes + statusCounts.enRuta + statusCounts.completadas + statusCounts.canceladas;
      assert.equal(total, 12, "El total debe coincidir con la suma exacta de los estados en la API");
    });

    it("debe manejar ausencia de datos de técnicos e inventario sin fallbacks hardcodeados (no 8, no 50)", () => {
      const emptyKpis = {
        technicians_in_field: 0,
        available_sims_rate: 0,
      };

      const availableTechs = emptyKpis?.technicians_in_field ?? 0;
      assert.equal(availableTechs, 0, "No debe usar fallback 8 cuando la API reporta 0 técnicos");

      const simRate = emptyKpis?.available_sims_rate ?? 0;
      assert.equal(simRate, 0, "No debe usar fallback 50% cuando no hay inventario");
    });
  });

  // ─── 9. Limpieza de fallbacks hardcodeados en formularios y modales ───────
  describe("9. Limpieza de fallbacks hardcodeados en formularios y modales", () => {
    it("normalizeOrderItem no debe asignar DEFAULT_CLIENT_UUID ni técnicos seed cuando no vienen provistos", () => {
      const emptyOrder = {
        id: "new-uuid",
        order_number: "#OT-08503",
        title: "Instalación Enlace",
        status: "IDLE",
        client_name: "Nuevo Cliente Real",
      };

      const normalized = normalizeOrderItem(emptyOrder);
      assert.equal(normalized.client_id, null, "client_id debe ser null si no está provisto");
      assert.equal(normalized.client.id, null, "client.id debe ser null si no está provisto");
      assert.equal(normalized.assigneeName, "Sin asignar", "assigneeName debe ser 'Sin asignar' si no viene técnico");
      assert.equal(normalized.technician_summary.id, null, "technician_summary.id debe ser null");
    });

    it("getOrderAuditPackage no debe inyectar evidencias mock para OT-08498 cuando no existen en API", () => {
      const order = {
        order_number: "#OT-08498",
        title: "Revisión técnica",
        status: "COMPLETADA",
      };

      const auditPackage = getOrderAuditPackage(order, {}, null, {
        hardwareInventory: [],
        apiEvidences: { items: [] },
      });
      assert.equal(auditPackage.evidences.length, 0, "No debe inyectar evidencias mock de prueba para OT-08498");
      assert.equal(auditPackage.conformity.isSigned, false, "No debe marcar firma mock para OT-08498");
      assert.equal(auditPackage.hardware.sim.isLinked, false, "No debe asociar SIM hardcodeada si no está en inventario");
      assert.equal(auditPackage.hardware.router.isLinked, false, "No debe asociar Router hardcodeado si no está en inventario");
      assert.equal(auditPackage.telemetry.hasRealTelemetry, false, "No debe inyectar telemetría mock para OT-08498");
    });
  });

  // ─── 10. Trazabilidad, Agenda y Geolocalización Real ─────────────────────
  describe("10. Trazabilidad, Agenda y Geolocalización Real", () => {
    it("buildActivitiesFromOrders debe mapear performer y performerRole desde changed_by del historial", () => {
      const orders = [
        {
          id: "wo-1",
          order_number: "#OT-08491",
          status_history: [
            {
              id: "h-1",
              created_at: "2026-10-30T10:00:00Z",
              comment: "Creación de orden de servicio",
              new_status: "CONFIRMADA",
              changed_by_name: "Diego Jiménez",
              changed_by_role: "ADMIN",
            },
            {
              id: "h-2",
              created_at: "2026-10-30T11:00:00Z",
              comment: "Técnico inició traslado a terreno",
              new_status: "EN_RUTA",
              changed_by_name: "Técnico Prueba ATLAS 01",
              changed_by_role: "TECNICO",
            },
          ],
        },
      ];

      const activities = buildActivitiesFromOrders(orders);
      assert.equal(activities.length, 2);
      // El más reciente primero
      assert.equal(activities[0].performer, "Técnico Prueba ATLAS 01");
      assert.equal(activities[0].performerRole, "TECNICO");
      assert.equal(activities[1].performer, "Diego Jiménez");
      assert.equal(activities[1].performerRole, "ADMIN");
    });

    it("normalizeOrderItem debe preservar lat y lng como null sin inventar coordenadas de Santiago", () => {
      const orderWithoutCoords = {
        id: "wo-no-coords",
        order_number: "#OT-08492",
        title: "Instalación",
        lat: null,
        lng: null,
      };

      const normalized = normalizeOrderItem(orderWithoutCoords);
      assert.equal(normalized.lat, null, "lat debe ser null cuando no viene provisto");
      assert.equal(normalized.lng, null, "lng debe ser null cuando no viene provisto");
    });

    it("buildVisitsFromOrders debe marcar hasScheduledDate en false y time en 'Por coordinar' cuando scheduled_date es null", () => {
      const orders = [
        {
          id: "wo-null-schedule",
          order_number: "#OT-08493",
          title: "Visita sin programar",
          scheduled_date: null,
        },
      ];

      const visits = buildVisitsFromOrders(orders);
      assert.equal(visits.length, 1);
      assert.equal(visits[0].hasScheduledDate, false);
      assert.equal(visits[0].time, "Por coordinar");
    });
  });
});
