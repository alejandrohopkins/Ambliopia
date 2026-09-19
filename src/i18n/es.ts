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

  nombreDeModo: (modo: Modo): string => (modo === 'parche' ? 'Parche' : 'Lentes rojo/cian'),
} as const;

export type Textos = typeof es;
