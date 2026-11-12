/**
 * frontend/src/components/ui/SimulationErrorBoundary.jsx
 *
 * Captura excepciones no controladas dentro del visor de simulación Leaflet/OSRM
 * para prevenir pantallas negras en el Tablero de Despacho (ATLAS FSM).
 */

import React from "react";
import { AlertCircle, X } from "lucide-react";

export default class SimulationErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("[ATLAS SimulationErrorBoundary] Error atrapado en simulación:", error, errorInfo);
  }

  handleClose = () => {
    this.setState({ hasError: false, error: null });
    if (this.props.onClose) {
      this.props.onClose();
    }
  };

  render() {
    if (this.state.hasError) {
      return (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-xs p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="relative w-full max-w-md rounded-2xl bg-white dark:bg-gray-900 border border-slate-200 dark:border-gray-800 p-6 shadow-2xl text-center">
            <button
              type="button"
              onClick={this.handleClose}
              className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-gray-200 hover:bg-slate-100 dark:hover:bg-gray-800 transition-colors"
              aria-label="Cerrar aviso de error"
            >
              <X className="h-4 w-4" />
            </button>
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-500/10 text-rose-600 mx-auto mb-3.5 border border-rose-500/20">
              <AlertCircle className="h-6 w-6" />
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              No fue posible cargar el visor de seguimiento
            </h3>
            <p className="text-xs text-slate-500 dark:text-gray-400 mt-2 mb-5 leading-relaxed">
              Ocurrió un error al inicializar el componente de mapa o telemetría.
              El resto de la aplicación y el tablero operativo continúan funcionando normalmente.
            </p>
            <button
              type="button"
              onClick={this.handleClose}
              className="w-full py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 active:bg-orange-700 text-white text-xs font-bold transition-all shadow-sm cursor-pointer"
            >
              Entendido, volver al Tablero
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
