/**
 * Economía del juego. Regla crítica: nunca se pierden monedas ni progreso por
 * fallar. Todo aquí suma, nada resta.
 */
import { config } from '../config';
import type { ResumenDeNivel } from '../games/tipos';

export interface PremioDeNivel {
  monedas: number;
  porAciertos: number;
  porEstrellas: number;
  porNivel: number;
}

export function premioDeNivel(resumen: ResumenDeNivel): PremioDeNivel {
  const porAciertos = resumen.aciertos * config.economia.monedasPorAcierto;
  const porEstrellas = resumen.estrellas * config.economia.monedasPorEstrellaDeNivel;
  const porNivel = config.economia.monedasPorNivelCompletado;
  return { monedas: porAciertos + porEstrellas + porNivel, porAciertos, porEstrellas, porNivel };
}

export function monedasPorMinutos(minutos: number): number {
  return Math.max(0, Math.floor(minutos)) * config.economia.monedasPorMinutoActivo;
}

export function monedasPorMetaDiaria(): number {
  return config.economia.monedasMetaDiaria;
}

/** 5 monedas por día de racha, con tope. */
export function bonoDeRacha(diasDeRacha: number): number {
  return Math.min(
    config.economia.bonoRachaMaximo,
    Math.max(0, diasDeRacha) * config.economia.bonoRachaPorDia,
  );
}

/** Comparación divertida para "Mis récords", según el tamaño en milímetros. */
export function comparacionDeRecord(mm: number | null): string | null {
  if (mm === null || !Number.isFinite(mm)) return null;
  const entrada = config.comparacionesDeRecord.find((c) => mm <= c.hastaMm);
  return entrada ? entrada.clave : null;
}
