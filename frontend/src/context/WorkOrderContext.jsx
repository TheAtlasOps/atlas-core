import { createContext, useContext, useState, useCallback, useMemo, useEffect } from "react";
import {
  mapApiSimToInventoryItem,
  mapApiRouterToInventoryItem,
  reconcileInventoryWithOrders,
} from "../lib/auditAndHardwareData";
import {
  normalizeOrderItem,
  buildColumnsFromOrders,
  buildVisitsFromOrders,
  buildActivitiesFromOrders,
  formatChileanDateTime,
} from "../lib/workOrderOptions";
import { api } from "../lib/api";
import { syncOrdersWithTracking, setOnTrackingCompleted } from "../lib/routeTrackingManager";

const WorkOrderContext = createContext(null);

const EMPTY_COLUMNS = buildColumnsFromOrders([]);

export function WorkOrderProvider({ children }) {
  const [rawOrders, setRawOrders] = useState([]);
  const [columns, setColumns] = useState(EMPTY_COLUMNS);
  const [visitsList, setVisitsList] = useState([]);
  const [activityList, setActivityList] = useState([]);
  const [rawInventory, setRawInventory] = useState([]);
  const [orderHardwareOverrides, setOrderHardwareOverrides] = useState({});
  const [auditedOrders, setAuditedOrders] = useState({});
  const [toast, setToast] = useState(null);

  // ── Almacén persistente de notificaciones (localStorage) ──
  const [notifications, setNotifications] = useState(() => {
    if (typeof window === "undefined" || !window.localStorage) return [];
    try {
      const saved = window.localStorage.getItem("atlas_notifications_v1");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {
      // Fallback
    }
    return [];
  });

  const persistNotifications = useCallback((updater) => {
    setNotifications((prev) => {
      const next = typeof updater === "function" ? updater(prev) : updater;
      if (typeof window !== "undefined" && window.localStorage) {
        try {
          window.localStorage.setItem("atlas_notifications_v1", JSON.stringify(next));
        } catch {
          // Ignorar en entornos restringidos
        }
      }
      return next;
    });
  }, []);

  const addNotification = useCallback(
    ({
      title,
      message,
      type = "order",
      orderNumber = null,
      dedupeKey = null,
      isSimulated = false,
    }) => {
      if (!title) return;
      const key = dedupeKey || `notif_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
      const now = new Date();
      const timeStr = `${now.getHours().toString().padStart(2, "0")}:${now.getMinutes().toString().padStart(2, "0")}`;

      persistNotifications((prev) => {
        // Evitar duplicados si ya existe el dedupeKey
        if (dedupeKey && prev.some((n) => n.dedupeKey === dedupeKey)) {
          return prev;
        }
        const item = {
          id: key,
          dedupeKey: key,
          title,
          message,
          type,
          orderNumber,
          time: timeStr,
          timestamp: now.getTime(),
          read: false,
          isSimulated: Boolean(isSimulated || type === "simulation"),
        };
        return [item, ...prev].slice(0, 50);
      });
    },
    [persistNotifications]
  );

  const markAsRead = useCallback(
    (id) => {
      persistNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read: true } : n))
      );
    },
    [persistNotifications]
  );

  const markAllAsRead = useCallback(() => {
    persistNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }, [persistNotifications]);

  const clearNotifications = useCallback(() => {
    persistNotifications([]);
  }, [persistNotifications]);

  const unreadCount = useMemo(
    () => notifications.filter((n) => !n.read).length,
    [notifications]
  );

  const showNotification = useCallback(
    (
      title,
      description,
      {
        type = "order",
        orderNumber = null,
        dedupeKey = null,
        isSimulated = false,
      } = {}
    ) => {
      setToast({ title, description, type });
      setTimeout(() => {
        setToast(null);
      }, 4500);

      addNotification({
        title,
        message: description,
        type,
        orderNumber,
        dedupeKey,
        isSimulated: isSimulated || type === "simulation",
      });
    },
    [addNotification]
  );

  /**
   * Recarga la lista de órdenes desde FastAPI (`api.orders.getAll({ size: 100 })`).
   */
  const refreshOrders = useCallback(async () => {
    try {
      const response = await api.orders.getAll({ size: 100 });
      if (response && Array.isArray(response.items)) {
        setRawOrders(response.items);
        setColumns(buildColumnsFromOrders(response.items));
        setVisitsList(buildVisitsFromOrders(response.items));
        setActivityList(buildActivitiesFromOrders(response.items));
        return response.items;
      }
    } catch {
      // Mantiene estado actual si no hay sesión activa o falla red
    }
    return null;
  }, []);

  /**
   * Recarga el inventario de SIMs y Routers desde FastAPI (`api.inventory.getSims` y `getRouters`).
   */
  const refreshHardwareInventory = useCallback(async (ordersRef = []) => {
    try {
      const [simsRes, routersRes] = await Promise.all([
        api.inventory.getSims({ size: 100 }),
        api.inventory.getRouters({ size: 100 }),
      ]);
      const sims = Array.isArray(simsRes?.items)
        ? simsRes.items.map((s) => mapApiSimToInventoryItem(s, ordersRef))
        : [];
      const routers = Array.isArray(routersRes?.items)
        ? routersRes.items.map((r) => mapApiRouterToInventoryItem(r, ordersRef))
        : [];
      if (Array.isArray(simsRes?.items) || Array.isArray(routersRes?.items)) {
        const combined = [...sims, ...routers];
        setRawInventory(combined);
        return combined;
      }
    } catch {
      // Mantiene estado actual si no hay sesión activa o falla red
    }
    return null;
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function initData() {
      const loadedOrders = await refreshOrders();
      if (!cancelled) {
        await refreshHardwareInventory(loadedOrders || []);
      }
    }
    initData();
    return () => {
      cancelled = true;
    };
  }, [refreshOrders, refreshHardwareInventory]);

  // Sincronizar órdenes en ruta con el seguimiento simulado automático de 180s
  useEffect(() => {
    if (Array.isArray(rawOrders) && rawOrders.length > 0) {
      syncOrdersWithTracking(rawOrders);
    }
  }, [rawOrders]);

  // Notificación informativa discreta al finalizar un recorrido simulado (180 s)
  // Emite exactamente una notificación evitando duplicados o alertas continuas por frame
  useEffect(() => {
    setOnTrackingCompleted((record) => {
      if (!record || !record.orderNumber) return;
      showNotification(
        `[Simulación] Recorrido finalizado: ${record.orderNumber}`,
        `La OT ${record.orderNumber} completó su recorrido de demostración (180 s). Pendiente de confirmación de llegada del técnico.`,
        {
          type: "simulation",
          orderNumber: record.orderNumber,
          dedupeKey: `tracking_completed_${record.orderId || record.orderNumber}`,
          isSimulated: true,
        }
      );
    });
    return () => {
      setOnTrackingCompleted(null);
    };
  }, [showNotification]);

  // Sincronizar notificaciones relevantes derivadas de órdenes reales de Neon
  useEffect(() => {
    if (!Array.isArray(rawOrders) || rawOrders.length === 0) return;

    for (const order of rawOrders) {
      if (!order) continue;
      const orderNumber = order.order_number || `#OT-${order.id}`;
      const status = (order.status || "").toUpperCase();
      const priority = (order.priority || "").toUpperCase();
      const clientName =
        order.client?.business_name || order.client_name || order.clientName || "Cliente";

      // 1. Notificación de órdenes con prioridad Urgente
      if (priority === "URGENTE") {
        addNotification({
          title: `Atención Prioritaria: ${orderNumber}`,
          message: `Orden con prioridad Urgente para ${clientName} requiere supervisión de despacho.`,
          type: "urgent",
          orderNumber,
          dedupeKey: `order_urgent_${orderNumber}`,
        });
      }

      // 2. Notificación de órdenes en desplazamiento técnico
      if (status === "EN_RUTA") {
        addNotification({
          title: `Especialista en Ruta: ${orderNumber}`,
          message: `El móvil técnico se encuentra en desplazamiento hacia las dependencias de ${clientName}.`,
          type: "tracking",
          orderNumber,
          dedupeKey: `order_en_ruta_${orderNumber}`,
        });
      }

      // 3. Notificación de órdenes en atención en sitio
      if (status === "EN_SITIO") {
        addNotification({
          title: `Atención en Sitio: ${orderNumber}`,
          message: `Especialista en terreno ejecutando faenas para ${clientName}.`,
          type: "order",
          orderNumber,
          dedupeKey: `order_en_sitio_${orderNumber}`,
        });
      }

      // 4. Notificación de órdenes completadas pendientes de auditoría
      if (status === "COMPLETADA" && !order.is_audited && !auditedOrders[orderNumber]) {
        addNotification({
          title: `Auditoría Pendiente: ${orderNumber}`,
          message: `Servicio técnico para ${clientName} finalizado. Pendiente de conformidad y cierre formal.`,
          type: "audit",
          orderNumber,
          dedupeKey: `order_audit_pending_${orderNumber}`,
        });
      }
    }
  }, [rawOrders, auditedOrders, addNotification]);

  const allNormalizedOrders = useMemo(
    () => columns.flatMap((col) => col.tasks),
    [columns]
  );

  // Inventario reconciliado en vivo con las órdenes y overrides actuales
  const hardwareInventory = useMemo(
    () =>
      reconcileInventoryWithOrders(
        rawInventory,
        allNormalizedOrders.length > 0 ? allNormalizedOrders : rawOrders,
        orderHardwareOverrides
      ),
    [rawInventory, allNormalizedOrders, rawOrders, orderHardwareOverrides]
  );

  const setHardwareInventory = useCallback((updater) => {
    setRawInventory(updater);
  }, []);

  const totalOrders = useMemo(
    () => columns.reduce((acc, col) => acc + col.tasks.length, 0),
    [columns]
  );

  const createWorkOrder = useCallback(
    (form, apiCreatedOrder = null) => {
      // Solo actualizar estado local y notificar éxito si la API confirmó la persistencia en Neon
      if (!apiCreatedOrder || !apiCreatedOrder.id) {
        console.warn("createWorkOrder omitido: la orden no fue confirmada por el servidor.");
        return null;
      }

      const newId = apiCreatedOrder.order_number;
      const orderTitle = apiCreatedOrder.title || `${form.serviceType} — ${form.clientName}`;

      const newTask = normalizeOrderItem(apiCreatedOrder);

      setColumns((prev) =>
        prev.map((col) =>
          col.id === "asignada"
            ? { ...col, tasks: [newTask, ...col.tasks] }
            : col
        )
      );

      const scheduledTimeDisplay =
        formatChileanDateTime(apiCreatedOrder?.scheduled_date || form.scheduledDate) ||
        "Por coordinar";

      const newVisit = {
        id: newId,
        time: scheduledTimeDisplay,
        service: orderTitle,
        serviceType: form.serviceType,
        client: `${newTask.clientName} — ${form.address}`,
        clientName: newTask.clientName,
        location: form.address,
        status: "Programada",
        rawStatus: newTask.status,
        statusStyle:
          "bg-blue-500/15 text-blue-600 dark:text-blue-400 ring-1 ring-blue-500/25",
        technician: newTask.assigneeName,
        hasScheduledDate: Boolean(apiCreatedOrder?.scheduled_date || form.scheduledDate),
      };
      setVisitsList((prev) => [newVisit, ...prev]);

      const nowTimeDisplay = formatChileanDateTime(new Date().toISOString()) || "";
      const newActivity = {
        id: newId,
        technician: newTask.assigneeName,
        client: newTask.clientName,
        action: `OT creada: ${orderTitle}`,
        status: "Programada",
        serviceType: form.serviceType,
        time: nowTimeDisplay,
      };
      setActivityList((prev) => [newActivity, ...prev]);

      showNotification(
        `Orden ${newId} creada exitosamente`,
        `${orderTitle} · Asignada a ${newTask.assigneeName}`,
        { type: "order", orderNumber: newId, dedupeKey: `order_created_${newId}` }
      );

      return newTask;
    },
    [showNotification]
  );

  const approveOrderAudit = useCallback(
    (order) => {
      const orderKey = order?.order_number || order?.orderId;
      if (!orderKey) return;

      setAuditedOrders((prev) => ({ ...prev, [orderKey]: true }));

      setRawOrders((prev) =>
        prev.map((o) =>
          (o.order_number || o.id) === orderKey || o.id === order.id
            ? { ...o, is_audited: true }
            : o
        )
      );

      const newActivity = {
        id: orderKey,
        technician:
          order.technician_summary?.full_name ||
          order.assigneeName ||
          "Coordinación",
        action: "Auditoría técnica aprobada y cerrada formalmente",
        status: "Completada",
        serviceType: order.tag || "Fibra",
        time: "Ahora",
      };
      setActivityList((prev) => [newActivity, ...prev]);

      showNotification(
        `Auditoría ${orderKey} aprobada y cerrada`,
        `Cierre administrativo registrado y persistido en base de datos.`,
        { type: "audit", orderNumber: orderKey, dedupeKey: `audit_approved_${orderKey}` }
      );
    },
    [showNotification]
  );

  const reassignOrderHardware = useCallback(
    (order, { routerItem, simItem }) => {
      const orderKey = order?.order_number || order?.orderId || null;

      if (orderKey) {
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

      setRawInventory((prev) =>
        prev.map((item) => {
          if (routerItem && item.id === routerItem.id) {
            return {
              ...item,
              status: "INSTALADA",
              orderId: orderKey || item.orderId || "Vinculado",
              technician:
                order?.technician_summary?.full_name ||
                order?.assigneeName ||
                item.technician ||
                "Técnico Terreno",
              clientName:
                order?.client?.business_name ||
                order?.clientName ||
                item.clientName ||
                null,
            };
          }
          if (simItem && item.id === simItem.id) {
            return {
              ...item,
              status: "INSTALADA",
              orderId: orderKey || item.orderId || "Vinculado",
              technician:
                order?.technician_summary?.full_name ||
                order?.assigneeName ||
                item.technician ||
                "Técnico Terreno",
              clientName:
                order?.client?.business_name ||
                order?.clientName ||
                item.clientName ||
                null,
            };
          }
          return item;
        })
      );

      showNotification(
        `Hardware emparejado exitosamente`,
        `${routerItem ? `Router ${routerItem.identifier}` : ""}${
          routerItem && simItem ? " + " : ""
        }${simItem ? `SIM ${simItem.identifier}` : ""} sincronizados.`,
        { type: "order", orderNumber: orderKey, dedupeKey: `hw_reassigned_${orderKey}_${Date.now()}` }
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
      notifications,
      unreadCount,
      markAsRead,
      markAllAsRead,
      clearNotifications,
      addNotification,
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
      setHardwareInventory,
      orderHardwareOverrides,
      auditedOrders,
      totalOrders,
      toast,
      showNotification,
      notifications,
      unreadCount,
      markAsRead,
      markAllAsRead,
      clearNotifications,
      addNotification,
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

export function useWorkOrders({ optional = false } = {}) {
  const context = useContext(WorkOrderContext);
  if (!context && !optional) {
    throw new Error("useWorkOrders debe ser usado dentro de un WorkOrderProvider");
  }
  return context;
}
