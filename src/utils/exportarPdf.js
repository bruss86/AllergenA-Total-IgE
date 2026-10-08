import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

import { obtenerNivelIgE } from "./calculoIge";

// ============================================================
// UTILIDADES
// ============================================================

const numero = (valor) => {
  const n = Number(valor);
  return Number.isFinite(n) ? n : null;
};

const formatoNumero = (valor, decimales = 3) => {
  const n = numero(valor);

  if (n === null) return "—";

  return n.toFixed(decimales).replace(".", ",");
};

const formatoConcentracion = (valor) => {
  const n = numero(valor);

  if (n === null) return "—";

  if (Math.abs(n) >= 100) {
    return n.toFixed(0);
  }

  return n.toFixed(2).replace(".", ",");
};

const promedio = (a, b) => {
  const n1 = numero(a);
  const n2 = numero(b);

  if (n1 === null || n2 === null) return null;

  return (n1 + n2) / 2;
};

// ============================================================
// OBTENER DATOS DE LA CURVA
// ============================================================

const obtenerPendiente = (curva) => {
  if (!curva) return null;

  return numero(
    curva.pendiente ??
      curva.slope ??
      curva.m ??
      curva.a
  );
};

const obtenerIntercepto = (curva) => {
  if (!curva) return null;

  return numero(
    curva.intercepto ??
      curva.intercept ??
      curva.b
  );
};

const obtenerR2 = (curva) => {
  if (!curva) return null;

  return numero(
    curva.r2 ??
      curva.R2 ??
      curva.rCuadrado ??
      curva.rSquared
  );
};

// ============================================================
// ECUACIÓN DE LA RECTA
// ============================================================

const obtenerEcuacion = (curva) => {
  const pendiente = obtenerPendiente(curva);
  const intercepto = obtenerIntercepto(curva);

  if (pendiente === null || intercepto === null) {
    return "Ecuación no disponible";
  }

  const m = pendiente.toFixed(5).replace(".", ",");
  const bAbs = Math.abs(intercepto)
    .toFixed(5)
    .replace(".", ",");

  if (intercepto >= 0) {
    return `y = ${m}x + ${bAbs}`;
  }

  return `y = ${m}x - ${bAbs}`;
};

// ============================================================
// DIBUJAR UNA CURVA
// ============================================================

const dibujarCurva = ({
  doc,
  x,
  y,
  ancho,
  alto,
  titulo,
  calibradores,
  filtro,
  curva,
}) => {
  const margenIzq = 18;
  const margenDer = 8;
  const margenSup = 18;
  const margenInf = 20;

  const grafX = x + margenIzq;
  const grafY = y + margenSup;
  const grafW = ancho - margenIzq - margenDer;
  const grafH = alto - margenSup - margenInf;

  // ----------------------------------------------------------
  // Marco
  // ----------------------------------------------------------

  doc.setDrawColor(180, 180, 180);
  doc.setLineWidth(0.25);

  doc.rect(
    x,
    y,
    ancho,
    alto
  );

  // ----------------------------------------------------------
  // Título
  // ----------------------------------------------------------

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);

  doc.text(
    titulo,
    x + ancho / 2,
    y + 8,
    {
      align: "center",
    }
  );

  // ----------------------------------------------------------
  // Filtrar calibradores válidos
  // ----------------------------------------------------------

  const puntos = (calibradores || [])
    .map((cal) => {
      const concentracion =
        numero(cal.concentracion);

      const doValor =
        filtro === 450
          ? numero(cal.do450)
          : numero(cal.do405);

      if (
        concentracion === null ||
        doValor === null
      ) {
        return null;
      }

      return {
        x: concentracion,
        y: doValor,
        nombre: cal.nombre,
      };
    })
    .filter(Boolean);

  if (puntos.length < 2) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);

    doc.text(
      "No hay datos suficientes para graficar la curva.",
      x + ancho / 2,
      y + alto / 2,
      {
        align: "center",
      }
    );

    return;
  }

  // ----------------------------------------------------------
  // Ordenar puntos por concentración
  // ----------------------------------------------------------

  const puntosOrdenados = [...puntos].sort(
    (a, b) => a.x - b.x
  );

  // ----------------------------------------------------------
  // Escalas
  // ----------------------------------------------------------

  const valoresX =
    puntosOrdenados.map((p) => p.x);

  const valoresY =
    puntosOrdenados.map((p) => p.y);

  let minX = Math.min(...valoresX);
  let maxX = Math.max(...valoresX);

  let minY = Math.min(...valoresY);
  let maxY = Math.max(...valoresY);

  if (minX === maxX) {
    minX -= 1;
    maxX += 1;
  }

  if (minY === maxY) {
    minY -= 0.1;
    maxY += 0.1;
  }

  // Dejamos un pequeño margen vertical.

  const margenY =
    (maxY - minY) * 0.12;

  minY = Math.max(
    0,
    minY - margenY
  );

  maxY += margenY;

  const convertirX = (valor) => {
    return (
      grafX +
      ((valor - minX) /
        (maxX - minX)) *
        grafW
    );
  };

  const convertirY = (valor) => {
    return (
      grafY +
      grafH -
      ((valor - minY) /
        (maxY - minY)) *
        grafH
    );
  };

  // ----------------------------------------------------------
  // Ejes
  // ----------------------------------------------------------

  doc.setDrawColor(70, 70, 70);
  doc.setLineWidth(0.4);

  // Eje X

  doc.line(
    grafX,
    grafY + grafH,
    grafX + grafW,
    grafY + grafH
  );

  // Eje Y

  doc.line(
    grafX,
    grafY,
    grafX,
    grafY + grafH
  );

  // ----------------------------------------------------------
  // Rejilla horizontal
  // ----------------------------------------------------------

  doc.setFont("helvetica", "normal");
  doc.setFontSize(5.5);

  for (let i = 0; i <= 4; i++) {
    const valor =
      minY +
      ((maxY - minY) / 4) * i;

    const py = convertirY(valor);

    doc.setDrawColor(
      225,
      225,
      225
    );

    doc.setLineWidth(0.2);

    doc.line(
      grafX,
      py,
      grafX + grafW,
      py
    );

    doc.setTextColor(
      70,
      70,
      70
    );

    doc.text(
      valor
        .toFixed(2)
        .replace(".", ","),
      grafX - 2,
      py + 1.5,
      {
        align: "right",
      }
    );
  }

  // ----------------------------------------------------------
  // Etiquetas eje X
  // ----------------------------------------------------------

  puntosOrdenados.forEach(
    (punto) => {
      const px =
        convertirX(punto.x);

      doc.setDrawColor(
        120,
        120,
        120
      );

      doc.line(
        px,
        grafY + grafH,
        px,
        grafY + grafH + 2
      );

      doc.setTextColor(
        70,
        70,
        70
      );

      doc.text(
        String(punto.x),
        px,
        grafY + grafH + 7,
        {
          align: "center",
        }
      );
    }
  );

  // ----------------------------------------------------------
  // Nombres de ejes
  // ----------------------------------------------------------

  doc.setFontSize(6);

  doc.text(
    "Concentración (UI/mL)",
    grafX + grafW / 2,
    y + alto - 4,
    {
      align: "center",
    }
  );

  doc.text(
    "DO",
    x + 5,
    grafY + grafH / 2,
    {
      angle: 90,
      align: "center",
    }
  );

  // ----------------------------------------------------------
  // Recta de regresión
  // ----------------------------------------------------------

  const pendiente =
    obtenerPendiente(curva);

  const intercepto =
    obtenerIntercepto(curva);

  if (
    pendiente !== null &&
    intercepto !== null
  ) {
    const y1 =
      pendiente * minX +
      intercepto;

    const y2 =
      pendiente * maxX +
      intercepto;

    const px1 =
      convertirX(minX);

    const py1 =
      convertirY(y1);

    const px2 =
      convertirX(maxX);

    const py2 =
      convertirY(y2);

    doc.setDrawColor(
      40,
      40,
      40
    );

    doc.setLineWidth(0.7);

    doc.line(
      px1,
      py1,
      px2,
      py2
    );
  }

  // ----------------------------------------------------------
  // LÍNEA QUE UNE LOS PUNTOS EXPERIMENTALES
  // ----------------------------------------------------------

  doc.setDrawColor(
    90,
    90,
    90
  );

  doc.setLineWidth(0.45);

  for (
    let i = 0;
    i < puntosOrdenados.length - 1;
    i++
  ) {
    const puntoActual =
      puntosOrdenados[i];

    const puntoSiguiente =
      puntosOrdenados[i + 1];

    const px1 =
      convertirX(puntoActual.x);

    const py1 =
      convertirY(puntoActual.y);

    const px2 =
      convertirX(puntoSiguiente.x);

    const py2 =
      convertirY(puntoSiguiente.y);

    doc.line(
      px1,
      py1,
      px2,
      py2
    );
  }

  // ----------------------------------------------------------
  // Puntos experimentales
  // ----------------------------------------------------------

  puntosOrdenados.forEach(
    (punto) => {
      const px =
        convertirX(punto.x);

      const py =
        convertirY(punto.y);

      doc.setFillColor(
        0,
        0,
        0
      );

      doc.circle(
        px,
        py,
        1.3,
        "F"
      );

      // Etiqueta CAL

      doc.setFont(
        "helvetica",
        "normal"
      );

      doc.setFontSize(4.8);

      doc.setTextColor(
        50,
        50,
        50
      );

      doc.text(
        punto.nombre || "",
        px + 2,
        py - 1.5
      );
    }
  );

  // ----------------------------------------------------------
  // Ecuación y R²
  // ----------------------------------------------------------

  const ecuacion =
    obtenerEcuacion(curva);

  const r2 =
    obtenerR2(curva);

  doc.setFont(
    "helvetica",
    "normal"
  );

  doc.setFontSize(6.2);

  doc.setTextColor(
    40,
    40,
    40
  );

  doc.text(
    ecuacion,
    x + ancho / 2,
    y + alto - 11,
    {
      align: "center",
    }
  );

  if (r2 !== null) {
    doc.text(
      `R² = ${r2
        .toFixed(5)
        .replace(".", ",")}`,
      x + ancho / 2,
      y + alto - 6,
      {
        align: "center",
      }
    );
  }
};

// ============================================================
// EXPORTAR PDF
// ============================================================

export const exportarResultadosPdf = ({
  datosEnsayo,
  blancos,
  promedioBlancos,
  calibradores,
  control,
  resultados,
  curvas,
}) => {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const anchoPagina =
    doc.internal.pageSize.getWidth();

  const altoPagina =
    doc.internal.pageSize.getHeight();

  const margen = 12;

  // ==========================================================
  // ENCABEZADO
  // ==========================================================

  doc.setFont(
    "helvetica",
    "bold"
  );

  doc.setFontSize(16);

  doc.text(
    "AllergenA Basic Kit",
    margen,
    15
  );

  doc.setFontSize(9);

  doc.setFont(
    "helvetica",
    "normal"
  );

  doc.text(
    "REF RA1000 — Determinación cuantitativa de IgE específica",
    margen,
    21
  );

  doc.setDrawColor(
    80,
    80,
    80
  );

  doc.setLineWidth(0.4);

  doc.line(
    margen,
    24,
    anchoPagina - margen,
    24
  );

  // ==========================================================
  // IDENTIFICACIÓN DEL ENSAYO
  // ==========================================================

  doc.setFont(
    "helvetica",
    "bold"
  );

  doc.setFontSize(10);

  doc.text(
    "Identificación del ensayo",
    margen,
    32
  );

  doc.setFont(
    "helvetica",
    "normal"
  );

  doc.setFontSize(8);

  const fecha =
    datosEnsayo?.fecha || "";

  const lote =
    datosEnsayo?.lote || "";

  const operador =
    datosEnsayo?.operador || "";

  doc.text(
    `Fecha: ${fecha}`,
    margen,
    39
  );

  doc.text(
    `Lote: ${lote || "—"}`,
    margen + 65,
    39
  );

  doc.text(
    `Operador: ${operador || "—"}`,
    margen + 125,
    39
  );

  // ==========================================================
  // BLANCOS
  // ==========================================================

  doc.setFont(
    "helvetica",
    "bold"
  );

  doc.setFontSize(10);

  doc.text(
    "Blancos",
    margen,
    49
  );

  const blanco450_1 =
    numero(blancos?.do450_1);

  const blanco450_2 =
    numero(blancos?.do450_2);

  const blanco405_1 =
    numero(blancos?.do405_1);

  const blanco405_2 =
    numero(blancos?.do405_2);

  const promedio450 =
    promedio(
      blanco450_1,
      blanco450_2
    );

  const promedio405 =
    promedio(
      blanco405_1,
      blanco405_2
    );

  const LIMITE_BLANCO =
    0.09;

  const blanco450Valido =
    promedio450 !== null &&
    promedio450 <=
      LIMITE_BLANCO;

  const blanco405Valido =
    promedio405 !== null &&
    promedio405 <=
      LIMITE_BLANCO;

  autoTable(doc, {
    startY: 53,

    margin: {
      left: margen,
      right: margen,
    },

    head: [[
      "Filtro",
      "DO 1",
      "DO 2",
      "Promedio",
      "Límite",
      "Validación",
    ]],

    body: [
      [
        "450 nm",
        formatoNumero(
          blanco450_1
        ),
        formatoNumero(
          blanco450_2
        ),
        formatoNumero(
          promedio450
        ),
        "menor o igual a 0.090",
        blanco450Valido
          ? "Válido"
          : "No válido",
      ],

      [
        "405 nm",
        formatoNumero(
          blanco405_1
        ),
        formatoNumero(
          blanco405_2
        ),
        formatoNumero(
          promedio405
        ),
        "menor o igual a 0.090",
        blanco405Valido
          ? "Válido"
          : "No válido",
      ],
    ],

    theme: "grid",

    styles: {
      font: "helvetica",
      fontSize: 7,
      cellPadding: 2,
    },

    headStyles: {
      fontStyle: "bold",
      halign: "center",
    },

    bodyStyles: {
      halign: "center",
    },
  });

  // ==========================================================
  // CALIBRADORES
  // ==========================================================

  let yActual =
    doc.lastAutoTable.finalY + 8;

  doc.setFont(
    "helvetica",
    "bold"
  );

  doc.setFontSize(10);

  doc.text(
    "Calibradores",
    margen,
    yActual
  );

  const filasCalibradores =
    (calibradores || []).map(
      (cal) => [
        cal.nombre ||
          `CAL ${cal.id}`,

        numero(
          cal.concentracion
        ) !== null
          ? String(
              cal.concentracion
            )
          : "—",

        formatoNumero(
          cal.do450
        ),

        formatoNumero(
          cal.do405
        ),
      ]
    );

  autoTable(doc, {
    startY: yActual + 4,

    margin: {
      left: margen,
      right: margen,
    },

    head: [[
      "Calibrador",
      "Concentración (UI/mL)",
      "DO 450 nm",
      "DO 405 nm",
    ]],

    body: filasCalibradores,

    theme: "grid",

    styles: {
      font: "helvetica",
      fontSize: 7,
      cellPadding: 2,
    },

    headStyles: {
      fontStyle: "bold",
      halign: "center",
    },

    bodyStyles: {
      halign: "center",
    },
  });

  // ==========================================================
  // CONTROL
  // ==========================================================

  yActual =
    doc.lastAutoTable.finalY + 8;

  doc.setFont(
    "helvetica",
    "bold"
  );

  doc.setFontSize(10);

  doc.text(
    "Control",
    margen,
    yActual
  );

  autoTable(doc, {
    startY: yActual + 4,

    margin: {
      left: margen,
      right: margen,
    },

    head: [[
      "DO 450 nm",
      "DO 405 nm",
      "Mínimo",
      "Máximo",
    ]],

    body: [[
      formatoNumero(
        control?.do450
      ),

      formatoNumero(
        control?.do405
      ),

      formatoNumero(
        control?.minimo
      ),

      formatoNumero(
        control?.maximo
      ),
    ]],

    theme: "grid",

    styles: {
      font: "helvetica",
      fontSize: 7,
      cellPadding: 2,
    },

    headStyles: {
      fontStyle: "bold",
      halign: "center",
    },

    bodyStyles: {
      halign: "center",
    },
  });

  // ==========================================================
  // CURVAS DE CALIBRACIÓN
  // ==========================================================

  yActual =
    doc.lastAutoTable.finalY + 9;

  if (
    yActual >
    altoPagina - 105
  ) {
    doc.addPage();
    yActual = 15;
  }

  doc.setFont(
    "helvetica",
    "bold"
  );

  doc.setFontSize(11);

  doc.text(
    "Curvas de calibración",
    margen,
    yActual
  );

  const espacioCurvas =
    anchoPagina -
    margen * 2;

  const anchoCurva =
    espacioCurvas / 2 - 2;

  const altoCurva = 88;

  // ----------------------------------------------------------
  // Curva 450 nm
  // ----------------------------------------------------------

  dibujarCurva({
    doc,
    x: margen,
    y: yActual + 4,
    ancho: anchoCurva,
    alto: altoCurva,
    titulo:
      "Curva de calibración — 450 nm",

    calibradores:
      (calibradores || []).filter(
        (cal) =>
          Number(cal.id) >= 0 &&
          Number(cal.id) <= 4
      ),

    filtro: 450,

    curva: curvas?.curva450,
  });

  // ----------------------------------------------------------
  // Curva 405 nm
  // ----------------------------------------------------------

  dibujarCurva({
    doc,
    x:
      margen +
      anchoCurva +
      4,

    y: yActual + 4,

    ancho: anchoCurva,

    alto: altoCurva,

    titulo:
      "Curva de calibración — 405 nm",

    calibradores:
      calibradores || [],

    filtro: 405,

    curva: curvas?.curva405,
  });

  // ==========================================================
  // RESULTADOS
  // ==========================================================

  doc.addPage();

  doc.setFont(
    "helvetica",
    "bold"
  );

  doc.setFontSize(11);

  doc.text(
    "Resultados",
    margen,
    18
  );

  doc.setFont(
    "helvetica",
    "normal"
  );

  doc.setFontSize(7);

  doc.text(
    "Las concentraciones se expresan en UI/mL.",
    margen,
    24
  );

  // ==========================================================
  // TABLA DE RESULTADOS
  // ==========================================================

  const filasResultados =
    (resultados || []).map(
      (resultado) => {
        const fueraDeRango =
          resultado?.estado ===
          "Fuera de rango";

        const concentracion =
          numero(
            resultado?.concentracion
          );

        let igE = "—";
        let nivel = "—";

        if (
          !fueraDeRango &&
          concentracion !== null
        ) {
          igE =
            formatoConcentracion(
              concentracion
            );

          try {
            nivel =
              obtenerNivelIgE(
                concentracion
              ) || "—";
          } catch {
            nivel = "—";
          }
        }

        if (fueraDeRango) {
          igE =
            "Fuera de rango";

          nivel = "—";
        }

        return [
          // IMPORTANTE:
          // En App.jsx el identificador
          // de la muestra se llama "codigo".
          resultado?.codigo ||
            "—",

          formatoNumero(
            resultado?.do450
          ),

          formatoNumero(
            resultado?.do405
          ),

          resultado?.dilucion ?? 1,

          igE,

          nivel,
        ];
      }
    );

  autoTable(doc, {
    startY: 28,

    margin: {
      left: margen,
      right: margen,
    },

    head: [[
      "Código",
      "DO 450",
      "DO 405",
      "Dilución",
      "IgE (UI/mL)",
      "Nivel de IgE específica",
    ]],

    body: filasResultados,

    theme: "grid",

    styles: {
      font: "helvetica",
      fontSize: 7,
      cellPadding: 2.2,
      valign: "middle",
    },

    headStyles: {
      fontStyle: "bold",
      halign: "center",
    },

    bodyStyles: {
      halign: "center",
    },

    columnStyles: {
      0: {
        halign: "left",
      },

      4: {
        fontStyle: "bold",
      },

      5: {
        halign: "left",
      },
    },
  });

  // ==========================================================
  // PIE DE PÁGINA
  // ==========================================================

  const agregarPie = () => {
    const paginas =
      doc.getNumberOfPages();

    for (
      let i = 1;
      i <= paginas;
      i++
    ) {
      doc.setPage(i);

      doc.setDrawColor(
        180,
        180,
        180
      );

      doc.setLineWidth(0.2);

      doc.line(
        margen,
        altoPagina - 12,
        anchoPagina - margen,
        altoPagina - 12
      );

      doc.setFont(
        "helvetica",
        "normal"
      );

      doc.setFontSize(6.5);

      doc.setTextColor(
        100,
        100,
        100
      );

      doc.text(
        "AllergenA Basic Kit — REF RA1000",
        margen,
        altoPagina - 7
      );

      doc.text(
        `Página ${i} de ${paginas}`,
        anchoPagina - margen,
        altoPagina - 7,
        {
          align: "right",
        }
      );
    }
  };

  agregarPie();

  // ==========================================================
  // NOMBRE DEL ARCHIVO
  // ==========================================================

  const fechaArchivo =
    datosEnsayo?.fecha ||
    new Date()
      .toISOString()
      .slice(0, 10);

  doc.save(
    `IgE_RA1000_${fechaArchivo}.pdf`
  );
};

export default exportarResultadosPdf;