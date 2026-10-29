import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';

import { ApiError } from '../api/client';
import { orderToVisit, ordersToVisits } from '../api/mappers';
import { fetchMyOrders } from '../api/orders';
import type { ApiOrder } from '../api/types';
import type { Visit } from '../types';

// ─── Visitas del técnico, cargadas desde la API ───────────────────────────────
export function useVisits() {
  const [visits, setVisits] = useState<Visit[]>([]);
  const [loading, setLoading] = useState(true);       // primera carga
  const [refreshing, setRefreshing] = useState(false); // pull-to-refresh
  const [error, setError] = useState<string | null>(null);
  const [online, setOnline] = useState(true);
  const mounted = useRef(true);

  const load = useCallback(async (mode: 'initial' | 'refresh' | 'silent') => {
    if (mode === 'initial') setLoading(true);
    if (mode === 'refresh') setRefreshing(true);
    try {
      const orders = await fetchMyOrders();
      if (!mounted.current) return;
      setVisits(ordersToVisits(orders));
      setError(null);
      setOnline(true);
    } catch (e) {
      if (!mounted.current) return;
      const err = e as ApiError;
      setOnline(!(err.kind === 'network' || err.kind === 'timeout'));
      // En una recarga silenciosa no se molesta al usuario si ya hay datos en pantalla
      if (mode !== 'silent') setError(err.message || 'No se pudieron cargar las visitas.');
    } finally {
      if (mounted.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, []);

  useEffect(() => {
    mounted.current = true;
    void load('initial');
    return () => {
      mounted.current = false;
    };
  }, [load]);

  // Al volver a la app desde segundo plano, actualizar la agenda
  useEffect(() => {
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'active') void load('silent');
    });
    return () => sub.remove();
  }, [load]);

  /** Reemplaza una visita con la versión que devolvió el servidor tras un cambio de estado */
  const applyOrder = useCallback((order: ApiOrder) => {
    const next = orderToVisit(order);
    setVisits((prev) =>
      next ? prev.map((v) => (v.id === order.id ? next : v)) : prev.filter((v) => v.id !== order.id),
    );
  }, []);

  return {
    visits,
    loading,
    refreshing,
    error,
    online,
    reload: () => load('initial'),
    refresh: () => load('refresh'),
    applyOrder,
  };
}
