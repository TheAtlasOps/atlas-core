const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8000/api/v1";

async function request(endpoint, options = {}) {
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
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || `Error HTTP ${response.status}`);
  }
  return response.json();
}

export const api = {
  auth: {
    login: (email, password) =>
      request("/auth/login", { method: "POST", body: JSON.stringify({ email, password }) }),
    me: () => request("/auth/me"),
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
  },
  inventory: {
    getSims: (params = {}) => {
      const query = new URLSearchParams(params).toString();
      return request(`/inventory/sims${query ? `?${query}` : ""}`);
    },
    getRouters: (params = {}) => {
      const query = new URLSearchParams(params).toString();
      return request(`/inventory/routers${query ? `?${query}` : ""}`);
    },
    pair: (equipmentId, simCardId, clientId = null) =>
      request("/inventory/pair", {
        method: "POST",
        body: JSON.stringify({
          equipment_id: equipmentId,
          sim_card_id: simCardId,
          client_id: clientId,
          action_type: "EMPAREJAMIENTO",
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
