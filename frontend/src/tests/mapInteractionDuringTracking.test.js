import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  startTracking,
  resetAllTrackings,
  getTracking,
  useRouteTracking,
  useTrackingRouteCoordinates,
  computeTrackingSnapshot,
  SIMULATION_DURATION_MS,
} from "../lib/routeTrackingManager.js";
import { DEMO_ORIGIN } from "../lib/routeSimulation.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe("ATLAS FSM — Interacción con Marcadores y Popups durante Seguimiento V2", () => {
  const dispatchBoardCode = fs.readFileSync(
    path.join(__dirname, "../pages/DispatchBoard.jsx"),
    "utf-8"
  );
  const routeSimulationModalCode = fs.readFileSync(
    path.join(__dirname, "../components/ui/RouteSimulationModal.jsx"),
    "utf-8"
  );
  const routeTrackingManagerCode = fs.readFileSync(
    path.join(__dirname, "../lib/routeTrackingManager.js"),
    "utf-8"
  );

  it("1. DispatchBoard: ActiveZonesCard aísla el hook de telemetría useRouteTracking para evitar re-renders masivos a 60 FPS", () => {
    // ActiveZonesCard no debe llamar a useRouteTracking en su raíz, pues re-renderizaría todos los marcadores en cada tick
    const activeZonesCardBody = dispatchBoardCode.substring(
      dispatchBoardCode.indexOf("export function ActiveZonesCard"),
      dispatchBoardCode.indexOf("function DonutChartCard")
    );

    assert.ok(
      !activeZonesCardBody.includes("const trackingSnapshot = useRouteTracking"),
      "ActiveZonesCard NO debe consumir useRouteTracking en su cuerpo principal para no recrear los marcadores en cada frame"
    );

    assert.ok(
      activeZonesCardBody.includes("useTrackingRouteCoordinates(trackingOrderId)"),
      "ActiveZonesCard debe utilizar useTrackingRouteCoordinates para calcular allMapPoints sin suscribirse a la animación del vehículo"
    );

    assert.ok(
      dispatchBoardCode.includes("function ActiveTrackingMapLayer"),
      "Debe existir ActiveTrackingMapLayer para aislar el renderizado del vehículo y la cámara"
    );

    assert.ok(
      dispatchBoardCode.includes("function ConnectedTrackingFloatingCard"),
      "Debe existir ConnectedTrackingFloatingCard para aislar la telemetría sin afectar el árbol del mapa"
    );
  });

  it("2. Polylines de ruta tienen interactive:false para no interceptar clics sobre marcadores en calles", () => {
    // En DispatchBoard
    assert.ok(
      dispatchBoardCode.includes("interactive: false"),
      "DispatchBoard debe configurar interactive:false en las polylines de seguimiento"
    );

    // En RouteSimulationModal
    assert.ok(
      routeSimulationModalCode.includes("interactive: false"),
      "RouteSimulationModal debe configurar interactive:false en las polylines de seguimiento"
    );
  });

  it("3. Marcador de destino de seguimiento no bloquea el marcador de la orden subyacente", () => {
    assert.ok(
      dispatchBoardCode.includes("makeDestinationIcon") &&
        dispatchBoardCode.includes("interactive={false}"),
      "El icono de destino de la capa de tracking debe tener interactive={false} para permitir hacer clic en la orden"
    );
  });

  it("4. VehicleCameraController pausa el seguimiento de cámara (panTo) cuando hay un popup abierto", () => {
    // Comprobar detección de popupopen en DispatchBoard
    assert.ok(
      dispatchBoardCode.includes('map.on("popupopen"') &&
        dispatchBoardCode.includes('map.on("popupclose"'),
      "VehicleCameraController en DispatchBoard debe escuchar popupopen/popupclose"
    );

    assert.ok(
      dispatchBoardCode.includes("isPopupOpenRef.current") &&
        dispatchBoardCode.includes("if (isPopupOpenRef.current) return"),
      "VehicleCameraController debe detener map.panTo cuando isPopupOpenRef sea true"
    );

    // Comprobar detección de popupopen en RouteSimulationModal
    assert.ok(
      routeSimulationModalCode.includes('map.on("popupopen"') &&
        routeSimulationModalCode.includes("if (isPopupOpenRef.current) return"),
      "VehicleCameraController en RouteSimulationModal debe detener map.panTo cuando un popup esté abierto"
    );
  });

  it("5. VehicleCameraController implementa throttle de panTo para no saturar Leaflet ni competir con clics", () => {
    assert.ok(
      dispatchBoardCode.includes("lastPanTimeRef") &&
        dispatchBoardCode.includes("750"),
      "VehicleCameraController debe limitar la cadencia de panTo con throttle temporal"
    );
  });

  it("6. routeTrackingManager: useRouteTracking no suscribe listeners si orderId es nulo", () => {
    assert.ok(
      routeTrackingManagerCode.includes("if (!safeId) return;"),
      "useRouteTracking debe retornar temprano si safeId es nulo para no registrar suscripciones ociosas"
    );
  });

  it("7. routeTrackingManager: stepEngine optimiza la cadencia de notificaciones visuales", () => {
    assert.ok(
      routeTrackingManagerCode.includes("lastNotifyTime") &&
        routeTrackingManagerCode.includes(">= 40"),
      "stepEngine debe limitar notificaciones a oyentes a ~40ms para asegurar disponibilidad del hilo de eventos"
    );
  });

  it("8. El motor de simulación avanza deterministamente y permite lectura de snapshots sin mutaciones", () => {
    resetAllTrackings();
    const testOrder = {
      id: "ot-interaction-test",
      order_number: "OT-INTERACT-99",
      client: "Empresa de Pruebas",
      status: "EN_RUTA",
      lat: -33.4372,
      lng: -70.6506,
    };

    const record = startTracking(testOrder);
    assert.ok(record, "startTracking debe iniciar un registro válido");

    const snapshot = computeTrackingSnapshot(record, record.startedAt + 30000);
    assert.equal(typeof snapshot.progress, "number");
    assert.ok(snapshot.progress > 0 && snapshot.progress < 1);
    assert.equal(snapshot.isArrived, false);
    assert.ok(Array.isArray(snapshot.currentCoord));
    assert.equal(snapshot.currentCoord.length, 2);

    resetAllTrackings();
  });
});
