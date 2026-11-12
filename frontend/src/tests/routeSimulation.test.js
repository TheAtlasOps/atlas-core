import test from "node:test";
import assert from "node:assert/strict";

import {
  DEMO_ORIGIN,
  calculateBearing,
  interpolateRoute,
  formatDistance,
  formatEta,
  fetchStreetRoute,
  FALLBACK_DEMO_COORDINATES,
  FALLBACK_DEMO_METRICS,
} from "../lib/routeSimulation.js";

test("calculateBearing determina la orientación angular correcta", () => {
  // Rumbo Norte
  const north = calculateBearing([0, 0], [1, 0]);
  assert.equal(Math.round(north), 0);

  // Rumbo Este
  const east = calculateBearing([0, 0], [0, 1]);
  assert.equal(Math.round(east), 90);

  // Rumbo Sur
  const south = calculateBearing([1, 0], [0, 0]);
  assert.equal(Math.round(south), 180);

  // Rumbo Oeste
  const west = calculateBearing([0, 1], [0, 0]);
  assert.equal(Math.round(west), 270);
});

test("interpolateRoute genera interpolación suave para evitar saltos bruscos", () => {
  const points = [
    [-33.42, -70.60],
    [-33.44, -70.65],
  ];

  const interpolated = interpolateRoute(points, 20);
  assert.ok(interpolated.length >= 20);
  assert.deepEqual(interpolated[0], points[0]);
  assert.deepEqual(interpolated[interpolated.length - 1], points[1]);

  // Manejo de valores vacíos o nulos
  assert.deepEqual(interpolateRoute(null), []);
  assert.deepEqual(interpolateRoute([]), []);
  assert.deepEqual(interpolateRoute([[-33.42, -70.60]]), [[-33.42, -70.60]]);
});

test("formatDistance formatea metros y kilómetros con precisión", () => {
  assert.equal(formatDistance(450), "450 m");
  assert.equal(formatDistance(999), "999 m");
  assert.equal(formatDistance(1000), "1.0 km");
  assert.equal(formatDistance(4650), "4.7 km");
  assert.equal(formatDistance(null), "—");
});

test("formatEta formatea duración en minutos u horas de forma legible", () => {
  assert.equal(formatEta(20), "< 1 min");
  assert.equal(formatEta(60), "1 min");
  assert.equal(formatEta(780), "13 min");
  assert.equal(formatEta(3660), "1 h 1 m");
  assert.equal(formatEta(null), "—");
});

test("fetchStreetRoute procesa respuesta GeoJSON de OSRM y mapea [lat, lng]", async () => {
  const originalFetch = globalThis.fetch;

  globalThis.fetch = async () => ({
    ok: true,
    json: async () => ({
      code: "Ok",
      routes: [
        {
          distance: 5200.4,
          duration: 900.2,
          geometry: {
            // OSRM entrega [lng, lat]
            coordinates: [
              [-70.6074, -33.4208],
              [-70.6300, -33.4350],
              [-70.6605, -33.4535],
            ],
          },
          legs: [{ summary: "Av. Providencia" }],
        },
      ],
    }),
  });

  try {
    const result = await fetchStreetRoute(DEMO_ORIGIN, { lat: -33.4535, lng: -70.6605 });
    assert.equal(result.isFallback, false);
    assert.equal(result.distanceMeters, 5200);
    assert.equal(result.durationSeconds, 900);
    // Verificamos que Leaflet recibe [lat, lng]
    assert.deepEqual(result.coordinates[0], [-33.4208, -70.6074]);
    assert.deepEqual(result.coordinates[2], [-33.4535, -70.6605]);
    assert.ok(result.interpolatedCoordinates.length > result.coordinates.length);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("fetchStreetRoute activa fallback determinista seguro si la red u OSRM falla", async () => {
  const originalFetch = globalThis.fetch;

  globalThis.fetch = async () => {
    throw new Error("Network timeout simulation");
  };

  try {
    const result = await fetchStreetRoute(DEMO_ORIGIN, { lat: -33.4535, lng: -70.6605 });
    assert.equal(result.isFallback, true);
    assert.equal(result.distanceMeters, FALLBACK_DEMO_METRICS.distanceMeters);
    assert.deepEqual(result.coordinates, FALLBACK_DEMO_COORDINATES);
    assert.ok(result.interpolatedCoordinates.length > 200);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
