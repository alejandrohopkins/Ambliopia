/** Lecturas derivadas del estado guardado. Sin efectos, fáciles de probar. */
import type { IdJuego, Modo } from '../config';
import { config } from '../config';
import type { Estado } from './esquema';
import { JUEGOS } from './esquema';

/** Minutos activos de un día, opcionalmente filtrados por modo. */
export function minutosDelDia(estado: Estado, dia: string, modo?: Modo): number {
  return estado.sesiones
    .filter((s) => s.fecha === dia && (modo === undefined || s.modo === modo))
    .reduce((total, s) => total + s.minutosActivos, 0);
}

/** Máximo de minutos permitido hoy, incluyendo la extensión del adulto. */
export function maximoDelDia(estado: Estado, dia: string): number {
  const extra = estado.extraDelDia?.fecha === dia ? estado.extraDelDia.minutos : 0;
  return estado.ajustes.maxDiarioMin + extra;
}

export function metaCumplida(estado: Estado, dia: string): boolean {
  return minutosDelDia(estado, dia) >= estado.ajustes.metaDiariaMin;
}

export function limiteAlcanzado(estado: Estado, dia: string): boolean {
  return minutosDelDia(estado, dia) >= maximoDelDia(estado, dia);
}

/** Días con la meta cumplida, en orden. */
export function diasConMetaCumplida(estado: Estado): string[] {
  const porDia = new Map<string, number>();
  for (const s of estado.sesiones) {
    porDia.set(s.fecha, (porDia.get(s.fecha) ?? 0) + s.minutosActivos);
  }
  return [...porDia.entries()]
    .filter(([, minutos]) => minutos >= estado.ajustes.metaDiariaMin)
    .map(([dia]) => dia)
    .sort();
}

export function estrellasDeMundo(estado: Estado, juego: IdJuego, mundo: number): number {
  const { estrellasPorNivel } = estado.progreso[juego];
  let total = 0;
  for (let nivel = 1; nivel <= config.progresion.nivelesPorMundo; nivel += 1) {
    total += estrellasPorNivel[`${mundo}:${nivel}`] ?? 0;
  }
  return total;
}

export function mundoDesbloqueado(estado: Estado, juego: IdJuego, mundo: number): boolean {
  if (mundo <= 1) return true;
  return (
    estrellasDeMundo(estado, juego, mundo - 1) >= config.progresion.estrellasParaDesbloquearMundo
  );
}

export function estrellasTotales(estado: Estado, juego: IdJuego): number {
  return Object.values(estado.progreso[juego].estrellasPorNivel).reduce((a, b) => a + b, 0);
}

/** Juegos distintos jugados en un día. */
export function juegosDelDia(estado: Estado, dia: string): IdJuego[] {
  const vistos = new Set<IdJuego>();
  for (const s of estado.sesiones) {
    if (s.fecha !== dia) continue;
    for (const juego of JUEGOS) {
      if (s.porJuego[juego]) vistos.add(juego);
    }
  }
  return [...vistos];
}

/** Modos que la jugadora puede elegir hoy. */
export function modosDisponibles(estado: Estado): Modo[] {
  if (estado.ajustes.modoFijo) return [estado.ajustes.modoFijo];
  return estado.ajustes.modosPermitidos;
}

/** Instantánea para comparar el antes y el después de una sesión. */
export interface Marcador {
  minutos: number;
  monedas: number;
  estrellas: number;
  records: number;
}

export function marcador(estado: Estado, dia: string): Marcador {
  let estrellas = 0;
  for (const juego of JUEGOS) estrellas += estrellasTotales(estado, juego);
  return {
    minutos: minutosDelDia(estado, dia),
    monedas: estado.economia.monedas,
    estrellas,
    records: Object.keys(estado.records).length,
  };
}

export function diferenciaDeMarcador(antes: Marcador, despues: Marcador): Marcador {
  return {
    minutos: Math.max(0, despues.minutos - antes.minutos),
    monedas: Math.max(0, despues.monedas - antes.monedas),
    estrellas: Math.max(0, despues.estrellas - antes.estrellas),
    records: Math.max(0, despues.records - antes.records),
  };
}
