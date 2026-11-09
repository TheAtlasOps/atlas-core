import React, { useEffect, useState } from 'react';
import { Alert, Linking, Platform } from 'react-native';
import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { sendOrderLocation } from '../api/orders';

export const ATLAS_LOCATION_TASK = 'ATLAS_BACKGROUND_GPS_TASK';
const STORAGE_KEY_ACTIVE_ORDER = 'atlas_active_tracking_order_id';

export interface GpsTrackingStatus {
  isTracking: boolean;
  orderId: string | null;
  state: 'idle' | 'starting' | 'active' | 'error';
  lastSentAt: number | null;
  lastLat: number | null;
  lastLng: number | null;
  errorMessage: string | null;
}

let currentTrackingOrderId: string | null = null;
let foregroundIntervalId: ReturnType<typeof setInterval> | null = null;
let lastSentCoords: { lat: number; lng: number; time: number } | null = null;

let trackingStatus: GpsTrackingStatus = {
  isTracking: false,
  orderId: null,
  state: 'idle',
  lastSentAt: null,
  lastLat: null,
  lastLng: null,
  errorMessage: null,
};

type TrackingStatusListener = (status: GpsTrackingStatus) => void;
const listeners = new Set<TrackingStatusListener>();

export function getTrackingStatus(): GpsTrackingStatus {
  return trackingStatus;
}

export function updateTrackingStatus(partial: Partial<GpsTrackingStatus>): void {
  trackingStatus = { ...trackingStatus, ...partial };
  for (const listener of listeners) {
    try {
      listener(trackingStatus);
    } catch {
      // Ignorar errores de listeners individuales
    }
  }
}

export function subscribeTrackingStatus(listener: TrackingStatusListener): () => void {
  listeners.add(listener);
  listener(trackingStatus);
  return () => {
    listeners.delete(listener);
  };
}

export function useGpsTrackingStatus(): GpsTrackingStatus {
  const [status, setStatus] = useState<GpsTrackingStatus>(getTrackingStatus);
  useEffect(() => {
    return subscribeTrackingStatus(setStatus);
  }, []);
  return status;
}

// ─── Tarea en Segundo Plano (Ejecutada por el OS con pantalla bloqueada) ─────
try {
  if (!TaskManager.isTaskDefined(ATLAS_LOCATION_TASK)) {
    TaskManager.defineTask(ATLAS_LOCATION_TASK, async ({ data, error }) => {
      if (error) {
        console.warn('[ATLAS GPS Background Task] Error:', error.message);
        updateTrackingStatus({
          state: 'error',
          errorMessage: 'Error en sensor GPS: ' + error.message,
        });
        return;
      }

      if (data) {
        const { locations } = data as { locations: Location.LocationObject[] };
        const loc = locations?.[locations.length - 1];
        if (!loc) return;

        let orderId = currentTrackingOrderId;
        if (!orderId) {
          orderId = await AsyncStorage.getItem(STORAGE_KEY_ACTIVE_ORDER);
          if (orderId) currentTrackingOrderId = orderId;
        }

        if (orderId) {
          const lat = loc.coords.latitude;
          const lng = loc.coords.longitude;
          const now = Date.now();

          // Evitar ráfagas duplicadas (mínimo 15 segundos entre reportes)
          if (
            lastSentCoords &&
            now - lastSentCoords.time < 15000 &&
            Math.abs(lastSentCoords.lat - lat) < 0.00005 &&
            Math.abs(lastSentCoords.lng - lng) < 0.00005
          ) {
            return;
          }

          try {
            await sendOrderLocation(orderId, lat, lng);
            lastSentCoords = { lat, lng, time: now };
            updateTrackingStatus({
              isTracking: true,
              orderId,
              state: 'active',
              lastSentAt: now,
              lastLat: lat,
              lastLng: lng,
              errorMessage: null,
            });
            console.log(
              `[ATLAS GPS Background] Coordenadas emitidas (${lat.toFixed(4)}, ${lng.toFixed(4)}) para OT ${orderId}`
            );
          } catch (err: any) {
            console.warn('[ATLAS GPS Background] Error al enviar coordenadas al backend:', err?.message || err);
            // Si la orden ya no está EN_RUTA (409 Conflict), fue cancelada o el técnico no está asignado (403/404)
            // o sesión no válida (401), se detiene el seguimiento para proteger la batería y respetar privacidad.
            if (err?.status === 401 || err?.status === 403 || err?.status === 404 || err?.status === 409) {
              const reason =
                err?.status === 401
                  ? 'Sesión no válida o expirada'
                  : err?.status === 403
                  ? 'Técnico no autorizado para esta orden'
                  : err?.status === 409
                  ? 'La orden ya no se encuentra en ruta'
                  : 'Orden no encontrada';
              console.log(`[ATLAS GPS Background] Deteniendo seguimiento para orden ${orderId}: ${reason} (HTTP ${err?.status})`);
              await stopTracking(reason);
            } else {
              // Error transitorio de red, timeout o lectura de almacenamiento: conservar el servicio activo para el próximo tick
              updateTrackingStatus({
                state: 'error',
                errorMessage: 'Problema temporal transmitiendo GPS. Reintentando...',
              });
            }
          }
        }
      }
    });
  }
} catch (e) {
  console.warn('[ATLAS GPS] No se pudo inicializar TaskManager:', e);
}

// ─── Solicitud Explícita de Permisos ──────────────────────────────────────────

export async function requestLocationPermissions(): Promise<boolean> {
  try {
    // 1. Permiso en primer plano (foreground)
    const fg = await Location.getForegroundPermissionsAsync();
    let fgGranted = fg.granted;

    if (!fgGranted) {
      const requested = await Location.requestForegroundPermissionsAsync();
      fgGranted = requested.granted;
    }

    if (!fgGranted) {
      Alert.alert(
        'Permiso de Ubicación Necesario',
        'Atlas Técnico requiere acceso a tu ubicación GPS para que la central y el cliente puedan visualizar tu llegada mientras estás en ruta.',
        [
          { text: 'Cancelar', style: 'cancel' },
          { text: 'Abrir Configuración', onPress: () => Linking.openSettings() },
        ],
      );
      return false;
    }

    // 2. Permiso en segundo plano (background) para soporte con pantalla apagada en Android
    if (Platform.OS === 'android') {
      try {
        const bg = await Location.getBackgroundPermissionsAsync();
        if (!bg.granted) {
          await Location.requestBackgroundPermissionsAsync();
        }
      } catch (bgErr) {
        console.log('[ATLAS GPS] Permiso background no disponible en este entorno (ej: Expo Go):', bgErr);
      }
    }

    return true;
  } catch (err) {
    console.warn('[ATLAS GPS] Error al solicitar permisos:', err);
    return false;
  }
}

// ─── Inicio del Seguimiento (EN_RUTA) ────────────────────────────────────────

export async function startTracking(orderId: string): Promise<boolean> {
  if (!orderId) return false;

  updateTrackingStatus({
    orderId,
    state: 'starting',
    errorMessage: null,
  });

  const hasPermission = await requestLocationPermissions();
  if (!hasPermission) {
    updateTrackingStatus({
      state: 'error',
      errorMessage: 'Permisos de ubicación no concedidos',
    });
    return false;
  }

  currentTrackingOrderId = orderId;
  await AsyncStorage.setItem(STORAGE_KEY_ACTIVE_ORDER, orderId);

  // 1. Envío inicial inmediato de coordenadas actuales
  let initialLocationSent = false;
  try {
    const current = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });
    if (current) {
      await sendOrderLocation(orderId, current.coords.latitude, current.coords.longitude);
      const now = Date.now();
      lastSentCoords = {
        lat: current.coords.latitude,
        lng: current.coords.longitude,
        time: now,
      };
      initialLocationSent = true;
      updateTrackingStatus({
        isTracking: true,
        orderId,
        state: 'active',
        lastSentAt: now,
        lastLat: current.coords.latitude,
        lastLng: current.coords.longitude,
        errorMessage: null,
      });
      console.log(`[ATLAS GPS Foreground] Posición inicial enviada para orden ${orderId}`);
    }
  } catch (err: any) {
    console.warn('[ATLAS GPS Foreground] No se pudo obtener ubicación inicial:', err?.message || err);
    if (err?.status === 401 || err?.status === 403 || err?.status === 409) {
      const reason =
        err?.status === 401
          ? 'Sesión no válida o expirada'
          : err?.status === 403
          ? 'Técnico no autorizado para esta orden'
          : 'La orden ya no se encuentra en ruta';
      await stopTracking(reason);
      return false;
    }
    updateTrackingStatus({
      state: 'error',
      errorMessage: 'No se pudo obtener señal GPS inicial. Reintentando...',
    });
  }

  // 2. Iniciar servicio nativo en segundo plano con notificación persistente (Android Foreground Service)
  let backgroundStarted = false;
  try {
    if (!TaskManager.isTaskDefined(ATLAS_LOCATION_TASK)) {
      console.warn('[ATLAS GPS] La tarea ATLAS_LOCATION_TASK no está definida en TaskManager.');
    } else {
      const isStarted = await Location.hasStartedLocationUpdatesAsync(ATLAS_LOCATION_TASK);
      if (!isStarted) {
        await Location.startLocationUpdatesAsync(ATLAS_LOCATION_TASK, {
          accuracy: Location.Accuracy.High,
          timeInterval: 30000, // Cada 30 segundos
          distanceInterval: 0, // 0 metros: permite emitir actualizaciones por tiempo incluso si el vehículo está detenido
          deferredUpdatesInterval: 30000,
          deferredUpdatesDistance: 0,
          showsBackgroundLocationIndicator: true,
          foregroundService: {
            notificationTitle: 'Atlas Técnico en ruta',
            notificationBody: 'Compartiendo ubicación en tiempo real con central y cliente.',
            notificationColor: '#F97316',
            killServiceOnDestroy: false,
          },
        });
        console.log('[ATLAS GPS] Servicio background de ubicación iniciado exitosamente.');
      } else {
        console.log('[ATLAS GPS] Servicio background de ubicación ya se encontraba activo.');
      }
      backgroundStarted = true;
    }
  } catch (bgErr) {
    console.warn('[ATLAS GPS] Fallback a seguimiento en primer plano (sin background daemon):', bgErr);
  }

  if (backgroundStarted || initialLocationSent) {
    updateTrackingStatus({
      isTracking: true,
      orderId,
      state: 'active',
    });
  }

  // 3. Fallback de intervalo en primer plano ÚNICAMENTE si el servicio background nativo no está disponible
  if (!backgroundStarted && !foregroundIntervalId) {
    foregroundIntervalId = setInterval(async () => {
      if (!currentTrackingOrderId) return;
      try {
        const loc = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        if (loc && currentTrackingOrderId) {
          const lat = loc.coords.latitude;
          const lng = loc.coords.longitude;
          const now = Date.now();

          // Evitar ráfagas duplicadas (mínimo 15 segundos entre reportes)
          if (
            lastSentCoords &&
            now - lastSentCoords.time < 15000 &&
            Math.abs(lastSentCoords.lat - lat) < 0.00005 &&
            Math.abs(lastSentCoords.lng - lng) < 0.00005
          ) {
            return;
          }

          await sendOrderLocation(currentTrackingOrderId, lat, lng);
          lastSentCoords = { lat, lng, time: now };
          updateTrackingStatus({
            isTracking: true,
            orderId: currentTrackingOrderId,
            state: 'active',
            lastSentAt: now,
            lastLat: lat,
            lastLng: lng,
            errorMessage: null,
          });
          console.log(`[ATLAS GPS Fallback] Coordenadas emitidas (${lat.toFixed(4)}, ${lng.toFixed(4)}) para OT ${currentTrackingOrderId}`);
        }
      } catch (err: any) {
        console.warn('[ATLAS GPS Fallback] Error obteniendo coordenadas:', err?.message || err);
        if (err?.status === 401 || err?.status === 403 || err?.status === 404 || err?.status === 409) {
          const reason =
            err?.status === 401
              ? 'Sesión no válida o expirada'
              : err?.status === 403
              ? 'Técnico no autorizado para esta orden'
              : err?.status === 409
              ? 'La orden ya no se encuentra en ruta'
              : 'Orden no encontrada';
          console.log(`[ATLAS GPS Fallback] Deteniendo seguimiento para orden ${currentTrackingOrderId}: ${reason}`);
          void stopTracking(reason);
        } else {
          updateTrackingStatus({
            state: 'error',
            errorMessage: 'Problema temporal transmitiendo GPS. Reintentando...',
          });
        }
      }
    }, 30000);
  }

  return true;
}

// ─── Detención del Seguimiento (EN_SITIO / COMPLETADA / LOGOUT) ───────────────

export async function stopTracking(errorReason?: string): Promise<void> {
  currentTrackingOrderId = null;
  lastSentCoords = null;
  await AsyncStorage.removeItem(STORAGE_KEY_ACTIVE_ORDER);

  // Limpiar timer de primer plano
  if (foregroundIntervalId) {
    clearInterval(foregroundIntervalId);
    foregroundIntervalId = null;
  }

  // Detener tarea en segundo plano
  try {
    if (TaskManager.isTaskDefined(ATLAS_LOCATION_TASK)) {
      const isStarted = await Location.hasStartedLocationUpdatesAsync(ATLAS_LOCATION_TASK);
      if (isStarted) {
        await Location.stopLocationUpdatesAsync(ATLAS_LOCATION_TASK);
        console.log('[ATLAS GPS] Servicio background detenido.');
      }
    }
  } catch (err) {
    console.warn('[ATLAS GPS] Error al detener tarea background:', err);
  }

  updateTrackingStatus({
    isTracking: false,
    orderId: null,
    state: errorReason ? 'error' : 'idle',
    errorMessage: errorReason || null,
  });
}

export function getActiveTrackingOrderId(): string | null {
  return currentTrackingOrderId;
}

export async function isTrackingActive(orderId?: string): Promise<boolean> {
  if (orderId && currentTrackingOrderId !== orderId) {
    const saved = await AsyncStorage.getItem(STORAGE_KEY_ACTIVE_ORDER);
    if (saved !== orderId) return false;
  }
  if (currentTrackingOrderId) return true;
  try {
    if (TaskManager.isTaskDefined(ATLAS_LOCATION_TASK)) {
      return await Location.hasStartedLocationUpdatesAsync(ATLAS_LOCATION_TASK);
    }
  } catch {
    // ignorar
  }
  return false;
}
