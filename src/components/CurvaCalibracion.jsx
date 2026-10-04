import {
  Chart as ChartJS,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
} from "chart.js";

import { Scatter } from "react-chartjs-2";

ChartJS.register(
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Legend
);

export default function CurvaCalibracion({ curva }) {
  if (!curva) {
    return null;
  }

  const {
    puntos = [],
    minimo,
    maximo,
  } = curva;

  // ------------------------------------------------------------
  // PUNTOS DE CALIBRACIÓN
  // ------------------------------------------------------------

  const puntosCalibradores = puntos
    .filter(
      (punto) =>
        Number.isFinite(Number(punto.x)) &&
        Number.isFinite(Number(punto.y))
    )
    .map((punto) => ({
      x: Number(punto.x),
      y: Number(punto.y),
    }))
    .sort((a, b) => a.x - b.x);

  if (puntosCalibradores.length < 2) {
    return null;
  }

  // ------------------------------------------------------------
  // CONFIGURACIÓN DEL GRÁFICO
  // ------------------------------------------------------------

  const data = {
    datasets: [
      // --------------------------------------------------------
      // PUNTOS DE LOS CALIBRADORES
      // --------------------------------------------------------

      {
        label: "Calibradores",
        data: puntosCalibradores,
        showLine: false,
        pointRadius: 5,
        pointHoverRadius: 7,
      },

      // --------------------------------------------------------
      // INTERPOLACIÓN LINEAL
      // --------------------------------------------------------
      //
      // La línea une directamente los puntos experimentales.
      //
      // Esto representa exactamente la interpolación utilizada
      // para calcular las muestras.
      //
      // --------------------------------------------------------

      {
        label: "Interpolación",
        data: puntosCalibradores,
        showLine: true,
        pointRadius: 0,
        pointHoverRadius: 0,
        borderColor: "red",
        backgroundColor: "red",
        borderWidth: 2,
        tension: 0,
        fill: false,
      },
    ],
  };

  // ------------------------------------------------------------
  // CONFIGURACIÓN
  // ------------------------------------------------------------

  const opciones = {
    responsive: true,
    maintainAspectRatio: false,

    plugins: {
      legend: {
        display: true,
      },

      tooltip: {
        callbacks: {
          label: function (context) {
            const x = context.parsed.x;
            const y = context.parsed.y;

            return `Concentración: ${x} UI/mL — DO: ${y.toFixed(
              4
            )}`;
          },
        },
      },
    },

    scales: {
      x: {
        type: "linear",

        title: {
          display: true,
          text: "Concentración (UI/mL)",
        },

        min:
          Number.isFinite(Number(minimo))
            ? Number(minimo)
            : undefined,

        max:
          Number.isFinite(Number(maximo))
            ? Number(maximo)
            : undefined,

        ticks: {
          callback: function (value) {
            return value;
          },
        },
      },

      y: {
        type: "linear",

        title: {
          display: true,
          text: "DO corregida",
        },

        beginAtZero: true,
      },
    },
  };

  return (
    <div className="card shadow-sm mt-4">
      <div className="card-body">
        <div
          style={{
            width: "100%",
            height: "420px",
          }}
        >
          <Scatter
            data={data}
            options={opciones}
          />
        </div>
      </div>
    </div>
  );
}