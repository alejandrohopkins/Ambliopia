/**
 * Día "de hoy" según el juego. En producción es siempre la fecha local del
 * dispositivo; el desfase solo se mueve desde el overlay de desarrollo
 * (?debug=1) para poder probar racha, cofre y balance sin esperar a mañana.
 */
import { diaISO, sumarDias } from '../engine/fechas';
import { modoDesarrollo } from './navegacion';

let desfase = 0;

export function hoyDelJuego(): string {
  return desfase === 0 ? diaISO() : sumarDias(diaISO(), desfase);
}

export function avanzarUnDiaDeDesarrollo(): boolean {
  if (!modoDesarrollo()) return false;
  desfase += 1;
  return true;
}

export function desfaseDeDesarrollo(): number {
  return desfase;
}
