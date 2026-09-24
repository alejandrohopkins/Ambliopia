/**
 * Todos los textos visibles de Misión Pixel.
 * Regla crítica: ningún componente escribe texto en duro.
 * Los textos para la jugadora van en femenino.
 * Nada de "derecho"/"izquierdo" en duro: se derivan del ojo ambliope.
 */
import { config, nivelDeAciertosBuscado, type Ojo, type Modo, type IdJuego } from '../config';

/** Porcentaje de aciertos que persigue la escalera, redondeado para leerlo. */
const META_DE_ACIERTOS = Math.round(nivelDeAciertosBuscado() * 100);

/** Porcentaje de aciertos que hace falta para superar un nivel. */
const PARA_SUBIR = Math.round(config.progresion.precisionParaSubir * 100);

/** El ojo que se tapa en modo parche es siempre el contrario al ambliope. */
export function ojoContrario(ojo: Ojo): Ojo {
  return ojo === 'derecho' ? 'izquierdo' : 'derecho';
}

const NOMBRE_DE_OJO: Record<Ojo, string> = {
  derecho: 'derecho',
  izquierdo: 'izquierdo',
};

export function nombreDeOjo(ojo: Ojo): string {
  return NOMBRE_DE_OJO[ojo];
}

/** 'AAAA-MM-DD' → 'DD/MM/AAAA'. */
export function diaLegible(dia: string): string {
  const [anio, mes, diaDelMes] = dia.split('-');
  return `${diaDelMes}/${mes}/${anio}`;
}

/** Una fila de la tabla de controles: las teclas y lo que hacen. */
export interface FilaDeTeclas {
  teclas: string[];
  accion: string;
}

export const es = {
  app: {
    nombre: 'Misión Pixel',
    cargando: 'Cargando…',
  },

  comun: {
    si: 'Sí',
    no: 'No',
    continuar: 'Continuar',
    volver: 'Volver',
    cancelar: 'Cancelar',
    guardar: 'Guardar',
    listo: 'Listo',
    entendido: 'Entendido',
    omitir: 'Omitir',
    ahora: 'Hacerlo ahora',
    despues: 'Hacerlo después',
    cerrar: 'Cerrar',
    minutos: 'min',
    monedas: 'monedas',
    cristales: 'cristales',
    racha: 'racha',
    dias: 'días',
    volverALaBase: 'Volver a la base',
  },

  aviso: {
    titulo: 'Antes de empezar',
    texto:
      'Misión Pixel es un complemento del tratamiento indicado por el oftalmólogo. ' +
      'No es un dispositivo médico, no diagnostica y no reemplaza el parche, los lentes ni las consultas. ' +
      'Las métricas son estimaciones del juego. ' +
      'Si aparece dolor de cabeza, visión doble, dolor o cansancio en los ojos, suspender y consultar. ' +
      'Antes de usar el modo lentes, consultar con el oftalmólogo, en especial si hay estrabismo.',
  },

  pantallaPequena: 'En pantallas pequeñas el entrenamiento es más limitado.',

  modos: {
    parche: 'Parche',
    lentes: 'Lentes',
    lentesLargo: 'Lentes rojo/cian',
    bloqueado: 'Necesitas lentes rojo/cian para este modo.',
    fijo: 'El modo de hoy ya está elegido.',
  },

  juegos: {
    minero: 'Minero de cristales',
    saboteador: '¿Quién es el saboteador?',
    torre: 'Torre de bloques',
    meteoritos: 'Lluvia de meteoritos',
    cazador: 'Cazador de objetivos',
    rebote: 'Rebote ágil',
    gabor: 'Detector de patrones',
    corte: 'Corte de precisión',
    laberinto: 'Laberinto de trazado',
    pozo: 'Pozo de bloques',
    serpiente: 'La serpiente',
    ave: 'El ave voladora',
    sapo: 'El sapo cruzador',
    mosaicos: 'Mosaicos y secuencias',
  } as Record<IdJuego, string>,

  mundos: {
    minero: ['Cueva de piedra', 'Mina de ámbar', 'Caverna de hielo', 'Núcleo de lava', 'Geoda gigante'],
    saboteador: ['Nave Alfa', 'Estación lunar', 'Base en Marte', 'Anillos de Saturno', 'Nebulosa misteriosa'],
    torre: ['Pradera de bloques', 'Ciudad flotante', 'Luna', 'Planeta rojo', 'Estación orbital'],
    meteoritos: ['Órbita baja', 'Cinturón de asteroides', 'Lluvia de cometas', 'Viento solar', 'Galaxia lejana'],
    cazador: ['Campo de prácticas', 'Bosque de antenas', 'Ciudad de cráteres', 'Base secreta', 'Tormenta de señales'],
    rebote: ['Cancha lunar', 'Pista de hielo', 'Anillo de Saturno', 'Estadio de lava', 'Arena galáctica'],
    gabor: ['Franjas gruesas', 'Franjas medias', 'Franjas finas', 'Susurros de gris', 'Casi invisibles'],
    corte: ['Huerto espacial', 'Invernadero', 'Mercado orbital', 'Cosecha nocturna', 'Lluvia de frutas'],
    laberinto: ['Pasillos anchos', 'Túneles de cristal', 'Circuito de la nave', 'Red de conductos', 'Laberinto estelar'],
    pozo: ['Pozo de arena', 'Pozo de hielo', 'Pozo de cristal', 'Pozo de magma', 'Pozo estelar'],
    serpiente: ['Jardín tranquilo', 'Patio de piedras', 'Laberinto verde', 'Cueva de raíces', 'Selva estelar'],
    ave: ['Cielo abierto', 'Columnas de nubes', 'Torres de hielo', 'Cañón de fuego', 'Cinturón de asteroides'],
    sapo: ['Camino de tierra', 'Avenida', 'Río tranquilo', 'Río salvaje', 'Autopista estelar'],
    mosaicos: ['Mosaico sencillo', 'Giros', 'Espejos', 'Patrones dobles', 'Gran mosaico'],
  } as Record<IdJuego, string[]>,

  habilidades: {
    minero: 'Agudeza y contraste',
    saboteador: 'Agudeza con amontonamiento',
    torre: 'Visión binocular y planificación',
    meteoritos: 'Seguimiento y coordinación',
    cazador: 'Reacción y búsqueda con la mirada',
    rebote: 'Anticipar trayectorias',
    gabor: 'Sensibilidad al contraste',
    corte: 'Seguir objetos en movimiento',
    laberinto: 'Control fino con la mirada fija',
    pozo: 'Juntar lo que ve cada ojo',
    serpiente: 'Buscar con el ojo ambliope',
    ave: 'Guiar con los dos ojos',
    sapo: 'Seguir al personaje con el ojo ambliope',
    mosaicos: 'Detalle fino y lógica',
  } as Record<IdJuego, string>,

  /**
   * Cómo se juega. Se lee al empezar cada nivel de los juegos de los módulos;
   * va en líneas cortas para que quepa en una tablet en vertical.
   */
  ayudas: {
    cazador: ['Toca cada diana antes', 'de que se esconda.', 'Las bombas, no.'],
    rebote: ['Mueve la paleta', 'y devuelve la bola.'],
    gabor: ['Un parche tiene las rayas', 'giradas. ¡Encuéntralo!'],
    corte: ['Desliza el dedo sobre', 'las frutas para cortarlas.'],
    laberinto: ['Lleva el punto a la meta', 'sin tocar las paredes.'],
    pozo: ['Mueve y gira las piezas.', 'Completa filas enteras.'],
    serpiente: ['Guía a la serpiente', 'hasta cada manzana.'],
    ave: ['Toca para volar y', 'pasa por los huecos.'],
    sapo: ['Cruza hasta arriba.', 'Esquiva los coches y', 'súbete a los troncos.'],
    mosaicos: ['¿Qué pieza completa', 'el mosaico? Elígela abajo.'],
  } as Partial<Record<IdJuego, string[]>>,

  /** Teclas y gestos de cada juego. Se muestran antes de empezar a jugar. */
  controles: {
    titulo: 'Así se juega',
    nivel: (n: number) => `Nivel ${n}`,
    superado: (mundo: number, nivel: number) =>
      `Último nivel superado: mundo ${mundo}, nivel ${nivel}.`,
    paraSubir: `Supera el nivel con ${PARA_SUBIR} % de aciertos y la próxima vez subirás de nivel.`,
    conTeclado: 'Con el teclado',
    conElDedo: 'Con el dedo o el ratón',
    gemelas: 'Z hace lo mismo que Enter y X lo mismo que la barra espaciadora.',
    pausa: { teclas: ['Esc'], accion: 'Pausa' } as FilaDeTeclas,
    empezar: '¡A jugar!',
    atajo: 'También puedes empezar con Enter, Espacio, Z o X.',
    porJuego: {
      minero: {
        teclas: [
          { teclas: ['←', '→', '↑', '↓'], accion: 'Elegir un bloque' },
          { teclas: ['Enter', 'Z', 'Espacio', 'X'], accion: 'Picar el bloque elegido' },
        ],
        dedo: 'Toca el bloque donde brilla el cristal.',
      },
      saboteador: {
        teclas: [
          { teclas: ['←', '→', '↑', '↓'], accion: 'Elegir a un tripulante' },
          { teclas: ['Enter', 'Z', 'Espacio', 'X'], accion: 'Señalar al saboteador' },
        ],
        dedo: 'Toca al tripulante que tiene el visor distinto.',
      },
      torre: {
        teclas: [
          { teclas: ['←', '→'], accion: 'Mover la pieza' },
          { teclas: ['↑'], accion: 'Girar la pieza' },
          { teclas: ['↓'], accion: 'Bajar más rápido (mantenla pulsada)' },
          { teclas: ['Enter', 'Z', 'Espacio', 'X'], accion: 'Soltar la pieza de golpe' },
        ],
        dedo: 'Arrastra para mover, toca para girar y desliza hacia abajo para soltar. También hay botones.',
      },
      meteoritos: {
        teclas: [{ teclas: ['←', '→'], accion: 'Mover la nave' }],
        dedo: 'Arrastra la nave: atrapa las estrellas y esquiva las rocas.',
      },
      cazador: {
        teclas: [
          { teclas: ['←', '→', '↑', '↓'], accion: 'Mover la mira' },
          { teclas: ['Enter', 'Z', 'Espacio', 'X'], accion: 'Tocar la diana' },
        ],
        dedo: 'Toca cada diana antes de que se esconda. Las bombas, no.',
      },
      rebote: {
        teclas: [{ teclas: ['←', '→'], accion: 'Mover la paleta' }],
        dedo: 'Arrastra el dedo o mueve el ratón para llevar la paleta.',
      },
      gabor: {
        teclas: [
          { teclas: ['←', '→', '↑', '↓'], accion: 'Elegir un parche' },
          { teclas: ['Enter', 'Z', 'Espacio', 'X'], accion: 'Marcar el parche con las rayas giradas' },
        ],
        dedo: 'Toca el parche que tiene las rayas giradas.',
      },
      corte: {
        teclas: [{ teclas: ['←', '→', '↑', '↓'], accion: 'Mover la hoja' }],
        dedo: 'Desliza el dedo sobre las frutas para cortarlas.',
      },
      laberinto: {
        teclas: [{ teclas: ['←', '→', '↑', '↓'], accion: 'Mover el punto' }],
        dedo: 'Arrastra el punto hasta la meta sin tocar las paredes.',
      },
      pozo: {
        teclas: [
          { teclas: ['←', '→'], accion: 'Mover la pieza' },
          { teclas: ['↑'], accion: 'Girar la pieza' },
          { teclas: ['↓'], accion: 'Bajar más rápido (mantenla pulsada)' },
          { teclas: ['Enter', 'Z', 'Espacio', 'X'], accion: 'Soltar la pieza hasta el fondo' },
        ],
        dedo: 'Usa los botones de abajo: mover, girar y soltar.',
      },
      serpiente: {
        teclas: [{ teclas: ['←', '→', '↑', '↓'], accion: 'Cambiar de dirección' }],
        dedo: 'Desliza el dedo hacia donde quieras ir o usa la cruceta.',
      },
      ave: {
        teclas: [{ teclas: ['↑', 'Enter', 'Z', 'Espacio', 'X'], accion: 'Aletear' }],
        dedo: 'Toca la pantalla para aletear.',
      },
      sapo: {
        teclas: [{ teclas: ['←', '→', '↑', '↓'], accion: 'Saltar hacia ese lado' }],
        dedo: 'Toca para saltar hacia adelante o desliza hacia un lado.',
      },
      mosaicos: {
        teclas: [
          { teclas: ['1', '2', '3', '4'], accion: 'Elegir esa pieza' },
          { teclas: ['←', '→'], accion: 'Pasar de una pieza a otra' },
          { teclas: ['Enter', 'Z', 'Espacio', 'X'], accion: 'Elegir la pieza marcada' },
        ],
        dedo: 'Toca la pieza que completa el mosaico.',
      },
    } as Record<IdJuego, { teclas: FilaDeTeclas[]; dedo: string }>,
  },

  pozo: {
    hundido: '¡Más espacio!',
  },

  /** Reloj del día: siempre a la vista, cuenta solo el juego activo. */
  reloj: {
    hoy: 'Hoy',
    etiqueta: (hechos: string, meta: string) => `Tiempo de juego de hoy: ${hechos} de ${meta}`,
    metaCumplida: '¡Meta cumplida!',
  },

  /** Premio de tiempo de pantalla por cumplir la meta con buena precisión. */
  premioDePantalla: {
    titulo: (nombre: string) => `¡Felicidades, ${nombre}!`,
    logro: (minutos: number, precision: number) =>
      `Hoy jugaste ${minutos} minutos con ${precision} % de aciertos.`,
    captura: `Toma una captura de pantalla y muéstrala para reclamar ${config.premioDePantalla.minutosExtra} minutos extra de tiempo de pantalla.`,
    fecha: (dia: string) => `Fecha: ${diaLegible(dia)}`,
    listo: '¡Listo, ya la tomé!',
    verPremio: 'Ver mi premio de hoy',
  },

  base: {
    saludo: (nombre: string) => `¡Hola, ${nombre}! ¿Lista para la misión de hoy?`,
    saludoCorto: (nombre: string) => `Hola, ${nombre}`,
    empezarMision: 'Empezar misión',
    metaDeHoy: (hechos: number, meta: number) => `${hechos} de ${meta} min`,
    etiquetaMetaDeHoy: 'Meta de hoy',
    misionDelDia: 'Misión del día',
    tienda: 'Tienda',
    miAvatar: 'Mi avatar',
    insignias: 'Insignias',
    galeria: 'Galería',
    misRecords: 'Mis récords',
    panelDeAdultos: 'Panel de adultos',
    mundo: (n: number) => `Mundo ${n}`,
  },

  chequeo: {
    parche: (ojoTapado: Ojo) =>
      `¿Tienes el parche en el ojo ${nombreDeOjo(ojoTapado)} y tus lentes puestos?`,
    parcheListo: 'Sí, estoy lista',
    lentesOk: '¡Lentes listos! Tus dos ojos están en la misión.',
    distancia: 'Siéntate a un antebrazo de la pantalla.',
    recomendaciones: [
      'Brillo de la pantalla al máximo.',
      'Desactiva Night Shift, True Tone, filtro de luz azul o modo lectura: cambian los colores y rompen la separación entre ojos.',
      'Luz ambiente tenue y sin reflejos sobre la pantalla.',
    ],
  },

  figuras: {
    circulo: 'Círculo',
    triangulo: 'Triángulo',
    cuadrado: 'Cuadrado',
    rombo: 'Rombo',
    cruz: 'Cruz',
  } as Record<string, string>,

  calibracion: {
    pantalla: {
      titulo: 'Calibrar la pantalla',
      instruccion:
        'Pon una tarjeta bancaria o una credencial sobre la pantalla y ajusta el control hasta que el rectángulo mida exactamente lo mismo que la tarjeta.',
      control: 'Ajustar el tamaño',
      medida: (pxPorMm: number) => `${pxPorMm.toFixed(2)} píxeles por milímetro`,
      guardar: 'Coincide, guardar',
      sinCalibrar: 'Sin calibrar: las métricas son estimadas.',
      distancia: 'Distancia de juego (cm)',
      distanciaNota: 'Un antebrazo de la pantalla suele ser la distancia correcta.',
    },
    lentes: {
      titulo: 'Calibrar los lentes rojo/cian',
      ponerse: 'Ponte los lentes rojo/cian encima de tus lentes de graduación.',
      identificar: {
        titulo: 'Paso 1: identificar los lentes',
        instruccion: (ojoQueSeCierra: string) =>
          `Cierra el ojo ${ojoQueSeCierra}. ¿Qué cuadrado ves?`,
        rojo: 'El rojo',
        cian: 'El cian',
        ambos: 'Los dos igual de brillantes',
        revisar:
          'Revisa que tengas los lentes puestos y bien orientados, y vuelve a intentarlo.',
      },
      fugas: {
        titulo: 'Paso 2: quitar el efecto fantasma',
        instruccion: (ojoAbierto: string, ojoCerrado: string) =>
          `Deja abierto el ojo ${ojoAbierto} y cierra el ${ojoCerrado}. Baja el control hasta que el cuadrado desaparezca por completo.`,
        control: 'Intensidad',
        desaparecio: 'Ya no lo veo',
      },
      verificar: {
        titulo: 'Paso 3: comprobar',
        instruccion: 'Abre los dos ojos. ¿Ves las dos figuras?',
        siVeoLasDos: 'Sí, veo las dos',
        noVeoUna: 'No, falta una',
        listo: '¡Lentes listos!',
      },
      calidad:
        'La separación entre ojos quedó justa. Unos lentes rojo/cian de mejor calidad ayudarían bastante.',
      ultimaCalibracion: (fecha: string) => `Última calibración: ${fecha}`,
      recalibrar: 'Recalibrar lentes',
      cambioDeDispositivo:
        'La pantalla cambió desde la última calibración. Conviene recalibrar los lentes.',
    },
    escaner: {
      titulo: 'Escáner de lentes',
      instruccion: (ojoQueSeCierra: string) => `Cierra el ojo ${ojoQueSeCierra}. ¿Qué ves?`,
      lasDos: 'Las dos',
      correcto: '¡Listo! Empezamos.',
      alReves: '¿Tienes los lentes al revés?',
      revisar: 'Revisa que tengas los lentes rojo/cian puestos.',
      reintentar: 'Intentar otra vez',
    },
    patron: {
      titulo: 'Patrón de verificación',
      explicacion:
        'Cierra un ojo y luego el otro: cada figura debe verse solo con el ojo que le toca, y la gris con los dos.',
      ojoAmbliope: (ojo: string) => `Ojo ${ojo} (ambliope)`,
      ojoDominante: (ojo: string) => `Ojo ${ojo} (dominante)`,
      ambos: 'Ambos ojos',
    },
  },

  juego: {
    aciertos: ['¡Bien visto!', '¡Cristal encontrado!', '¡Saboteador atrapado!', '¡Pieza perfecta!'],
    fallos: ['¡Casi! Estaba aquí.', 'Buen intento. ¡La próxima es tuya!'],
    record: '¡Nuevo récord! Encontraste el cristal más pequeño hasta ahora.',
    pausa: 'Pausa',
    seguirJugando: 'Seguir jugando',
    molestiaVista: 'Me molesta la vista',
    siguienteNivel: 'Siguiente nivel',
    repetir: 'Repetir',
  },

  sesion: {
    limiteAlcanzado: '¡Misión cumplida por hoy! Vuelve mañana por más cristales.',
    extenderTitulo: 'Minutos extra',
    extender: (min: number) => `Añadir ${min} min`,
    resumen: {
      titulo: 'Resumen de la misión',
      minutos: 'Minutos',
      monedas: 'Monedas',
      estrellas: 'Estrellas',
      records: 'Récords',
      mision: 'Misión del día',
    },
  },

  depuracion: {
    titulo: 'Modo desarrollo',
    fps: 'fps',
    escaleras: 'Escaleras',
    valor: 'valor',
    umbral: 'umbral',
    inversiones: 'inversiones',
    ensayos: 'ensayos',
    capas: 'Colores de capa',
    ojoAmbliope: 'Ojo ambliope',
    ojoDominante: 'Ojo dominante',
    ambos: 'Ambos ojos',
    fondo: 'Fondo',
    tiempo: 'Tiempo',
    contando: 'contando',
    detenido: 'detenido',
    minutosActivos: 'min activos',
    diaSiguiente: 'Simular día siguiente',
    motivos: {
      enPausa: 'en pausa',
      pestanaOculta: 'pestaña oculta',
      sinInteraccion: 'sin interacción',
      sinJuego: 'sin juego en curso',
    } as Record<string, string>,
    balance: 'Contraste del ojo dominante',
  },

  nombresDeFigura: {
    escalera: 'Escalera',
    piramide: 'Pirámide',
    torre: 'Torre',
    copa: 'Copa',
    muralla: 'Muralla',
    castillo: 'Castillo',
    cohete: 'Cohete',
    pino: 'Pino',
    puente: 'Puente',
    antena: 'Antena',
    ciudad: 'Ciudad',
    montana: 'Montaña',
    faro: 'Faro',
    corona: 'Corona',
    cascada: 'Cascada',
    robot: 'Robot gigante',
    castillo_grande: 'Castillo grande',
    puerto_espacial: 'Puerto espacial',
    dragon: 'Dragón de bloques',
    doble_torre: 'Doble torre',
    cohete_lunar: 'Cohete lunar',
    estacion_orbital: 'Estación orbital',
    antena_larga: 'Antena larga',
    cometa: 'Cometa',
    cristal_gigante: 'Cristal gigante',
  } as Record<string, string>,

  galeria: {
    titulo: 'Galería de figuras',
    vacia: 'Todavía no has construido ninguna figura. ¡La Torre de bloques te espera!',
    construidas: (hechas: number, total: number) => `${hechas} de ${total} construidas`,
    porConstruir: 'Por construir',
  },

  torre: {
    figuraCompleta: (nombre: string) => `¡${nombre} terminada!`,
    izquierda: 'Mover a la izquierda',
    girar: 'Girar la pieza',
    derecha: 'Mover a la derecha',
    bajar: 'Bajar rápido',
  },

  finDeNivel: {
    titulo: '¡Nivel completado!',
    superado: '¡Nivel superado!',
    tituloAMedias: '¡Hasta aquí llegó la torre!',
    objetivo: (hecho: number, total: number) => `Colocaste ${hecho} de ${total} bloques`,
    figuraAMedias:
      'Un hueco quedó tapado y ya no se podía rellenar. Todo lo que ganaste se queda contigo, y esta figura te espera para otro intento.',
    intentarla: 'Intentarla otra vez',
    estrellas: (n: number) => `${n} de 3 estrellas`,
    precision: (pct: number) => `${Math.round(pct)} % de aciertos`,
    monedasGanadas: (n: number) => `+${n} monedas`,
    nuevoRecord: '¡Nuevo récord!',
    siguienteNivel: 'Siguiente nivel',
    intentarOtraVez: 'Intentar otra vez',
    seguir: 'Seguir jugando',
    proximo: (mundo: number, nivel: number) => `Subes al mundo ${mundo}, nivel ${nivel}.`,
    paraSubir: `Para subir de nivel hace falta ${PARA_SUBIR} % de aciertos. ¡Tú puedes!`,
    ultimoNivel: '¡Superaste los cinco mundos! Puedes seguir jugando el último nivel.',
    mundoDesbloqueado: (nombre: string) => `¡Se abrió ${nombre}!`,
  },

  elegirJuego: {
    titulo: '¿Con qué empezamos?',
  },

  pausa: {
    titulo: 'Pausa',
    seguir: 'Seguir jugando',
    molestia: 'Me molesta la vista',
    salir: 'Volver a la base',
    molestiaRegistrada: 'Listo, lo anotamos. Descansa la vista.',
  },

  descanso: {
    titulo: 'Hora de descansar la vista',
    texto: 'Hora de descansar la vista: mira algo lejano por la ventana.',
    saltar: 'Seguir jugando',
    segundos: (s: number) => `${s} s`,
  },

  limiteDiario: '¡Misión cumplida por hoy! Vuelve mañana por más cristales.',

  paleta: {
    cieloProfundo: 'Cielo profundo',
    nebulosa: 'Nebulosa',
    cristal: 'Cristal',
    ambarEstelar: 'Ámbar estelar',
    musgoPixel: 'Musgo pixel',
    polvoLunar: 'Polvo lunar',
  },

  comparacionesDeRecord: {
    granoDeArena: '¡Del tamaño de un grano de arena!',
    semillaDeChia: '¡Como una semilla de chía!',
    hormiga: '¡Como una hormiga!',
    lenteja: '¡Como una lenteja!',
    botonDeCamisa: '¡Como un botón de camisa!',
    moneda: '¡Como una moneda!',
  } as Record<string, string>,

  asistente: {
    titulo: 'Preparar Misión Pixel',
    paso: (n: number, total: number) => `Paso ${n} de ${total}`,
    bienvenida: {
      titulo: '¡Bienvenidos a Misión Pixel!',
      texto:
        'Un juego para acompañar el tratamiento del oftalmólogo. Primero lo preparamos entre los dos: ' +
        'unos datos, la pantalla y los lentes. Toma un par de minutos.',
    },
    pin: {
      titulo: 'PIN de adultos',
      explicacion:
        'Cuatro dígitos para entrar al panel de adultos. Es un candado para que la jugadora no cambie la configuración.',
      escribir: 'Escribe el PIN',
      repetir: 'Escríbelo otra vez',
      noCoincide: 'Los dos PIN no coinciden.',
      formato: 'El PIN son 4 dígitos.',
    },
    jugadora: {
      titulo: 'La jugadora',
      nombre: 'Nombre',
      ojoAmbliope: '¿Cuál es el ojo ambliope?',
      nota: 'Todo el juego se ajusta a partir de este dato.',
    },
    pantalla: {
      titulo: 'Calibrar la pantalla',
      explicacion:
        'Con una tarjeta sobre la pantalla medimos cuántos píxeles son un milímetro. Sirve para que las métricas sean comparables entre sesiones y dispositivos.',
      recomendado: 'Recomendado. También se puede hacer después desde el panel de adultos.',
    },
    lentes: {
      titulo: 'Lentes rojo/cian',
      pregunta: '¿Tienen lentes rojo/cian?',
      tieneSi: 'Sí, los tenemos',
      tieneNo: 'Todavía no',
      sinLentes:
        'Sin problema: se juega en modo parche. El modo lentes queda bloqueado hasta calibrarlos.',
      nota: 'Van encima de los lentes de graduación (clip-on o sobrepuestos).',
    },
    tiempos: {
      titulo: 'Tiempos de juego',
      metaDiaria: 'Meta diaria (min)',
      maxDiario: 'Máximo diario (min)',
      nota: 'Ajusta estos tiempos según lo que indique el oftalmólogo.',
      error: 'El máximo diario no puede ser menor que la meta diaria.',
    },
    avatar: {
      titulo: 'Tu pixelnauta',
      explicacion: 'Elige tu casco y el color del traje. Después podrás comprar más en la tienda.',
      casco: 'Casco',
      traje: 'Color del traje',
    },
    terminar: 'Ir a la base',
  },

  articulos: {
    'casco-clasico': 'Casco clásico',
    'casco-antena': 'Casco con antena',
    'casco-gato': 'Orejas de gato',
    'casco-dragon': 'Cuernos de dragón',
    'casco-burbuja': 'Burbuja de cristal',
    'casco-corona': 'Corona estelar',
    'casco-visera': 'Casco con visera',
    'casco-aletas': 'Casco con aletas',
    'casco-estrella': 'Casco estrella',
    'traje-cristal': 'Traje cristal',
    'traje-ambar': 'Traje ámbar',
    'traje-musgo': 'Traje musgo',
    'traje-nebulosa': 'Traje nebulosa',
    'traje-coral': 'Traje coral',
    'traje-cielo': 'Traje cielo',
    'traje-lila': 'Traje lila',
    'traje-lunar': 'Traje lunar',
    'traje-galaxia': 'Traje galaxia',
    'traje-lava': 'Traje lava',
    'traje-arcoiris': 'Traje arcoíris pixel',
    'traje-menta': 'Traje menta',
    'traje-fresa': 'Traje fresa',
    'traje-cobre': 'Traje cobre',
    'visor-cristal': 'Visor cristal',
    'visor-ambar': 'Visor ámbar',
    'visor-musgo': 'Visor musgo',
    'visor-coral': 'Visor coral',
    'visor-cielo': 'Visor cielo',
    'visor-espejo': 'Visor espejo',
    'visor-lila': 'Visor lila',
    'visor-lunar': 'Visor lunar',
    'accesorio-mochila': 'Mochila cohete',
    'accesorio-bufanda': 'Bufanda',
    'accesorio-capa': 'Capa',
    'accesorio-alas': 'Alas pixel',
    'accesorio-antenas': 'Antenas',
    'accesorio-bufanda-larga': 'Bufanda larga',
    'accesorio-jetpack': 'Mochila propulsora',
    'mascota-gato': 'Gato pixel',
    'mascota-zorro': 'Zorro',
    'mascota-robotito': 'Robotito',
    'mascota-pulpo': 'Pulpo espacial',
    'mascota-ajolote': 'Ajolote',
    'mascota-dragon': 'Dragón bebé',
    'mascota-buho': 'Búho',
    'mascota-tortuga': 'Tortuga',
    'mascota-conejo': 'Conejo lunar',
    'mascota-medusa': 'Medusa flotante',
    'mascota-fenix': 'Fénix pixel',
    'nave-exploradora': 'Nave exploradora',
    'nave-cometa': 'Nave cometa',
    'nave-ballena': 'Ballena estelar',
    'nave-castillo': 'Castillo volador',
    'nave-flecha': 'Nave flecha',
    'nave-orca': 'Orca estelar',
    'estela-chispas': 'Estela de chispas',
    'estela-burbujas': 'Estela de burbujas',
    'estela-corazones': 'Estela de corazones',
    'estela-estrellas': 'Estela de estrellas',
    'estela-arcoiris': 'Estela arcoíris',
    'estela-anillos': 'Estela de anillos',
    'estela-rayos': 'Estela de rayos',
    'pico-basico': 'Pico básico',
    'pico-dorado': 'Pico dorado',
    'pico-hielo': 'Pico de hielo',
    'pico-laser': 'Pico láser',
    'pico-cristal': 'Pico de cristal',
    'pico-doble': 'Pico doble',
    'fondo-base-lunar': 'Base lunar',
    'fondo-jardin': 'Jardín de bloques',
    'fondo-nebulosa': 'Nebulosa',
    'fondo-taller': 'Taller de la nave',
    'fondo-hielo': 'Cueva de hielo',
  } as Record<string, string>,

  categorias: {
    cascos: 'Cascos',
    trajes: 'Trajes',
    visores: 'Visores',
    accesorios: 'Accesorios',
    mascotas: 'Mascotas',
    naves: 'Naves',
    estelas: 'Estelas',
    picos: 'Picos',
    fondos: 'Fondos de la base',
  } as Record<string, string>,

  rarezas: {
    gratis: 'Gratis',
    comun: 'Común',
    raro: 'Raro',
    legendario: 'Legendario',
  } as Record<string, string>,

  tienda: {
    titulo: 'Tienda',
    comprar: 'Comprar',
    equipar: 'Equipar',
    equipado: 'Equipado',
    enUso: 'En uso',
    sinMonedas: 'Te faltan monedas. ¡Sigue jugando!',
    sinCristales: 'Te faltan cristales. Cumple la meta diaria para ganarlos.',
    vistaPrevia: 'Así te verías',
  },

  avatar: {
    titulo: 'Mi avatar',
    explicacion: 'Elige lo que llevas puesto. Todo lo que compres aparece aquí.',
  },

  insignias: {
    primer_cristal: { nombre: 'Primer cristal', criterio: 'Tu primer acierto en Minero de cristales' },
    ojo_de_halcon: { nombre: 'Ojo de halcón', criterio: 'Encontrar objetos cada vez más pequeños' },
    detective: { nombre: 'Detective espacial', criterio: 'Atrapar 50 saboteadores' },
    arquitecta: { nombre: 'Arquitecta', criterio: 'Completar 10 figuras' },
    piloto: { nombre: 'Piloto estelar', criterio: 'Atrapar 500 estrellas de energía' },
    constancia: { nombre: 'Constancia', criterio: 'Rachas de 3, 7, 14 y 30 días' },
    dos_ojos: { nombre: 'Equipo de dos ojos', criterio: 'Subir tres veces el contraste del otro ojo' },
    balance: { nombre: 'Balance perfecto', criterio: 'Llegar al contraste máximo con los dos ojos' },
    perseverante: { nombre: 'Perseverante', criterio: 'Terminar un nivel después de tres fallos seguidos' },
    coleccionista: { nombre: 'Coleccionista', criterio: 'Tener 10 artículos' },
    exploradora: { nombre: 'Exploradora', criterio: 'Jugar cinco minijuegos distintos en un mismo día' },
  } as Record<string, { nombre: string; criterio: string }>,

  pantallaDeInsignias: {
    titulo: 'Insignias',
    conseguidas: (hechas: number, total: number) => `${hechas} de ${total}`,
    nivel: (n: number, total: number) => `Nivel ${n} de ${total}`,
    bloqueada: 'Todavía no',
  },

  records: {
    titulo: 'Mis récords',
    vacio: 'Todavía no hay récords. ¡Cada partida cuenta!',
    masPequeno: 'Lo más pequeño que has encontrado',
    sinCalibrar: 'Sin calibrar: la medida en milímetros es estimada.',
    enPx: (px: number) => `${px.toFixed(1)} px`,
    enMm: (mm: number) => `${mm.toFixed(2)} mm`,
    enArcmin: (arcmin: number) => `${arcmin.toFixed(1)} minutos de arco`,
  },

  misiones: {
    minutos: (n: number) => `Juega ${n} minutos`,
    cristales: (n: number) => `Encuentra ${n} cristales`,
    saboteadores: (n: number) => `Atrapa ${n} saboteadores`,
    figuras: (n: number) => `Construye ${n} ${n === 1 ? 'figura' : 'figuras'}`,
    estrellasDeEnergia: (n: number) => `Atrapa ${n} estrellas de energía`,
    estrellasDeNivel: (n: number) => `Gana ${n} estrellas de nivel`,
    juegosDistintos: (n: number) => `Juega ${n} minijuegos distintos`,
  } as Record<string, (n: number) => string>,

  cofre: {
    titulo: '¡Cofre semanal!',
    texto: 'Cumpliste la meta cinco días esta semana.',
    abrir: 'Abrir el cofre',
  },

  insigniaNueva: (nombre: string) => `¡Insignia nueva: ${nombre}!`,

  parametros: {
    tamano: 'Tamaño del objetivo',
    contraste: 'Contraste del objetivo',
    diametro: 'Diámetro del visor',
  } as Record<string, string>,

  /** 'diametro:1.2' → 'Diámetro del visor (separación 1.2×)'. */
  nombreDeParametro: (clave: string): string => {
    const [base, espaciado] = clave.split(':');
    const nombre = es.parametros[base] ?? base;
    return espaciado ? `${nombre} (separación ${espaciado}×)` : nombre;
  },

  adultos: {
    titulo: 'Panel de adultos',
    pin: 'PIN de adultos',
    entrar: 'Entrar',
    pinIncorrecto: 'Ese PIN no es correcto.',
    olvide: 'Olvidé mi PIN',
    preguntaDeAdulto: (a: number, b: number) => `¿Cuánto es ${a} × ${b}?`,
    respuesta: 'Respuesta',
    nuevoPin: 'PIN nuevo',
    respuestaIncorrecta: 'Esa no es la respuesta. Vuelve a intentarlo.',
    salir: 'Salir del panel',

    secciones: {
      resumen: 'Resumen',
      graficas: 'Gráficas',
      configuracion: 'Configuración',
      calibraciones: 'Calibraciones',
      eventos: 'Eventos',
      notas: 'Notas',
      datos: 'Datos',
    } as Record<string, string>,

    calendario: 'Calendario de minutos por día',
    diasDeSemana: ['L', 'M', 'X', 'J', 'V', 'S', 'D'],
    leyendaCalendario: 'Ámbar: parche. Cristal: lentes. Borde verde: meta cumplida.',
    minutosHoy: 'Hoy',
    minutosSemana: 'Esta semana',
    minutosMes: 'Este mes',
    porModo: (parche: number, lentes: number) =>
      `${Math.round(parche)} min parche · ${Math.round(lentes)} min lentes`,
    constanciaReal: 'Constancia real (sin protectores)',
    constanciaTexto: (dias: number, de: number) => `${dias} de ${de} días`,
    rachaActual: 'Racha actual',
    mejorRacha: 'Mejor racha',

    sinDatos: 'Todavía no hay datos suficientes para esta gráfica.',
    mejora: (pct: number) =>
      `${pct >= 0 ? '+' : ''}${(pct * 100).toFixed(0)} % frente a la primera semana`,
    mejoraNota: 'Más bajo es mejor: mide el objeto más pequeño que logra encontrar.',

    comoLeer: {
      umbralTamano:
        `Umbral de tamaño: el objeto más pequeño que logra encontrar con cerca de ${META_DE_ACIERTOS} % de aciertos. Más bajo es mejor.`,
      umbralContraste:
        'Umbral de contraste: la diferencia de brillo más pequeña que logra distinguir. Más bajo es mejor.',
      balance:
        'Contraste del ojo dominante: cuánta señal recibe el ojo que ve bien. Sube cuando el otro ojo aguanta el reto y baja si le cuesta demasiado.',
      precision:
        `Precisión: porcentaje de aciertos. El juego la mantiene cerca del ${META_DE_ACIERTOS} %, así que casi no cambia; sirve para detectar días raros.`,
      tiempo:
        'Tiempo de reacción: lo que tarda en responder. Bajar es señal de soltura, no de mejor visión.',
    } as Record<string, string>,

    graficaDe: (juego: string, parametro: string) => `${juego} · ${parametro}`,
    medianaMovil: 'Línea gruesa: mediana móvil de 7 días.',

    configuracion: {
      nombre: 'Nombre de la jugadora',
      ojoAmbliope: 'Ojo ambliope',
      metaDiaria: 'Meta diaria (min)',
      maxDiario: 'Máximo diario (min)',
      descansoCada: 'Descanso cada (min)',
      modosPermitidos: 'Modos permitidos',
      modoFijo: 'Modo fijo de hoy',
      sinModoFijo: 'Que elija ella',
      distancia: 'Distancia de juego (cm)',
      sonido: 'Sonido',
      musica: 'Música',
      volumen: 'Volumen',
      reducirMovimiento: 'Reducir movimiento',
      balanceAutomatico: 'Ajustar el contraste automáticamente',
      balanceManual: 'Contraste del ojo dominante',
      historialDeBalance: 'Historial del contraste',
      extender: (min: number) => `Dar ${min} minutos extra hoy`,
      extendido: (min: number) => `${min} min extra concedidos hoy`,
      guardado: 'Guardado.',
    },

    calibraciones: {
      pantalla: 'Calibración de pantalla',
      lentes: 'Calibración de lentes',
      nunca: 'Sin calibrar',
      hecha: (fecha: string) => `Última calibración: ${fecha}`,
      calibrarPantalla: 'Calibrar pantalla',
      calibrarLentes: 'Calibrar lentes',
      intensidades: (rojo: number, cian: number) => `Rojo máx. ${rojo} · Cian máx. ${cian}`,
    },

    eventos: {
      titulo: 'Veces que tocó "Me molesta la vista"',
      vacio: 'Ninguna. ',
      fila: (fecha: string, hora: string, modo: string, juego: string) =>
        `${fecha} ${hora} · ${modo} · ${juego}`,
      sinJuego: 'fuera de un minijuego',
    },

    notas: {
      titulo: 'Notas',
      explicacion:
        'Indicaciones del oftalmólogo, cambios de graduación o lo que convenga recordar. Aparecen como marcas en las gráficas.',
      nueva: 'Nota nueva',
      agregar: 'Agregar nota',
      borrar: 'Borrar',
      vacio: 'Todavía no hay notas.',
    },

    datos: {
      titulo: 'Datos',
      exportarCSV: 'Exportar CSV (para consulta)',
      exportarJSON: 'Exportar respaldo JSON',
      importarJSON: 'Importar respaldo JSON',
      importado: 'Respaldo importado.',
      errorAlImportar: 'Ese archivo no es un respaldo válido.',
      borrarTodo: 'Borrar todos los datos',
      confirmar1: '¿Seguro? Se borrará todo el progreso de este dispositivo.',
      confirmar2: 'Esto no se puede deshacer. ¿Borrar de verdad?',
      problemaDeGuardado:
        'El navegador no pudo guardar: puede que no quede espacio. Exporta un respaldo y libera espacio.',
      privacidad: 'Los datos viven solo en este dispositivo. Sin cuentas, sin analítica, sin envíos.',
    },
  },

  nombreDeModo: (modo: Modo): string => (modo === 'parche' ? 'Parche' : 'Lentes rojo/cian'),
} as const;

export type Textos = typeof es;
