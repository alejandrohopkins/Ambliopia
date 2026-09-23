/**
 * Los patrones de los mosaicos, aparte del dibujo para poder probarlos.
 *
 * Cada pieza lleva el mismo símbolo —un peine de tres púas— girado hacia uno
 * de los cuatro lados. Distinguir hacia dónde mira un símbolo pequeño es una
 * tarea clásica de agudeza visual; aquí además hay que deducir qué giro
 * falta según la regla del mosaico.
 */
import { config } from '../../config';
import type { Aleatorio } from '../../engine/rng';
import { delMundo } from '../base';

/** 0 mira a la derecha; cada paso gira un cuarto de vuelta en el sentido del reloj. */
export type Giro = 0 | 1 | 2 | 3;

export type Regla = 'columnas' | 'gira' | 'espejo' | 'doble';

/** El símbolo mirando a la derecha, en una rejilla de 5 × 5. */
const PEINE = ['#####', '#....', '#####', '#....', '#####'];

/** Mapa de 5 × 5 del símbolo girado. */
export function mapaDeSimbolo(giro: Giro): string[] {
  let mapa = [...PEINE];
  for (let i = 0; i < giro; i += 1) {
    mapa = Array.from({ length: 5 }, (_, f) =>
      Array.from({ length: 5 }, (_, c) => mapa[4 - c][f]).join(''),
    );
  }
  return mapa;
}

/** Espejo de izquierda a derecha: derecha ↔ izquierda; arriba y abajo no cambian. */
export function espejo(giro: Giro): Giro {
  return giro === 0 ? 2 : giro === 2 ? 0 : giro;
}

/** La regla de cada mundo, de la más sencilla a la más enredada. */
export function reglaDelMundo(mundo: number): Regla {
  return delMundo<Regla>(['columnas', 'gira', 'espejo', 'doble', 'doble'], mundo);
}

export interface Mosaico {
  lado: number;
  regla: Regla;
  /** Giro de cada pieza, fila a fila. */
  giros: Giro[];
  /** La pieza que falta. */
  falta: number;
  /** Piezas de las que se deduce la que falta: van al ojo ambliope. */
  claves: number[];
}

const aGiro = (n: number): Giro => ((((n % 4) + 4) % 4) as Giro);

/** Arma un mosaico con su regla, la pieza que falta y sus piezas clave. */
export function crearMosaico(lado: number, regla: Regla, aleatorio: Aleatorio): Mosaico {
  const giros: Giro[] = [];
  const azar = () => aGiro(aleatorio.entero(0, 3));

  if (regla === 'columnas') {
    // Todas las filas iguales: se deduce mirando la columna.
    const fila = Array.from({ length: lado }, azar);
    for (let f = 0; f < lado; f += 1) giros.push(...fila);
  } else if (regla === 'gira') {
    // Cada pieza gira un cuarto de vuelta respecto a la de su izquierda.
    for (let f = 0; f < lado; f += 1) {
      const inicio = aleatorio.entero(0, 3);
      for (let c = 0; c < lado; c += 1) giros.push(aGiro(inicio + c));
    }
  } else if (regla === 'espejo') {
    // Cada fila es simétrica: la mitad derecha es el espejo de la izquierda.
    for (let f = 0; f < lado; f += 1) {
      const fila: Giro[] = Array.from({ length: lado }, azar);
      for (let c = 0; c < Math.floor(lado / 2); c += 1) fila[lado - 1 - c] = espejo(fila[c]);
      // La columna del centro, si la hay, tiene que ser su propio espejo.
      if (lado % 2 === 1) fila[Math.floor(lado / 2)] = aGiro(1 + 2 * aleatorio.entero(0, 1));
      giros.push(...fila);
    }
  } else {
    // Giro que avanza a lo ancho y a lo alto: se deduce por la fila o por la columna.
    const base = aleatorio.entero(0, 3);
    const porFila = aleatorio.entero(1, 3);
    const porColumna = aleatorio.entero(1, 3);
    for (let f = 0; f < lado; f += 1) {
      for (let c = 0; c < lado; c += 1) giros.push(aGiro(base + f * porFila + c * porColumna));
    }
  }

  // La que falta nunca puede tener dos respuestas: en el espejo no vale la
  // columna del centro, y en el doble de 3 × 3 no vale la pieza del medio,
  // que no tiene dos vecinas seguidas ni en su fila ni en su columna.
  const centro = Math.floor(lado / 2);
  const ambigua = (i: number) =>
    (regla === 'espejo' && lado % 2 === 1 && i % lado === centro) ||
    (regla === 'doble' && lado === 3 && i === centro * lado + centro);
  let falta = aleatorio.entero(0, lado * lado - 1);
  while (ambigua(falta)) falta = aleatorio.entero(0, lado * lado - 1);

  const fila = Math.floor(falta / lado);
  const col = falta % lado;
  const claves: number[] = [];
  for (let i = 0; i < lado * lado; i += 1) {
    if (i === falta) continue;
    const mismaFila = Math.floor(i / lado) === fila;
    const mismaColumna = i % lado === col;
    const usa =
      regla === 'columnas' ? mismaColumna : regla === 'doble' ? mismaFila || mismaColumna : mismaFila;
    if (usa) claves.push(i);
  }
  return { lado, regla, giros, falta, claves };
}

/** Lo que manda el nivel: lado del mosaico, regla y límite de tiempo. */
export function dificultadDeMosaicos(mundo: number) {
  return {
    lado: delMundo(config.mosaicos.ladoPorMundo, mundo),
    regla: reglaDelMundo(mundo),
    limiteSeg: delMundo(config.mosaicos.limiteSegPorMundo, mundo),
  };
}

/** El símbolo se dibuja con trazos enteros: el tamaño real es múltiplo de cinco. */
export function tamanoDibujable(valor: number): number {
  return 5 * Math.max(1, Math.round(valor / 5));
}
