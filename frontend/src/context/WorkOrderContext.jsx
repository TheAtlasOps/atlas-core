import { createContext, useContext, useState, useCallback, useMemo, useEffect } from "react";
import {
  INITIAL_HARDWARE_INVENTORY,
  mapApiSimToInventoryItem,
  mapApiRouterToInventoryItem,
} from "../lib/auditAndHardwareData";
import {
  getInitials,
  normalizeOrderItem,
  buildColumnsFromOrders,
  buildVisitsFromOrders,
  buildActivitiesFromOrders,
} from "../lib/workOrderOptions";
import { api } from "../lib/api";

const WorkOrderContext = createContext(null);

// ─── Datos Mock iniciales con estructura compatible con Backend + UI ──────────
const INITIAL_MOCK_ORDERS = [
  {
    id: "00000000-0000-4000-8000-000000008491",
    order_number: "#OT-08491",
    title: "Instalación fibra óptica",
    status: "CONFIRMADA",
    priority: "ALTA",
    client: { business_name: "Sr. Ramírez" },
    address_override: "Av. Providencia 1234, Providencia",
    technician_summary: { full_name: "Juan Rivas", initials: "JR" },
    tag: "Fibra",
    lat: -33.432,
    lng: -70.6093,
  },
  {
    id: "00000000-0000-4000-8000-000000008492",
    order_number: "#OT-08492",
    title: "Cambio de SIM corporativa",
    status: "CONFIRMADA",
    priority: "MEDIA",
    client: { business_name: "Entel HQ" },
    address_override: "Entel HQ, Santiago Centro",
    technician_summary: { full_name: "Luis Pinto", initials: "LP" },
    tag: "SIM",
    lat: -33.4489,
    lng: -70.6693,
  },
  {
    id: "00000000-0000-4000-8000-000000008493",
    order_number: "#OT-08493",
    title: "Revisión antena 4G",
    status: "CONFIRMADA",
    priority: "URGENTE",
    client: { business_name: "Torre Entel" },
    address_override: "Torre Entel, Las Condes",
    technician_summary: { full_name: "María Kovalenko", initials: "MK" },
    tag: "Red",
    lat: -33.4103,
    lng: -70.5684,
  },
  {
    id: "00000000-0000-4000-8000-000000008494",
    order_number: "#OT-08494",
    title: "Diagnóstico router empresarial",
    status: "IDLE",
    priority: "BAJA",
    client: { business_name: "Corp. Vitacura" },
    address_override: "Av. Vitacura 2939, Vitacura",
    technician_summary: { full_name: "Tomás Castro", initials: "TC" },
    tag: "Hardware",
    lat: -33.3992,
    lng: -70.5981,
  },
  {
    id: "00000000-0000-4000-8000-000000008495",
    order_number: "#OT-08495",
    title: "Activación Magic Link",
    status: "EN_RUTA",
    priority: "ALTA",
    client: { business_name: "PYME Clientes" },
    address_override: "Calle Irarrázaval 890, Ñuñoa",
    technician_summary: { full_name: "Elena Kravets", initials: "EK" },
    tag: "Magic Link",
    lat: -33.4569,
    lng: -70.599,
  },
  {
    id: "00000000-0000-4000-8000-000000008496",
    order_number: "#OT-08496",
    title: "Revisión señal móvil",
    status: "EN_SITIO",
    priority: "MEDIA",
    client: { business_name: "Torre Entel" },
    address_override: "Torre Entel, Santiago Centro",
    technician_summary: { full_name: "Elena Kravets", initials: "EK" },
    tag: "Red",
    lat: -33.444,
    lng: -70.653,
  },
  {
    id: "00000000-0000-4000-8000-000000008497",
    order_number: "#OT-08497",
    title: "Instalación repetidor WiFi",
    status: "EN_RUTA",
    priority: "ALTA",
    client: { business_name: "Municipalidad de Maipú" },
    address_override: "Municipalidad de Maipú, Maipú",
    technician_summary: { full_name: "Sofía Araya", initials: "SA" },
    tag: "Hardware",
    lat: -33.511,
    lng: -70.758,
  },
  {
    id: "00000000-0000-4000-8000-000000008498",
    order_number: "#OT-08498",
    title: "Alta de línea empresarial",
    status: "COMPLETADA",
    priority: "BAJA",
    client: { business_name: "BancoEstado" },
    address_override: "BancoEstado Casa Matriz, Santiago",
    technician_summary: { full_name: "Elena Kravets", initials: "EK" },
    tag: "SIM",
    lat: -33.4418,
    lng: -70.6512,
  },
  {
    id: "00000000-0000-4000-8000-000000008499",
    order_number: "#OT-08499",
    title: "Reemplazo módem ADSL",
    status: "COMPLETADA",
    priority: "MEDIA",
    client: { business_name: "Sra. Fuentes" },
    address_override: "Calle Los Aromos 52, Peñalolén",
    technician_summary: { full_name: "Luis Pinto", initials: "LP" },
    tag: "Hardware",
    lat: -33.485,
    lng: -70.542,
  },
  {
    id: "00000000-0000-4000-8000-000000008500",
    order_number: "#OT-08500",
    title: "Configuración VPN corporativa",
    status: "COMPLETADA",
    priority: "MEDIA",
    client: { business_name: "Grupo Apoquindo" },
    address_override: "Av. Apoquindo 6100, Las Condes",
    technician_summary: { full_name: "Juan Rivas", initials: "JR" },
    tag: "Red",
    lat: -33.408,
    lng: -70.567,
  },
];

const INITIAL_COLUMNS = buildColumnsFromOrders(INITIAL_MOCK_ORDERS);

// ─── Datos iniciales de visitas del Dispatch Board ────────────────────────────
const INITIAL_VISITS = [
  {
    id: "#OT-08491",
    time: "14:00",
    service: "Instalación fibra óptica",
    serviceType: "Fibra",
    client: "Sr. Ramírez — Providencia",
    status: "En camino",
    statusStyle: "bg-orange-500/15 text-orange-600 dark:text-orange-400 ring-1 ring-orange-500/25",
    technician: "Juan Rivas",
  },
  {
    id: "#OT-08492",
    time: "14:30",
    service: "Cambio de SIM corporativa",
    serviceType: "SIM",
    client: "Entel HQ — Santiago Centro",
    status: "Programada",
    statusStyle: "bg-blue-500/15 text-blue-600 dark:text-blue-400 ring-1 ring-blue-500/25",
    technician: "Luis Pinto",
  },
  {
    id: "#OT-08494",
    time: "15:15",
    service: "Diagnóstico router empresarial",
    serviceType: "Hardware",
    client: "Banco Estado — Las Condes",
    status: "Programada",
    statusStyle: "bg-blue-500/15 text-blue-600 dark:text-blue-400 ring-1 ring-blue-500/25",
    technician: "Tomás Castro",
  },
  {
    id: "#OT-08493",
    time: "16:00",
    service: "Revisión antena 4G",
    serviceType: "Red",
    client: "Torre Entel — Las Condes",
    status: "Reagendada",
    statusStyle: "bg-rose-500/15 text-rose-600 dark:text-rose-400 ring-1 ring-rose-500/25",
    technician: "María Kovalenko",
  },
  {
    id: "#OT-08495",
    time: "17:30",
    service: "Activación Magic Link",
    serviceType: "Magic Link",
    client: "PYME Clientes — Ñuñoa",
    status: "Programada",
    statusStyle: "bg-blue-500/15 text-blue-600 dark:text-blue-400 ring-1 ring-blue-500/25",
    technician: "Elena Kravets",
  },
];

// ─── Datos iniciales de actividad reciente ───────────────────────────────────
const INITIAL_ACTIVITIES = [
  {
    id: "#OT-08491",
    technician: "Juan Rivas",
    action: "Marcó visita como completada",
    status: "Completada",
    serviceType: "Fibra",
    time: "13:52",
  },
  {
    id: "#OT-08495",
    technician: "Elena Kravets",
    action: "Inició desplazamiento hacia el lugar",
    status: "En camino",
    serviceType: "Magic Link",
    time: "13:47",
  },
  {
    id: "#OT-08492",
    technician: "Luis Pinto",
    action: "Aceptó la OT asignada",
    status: "Programada",
    serviceType: "SIM",
    time: "13:30",
  },
  {
    id: "#OT-08496",
    technician: "Elena Kravets",
    action: "Actualizó estado a En Tránsito",
    status: "En camino",
    serviceType: "Red",
    time: "13:15",
  },
  {
    id: "#OT-08499",
    technician: "Luis Pinto",
    action: "Marcó visita como completada",
    status: "Completada",
    serviceType: "Hardware",
    time: "12:58",
  },
  {
    id: "#OT-08493",
    technician: "María Kovalenko",
    action: "Aceptó la OT asignada",
    status: "Programada",
    serviceType: "Red",
    time: "12:40",
  },
];

export function WorkOrderProvider({ children }) {
  const [columns, setColumns] = useState(INITIAL_COLUMNS);
  const [visitsList, setVisitsList] = useState(INITIAL_VISITS);
  const [activityList, setActivityList] = useState(INITIAL_ACTIVITIES);
  const [hardwareInventory, setHardwareInventory] = useState(INITIAL_HARDWARE_INVENTORY);
  const [orderHardwareOverrides, setOrderHardwareOverrides] = useState({});
  const [auditedOrders, setAuditedOrders] = useState({
    "#OT-08498": true,
  });
  const [toast, setToast] = useState(null);

  const showNotification = useCallback((title, description) => {
    setToast({ title, description });
    setTimeout(() => {
      setToast(null);
    }, 4500);
  }, []);

  /**
   * Recarga la lista de órdenes desde FastAPI (`api.orders.getAll({ size: 100 })`).
   * Si falla (ej: Vercel sin backend local), mantiene las columnas Mock actuales.
   */
  const refreshOrders = useCallback(async () => {
    try {
      const response = await api.orders.getAll({ size: 100 });
      if (response && Array.isArray(response.items) && response.items.length > 0) {
        setColumns(buildColumnsFromOrders(response.items));
        setVisitsList(buildVisitsFromOrders(response.items));
        setActivityList(buildActivitiesFromOrders(response.items));
        return response.items;
      }
    } catch {
      // Fallback silencioso a datos Mock en Vercel
    }
    return null;
  }, []);

  /**
   * Recarga el inventario de SIMs y Routers desde FastAPI (`api.inventory.getSims` y `getRouters`).
   * Si falla, mantiene INITIAL_HARDWARE_INVENTORY.
   */
  const refreshHardwareInventory = useCallback(async () => {
    try {
      const [simsRes, routersRes] = await Promise.all([
        api.inventory.getSims({ size: 100 }),
        api.inventory.getRouters({ size: 100 }),
      ]);
      const sims = Array.isArray(simsRes?.items)
        ? simsRes.items.map(mapApiSimToInventoryItem)
        : [];
      const routers = Array.isArray(routersRes?.items)
        ? routersRes.items.map(mapApiRouterToInventoryItem)
        : [];
      if (sims.length > 0 || routers.length > 0) {
        setHardwareInventory([...sims, ...routers]);
        return [...sims, ...routers];
      }
    } catch {
      // Fallback silencioso a datos Mock en Vercel
    }
    return null;
  }, []);

  useEffect(() => {
    refreshOrders();
  }, [refreshOrders]);

  const totalOrders = useMemo(
    () => columns.reduce((acc, col) => acc + col.tasks.length, 0),
    [columns]
  );

  const createWorkOrder = useCallback(
    (form, apiCreatedOrder = null) => {
      const nextNum = 8500 + totalOrders + 1;
      const newId =
        apiCreatedOrder?.order_number || `#OT-${String(nextNum).padStart(5, "0")}`;
      const orderTitle =
        apiCreatedOrder?.title ||
        form.title?.trim() ||
        `${form.serviceType} — ${form.clientName}`;
      const priorityEnum = (
        apiCreatedOrder?.priority ||
        form.priority ||
        "MEDIA"
      ).toUpperCase();

      const newTask = normalizeOrderItem({
        id: apiCreatedOrder?.id || Date.now(),
        order_number: newId,
        title: orderTitle,
        status: apiCreatedOrder?.status || "CONFIRMADA",
        priority: priorityEnum,
        client: {
          business_name:
            apiCreatedOrder?.client?.business_name || form.clientName,
        },
        address_override: apiCreatedOrder?.address_override || form.address,
        technician_summary: {
          full_name:
            apiCreatedOrder?.technician_summary?.full_name || form.technician,
          initials: getInitials(
            apiCreatedOrder?.technician_summary?.full_name || form.technician
          ),
        },
        tag: form.serviceType,
      });

      setColumns((prev) =>
        prev.map((col) =>
          col.id === "asignada"
            ? { ...col, tasks: [newTask, ...col.tasks] }
            : col
        )
      );

      const newVisit = {
        id: newId,
        time: "Ahora",
        service: orderTitle,
        serviceType: form.serviceType,
        client: `${form.clientName} (${form.address})`,
        status: "Programada",
        statusStyle:
          "bg-blue-500/15 text-blue-600 dark:text-blue-400 ring-1 ring-blue-500/25",
        technician: form.technician,
      };
      setVisitsList((prev) => [newVisit, ...prev]);

      const newActivity = {
        id: newId,
        technician: form.technician,
        action: `OT creada: ${orderTitle}`,
        status: "Programada",
        serviceType: form.serviceType,
        time: "Hace un momento",
      };
      setActivityList((prev) => [newActivity, ...prev]);

      showNotification(
        `Orden ${newId} creada exitosamente`,
        `${orderTitle} · Asignada a ${form.technician}`
      );

      return newTask;
    },
    [totalOrders, showNotification]
  );

  const approveOrderAudit = useCallback(
    (order) => {
      const orderKey = order?.order_number || order?.orderId;
      if (!orderKey) return;

      setAuditedOrders((prev) => ({ ...prev, [orderKey]: true }));

      // Actualizar estado de la tarjeta a COMPLETADA y moverla a la columna Completada
      setColumns((prev) => {
        let movedTask = null;
        const withoutTask = prev.map((col) => {
          const found = col.tasks.find(
            (t) => (t.order_number || t.orderId) === orderKey
          );
          if (found) {
            movedTask = { ...found, status: "COMPLETADA" };
          }
          return {
            ...col,
            tasks: col.tasks.filter(
              (t) => (t.order_number || t.orderId) !== orderKey
            ),
          };
        });

        if (!movedTask) return prev;
        return withoutTask.map((col) =>
          col.id === "completada"
            ? { ...col, tasks: [movedTask, ...col.tasks] }
            : col
        );
      });

      const newActivity = {
        id: orderKey,
        technician:
          order.technician_summary?.full_name ||
          order.assigneeName ||
          "Coordinación",
        action:
          "Auditoría aprobada por coordinador (Estado actualizado a COMPLETADA)",
        status: "Completada",
        serviceType: order.tag || "Fibra",
        time: "Ahora",
      };
      setActivityList((prev) => [newActivity, ...prev]);

      showNotification(
        `Auditoría ${orderKey} aprobada y cerrada`,
        `Estado actualizado a COMPLETADA · Evidencias y firma validadas.`
      );
    },
    [showNotification]
  );

  const reassignOrderHardware = useCallback(
    (order, { routerItem, simItem }) => {
      const orderKey = order?.order_number || order?.orderId || "EMPAREJAMIENTO";

      if (order?.order_number || order?.orderId) {
        setOrderHardwareOverrides((prev) => {
          const current = prev[orderKey] || {};
          return {
            ...prev,
            [orderKey]: {
              ...current,
              ...(routerItem
                ? {
                    routerModel: routerItem.model,
                    routerSerial: routerItem.identifier,
                  }
                : {}),
              ...(simItem
                ? {
                    simIccid: simItem.identifier,
                    simTechnology: simItem.technology,
                  }
                : {}),
            },
          };
        });
      }

      setHardwareInventory((prev) =>
        prev.map((item) => {
          if (routerItem && item.id === routerItem.id) {
            return {
              ...item,
              status: "INSTALADA",
              orderId: order?.order_number || order?.orderId || item.orderId || "Vinculado",
              technician:
                order?.technician_summary?.full_name ||
                order?.assigneeName ||
                item.technician ||
                "Técnico Terreno",
            };
          }
          if (simItem && item.id === simItem.id) {
            return {
              ...item,
              status: "INSTALADA",
              orderId: order?.order_number || order?.orderId || item.orderId || "Vinculado",
              technician:
                order?.technician_summary?.full_name ||
                order?.assigneeName ||
                item.technician ||
                "Técnico Terreno",
            };
          }
          return item;
        })
      );

      showNotification(
        `Hardware emparejado exitosamente`,
        `${routerItem ? `Router ${routerItem.identifier}` : ""}${
          routerItem && simItem ? " + " : ""
        }${simItem ? `SIM ${simItem.identifier}` : ""} sincronizados.`
      );
    },
    [showNotification]
  );

  const value = useMemo(
    () => ({
      columns,
      setColumns,
      visitsList,
      activityList,
      hardwareInventory,
      setHardwareInventory,
      orderHardwareOverrides,
      auditedOrders,
      totalOrders,
      toast,
      setToast,
      showNotification,
      refreshOrders,
      refreshHardwareInventory,
      createWorkOrder,
      approveOrderAudit,
      reassignOrderHardware,
    }),
    [
      columns,
      visitsList,
      activityList,
      hardwareInventory,
      orderHardwareOverrides,
      auditedOrders,
      totalOrders,
      toast,
      showNotification,
      refreshOrders,
      refreshHardwareInventory,
      createWorkOrder,
      approveOrderAudit,
      reassignOrderHardware,
    ]
  );

  return (
    <WorkOrderContext.Provider value={value}>
      {children}
    </WorkOrderContext.Provider>
  );
}

export function useWorkOrders() {
  const context = useContext(WorkOrderContext);
  if (!context) {
    throw new Error("useWorkOrders debe ser usado dentro de un WorkOrderProvider");
  }
  return context;
}
