import { apiRequest } from './client';
import type { ApiOrder, ApiOrderList, ApiOrderStatus } from './types';

// ─── Órdenes de trabajo ───────────────────────────────────────────────────────
const PAGE_SIZE = 100; // máximo permitido por el backend
const MAX_PAGES = 5;

export async function fetchMyOrders(): Promise<ApiOrder[]> {
  const all: ApiOrder[] = [];
  for (let page = 1; page <= MAX_PAGES; page++) {
    const res = await apiRequest<ApiOrderList>(`/orders?size=${PAGE_SIZE}&page=${page}`);
    all.push(...res.items);
    if (page >= res.pages) break;
  }
  return all;
}

/** Cambia el estado de una orden (EN_SITIO, COMPLETADA, ...). Devuelve la orden actualizada. */
export function updateOrderStatus(
  orderId: string,
  newStatus: ApiOrderStatus,
  comment?: string,
): Promise<ApiOrder> {
  return apiRequest<ApiOrder>(`/orders/${orderId}/status`, {
    method: 'PATCH',
    body: { new_status: newStatus, ...(comment ? { comment } : {}) },
  });
}
