import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe("Tablero de Despacho — Ajustes visuales de tipografía, centrado y layout", () => {
  const kpiGridPath = path.resolve(__dirname, "../components/layout/KpiGrid.jsx");
  const dispatchBoardPath = path.resolve(__dirname, "../pages/DispatchBoard.jsx");

  const kpiGridCode = fs.readFileSync(kpiGridPath, "utf-8");
  const dispatchBoardCode = fs.readFileSync(dispatchBoardPath, "utf-8");

  it("1. Tarjetas KPI: tipografía equilibrada (text-xl sm:text-2xl font-bold), sin whitespace-nowrap desbordante y con truncate", () => {
    // Verificar que se eliminó el 'whitespace-nowrap' desbordante y 'text-2xl lg:text-3xl font-semibold'
    assert.strictEqual(
      kpiGridCode.includes("text-2xl lg:text-3xl font-semibold tracking-tight whitespace-nowrap"),
      false,
      "No debe conservar 'text-2xl lg:text-3xl font-semibold tracking-tight whitespace-nowrap'"
    );

    // Verificar presencia de tipografía armonizada y truncate responsivo
    assert.ok(
      kpiGridCode.includes("text-xl sm:text-2xl font-bold tracking-tight truncate"),
      "Debe incluir clase 'text-xl sm:text-2xl font-bold tracking-tight truncate' en KpiCard"
    );

    // Verificar que los contenedores usan min-w-0 y flex-col justify-between para altura uniforme
    assert.ok(
      kpiGridCode.includes("flex flex-col justify-between min-w-0"),
      "KpiCard debe incluir 'flex flex-col justify-between min-w-0' para alineación consistente entre las 4 tarjetas"
    );

    // Verificar tooltip 'title' para accesibilidad de valores extensos como '0 / 1 (0%)'
    assert.ok(
      kpiGridCode.includes("title={typeof kpi.value === \"string\" ? kpi.value : undefined}"),
      "KpiCard debe incluir title attribute en el valor para accesibilidad y responsive"
    );
  });

  it("2. Gráfico circular Donut: centrado exacto, proporciones tipográficas para 1, 2, 3+ dígitos y subtítulo sin desborde", () => {
    // Verificar dimensiones SVG armonizadas (150px) y viewBox estándar 100x100
    assert.ok(
      dispatchBoardCode.includes('width="150"'),
      "El SVG del DonutChart debe tener ancho 150"
    );
    assert.ok(
      dispatchBoardCode.includes('height="150"'),
      "El SVG del DonutChart debe tener alto 150"
    );

    // Verificar escala tipográfica adaptable para dígitos
    assert.ok(
      dispatchBoardCode.includes('total >= 1000'),
      "DonutChartCard debe contemplar adaptación de tamaño para 4 o más dígitos"
    );
    assert.ok(
      dispatchBoardCode.includes('total >= 100'),
      "DonutChartCard debe contemplar adaptación de tamaño para 3 dígitos"
    );

    // Verificar contenedor central exactamente centrado con inset-0 y flex
    assert.ok(
      dispatchBoardCode.includes("absolute inset-0 flex flex-col items-center justify-center text-center"),
      "Debe centrar exactamente el número y subtítulo dentro del donut con inset-0 flex items-center justify-center"
    );

    // Verificar subtítulo con max-w y tamaño adecuado para no desbordar el círculo interior
    assert.ok(
      dispatchBoardCode.includes("max-w-[76px] text-[10px] leading-tight"),
      "El subtítulo de órdenes registradas debe tener tamaño acotado (10px) y max-w para permanecer dentro del círculo"
    );
  });

  it("3. Centrado vertical equilibrado en DonutChartCard y alineación general con el mapa", () => {
    // DonutChartCard debe usar h-full para igualar la altura de ActiveZonesCard en el grid
    assert.ok(
      dispatchBoardCode.includes('DonutChartCard'),
      "DonutChartCard debe estar presente"
    );
    assert.ok(
      dispatchBoardCode.includes("flex-1 flex flex-col justify-center gap-4 py-1"),
      "DonutChartCard debe centrar verticalmente el conjunto de donut y leyenda con 'flex-1 flex flex-col justify-center'"
    );

    // ActiveZonesCard y UpcomingVisitsCard no deben forzar justify-between desproporcionados
    assert.strictEqual(
      dispatchBoardCode.includes("rounded-xl border border-border bg-card p-5 flex flex-col justify-between gap-3 h-full"),
      false,
      "ActiveZonesCard no debe forzar justify-between desproporcionado"
    );
    assert.strictEqual(
      dispatchBoardCode.includes("rounded-xl border border-border bg-card p-5 flex flex-col justify-between gap-4 h-full"),
      false,
      "UpcomingVisitsCard no debe forzar justify-between desproporcionado"
    );
  });

  it("4. Layout y alineación entre columnas: Cabecera y KPIs abarcan ancho completo, columnas analíticas inician al mismo nivel", () => {
    // La cabecera y KpiGrid deben preceder la división en columnas xl:flex-row
    const kpiIndex = dispatchBoardCode.indexOf("<KpiGrid");
    const xlRowIndex = dispatchBoardCode.indexOf('<div className="flex flex-col gap-6 xl:flex-row xl:items-stretch">');
    const aiInsightsIndex = dispatchBoardCode.indexOf("<AiInsights");
    const activityTableIndex = dispatchBoardCode.indexOf("<ActivityTable");

    assert.ok(kpiIndex > 0, "KpiGrid debe estar renderizado en DispatchBoard");
    assert.ok(xlRowIndex > 0, "La fila responsiva xl debe existir");
    assert.ok(aiInsightsIndex > 0, "AiInsights debe estar presente");
    assert.ok(activityTableIndex > 0, "ActivityTable debe estar presente");

    // KpiGrid debe estar ANTES de la división xl:flex-row (ancho completo)
    assert.ok(
      kpiIndex < xlRowIndex,
      "KpiGrid debe posicionarse a ancho completo antes de la sección analítica dividida"
    );

    // AiInsights debe estar dentro del bloque xl:flex-row alineado con Fila 1 y Fila 2
    assert.ok(
      xlRowIndex < aiInsightsIndex && aiInsightsIndex < activityTableIndex,
      "AiInsights debe estar en la columna derecha de la sección analítica, antes de ActivityTable"
    );

    // ActivityTable (bitácora) debe estar después del cierre de la sección dividida, con flujo natural
    assert.ok(
      aiInsightsIndex < activityTableIndex,
      "ActivityTable debe posicionarse debajo de las dos columnas de forma natural"
    );

    // AiInsights debe distribuir uniformemente sus tarjetas interiores con flex-1 y min-h
    assert.ok(
      dispatchBoardCode.includes("flex-1 min-h-[115px] rounded-xl"),
      "Las tarjetas interiores de Alertas operativas deben ocupar el espacio disponible con flex-1 y min-h"
    );
  });

  it("5. Paginación real de Bitácora de Actividad: controles de 10, 20, 50, navegación Anterior/Siguiente y conteo total", () => {
    // Verificar que ActivityTable incluya selector de registros por página con opciones 10, 20, 50
    assert.ok(
      dispatchBoardCode.includes("<option value={10}>10</option>"),
      "Debe incluir opción de 10 registros por página"
    );
    assert.ok(
      dispatchBoardCode.includes("<option value={20}>20</option>"),
      "Debe incluir opción de 20 registros por página"
    );
    assert.ok(
      dispatchBoardCode.includes("<option value={50}>50</option>"),
      "Debe incluir opción de 50 registros por página"
    );

    // Verificar presencia de botones Anterior y Siguiente
    assert.ok(
      dispatchBoardCode.includes('aria-label="Página anterior"'),
      "Debe incluir botón accesible de Página anterior"
    );
    assert.ok(
      dispatchBoardCode.includes('aria-label="Página siguiente"'),
      "Debe incluir botón accesible de Página siguiente"
    );

    // Verificar texto informativo de páginas y total
    assert.ok(
      dispatchBoardCode.includes("Página {pagination.page} de {Math.max(1, pagination.pages)}"),
      "Debe mostrar página actual y total de páginas"
    );
    assert.ok(
      dispatchBoardCode.includes("Total: {pagination.total}"),
      "Debe mostrar total de registros"
    );

    // Verificar columnas de tabla preservadas
    assert.ok(dispatchBoardCode.includes("ID Orden"), "Debe conservar columna ID Orden");
    assert.ok(dispatchBoardCode.includes("Realizado por"), "Debe conservar columna Realizado por");
    assert.ok(dispatchBoardCode.includes("Acción"), "Debe conservar columna Acción");
    assert.ok(dispatchBoardCode.includes("Hora"), "Debe conservar columna Hora");

    // Verificar interactividad y auditoría al hacer clic en fila
    assert.ok(
      dispatchBoardCode.includes("onClick={() => onSelectOrderId?.(row.id)}"),
      "Debe permitir abrir auditoría o detalle de orden al hacer clic en fila"
    );
  });
});
