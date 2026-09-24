/**
 * Rotación semanal. Cada juego del modo pide al menos
 * `config.rotacion.intentosPorSemana` intentos —niveles terminados— entre el
 * lunes y el domingo. El juego que ya los tiene descansa (se bloquea) mientras
 * a otros les falten; cuando todos los tienen, se abren todos otra vez. El
 * juego de la misión del día no descansa hasta cumplirla, para que la misión
 * siempre se pueda hacer.
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

/** Los juegos de la lista que descansan hoy. */
export function juegosBloqueados(estado: Estado, dia: string, juegos: IdJuego[]): IdJuego[] {
  const intentos = intentosDeLaSemana(estado, dia);
  const cumplido = (juego: IdJuego) =>
    (intentos[juego] ?? 0) >= config.rotacion.intentosPorSemana;
  if (juegos.every(cumplido)) return [];

  const mision = estado.misiones[dia];
  const deLaMision = mision && !mision.completada ? JUEGO_DE_MISION[mision.tipo] : undefined;
  return juegos.filter((juego) => cumplido(juego) && juego !== deLaMision);
}
