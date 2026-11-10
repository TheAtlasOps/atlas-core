const API_BASE =
  (typeof import.meta !== "undefined" && import.meta.env?.VITE_API_URL) ||
  (typeof process !== "undefined" && process.env?.VITE_API_URL) ||
  "http://localhost:8000/api/v1";

async function request(endpoint, options = {}) {
  const isPublicEndpoint =
    endpoint === "/auth/login" || endpoint.startsWith("/auth/password-reset/") || endpoint.startsWith("/client/");

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
    requestPasswordReset: (email) => request("/auth/password-reset/request", {
      method: "POST", body: JSON.stringify({ email }),
    }),
    confirmPasswordReset: (token, password, confirmation) => request("/auth/password-reset/confirm", {
      method: "POST", body: JSON.stringify({ token, password, password_confirmation: confirmation }),
    }),
    generateMagicLink: (workOrderId, expireHours = 48, forceNew = false) =>
      request("/auth/magic-link/generate", {
        method: "POST",
        body: JSON.stringify({
          work_order_id: workOrderId,
          expire_hours: expireHours,
          force_new: forceNew,
        }),
      }),
    revokeMagicLink: (workOrderId) =>
      request(`/auth/magic-link/${workOrderId}/revoke`, {
        method: "POST",
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
    update: (id, orderData) =>
      request(`/orders/${id}`, { method: "PATCH", body: JSON.stringify(orderData) }),
    geocode: (query) => {
      const q = encodeURIComponent(query);
      return request(`/orders/geocode?query=${q}`);
    },
    updateStatus: (id, newStatus, comment = "") =>
      request(`/orders/${id}/status`, { method: "PATCH", body: JSON.stringify({ new_status: newStatus, comment }) }),
    assign: (id, technicianId, eta = null) =>
      request(`/orders/${id}/assign`, { method: "PATCH", body: JSON.stringify({ technician_id: technicianId, eta }) }),
    approveAudit: (id, notes = "") =>
      request(`/orders/${id}/audit-approve`, {
        method: "POST",
        body: JSON.stringify({ notes }),
      }),
    getTechnicians: () => request("/orders/technicians"),
    getTechnicianLocations: () => request("/orders/technicians/locations"),
    updateLocation: (orderId, lat, lng) =>
      request(`/orders/${orderId}/location`, {
        method: "POST",
        body: JSON.stringify({ lat, lng }),
      }),
    createTechnician: (techData) =>
      request("/orders/technicians", { method: "POST", body: JSON.stringify(techData) }),
    toggleTechnicianAvailability: (id) =>
      request(`/orders/technicians/${id}/toggle-availability`, { method: "PATCH" }),
    getClients: () => request("/orders/clients"),
    getActivityLog: (params = 50) => {
      if (typeof params === "object" && params !== null) {
        const query = new URLSearchParams();
        if (params.page !== undefined) query.set("page", params.page);
        if (params.size !== undefined) query.set("size", params.size);
        if (params.limit !== undefined) query.set("limit", params.limit);
        const qs = query.toString();
        return request(`/orders/activity-log${qs ? `?${qs}` : ""}`);
      }
      return request(`/orders/activity-log?limit=${params}`);
    },
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
    getTracking: (magicLinkToken) =>
      request(`/client/tracking?token=${encodeURIComponent(magicLinkToken)}`),
  },
};
