import { useRef, useState } from "react";

import "bootstrap/dist/css/bootstrap.min.css";
import "bootstrap-icons/font/bootstrap-icons.css";
import "./index.css";
import * as XLSX from "xlsx";

import {
  calcularCurva,
  calcularMuestras,
} from "./utils/calculoIge";

import { exportarResultadosPdf } from "./utils/exportarPdf";

import CurvaCalibracion from "./components/CurvaCalibracion";
import Microplaca from "./components/Microplaca";

// ============================================================
// CALIBRADORES INICIALES
// ============================================================

const calibradoresIniciales = [
  {
    id: 0,
    nombre: "CAL 0",
    concentracion: 0,
    do1: "",
  },
  {
    id: 1,
    nombre: "CAL 1",
    concentracion: 10,
    do1: "",
  },
  {
    id: 2,
    nombre: "CAL 2",
    concentracion: 50,
    do1: "",
  },
  {
    id: 3,
    nombre: "CAL 3",
    concentracion: 100,
    do1: "",
  },
  {
    id: 4,
    nombre: "CAL 4",
    concentracion: 250,
    do1: "",
  },
  {
    id: 5,
    nombre: "CAL 5",
    concentracion: 500,
    do1: "",
  },
];

// ============================================================
// MUESTRAS INICIALES
// ============================================================

const muestrasIniciales = [
  {
    id: 1,
    nombre: "M-001",
    do1: "",
    dilucion: 1,
  },
];

// ============================================================
// APP
// ============================================================

function App() {

  const inputExcelRef = useRef(null);
  // ==========================================================
  // DATOS DEL ENSAYO
  // ==========================================================

  const [datosEnsayo, setDatosEnsayo] = useState({
    fecha: new Date().toISOString().slice(0, 10),
    lote: "",
    operador: "",
  });

  // ==========================================================
  // CALIBRADORES
  // ==========================================================

  const [calibradores, setCalibradores] = useState(
    calibradoresIniciales
  );

  // ==========================================================
  // CONTROL
  // ==========================================================

  const [control, setControl] = useState({
    do1: "",
    minimo: "",
    maximo: "",
  });

  // ==========================================================
  // BLANCOS
  // ==========================================================

  const [blancos, setBlancos] = useState({
    do1: 0,
    do2: 0,
  });

  // ==========================================================
  // MUESTRAS
  // ==========================================================

  const [muestras, setMuestras] =
    useState(muestrasIniciales);

  const [cantidadMuestras, setCantidadMuestras] =
    useState(1);

  // ==========================================================
  // RESULTADOS
  // ==========================================================

  const [resultados, setResultados] = useState([]);

  const [curva, setCurva] = useState(null);

  const [errorCalculo, setErrorCalculo] =
    useState("");

  // ==========================================================
  // ACTUALIZAR DATOS DEL ENSAYO
  // ==========================================================

  const actualizarEnsayo = (
    campo,
    valor
  ) => {
    setDatosEnsayo((prev) => ({
      ...prev,
      [campo]: valor,
    }));
  };

  // ==========================================================
  // ACTUALIZAR CALIBRADOR
  // ==========================================================

  const actualizarCalibrador = (
    id,
    campo,
    valor
  ) => {
    setCalibradores((prev) =>
      prev.map((calibrador) =>
        calibrador.id === id
          ? {
              ...calibrador,
              [campo]: valor,
            }
          : calibrador
      )
    );
  };

  // ==========================================================
  // ACTUALIZAR CONTROL
  // ==========================================================

  const actualizarControl = (
    campo,
    valor
  ) => {
    setControl((prev) => ({
      ...prev,
      [campo]: valor,
    }));
  };

  // ==========================================================
  // ACTUALIZAR BLANCO
  // ==========================================================

  const actualizarBlanco = (
    campo,
    valor
  ) => {
    setBlancos((prev) => ({
      ...prev,
      [campo]: valor,
    }));
  };

  // ==========================================================
  // PROMEDIO DE BLANCOS
  // ==========================================================

  const blancoDO1 = Number(
    blancos.do1
  );

  const blancoDO2 = Number(
    blancos.do2
  );

  const blancosCompletos =
    blancos.do1 !== "" &&
    blancos.do2 !== "" &&
    Number.isFinite(blancoDO1) &&
    Number.isFinite(blancoDO2);

  const promedioBlancos =
    blancosCompletos
      ? (blancoDO1 + blancoDO2) / 2
      : null;

  const blancosValidos =
    promedioBlancos !== null &&
    promedioBlancos <= 0.1;

  // ==========================================================
  // ACTUALIZAR MUESTRA
  // ==========================================================

  const actualizarMuestra = (
    id,
    campo,
    valor
  ) => {
    setMuestras((prev) =>
      prev.map((muestra) =>
        muestra.id === id
          ? {
              ...muestra,
              [campo]: valor,
            }
          : muestra
      )
    );
  };

  // ==========================================================
  // AGREGAR MUESTRAS
  // ==========================================================

  const agregarMuestras = () => {
    const cantidad = Math.max(
      1,
      parseInt(
        cantidadMuestras,
        10
      ) || 1
    );

    const ultimoId =
      muestras.length > 0
        ? Math.max(
            ...muestras.map(
              (muestra) =>
                muestra.id
            )
          )
        : 0;

    const nuevasMuestras =
      Array.from(
        {
          length: cantidad,
        },
        (_, indice) => {
          const nuevoId =
            ultimoId +
            indice +
            1;

          return {
            id: nuevoId,
            nombre: `M-${String(
              nuevoId
            ).padStart(3, "0")}`,
            do1: "",
            dilucion: 1,
          };
        }
      );

    setMuestras((prev) => [
      ...prev,
      ...nuevasMuestras,
    ]);

    setCantidadMuestras(1);
  };

  // ==========================================================
  // ELIMINAR MUESTRA
  // ==========================================================

  const eliminarMuestra = (
    id
  ) => {
    setMuestras((prev) =>
      prev.filter(
        (muestra) =>
          muestra.id !== id
      )
    );
  };

  // ==========================================================
// IMPORTAR EXCEL
// ==========================================================

const importarExcel = (e) => {
  const archivo = e.target.files?.[0];

  if (!archivo) {
    return;
  }

  const lector = new FileReader();

  lector.onload = (evento) => {
    try {
      const datos = new Uint8Array(
        evento.target.result
      );

      const workbook = XLSX.read(datos, {
        type: "array",
      });

      const nombreHoja =
        workbook.SheetNames[0];

      const hoja =
        workbook.Sheets[nombreHoja];

      const filas = XLSX.utils.sheet_to_json(
        hoja,
        {
          header: 1,
          defval: "",
        }
      );

      const nuevasFilas = filas
        .map((fila) => ({
          tipo: String(
            fila[0] ?? ""
          )
            .trim()
            .toUpperCase(),

          identificacion: String(
            fila[1] ?? ""
          ).trim(),

          do: fila[2],
        }))
        .filter(
          (fila) =>
            fila.tipo !== ""
        );

      // ------------------------------------------------------
      // BLANCOS
      // ------------------------------------------------------

      const blanco1 =
        nuevasFilas.find(
          (fila) =>
            fila.tipo === "A1"
        );

      const blanco2 =
        nuevasFilas.find(
          (fila) =>
            fila.tipo === "A2"
        );

      if (blanco1) {
        actualizarBlanco(
          "do1",
          blanco1.do
        );
      }

      if (blanco2) {
        actualizarBlanco(
          "do2",
          blanco2.do
        );
      }

      // ------------------------------------------------------
      // CALIBRADORES
      // ------------------------------------------------------

      setCalibradores((prev) =>
        prev.map((calibrador) => {
          const numero =
            calibrador.id;

          const fila =
            nuevasFilas.find(
              (item) =>
                item.tipo ===
                `C${numero}`
            );

          if (!fila) {
            return calibrador;
          }

          return {
            ...calibrador,
            do1:
              fila.do !== ""
                ? String(fila.do)
                : "",
          };
        })
      );

      // ------------------------------------------------------
      // CONTROL
      // ------------------------------------------------------

      const filaControl =
        nuevasFilas.find(
          (fila) =>
            fila.tipo === "CTL"
        );

      if (filaControl) {
        actualizarControl(
          "do1",
          filaControl.do
        );
      }

      // ------------------------------------------------------
      // MUESTRAS
      // ------------------------------------------------------

      const filasMuestras =
        nuevasFilas.filter(
          (fila) =>
            /^M\d+$/i.test(
              fila.tipo
            )
        );

      const nuevasMuestras =
        filasMuestras.map(
          (fila, indice) => ({
            id:
              Date.now() +
              indice,

            nombre:
              fila.identificacion ||
              fila.tipo,

            do1:
              fila.do !== ""
                ? String(fila.do)
                : "",

            dilucion: 1,
          })
        );

      if (
        nuevasMuestras.length > 0
      ) {
        setMuestras(
          nuevasMuestras
        );
      }

      // ------------------------------------------------------
      // LIMPIAR RESULTADOS ANTERIORES
      // ------------------------------------------------------

      setCurva(null);
      setResultados([]);
      setErrorCalculo("");

    } catch (error) {
      console.error(
        "Error al importar Excel:",
        error
      );

      setErrorCalculo(
        "No fue posible leer el archivo Excel."
      );
    } finally {
      // Permite volver a seleccionar el mismo archivo.
      e.target.value = "";
    }
  };

  lector.readAsArrayBuffer(
    archivo
  );
};


  // ==========================================================
// RESTABLECER VALORES INICIALES
// ==========================================================

  const restablecerValores = () => {
    setDatosEnsayo({
      fecha: new Date().toISOString().slice(0, 10),
      lote: "",
      operador: "",
    });

    setCalibradores(
      calibradoresIniciales.map((calibrador) => ({
        ...calibrador,
      }))
    );

    setControl({
      do1: "",
      minimo: "",
      maximo: "",
    });

    setBlancos({
      do1: 0,
      do2: 0,
    });

    setMuestras(
      muestrasIniciales.map((muestra) => ({
        ...muestra,
      }))
    );

    setCantidadMuestras(1);

    setResultados([]);
    setCurva(null);
    setErrorCalculo("");
  };

  // ==========================================================
  // CALCULAR
  // ==========================================================

  const calcular = () => {
    try {
      setErrorCalculo("");

      // ------------------------------------------------------
      // VALIDAR BLANCOS
      // ------------------------------------------------------

      if (!blancosCompletos) {
        throw new Error(
          "Debe ingresar las DO de ambos blancos."
        );
      }

      if (!blancosValidos) {
        throw new Error(
          "El promedio de los blancos debe ser menor o igual a 0.100."
        );
      }

      // ------------------------------------------------------
      // CALCULAR CURVA
      // ------------------------------------------------------

      const nuevaCurva =
        calcularCurva(
          calibradores,
          promedioBlancos
        );

      // ------------------------------------------------------
      // CALCULAR MUESTRAS
      // ------------------------------------------------------

      const nuevosResultados =
        calcularMuestras(
          muestras,
          nuevaCurva
        );

      setCurva(nuevaCurva);

      setResultados(
        nuevosResultados
      );
    } catch (error) {
      console.error(error);

      setErrorCalculo(
        error.message ||
          "No fue posible realizar el cálculo."
      );

      setCurva(null);

      setResultados([]);
    }
  };

  // ==========================================================
  // EXPORTAR PDF
  // ==========================================================

  const exportarPdf = () => {
    if (!curva) {
      return;
    }

    exportarResultadosPdf({
      datosEnsayo,
      blancos,
      promedioBlancos,
      calibradores,
      control,
      resultados,
      curva,
    });
  };

  // ==========================================================
  // RENDER
  // ==========================================================

  return (
    <div className="container-fluid py-3">

      {/* ================================================== */}
      {/* ENCABEZADO */}
      {/* ================================================== */}

      <div className="d-flex align-items-center justify-content-between mb-3">

  <div>

    <h3 className="mb-0">
      <i className="bi bi-droplet-half me-2"></i>
      AllergenA Total IgE
    </h3>

    <small className="text-muted">
      REF: RA1002
    </small>

  </div>

  <div>

    <button
      type="button"
      className="btn btn-outline-primary"
      onClick={() =>
        inputExcelRef.current?.click()
      }
    >
      <i className="bi bi-file-earmark-excel me-1"></i>
      Importar
    </button>

    <input
      ref={inputExcelRef}
      type="file"
      accept=".xlsx,.xls"
      className="d-none"
      onChange={importarExcel}
    />

  </div>

</div>

      {/* ================================================== */}
      {/* DATOS DEL ENSAYO */}
      {/* ================================================== */}

      <div className="card shadow-sm mb-3">

        <div className="card-header fw-semibold">

          <i className="bi bi-clipboard-data me-2"></i>

          Datos del ensayo

        </div>

        <div className="card-body">

          <div className="row g-2">

            {/* FECHA */}

            <div className="col-md-4">

              <label className="form-label">
                Fecha
              </label>

              <input
                type="date"
                className="form-control"
                value={
                  datosEnsayo.fecha
                }
                onChange={(e) =>
                  actualizarEnsayo(
                    "fecha",
                    e.target.value
                  )
                }
              />

            </div>

            {/* LOTE */}

            <div className="col-md-4">

              <label className="form-label">
                Lote del kit
              </label>

              <input
                type="text"
                className="form-control"
                value={
                  datosEnsayo.lote
                }
                onChange={(e) =>
                  actualizarEnsayo(
                    "lote",
                    e.target.value
                  )
                }
                placeholder="Lote"
              />

            </div>

            {/* OPERADOR */}

            <div className="col-md-4">

              <label className="form-label">
                Operador
              </label>

              <input
                type="text"
                className="form-control"
                value={
                  datosEnsayo.operador
                }
                onChange={(e) =>
                  actualizarEnsayo(
                    "operador",
                    e.target.value
                  )
                }
                placeholder="Nombre"
              />

            </div>

          </div>

        </div>

      </div>

      {/* ================================================== */}
      {/* MICROPLACA */}
      {/* ================================================== */}

      <Microplaca
        calibradores={calibradores}
        control={control}
        muestras={muestras}
      />

      {/* ================================================== */}
      {/* CALIBRADORES / CONTROL / BLANCOS */}
      {/* ================================================== */}

      <div className="row g-3 mb-4">

        {/* ====================================================
            COLUMNA IZQUIERDA — CALIBRADORES
            ==================================================== */}

        <div className="col-12 col-lg-8">

          <div className="card shadow-sm h-100">

            <div className="card-header">

              <strong>

                <i className="bi bi-bar-chart-line me-2"></i>

                Calibradores

              </strong>

            </div>

            <div className="card-body">

              <div className="table-responsive">

                <table className="table table-sm table-bordered align-middle mb-0">

                  <thead>

                    <tr>

                      <th>
                        Calibrador
                      </th>

                      <th
                        style={{
                          width: "150px",
                        }}
                      >
                        Concentración (UI/mL)
                      </th>

                      <th
                        style={{
                          width: "150px",
                        }}
                      >
                        DO
                      </th>

                    </tr>

                  </thead>

                  <tbody>

                    {calibradores.map(
                      (
                        calibrador
                      ) => (

                        <tr
                          key={
                            calibrador.id
                          }
                        >

                          <td>

                            <strong>
                              {
                                calibrador.nombre
                              }
                            </strong>

                          </td>

                          <td className="text-center">

                            {
                              calibrador.concentracion
                            }

                          </td>

                          <td>

                            <input
                              type="number"
                              className="form-control form-control-sm"
                              step="0.001"
                              min="0"
                              value={
                                calibrador.do1
                              }
                              onChange={(e) =>
                                actualizarCalibrador(
                                  calibrador.id,
                                  "do1",
                                  e.target.value
                                )
                              }
                              placeholder="DO"
                            />

                          </td>

                        </tr>

                      )
                    )}

                  </tbody>

                </table>

              </div>

            </div>

          </div>

        </div>

        {/* ====================================================
            COLUMNA DERECHA
            ==================================================== */}

        <div className="col-12 col-lg-4">

          <div className="d-flex flex-column gap-3 h-100">

            {/* ==================================================
                CONTROL
                ================================================== */}

            <div className="card shadow-sm">

              <div className="card-header">

                <strong>

                  <i className="bi bi-check-circle me-2"></i>

                  Control

                </strong>

              </div>

              <div className="card-body">

                <div className="mb-3">

                  <label className="form-label">
                    DO
                  </label>

                  <input
                    type="number"
                    className="form-control"
                    step="0.001"
                    min="0"
                    value={
                      control.do1
                    }
                    onChange={(e) =>
                      actualizarControl(
                        "do1",
                        e.target.value
                      )
                    }
                    placeholder="DO del control"
                  />

                </div>

                <div className="row g-2">

                  <div className="col-6">

                    <label className="form-label">
                      Mínimo
                    </label>

                    <input
                      type="number"
                      className="form-control"
                      min="0"
                      step="0.1"
                      value={
                        control.minimo
                      }
                      onChange={(e) =>
                        actualizarControl(
                          "minimo",
                          e.target.value
                        )
                      }
                    />

                  </div>

                  <div className="col-6">

                    <label className="form-label">
                      Máximo
                    </label>

                    <input
                      type="number"
                      className="form-control"
                      min="0"
                      step="0.1"
                      value={
                        control.maximo
                      }
                      onChange={(e) =>
                        actualizarControl(
                          "maximo",
                          e.target.value
                        )
                      }
                    />

                  </div>

                </div>

              </div>

            </div>

            {/* ==================================================
                BLANCOS
                ================================================== */}

            <div className="card shadow-sm flex-grow-1">

              <div className="card-header">

                <strong>

                  <i className="bi bi-droplet me-2"></i>

                  Blancos

                </strong>

              </div>

              <div className="card-body">

                <div className="row g-2">

                  <div className="col-6">

                    <label className="form-label">
                      DO 1
                    </label>

                    <input
                      type="number"
                      className="form-control"
                      step="0.001"
                      min="0"
                      value={
                        blancos.do1
                      }
                      onChange={(e) =>
                        actualizarBlanco(
                          "do1",
                          e.target.value
                        )
                      }
                    />

                  </div>

                  <div className="col-6">

                    <label className="form-label">
                      DO 2
                    </label>

                    <input
                      type="number"
                      className="form-control"
                      step="0.001"
                      min="0"
                      value={
                        blancos.do2
                      }
                      onChange={(e) =>
                        actualizarBlanco(
                          "do2",
                          e.target.value
                        )
                      }
                    />

                  </div>

                </div>

                {/* PROMEDIO */}

                <div className="mt-3 p-2 rounded border bg-light">

                  <div className="d-flex justify-content-between">

                    <span>
                      Promedio
                    </span>

                    <strong>

                      {
                        promedioBlancos !== null
                          ? promedioBlancos.toFixed(
                              3
                            )
                          : "—"
                      }

                    </strong>

                  </div>

                </div>

                {/* ESTADO */}

                <div className="mt-2">

                  {!blancosCompletos ? (

                    <span className="text-muted">
                      Ingrese ambos blancos
                    </span>

                  ) : blancosValidos ? (

                    <span className="text-success">

                      <i className="bi bi-check-circle-fill me-1"></i>

                      Blanco válido

                    </span>

                  ) : (

                    <span className="text-danger">

                      <i className="bi bi-exclamation-triangle-fill me-1"></i>

                      Blanco fuera de límite

                    </span>

                  )}

                </div>

                <small className="text-muted d-block mt-2">
                  Límite: ≤ 0,100
                </small>

              </div>

            </div>

          </div>

        </div>

      </div>

      {/* ================================================== */}
      {/* MUESTRAS */}
      {/* ================================================== */}

      <div className="card shadow-sm mb-3">

        <div className="card-header d-flex justify-content-between align-items-center">

          <span className="fw-semibold">

            <i className="bi bi-eyedropper me-2"></i>

            Muestras

          </span>

          <div className="d-flex align-items-center gap-2">

            <label className="small mb-0">
              Cantidad
            </label>

            <input
              type="number"
              min="1"
              step="1"
              className="form-control form-control-sm"
              style={{
                width: "75px",
              }}
              value={
                cantidadMuestras
              }
              onChange={(e) =>
                setCantidadMuestras(
                  Math.max(
                    1,
                    parseInt(
                      e.target.value,
                      10
                    ) || 1
                  )
                )
              }
            />

            <button
              type="button"
              className="btn btn-sm btn-outline-primary"
              onClick={
                agregarMuestras
              }
            >

              <i className="bi bi-plus-lg me-1"></i>

              Agregar muestras

            </button>

          </div>

        </div>

        <div className="card-body p-0">

          <div className="table-responsive">

            <table className="table table-sm table-hover mb-0 align-middle">

              <thead className="table-light">

                <tr>

                  <th>
                    Muestra
                  </th>

                  <th>
                    DO
                  </th>

                  <th>
                    Dilución
                  </th>

                  <th></th>

                </tr>

              </thead>

              <tbody>

                {muestras.map(
                  (muestra) => (

                    <tr
                      key={
                        muestra.id
                      }
                    >

                      <td>

                        <input
                          type="text"
                          className="form-control form-control-sm"
                          value={
                            muestra.nombre
                          }
                          onChange={(e) =>
                            actualizarMuestra(
                              muestra.id,
                              "nombre",
                              e.target.value
                            )
                          }
                        />

                      </td>

                      <td>

                        <input
                          type="number"
                          step="any"
                          className="form-control form-control-sm"
                          min="0"
                          value={
                            muestra.do1
                          }
                          onChange={(e) => {
                            const valor = e.target.value;
                            if (
                                valor !== "" &&
                                Number(valor) < 0
                              ) {
                                return;
                              }
                            actualizarMuestra(
                              muestra.id,
                              "do1",
                              e.target.value
                            );
                          }}
                        />

                      </td>

                      <td
                        style={{
                          width: "120px",
                        }}
                      >

                        <input
                          type="number"
                          min="1"
                          step="1"
                          className="form-control form-control-sm"
                          value={
                            muestra.dilucion
                          }
                          onChange={(e) =>
                            actualizarMuestra(
                              muestra.id,
                              "dilucion",
                              e.target.value
                            )
                          }
                        />

                      </td>

                      <td>

                        <button
                          type="button"
                          className="btn btn-sm btn-outline-danger"
                          onClick={() =>
                            eliminarMuestra(
                              muestra.id
                            )
                          }
                          disabled={
                            muestras.length ===
                            1
                          }
                          title="Eliminar muestra"
                        >

                          <i className="bi bi-trash"></i>

                        </button>

                      </td>

                    </tr>

                  )
                )}

              </tbody>

            </table>

          </div>

        </div>

      </div>

      {/* ================================================== */}
      {/* CALCULAR */}
      {/* ================================================== */}

      <div className="d-flex justify-content-end gap-2 mb-3">

        <button
          type="button"
          className="btn btn-outline-secondary btn-lg px-4"
          onClick={restablecerValores}
        >
          <i className="bi bi-arrow-counterclockwise me-2"></i>
          Restablecer valores
        </button>

        <button
          type="button"
          className="btn btn-primary btn-lg px-4"
          onClick={calcular}
        >
          <i className="bi bi-calculator me-2"></i>
          Calcular resultados
        </button>

      </div>

      {/* ================================================== */}
      {/* ERROR */}
      {/* ================================================== */}

      {errorCalculo && (

        <div className="alert alert-danger">

          <i className="bi bi-exclamation-triangle-fill me-2"></i>

          {errorCalculo}

        </div>

      )}

      {/* ================================================== */}
      {/* RESULTADOS */}
      {/* ================================================== */}

      {curva && (

        <div className="card shadow-sm mb-3">

          <div className="card-header fw-semibold d-flex justify-content-between align-items-center">

            <span>

              <i className="bi bi-check-circle me-2"></i>

              Resultados

            </span>

            <button
              type="button"
              className="btn btn-sm btn-outline-secondary"
              onClick={exportarPdf}
            >

              <i className="bi bi-file-earmark-pdf me-1"></i>

              Exportar PDF

            </button>

          </div>

          <div className="card-body p-0">

            <div className="table-responsive">

              <table className="table table-sm table-hover mb-0 align-middle">

                <thead className="table-light">

                  <tr>

                    <th>
                      Muestra
                    </th>

                    <th>
                      DO
                    </th>

                    <th>
                      Dilución
                    </th>

                    <th>
                      IgE (UI/mL)
                    </th>

                    <th>
                      Estado
                    </th>

                  </tr>

                </thead>

                <tbody>

                  {resultados.map(
                    (resultado) => (

                      <tr
                        key={
                          resultado.id
                        }
                      >

                        <td className="fw-semibold">

                          {
                            resultado.nombre
                          }

                        </td>

                        <td>

                          {
                            resultado.doCorregida !==
                            null
                              ? resultado.doCorregida.toFixed(
                                  4
                                )
                              : "—"
                          }

                        </td>

                        <td>

                          {
                            resultado.dilucion
                          }

                        </td>

                        <td className="fw-semibold">

                          {
                            resultado.concentracion !==
                            null
                              ? resultado.concentracion.toFixed(
                                  2
                                )
                              : "—"
                          }

                        </td>

                        <td>

                          {resultado.estado ===
                            "Válido" && (

                            <span className="badge text-bg-success">
                              ✓ Válido
                            </span>

                          )}

                          {resultado.estado ===
                            "Fuera de rango" && (

                            <span className="badge text-bg-warning">
                              Fuera de rango
                            </span>

                          )}

                          {resultado.estado ===
                            "Sin datos" && (

                            <span className="badge text-bg-secondary">
                              Sin datos
                            </span>

                          )}

                        </td>

                      </tr>

                    )
                  )}

                </tbody>

              </table>

            </div>

          </div>

        </div>

      )}

      {/* ================================================== */}
      {/* CURVA */}
      {/* ================================================== */}

      {curva && (

        <div className="card shadow-sm mb-4">

          <div className="card-header fw-semibold">

            <i className="bi bi-graph-up me-2"></i>

            Curva de calibración

          </div>

          <div className="card-body">

            <CurvaCalibracion
              curva={curva}
            />

          </div>

        </div>

      )}

    </div>
  );
}

export default App;