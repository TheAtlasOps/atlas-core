const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8000/api/v1";

async function request(endpoint, options = {}) {
  const isPublicEndpoint =
    endpoint === "/auth/login" || endpoint.startsWith("/client/");

  const token = localStorage.getItem("atlas_token");

  const headers = {
    "Content-Type": "application/json",
    ...(token && { Authorization: `Bearer ${token}` }),
    ...options.headers,
  };

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  if (response.status === 401 && !isPublicEndpoint) {
    localStorage.removeItem("atlas_token");
    localStorage.removeItem("atlas_user");
    window.dispatchEvent(new CustomEvent("auth:unauthorized"));
    const errorData = await response.json().catch(() => ({}));
    const err = new Error(errorData.detail || "Sesión expirada o no autorizada");
    err.status = 401;
    throw err;
  }

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const err = new Error(errorData.detail || `Error HTTP ${response.status}`);
    err.status = response.status;
    throw err;
  }
  return response.json();
}

export const api = {
  auth: {
    login: (email, password) =>
      request("/auth/login", { method: "POST", body: JSON.stringify({ email, password }) }),
    me: () => request("/auth/me"),
    generateMagicLink: (workOrderId, expireHours = 48) =>
      request("/auth/magic-link/generate", {
        method: "POST",
        body: JSON.stringify({ work_order_id: workOrderId, expire_hours: expireHours }),
      }),
  },
  notifications: {
    sendMagicLink: (workOrderId, recipientEmail = null) =>
      request("/notifications/send-magic-link", {
        method: "POST",
        body: JSON.stringify({
          work_order_id: workOrderId,
          ...(recipientEmail ? { recipient_email: recipientEmail } : {}),
        }),
      }),
    testEmail: (toEmail) =>
      request(`/notifications/test-email?to_email=${encodeURIComponent(toEmail)}`, {
        method: "POST",
      }),
  },
  orders: {
    getAll: (params = {}) => {
      const query = new URLSearchParams(params).toString();
      return request(`/orders${query ? `?${query}` : ""}`);
    },
    getById: (id) => request(`/orders/${id}`),
    getKpis: () => request("/orders/kpis"),
    create: (orderData) =>
      request("/orders", { method: "POST", body: JSON.stringify(orderData) }),
    updateStatus: (id, newStatus, comment = "") =>
      request(`/orders/${id}/status`, { method: "PATCH", body: JSON.stringify({ new_status: newStatus, comment }) }),
    assign: (id, technicianId, eta = null) =>
      request(`/orders/${id}/assign`, { method: "PATCH", body: JSON.stringify({ technician_id: technicianId, eta }) }),
    getTechnicians: () => request("/orders/technicians"),
    createTechnician: (techData) =>
      request("/orders/technicians", { method: "POST", body: JSON.stringify(techData) }),
    toggleTechnicianAvailability: (id) =>
      request(`/orders/technicians/${id}/toggle-availability`, { method: "PATCH" }),
    getClients: () => request("/orders/clients"),
  },
  evidences: {
    getByOrderId: (workOrderId) => request(`/evidences/order/${workOrderId}`),
  },
  inventory: {
    getSims: (params = {}) => {
      const query = new URLSearchParams(params).toString();
      return request(`/inventory/sims${query ? `?${query}` : ""}`);
    },
    createSim: (simData) =>
      request("/inventory/sims", { method: "POST", body: JSON.stringify(simData) }),
    getRouters: (params = {}) => {
      const query = new URLSearchParams(params).toString();
      return request(`/inventory/routers${query ? `?${query}` : ""}`);
    },
    createRouter: (routerData) =>
      request("/inventory/routers", { method: "POST", body: JSON.stringify(routerData) }),
    pair: (equipmentId, simCardId, clientId = null, workOrderId = null) =>
      request("/inventory/pair", {
        method: "POST",
        body: JSON.stringify({
          equipment_id: equipmentId,
          sim_card_id: simCardId,
          client_id: clientId,
          ...(workOrderId ? { work_order_id: workOrderId } : {}),
          action_type: "INSTALACION",
        }),
      }),
  },
  clientPortal: {
    getSummary: (magicLinkToken) =>
      request(`/client/order-summary?token=${encodeURIComponent(magicLinkToken)}`),
    confirmVisit: (magicLinkToken, data) =>
      request(`/client/confirm-visit?token=${encodeURIComponent(magicLinkToken)}`, {
        method: "POST",
        body: JSON.stringify(data),
      }),
    sign: (magicLinkToken, signatureBase64, signedByName) =>
      request(`/client/sign?token=${encodeURIComponent(magicLinkToken)}`, {
        method: "POST",
        body: JSON.stringify({
          signature_base64: signatureBase64,
          signed_by_name: signedByName,
        }),
      }),
  },
};
