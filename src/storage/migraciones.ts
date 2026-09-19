/**
 * Migraciones del esquema guardado. Nunca se pierden datos al actualizar la app:
 * cada versión antigua se transforma hasta la actual rellenando lo que falte.
 */
import { config } from '../config';
import { estadoInicial, JUEGOS, type Estado } from './esquema';

type Datos = Record<string, unknown>;

/** Pasos de migración, de la versión N a la N+1. */
const PASOS: Record<number, (datos: Datos) => Datos> = {
  // Antes de que existiera el campo `version` (datos sueltos de pruebas tempranas).
  0: (datos) => ({ ...datos, version: 1 }),
};

function esObjeto(valor: unknown): valor is Datos {
  return typeof valor === 'object' && valor !== null && !Array.isArray(valor);
}

/**
 * Completa lo que falte tomando el estado inicial como plantilla.
 * Fusiona un nivel de profundidad en los objetos de configuración conocidos.
 */
function completar(datos: Datos): Estado {
  const base = estadoInicial();
  const salida: Estado = {
    ...base,
    ...(datos as Partial<Estado>),
    version: config.almacenamiento.version,
    perfil: { ...base.perfil, ...(esObjeto(datos.perfil) ? datos.perfil : {}) },
    ajustes: { ...base.ajustes, ...(esObjeto(datos.ajustes) ? datos.ajustes : {}) },
    calibracion: {
      ...base.calibracion,
      ...(esObjeto(datos.calibracion) ? datos.calibracion : {}),
      lentes: {
        ...base.calibracion.lentes,
        ...(esObjeto(datos.calibracion) && esObjeto(datos.calibracion.lentes)
          ? datos.calibracion.lentes
          : {}),
      },
    },
    balance: { ...base.balance, ...(esObjeto(datos.balance) ? datos.balance : {}) },
    economia: { ...base.economia, ...(esObjeto(datos.economia) ? datos.economia : {}) },
    racha: { ...base.racha, ...(esObjeto(datos.racha) ? datos.racha : {}) },
    escaleras: esObjeto(datos.escaleras) ? (datos.escaleras as Estado['escaleras']) : {},
    contadores: { ...base.contadores, ...(esObjeto(datos.contadores) ? datos.contadores : {}) },
    progreso: { ...base.progreso },
  };

  // El progreso puede venir incompleto si se añadió un juego nuevo.
  if (esObjeto(datos.progreso)) {
    for (const juego of JUEGOS) {
      const guardado = (datos.progreso as Datos)[juego];
      if (esObjeto(guardado)) {
        salida.progreso[juego] = {
          ...base.progreso[juego],
          ...(guardado as unknown as Estado['progreso'][typeof juego]),
        };
      }
    }
  }

  // Colecciones: si vienen con el tipo equivocado, se reemplazan por vacías.
  if (!Array.isArray(salida.sesiones)) salida.sesiones = [];
  if (!Array.isArray(salida.galeria)) salida.galeria = [];
  if (!Array.isArray(salida.eventos)) salida.eventos = [];
  if (!Array.isArray(salida.notas)) salida.notas = [];
  if (!Array.isArray(salida.balance.historial)) salida.balance.historial = [];
  if (!esObjeto(salida.insignias)) salida.insignias = {};
  if (!esObjeto(salida.misiones)) salida.misiones = {};
  if (!esObjeto(salida.cofres)) salida.cofres = {};
  if (!esObjeto(salida.records)) salida.records = {};

  return salida;
}

/** Lleva cualquier estado guardado hasta la versión actual. */
export function migrar(datos: unknown): Estado {
  if (!esObjeto(datos)) return estadoInicial();

  let actual: Datos = { ...datos };
  let version = typeof actual.version === 'number' ? actual.version : 0;

  while (version < config.almacenamiento.version) {
    const paso = PASOS[version];
    if (!paso) break;
    actual = paso(actual);
    version = typeof actual.version === 'number' ? actual.version : version + 1;
  }

  return completar(actual);
}
