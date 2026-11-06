import { Alert, Linking, Platform } from 'react-native';
import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { sendOrderLocation } from '../api/orders';

export const ATLAS_LOCATION_TASK = 'ATLAS_BACKGROUND_GPS_TASK';
const STORAGE_KEY_ACTIVE_ORDER = 'atlas_active_tracking_order_id';

let currentTrackingOrderId: string | null = null;
let foregroundIntervalId: ReturnType<typeof setInterval> | null = null;
let lastSentCoords: { lat: number; lng: number; time: number } | null = null;

// ─── Tarea en Segundo Plano (Ejecutada por el OS con pantalla bloqueada) ─────
try {
  if (!TaskManager.isTaskDefined(ATLAS_LOCATION_TASK)) {
    TaskManager.defineTask(ATLAS_LOCATION_TASK, async ({ data, error }) => {
      if (error) {
        console.warn('[ATLAS GPS Background Task] Error:', error.message);
        return;
      }

      if (data) {
        const { locations } = data as { locations: Location.LocationObject[] };
        const loc = locations?.[locations.length - 1];
        if (!loc) return;

        let orderId = currentTrackingOrderId;
        if (!orderId) {
          orderId = await AsyncStorage.getItem(STORAGE_KEY_ACTIVE_ORDER);
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
            console.log(`[ATLAS GPS Background] Coordenadas emitidas (${lat}, ${lng}) para OT ${orderId}`);
          } catch (err) {
            console.warn('[ATLAS GPS Background] Error al enviar coordenadas al backend:', err);
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
  const hasPermission = await requestLocationPermissions();
  if (!hasPermission) return false;

  currentTrackingOrderId = orderId;
  await AsyncStorage.setItem(STORAGE_KEY_ACTIVE_ORDER, orderId);

  // 1. Envío inicial inmediato de coordenadas actuales
  try {
    const current = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });
    if (current) {
      await sendOrderLocation(orderId, current.coords.latitude, current.coords.longitude);
      lastSentCoords = {
        lat: current.coords.latitude,
        lng: current.coords.longitude,
        time: Date.now(),
      };
      console.log(`[ATLAS GPS] Posición inicial enviada para orden ${orderId}`);
    }
  } catch (err) {
    console.warn('[ATLAS GPS] No se pudo obtener ubicación inicial:', err);
  }

  // 2. Iniciar servicio en segundo plano con notificación persistente (Android Foreground Service)
  let backgroundStarted = false;
  try {
    const isRegistered = await TaskManager.isTaskRegisteredAsync(ATLAS_LOCATION_TASK);
    if (isRegistered) {
      await Location.startLocationUpdatesAsync(ATLAS_LOCATION_TASK, {
        accuracy: Location.Accuracy.Balanced,
        timeInterval: 30000, // Cada 30 segundos
        distanceInterval: 15, // O cada 15 metros
        showsBackgroundLocationIndicator: true,
        foregroundService: {
          notificationTitle: 'Atlas Técnico en ruta',
          notificationBody: 'Compartiendo ubicación en tiempo real con central y cliente.',
          notificationColor: '#F97316',
        },
      });
      backgroundStarted = true;
      console.log('[ATLAS GPS] Servicio background de ubicación iniciado exitosamente.');
    }
  } catch (bgErr) {
    console.log('[ATLAS GPS] Fallback a seguimiento en primer plano (Expo Go / sin background daemon):', bgErr);
  }

  // 3. Fallback de intervalo en primer plano si background no está disponible o para Expo Go
  if (!foregroundIntervalId) {
    foregroundIntervalId = setInterval(async () => {
      if (!currentTrackingOrderId) return;
      try {
        const loc = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        if (loc && currentTrackingOrderId) {
          const lat = loc.coords.latitude;
          const lng = loc.coords.longitude;
          await sendOrderLocation(currentTrackingOrderId, lat, lng);
          lastSentCoords = { lat, lng, time: Date.now() };
        }
      } catch (err) {
        console.warn('[ATLAS GPS Polling] Error obteniendo coordenadas:', err);
      }
    }, 30000);
  }

  return true;
}

// ─── Detención del Seguimiento (EN_SITIO / COMPLETADA / LOGOUT) ───────────────

export async function stopTracking(): Promise<void> {
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
    const isStarted = await Location.hasStartedLocationUpdatesAsync(ATLAS_LOCATION_TASK);
    if (isStarted) {
      await Location.stopLocationUpdatesAsync(ATLAS_LOCATION_TASK);
      console.log('[ATLAS GPS] Servicio background detenido.');
    }
  } catch (err) {
    console.log('[ATLAS GPS] Error al detener tarea background:', err);
  }
}

export function getActiveTrackingOrderId(): string | null {
  return currentTrackingOrderId;
}
