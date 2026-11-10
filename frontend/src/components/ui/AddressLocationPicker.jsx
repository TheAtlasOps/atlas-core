import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  Search,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Crosshair,
  RotateCcw,
} from "lucide-react";
import { MapContainer, TileLayer, Marker, useMap, useMapEvents } from "react-leaflet";
import L from "leaflet";
import { geocodeAddress, formatCoordinates } from "../../lib/geocoding.js";
import { isValidCoordinate } from "../../lib/mapClustering.js";

// Controlador de eventos de clic en el mapa para ubicar manualmente el marcador
function MapClickHandler({ onSelectPosition }) {
  useMapEvents({
    click(e) {
      if (e?.latlng && onSelectPosition) {
        onSelectPosition(e.latlng.lat, e.latlng.lng);
      }
    },
  });
  return null;
}

// Recentra el mapa cuando cambian las coordenadas confirmadas
function MapRecenter({ lat, lng }) {
  const map = useMap();
  useEffect(() => {
    if (isValidCoordinate(lat, lng)) {
      map.setView([lat, lng], 15, { animate: true });
    }
  }, [map, lat, lng]);
  return null;
}

/**
 * Componente interactivo para geolocalizar direcciones al crear o editar órdenes de trabajo.
 * Permite:
 * 1. Buscar dirección mediante geocodificación abierta.
 * 2. Visualizar la posición en un mapa interactivo.
 * 3. Ajustar manualmente el marcador arrastrándolo o haciendo clic en el mapa.
 * 4. Mostrar alertas claras si una dirección no es encontrada.
 */
export default function AddressLocationPicker({
  address = "",
  onAddressChange,
  lat = null,
  lng = null,
  onLocationChange,
  disabled = false,
  required = true,
}) {
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [statusMessage, setStatusMessage] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);

  const hasValidLocation = useMemo(() => isValidCoordinate(lat, lng), [lat, lng]);

  // Ejecuta la geocodificación de la dirección
  const handleGeocode = useCallback(async () => {
    if (!address || !address.trim()) {
      setErrorMessage("Por favor ingresa una dirección antes de buscar.");
      setStatusMessage(null);
      return;
    }

    setIsGeocoding(true);
    setErrorMessage(null);
    setStatusMessage(null);

    try {
      const res = await geocodeAddress(address);
      if (res.success && isValidCoordinate(res.lat, res.lng)) {
        if (onLocationChange) {
          onLocationChange({
            lat: res.lat,
            lng: res.lng,
            address: address.trim(),
          });
        }
        setStatusMessage(
          `Ubicación localizada: ${formatCoordinates(res.lat, res.lng)}`
        );
      } else {
        setErrorMessage(
          res.error ||
            "No se pudo localizar la dirección especificada. Verifica la calle y comuna o ubica el marcador manualmente en el mapa."
        );
      }
    } catch {
      setErrorMessage(
        "Error al conectar con el servicio de geolocalización. Puedes ubicar el marcador manualmente."
      );
    } finally {
      setIsGeocoding(false);
    }
  }, [address, onLocationChange]);

  // Selección manual de coordenadas (clic o arrastre)
  const handleManualCoordUpdate = useCallback(
    (newLat, newLng) => {
      if (!isValidCoordinate(newLat, newLng)) return;
      setErrorMessage(null);
      setStatusMessage(
        `Ubicación ajustada manualmente: ${formatCoordinates(newLat, newLng)}`
      );
      if (onLocationChange) {
        onLocationChange({
          lat: Number(newLat.toFixed(6)),
          lng: Number(newLng.toFixed(6)),
          address,
        });
      }
    },
    [address, onLocationChange]
  );

  // Limpieza de coordenadas
  const handleClearLocation = useCallback(() => {
    setStatusMessage(null);
    setErrorMessage(null);
    if (onLocationChange) {
      onLocationChange({ lat: null, lng: null, address });
    }
  }, [address, onLocationChange]);

  // Icono personalizado para Leaflet
  const markerIcon = useMemo(() => {
    return L.divIcon({
      className: "atlas-picker-marker",
      html: `
        <div style="
          position: relative;
          width: 26px; height: 26px;
          border-radius: 9999px;
          background: #f97316;
          border: 3px solid #ffffff;
          box-shadow: 0 0 0 3px rgba(249, 115, 22, 0.4), 0 3px 8px rgba(0,0,0,0.4);
          cursor: grab;
          display: flex; align-items: center; justify-content: center;
          color: white; font-weight: bold; font-size: 11px;
        ">
          <span>●</span>
        </div>`,
      iconSize: [26, 26],
      iconAnchor: [13, 13],
    });
  }, []);

  return (
    <div className="space-y-2.5">
      {/* Campo de dirección con botón integrado de geocodificación */}
      <div>
        <label
          htmlFor="wo-address-input"
          className="mb-1.5 flex items-center justify-between text-xs font-medium text-slate-500 dark:text-gray-400"
        >
          <span>Comuna / Dirección</span>
          {hasValidLocation && (
            <span className="inline-flex items-center gap-1 font-semibold text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="h-3 w-3" />
              Geolocalizada
            </span>
          )}
        </label>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <input
              id="wo-address-input"
              type="text"
              required={required}
              disabled={disabled || isGeocoding}
              value={address}
              onChange={(e) => {
                setErrorMessage(null);
                if (onAddressChange) onAddressChange(e.target.value);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleGeocode();
                }
              }}
              placeholder="Ej: Av. Providencia 1234, Providencia"
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500 dark:border-gray-700 dark:bg-[#121212] dark:text-white dark:placeholder:text-gray-500"
            />
          </div>
          <button
            type="button"
            onClick={handleGeocode}
            disabled={disabled || isGeocoding || !address.trim()}
            title="Localizar dirección en el mapa"
            className="inline-flex items-center gap-1.5 rounded-lg bg-orange-500 hover:bg-orange-600 disabled:bg-orange-300 dark:disabled:bg-orange-950/40 text-white px-3.5 py-2 text-xs font-semibold shadow-xs transition-colors cursor-pointer shrink-0"
          >
            {isGeocoding ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                <span>Buscando...</span>
              </>
            ) : (
              <>
                <Search className="h-3.5 w-3.5" />
                <span>Geolocalizar</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Alerta de error si no se encuentra la dirección */}
      {errorMessage && (
        <div className="flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 p-2.5 text-xs text-amber-800 dark:text-amber-300">
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
          <div className="space-y-0.5">
            <p className="font-semibold">{errorMessage}</p>
            <p className="text-[11px] opacity-90">
              Puedes hacer clic directamente en el mapa inferior para fijar la ubicación exacta.
            </p>
          </div>
        </div>
      )}

      {/* Mensaje de confirmación de coordenadas */}
      {hasValidLocation && (
        <div className="flex items-center justify-between text-xs text-emerald-700 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 rounded-lg px-2.5 py-1.5">
          <div className="flex items-center gap-1.5 font-medium">
            <Crosshair className="h-3.5 w-3.5 shrink-0" />
            <span>Coordenadas: <strong>{formatCoordinates(lat, lng)}</strong></span>
            {statusMessage && <span className="opacity-80 text-[11px]">({statusMessage})</span>}
          </div>
          <button
            type="button"
            onClick={handleClearLocation}
            className="text-[10px] text-slate-500 hover:text-slate-800 dark:text-gray-400 dark:hover:text-white underline cursor-pointer flex items-center gap-1"
          >
            <RotateCcw className="h-2.5 w-2.5" />
            Limpiar
          </button>
        </div>
      )}

      {/* Mapa interactivo de vista previa y ajuste manual */}
      <div className="relative rounded-lg overflow-hidden border border-slate-200 dark:border-gray-800 h-44 w-full z-0 isolate">
        <MapContainer
          center={hasValidLocation ? [lat, lng] : [-33.4372, -70.6506]}
          zoom={hasValidLocation ? 15 : 12}
          scrollWheelZoom={false}
          style={{ height: "100%", width: "100%" }}
          zoomControl={true}
          attributionControl={false}
        >
          <TileLayer
            url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
            maxZoom={19}
          />

          <MapClickHandler onSelectPosition={handleManualCoordUpdate} />

          {hasValidLocation && (
            <>
              <MapRecenter lat={lat} lng={lng} />
              <Marker
                position={[lat, lng]}
                draggable={!disabled}
                icon={markerIcon}
                eventHandlers={{
                  dragend: (e) => {
                    const pos = e.target.getLatLng();
                    handleManualCoordUpdate(pos.lat, pos.lng);
                  },
                }}
              />
            </>
          )}
        </MapContainer>

        {/* Guía visual sobre el mapa */}
        <div className="pointer-events-none absolute bottom-1.5 inset-x-2 z-[400] flex justify-center">
          <span className="rounded-md bg-slate-900/80 px-2 py-0.5 text-[10px] font-medium text-white shadow-xs backdrop-blur-xs">
            {hasValidLocation
              ? "Arrastra el pin o haz clic en el mapa para ajustar la posición"
              : "Haz clic en el mapa para fijar el marcador de la orden"}
          </span>
        </div>
      </div>
    </div>
  );
}
