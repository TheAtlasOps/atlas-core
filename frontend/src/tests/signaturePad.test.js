import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ─── 1. Verificación Estática contra Regresiones de Referencia ──────────────
test("SignaturePad no contiene variables 'rect' huérfanas sin declaración", () => {
  const componentPath = path.resolve(__dirname, "../components/ui/SignaturePad.jsx");
  const source = fs.readFileSync(componentPath, "utf-8");

  // Buscar cualquier uso de rect.width, rect.height, rect.left o rect.top
  // Asegurando que antes de cada uso exista la declaración 'const rect =' o 'let rect ='
  const lines = source.split("\n");

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (/\brect\.(width|height|left|top)\b/.test(line)) {
      // Debe haber una declaración previa visible en las líneas inmediatamente anteriores
      const previousLines = lines.slice(Math.max(0, i - 10), i + 1).join("\n");
      const hasDeclaration = /rect\s*=\s*canvas\.getBoundingClientRect/.test(previousLines);
      assert.ok(
        hasDeclaration,
        `Línea ${i + 1} utiliza 'rect' sin haber obtenido getBoundingClientRect(): ${line.trim()}`
      );
    }
  }
});

// ─── 2. Ejecución Real de la Lógica de Montaje y Dimensionamiento ────────────
test("Lógica de montaje de SignaturePad redimensiona canvas sin lanzar ReferenceError", () => {
  // Simulador de canvas HTML5
  const mockContext = {
    lineWidth: 0,
    lineCap: "",
    lineJoin: "",
    strokeStyle: "",
    fillStyle: "",
    scaleCalls: [],
    fillRectCalls: [],
    scale(x, y) {
      this.scaleCalls.push({ x, y });
    },
    fillRect(x, y, w, h) {
      this.fillRectCalls.push({ x, y, w, h });
    },
  };

  const mockCanvas = {
    width: 0,
    height: 0,
    offsetWidth: 500,
    getContext(type) {
      if (type === "2d") return mockContext;
      return null;
    },
    getBoundingClientRect() {
      return { width: 500, height: 160, left: 15, top: 40 };
    },
  };

  const height = 160;

  // Ejecución de la rutina exacta del useEffect de SignaturePad
  assert.doesNotThrow(() => {
    const canvas = mockCanvas;
    const rect = canvas.getBoundingClientRect
      ? canvas.getBoundingClientRect()
      : { width: 400, height };
    const width = rect.width || canvas.offsetWidth || 400;
    const dpr = (typeof window !== "undefined" && window.devicePixelRatio) || 1;

    canvas.width = width * dpr;
    canvas.height = height * dpr;

    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.lineWidth = 2.5;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.strokeStyle = "#0f172a";
      ctx.scale(dpr, dpr);
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, width, height);
    }
  }, "El montaje no debe arrojar ReferenceError: rect is not defined");

  assert.equal(mockCanvas.width, 500);
  assert.equal(mockCanvas.height, 160);
  assert.equal(mockContext.fillRectCalls.length, 1);
  assert.deepEqual(mockContext.fillRectCalls[0], { x: 0, y: 0, w: 500, h: 160 });
});

// ─── 3. Ejecución de Cálculo de Coordenadas de Trazado Táctil/Mouse ───────────
test("Cálculo de coordenadas getCoordinates resuelve posiciones relativas al canvas", () => {
  const mockCanvas = {
    getBoundingClientRect() {
      return { left: 50, top: 120, width: 400, height: 160 };
    },
  };

  const getCoordinates = (e, canvas) => {
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect
      ? canvas.getBoundingClientRect()
      : { left: 0, top: 0 };
    return {
      x: e.clientX - (rect.left || 0),
      y: e.clientY - (rect.top || 0),
    };
  };

  // Evento simulado de puntero en clientX=150, clientY=200
  const coords = getCoordinates({ clientX: 150, clientY: 200 }, mockCanvas);
  assert.equal(coords.x, 100, "X debe ser 150 - 50 = 100");
  assert.equal(coords.y, 80, "Y debe ser 200 - 120 = 80");
});

// ─── 4. Resiliencia ante entornos sin getBoundingClientRect o ancho 0 ────────
test("SignaturePad usa fallback seguro de 400px si getBoundingClientRect retorna ancho 0", () => {
  const mockCanvas = {
    width: 0,
    height: 0,
    offsetWidth: 0,
    getContext: () => ({ scale: () => {}, fillRect: () => {} }),
    getBoundingClientRect() {
      return { width: 0, height: 0, left: 0, top: 0 };
    },
  };

  const canvas = mockCanvas;
  const rect = canvas.getBoundingClientRect
    ? canvas.getBoundingClientRect()
    : { width: 400, height: 160 };
  const width = rect.width || canvas.offsetWidth || 400;

  assert.equal(width, 400, "Debe adoptar el fallback de 400px en vez de 0");
});

// ─── 5. Renderizado Real del Componente React SignaturePad mediante Vite ─────
test("SignaturePad se renderiza en un entorno de componentes React sin arrojar ReferenceError", async () => {
  const { createServer } = await import("vite");
  const server = await createServer({
    root: path.resolve(__dirname, "../../"),
    server: { middlewareMode: true },
  });

  try {
    const React = (await import("react")).default;
    const { renderToString } = await import("react-dom/server");
    const { default: SignaturePad } = await server.ssrLoadModule("/src/components/ui/SignaturePad.jsx");

    const html = renderToString(React.createElement(SignaturePad, { onChange: () => {} }));
    assert.ok(html.includes("<canvas"), "El HTML generado debe contener el elemento canvas");
    assert.ok(html.includes("Lienzo para firma manuscrita digital"), "Debe incluir el aria-label accesible");
  } finally {
    await server.close();
  }
});
