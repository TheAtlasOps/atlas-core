import React, { useRef, useState, useEffect, useCallback } from "react";
import { RotateCcw, PenTool } from "lucide-react";

/**
 * Componente de firma manuscrita digitalizada sobre canvas HTML5.
 * Compatible con mouse, lápiz óptico y pantallas táctiles (Pointer Events).
 */
export default function SignaturePad({
  onChange,
  disabled = false,
  height = 160,
  className = "",
}) {
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasStrokes, setHasStrokes] = useState(false);

  // Inicializar contexto del canvas
  const setupContext = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = "#0f172a"; // Color trazo tinta oscura
    return ctx;
  }, []);

  // Ajustar dimensiones internas del canvas con el tamaño visual
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const dpr = window.devicePixelRatio || 1;

    // Asignar resolución interna proporcional
    canvas.width = rect.width * dpr;
    canvas.height = height * dpr;

    const ctx = setupContext();
    if (ctx) {
      ctx.scale(dpr, dpr);
      // Fondo blanco opaco para garantizar exportación PNG limpia
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, rect.width, height);
    }
  }, [height, setupContext]);

  // Obtener coordenadas relativas exactas
  const getCoordinates = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  };

  const handlePointerDown = (e) => {
    if (disabled) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    try {
      canvas.setPointerCapture(e.pointerId);
    } catch {
      // Ignorar si el navegador no soporta setPointerCapture en este contexto
    }

    const { x, y } = getCoordinates(e);
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.beginPath();
      ctx.moveTo(x, y);
    }
    setIsDrawing(true);
  };

  const handlePointerMove = (e) => {
    if (!isDrawing || disabled) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const { x, y } = getCoordinates(e);
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.lineTo(x, y);
      ctx.stroke();
      if (!hasStrokes) {
        setHasStrokes(true);
      }
    }
  };

  const handlePointerUp = (e) => {
    if (!isDrawing) return;
    setIsDrawing(false);
    const canvas = canvasRef.current;
    if (!canvas) return;

    try {
      canvas.releasePointerCapture(e.pointerId);
    } catch {
      // Ignorar
    }

    if (hasStrokes && onChange) {
      const dataUrl = canvas.toDataURL("image/png");
      onChange(dataUrl, true);
    }
  };

  const handleClear = () => {
    if (disabled) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const dpr = window.devicePixelRatio || 1;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.save();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.restore();
      ctx.scale(dpr, dpr);
      ctx.lineWidth = 2.5;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.strokeStyle = "#0f172a";
    }

    setHasStrokes(false);
    if (onChange) {
      onChange(null, false);
    }
  };

  return (
    <div className={`space-y-1.5 ${className}`}>
      <div className="relative rounded-xl border border-slate-300 dark:border-gray-700 bg-white overflow-hidden shadow-inner">
        <canvas
          ref={canvasRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          style={{
            touchAction: "none",
            height: `${height}px`,
            width: "100%",
            display: "block",
            cursor: disabled ? "not-allowed" : "crosshair",
          }}
          aria-label="Lienzo para firma manuscrita digital"
          role="img"
        />

        {/* Marca de agua / Instrucción cuando el canvas está vacío */}
        {!hasStrokes && (
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-slate-400 select-none opacity-80">
            <PenTool className="h-5 w-5 mb-1 text-slate-300" />
            <span className="text-xs font-medium">
              Dibuje su firma aquí con el mouse o pantalla táctil
            </span>
          </div>
        )}

        {/* Línea de base para la rúbrica */}
        <div className="pointer-events-none absolute bottom-4 left-6 right-6 border-b border-dashed border-slate-300 opacity-60" />
      </div>

      <div className="flex items-center justify-between text-xs text-slate-500 dark:text-gray-400">
        <span className="text-[11px]">
          {hasStrokes ? "✓ Rúbrica registrada" : "Firma pendiente de trazo"}
        </span>
        <button
          type="button"
          onClick={handleClear}
          disabled={disabled || !hasStrokes}
          className="inline-flex items-center gap-1 font-semibold text-slate-600 dark:text-gray-300 hover:text-orange-600 dark:hover:text-orange-400 disabled:opacity-40 disabled:hover:text-slate-600 transition-colors"
        >
          <RotateCcw className="h-3 w-3" />
          Limpiar firma
        </button>
      </div>
    </div>
  );
}
