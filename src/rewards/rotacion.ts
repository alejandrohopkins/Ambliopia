/**
 * Rotación semanal. Cada juego del modo pide al menos
 * `config.rotacion.intentosPorSemana` intentos —niveles terminados— entre el
 * lunes y el domingo. Mientras falten más de `juegosQuePuedeDejar` juegos, los
 * que ya tienen sus intentos descansan (se bloquean): así se juega de todo.
 * Esos últimos juegos puede dejarlos para otro día, menos el último día de la
 * semana, que toca completarlos. El juego de la misión del día no descansa
 * hasta cumplirla, para que la misión siempre se pueda hacer.
 */
import { config, type IdJuego } from '../config';
import { diasDeLaSemana } from '../engine/fechas';
import type { Estado, TipoDeMision } from '../storage/esquema';

const JUEGO_DE_MISION: Partial<Record<TipoDeMision, IdJuego>> = {
  cristales: 'minero',
  saboteadores: 'saboteador',
  figuras: 'torre',
  estrellasDeEnergia: 'meteoritos',
};

/** Niveles terminados en cada juego durante la semana del día dado. */
export function intentosDeLaSemana(estado: Estado, dia: string): Partial<Record<IdJuego, number>> {
  const semana = new Set(diasDeLaSemana(dia));
  const intentos: Partial<Record<IdJuego, number>> = {};
  for (const sesion of estado.sesiones) {
    if (!semana.has(sesion.fecha)) continue;
    for (const [juego, resumen] of Object.entries(sesion.porJuego)) {
      const id = juego as IdJuego;
      intentos[id] = (intentos[id] ?? 0) + (resumen?.niveles ?? 0);
    }
  }
  return intentos;
}

export function esUltimoDiaDeLaSemana(dia: string): boolean {
  return diasDeLaSemana(dia).at(-1) === dia;
}

export interface Rotacion {
  intentos: Partial<Record<IdJuego, number>>;
  /** Juegos a los que aún les faltan intentos esta semana. */
  pendientes: IdJuego[];
  /** Juegos que descansan hoy. */
  bloqueados: IdJuego[];
  /** Cuántos juegos pendientes puede dejar para otro día hoy. */
  puedeDejar: number;
  ultimoDia: boolean;
}

/** Cómo va la rotación de la semana para los juegos de un modo. */
export function rotacionDeLaSemana(estado: Estado, dia: string, juegos: IdJuego[]): Rotacion {
  const intentos = intentosDeLaSemana(estado, dia);
  const cumplido = (juego: IdJuego) =>
    (intentos[juego] ?? 0) >= config.rotacion.intentosPorSemana;
  const pendientes = juegos.filter((juego) => !cumplido(juego));
  const ultimoDia = esUltimoDiaDeLaSemana(dia);
  const puedeDejar = ultimoDia ? 0 : config.rotacion.juegosQuePuedeDejar;

  let bloqueados: IdJuego[] = [];
  if (pendientes.length > puedeDejar) {
    const mision = estado.misiones[dia];
    const deLaMision = mision && !mision.completada ? JUEGO_DE_MISION[mision.tipo] : undefined;
    bloqueados = juegos.filter((juego) => cumplido(juego) && juego !== deLaMision);
  }
  return { intentos, pendientes, bloqueados, puedeDejar, ultimoDia };
}

/** Qué contarle a la jugadora sobre la semana. */
export type AvisoDeRotacion = 'completa' | 'reparte' | 'puedeDejar' | 'ultimoDia';

export function avisoDeRotacion(rotacion: Rotacion): AvisoDeRotacion {
  if (rotacion.pendientes.length === 0) return 'completa';
  if (rotacion.ultimoDia) return 'ultimoDia';
  if (rotacion.pendientes.length <= rotacion.puedeDejar) return 'puedeDejar';
  return 'reparte';
}

/** Los juegos de la lista que descansan hoy. */
export function juegosBloqueados(estado: Estado, dia: string, juegos: IdJuego[]): IdJuego[] {
  return rotacionDeLaSemana(estado, dia, juegos).bloqueados;
}
