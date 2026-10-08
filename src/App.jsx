import { useState, useRef } from "react";

import "bootstrap/dist/css/bootstrap.min.css";
import "bootstrap-icons/font/bootstrap-icons.css";

import * as XLSX from "xlsx";

import "./index.css";

import {
  calcularCurva,
  calcularMuestras,
  calcularBlancosRA1000,
  obtenerNivelIgE,
} from "./utils/calculoIge";

import { exportarResultadosPdf } from "./utils/exportarPdf";

import CurvaCalibracion from "./components/CurvaCalibracion";
import Microplaca from "./components/Microplaca";

// ============================================================
// CALIBRADORES INICIALES
// ============================================================

// RA1000:
//
// Curva estándar 1 -> CAL 0 a CAL 4 -> 450 nm
// Curva estándar 2 -> CAL 0 a CAL 6 -> 405 nm

const calibradoresIniciales = [
  {
    id: 0,
    nombre: "CAL 0",
    concentracion: 0,
    do405: "",
    do450: "",
  },
  {
    id: 1,
    nombre: "CAL 1",
    concentracion: 10,
    do405: "",
    do450: "",
  },
  {
    id: 2,
    nombre: "CAL 2",
    concentracion: 50,
    do405: "",
    do450: "",
  },
  {
    id: 3,
    nombre: "CAL 3",
    concentracion: 100,
    do405: "",
    do450: "",
  },
  {
    id: 4,
    nombre: "CAL 4",
    concentracion: 250,
    do405: "",
    do450: "",
  },
  {
    id: 5,
    nombre: "CAL 5",
    concentracion: 500,
    do405: "",
    do450: "",
  },
  {
    id: 6,
    nombre: "CAL 6",
    concentracion: 1000,
    do405: "",
    do450: "",
  },
];

// ============================================================
// MUESTRAS INICIALES
// ============================================================

const muestrasIniciales = [
  {
    id: 1,
    nombre: "M1",
    codigo: "",
    do405: "",
    do450: "",
    dilucion: 1,
  },
];

// ============================================================
// COMPONENTE
// ============================================================

export default function App() {
  // ----------------------------------------------------------
  // ENSAYO
  // ----------------------------------------------------------

  const [datosEnsayo, setDatosEnsayo] = useState({
    fecha: new Date().toISOString().split("T")[0],
    lote: "",
    operador: "",
  });

  // ----------------------------------------------------------
  // CALIBRADORES
  // ----------------------------------------------------------

  const [calibradores, setCalibradores] = useState(
    calibradoresIniciales
  );

  // ----------------------------------------------------------
  // BLANCOS
  // ----------------------------------------------------------

  const [blancos, setBlancos] = useState({
    do405_1: "",
    do405_2: "",
    do450_1: "",
    do450_2: "",
  });

  // ----------------------------------------------------------
  // CONTROL
  // ----------------------------------------------------------

  const [control, setControl] = useState({
    do405: "",
    do450: "",
    minimo: "",
    maximo: "",
  });

  // ----------------------------------------------------------
  // MUESTRAS
  // ----------------------------------------------------------

  const [muestras, setMuestras] = useState(
    muestrasIniciales
  );

  // ----------------------------------------------------------
  // RESULTADOS
  // ----------------------------------------------------------

  const [resultados, setResultados] = useState([]);

  // ----------------------------------------------------------
  // CURVAS
  // ----------------------------------------------------------

  const [curvas, setCurvas] = useState({
    curva450: null,
    curva405: null,
  });

  // ----------------------------------------------------------
  // ERRORES
  // ----------------------------------------------------------

  const [errorCalculo, setErrorCalculo] = useState("");

  // ----------------------------------------------------------
  // INPUT EXCEL OCULTO
  // ----------------------------------------------------------

  const inputExcelRef = useRef(null);

  // ==========================================================
  // MANEJO DE ENSAYO
  // ==========================================================

  const handleEnsayoChange = (campo, valor) => {
    setDatosEnsayo((prev) => ({
      ...prev,
      [campo]: valor,
    }));
  };

  // ==========================================================
  // CALIBRADORES
  // ==========================================================

  const handleCalibradorChange = (id, campo, valor) => {
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
  // BLANCOS
  // ==========================================================

  const handleBlancoChange = (campo, valor) => {
    setBlancos((prev) => ({
      ...prev,
      [campo]: valor,
    }));
  };

  // ==========================================================
  // CONTROL
  // ==========================================================

  const handleControlChange = (campo, valor) => {
    setControl((prev) => ({
      ...prev,
      [campo]: valor,
    }));
  };

  // ==========================================================
  // MUESTRAS
  // ==========================================================

  const handleMuestraChange = (id, campo, valor) => {
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

  const agregarMuestra = () => {
    const nuevoId =
      muestras.length > 0
        ? Math.max(...muestras.map((m) => m.id)) + 1
        : 1;

    setMuestras((prev) => [
      ...prev,
      {
        id: nuevoId,
        nombre: `M${nuevoId}`,
        codigo: "",
        do405: "",
        do450: "",
        dilucion: 1,
      },
    ]);
  };

  const eliminarMuestra = (id) => {
    if (muestras.length <= 1) return;

    setMuestras((prev) =>
      prev.filter((muestra) => muestra.id !== id)
    );
  };

  // ==========================================================
  // PROMEDIO DE BLANCOS
  // ==========================================================

  const calcularPromedio = (valor1, valor2) => {
    const a = Number(valor1);
    const b = Number(valor2);

    if (!Number.isFinite(a) || !Number.isFinite(b)) {
      return null;
    }

    return (a + b) / 2;
  };

  const promedioBlanco405 = calcularPromedio(
    blancos.do405_1,
    blancos.do405_2
  );

  const promedioBlanco450 = calcularPromedio(
    blancos.do450_1,
    blancos.do450_2
  );

  // ==========================================================
  // ABRIR IMPORTADOR
  // ==========================================================

  const abrirImportador = () => {
    inputExcelRef.current?.click();
  };

  // ==========================================================
  // IMPORTACIÓN EXCEL
  // ==========================================================

  const importarExcel = async (event) => {
    const archivo = event.target.files?.[0];

    if (!archivo) return;

    setErrorCalculo("");

    try {
      const buffer = await archivo.arrayBuffer();

      const workbook = XLSX.read(buffer, {
        type: "array",
      });

      const nombreHoja = workbook.SheetNames[0];

      const hoja = workbook.Sheets[nombreHoja];

      const filas = XLSX.utils.sheet_to_json(hoja, {
        header: 1,
        defval: "",
      });

      const nuevosCalibradores = [...calibradoresIniciales];

      let nuevosBlancos = {
        do405_1: "",
        do405_2: "",
        do450_1: "",
        do450_2: "",
      };

      let nuevoControl = {
        do405: "",
        do450: "",
        minimo: control.minimo,
        maximo: control.maximo,
      };

      const nuevasMuestras = [];

      // --------------------------------------------------------
      // FORMATO EXCEL
      //
      // A -> identificación
      // B -> código
      // C -> DO 450 nm
      // D -> DO 405 nm
      //
      // Por eso:
      //
      // fila[2] -> DO450
      // fila[3] -> DO405
      // --------------------------------------------------------

      filas.forEach((fila) => {
        if (!fila || fila.length === 0) {
          return;
        }

        const identificacion = String(
          fila[0] ?? ""
        ).trim();

        const codigo = String(
          fila[1] ?? ""
        ).trim();

        // -----------------------------------------------
        // COLUMNAS CORRECTAS
        // -----------------------------------------------

        const do450 = fila[2] ?? "";

        const do405 = fila[3] ?? "";

        if (!identificacion) {
          return;
        }

        const identificacionMayuscula =
          identificacion.toUpperCase();

        // ==================================================
        // BLANCO A1
        // ==================================================

        if (identificacionMayuscula === "A1") {
          nuevosBlancos.do450_1 = do450;
          nuevosBlancos.do405_1 = do405;
          return;
        }

        // ==================================================
        // BLANCO A2
        // ==================================================

        if (identificacionMayuscula === "A2") {
          nuevosBlancos.do450_2 = do450;
          nuevosBlancos.do405_2 = do405;
          return;
        }

        // ==================================================
        // CALIBRADORES
        // ==================================================

        const matchCalibrador =
          identificacionMayuscula.match(/^C([0-6])$/);

        if (matchCalibrador) {
          const numeroCalibrador = Number(
            matchCalibrador[1]
          );

          const indice = nuevosCalibradores.findIndex(
            (calibrador) =>
              calibrador.id === numeroCalibrador
          );

          if (indice !== -1) {
            nuevosCalibradores[indice] = {
              ...nuevosCalibradores[indice],

              // C -> 450 nm
              do450,

              // D -> 405 nm
              do405,
            };
          }

          return;
        }

        // ==================================================
        // CONTROL
        // ==================================================

        if (
          identificacionMayuscula === "CTL" ||
          identificacionMayuscula === "CONTROL"
        ) {
          nuevoControl = {
            ...nuevoControl,

            // C -> 450 nm
            do450,

            // D -> 405 nm
            do405,
          };

          return;
        }

        // ==================================================
        // MUESTRAS
        // ==================================================

        const matchMuestra =
          identificacionMayuscula.match(/^M(\d+)$/);

        if (matchMuestra) {
          const numeroMuestra = Number(
            matchMuestra[1]
          );

          nuevasMuestras.push({
            id: numeroMuestra,
            nombre: identificacion,
            codigo,

            // D -> 405 nm
            do405,

            // C -> 450 nm
            do450,

            dilucion: 1,
          });
        }
      });

      // ------------------------------------------------------
      // ACTUALIZAR ESTADOS
      // ------------------------------------------------------

      setCalibradores(nuevosCalibradores);

      setBlancos(nuevosBlancos);

      setControl(nuevoControl);

      if (nuevasMuestras.length > 0) {
        nuevasMuestras.sort((a, b) => a.id - b.id);

        setMuestras(nuevasMuestras);
      }

      // ------------------------------------------------------
      // LIMPIAR RESULTADOS ANTERIORES
      // ------------------------------------------------------

      setResultados([]);

      setCurvas({
        curva450: null,
        curva405: null,
      });

    } catch (error) {
      console.error(
        "Error al importar Excel:",
        error
      );

      setErrorCalculo(
        "No se pudo importar el archivo Excel."
      );
    }

    // Permite volver a seleccionar el mismo archivo
    event.target.value = "";
  };

  // ==========================================================
  // CÁLCULO
  // ==========================================================

  const calcular = () => {
    setErrorCalculo("");

    try {
      // ------------------------------------------------------
      // VALIDAR BLANCOS
      // ------------------------------------------------------

      const blancosCalculados =
        calcularBlancosRA1000(blancos);

      if (!blancosCalculados.valido) {
        const errores = [];

        if (!blancosCalculados.valido405) {
          errores.push(
            blancosCalculados.error405
          );
        }

        if (!blancosCalculados.valido450) {
          errores.push(
            blancosCalculados.error450
          );
        }

        throw new Error(
          errores.join(" ")
        );
      }

      // ------------------------------------------------------
      // CURVA 450
      //
      // CAL 0 a CAL 4
      // ------------------------------------------------------

      const calibradores450 =
        calibradores.filter(
          (calibrador) =>
            calibrador.id >= 0 &&
            calibrador.id <= 4
        );

      const curva450 = calcularCurva(
        calibradores450,
        blancosCalculados.blanco450,
        450
      );

      // ------------------------------------------------------
      // CURVA 405
      //
      // CAL 0 a CAL 6
      // ------------------------------------------------------

      const curva405 = calcularCurva(
        calibradores,
        blancosCalculados.blanco405,
        405
      );

      // ------------------------------------------------------
      // GUARDAR CURVAS
      // ------------------------------------------------------

      const nuevasCurvas = {
        curva450,
        curva405,
      };

      setCurvas(nuevasCurvas);

      // ------------------------------------------------------
      // CALCULAR MUESTRAS
      // ------------------------------------------------------

      const nuevosResultados =
        calcularMuestras(
          muestras,
          nuevasCurvas
        );

      setResultados(nuevosResultados);

    } catch (error) {
      console.error(
        "Error al calcular:",
        error
      );

      setResultados([]);

      setCurvas({
        curva450: null,
        curva405: null,
      });

      setErrorCalculo(
        error.message ||
          "Error al calcular los resultados."
      );
    }
  };

  // ==========================================================
  // EXPORTAR PDF
  // ==========================================================

  const exportarPDF = () => {
    exportarResultadosPdf({
      datosEnsayo,
      blancos,
      promedioBlancos: promedioBlanco450,
      calibradores,
      control,
      resultados,
      curvas,
    });
  };

  // ==========================================================
  // RENDER
  // ==========================================================

  return (
    <div className="container-fluid py-4">

      {/* ==================================================== */}
      {/* ENCABEZADO                                           */}
      {/* ==================================================== */}

      <div className="mb-4">

        <h1 className="fw-bold mb-1">
          AllergenA Basic Kit
        </h1>

        <div className="text-muted">
          REF RA1000 — Determinación cuantitativa de IgE
          específica
        </div>

      </div>

      {/* ==================================================== */}
      {/* IDENTIFICACIÓN DEL ENSAYO                             */}
      {/* ==================================================== */}

      <div className="card shadow-sm mb-4">

        <div className="card-header fw-semibold">
          Identificación del ensayo
        </div>

        <div className="card-body">

          <div className="row g-3">

            <div className="col-md-4">

              <label className="form-label">
                Fecha
              </label>

              <input
                type="date"
                className="form-control"
                value={datosEnsayo.fecha}
                onChange={(e) =>
                  handleEnsayoChange(
                    "fecha",
                    e.target.value
                  )
                }
              />

            </div>

            <div className="col-md-4">

              <label className="form-label">
                Lote
              </label>

              <input
                type="text"
                className="form-control"
                value={datosEnsayo.lote}
                onChange={(e) =>
                  handleEnsayoChange(
                    "lote",
                    e.target.value
                  )
                }
              />

            </div>

            <div className="col-md-4">

              <label className="form-label">
                Operador
              </label>

              <input
                type="text"
                className="form-control"
                value={datosEnsayo.operador}
                onChange={(e) =>
                  handleEnsayoChange(
                    "operador",
                    e.target.value
                  )
                }
              />

            </div>

          </div>

        </div>
      </div>

      {/* ==================================================== */}
      {/* IMPORTAR EXCEL                                      */}
      {/* ==================================================== */}

      <div className="card shadow-sm mb-4">

        <div className="card-header d-flex justify-content-between align-items-center">

          <span className="fw-semibold">
            Importar resultados del lector
          </span>

          <button
            type="button"
            className="btn btn-primary"
            onClick={abrirImportador}
          >
            <i className="bi bi-upload me-2"></i>
            Importar
          </button>

          <input
            ref={inputExcelRef}
            type="file"
            accept=".xlsx,.xls"
            onChange={importarExcel}
            style={{ display: "none" }}
          />

        </div>

        <div className="card-body">

          <div className="small text-muted">
            <strong>Formato del archivo:</strong>{" "}
            columna A = identificación, columna B = código,
            columna C = DO 450 nm y columna D = DO 405 nm.
          </div>

        </div>

      </div>

      {/* ==================================================== */}
      {/* INFORMACIÓN RA1000                                  */}
      {/* ==================================================== */}

      <div className="alert alert-info mb-4">

        <div className="fw-semibold mb-2">
          Protocolo RA1000
        </div>

        <ul className="mb-0">

          <li>
            Curva estándar 1: CAL 0–CAL 4 a 450 nm.
          </li>

          <li>
            Curva estándar 2: CAL 0–CAL 6 a 405 nm.
          </li>

          <li>
            Si el DO450 de la muestra es menor que 2,3,
            se utiliza la curva de 450 nm.
          </li>

          <li>
            Si el DO450 de la muestra es mayor que 2,3,
            se utiliza la curva de 405 nm.
          </li>

        </ul>

      </div>

      {/* ==================================================== */}
      {/* CALIBRADORES                                         */}
      {/* ==================================================== */}

      <div className="card shadow-sm mb-4">

        <div className="card-header fw-semibold">
          Calibradores
        </div>

        <div className="card-body p-0">

          <div className="table-responsive">

            <table className="table table-bordered table-hover mb-0 align-middle">

              <thead className="table-light">

                <tr>

                  <th>
                    Calibrador
                  </th>

                  <th>
                    Concentración (UI/mL)
                  </th>

                  <th>
                    DO 450 nm
                  </th>

                  <th>
                    DO 405 nm
                  </th>

                </tr>

              </thead>

              <tbody>

                {calibradores.map(
                  (calibrador) => (

                    <tr key={calibrador.id}>

                      <td className="fw-semibold">
                        {calibrador.nombre}
                      </td>

                      <td>
                        {calibrador.concentracion} UI/mL
                      </td>

                      <td>

                        <input
                          type="text"
                          className="form-control"
                          value={calibrador.do450}
                          onChange={(e) =>
                            handleCalibradorChange(
                              calibrador.id,
                              "do450",
                              e.target.value
                            )
                          }
                        />

                      </td>

                      <td>

                        <input
                          type="text"
                          className="form-control"
                          value={calibrador.do405}
                          onChange={(e) =>
                            handleCalibradorChange(
                              calibrador.id,
                              "do405",
                              e.target.value
                            )
                          }
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

      {/* ==================================================== */}
      {/* CONTROL Y BLANCOS                                    */}
      {/* ==================================================== */}

      <div className="row g-4 mb-4">

        {/* CONTROL */}

        <div className="col-lg-6">

          <div className="card shadow-sm h-100">

            <div className="card-header fw-semibold">
              Control
            </div>

            <div className="card-body">

              <div className="row g-3">

                <div className="col-6">

                  <label className="form-label">
                    DO 450 nm
                  </label>

                  <input
                    type="text"
                    className="form-control"
                    value={control.do450}
                    onChange={(e) =>
                      handleControlChange(
                        "do450",
                        e.target.value
                      )
                    }
                  />

                </div>

                <div className="col-6">

                  <label className="form-label">
                    DO 405 nm
                  </label>

                  <input
                    type="text"
                    className="form-control"
                    value={control.do405}
                    onChange={(e) =>
                      handleControlChange(
                        "do405",
                        e.target.value
                      )
                    }
                  />

                </div>

                <div className="col-6">

                  <label className="form-label">
                    Mínimo
                  </label>

                  <input
                    type="text"
                    className="form-control"
                    value={control.minimo}
                    onChange={(e) =>
                      handleControlChange(
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
                    type="text"
                    className="form-control"
                    value={control.maximo}
                    onChange={(e) =>
                      handleControlChange(
                        "maximo",
                        e.target.value
                      )
                    }
                  />

                </div>

              </div>

            </div>
          </div>

        </div>

        {/* BLANCOS */}

        <div className="col-lg-6">

          <div className="card shadow-sm h-100">

            <div className="card-header fw-semibold">
              Blancos
            </div>

            <div className="card-body">

              <div className="row g-3">

                <div className="col-6">

                  <label className="form-label">
                    Blanco 1 — 450 nm
                  </label>

                  <input
                    type="text"
                    className="form-control"
                    value={blancos.do450_1}
                    onChange={(e) =>
                      handleBlancoChange(
                        "do450_1",
                        e.target.value
                      )
                    }
                  />

                </div>

                <div className="col-6">

                  <label className="form-label">
                    Blanco 2 — 450 nm
                  </label>

                  <input
                    type="text"
                    className="form-control"
                    value={blancos.do450_2}
                    onChange={(e) =>
                      handleBlancoChange(
                        "do450_2",
                        e.target.value
                      )
                    }
                  />

                </div>

                <div className="col-6">

                  <label className="form-label">
                    Blanco 1 — 405 nm
                  </label>

                  <input
                    type="text"
                    className="form-control"
                    value={blancos.do405_1}
                    onChange={(e) =>
                      handleBlancoChange(
                        "do405_1",
                        e.target.value
                      )
                    }
                  />

                </div>

                <div className="col-6">

                  <label className="form-label">
                    Blanco 2 — 405 nm
                  </label>

                  <input
                    type="text"
                    className="form-control"
                    value={blancos.do405_2}
                    onChange={(e) =>
                      handleBlancoChange(
                        "do405_2",
                        e.target.value
                      )
                    }
                  />

                </div>

              </div>

              <hr />

              <div className="row">

                <div className="col-6">

                  <div className="small text-muted">
                    Promedio 450 nm
                  </div>

                  <div className="fw-semibold">
                    {promedioBlanco450 !== null
                      ? promedioBlanco450.toFixed(3)
                      : "—"}
                  </div>

                </div>

                <div className="col-6">

                  <div className="small text-muted">
                    Promedio 405 nm
                  </div>

                  <div className="fw-semibold">
                    {promedioBlanco405 !== null
                      ? promedioBlanco405.toFixed(3)
                      : "—"}
                  </div>

                </div>

              </div>

            </div>
          </div>

        </div>

      </div>

      {/* ==================================================== */}
      {/* MUESTRAS                                             */}
      {/* ==================================================== */}

      <div className="card shadow-sm mb-4">

        <div className="card-header d-flex justify-content-between align-items-center">

          <span className="fw-semibold">
            Muestras
          </span>

          <button
            type="button"
            className="btn btn-sm btn-primary"
            onClick={agregarMuestra}
          >
            <i className="bi bi-plus-lg me-1"></i>
            Agregar muestra
          </button>

        </div>

        <div className="card-body p-0">

          <div className="table-responsive">

            <table className="table table-bordered table-hover mb-0 align-middle">

              <thead className="table-light">

                <tr>

                  <th>#</th>

                  <th>
                    Identificación
                  </th>

                  <th>
                    Código
                  </th>

                  <th>
                    DO 450 nm
                  </th>

                  <th>
                    DO 405 nm
                  </th>

                  <th>
                    Dilución
                  </th>

                  <th></th>

                </tr>

              </thead>

              <tbody>

                {muestras.map(
                  (muestra, indice) => (

                    <tr key={muestra.id}>

                      <td>
                        {indice + 1}
                      </td>

                      <td>

                        <input
                          type="text"
                          className="form-control"
                          value={muestra.nombre}
                          onChange={(e) =>
                            handleMuestraChange(
                              muestra.id,
                              "nombre",
                              e.target.value
                            )
                          }
                        />

                      </td>

                      <td>

                        <input
                          type="text"
                          className="form-control"
                          value={muestra.codigo}
                          onChange={(e) =>
                            handleMuestraChange(
                              muestra.id,
                              "codigo",
                              e.target.value
                            )
                          }
                        />

                      </td>

                      <td>

                        <input
                          type="text"
                          className="form-control"
                          value={muestra.do450}
                          onChange={(e) =>
                            handleMuestraChange(
                              muestra.id,
                              "do450",
                              e.target.value
                            )
                          }
                        />

                      </td>

                      <td>

                        <input
                          type="text"
                          className="form-control"
                          value={muestra.do405}
                          onChange={(e) =>
                            handleMuestraChange(
                              muestra.id,
                              "do405",
                              e.target.value
                            )
                          }
                        />

                      </td>

                      <td style={{ minWidth: "110px" }}>

                        <input
                          type="number"
                          min="1"
                          step="1"
                          className="form-control"
                          value={muestra.dilucion}
                          onChange={(e) =>
                            handleMuestraChange(
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
                          className="btn btn-outline-danger btn-sm"
                          disabled={
                            muestras.length <= 1
                          }
                          onClick={() =>
                            eliminarMuestra(
                              muestra.id
                            )
                          }
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

      {/* ==================================================== */}
      {/* MICROPLACA                                           */}
      {/* ==================================================== */}

      <div className="mb-4">

        <Microplaca
          calibradores={calibradores}
          blancos={blancos}
          control={control}
          muestras={muestras}
        />

      </div>

      {/* ==================================================== */}
      {/* ERROR                                                */}
      {/* ==================================================== */}

      {errorCalculo && (
        <div className="alert alert-danger">

          <i className="bi bi-exclamation-triangle me-2"></i>

          {errorCalculo}

        </div>
      )}

      {/* ==================================================== */}
      {/* BOTÓN CALCULAR                                       */}
      {/* ==================================================== */}

      <div className="d-flex gap-2 mb-4">

        <button
          type="button"
          className="btn btn-primary"
          onClick={calcular}
        >
          <i className="bi bi-calculator me-2"></i>
          Calcular resultados
        </button>

        {resultados.length > 0 && (

          <button
            type="button"
            className="btn btn-outline-secondary"
            onClick={exportarPDF}
          >
            <i className="bi bi-file-earmark-pdf me-2"></i>
            Exportar PDF
          </button>

        )}

      </div>

      {/* ==================================================== */}
      {/* CURVAS DE CALIBRACIÓN                                */}
      {/* ==================================================== */}

      {(curvas.curva450 || curvas.curva405) && (

        <div className="mb-4">

          <h4 className="fw-semibold mb-3">
            Curvas de calibración
          </h4>

          <CurvaCalibracion
            curvas={curvas}
          />

        </div>

      )}

      {/* ==================================================== */}
      {/* RESULTADOS                                           */}
      {/* ==================================================== */}

      {resultados.length > 0 && (

        <div className="card shadow-sm mb-4">

          <div className="card-header d-flex justify-content-between align-items-center">

            <span className="fw-semibold">
              Resultados de las muestras
            </span>

            <button
              type="button"
              className="btn btn-sm btn-outline-secondary"
              onClick={exportarPDF}
            >
              <i className="bi bi-file-earmark-pdf me-1"></i>
              Exportar PDF
            </button>

          </div>

          <div className="card-body p-0">

            <div className="table-responsive">

              <table className="table table-bordered table-hover mb-0 align-middle">

                <thead className="table-light">

                  <tr>

                    <th>
                      Muestra
                    </th>

                    <th>
                      DO 450
                    </th>

                    <th>
                      DO 405
                    </th>

                    <th>
                      Curva
                    </th>

                    <th>
                      Concentración
                    </th>

                    <th>
                      Nivel de IgE Específica
                    </th>

                  </tr>

                </thead>

                <tbody>

                  {resultados.map(
                    (resultado, indice) => (

                      <tr
                        key={
                          resultado.id ||
                          resultado.nombre ||
                          indice
                        }
                      >

                        <td>

                          <div className="fw-semibold">
                            {resultado.nombre}
                          </div>

                          {resultado.codigo && (
                            <div className="small text-muted">
                              {resultado.codigo}
                            </div>
                          )}

                        </td>

                        <td>
                          {resultado.do450 !== undefined &&
                          resultado.do450 !== null
                            ? resultado.do450
                            : "—"}
                        </td>

                        <td>
                          {resultado.do405 !== undefined &&
                          resultado.do405 !== null
                            ? resultado.do405
                            : "—"}
                        </td>

                        <td>
                          {resultado.curva || "—"}
                        </td>

                        <td>

                          {resultado.estado === "Válido" &&
                          resultado.concentracion !== null
                            ? `${resultado.concentracion.toFixed(2)} UI/mL`
                            : resultado.estado === "Fuera de rango"
                              ? "Fuera de rango"
                              : "—"}

                        </td>

                        <td>

                          {obtenerNivelIgE(
                            resultado.concentracion
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

    </div>
  );
}
