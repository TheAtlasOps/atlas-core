/**
 * frontend/src/lib/routeSimulation.js
 *
 * Utilidades para la demostración visual de ruteo y telemetría simulada
 * de vehículos técnicos hacia el destino de una orden de trabajo (ATLAS FSM).
 * Utiliza OSRM (Open Source Routing Machine) sobre OpenStreetMap con fallback determinista.
 */

// Origen de demostración: Base de Despacho ATLAS (Av. Providencia / Metro Tobalaba, Santiago)
export const DEMO_ORIGIN = {
  lat: -33.4208,
  lng: -70.6074,
  label: "Base Operativa ATLAS (Providencia)",
  address: "Av. Providencia 2653, Providencia",
};

/**
 * Ruta de respaldo precalculada por avenidas de Santiago (Av. Providencia -> Costanera -> Santiago Centro)
 * Garantiza que la demostración académica funcione al 100% incluso sin internet o si OSRM tiene latencia.
 */
export const FALLBACK_DEMO_COORDINATES = [
  [-33.4208, -70.6074],
  [-33.4215, -70.6092],
  [-33.4223, -70.6121],
  [-33.4231, -70.6155],
  [-33.4238, -70.6192],
  [-33.4247, -70.6234],
  [-33.4255, -70.6272],
  [-33.4264, -70.6315],
  [-33.4276, -70.6358],
  [-33.4292, -70.6394],
  [-33.4312, -70.6425],
  [-33.4335, -70.6449],
  [-33.4358, -70.6468],
  [-33.4382, -70.6485],
  [-33.4405, -70.6502],
  [-33.4428, -70.6521],
  [-33.4452, -70.6540],
  [-33.4474, -70.6558],
  [-33.4496, -70.6575],
  [-33.4518, -70.6592],
  [-33.4535, -70.6605],
];

export const FALLBACK_DEMO_METRICS = {
  distanceMeters: 4650,
  durationSeconds: 780, // ~13 minutos en tráfico normal
};

// Destino predefinido de la ruta de demostración de respaldo (Santiago Centro)
export const FALLBACK_DEMO_DESTINATION = {
  lat: -33.4535,
  lng: -70.6605,
};

/**
 * Tolerancia máxima en grados para considerar que un origen y destino
 * corresponden exclusivamente al recorrido de demostración de respaldo (~350 metros).
 */
export const FALLBACK_TOLERANCE_DEG = 0.0035;

/**
 * Verifica si el par origen/destino coincide con el recorrido predefinido de respaldo
 * dentro de un margen estricto de tolerancia.
 */
export function matchesFallbackRoute(origin, destination, toleranceDeg = FALLBACK_TOLERANCE_DEG) {
  if (
    !Number.isFinite(origin?.lat) ||
    !Number.isFinite(origin?.lng) ||
    !Number.isFinite(destination?.lat) ||
    !Number.isFinite(destination?.lng)
  ) {
    return false;
  }
  const dOriginLat = Math.abs(origin.lat - DEMO_ORIGIN.lat);
  const dOriginLng = Math.abs(origin.lng - DEMO_ORIGIN.lng);
  const dDestLat = Math.abs(destination.lat - FALLBACK_DEMO_DESTINATION.lat);
  const dDestLng = Math.abs(destination.lng - FALLBACK_DEMO_DESTINATION.lng);

  return (
    dOriginLat <= toleranceDeg &&
    dOriginLng <= toleranceDeg &&
    dDestLat <= toleranceDeg &&
    dDestLng <= toleranceDeg
  );
}

/**
 * Calcula el ángulo de rumbo (bearing en grados 0-360) entre dos coordenadas [lat, lng].
 * Permite orientar el icono del vehículo según el sentido de avance en la calle.
 */
export function calculateBearing(start, end) {
  if (!start || !end) return 0;
  const lat1 = (start[0] * Math.PI) / 180;
  const lon1 = (start[1] * Math.PI) / 180;
  const lat2 = (end[0] * Math.PI) / 180;
  const lon2 = (end[1] * Math.PI) / 180;

  const dLon = lon2 - lon1;
  const y = Math.sin(dLon) * Math.cos(lat2);
  const x =
    Math.cos(lat1) * Math.sin(lat2) -
    Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon);

  const radians = Math.atan2(y, x);
  const degrees = (radians * 180) / Math.PI;
  return (degrees + 360) % 360;
}

/**
 * Subdivide e interpola la polilínea en pasos suaves para evitar saltos bruscos
 * entre vértices de OSRM muy separados.
 */
export function interpolateRoute(points, totalSteps = 240) {
  if (!Array.isArray(points) || points.length < 2) return points || [];
  if (points.length >= totalSteps) return points;

  const result = [];
  const segments = points.length - 1;
  const stepsPerSegment = Math.max(1, Math.floor(totalSteps / segments));

  for (let i = 0; i < segments; i++) {
    const p1 = points[i];
    const p2 = points[i + 1];

    for (let step = 0; step < stepsPerSegment; step++) {
      const t = step / stepsPerSegment;
      const lat = p1[0] + (p2[0] - p1[0]) * t;
      const lng = p1[1] + (p2[1] - p1[1]) * t;
      result.push([lat, lng]);
    }
  }

  result.push(points[points.length - 1]);
  return result;
}

/**
 * Consulta la ruta de conducción real por calles a OSRM.
 * Devuelve la lista de coordenadas Leaflet [lat, lng], distancia y duración.
 */
export async function fetchStreetRoute(origin, destination, { timeoutMs = 4500 } = {}) {
  if (!origin?.lat || !origin?.lng || !destination?.lat || !destination?.lng) {
    throw new Error("Coordenadas de origen o destino no válidas para calcular la ruta.");
  }

  // Controlador de aborto con timeout defensivo
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  const url = `https://router.project-osrm.org/route/v1/driving/${origin.lng},${origin.lat};${destination.lng},${destination.lat}?overview=full&geometries=geojson`;

  try {
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timer);

    if (!res.ok) {
      throw new Error(`Servidor de ruteo respondió con código ${res.status}`);
    }

    const data = await res.json();
    if (data.code !== "Ok" || !data.routes || data.routes.length === 0) {
      throw new Error("No se encontró una ruta vial transitable entre los puntos indicados.");
    }

    const route = data.routes[0];
    // OSRM devuelve [lng, lat]; Leaflet requiere [lat, lng]
    const rawCoords = route.geometry.coordinates.map(([lng, lat]) => [lat, lng]);

    return {
      coordinates: rawCoords,
      interpolatedCoordinates: interpolateRoute(rawCoords, 260),
      distanceMeters: Math.round(route.distance),
      durationSeconds: Math.round(route.duration),
      isFallback: false,
      summary: route.legs?.[0]?.summary || "Ruta vial optimizada",
    };
  } catch (err) {
    clearTimeout(timer);

    // Si la llamada falla o se cancela por timeout, verificar si podemos ofrecer la ruta de respaldo
    // (o si se especificó el origen demo)
    console.warn("[ATLAS Route Simulation] Error consultando OSRM:", err.message);

    // Limitar el fallback offline exclusivamente al origen y destino predefinidos de esa ruta
    if (matchesFallbackRoute(origin, destination)) {
      return {
        coordinates: FALLBACK_DEMO_COORDINATES,
        interpolatedCoordinates: interpolateRoute(FALLBACK_DEMO_COORDINATES, 260),
        distanceMeters: FALLBACK_DEMO_METRICS.distanceMeters,
        durationSeconds: FALLBACK_DEMO_METRICS.durationSeconds,
        isFallback: true,
        summary: "Ruta de demostración optimizada (Modo respaldo)",
      };
    }

    throw new Error(
      "No fue posible calcular la ruta vial por calles en este momento. Revisa tu conexión a internet o reintenta."
    );
  }
}

/** Formatea distancia en metros a formato legible (km o m) */
export function formatDistance(meters) {
  if (meters === null || meters === undefined || isNaN(meters)) return "—";
  if (meters < 1000) {
    return `${Math.round(meters)} m`;
  }
  return `${(meters / 1000).toFixed(1)} km`;
}

/** Formatea duración en segundos a minutos u horas */
export function formatEta(seconds) {
  if (seconds === null || seconds === undefined || isNaN(seconds)) return "—";
  if (seconds <= 30) return "< 1 min";
  const mins = Math.ceil(seconds / 60);
  if (mins < 60) return `${mins} min`;
  const hrs = Math.floor(mins / 60);
  const remMins = mins % 60;
  return `${hrs} h ${remMins} m`;
}

// ─── Generadores de Iconos Leaflet para Simulación de Ruteo ─────────────────

export function makeOriginIcon(LInstance) {
  const Leaflet = LInstance || (typeof window !== "undefined" ? window.L : null);
  if (!Leaflet?.divIcon) return null;

  return Leaflet.divIcon({
    className: "atlas-sim-origin-icon",
    html: `
      <div style="
        position: relative;
        width: 34px; height: 34px; border-radius: 10px;
        background: #0f172a; border: 2px solid #38bdf8;
        box-shadow: 0 4px 12px rgba(15, 23, 42, 0.6);
        display: flex; align-items: center; justify-content: center;
        color: #38bdf8; font-size: 16px;
      ">
        🏢
      </div>`,
    iconSize: [34, 34],
    iconAnchor: [17, 17],
    popupAnchor: [0, -18],
  });
}

export function makeDestinationIcon(color = "#f97316", LInstance) {
  const Leaflet = LInstance || (typeof window !== "undefined" ? window.L : null);
  if (!Leaflet?.divIcon) return null;

  return Leaflet.divIcon({
    className: "atlas-sim-dest-icon",
    html: `
      <div style="
        position: relative;
        width: 36px; height: 36px; border-radius: 9999px;
        background: #0f172a; border: 2.5px solid ${color};
        box-shadow: 0 6px 14px rgba(249, 115, 22, 0.45);
        display: flex; align-items: center; justify-content: center;
        color: #ffffff; font-size: 17px;
      ">
        📍
      </div>`,
    iconSize: [36, 36],
    iconAnchor: [18, 18],
    popupAnchor: [0, -20],
  });
}

export function makeVehicleIcon(bearing = 0, isMoving = false, isArrived = false, LInstance) {
  const Leaflet = LInstance || (typeof window !== "undefined" ? window.L : null);
  if (!Leaflet?.divIcon) return null;

  const normalizedBearing = ((Math.round(bearing) % 360) + 360) % 360;
  const isWestbound = normalizedBearing >= 180 && normalizedBearing < 360;
  const flipX = isWestbound ? -1 : 1;

  // Compensación de orientación 3D isométrica:
  // Heading este (90°) u oeste (270°) es horizontal neutro (0° tilt)
  // Heading norte (0° o 360°) inclina sutilmente el frente hacia arriba
  // Heading sur (180°) inclina sutilmente el frente hacia abajo
  let tilt = 0;
  if (isWestbound) {
    tilt = ((normalizedBearing - 270) / 90) * 18;
  } else {
    tilt = ((normalizedBearing - 90) / 90) * 18;
  }
  tilt = Math.max(-20, Math.min(20, Math.round(tilt)));

  const beaconHtml = isMoving && !isArrived
    ? `<div style="
        position: absolute;
        top: 22%;
        left: 68%;
        transform: translate(-50%, -50%);
        width: 8px;
        height: 8px;
        border-radius: 9999px;
        background: #f97316;
        box-shadow: 0 0 8px #f97316, 0 0 16px #ea580c;
        animation: atlasBeaconStrobe 0.75s ease-in-out infinite;
        pointer-events: none;
        z-index: 3;
      "></div>`
    : "";

  const arrivedBadgeHtml = isArrived
    ? `<div style="
        position: absolute;
        top: -6px;
        right: -4px;
        width: 18px;
        height: 18px;
        border-radius: 9999px;
        background: #10b981;
        border: 2px solid #ffffff;
        box-shadow: 0 2px 8px rgba(16, 185, 129, 0.75);
        display: flex;
        align-items: center;
        justify-content: center;
        color: #ffffff;
        font-size: 11px;
        font-weight: 800;
        z-index: 4;
      ">✓</div>`
    : "";

  const shadowHtml = `<div style="
    position: absolute;
    bottom: 1px;
    left: 10%;
    width: 80%;
    height: 8px;
    border-radius: 9999px;
    background: rgba(15, 23, 42, 0.45);
    filter: blur(2px);
    z-index: 1;
  "></div>`;

  return Leaflet.divIcon({
    className: "atlas-sim-vehicle-icon",
    html: `
      <div style="
        position: relative;
        width: 52px;
        height: 38px;
        display: flex;
        align-items: center;
        justify-content: center;
        filter: drop-shadow(0 4px 10px rgba(0, 0, 0, 0.35));
      ">
        ${shadowHtml}
        <div style="
          position: relative;
          width: 52px;
          height: 38px;
          transform: scaleX(${flipX}) rotate(${tilt}deg);
          transform-origin: center center;
          transition: transform 0.22s ease-out;
          z-index: 2;
        ">
          <img
            src="/truck-atlas.png"
            alt="Camioneta ATLAS FSM"
            style="
              width: 100%;
              height: 100%;
              object-fit: contain;
              display: block;
              user-select: none;
              -webkit-user-drag: none;
            "
          />
          ${beaconHtml}
        </div>
        ${arrivedBadgeHtml}
      </div>`,
    iconSize: [52, 38],
    iconAnchor: [26, 19],
    popupAnchor: [0, -22],
  });
}
