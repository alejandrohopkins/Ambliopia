/**
 * Todos los parámetros ajustables de Misión Pixel.
 * Regla crítica: ningún número mágico vive fuera de este archivo.
 */

export type Ojo = 'derecho' | 'izquierdo';
export type Modo = 'parche' | 'lentes';
export type ColorLente = 'rojo' | 'cian';
export type IdJuego =
  | 'minero'
  | 'saboteador'
  | 'torre'
  | 'meteoritos'
  // Módulo de parche: el ojo ambliope trabaja solo.
  | 'cazador'
  | 'rebote'
  | 'gabor'
  | 'corte'
  | 'laberinto'
  // Módulo de lentes: cada ojo recibe una parte y solo juntos se juega.
  | 'pozo'
  | 'serpiente'
  | 'ave'
  | 'sapo'
  | 'mosaicos';

/**
 * En qué modo se juega cada minijuego. Los cuatro primeros sirven para los
 * dos; los de cada módulo están pensados solo para el suyo: con parche se
 * mide el ojo ambliope a solas, con lentes se obliga a juntar los dos.
 */
export type Modulo = 'ambos' | 'parche' | 'lentes';

export const config = {
  /** Ojo ambliope por defecto. Toda la lógica y los textos se derivan de aquí. */
  ojoAmbliope: 'derecho' as Ojo,

  perfil: {
    nombrePorDefecto: 'Alana',
    edadPorDefecto: 12,
  },

  /**
   * Rotación semanal: cada juego del modo pide estos intentos (niveles
   * terminados) de lunes a domingo. Los que ya los tienen se bloquean hasta
   * que los demás también los tengan.
   */
  rotacion: {
    intentosPorSemana: 3,
  },

  /**
   * Premio de tiempo de pantalla: al cumplir la meta de minutos del día con
   * esta precisión, se felicita a la jugadora y se le pide una captura para
   * reclamar los minutos extra con su familia.
   */
  premioDePantalla: {
    precisionMinima: 0.85,
    minutosExtra: 15,
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
    /**
     * Aciertos seguidos necesarios para endurecer; un fallo siempre facilita.
     * Con pasos iguales en escala logarítmica, la escalera se asienta donde
     * se acierta 0,5^(1/n): con 2 es el 71 %, con 3 el 79 %. Se usa 3 para
     * que se falle menos sin dejar de exigir.
     */
    aciertosParaBajar: 3,
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
    /**
     * Aciertos que hacen falta para superar un nivel: entonces el juego pasa
     * al siguiente y la próxima partida empieza ahí. Con menos se repite el
     * mismo nivel; nunca se baja.
     */
    precisionParaSubir: 0.85,
    /** La segunda estrella. La tercera es superar el nivel. */
    precisionDosEstrellas: 0.72,
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
    /** Hueco que se deja abajo para que el botón de pausa no tape a la minera. */
    margenDePausaPx: 70,
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
    /**
     * Tamaños de pieza (celdas) que puede sacar cada mundo, 1-indexado.
     * Desde el mundo 1 ya hay formas que girar; los mundos altos dejan de
     * regalar el bloque suelto. Aun así, si ninguna pieza del mundo cabe ya en
     * lo que falta del plano, siempre se ofrece el bloque suelto.
     */
    bloquesPorPiezaPorMundo: [[1, 2, 3], [1, 2, 3, 4], [1, 2, 3, 4], [2, 3, 4], [2, 3, 4]],
    velocidadCaidaInicialCeldasSeg: 1,
    velocidadCaidaFinalCeldasSeg: 3,
    /** Mantener la flecha abajo multiplica la velocidad de caída por esto. */
    factorCaidaSuave: 6,
    /** Desplazamientos que se prueban si la pieza no cabe al girar. */
    desviosAlGirar: [0, -1, 1, -2, 2],
    /** Luminancia de la sombra de aterrizaje, en fracción del color de la pieza. */
    factorDeSombra: 0.55,
    /** Columnas de ancho reservadas a la derecha para la pieza siguiente. */
    columnasParaSiguiente: 5,
    /** Alto reservado abajo para la fila de botones. */
    altoDeBotonesPx: 70,
    /** Cuánto se resalta una fila recién completada. */
    avisoFilaMs: 450,
    /**
     * Cuánto se marcan los huecos que ya no se pueden rellenar antes de cerrar
     * el nivel. Da tiempo a ver por qué se acabó, sin dejarlo eterno.
     */
    avisoFinMs: 1600,
    desvanecerBloqueFueraMs: 2500,
    contrastePlanoInicial: 0.5,
    contrastePlanoMaximo: 1.0,
    /**
     * En lentes la escalera mueve el brillo de la pieza que cae, dentro del
     * color del lente del ojo ambliope (0–1).
     */
    brilloPiezaLentesInicial: 0.8,
    brilloPiezaLentesMinimo: 0.08,
    brilloPiezaLentesMaximo: 1,
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

    /**
     * Teclado. La velocidad va en fracción del ancho del área por segundo, y
     * arranca baja para poder colocar la nave con precisión: un toque corto
     * la mueve unos pocos píxeles. Si se mantiene la flecha, acelera hasta la
     * velocidad máxima para cruzar la pantalla sin castigar los dedos.
     */
    tecladoVelocidadInicial: 0.12,
    tecladoVelocidadMaxima: 0.55,
    /** Segundos manteniendo la flecha hasta llegar a la velocidad máxima. */
    tecladoSegundosHastaMaxima: 0.7,

    /** Copias de la estela que se dibujan detrás de la nave. */
    pasosDeEstela: 3,
    /** Lo que tarda la estela en recorrer un paso, en milisegundos. */
    estelaMsPorPaso: 130,

    /** Chispas al atrapar una estrella de energía. */
    chispasPorEstrella: 12,
    chispasDuracionMs: 340,
    /**
     * Radio del estallido: el mayor entre estos píxeles y el tamaño de la
     * estrella por el factor. El mínimo importa porque la escalera llega a
     * estrellas de 6 px y el premio no puede desaparecer justo cuando le
     * está saliendo bien.
     */
    chispasRadioMinimoPx: 34,
    chispasRadioFactor: 1.6,
    /** Lado de cada chispa al nacer, en píxeles. */
    chispasLadoPx: 4,
  },

  /** Lo que comparten los diez juegos de los módulos. */
  modulos: {
    /** Segundos que se ve la explicación al empezar cada nivel. */
    ayudaSeg: 4,
    /** Lo que se enseña la respuesta correcta tras elegir, en los juegos de elegir. */
    revelarMs: 800,
    /** Hueco que se deja abajo para el botón de pausa. */
    margenInferiorPx: 60,
    /** Ancho de la esquina de abajo a la izquierda que ocupa el botón de pausa. */
    zonaDePausaPx: 120,
    /** Recorrido mínimo del dedo para que un deslizamiento cuente como dirección. */
    deslizarMinimoPx: 26,
  },

  cazador: {
    duracionNivelSeg: 60,
    rejillaPorMundo: [
      { cols: 3, filas: 3 },
      { cols: 3, filas: 3 },
      { cols: 4, filas: 3 },
      { cols: 4, filas: 4 },
      { cols: 5, filas: 4 },
    ],
    /** Tiempo que una diana se queda asomada, del primer nivel al último. */
    visibleMsInicial: 2000,
    visibleMsFinal: 700,
    /** Pausa entre una aparición y la siguiente. */
    esperaMsInicial: 700,
    esperaMsFinal: 250,
    /** Irregularidad del ritmo: 0 es un metrónomo, 1 es muy variable. */
    irregularidadInicial: 0,
    irregularidadFinal: 0.8,
    simultaneosInicial: 1,
    simultaneosFinal: 3,
    /** Probabilidad de que asome una bomba en vez de una diana. */
    bombasInicial: 0,
    bombasFinal: 0.3,
    /** Vaivén de la rejilla, en fracción de la celda. */
    vaivenInicial: 0,
    vaivenFinal: 0.35,
    vaivenPeriodoSeg: 6,
    tamanoInicialPx: 56,
    tamanoMinimoPx: 6,
    tamanoMaximoPx: 120,
    /** La diana nunca pasa de esta fracción del agujero. */
    fraccionMaximaDelAgujero: 0.85,
    /** El agujero ocupa esta fracción de su celda. */
    agujeroEnCelda: 0.8,
    /**
     * Un toque vale si cae a esta distancia del centro, o dentro de la diana
     * si es más grande: el dedo no tiene que ser más fino que la diana, pero
     * tocar agujeros al azar no sirve.
     */
    toleranciaMinimaPx: 24,
    avisoMs: 300,
  },

  rebote: {
    duracionNivelSeg: 75,
    /** Ancho de la paleta, en fracción del ancho del área. */
    paletaInicial: 0.26,
    paletaFinal: 0.12,
    /** Velocidad de la bola, en fracción del alto del área por segundo. */
    velocidadInicial: 0.4,
    velocidadFinal: 0.9,
    /** Bloques que aceleran la bola al chocar, por mundo. */
    bloquesPorMundo: [0, 0, 2, 3, 4],
    aceleracionDeBloque: 1.35,
    /** Tamaño de los bloques, en fracción del área, y franja del alto donde van. */
    bloqueEnAncho: 1 / 9,
    bloqueEnAlto: 1 / 22,
    franjaDeBloques: [0.22, 0.55] as [number, number],
    /** Bolas a la vez, por mundo. */
    bolasPorMundo: [1, 1, 1, 2, 2],
    /** Ángulo máximo del rebote en la paleta, desde la vertical. */
    anguloMaximoGrados: 60,
    /**
     * El golpe se juzga con el centro de la bola más este margen, no con su
     * borde: así una bola pequeña no es más fácil de fallar por ser pequeña,
     * solo por verse peor, que es lo que se mide.
     */
    margenDeGolpePx: 6,
    reaparecerMs: 700,
    altoDePaletaPx: 12,
    anchoMinimoDePaletaPx: 48,
    /** La paleta va por encima del botón de pausa, que está abajo a la izquierda. */
    separacionInferiorPx: 50,
    tamanoInicialPx: 28,
    tamanoMinimoPx: 4,
    tamanoMaximoPx: 60,
  },

  gabor: {
    ensayosPorNivel: 14,
    rejillaPorMundo: [
      { cols: 2, filas: 2 },
      { cols: 3, filas: 2 },
      { cols: 3, filas: 3 },
      { cols: 4, filas: 3 },
      { cols: 4, filas: 3 },
    ],
    /** Ciclos de la onda dentro del parche: más ciclos, frecuencia espacial más alta. */
    ciclosInicial: 2.5,
    ciclosFinal: 6,
    /** Diferencia de orientación del parche distinto, en grados. */
    diferenciaInicialGrados: 90,
    diferenciaFinalGrados: 30,
    /** Segundos para responder, por mundo; 0 es sin límite. */
    limiteSegPorMundo: [0, 0, 0, 8, 6],
    /** Luminancia lineal media del panel gris (0–1). */
    luminanciaMedia: 0.35,
    /** Ancho de la envolvente gaussiana, en fracción del lado del parche. */
    sigmaEnParche: 0.2,
    /** El parche ocupa esta fracción de su celda, sin pasar del máximo. */
    fraccionDeCelda: 0.82,
    parcheMaximoPx: 190,
    /** Contraste de Michelson. */
    contrasteInicial: 0.6,
    contrasteMinimo: 0.003,
    contrasteMaximo: 1,
  },

  corte: {
    duracionNivelSeg: 70,
    /** Tamaño de las frutas: lo manda el nivel, no la escalera. */
    tamanoInicialPx: 76,
    tamanoFinalPx: 30,
    /** Velocidad, en fracción del ancho del área por segundo. */
    velocidadInicial: 0.18,
    velocidadFinal: 0.4,
    /** Probabilidad de que una fruta vuele en parábola en vez de en línea recta. */
    curvaturaInicial: 0,
    curvaturaFinal: 1,
    /** Aceleración de caída de las parábolas, en fracción del alto por segundo². */
    gravedad: 0.55,
    /** Desde este mundo algunas frutas aceleran a mitad de vuelo. */
    aceleronDesdeMundo: 4,
    probabilidadDeAceleron: 0.5,
    factorDeAceleron: 1.6,
    simultaneosInicial: 1,
    simultaneosFinal: 3,
    esperaEntreFrutasMs: 700,
    /** Altura de la cima de una parábola, en fracción del alto (mínima y máxima). */
    cimaDeParabola: [0.45, 0.8] as [number, number],
    /** Contraste de Weber de la fruta sobre el huerto. */
    contrasteInicial: 0.9,
    contrasteMinimo: 0.03,
    contrasteMaximo: 2.5,
    /** Lo que dura el rastro del dedo y las dos mitades de la fruta cortada. */
    rastroMs: 200,
    mitadesMs: 450,
    /** Velocidad de la hoja con el teclado, en fracción del ancho por segundo. */
    hojaTecladoVelocidad: 0.7,
  },

  laberinto: {
    duracionNivelSeg: 90,
    /**
     * Tamaño máximo del laberinto por mundo, en celdas. En una tablet los
     * primeros ocupan casi toda la pantalla; los últimos, con pasillos muy
     * estrechos, quedan más pequeños pero con más recodos.
     */
    celdasPorMundo: [
      { cols: 12, filas: 6 },
      { cols: 14, filas: 7 },
      { cols: 16, filas: 8 },
      { cols: 18, filas: 9 },
      { cols: 20, filas: 10 },
    ],
    /** Ancho del pasillo, del primer nivel al último. */
    pasilloInicialPx: 64,
    pasilloFinalPx: 22,
    /** Grosor del muro, del primer nivel al último: al principio, guías gruesas. */
    muroInicialPx: 8,
    muroFinalPx: 4,
    radioDelPuntoPx: 5,
    /** Distancia desde la que el dedo "agarra" el punto. */
    agarreMaximoPx: 44,
    /** Celdas del camino entre control y control: cada tramo es un ensayo. */
    celdasPorTramo: 4,
    obstaculosPorMundo: [0, 0, 0, 1, 2],
    velocidadObstaculoCeldasSeg: 1.2,
    /** Lado del obstáculo, en fracción del pasillo. */
    obstaculoEnPasillo: 0.5,
    /** Un obstáculo patrulla un pasillo recto de al menos estas celdas. */
    pasilloDeObstaculo: 3,
    /** Segundos por tramo, por mundo; 0 es sin límite. */
    limiteDeTramoSegPorMundo: [0, 0, 0, 15, 12],
    velocidadTecladoCeldasSeg: 1.8,
    /** Contraste de Weber de los muros sobre el suelo. */
    contrasteInicial: 1.2,
    contrasteMinimo: 0.03,
    contrasteMaximo: 4,
    avisoChoqueMs: 500,
  },

  pozo: {
    duracionNivelSeg: 90,
    cols: 10,
    filas: 18,
    velocidadCaidaInicialCeldasSeg: 1,
    velocidadCaidaFinalCeldasSeg: 4.5,
    factorCaidaSuave: 8,
    /** Se enseña la pieza siguiente hasta este mundo. */
    siguienteHastaMundo: 3,
    /** Probabilidad de que la pieza gire sola una vez mientras cae, por mundo. */
    giroSorpresaPorMundo: [0, 0, 0, 0.25, 0.4],
    /** Filas de abajo que se hunden cuando el pozo se llena: nunca se pierde. */
    filasQueSeHunden: 4,
    /** Luminancia de la pieza en la capa del ojo ambliope (0–1). */
    contrasteInicial: 0.8,
    contrasteMinimo: 0.08,
    contrasteMaximo: 1,
    factorDeSombra: 0.5,
    columnasParaSiguiente: 5,
    avisoFilaMs: 350,
    avisoHundidoMs: 1500,
  },

  serpiente: {
    duracionNivelSeg: 75,
    celdasPorMundo: [
      { cols: 16, filas: 10 },
      { cols: 18, filas: 11 },
      { cols: 20, filas: 12 },
      { cols: 22, filas: 13 },
      { cols: 24, filas: 14 },
    ],
    velocidadInicialCeldasSeg: 3.5,
    velocidadFinalCeldasSeg: 7.5,
    largoInicial: 4,
    /** Largo máximo, en fracción de las celdas libres. */
    largoMaximo: 0.35,
    /** Muros dentro del tablero, por mundo. */
    murosPorMundo: [0, 0, 2, 4, 6],
    largoDeMuro: 4,
    /**
     * Tiempo para llegar a la manzana: lo que tardaría por el camino más
     * corto, por esta holgura, más un margen. Al terminarse cambia de sitio.
     */
    holguraInicial: 4,
    holguraFinal: 1.8,
    margenSeg: 2.5,
    tamanoInicialPx: 24,
    tamanoMinimoPx: 3,
    tamanoMaximoPx: 48,
  },

  ave: {
    duracionNivelSeg: 75,
    /** Hueco entre barreras, en fracción del alto del área. */
    huecoInicial: 0.42,
    huecoFinal: 0.22,
    /** Avance, en fracción del ancho del área por segundo. */
    velocidadInicial: 0.16,
    velocidadFinal: 0.3,
    /** Aceleración del avance dentro del nivel, por mundo (fracción del ancho por s²). */
    aceleracionPorMundo: [0, 0, 0, 0.003, 0.005],
    /** Vaivén de las barreras, por mundo, en fracción del alto. */
    vaivenPorMundo: [0, 0, 0.05, 0.1, 0.14],
    vaivenPeriodoSeg: 3,
    /** Distancia entre barreras y ancho de cada una, en fracción del ancho. */
    separacionDeBarreras: 0.5,
    anchoDeBarrera: 0.07,
    anchoMinimoDeBarreraPx: 30,
    /** Lo más que puede moverse el hueco de una barrera a la siguiente, en fracción del alto. */
    saltoMaximoDeHueco: 0.3,
    /** El ave vuela a esta fracción del ancho, y su suelo es una franja de este alto. */
    posicionDelAve: 0.25,
    sueloPx: 10,
    /** El avance acelerado nunca pasa de este múltiplo del inicial. */
    aceleracionMaxima: 1.5,
    /** Luminancia de las nubes del fondo: acompañan sin distraer. */
    factorDeNubes: 0.35,
    /** Física del vuelo, en fracción del alto del área. */
    gravedad: 1.5,
    impulso: 0.55,
    caidaMaxima: 0.75,
    /** Tras chocar atraviesa un momento sin volver a chocar: nunca se acaba. */
    fantasmaMs: 900,
    /** Luminancia de las barreras en la capa del ojo ambliope (0–1). */
    contrasteInicial: 0.8,
    contrasteMinimo: 0.06,
    contrasteMaximo: 1,
  },

  sapo: {
    duracionNivelSeg: 90,
    columnas: 11,
    carrilesDeCallePorMundo: [2, 3, 3, 4, 4],
    carrilesDeRioPorMundo: [0, 0, 2, 3, 3],
    velocidadInicialCeldasSeg: 1.1,
    velocidadFinalCeldasSeg: 2.4,
    /**
     * Cada carril va un poco más rápido o más lento que el de al lado, para
     * que sus huecos no queden sincronizados y siempre acaben coincidiendo.
     * En el último mundo la diferencia es mayor: tráfico desordenado.
     */
    variacionDeVelocidad: 0.15,
    variacionDesordenada: 0.3,
    /** Hueco entre coches, en celdas, del primer nivel al último. */
    huecoInicialCeldas: 4,
    huecoFinalCeldas: 2.5,
    largoDeTroncoInicial: 4,
    largoDeTroncoFinal: 3,
    /** Agua entre tronco y tronco, en celdas. */
    aguaEntreTroncos: 1.5,
    /** Desde este mundo algunos troncos se hunden un rato. */
    hundirseDesdeMundo: 4,
    hundidoSeg: 1.6,
    flotandoSeg: 3.5,
    /** Antes de hundirse, el tronco se oscurece este rato para avisar. */
    avisoHundirseSeg: 0.7,
    /** Luminancias del agua, del tronco que avisa y del tronco hundido. */
    factorDeAgua: 0.3,
    factorAvisoHundirse: 0.65,
    factorHundido: 0.4,
    /** Desde este mundo la corriente del río cambia de sentido de vez en cuando. */
    corrienteDesdeMundo: 5,
    corrienteCadaSeg: 9,
    /** Ancho con el que choca el sapo, en fracción de la celda: no depende de su tamaño. */
    anchoDeChoque: 0.6,
    saltoMs: 110,
    tamanoInicialPx: 40,
    tamanoMinimoPx: 5,
    tamanoMaximoPx: 64,
    avisoChoqueMs: 500,
  },

  mosaicos: {
    ensayosPorNivel: 12,
    /** Lado del mosaico, por mundo. */
    ladoPorMundo: [3, 4, 4, 5, 6],
    /** Segundos para responder, por mundo; 0 es sin límite. */
    limiteSegPorMundo: [0, 0, 0, 20, 14],
    tamanoInicialPx: 40,
    /** Cinco píxeles es lo mínimo: cada trazo del símbolo mide un píxel. */
    tamanoMinimoPx: 5,
    tamanoMaximoPx: 80,
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
    /** Minijuegos distintos en un mismo día para la insignia Exploradora. */
    juegosParaExploradora: 5,
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
    version: 2,
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

/**
 * Nivel de aciertos en el que se asienta la escalera: con n aciertos
 * seguidos para endurecer y un fallo para facilitar, es 0,5^(1/n).
 */
export function nivelDeAciertosBuscado(): number {
  return 0.5 ** (1 / config.escalera.aciertosParaBajar);
}
