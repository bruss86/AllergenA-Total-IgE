import { useMemo, useState } from "react";

const FILAS = ["A", "B", "C", "D", "E", "F", "G", "H"];

const COLUMNAS = Array.from(
  { length: 12 },
  (_, i) => i + 1
);

// ============================================================
// INFORMACIÓN VISUAL DE CADA TIPO
// ============================================================

const TIPO_INFO = {
  vacio: {
    nombre: "Vacío",
    clase: "bg-light text-secondary",
  },

  blanco: {
    nombre: "Blanco",
    clase: "bg-secondary text-white",
  },

  calibrador: {
    nombre: "Calibrador",
    clase: "bg-primary text-white",
  },

  control: {
    nombre: "Control",
    clase: "bg-warning text-dark",
  },

  muestra: {
    nombre: "Muestra",
    clase: "bg-success text-white",
  },
};

// ============================================================
// GENERAR LAS 96 POSICIONES
//
// IMPORTANTE:
// El orden de llenado es:
//
// A1
// B1
// C1
// D1
// E1
// F1
// G1
// H1
// A2
// B2
// ...
// H12
// ============================================================

function generarPosiciones() {
  const posiciones = [];

  for (let columna = 1; columna <= 12; columna++) {
    for (let fila = 0; fila < 8; fila++) {
      posiciones.push({
        fila: FILAS[fila],
        columna,
        posicion: `${FILAS[fila]}${columna}`,
      });
    }
  }

  return posiciones;
}

// ============================================================
// GENERAR DISTRIBUCIÓN AUTOMÁTICA
// ============================================================

function generarDistribucion(
  calibradores,
  control,
  muestras
) {
  const posiciones = generarPosiciones();

  const elementos = [];

  // ==========================================================
  // BLANCO
  //
  // El blanco se coloca POR DUPLICADO.
  // ==========================================================

  elementos.push({
    tipo: "blanco",
    referencia: "BLANCO",
    replicado: 1,
  });

  elementos.push({
    tipo: "blanco",
    referencia: "BLANCO",
    replicado: 2,
  });

  // ==========================================================
  // CALIBRADORES
  //
  // Un solo pocillo por calibrador.
  // DO1 y DO2 son lecturas del mismo pocillo.
  // ==========================================================

  calibradores.forEach((calibrador) => {
    elementos.push({
      tipo: "calibrador",
      referencia: calibrador.nombre,
      id: calibrador.id,
      concentracion: calibrador.concentracion,
      do1: calibrador.do1,
    });
  });

  // ==========================================================
  // CONTROL
  //
  // Un solo pocillo.
  // DO1 y DO2 son lecturas del mismo pocillo.
  // ==========================================================

  elementos.push({
    tipo: "control",
    referencia: "CONTROL",
    do1: control?.do1,
    do2: control?.do2,
  });

  // ==========================================================
  // MUESTRAS
  //
  // Un solo pocillo por muestra.
  // DO1 y DO2 son lecturas del mismo pocillo.
  // ==========================================================

  muestras.forEach((muestra) => {
    elementos.push({
      tipo: "muestra",
      referencia: muestra.nombre,
      id: muestra.id,
      do1: muestra.do1,
      do2: muestra.do2,
      dilucion: muestra.dilucion,
    });
  });

  // ==========================================================
  // ASIGNAR LOS ELEMENTOS A LOS POCILLOS
  // ==========================================================

  return posiciones.map((posicion, indice) => {
    const elemento = elementos[indice];

    if (!elemento) {
      return {
        ...posicion,
        tipo: "vacio",
        referencia: "",
      };
    }

    return {
      ...posicion,
      ...elemento,
    };
  });
}

// ============================================================
// COMPONENTE
// ============================================================

export default function Microplaca({
  calibradores = [],
  control = {},
  muestras = [],
}) {
  const [seleccionado, setSeleccionado] =
    useState(null);

  // ==========================================================
  // GENERAR PLACA
  // ==========================================================

  const placa = useMemo(
    () =>
      generarDistribucion(
        calibradores,
        control,
        muestras
      ),
    [calibradores, control, muestras]
  );

  // ==========================================================
  // POCILLO SELECCIONADO
  // ==========================================================

  const pocilloSeleccionado = placa.find(
    (pocillo) =>
      pocillo.posicion === seleccionado
  );

  // ==========================================================
  // PROMEDIO DO
  // ==========================================================

  const calcularPromedio = (do1, do2) => {
    const valor1 = parseFloat(do1);
    const valor2 = parseFloat(do2);

    if (
      !Number.isFinite(valor1) ||
      !Number.isFinite(valor2)
    ) {
      return null;
    }

    return (valor1 + valor2) / 2;
  };

  // ==========================================================
  // RENDER
  // ==========================================================

  return (
    <div className="card shadow-sm mb-3">

      {/* ================================================== */}
      {/* HEADER */}
      {/* ================================================== */}

      <div className="card-header fw-semibold d-flex justify-content-between align-items-center">

        <span>
          <i className="bi bi-grid-3x3-gap me-2"></i>
          Distribución de la microplaca
        </span>

        <span className="badge text-bg-light">
          96 pocillos
        </span>

      </div>

      <div className="card-body">

        {/* ================================================== */}
        {/* LEYENDA */}
        {/* ================================================== */}

        <div className="d-flex flex-wrap gap-3 mb-3 small">

          {Object.entries(TIPO_INFO)
            .filter(
              ([tipo]) => tipo !== "vacio"
            )
            .map(([tipo, info]) => (

              <div
                key={tipo}
                className="d-flex align-items-center gap-1"
              >

                <span
                  className={`rounded-circle ${info.clase}`}
                  style={{
                    width: "16px",
                    height: "16px",
                    display: "inline-block",
                    border: "1px solid #aaa",
                  }}
                />

                {info.nombre}

              </div>

            ))}

        </div>

        {/* ================================================== */}
        {/* PLACA */}
        {/* ================================================== */}

        <div className="table-responsive">

          <table
            className="table table-bordered text-center align-middle mb-0"
            style={{
              minWidth: "900px",
              tableLayout: "fixed",
            }}
          >

            {/* CABECERA */}

            <thead>

              <tr>

                <th
                  style={{
                    width: "42px",
                    backgroundColor: "#f8f9fa",
                  }}
                >
                  #
                </th>

                {COLUMNAS.map((columna) => (

                  <th
                    key={columna}
                    style={{
                      backgroundColor: "#f8f9fa",
                      fontSize: "12px",
                      width: "70px",
                    }}
                  >
                    {columna}
                  </th>

                ))}

              </tr>

            </thead>

            {/* FILAS */}

            <tbody>

              {FILAS.map((fila) => (

                <tr key={fila}>

                  {/* LETRA */}

                  <th
                    style={{
                      backgroundColor: "#f8f9fa",
                      fontSize: "12px",
                    }}
                  >
                    {fila}
                  </th>

                  {/* POCILLOS */}

                  {COLUMNAS.map((columna) => {

                    const pocillo = placa.find(
                      (p) =>
                        p.fila === fila &&
                        p.columna === columna
                    );

                    const info =
                      TIPO_INFO[pocillo.tipo];

                    const activo =
                      seleccionado ===
                      pocillo.posicion;

                    return (

                      <td
                        key={pocillo.posicion}
                        className="p-1"
                      >

                        <button
                          type="button"
                          className={`border rounded-circle ${info.clase}`}
                          onClick={() =>
                            setSeleccionado(
                              pocillo.posicion
                            )
                          }
                          title={
                            pocillo.tipo === "vacio"
                              ? pocillo.posicion
                              : `${pocillo.posicion} - ${pocillo.referencia}`
                          }
                          style={{
                            width: "50px",
                            height: "50px",
                            display: "flex",
                            flexDirection:
                              "column",
                            alignItems: "center",
                            justifyContent:
                              "center",
                            margin: "auto",
                            padding: "2px",
                            fontSize: "9px",
                            fontWeight: "600",
                            boxShadow: activo
                              ? "0 0 0 3px rgba(13,110,253,.35)"
                              : "none",
                            transition:
                              "all .15s ease",
                          }}
                        >

                          <span>
                            {pocillo.posicion}
                          </span>

                          {pocillo.tipo !==
                            "vacio" && (

                            <span
                              style={{
                                fontSize: "8px",
                                lineHeight: "9px",
                                maxWidth: "45px",
                                overflow: "hidden",
                                textOverflow:
                                  "ellipsis",
                                whiteSpace:
                                  "nowrap",
                              }}
                            >
                              {pocillo.referencia}
                            </span>

                          )}

                        </button>

                      </td>

                    );
                  })}

                </tr>

              ))}

            </tbody>

          </table>

        </div>

        {/* ================================================== */}
        {/* INFORMACIÓN DEL POCILLO */}
        {/* ================================================== */}

        {pocilloSeleccionado && (

          <div className="border rounded p-3 mt-3 bg-light">

            <div className="d-flex justify-content-between align-items-start">

              <div>

                <div className="fw-semibold">
                  Pocillo{" "}
                  {pocilloSeleccionado.posicion}
                </div>

                <div className="small text-muted">
                  {
                    TIPO_INFO[
                      pocilloSeleccionado.tipo
                    ].nombre
                  }

                  {pocilloSeleccionado.referencia &&
                    ` · ${pocilloSeleccionado.referencia}`}

                </div>

              </div>

              <button
                type="button"
                className="btn btn-sm btn-outline-secondary"
                onClick={() =>
                  setSeleccionado(null)
                }
              >
                <i className="bi bi-x-lg"></i>
              </button>

            </div>

            {/* ================================================= */}
            {/* CALIBRADOR */}
            {/* ================================================= */}

            {pocilloSeleccionado.tipo ===
              "calibrador" && (

              <div className="row g-2 mt-2">

                <div className="col-md-4">

                  <div className="small text-muted">
                    Concentración
                  </div>

                  <div className="fw-semibold">
                    {
                      pocilloSeleccionado
                        .concentracion
                    }{" "}
                    UI/mL
                  </div>

                </div>

                <div className="col-md-4">

                  <div className="small text-muted">
                    DO 1
                  </div>

                  <div className="fw-semibold">
                    {pocilloSeleccionado.do1 ||
                      "—"}
                  </div>

                </div>

              </div>

            )}

            {/* ================================================= */}
            {/* CONTROL */}
            {/* ================================================= */}

            {pocilloSeleccionado.tipo ===
              "control" && (

              <div className="row g-2 mt-2">

                <div className="col-md-4">

                  <div className="small text-muted">
                    DO 1
                  </div>

                  <div className="fw-semibold">
                    {pocilloSeleccionado.do1 ||
                      "—"}
                  </div>

                </div>

              </div>

            )}

            {/* ================================================= */}
            {/* MUESTRA */}
            {/* ================================================= */}

            {pocilloSeleccionado.tipo ===
              "muestra" && (

              <div className="row g-2 mt-2">

                <div className="col-md-3">

                  <div className="small text-muted">
                    DO 1
                  </div>

                  <div className="fw-semibold">
                    {pocilloSeleccionado.do1 ||
                      "—"}
                  </div>

                </div>

                <div className="col-md-3">

                  <div className="small text-muted">
                    Dilución
                  </div>

                  <div className="fw-semibold">
                    {pocilloSeleccionado.dilucion ??
                      "—"}
                  </div>

                </div>

              </div>

            )}

            {/* ================================================= */}
            {/* BLANCO */}
            {/* ================================================= */}

            {pocilloSeleccionado.tipo ===
              "blanco" && (

              <div className="mt-2 small text-muted">
                Blanco del ensayo · réplica{" "}
                {pocilloSeleccionado.replicado}
              </div>

            )}

          </div>

        )}


      </div>

    </div>
  );
}