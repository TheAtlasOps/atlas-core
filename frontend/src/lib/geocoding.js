/**
 * frontend/src/lib/geocoding.js
 *
 * Servicio de geocodificación abierta para órdenes de trabajo en ATLAS FSM.
 * Permite transformar direcciones en coordenadas geográficas (latitud/longitud)
 * sin requerir API keys de pago ni valores predeterminados inventados.
 */

import { isValidCoordinate } from "./mapClustering.js";
import { api } from "./api.js";

/**
 * Normaliza y geocodifica una dirección hacia coordenadas reales.
 * Intenta primero a través del backend (/api/v1/orders/geocode) y, si no está disponible,
 * consulta directamente el servicio abierto de Nominatim OpenStreetMap.
 *
 * @param {string} address - Dirección ingresada por el usuario (ej: "Av. Providencia 1234, Providencia")
 * @returns {Promise<{ success: boolean, lat: number|null, lng: number|null, displayName?: string, error?: string }>}
 */
export async function geocodeAddress(address) {
  if (!address || typeof address !== "string" || !address.trim()) {
    return {
      success: false,
      lat: null,
      lng: null,
      error: "Por favor ingresa una dirección antes de buscar en el mapa.",
    };
  }

  const cleanAddress = address.trim();
  if (cleanAddress.length < 3) {
    return {
      success: false,
      lat: null,
      lng: null,
      error: "La dirección ingresada es demasiado corta para localizarse con precisión.",
    };
  }

  // 1. Intentar a través de la API del backend
  try {
    if (api?.orders?.geocode) {
      const backendRes = await api.orders.geocode(cleanAddress);
      if (backendRes && backendRes.success && isValidCoordinate(backendRes.lat, backendRes.lng)) {
        return {
          success: true,
          lat: Number(backendRes.lat),
          lng: Number(backendRes.lng),
          displayName: backendRes.display_name || cleanAddress,
        };
      }
      if (backendRes && backendRes.success === false && backendRes.error) {
        return {
          success: false,
          lat: null,
          lng: null,
          error: backendRes.error,
        };
      }
    }
  } catch {
    // Si la API del backend falla o no está disponible en este entorno, continuar al fallback directo
  }

  // 2. Fallback directo a Nominatim OpenStreetMap (disponible en navegador)
  if (typeof fetch !== "undefined") {
    try {
      const queryWithCountry = cleanAddress.toLowerCase().includes("chile")
        ? cleanAddress
        : `${cleanAddress}, Chile`;

      const encoded = encodeURIComponent(queryWithCountry);
      const url = `https://nominatim.openstreetmap.org/search?q=${encoded}&format=json&limit=3&countrycodes=cl`;

      const res = await fetch(url, {
        headers: {
          Accept: "application/json",
        },
      });

      if (!res.ok) {
        throw new Error(`HTTP error ${res.status}`);
      }

      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        const topResult = data[0];
        const lat = parseFloat(topResult.lat);
        const lng = parseFloat(topResult.lon);

        if (isValidCoordinate(lat, lng)) {
          return {
            success: true,
            lat,
            lng,
            displayName: topResult.display_name,
          };
        }
      }

      return {
        success: false,
        lat: null,
        lng: null,
        error: "No se pudo localizar la dirección especificada. Por favor verifica la calle, número y comuna, o ubica el marcador manualmente en el mapa.",
      };
    } catch {
      return {
        success: false,
        lat: null,
        lng: null,
        error: "No se pudo conectar con el servicio de geolocalización. Puedes ubicar el marcador manualmente en el mapa.",
      };
    }
  }

  return {
    success: false,
    lat: null,
    lng: null,
    error: "Entorno de red no disponible para geocodificación automática.",
  };
}

/**
 * Parsea y valida una coordenada numérica WGS84.
 */
export function parseCoordinate(val) {
  if (val === null || val === undefined) return null;
  const n = typeof val === "number" ? val : parseFloat(String(val));
  return Number.isNaN(n) ? null : n;
}

/**
 * Formatea coordenadas numéricas con precisión de 6 decimales (~0.1 metros).
 */
export function formatCoordinates(lat, lng) {
  if (!isValidCoordinate(lat, lng)) return "Sin ubicación confirmada";
  const nLat = typeof lat === "number" ? lat : parseFloat(lat);
  const nLng = typeof lng === "number" ? lng : parseFloat(lng);
  return `${nLat.toFixed(6)}, ${nLng.toFixed(6)}`;
}
