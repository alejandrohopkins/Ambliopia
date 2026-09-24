/** Lecturas derivadas del estado guardado. Sin efectos, fáciles de probar. */
import { config, type IdJuego, type Modo } from '../config';
import type { Estado } from './esquema';
import { JUEGOS } from './esquema';

/**
 * Los minutos se guardan con precisión de segundos: al sumar trozos de minuto
 * no debe quedar un 19,999… que no llegue a la meta de 20.
 */
export function redondearASegundos(minutos: number): number {
  return Math.round(minutos * 60) / 60;
}

/** Minutos activos de un día, opcionalmente filtrados por modo. */
export function minutosDelDia(estado: Estado, dia: string, modo?: Modo): number {
  return redondearASegundos(
    estado.sesiones
      .filter((s) => s.fecha === dia && (modo === undefined || s.modo === modo))
      .reduce((total, s) => total + s.minutosActivos, 0),
  );
}

/** Aciertos entre ensayos de todos los juegos del día, o null si aún no hubo ensayos. */
export function precisionDelDia(estado: Estado, dia: string): number | null {
  let ensayos = 0;
  let aciertos = 0;
  for (const sesion of estado.sesiones) {
    if (sesion.fecha !== dia) continue;
    for (const resumen of Object.values(sesion.porJuego)) {
      ensayos += resumen?.ensayos ?? 0;
      aciertos += resumen?.aciertos ?? 0;
    }
  }
  return ensayos > 0 ? aciertos / ensayos : null;
}

/** Premio de pantalla: la meta de minutos del día, con la precisión pedida. */
export function premioDePantallaGanado(estado: Estado, dia: string): boolean {
  const precision = precisionDelDia(estado, dia);
  return (
    metaCumplida(estado, dia) &&
    precision !== null &&
    precision >= config.premioDePantalla.precisionMinima
  );
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
    .filter(([, minutos]) => redondearASegundos(minutos) >= estado.ajustes.metaDiariaMin)
    .map(([dia]) => dia)
    .sort();
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
