/**
 * ============================================================
 * CALCULO DE IgE ESPECÍFICA
 * ALLERGENA BASIC KIT - REF. RA1000
 * ============================================================
 *
 * RA1000:
 *
 * CURVA ESTÁNDAR 1
 *   CAL 0 - CAL 3
 *   Longitud de onda: 450 nm
 *
 * CURVA ESTÁNDAR 2
 *   CAL 0 - CAL 6
 *   Longitud de onda: 405 nm
 *
 * SELECCIÓN DE CURVA
 *
 *   DO450 < 2.3  -> curva 450 nm
 *   DO450 > 2.3  -> curva 405 nm
 *
 * MÉTODO:
 *   Interpolación lineal punto a punto.
 *
 * IMPORTANTE:
 *   La regresión lineal solamente se utiliza para obtener
 *   información estadística de la curva (pendiente,
 *   intercepto y R²).
 *
 *   La concentración de las muestras se obtiene siempre
 *   mediante interpolación lineal entre calibradores.
 *
 * ============================================================
 */

// ============================================================
// CONSTANTES RA1000
// ============================================================

export const UMBRAL_DO450 = 2.3;

export const LONGITUD_ONDA_CURVA_1 = 450;
export const LONGITUD_ONDA_CURVA_2 = 405;

// ============================================================
// OBTENER NIVEL DE IgE
// ============================================================

export function obtenerNivelIgE(concentracion) {
  const valor = Number(concentracion);

  if (!Number.isFinite(valor)) {
    return "—";
  }

  if (valor < 0.35) {
    return "Clínicamente no significativo";
  }

  if (valor < 0.70) {
    return "Muy bajo";
  }

  if (valor < 3.50) {
    return "Bajo";
  }

  if (valor < 17.50) {
    return "Medio";
  }

  if (valor < 50) {
    return "Alto";
  }

  if (valor <= 100) {
    return "Muy alto";
  }

  return "Extremadamente alto";
}

// ============================================================
// UTILIDADES NUMÉRICAS
// ============================================================

function numeroValido(valor) {
  if (
    valor === null ||
    valor === undefined ||
    valor === ""
  ) {
    return false;
  }

  if (typeof valor === "string") {
    const texto = valor.trim();

    if (!texto) {
      return false;
    }

    // Valores censurados como >3 o <0.1
    // no son valores numéricos utilizables
    if (
      texto.startsWith(">") ||
      texto.startsWith("<")
    ) {
      return false;
    }

    const numero = Number(
      texto.replace(",", ".")
    );

    return Number.isFinite(numero);
  }

  return Number.isFinite(Number(valor));
}

// ============================================================
// CONVERTIR A NÚMERO
// ============================================================

export function convertirNumero(valor) {
  if (
    valor === null ||
    valor === undefined ||
    valor === ""
  ) {
    return null;
  }

  if (typeof valor === "string") {
    const texto = valor.trim();

    if (!texto) {
      return null;
    }

    // No convertir valores censurados
    if (
      texto.startsWith(">") ||
      texto.startsWith("<")
    ) {
      return null;
    }

    const numero = Number(
      texto.replace(",", ".")
    );

    return Number.isFinite(numero)
      ? numero
      : null;
  }

  const numero = Number(valor);

  return Number.isFinite(numero)
    ? numero
    : null;
}

// ============================================================
// DETECTAR VALOR CENSURADO
// ============================================================

export function esValorMayorQue(valor) {
  if (typeof valor !== "string") {
    return false;
  }

  return valor.trim().startsWith(">");
}

export function esValorMenorQue(valor) {
  if (typeof valor !== "string") {
    return false;
  }

  return valor.trim().startsWith("<");
}

// ============================================================
// PROMEDIO
// ============================================================

export function promedio(valores) {
  if (!Array.isArray(valores)) {
    return null;
  }

  const numeros = valores
    .map(convertirNumero)
    .filter(
      (valor) => valor !== null
    );

  if (numeros.length === 0) {
    return null;
  }

  return (
    numeros.reduce(
      (suma, valor) => suma + valor,
      0
    ) / numeros.length
  );
}

// ============================================================
// CORREGIR DO POR BLANCO
// ============================================================

export function corregirDO(
  doValor,
  blancoPromedio
) {
  const doNumero =
    convertirNumero(doValor);

  const blanco =
    convertirNumero(blancoPromedio);

  if (
    doNumero === null ||
    blanco === null
  ) {
    return null;
  }

  return doNumero - blanco;
}

// ============================================================
// PROMEDIO DE BLANCOS
// ============================================================

export function calcularPromedioBlancos(
  blanco1,
  blanco2
) {
  return promedio([
    blanco1,
    blanco2,
  ]);
}

// ============================================================
// VALIDAR BLANCO
// ============================================================

export function validarBlanco(
  blancoPromedio,
  limite = 0.1
) {
  const valor =
    convertirNumero(
      blancoPromedio
    );

  if (valor === null) {
    return {
      valido: false,
      error:
        "Debe ingresar las DO de los blancos.",
    };
  }

  if (valor > limite) {
    return {
      valido: false,
      error:
        `El promedio del blanco (${valor.toFixed(
          3
        )}) supera el límite permitido de ${limite.toFixed(
          3
        )}.`,
    };
  }

  return {
    valido: true,
    error: null,
  };
}

// ============================================================
// OBTENER DO
// ============================================================

function obtenerDO(
  objeto,
  longitudOnda
) {
  if (!objeto) {
    return null;
  }

  if (longitudOnda === 405) {
    return convertirNumero(
      objeto.do405
    );
  }

  if (longitudOnda === 450) {
    return convertirNumero(
      objeto.do450
    );
  }

  return null;
}

// ============================================================
// PREPARAR CALIBRADORES
// ============================================================

function prepararCalibradores(
  calibradores,
  longitudOnda
) {
  if (!Array.isArray(calibradores)) {
    return [];
  }

  return calibradores
    .map((calibrador) => {
      const concentracion =
        convertirNumero(
          calibrador.concentracion
        );

      const doOriginal =
        obtenerDO(
          calibrador,
          longitudOnda
        );

      return {
        id: calibrador.id,
        nombre: calibrador.nombre,

        x: concentracion,

        y: doOriginal,

        concentracion,

        doOriginal,

        doCorregida: null,

        valorOriginal:
          longitudOnda === 405
            ? calibrador.do405
            : calibrador.do450,
      };
    })
    .filter(
      (punto) =>
        punto.x !== null &&
        punto.y !== null
    );
}

// ============================================================
// AJUSTE LINEAL
// ============================================================
//
// Se utiliza solamente para estadísticas de la curva.
//
// NO se utiliza para calcular la concentración de muestras.
// ============================================================

export function ajustarLineal(
  puntos
) {
  if (!Array.isArray(puntos)) {
    return null;
  }

  if (puntos.length < 2) {
    return null;
  }

  const n = puntos.length;

  const sumaX = puntos.reduce(
    (suma, punto) =>
      suma + punto.x,
    0
  );

  const sumaY = puntos.reduce(
    (suma, punto) =>
      suma + punto.y,
    0
  );

  const sumaXY = puntos.reduce(
    (suma, punto) =>
      suma +
      punto.x * punto.y,
    0
  );

  const sumaX2 = puntos.reduce(
    (suma, punto) =>
      suma +
      punto.x * punto.x,
    0
  );

  const denominador =
    n * sumaX2 -
    sumaX * sumaX;

  if (
    Math.abs(denominador) <
    Number.EPSILON
  ) {
    return null;
  }

  const pendiente =
    (n * sumaXY -
      sumaX * sumaY) /
    denominador;

  const intercepto =
    (sumaY -
      pendiente * sumaX) /
    n;

  // ----------------------------------------------------------
  // R²
  // ----------------------------------------------------------

  const promedioY =
    sumaY / n;

  let ssTot = 0;
  let ssRes = 0;

  puntos.forEach((punto) => {
    const estimado =
      pendiente * punto.x +
      intercepto;

    ssTot +=
      Math.pow(
        punto.y - promedioY,
        2
      );

    ssRes +=
      Math.pow(
        punto.y - estimado,
        2
      );
  });

  const r2 =
    ssTot === 0
      ? 1
      : 1 - ssRes / ssTot;

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
  pendiente,
  intercepto
) {
  return (
    pendiente * x +
    intercepto
  );
}

// ============================================================
// INVERSA LINEAL
// ============================================================
//
// Se mantiene por compatibilidad.
// NO se utiliza para calcular muestras.
// ============================================================

export function inversaLineal(
  y,
  pendiente,
  intercepto
) {
  if (
    !Number.isFinite(
      Number(pendiente)
    ) ||
    pendiente === 0
  ) {
    return null;
  }

  return (
    (y - intercepto) /
    pendiente
  );
}

// ============================================================
// CONSTRUIR CURVA
// ============================================================

export function construirCurva({
  calibradores,
  longitudOnda,
  blancoPromedio,
}) {
  if (
    !Array.isArray(calibradores)
  ) {
    throw new Error(
      "No se recibieron los calibradores."
    );
  }

  // ----------------------------------------------------------
  // Preparar puntos
  // ----------------------------------------------------------

  const puntosIniciales =
    prepararCalibradores(
      calibradores,
      longitudOnda
    );

  if (
    puntosIniciales.length < 2
  ) {
    throw new Error(
      `Debe ingresar al menos dos calibradores válidos para la curva de ${longitudOnda} nm.`
    );
  }

  // ----------------------------------------------------------
  // Validar concentraciones duplicadas
  // ----------------------------------------------------------

  const concentraciones =
    puntosIniciales.map(
      (punto) => punto.x
    );

  const concentracionesUnicas =
    new Set(
      concentraciones
    );

  if (
    concentracionesUnicas.size !==
    concentraciones.length
  ) {
    throw new Error(
      `Hay concentraciones de calibradores duplicadas en la curva de ${longitudOnda} nm.`
    );
  }

  // ----------------------------------------------------------
  // Corregir por blanco
  // ----------------------------------------------------------

  const puntos =
    puntosIniciales.map(
      (punto) => ({
        ...punto,

        doCorregida:
          corregirDO(
            punto.doOriginal,
            blancoPromedio
          ),
      })
    );

  // ----------------------------------------------------------
  // Ordenar por concentración
  // ----------------------------------------------------------

  puntos.sort(
    (a, b) => a.x - b.x
  );

  // ----------------------------------------------------------
  // Validar DO corregidas
  // ----------------------------------------------------------

  const puntosValidos =
    puntos.filter(
      (punto) =>
        Number.isFinite(
          punto.doCorregida
        )
    );

  if (
    puntosValidos.length < 2
  ) {
    throw new Error(
      `No hay suficientes calibradores válidos para construir la curva de ${longitudOnda} nm.`
    );
  }

  // ----------------------------------------------------------
  // Ajuste estadístico
  // ----------------------------------------------------------

  const parametros =
    ajustarLineal(
      puntosValidos.map(
        (punto) => ({
          x: punto.x,
          y: punto.doCorregida,
        })
      )
    );

  // ----------------------------------------------------------
  // Rangos
  // ----------------------------------------------------------

  const concentracionesValidas =
    puntosValidos.map(
      (punto) => punto.x
    );

  const DOValidas =
    puntosValidos.map(
      (punto) =>
        punto.doCorregida
    );

  const minimo =
    Math.min(
      ...concentracionesValidas
    );

  const maximo =
    Math.max(
      ...concentracionesValidas
    );

  const doMinimo =
    Math.min(
      ...DOValidas
    );

  const doMaximo =
    Math.max(
      ...DOValidas
    );

  return {
    modelo: "Lineal",

    metodo:
      "Interpolación lineal punto a punto",

    longitudOnda,

    parametros,

    puntos,

    puntosValidos,

    minimo,
    maximo,

    doMinimo,
    doMaximo,

    blancoPromedio,

    r2:
      parametros?.r2 ??
      null,

    error: null,
  };
}

// ============================================================
// CALCULAR CURVA
// ============================================================

export function calcularCurva(
  calibradores,
  blancoPromedio,
  longitudOnda = 450
) {
  return construirCurva({
    calibradores,
    longitudOnda,
    blancoPromedio,
  });
}

// ============================================================
// INTERPOLACIÓN LINEAL
// ============================================================
//
// IMPORTANTE:
//
// La concentración se obtiene únicamente mediante
// interpolación entre puntos consecutivos.
//
// NO se extrapola.
//
// Si la DO está:
//
//   debajo de CAL0 -> Fuera de rango
//   entre calibradores -> Interpolación
//   igual a calibrador -> Concentración exacta
//   encima de CAL6 -> Fuera de rango
//
// ============================================================

export function interpolarConcentracion(
  doCorregida,
  puntos
) {
  const y =
    convertirNumero(
      doCorregida
    );

  if (
    y === null ||
    !Array.isArray(puntos)
  ) {
    return null;
  }

  // ----------------------------------------------------------
  // Preparar puntos válidos
  // ----------------------------------------------------------

  const puntosValidos =
    puntos
      .filter(
        (punto) =>
          Number.isFinite(
            Number(punto.x)
          ) &&
          Number.isFinite(
            Number(
              punto.doCorregida
            )
          )
      )
      .map((punto) => ({
        ...punto,

        x: Number(punto.x),

        y: Number(
          punto.doCorregida
        ),
      }))
      .sort(
        (a, b) => a.y - b.y
      );

  if (
    puntosValidos.length < 2
  ) {
    return null;
  }

  // ----------------------------------------------------------
  // Tolerancia para coincidencia exacta
  // ----------------------------------------------------------

  const tolerancia =
    1e-7;

  const puntoExacto =
    puntosValidos.find(
      (punto) =>
        Math.abs(
          y - punto.y
        ) <= tolerancia
    );

  if (puntoExacto) {
    return puntoExacto.x;
  }

  // ----------------------------------------------------------
  // FUERA DE RANGO INFERIOR
  // ----------------------------------------------------------
  //
  // Antes devolvíamos 0.
  //
  // Esto era incorrecto porque una DO por debajo de CAL0
  // no debe convertirse automáticamente en 0 UI/mL.
  //
  // Debe informarse como fuera de rango.
  // ----------------------------------------------------------

  const primero =
    puntosValidos[0];

  if (y < primero.y) {
    return null;
  }

  // ----------------------------------------------------------
  // FUERA DE RANGO SUPERIOR
  // ----------------------------------------------------------

  const ultimo =
    puntosValidos[
      puntosValidos.length - 1
    ];

  if (y > ultimo.y) {
    return null;
  }

  // ----------------------------------------------------------
  // BUSCAR SEGMENTO
  // ----------------------------------------------------------

  for (
    let i = 0;
    i <
    puntosValidos.length - 1;
    i++
  ) {
    const p1 =
      puntosValidos[i];

    const p2 =
      puntosValidos[i + 1];

    const y1 = p1.y;
    const y2 = p2.y;

    // --------------------------------------------------------
    // Segmento ascendente
    // --------------------------------------------------------

    if (
      y >= y1 &&
      y <= y2
    ) {
      if (
        Math.abs(
          y2 - y1
        ) < Number.EPSILON
      ) {
        return p1.x;
      }

      const proporcion =
        (y - y1) /
        (y2 - y1);

      return (
        p1.x +
        proporcion *
          (p2.x - p1.x)
      );
    }

    // --------------------------------------------------------
    // Segmento descendente
    // --------------------------------------------------------

    if (
      y <= y1 &&
      y >= y2
    ) {
      if (
        Math.abs(
          y2 - y1
        ) < Number.EPSILON
      ) {
        return p1.x;
      }

      const proporcion =
        (y - y1) /
        (y2 - y1);

      return (
        p1.x +
        proporcion *
          (p2.x - p1.x)
      );
    }
  }

  return null;
}

// ============================================================
// CONVERTIR DO A CONCENTRACIÓN
// ============================================================

export function convertirDOaConcentracion(
  doValor,
  curva
) {
  if (!curva) {
    return {
      doOriginal: doValor,

      doCorregida: null,

      concentracion: null,

      estado: "Sin curva",
    };
  }

  const doNumero =
    convertirNumero(
      doValor
    );

  if (
    doNumero === null
  ) {
    return {
      doOriginal: doValor,

      doCorregida: null,

      concentracion: null,

      estado: "Sin datos",
    };
  }

  // ----------------------------------------------------------
  // Corregir DO por blanco
  // ----------------------------------------------------------

  const doCorregida =
    corregirDO(
      doNumero,
      curva.blancoPromedio
    );

  if (
    doCorregida === null
  ) {
    return {
      doOriginal: doValor,

      doCorregida: null,

      concentracion: null,

      estado: "Sin datos",
    };
  }

  // ----------------------------------------------------------
  // Interpolación
  // ----------------------------------------------------------

  const concentracion =
    interpolarConcentracion(
      doCorregida,
      curva.puntos
    );

  // ----------------------------------------------------------
  // FUERA DE RANGO
  // ----------------------------------------------------------

  if (
    concentracion === null
  ) {
    return {
      doOriginal: doValor,

      doCorregida,

      concentracion: null,

      estado: "Fuera de rango",
    };
  }

  // ----------------------------------------------------------
  // RESULTADO VÁLIDO
  // ----------------------------------------------------------

  return {
    doOriginal: doValor,

    doCorregida,

    concentracion,

    estado: "Válido",
  };
}

// ============================================================
// SELECCIONAR CURVA RA1000
// ============================================================
//
// La selección se realiza SIEMPRE utilizando DO450.
//
//   DO450 < 2.3 -> curva 450 nm
//   DO450 > 2.3 -> curva 405 nm
//
// Exactamente 2.3 queda indefinido porque el dato suministrado
// del protocolo no indica qué curva utilizar.
// ============================================================

export function seleccionarCurvaRA1000(
  do450,
  curvas
) {
  const valor450 =
    convertirNumero(
      do450
    );

  if (
    valor450 === null
  ) {
    return {
      curva: null,

      longitudOnda: null,

      nombreCurva: null,

      error:
        "Debe ingresar una DO válida a 450 nm para seleccionar la curva.",
    };
  }

  // ----------------------------------------------------------
  // CURVA 1 - 450 nm
  // ----------------------------------------------------------

  if (
    valor450 < UMBRAL_DO450
  ) {
    return {
      curva:
        curvas?.curva450 ??
        null,

      longitudOnda:
        LONGITUD_ONDA_CURVA_1,

      nombreCurva:
        "Curva estándar 1",

      error:
        curvas?.curva450
          ? null
          : "No está disponible la curva estándar de 450 nm.",
    };
  }

  // ----------------------------------------------------------
  // CURVA 2 - 405 nm
  // ----------------------------------------------------------

  if (
    valor450 > UMBRAL_DO450
  ) {
    return {
      curva:
        curvas?.curva405 ??
        null,

      longitudOnda:
        LONGITUD_ONDA_CURVA_2,

      nombreCurva:
        "Curva estándar 2",

      error:
        curvas?.curva405
          ? null
          : "No está disponible la curva estándar de 405 nm.",
    };
  }

  // ----------------------------------------------------------
  // EXACTAMENTE 2.3
  // ----------------------------------------------------------

  return {
    curva: null,

    longitudOnda: null,

    nombreCurva: null,

    error:
      `La DO450 es exactamente ${UMBRAL_DO450}. El inserto RA1000 no define qué curva utilizar en ese punto.`,
  };
}

// ============================================================
// CALCULAR UNA MUESTRA
// ============================================================

export function calcularMuestraRA1000(
  muestra,
  curvas
) {
  const do450Original =
    muestra?.do450;

  const do405Original =
    muestra?.do405;

  // ----------------------------------------------------------
  // Validar DO450
  // ----------------------------------------------------------

  const do450 =
    convertirNumero(
      do450Original
    );

  if (
    do450 === null
  ) {
    return {
      id: muestra?.id,

      nombre: muestra?.nombre,

      codigo: muestra?.codigo,

      do450:
        do450Original ?? "",

      do405:
        do405Original ?? "",

      curva: null,

      longitudOnda: null,

      doOriginal: null,

      doCorregida: null,

      concentracionBase: null,

      dilucion:
        convertirNumero(
          muestra?.dilucion
        ) ?? 1,

      concentracion: null,

      estado: "Sin datos",

      error:
        "No se puede seleccionar la curva sin una DO válida a 450 nm.",
    };
  }

  // ----------------------------------------------------------
  // Seleccionar curva
  // ----------------------------------------------------------

  const seleccion =
    seleccionarCurvaRA1000(
      do450,
      curvas
    );

  if (
    seleccion.error
  ) {
    return {
      id: muestra?.id,

      nombre: muestra?.nombre,

      codigo: muestra?.codigo,

      do450:
        do450Original ?? "",

      do405:
        do405Original ?? "",

      curva:
        seleccion.nombreCurva,

      longitudOnda:
        seleccion.longitudOnda,

      doOriginal: null,

      doCorregida: null,

      concentracionBase: null,

      dilucion:
        convertirNumero(
          muestra?.dilucion
        ) ?? 1,

      concentracion: null,

      estado: "Sin curva",

      error:
        seleccion.error,
    };
  }

  // ----------------------------------------------------------
  // Determinar qué DO utilizar
  // ----------------------------------------------------------

  const doUtilizada =
    seleccion.longitudOnda === 450
      ? muestra?.do450
      : muestra?.do405;

  const doUtilizadaNumero =
    convertirNumero(
      doUtilizada
    );

  if (
    doUtilizadaNumero === null
  ) {
    return {
      id: muestra?.id,

      nombre: muestra?.nombre,

      codigo: muestra?.codigo,

      do450:
        do450Original ?? "",

      do405:
        do405Original ?? "",

      curva:
        seleccion.nombreCurva,

      longitudOnda:
        seleccion.longitudOnda,

      doOriginal:
        doUtilizada ?? "",

      doCorregida: null,

      concentracionBase: null,

      dilucion:
        convertirNumero(
          muestra?.dilucion
        ) ?? 1,

      concentracion: null,

      estado: "Sin datos",

      error:
        `Debe ingresar una DO válida a ${seleccion.longitudOnda} nm.`,
    };
  }

  // ----------------------------------------------------------
  // Convertir DO a concentración
  // ----------------------------------------------------------

  const conversion =
    convertirDOaConcentracion(
      doUtilizadaNumero,
      seleccion.curva
    );

  // ----------------------------------------------------------
  // Dilución
  // ----------------------------------------------------------

  const dilucion =
    convertirNumero(
      muestra?.dilucion
    );

  const dilucionFinal =
    dilucion !== null &&
    dilucion > 0
      ? dilucion
      : 1;

  // ----------------------------------------------------------
  // Concentración base
  // ----------------------------------------------------------

  const concentracionBase =
    conversion.concentracion;

  // ----------------------------------------------------------
  // Aplicar dilución
  // ----------------------------------------------------------

  const concentracion =
    concentracionBase !== null
      ? concentracionBase *
        dilucionFinal
      : null;

  return {
    id: muestra?.id,

    nombre: muestra?.nombre,

    codigo: muestra?.codigo,

    do450:
      do450Original ?? "",

    do405:
      do405Original ?? "",

    curva:
      seleccion.nombreCurva,

    longitudOnda:
      seleccion.longitudOnda,

    doOriginal:
      conversion.doOriginal,

    doCorregida:
      conversion.doCorregida,

    concentracionBase,

    dilucion:
      dilucionFinal,

    concentracion,

    estado:
      conversion.estado,

    error: null,
  };
}

// ============================================================
// CALCULAR MUESTRAS RA1000
// ============================================================

export function calcularMuestrasRA1000(
  muestras,
  curvas
) {
  if (
    !Array.isArray(muestras)
  ) {
    return [];
  }

  return muestras.map(
    (muestra) =>
      calcularMuestraRA1000(
        muestra,
        curvas
      )
  );
}

// ============================================================
// COMPATIBILIDAD CON CALCULAR MUESTRAS
// ============================================================

export function calcularMuestras(
  muestras,
  curvas
) {
  // ----------------------------------------------------------
  // RA1000
  // ----------------------------------------------------------

  if (
    curvas &&
    (
      curvas.curva450 ||
      curvas.curva405
    )
  ) {
    return calcularMuestrasRA1000(
      muestras,
      curvas
    );
  }

  // ----------------------------------------------------------
  // Compatibilidad con versión anterior
  // ----------------------------------------------------------

  if (!Array.isArray(muestras)) {
    return [];
  }

  if (!curvas) {
    return muestras.map(
      (muestra) => ({
        id: muestra?.id,

        nombre: muestra?.nombre,

        codigo: muestra?.codigo,

        doOriginal:
          muestra?.do1 ?? "",

        doCorregida: null,

        concentracion: null,

        dilucion:
          convertirNumero(
            muestra?.dilucion
          ) ?? 1,

        estado: "Sin curva",
      })
    );
  }

  return muestras.map(
    (muestra) => {
      const conversion =
        convertirDOaConcentracion(
          muestra?.do1,
          curvas
        );

      const dilucion =
        convertirNumero(
          muestra?.dilucion
        );

      const dilucionFinal =
        dilucion !== null &&
        dilucion > 0
          ? dilucion
          : 1;

      const concentracion =
        conversion.concentracion !==
        null
          ? conversion.concentracion *
            dilucionFinal
          : null;

      return {
        id: muestra?.id,

        nombre: muestra?.nombre,

        codigo: muestra?.codigo,

        doOriginal:
          conversion.doOriginal,

        doCorregida:
          conversion.doCorregida,

        concentracion,

        dilucion:
          dilucionFinal,

        estado:
          conversion.estado,
      };
    }
  );
}

// ============================================================
// CONTROL RA1000
// ============================================================

export function calcularControlRA1000(
  control,
  curvas
) {
  const muestraControl = {
    id: "CTL",

    nombre: "CTL",

    codigo: "",

    do405:
      control?.do405 ?? "",

    do450:
      control?.do450 ?? "",

    dilucion: 1,
  };

  const resultado =
    calcularMuestraRA1000(
      muestraControl,
      curvas
    );

  // ----------------------------------------------------------
  // Rango del control
  // ----------------------------------------------------------

  const minimo =
    convertirNumero(
      control?.minimo
    );

  const maximo =
    convertirNumero(
      control?.maximo
    );

  if (
    resultado.estado ===
      "Válido" &&
    resultado.concentracion !==
      null
  ) {
    if (
      minimo !== null &&
      resultado.concentracion <
        minimo
    ) {
      return {
        ...resultado,

        estado:
          "Fuera de rango",

        error:
          "El control está por debajo del rango permitido.",
      };
    }

    if (
      maximo !== null &&
      resultado.concentracion >
        maximo
    ) {
      return {
        ...resultado,

        estado:
          "Fuera de rango",

        error:
          "El control está por encima del rango permitido.",
      };
    }
  }

  return resultado;
}

// ============================================================
// INFORMACIÓN DE LOS BLANCOS RA1000
// ============================================================

export function prepararBlancosRA1000(
  blancos
) {
  const blanco405 =
    calcularPromedioBlancos(
      blancos?.do405_1,
      blancos?.do405_2
    );

  const blanco450 =
    calcularPromedioBlancos(
      blancos?.do450_1,
      blancos?.do450_2
    );

  return {
    blanco405,

    blanco450,
  };
}

// ============================================================
// CALCULAR BLANCOS RA1000
// ============================================================

export function calcularBlancosRA1000(
  blancos
) {
  const {
    blanco405,
    blanco450,
  } =
    prepararBlancosRA1000(
      blancos
    );

  const validacion405 =
    validarBlanco(
      blanco405
    );

  const validacion450 =
    validarBlanco(
      blanco450
    );

  return {
    blanco405,

    blanco450,

    valido405:
      validacion405.valido,

    valido450:
      validacion450.valido,

    error405:
      validacion405.error,

    error450:
      validacion450.error,

    valido:
      validacion405.valido &&
      validacion450.valido,
  };
}

// ============================================================
// EXPORT DEFAULT
// ============================================================

export default {
  promedio,

  convertirNumero,

  esValorMayorQue,

  esValorMenorQue,

  corregirDO,

  calcularPromedioBlancos,

  validarBlanco,

  ajustarLineal,

  modeloLineal,

  inversaLineal,

  construirCurva,

  calcularCurva,

  interpolarConcentracion,

  convertirDOaConcentracion,

  seleccionarCurvaRA1000,

  calcularMuestraRA1000,

  calcularMuestrasRA1000,

  calcularMuestras,

  calcularControlRA1000,

  prepararBlancosRA1000,

  calcularBlancosRA1000,

  obtenerNivelIgE,
};