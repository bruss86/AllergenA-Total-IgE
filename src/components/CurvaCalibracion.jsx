import {
  Chart as ChartJS,
  LinearScale,
  LogarithmicScale,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
} from "chart.js";

import { Scatter } from "react-chartjs-2";

ChartJS.register(
  LinearScale,
  LogarithmicScale,
  PointElement,
  LineElement,
  Tooltip,
  Legend
);

// ============================================================
// GRÁFICO DE UNA CURVA
// ============================================================

function GraficoCurva({ curva, titulo }) {
  if (!curva || !curva.puntos || curva.puntos.length === 0) {
    return (
      <div className="alert alert-secondary mb-0">
        No hay datos suficientes para graficar esta curva.
      </div>
    );
  }

  // ----------------------------------------------------------
  // PUNTOS NUMÉRICOS VÁLIDOS
  // ----------------------------------------------------------

  const puntos = curva.puntos
    .filter(
      (punto) =>
        Number.isFinite(Number(punto.concentracion)) &&
        Number.isFinite(Number(punto.doCorregida))
    )
    .sort(
      (a, b) =>
        Number(a.concentracion) - Number(b.concentracion)
    );

  if (puntos.length === 0) {
    return (
      <div className="alert alert-secondary mb-0">
        No hay puntos numéricos válidos para graficar esta curva.
      </div>
    );
  }

  // ----------------------------------------------------------
  // PUNTOS PARA EL GRÁFICO
  //
  // El eje Y es logarítmico.
  //
  // Los valores <= 0 no pueden representarse en escala
  // logarítmica y por eso se excluyen SOLO del gráfico.
  // No se modifican los datos originales de la curva.
  // ----------------------------------------------------------

  const puntosGrafico = puntos.filter(
    (punto) => Number(punto.doCorregida) > 0
  );

  const datosPuntos = puntosGrafico.map((punto) => ({
    x: Number(punto.concentracion),
    y: Number(punto.doCorregida),
  }));

  const datosLinea = [...datosPuntos];

  // ----------------------------------------------------------
  // DATOS DEL CHART
  // ----------------------------------------------------------

  const data = {
    datasets: [
      {
        label: "Calibradores",
        data: datosPuntos,
        showLine: false,
        pointRadius: 5,
        pointHoverRadius: 7,
      },
      {
        label: "Interpolación lineal",
        data: datosLinea,
        showLine: true,
        pointRadius: 0,
        pointHoverRadius: 0,
        borderWidth: 2,
        tension: 0,
        fill: false,
      },
    ],
  };

  // ----------------------------------------------------------
  // OPCIONES
  // ----------------------------------------------------------

  const options = {
    responsive: true,
    maintainAspectRatio: false,

    plugins: {
      legend: {
        display: true,
        position: "bottom",
      },

      tooltip: {
        callbacks: {
          label: function (context) {
            const x = Number(context.parsed.x);
            const y = Number(context.parsed.y);

            return `Concentración: ${x} UI/mL — DO corregida: ${y.toFixed(
              3
            )}`;
          },
        },
      },
    },

    scales: {
      // ------------------------------------------------------
      // EJE X
      // ------------------------------------------------------

      x: {
        type: "linear",

        title: {
          display: true,
          text: "IgE específica (UI/mL)",
        },

        ticks: {
          callback: function (value) {
            return Number(value).toLocaleString("es-AR");
          },
        },
      },

      // ------------------------------------------------------
      // EJE Y LOGARÍTMICO
      // ------------------------------------------------------

      y: {
        type: "logarithmic",

        title: {
          display: true,
          text: `DO corregida (${curva.longitudOnda || ""} nm)`,
        },

        ticks: {
          callback: function (value) {
            return Number(value).toFixed(3);
          },
        },
      },
    },
  };

  // ----------------------------------------------------------
  // RENDER
  // ----------------------------------------------------------

  return (
    <div className="card shadow-sm h-100">

      <div className="card-header bg-light">
        <div className="fw-semibold">
          {titulo}
        </div>

        <div className="small text-muted">
          Interpolación lineal punto a punto
        </div>
      </div>

      <div className="card-body">

        <div
          className="mb-3"
          style={{
            height: "320px",
            position: "relative",
          }}
        >
          <Scatter data={data} options={options} />
        </div>

        {/* -------------------------------------------------- */}
        {/* INFORMACIÓN DE LA CURVA                            */}
        {/* -------------------------------------------------- */}

        <div className="row g-2 small">

          <div className="col-6">
            <div className="text-muted">
              Longitud de onda
            </div>

            <div className="fw-semibold">
              {curva.longitudOnda
                ? `${curva.longitudOnda} nm`
                : "—"}
            </div>
          </div>

          <div className="col-6">
            <div className="text-muted">
              R²
            </div>

            <div className="fw-semibold">
              {Number.isFinite(Number(curva.r2))
                ? Number(curva.r2).toFixed(4)
                : "—"}
            </div>
          </div>

          <div className="col-6">
            <div className="text-muted">
              Blanco
            </div>

            <div className="fw-semibold">
              {Number.isFinite(Number(curva.blancoPromedio))
                ? Number(curva.blancoPromedio).toFixed(3)
                : "—"}
            </div>
          </div>

          <div className="col-6">
            <div className="text-muted">
              Puntos utilizados
            </div>

            <div className="fw-semibold">
              {puntos.length}
            </div>
          </div>

        </div>

        {/* -------------------------------------------------- */}
        {/* AVISO SI HAY PUNTOS NO REPRESENTABLES EN LOG       */}
        {/* -------------------------------------------------- */}

        {puntosGrafico.length < puntos.length && (
          <div className="alert alert-warning small mt-3 mb-0">
            Algunos puntos tienen DO corregida igual o menor
            que cero y no pueden representarse en una escala
            logarítmica.
          </div>
        )}

      </div>
    </div>
  );
}

// ============================================================
// COMPONENTE PRINCIPAL
// ============================================================

export default function CurvaCalibracion({
  curvas,
  curva,
}) {
  /*
   * Nueva estructura:
   *
   * curvas={{
   *   curva450,
   *   curva405
   * }}
   *
   * También mantenemos compatibilidad con la prop
   * "curva" de la versión anterior.
   */

  const curva450 =
    curvas?.curva450 ||
    (curva?.longitudOnda === 450 ? curva : null);

  const curva405 =
    curvas?.curva405 ||
    (curva?.longitudOnda === 405 ? curva : null);

  // ----------------------------------------------------------
  // COMPATIBILIDAD CON UNA SOLA CURVA
  // ----------------------------------------------------------

  const curvaUnica =
    !curva450 &&
    !curva405 &&
    curva
      ? curva
      : null;

  if (curvaUnica) {
    return (
      <div className="row g-4">
        <div className="col-12">
          <GraficoCurva
            curva={curvaUnica}
            titulo="Curva de calibración"
          />
        </div>
      </div>
    );
  }

  // ----------------------------------------------------------
  // SIN CURVAS
  // ----------------------------------------------------------

  if (!curva450 && !curva405) {
    return null;
  }

  // ----------------------------------------------------------
  // DOS CURVAS
  //
  // Escritorio:
  //   450 nm | 405 nm
  //
  // Móvil:
  //   450 nm
  //   405 nm
  // ----------------------------------------------------------

  return (
    <div className="row g-4">

      {curva450 && (
        <div className="col-12 col-lg-6">
          <GraficoCurva
            curva={curva450}
            titulo="Curva estándar 1 — 450 nm"
          />
        </div>
      )}

      {curva405 && (
        <div className="col-12 col-lg-6">
          <GraficoCurva
            curva={curva405}
            titulo="Curva estándar 2 — 405 nm"
          />
        </div>
      )}

    </div>
  );
}