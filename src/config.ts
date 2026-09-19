/**
 * Todos los parámetros ajustables de Misión Pixel.
 * Regla crítica: ningún número mágico vive fuera de este archivo.
 */

export type Ojo = 'derecho' | 'izquierdo';
export type Modo = 'parche' | 'lentes';
export type ColorLente = 'rojo' | 'cian';
export type IdJuego = 'minero' | 'saboteador' | 'torre' | 'meteoritos';

export const config = {
  /** Ojo ambliope por defecto. Toda la lógica y los textos se derivan de aquí. */
  ojoAmbliope: 'derecho' as Ojo,

  perfil: {
    nombrePorDefecto: 'Alana',
    edadPorDefecto: 12,
  },

  sesion: {
    metaDiariaMin: 20,
    maxDiarioMin: 60,
    descansoCadaMin: 20,
    descansoSegundos: 60,
    descansoSaltableDespuesDeSeg: 30,
    /** Sin interacción durante este tiempo, los minutos dejan de contar. */
    inactividadSeg: 30,
    /** Minutos que el panel de adultos puede añadir tras llegar al máximo. */
    extensionMin: 15,
    distanciaCmPorDefecto: 40,
  },

  color: {
    /** Fondo del modo lentes: negro puro. */
    fondoLentes: '#000000',
    /** Gris neutro para lo que ven ambos ojos (entre #8A8A8A y #B0B0B0). */
    grisAmbosMin: 0x8a,
    grisAmbosMax: 0xb0,
    grisAmbos: 0x9d,
    /** Un canal de 8 bits no puede bajar de un paso. */
    pasoMinimo8Bits: 1,
  },

  lentes: {
    /** Por debajo de esta intensidad máxima, sugerir lentes de mejor calidad. */
    intensidadMinimaAceptable: 120,
    intensidadInicialCalibracion: 255,
    escanerPrevioSegundos: 10,
  },

  balance: {
    contrasteInicialOjoDominante: 0.2,
    pasoSubida: 0.1,
    pasoBajada: 0.05,
    minimo: 0.1,
    maximo: 1.0,
    minutosMinimosEnLentes: 15,
    /** r ≤ este valor → subir. */
    umbralSubida: 1.25,
    /** r > este valor → bajar. */
    umbralBajada: 1.5,
    /** Días previos con datos que forman la mediana de referencia. */
    diasDeReferencia: 3,
  },

  escalera: {
    factorMasDificil: 0.8,
    factorMasFacil: 1.25,
    inversionesParaPasoFino: 4,
    factorFinoMasDificil: 0.9,
    factorFinoMasFacil: 1.11,
    /** Aciertos seguidos necesarios para endurecer. */
    aciertosParaBajar: 2,
    /** Inversiones usadas para estimar el umbral. */
    inversionesParaUmbral: 6,
    /** Si hay menos inversiones, se promedian los últimos N valores. */
    valoresDeRespaldo: 10,
    /** La sesión siguiente arranca en umbral guardado × este factor. */
    factorCalentamiento: 1.5,
    /** Un ensayo de confianza cada 4–6 ensayos. */
    confianzaCadaMin: 4,
    confianzaCadaMax: 6,
    factorEnsayoDeConfianza: 2.5,
  },

  calibracionPantalla: {
    /** Tarjeta bancaria estándar ISO/IEC 7810 ID-1. */
    tarjetaAnchoMm: 85.6,
    tarjetaAltoMm: 54,
    /** Estimación cuando no hay calibración: 96 dpi. */
    pxPorMmPorDefecto: 96 / 25.4,
  },

  progresion: {
    mundos: 5,
    nivelesPorMundo: 5,
    estrellasParaDesbloquearMundo: 8,
    precisionDosEstrellas: 0.65,
    precisionTresEstrellas: 0.75,
    rachaTresEstrellas: 5,
  },

  minero: {
    ensayosPorNivel: 15,
    segundosPorEnsayoMundo1: 6,
    segundosPorEnsayoMundo5: 4,
    paredPorMundo: [
      { cols: 3, filas: 3 },
      { cols: 4, filas: 3 },
      { cols: 4, filas: 4 },
      { cols: 5, filas: 4 },
      { cols: 6, filas: 4 },
    ],
    tamanoInicialPx: 60,
    tamanoMinimoPx: 3,
    /** Máximo como fracción del lado del bloque. */
    tamanoMaximoFraccionBloque: 0.8,
    contrasteInicial: 0.5,
    contrasteMaximo: 1.0,
    /** Contraste alto fijo mientras corre la escalera de tamaño. */
    contrasteFijoAlto: 0.8,
    /** Tamaño fijo mientras corre la escalera de contraste. */
    factorTamanoFijo: 3,
    tamanoFijoMinimoPx: 24,
    /** Probabilidad de que un ensayo use la escalera de contraste (solo parche). */
    probabilidadEscaleraContraste: 0.5,
    /** Pulso del brillo del cristal: nunca más de 3 Hz. */
    pulsoHz: 1,
    resaltarFalloMs: 1000,
  },

  saboteador: {
    ensayosPorNivel: 15,
    segundosPorEnsayoMundo1: 8,
    segundosPorEnsayoMundo5: 5,
    tripulantesPorMundo: [5, 7, 7, 9, 9],
    /** Distancia entre centros, en anchos de tripulante. */
    espaciadoPorMundo: [2.0, 1.6, 1.2, 1.2, 1.2],
    diametroInicialPx: 30,
    diametroMinimoPx: 5,
    diametroMaximoPx: 60,
    /** La abertura del visor mide 1/5 del diámetro. */
    fraccionAbertura: 1 / 5,
    /** Ancho del tripulante = este factor × diámetro del visor. */
    factorAnchoTripulante: 2,
    revelarFalloMs: 1000,
  },

  torre: {
    tablerosPorMundo: [
      { cols: 6, filas: 9 },
      { cols: 8, filas: 11 },
      { cols: 10, filas: 13 },
      { cols: 12, filas: 15 },
      { cols: 12, filas: 15 },
    ],
    /** Altura máxima de una figura = filas − este margen. */
    margenAlturaMaxima: 2,
    /** Bloques por pieza según el mundo (1-indexado por mundo). */
    bloquesPorPiezaPorMundo: [[1], [1, 2], [1, 2], [1, 2, 3], [1, 2, 3]],
    velocidadCaidaInicialCeldasSeg: 1,
    velocidadCaidaFinalCeldasSeg: 3,
    desvanecerBloqueFueraMs: 1000,
    contrastePlanoInicial: 0.5,
    contrastePlanoMaximo: 1.0,
  },

  meteoritos: {
    duracionNivelSeg: 75,
    tamanoInicialPx: 48,
    tamanoMinimoPx: 6,
    tamanoMaximoPx: 96,
    /** Un objeto cuenta como ensayo si pasa a menos de N anchos de nave. */
    anchosDeNaveParaEnsayo: 2,
    objetosSimultaneosMin: 1,
    objetosSimultaneosMax: 4,
    /**
     * Ritmo de caída. A 170 px/s un objeto cruza una pantalla de tablet en
     * unos 4 s, así que un nivel de 75 s deja unos 17 ensayos: suficientes
     * para que la escalera se mueva sin apurar a la jugadora.
     */
    velocidadCaidaInicialPxSeg: 170,
    velocidadCaidaFinalPxSeg: 420,
    /** Proporción estrella/roca. */
    probabilidadEstrella: 0.5,
    energiaMaxima: 100,
    energiaPorChoque: 15,
    energiaRecargaPorSeg: 6,
  },

  economia: {
    monedasPorMinutoActivo: 2,
    monedasPorAcierto: 1,
    monedasPorEstrellaDeNivel: 5,
    monedasPorNivelCompletado: 10,
    monedasMisionDelDia: 30,
    monedasMetaDiaria: 20,
    /** 5 × días de racha, con tope. */
    bonoRachaPorDia: 5,
    bonoRachaMaximo: 50,
    cristalesPorDiaConMeta: 1,
    cofreSemanalMonedas: 50,
    diasParaCofreSemanal: 5,
    precios: {
      comunMin: 150,
      comunMax: 250,
      raroMin: 400,
      raroMax: 700,
      legendarioCristalesMin: 8,
      legendarioCristalesMax: 15,
    },
  },

  racha: {
    protectoresPorSemana: 1,
  },

  misiones: {
    /**
     * Objetivos de la misión del día, escalados para cumplirse dentro de la
     * meta diaria de minutos. Nunca piden más de lo que cabe en una sesión.
     */
    rangos: {
      minutos: [15, 25],
      cristales: [15, 30],
      saboteadores: [12, 25],
      figuras: [1, 2],
      estrellasDeEnergia: [10, 22],
      estrellasDeNivel: [3, 7],
      juegosDistintos: [2, 3],
    } as Record<string, [number, number]>,
  },

  insignias: {
    /** Récord de tamaño mínimo, en píxeles CSS: menor es mejor. */
    ojoDeHalcon: [25, 10, 3],
    saboteadoresParaDetective: 50,
    figurasParaArquitecta: 10,
    estrellasParaPiloto: 500,
    rachasParaConstancia: [3, 7, 14, 30],
    subidasParaDosOjos: 3,
    fallosSeguidosParaPerseverante: 3,
    articulosParaColeccionista: 10,
  },

  avatar: {
    escalas: [4, 6, 8],
    /** Respiración: 1 px arriba y abajo cada 1.5 s. */
    respiracionMs: 1500,
    parpadeoMs: 4200,
  },

  audio: {
    volumenPorDefecto: 0.6,
    musicaPorDefecto: false,
    sonidoPorDefecto: true,
  },

  accesibilidad: {
    /** Ningún cambio de luminancia por encima de este ritmo. */
    maxParpadeosPorSegundo: 3,
    botonMinimoPx: 48,
    textoMinimoPx: 18,
  },

  almacenamiento: {
    clave: 'misionPixel:v1',
    version: 1,
    guardadoPeriodicoMs: 30_000,
  },

  /** Comparaciones de tamaño para "Mis récords". */
  comparacionesDeRecord: [
    { hastaMm: 1, clave: 'granoDeArena' },
    { hastaMm: 2, clave: 'semillaDeChia' },
    { hastaMm: 4, clave: 'hormiga' },
    { hastaMm: 7, clave: 'lenteja' },
    { hastaMm: 12, clave: 'botonDeCamisa' },
    { hastaMm: 9999, clave: 'moneda' },
  ] as const,
};

export type Config = typeof config;
