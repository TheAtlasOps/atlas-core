import { createContext, useContext, useState, useCallback, useMemo, useEffect } from "react";
import {
  mapApiSimToInventoryItem,
  mapApiRouterToInventoryItem,
  reconcileInventoryWithOrders,
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

const EMPTY_COLUMNS = buildColumnsFromOrders([]);

export function WorkOrderProvider({ children }) {
  const [rawOrders, setRawOrders] = useState([]);
  const [columns, setColumns] = useState(EMPTY_COLUMNS);
  const [visitsList, setVisitsList] = useState([]);
  const [activityList, setActivityList] = useState([]);
  const [rawInventory, setRawInventory] = useState([]);
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
   */
  const refreshOrders = useCallback(async () => {
    try {
      const response = await api.orders.getAll({ size: 100 });
      if (response && Array.isArray(response.items) && response.items.length > 0) {
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
      if (sims.length > 0 || routers.length > 0) {
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
        client: `${newTask.clientName} — ${form.address}`,
        clientName: newTask.clientName,
        location: form.address,
        status: "Programada",
        rawStatus: newTask.status,
        statusStyle:
          "bg-blue-500/15 text-blue-600 dark:text-blue-400 ring-1 ring-blue-500/25",
        technician: newTask.assigneeName,
      };
      setVisitsList((prev) => [newVisit, ...prev]);

      const newActivity = {
        id: newId,
        technician: newTask.assigneeName,
        client: newTask.clientName,
        action: `OT creada: ${orderTitle}`,
        status: "Programada",
        serviceType: form.serviceType,
        time: "Hace un momento",
      };
      setActivityList((prev) => [newActivity, ...prev]);

      showNotification(
        `Orden ${newId} creada exitosamente`,
        `${orderTitle} · Asignada a ${newTask.assigneeName}`
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

      setVisitsList((prev) =>
        prev.map((v) =>
          v.id === orderKey
            ? {
                ...v,
                status: "Completada",
                rawStatus: "COMPLETADA",
                statusStyle:
                  "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 ring-1 ring-emerald-500/25",
              }
            : v
        )
      );

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
      setHardwareInventory,
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
