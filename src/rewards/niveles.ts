/**
 * Subir de nivel. Un nivel se supera con la precisión que pide
 * `config.progresion.precisionParaSubir` y, si el juego tiene un objetivo
 * propio (la figura de la Torre), cumpliéndolo. Entonces el juego queda en el
 * nivel siguiente y la próxima partida empieza ahí. Nunca se baja: no
 * superarlo solo significa volver a intentarlo.
 */
import { config } from '../config';
import type { ResumenDeNivel } from '../games/tipos';

export interface Nivel {
  mundo: number;
  nivel: number;
}

export function nivelSuperado(resumen: Pick<ResumenDeNivel, 'precision' | 'objetivo'>): boolean {
  return (
    resumen.precision >= config.progresion.precisionParaSubir && (resumen.objetivo?.cumplido ?? true)
  );
}

/** El nivel que viene después, o null si ya es el último del último mundo. */
export function nivelSiguiente({ mundo, nivel }: Nivel): Nivel | null {
  if (nivel < config.progresion.nivelesPorMundo) return { mundo, nivel: nivel + 1 };
  if (mundo < config.progresion.mundos) return { mundo: mundo + 1, nivel: 1 };
  return null;
}

/** Posición del nivel en todo el recorrido, para comparar dos niveles. */
export function ordenDeNivel({ mundo, nivel }: Nivel): number {
  return (mundo - 1) * config.progresion.nivelesPorMundo + (nivel - 1);
}
