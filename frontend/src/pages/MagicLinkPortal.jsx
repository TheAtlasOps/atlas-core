import CustomerTrackingView from "./CustomerTrackingView";

/**
 * MagicLinkPortal actúa como alias y contenedor de la vista CustomerTrackingView
 * para mantener compatibilidad con cualquier ruta o import existente.
 */
export default function MagicLinkPortal() {
  return <CustomerTrackingView />;
}
