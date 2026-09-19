/**
 * Todos los textos visibles de Misión Pixel.
 * Regla crítica: ningún componente escribe texto en duro.
 * Los textos para la jugadora van en femenino.
 * Nada de "derecho"/"izquierdo" en duro: se derivan del ojo ambliope.
 */
import type { Ojo, Modo, IdJuego } from '../config';

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
  } as Record<IdJuego, string>,

  mundos: {
    minero: ['Cueva de piedra', 'Mina de ámbar', 'Caverna de hielo', 'Núcleo de lava', 'Geoda gigante'],
    saboteador: ['Nave Alfa', 'Estación lunar', 'Base en Marte', 'Anillos de Saturno', 'Nebulosa misteriosa'],
    torre: ['Pradera de bloques', 'Ciudad flotante', 'Luna', 'Planeta rojo', 'Estación orbital'],
    meteoritos: ['Órbita baja', 'Cinturón de asteroides', 'Lluvia de cometas', 'Viento solar', 'Galaxia lejana'],
  } as Record<IdJuego, string[]>,

  habilidades: {
    minero: 'Agudeza y contraste',
    saboteador: 'Agudeza con amontonamiento',
    torre: 'Visión binocular y planificación',
    meteoritos: 'Seguimiento y coordinación',
  } as Record<IdJuego, string>,

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
    'traje-cristal': 'Traje cristal',
    'traje-ambar': 'Traje ámbar',
    'nave-exploradora': 'Nave exploradora',
    'estela-chispas': 'Estela de chispas',
    'pico-basico': 'Pico básico',
    'fondo-base-lunar': 'Base lunar',
  } as Record<string, string>,

  nombreDeModo: (modo: Modo): string => (modo === 'parche' ? 'Parche' : 'Lentes rojo/cian'),
} as const;

export type Textos = typeof es;
