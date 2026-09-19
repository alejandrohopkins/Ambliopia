/**
 * Racha: días seguidos con la meta diaria cumplida.
 * Un protector por semana cubre un día faltante sin romper la racha.
 * Nunca se pierde progreso ni monedas: el protector solo suaviza la racha.
 */
import { config } from '../config';
import type { Racha } from '../storage/esquema';
import { diasEntre, semanaISO } from './fechas';

export interface ResultadoDeRacha {
  racha: Racha;
  /** La racha subió con este día. */
  subio: boolean;
  /** Se consumió un protector para no romperla. */
  usoProtector: boolean;
}

/**
 * Repone el protector semanal si cambió la semana ISO.
 * Se llama en el cierre del día y al abrir la app.
 */
export function reponerProtectores(racha: Racha, hoy: string): Racha {
  const semana = semanaISO(hoy);
  if (racha.semanaDeProtectores === semana) return racha;
  return {
    ...racha,
    protectoresDisponibles: config.racha.protectoresPorSemana,
    semanaDeProtectores: semana,
  };
}

/** Registra que la meta diaria se cumplió el día indicado. */
export function registrarMetaCumplida(racha: Racha, dia: string): ResultadoDeRacha {
  const conProtectores = reponerProtectores(racha, dia);
  if (conProtectores.ultimoDiaCumplido === dia) {
    return { racha: conProtectores, subio: false, usoProtector: false };
  }

  const hueco =
    conProtectores.ultimoDiaCumplido === null
      ? Infinity
      : diasEntre(conProtectores.ultimoDiaCumplido, dia);

  let actual: number;
  let usoProtector = false;

  if (hueco === 1) {
    actual = conProtectores.actual + 1;
  } else if (hueco === 2 && conProtectores.protectoresDisponibles > 0) {
    actual = conProtectores.actual + 1;
    usoProtector = true;
  } else {
    actual = 1;
  }

  return {
    racha: {
      ...conProtectores,
      actual,
      mejor: Math.max(conProtectores.mejor, actual),
      protectoresDisponibles: conProtectores.protectoresDisponibles - (usoProtector ? 1 : 0),
      ultimoDiaCumplido: dia,
    },
    subio: true,
    usoProtector,
  };
}

/**
 * Racha vigente vista desde `hoy`. Si pasaron demasiados días sin cumplir,
 * la racha ya está rota aunque el valor guardado siga en alto.
 */
export function rachaVigente(racha: Racha, hoy: string): number {
  if (racha.ultimoDiaCumplido === null) return 0;
  const hueco = diasEntre(racha.ultimoDiaCumplido, hoy);
  if (hueco <= 1) return racha.actual;
  if (hueco === 2 && racha.protectoresDisponibles > 0) return racha.actual;
  return 0;
}

/** Aplica la rotura definitiva en el cierre del día. */
export function cerrarRacha(racha: Racha, hoy: string): Racha {
  const vigente = rachaVigente(racha, hoy);
  if (vigente > 0) return racha;
  return { ...racha, actual: 0 };
}

/** Constancia real: días cumplidos dentro del rango, sin contar protectores. */
export function constanciaReal(diasCumplidos: string[], desde: string, hasta: string): number {
  const unicos = new Set(diasCumplidos);
  return [...unicos].filter((d) => diasEntre(desde, d) >= 0 && diasEntre(d, hasta) >= 0).length;
}
