import { useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

function ClientMapAutoBounds({ clientPos, techPos }) {
  const map = useMap();
  useEffect(() => {
    const points = [];
    if (clientPos && !isNaN(clientPos[0]) && !isNaN(clientPos[1])) points.push(clientPos);
    if (techPos && !isNaN(techPos[0]) && !isNaN(techPos[1])) points.push(techPos);
    if (points.length > 1) {
      const bounds = L.latLngBounds(points);
      map.fitBounds(bounds, { padding: [36, 36], maxZoom: 15 });
    } else if (points.length === 1) {
      map.setView(points[0], 14);
    }
  }, [map, clientPos, techPos]);
  return null;
}

const clientDestinationIcon = L.divIcon({
  className: "",
  html: `
    <div style="
      width: 28px; height: 28px; border-radius: 9999px;
      background: #0f172a; border: 2px solid #f97316;
      box-shadow: 0 4px 10px rgba(249, 115, 22, 0.4);
      display: flex; align-items: center; justify-content: center;
      color: #ffffff; font-size: 13px;
    ">📍</div>`,
  iconSize: [28, 28],
  iconAnchor: [14, 14],
  popupAnchor: [0, -14],
});

const technicianLiveIcon = L.divIcon({
  className: "",
  html: `
    <div style="
      position: relative;
      width: 32px; height: 32px; border-radius: 9999px;
      background: #ea580c; border: 2.5px solid #ffffff;
      box-shadow: 0 4px 12px rgba(234, 88, 12, 0.5);
      display: flex; align-items: center; justify-content: center;
      color: #ffffff; font-size: 15px;
    ">
      <span>🚐</span>
      <span style="
        position: absolute; top: -2px; right: -2px;
        width: 9px; height: 9px; border-radius: 9999px;
        background: #10b981; border: 1.5px solid #ffffff;
      "></span>
    </div>`,
  iconSize: [32, 32],
  iconAnchor: [16, 16],
  popupAnchor: [0, -18],
});

export default function LiveTrackingMap({ clientPos, techPos, address, technicianName }) {
  return (
    <div className="h-64 sm:h-72 w-full rounded-xl overflow-hidden border border-slate-200 dark:border-gray-700 relative z-0">
      <MapContainer
        center={techPos || clientPos || [-33.4489, -70.6693]}
        zoom={14}
        style={{ height: "100%", width: "100%" }}
        scrollWheelZoom={false}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <ClientMapAutoBounds clientPos={clientPos} techPos={techPos} />

        {clientPos && (
          <Marker position={clientPos} icon={clientDestinationIcon}>
            <Popup>
              <div className="text-xs font-sans">
                <strong className="block text-slate-900">Destino del Servicio</strong>
                <span className="text-slate-600">{address}</span>
              </div>
            </Popup>
          </Marker>
        )}

        {techPos && (
          <Marker position={techPos} icon={technicianLiveIcon}>
            <Popup>
              <div className="text-xs font-sans">
                <strong className="block text-slate-900">
                  {technicianName || "Especialista en ruta"}
                </strong>
                <span className="text-slate-600">En camino a su domicilio</span>
              </div>
            </Popup>
          </Marker>
        )}
      </MapContainer>
    </div>
  );
}
