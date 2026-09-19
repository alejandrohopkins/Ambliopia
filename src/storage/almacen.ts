/**
 * Guardado en localStorage. Sin backend, sin analítica, sin peticiones externas:
 * los datos existen solo en este dispositivo.
 */
import { config } from '../config';
import { estadoInicial, type Estado } from './esquema';
import { migrar } from './migraciones';

export interface ResultadoDeGuardado {
  ok: boolean;
  /** 'cuota' cuando el navegador no tiene espacio; 'sinAlmacen' si no hay localStorage. */
  motivo?: 'cuota' | 'sinAlmacen' | 'desconocido';
}

function almacen(): Storage | null {
  try {
    return globalThis.localStorage ?? null;
  } catch {
    return null;
  }
}

export function cargar(): Estado {
  const ls = almacen();
  if (!ls) return estadoInicial();
  try {
    const crudo = ls.getItem(config.almacenamiento.clave);
    if (!crudo) return estadoInicial();
    return migrar(JSON.parse(crudo));
  } catch {
    // Datos corruptos: arrancar limpio antes que dejar la app inutilizable.
    return estadoInicial();
  }
}

export function guardar(estado: Estado): ResultadoDeGuardado {
  const ls = almacen();
  if (!ls) return { ok: false, motivo: 'sinAlmacen' };
  try {
    ls.setItem(config.almacenamiento.clave, JSON.stringify(estado));
    return { ok: true };
  } catch (error) {
    const esCuota =
      error instanceof DOMException &&
      (error.name === 'QuotaExceededError' || error.name === 'NS_ERROR_DOM_QUOTA_REACHED');
    return { ok: false, motivo: esCuota ? 'cuota' : 'desconocido' };
  }
}

export function borrarTodo(): void {
  almacen()?.removeItem(config.almacenamiento.clave);
}

/** Respaldo completo en JSON legible. */
export function exportarJSON(estado: Estado): string {
  return JSON.stringify(estado, null, 2);
}

export interface ResultadoDeImportacion {
  ok: boolean;
  estado?: Estado;
  error?: string;
}

/** Importa un respaldo, migrándolo si viene de una versión anterior. */
export function importarJSON(texto: string): ResultadoDeImportacion {
  let datos: unknown;
  try {
    datos = JSON.parse(texto);
  } catch {
    return { ok: false, error: 'json' };
  }
  if (typeof datos !== 'object' || datos === null || Array.isArray(datos)) {
    return { ok: false, error: 'forma' };
  }
  return { ok: true, estado: migrar(datos) };
}

export function nombreDeArchivo(nombre: string, dia: string, extension: string): string {
  const limpio = nombre
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .toLowerCase()
    .replace(/^-|-$/g, '');
  return `mision-pixel-${limpio || 'jugadora'}-${dia}.${extension}`;
}
