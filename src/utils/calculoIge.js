/**
 * ============================================================
 * UTILIDADES PARA EL CÁLCULO DE IgE
 * ============================================================
 *
 * MODELO DE CÁLCULO:
 *   Interpolación lineal entre calibradores (punto a punto)
 *
 * La regresión lineal se conserva como indicador de ajuste (R²)
 * y para el gráfico, pero NO se usa para convertir la DO de
 * una muestra en concentración.
 *
 * IMPORTANTE:
 * - La corrección por blanco se aplica tanto a calibradores
 *   como a muestras.
 * - El rango válido de DO se obtiene de los DO REALES
 *   de los calibradores.
 * - Una muestra con el mismo DO que un calibrador debe
 *   devolver exactamente la concentración de ese calibrador.
 */

// ============================================================
// PROMEDIO
// ============================================================

export function promedio(valores) {
  const numeros = valores
    .map(Number)
    .filter(Number.isFinite);

  if (!numeros.length) {
    return null;
  }

  return (
    numeros.reduce((suma, valor) => suma + valor, 0) /
    numeros.length
  );
}

// ============================================================
// CORRECCIÓN POR BLANCO
// ============================================================

export function corregirDO(doValor, blancoPromedio = 0) {
  const doNumerica = Number(doValor);
  const blanco = Number(blancoPromedio);

  if (!Number.isFinite(doNumerica)) {
    return null;
  }

  const blancoValido = Number.isFinite(blanco)
    ? blanco
    : 0;

  const corregida = doNumerica - blancoValido;

  // Nunca permitir DO corregida negativa
  return Math.max(0, corregida);
}

// ============================================================
// PROMEDIO DE BLANCOS
// ============================================================

export function calcularPromedioBlancos(
  blanco1,
  blanco2
) {
  const do1 = Number(blanco1);
  const do2 = Number(blanco2);

  if (
    !Number.isFinite(do1) ||
    !Number.isFinite(do2)
  ) {
    return null;
  }

  return (do1 + do2) / 2;
}

// ============================================================
// VALIDACIÓN DE BLANCOS
// ============================================================

export function validarBlancos(
  blanco1,
  blanco2
) {
  const promedioBlancos =
    calcularPromedioBlancos(
      blanco1,
      blanco2
    );

  if (promedioBlancos === null) {
    return {
      valido: false,
      promedio: null,
      mensaje:
        "Debe ingresar las DO de ambos blancos.",
    };
  }

  if (promedioBlancos > 0.1) {
    return {
      valido: false,
      promedio: promedioBlancos,
      mensaje:
        "El promedio de los blancos debe ser menor o igual a 0.100.",
    };
  }

  return {
    valido: true,
    promedio: promedioBlancos,
    mensaje: "",
  };
}

// ============================================================
// OBTENER DO DE UN CALIBRADOR / MUESTRA
// ============================================================

function obtenerDO(item) {
  if (!item) {
    return null;
  }

  if (
    item.do1 !== undefined &&
    item.do1 !== ""
  ) {
    return Number(item.do1);
  }

  if (
    item.do !== undefined &&
    item.do !== ""
  ) {
    return Number(item.do);
  }

  return null;
}

// ============================================================
// AJUSTE LINEAL
// ============================================================
//
// y = a + b*x
//
// x = concentración
// y = DO corregida
//
// ============================================================

function ajustarLineal(puntos) {
  if (!Array.isArray(puntos) || puntos.length < 2) {
    throw new Error(
      "Se necesitan al menos dos calibradores válidos."
    );
  }

  const n = puntos.length;

  const sumaX = puntos.reduce(
    (suma, punto) => suma + punto.x,
    0
  );

  const sumaY = puntos.reduce(
    (suma, punto) => suma + punto.y,
    0
  );

  const sumaXY = puntos.reduce(
    (suma, punto) =>
      suma + punto.x * punto.y,
    0
  );

  const sumaX2 = puntos.reduce(
    (suma, punto) =>
      suma + punto.x * punto.x,
    0
  );

  const denominador =
    n * sumaX2 - sumaX * sumaX;

  if (Math.abs(denominador) < 1e-12) {
    throw new Error(
      "No es posible calcular la regresión lineal."
    );
  }

  const pendiente =
    (n * sumaXY - sumaX * sumaY) /
    denominador;

  const intercepto =
    (sumaY - pendiente * sumaX) /
    n;

  if (!Number.isFinite(pendiente)) {
    throw new Error(
      "La pendiente calculada no es válida."
    );
  }

  if (Math.abs(pendiente) < 1e-12) {
    throw new Error(
      "La pendiente de la curva es demasiado pequeña."
    );
  }

  // ----------------------------------------------------------
  // R²
  // ----------------------------------------------------------

  const promedioY = sumaY / n;

  let ssTotal = 0;
  let ssResidual = 0;

  puntos.forEach((punto) => {
    const estimado =
      intercepto +
      pendiente * punto.x;

    ssTotal +=
      Math.pow(
        punto.y - promedioY,
        2
      );

    ssResidual +=
      Math.pow(
        punto.y - estimado,
        2
      );
  });

  const r2 =
    ssTotal > 0
      ? 1 - ssResidual / ssTotal
      : 1;

  return {
    pendiente,
    intercepto,
    r2,
  };
}

// ============================================================
// MODELO LINEAL
// ============================================================

export function modeloLineal(
  x,
  parametros
) {
  if (!parametros) {
    return null;
  }

  const concentracion = Number(x);

  if (!Number.isFinite(concentracion)) {
    return null;
  }

  const pendiente =
    Number(parametros.pendiente);

  const intercepto =
    Number(parametros.intercepto);

  if (
    !Number.isFinite(pendiente) ||
    !Number.isFinite(intercepto)
  ) {
    return null;
  }

  return (
    intercepto +
    pendiente * concentracion
  );
}

// ============================================================
// INVERSA LINEAL
// ============================================================
//
// DO -> concentración
//
// IMPORTANTE:
// El rango de DO se controla con los valores REALES
// de los calibradores.
//
// No se utiliza:
//   y(minConcentracion)
//   y(maxConcentracion)
//
// porque una regresión no necesariamente pasa exactamente
// por los puntos experimentales.
//
// ============================================================

export function inversaLineal(
  doCorregida,
  parametros,
  doMinimo,
  doMaximo
) {
  const y = Number(doCorregida);

  if (!Number.isFinite(y)) {
    return null;
  }

  if (!parametros) {
    return null;
  }

  const pendiente =
    Number(parametros.pendiente);

  const intercepto =
    Number(parametros.intercepto);

  if (
    !Number.isFinite(pendiente) ||
    !Number.isFinite(intercepto)
  ) {
    return null;
  }

  if (Math.abs(pendiente) < 1e-12) {
    return null;
  }

  // ----------------------------------------------------------
  // RANGO EXPERIMENTAL DE LOS CALIBRADORES
  // ----------------------------------------------------------

  const minimoDO = Number(doMinimo);
  const maximoDO = Number(doMaximo);

  if (
    Number.isFinite(minimoDO) &&
    Number.isFinite(maximoDO)
  ) {
    const margen = 1e-10;

    const rangoMin =
      Math.min(minimoDO, maximoDO) -
      margen;

    const rangoMax =
      Math.max(minimoDO, maximoDO) +
      margen;

    if (
      y < rangoMin ||
      y > rangoMax
    ) {
      return null;
    }
  }

  // ----------------------------------------------------------
  // INVERSIÓN DE LA RECTA
  // ----------------------------------------------------------

  const concentracion =
    (y - intercepto) /
    pendiente;

  if (!Number.isFinite(concentracion)) {
    return null;
  }

  // Pequeños errores numéricos alrededor de cero
  if (
    concentracion < 0 &&
    concentracion > -1e-9
  ) {
    return 0;
  }

  return concentracion;
}

// ============================================================
// CALCULAR CURVA
// ============================================================

export function calcularCurva(
  calibradores,
  blancoPromedio = 0
) {
  if (
    !Array.isArray(calibradores) ||
    calibradores.length < 2
  ) {
    throw new Error(
      "Debe ingresar al menos dos calibradores."
    );
  }

  const blanco = Number(blancoPromedio);

  const blancoValido =
    Number.isFinite(blanco)
      ? blanco
      : 0;

  // ----------------------------------------------------------
  // PREPARAR PUNTOS
  // ----------------------------------------------------------

  const puntos = calibradores
    .map((calibrador) => {
      const x = Number(
        calibrador.concentracion
      );

      const doOriginal =
        obtenerDO(calibrador);

      const y =
        corregirDO(
          doOriginal,
          blancoValido
        );

      return {
        id: calibrador.id,
        nombre: calibrador.nombre,
        x,
        y,
        doOriginal,
        doCorregida: y,
      };
    })
    .filter(
      (punto) =>
        Number.isFinite(punto.x) &&
        Number.isFinite(punto.y)
    );

  // ----------------------------------------------------------
  // VALIDACIÓN
  // ----------------------------------------------------------

  if (puntos.length < 2) {
    throw new Error(
      "Debe ingresar las DO de al menos dos calibradores."
    );
  }

  // ----------------------------------------------------------
  // CONCENTRACIONES DUPLICADAS
  // ----------------------------------------------------------

  const concentraciones =
    puntos.map((punto) => punto.x);

  const concentracionesUnicas =
    new Set(concentraciones);

  if (
    concentracionesUnicas.size !==
    concentraciones.length
  ) {
    throw new Error(
      "No puede haber calibradores con la misma concentración."
    );
  }

  // ----------------------------------------------------------
  // ORDENAR POR CONCENTRACIÓN
  // ----------------------------------------------------------

  puntos.sort(
    (a, b) => a.x - b.x
  );

  // ----------------------------------------------------------
  // REGRESIÓN LINEAL
  // ----------------------------------------------------------

  const parametros =
    ajustarLineal(puntos);

  // ----------------------------------------------------------
  // RANGO DE CONCENTRACIÓN
  // ----------------------------------------------------------

  const minimo =
    Math.min(
      ...puntos.map(
        (punto) => punto.x
      )
    );

  const maximo =
    Math.max(
      ...puntos.map(
        (punto) => punto.x
      )
    );

  // ----------------------------------------------------------
  // RANGO REAL DE DO
  // ----------------------------------------------------------

  const doMinimo =
    Math.min(
      ...puntos.map(
        (punto) => punto.y
      )
    );

  const doMaximo =
    Math.max(
      ...puntos.map(
        (punto) => punto.y
      )
    );

  // ----------------------------------------------------------
  // RESULTADO
  // ----------------------------------------------------------

  return {
    modelo: "Lineal",

    parametros,

    puntos,

    minimo,
    maximo,

    doMinimo,
    doMaximo,

    blancoPromedio:
      blancoValido,

    r2: parametros.r2,

    error: null,
  };
}

// ============================================================
// INTERPOLACIÓN ENTRE CALIBRADORES
// ============================================================
//
// DO corregida -> concentración
//
// Se interpola entre los puntos experimentales, no sobre la
// recta de regresión. Así, una DO igual a la de un calibrador
// produce exactamente la concentración de ese calibrador.
//
// ============================================================

export function interpolarConcentracion(
  doCorregida,
  puntos
) {
  const y = Number(doCorregida);

  if (!Number.isFinite(y)) {
    return null;
  }

  if (!Array.isArray(puntos) || puntos.length < 2) {
    return null;
  }

  const ordenados = puntos
    .map((punto) => ({
      x: Number(punto.x),
      y: Number(punto.y),
    }))
    .filter(
      (punto) =>
        Number.isFinite(punto.x) &&
        Number.isFinite(punto.y)
    )
    .sort((a, b) => a.x - b.x);

  if (ordenados.length < 2) {
    return null;
  }

  const tolerancia = 1e-7;

  // ----------------------------------------------------------
  // COINCIDENCIA EXACTA CON UN CALIBRADOR
  // ----------------------------------------------------------

  const exacto = ordenados.find(
    (punto) => Math.abs(punto.y - y) <= tolerancia
  );

  if (exacto) {
    return exacto.x;
  }

  // ----------------------------------------------------------
  // RANGO EXPERIMENTAL
  // ----------------------------------------------------------

  const doMinimo = Math.min(
    ...ordenados.map((punto) => punto.y)
  );

  const doMaximo = Math.max(
    ...ordenados.map((punto) => punto.y)
  );

  if (y < doMinimo - tolerancia) {
    return 0;
    }
  if (y > doMaximo + tolerancia) {
    return null;
    }

  // ----------------------------------------------------------
  // SEGMENTO ENTRE CALIBRADORES CONSECUTIVOS
  // ----------------------------------------------------------

  for (let i = 0; i < ordenados.length - 1; i++) {
    const inicio = ordenados[i];
    const fin = ordenados[i + 1];

    const doInferior = Math.min(inicio.y, fin.y);
    const doSuperior = Math.max(inicio.y, fin.y);

    if (y < doInferior - tolerancia || y > doSuperior + tolerancia) {
      continue;
    }

    const deltaDO = fin.y - inicio.y;

    if (Math.abs(deltaDO) < 1e-12) {
      continue;
    }

    const concentracion =
      inicio.x +
      ((y - inicio.y) * (fin.x - inicio.x)) / deltaDO;

    if (!Number.isFinite(concentracion)) {
      return null;
    }

    if (concentracion < 0 && concentracion > -1e-9) {
      return 0;
    }

    return concentracion;
  }

  return null;
}

// ============================================================
// CONVERTIR DO -> CONCENTRACIÓN
// ============================================================
//
// ESTA ES LA ÚNICA FUNCIÓN QUE DEBE UTILIZARSE PARA
// CONVERTIR UNA DO DE MUESTRA EN CONCENTRACIÓN.
//
// ============================================================

export function convertirDOaConcentracion(
  doValor,
  curva
) {
  if (
    !curva ||
    !Array.isArray(curva.puntos)
  ) {
    return null;
  }

  const doNumerica =
    Number(doValor);

  if (!Number.isFinite(doNumerica)) {
    return null;
  }

  const blanco =
    Number(curva.blancoPromedio);

  const blancoValido =
    Number.isFinite(blanco)
      ? blanco
      : 0;

  // ----------------------------------------------------------
  // CORRECCIÓN POR BLANCO
  // ----------------------------------------------------------

  const doCorregida =
    corregirDO(
      doNumerica,
      blancoValido
    );

  if (doCorregida === null) {
    return null;
  }

  // ----------------------------------------------------------
  // INTERPOLACIÓN SOBRE LOS CALIBRADORES
  // ----------------------------------------------------------

  const concentracion =
    interpolarConcentracion(
      doCorregida,
      curva.puntos
    );

  if (concentracion === null) {
    return null;
  }

  return {
    doOriginal:
      doNumerica,

    doCorregida,

    concentracion,
  };
}

// ============================================================
// CALCULAR MUESTRAS
// ============================================================

export function calcularMuestras(
  muestras,
  curva
) {
  if (
    !Array.isArray(muestras)
  ) {
    return [];
  }

  if (!curva) {
    throw new Error(
      "Primero debe calcular la curva."
    );
  }

  return muestras.map(
    (muestra) => {
      const doOriginal =
        obtenerDO(muestra);

      const dilucion =
        Number(muestra.dilucion);

      if (
        !Number.isFinite(
          doOriginal
        )
      ) {
        return {
          ...muestra,

          doOriginal: null,
          doCorregida: null,

          promedio: null,

          concentracion: null,
          concentracionSinDiluir:
            null,

          estado:
            "Sin datos",
        };
      }

      const dilucionValida =
        Number.isFinite(dilucion) &&
        dilucion > 0
          ? dilucion
          : 1;

      // ------------------------------------------------------
      // CONVERSIÓN CENTRALIZADA
      // ------------------------------------------------------

      const conversion =
        convertirDOaConcentracion(
          doOriginal,
          curva
        );

      if (conversion === null) {
  const blanco = Number(curva.blancoPromedio);

  const blancoValido = Number.isFinite(blanco)
    ? blanco
    : 0;

  const doCorregida = corregirDO(
    doOriginal,
    blancoValido
  );

  return {
    ...muestra,

    doOriginal,

    doCorregida,

    // Compatibilidad con App.jsx
    promedio: doCorregida,

    concentracion: null,

    concentracionSinDiluir: null,

    dilucion: dilucionValida,

    estado: "Fuera de rango",
  };
}

      // ------------------------------------------------------
      // CONCENTRACIÓN SIN DILUIR
      // ------------------------------------------------------

      const concentracionSinDiluir =
        conversion.concentracion;

      // ------------------------------------------------------
      // APLICAR DILUCIÓN
      // ------------------------------------------------------

      const concentracion =
        concentracionSinDiluir *
        dilucionValida;

      return {
        ...muestra,

        doOriginal:
          conversion.doOriginal,

        doCorregida:
          conversion.doCorregida,

        // Compatibilidad con App.jsx
        promedio:
          conversion.doCorregida,

        concentracion,

        concentracionSinDiluir,

        dilucion:
          dilucionValida,

        estado:
          "Válido",
      };
    }
  );
}

// ============================================================
// CALCULAR CONTROL
// ============================================================

export function calcularControl(
  doControl,
  curva,
  minimo,
  maximo
) {
  if (!curva) {
    return null;
  }

  const conversion =
    convertirDOaConcentracion(
      doControl,
      curva
    );

  if (!conversion) {
    return {
      doOriginal:
        Number(doControl),

      doCorregida: null,

      concentracion: null,

      valido: false,
    };
  }

  const concentracion =
    conversion.concentracion;

  const min =
    Number(minimo);

  const max =
    Number(maximo);

  const tieneLimites =
    Number.isFinite(min) &&
    Number.isFinite(max);

  const valido =
    tieneLimites
      ? concentracion >= min &&
        concentracion <= max
      : true;

  return {
    doOriginal:
      conversion.doOriginal,

    doCorregida:
      conversion.doCorregida,

    concentracion,

    valido,
  };
}