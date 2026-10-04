import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

function texto(valor) {
  if (valor === null || valor === undefined || valor === "") {
    return "—";
  }

  return String(valor);
}

function numero(valor, decimales) {
  const n = Number(valor);

  if (!Number.isFinite(n)) {
    return "—";
  }

  return n.toFixed(decimales);
}

export function exportarResultadosPdf({
  datosEnsayo,
  blancos,
  promedioBlancos,
  calibradores,
  control,
  resultados,
  curva,
}) {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const fecha = texto(datosEnsayo?.fecha);
  const margen = 14;
  let y = 16;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text("Calculadora de IgE Total", margen, y);

  y += 6;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(90);
  doc.text("ELISA cuantitativo", margen, y);
  doc.setTextColor(0);

  y += 10;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("Datos del ensayo", margen, y);

  y += 2;
  autoTable(doc, {
    startY: y,
    theme: "plain",
    styles: {
      fontSize: 10,
      cellPadding: 1.5,
    },
    body: [
      ["Fecha", fecha],
      ["Lote del kit", texto(datosEnsayo?.lote)],
      ["Operador", texto(datosEnsayo?.operador)],
    ],
    columnStyles: {
      0: { fontStyle: "bold", cellWidth: 40 },
    },
  });

  y = doc.lastAutoTable.finalY + 8;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("Blancos", margen, y);

  const blancosValidos =
  Number.isFinite(Number(promedioBlancos)) &&
  Number(promedioBlancos) <= 0.1;

y += 2;

autoTable(doc, {
  startY: y,
  theme: "grid",

  head: [
    ["DO 1", "DO 2", "Promedio"],
  ],

  body: [
    [
      numero(blancos?.do1, 3),
      numero(blancos?.do2, 3),
      numero(promedioBlancos, 3),
    ],
    [
      {
        content: "Validación de blancos",
        colSpan: 2,
        styles: {
          fontStyle: "bold",
          halign: "right",
        },
      },
      {
        content: blancosValidos
          ? "VÁLIDO"
          : "NO VÁLIDO",
        styles: {
          fontStyle: "bold",
          halign: "center",
          textColor: blancosValidos
            ? [25, 135, 84]
            : [220, 53, 69],
        },
      },
    ],
  ],

  styles: {
    fontSize: 9,
  },

  headStyles: {
    fillColor: [33, 37, 41],
    textColor: 255,
  },

  columnStyles: {
    0: {
      halign: "center",
    },
    1: {
      halign: "center",
    },
    2: {
      halign: "center",
    },
  },
});

  y = doc.lastAutoTable.finalY + 8;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("Calibradores", margen, y);

 // ==========================================================
// VALIDACIÓN CALIBRADOR 5
// ==========================================================

const calibrador5 = (calibradores || []).find(
  (calibrador) =>
    Number(calibrador.concentracion) === 500
);

const doCalibrador5 =
  calibrador5 &&
  Number.isFinite(Number(calibrador5.do1)) &&
  Number.isFinite(Number(promedioBlancos))
    ? Math.max(
        0,
        Number(calibrador5.do1) -
          Number(promedioBlancos)
      )
    : null;

const calibrador5Valido =
  doCalibrador5 !== null &&
  doCalibrador5 >= 1.5;

y += 2;

autoTable(doc, {
  startY: y,
  theme: "grid",

  head: [
    [
      "Calibrador",
      "Concentración (UI/mL)",
      "DO corregida",
    ],
  ],

  body: [
    ...(calibradores || []).map(
      (calibrador) => {
        const doCalibrador =
          Number(calibrador.do1);

        const blanco =
          Number(promedioBlancos);

        const doCorregida =
          Number.isFinite(doCalibrador) &&
          Number.isFinite(blanco)
            ? Math.max(
                0,
                doCalibrador - blanco
              )
            : null;

        return [
          texto(calibrador.nombre),
          texto(calibrador.concentracion),
          numero(doCorregida, 4),
        ];
      }
    ),

    [
      {
        content:
          "Validación CAL 5",
        colSpan: 2,
        styles: {
          fontStyle: "bold",
          halign: "right",
        },
      },
      {
        content: calibrador5Valido
          ? "VÁLIDO"
          : "NO VÁLIDO",
        styles: {
          fontStyle: "bold",
          halign: "center",
          textColor:
            calibrador5Valido
              ? [25, 135, 84]
              : [220, 53, 69],
        },
      },
    ],
  ],

  styles: {
    fontSize: 9,
  },

  headStyles: {
    fillColor: [33, 37, 41],
    textColor: 255,
  },

  columnStyles: {
    1: {
      halign: "center",
    },
    2: {
      halign: "center",
    },
  },
});

  if (
    control &&
    (control.do1 !== "" ||
      control.minimo !== "" ||
      control.maximo !== "")
  ) {
    y = doc.lastAutoTable.finalY + 8;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text("Control", margen, y);

    y += 2;
    autoTable(doc, {
      startY: y,
      theme: "grid",
      head: [["DO", "Mínimo", "Máximo"]],
      body: [
        [
          numero(control.do1, 4),
          numero(control.minimo, 3),
          numero(control.maximo, 3),
        ],
      ],
      styles: {
        fontSize: 9,
        halign: "center",
      },
      headStyles: {
        fillColor: [33, 37, 41],
        textColor: 255,
      },
    });
  }

  y = doc.lastAutoTable.finalY + 8;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("Resultados", margen, y);

  y += 2;
  autoTable(doc, {
    startY: y,
    theme: "grid",
    head: [["Muestra", "DO", "Dilución", "IgE (UI/mL)", "Estado"]],
    body: (resultados || []).map((resultado) => [
      texto(resultado.nombre),
      numero(resultado.doCorregida, 4),
      texto(resultado.dilucion),
      numero(resultado.concentracion, 2),
      texto(resultado.estado),
    ]),
    styles: {
      fontSize: 9,
    },
    headStyles: {
      fillColor: [13, 110, 253],
      textColor: 255,
    },
    columnStyles: {
      1: { halign: "center" },
      2: { halign: "center" },
      3: { halign: "center", fontStyle: "bold" },
      4: { halign: "center" },
    },
  });


  const nombreArchivo = `IgE_${fecha !== "—" ? fecha : "resultados"}.pdf`;
  doc.save(nombreArchivo);
}
