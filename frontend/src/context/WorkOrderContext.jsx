import { createContext, useContext, useState, useCallback, useMemo } from "react";
import { INITIAL_HARDWARE_INVENTORY } from "../lib/auditAndHardwareData";

const WorkOrderContext = createContext(null);

function getInitials(name) {
  return (name ?? "")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase() || "U";
}

// ─── Datos iniciales del tablero Kanban ─────────────────────────────────────────
const INITIAL_COLUMNS = [
  {
    id: "asignada",
    label: "Asignada",
    accentColor: "bg-blue-500",
    tasks: [
      { id: 1, orderId: "#OT-08491", title: "Instalación fibra óptica", client: "Sr. Ramírez", location: "Av. Providencia 1234, Providencia", priority: "Alta", assignee: "JR", assigneeName: "Juan Rivas", tag: "Fibra" },
      { id: 2, orderId: "#OT-08492", title: "Cambio de SIM corporativa", client: "Entel HQ", location: "Entel HQ, Santiago Centro", priority: "Media", assignee: "LP", assigneeName: "Luis Pinto", tag: "SIM" },
      { id: 3, orderId: "#OT-08493", title: "Revisión antena 4G", client: "Torre Entel", location: "Torre Entel, Las Condes", priority: "Alta", assignee: "MK", assigneeName: "María Kovalenko", tag: "Red" },
      { id: 4, orderId: "#OT-08494", title: "Diagnóstico router empresarial", client: "Corp. Vitacura", location: "Av. Vitacura 2939, Vitacura", priority: "Baja", assignee: "TC", assigneeName: "Tomás Castro", tag: "Hardware" },
    ],
  },
  {
    id: "en-transito",
    label: "En Tránsito",
    accentColor: "bg-amber-500",
    tasks: [
      { id: 5, orderId: "#OT-08495", title: "Activación Magic Link", client: "PYME Clientes", location: "Calle Irarrázaval 890, Ñuñoa", priority: "Alta", assignee: "EK", assigneeName: "Elena Kravets", tag: "Magic Link" },
      { id: 6, orderId: "#OT-08496", title: "Revisión señal móvil", client: "Torre Entel", location: "Torre Entel, Santiago Centro", priority: "Media", assignee: "EK", assigneeName: "Elena Kravets", tag: "Red" },
      { id: 7, orderId: "#OT-08497", title: "Instalación repetidor WiFi", client: "Municipalidad de Maipú", location: "Municipalidad de Maipú, Maipú", priority: "Alta", assignee: "SA", assigneeName: "Sofía Araya", tag: "Hardware" },
    ],
  },
  {
    id: "completada",
    label: "Completada",
    accentColor: "bg-emerald-500",
    tasks: [
      { id: 8, orderId: "#OT-08498", title: "Alta de línea empresarial", client: "BancoEstado", location: "BancoEstado Casa Matriz, Santiago", priority: "Baja", assignee: "EK", assigneeName: "Elena Kravets", tag: "SIM" },
      { id: 9, orderId: "#OT-08499", title: "Reemplazo módem ADSL", client: "Sra. Fuentes", location: "Calle Los Aromos 52, Peñalolén", priority: "Media", assignee: "LP", assigneeName: "Luis Pinto", tag: "Hardware" },
      { id: 10, orderId: "#OT-08500", title: "Configuración VPN corporativa", client: "Grupo Apoquindo", location: "Av. Apoquindo 6100, Las Condes", priority: "Media", assignee: "JR", assigneeName: "Juan Rivas", tag: "Red" },
    ],
  },
];

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

  const totalOrders = useMemo(
    () => columns.reduce((acc, col) => acc + col.tasks.length, 0),
    [columns]
  );

  const createWorkOrder = useCallback((form) => {
    const nextNum = 8500 + totalOrders + 1;
    const newId = `#OT-${String(nextNum).padStart(5, "0")}`;
    const orderTitle = form.title?.trim() || `${form.serviceType} — ${form.clientName}`;

    // 1. Tarjeta para el tablero Kanban (columna Asignada)
    const newTask = {
      id: Date.now(),
      orderId: newId,
      title: orderTitle,
      client: form.clientName,
      location: form.address,
      priority: form.priority,
      assignee: getInitials(form.technician),
      assigneeName: form.technician,
      tag: form.serviceType,
    };

    setColumns((prev) =>
      prev.map((col) =>
        col.id === "asignada" ? { ...col, tasks: [newTask, ...col.tasks] } : col
      )
    );

    // 2. Elemento para Próximas Visitas del Dispatch Board
    const newVisit = {
      id: newId,
      time: "Ahora",
      service: orderTitle,
      serviceType: form.serviceType,
      client: `${form.clientName} (${form.address})`,
      status: "Programada",
      statusStyle: "bg-blue-500/15 text-blue-600 dark:text-blue-400 ring-1 ring-blue-500/25",
      technician: form.technician,
    };
    setVisitsList((prev) => [newVisit, ...prev]);

    // 3. Elemento para Registro de Actividad
    const newActivity = {
      id: newId,
      technician: form.technician,
      action: `OT creada: ${orderTitle}`,
      status: "Programada",
      serviceType: form.serviceType,
      time: "Hace un momento",
    };
    setActivityList((prev) => [newActivity, ...prev]);

    // 4. Toast de confirmación
    showNotification(
      `Orden ${newId} creada exitosamente`,
      `${orderTitle} · Asignada a ${form.technician}`
    );

    return newTask;
  }, [totalOrders, showNotification]);

  const approveOrderAudit = useCallback((order) => {
    if (!order?.orderId) return;

    setAuditedOrders((prev) => ({ ...prev, [order.orderId]: true }));

    // Registrar en el log de actividad
    const newActivity = {
      id: order.orderId,
      technician: order.assigneeName || "Coordinación",
      action: "Auditoría técnica aprobada (Evidencias + Firma digital verificadas)",
      status: "Completada",
      serviceType: order.tag || "Fibra",
      time: "Ahora",
    };
    setActivityList((prev) => [newActivity, ...prev]);

    showNotification(
      `Auditoría ${order.orderId} aprobada y cerrada`,
      `Evidencias fotográficas, parámetros dBm y firma digital validados.`
    );
  }, [showNotification]);

  const reassignOrderHardware = useCallback((order, { routerItem, simItem }) => {
    if (!order?.orderId) return;

    setOrderHardwareOverrides((prev) => {
      const current = prev[order.orderId] || {};
      return {
        ...prev,
        [order.orderId]: {
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

    setHardwareInventory((prev) =>
      prev.map((item) => {
        if (routerItem && item.id === routerItem.id) {
          return {
            ...item,
            status: "Asignado",
            orderId: order.orderId,
            technician: order.assigneeName || "Técnico Terreno",
          };
        }
        if (simItem && item.id === simItem.id) {
          return {
            ...item,
            status: "Asignado",
            orderId: order.orderId,
            technician: order.assigneeName || "Técnico Terreno",
          };
        }
        return item;
      })
    );

    showNotification(
      `Hardware reasignado en ${order.orderId}`,
      `Equipamiento actualizado y sincronizado con el inventario activo.`
    );
  }, [showNotification]);

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
