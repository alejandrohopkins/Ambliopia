/**
 * El pozo de bloques, aparte del dibujo para poder probarlo.
 *
 * Rejilla de ocupación con la fila 0 abajo. Las piezas son las siete formas
 * de cuatro cuadrados del catálogo de la Torre. Aquí no hay fin de partida:
 * si el pozo se llena, las filas de abajo se hunden y se sigue jugando.
 */
import { config } from '../../config';
import { delMundo, segunNivel } from '../base';
import { PIEZAS, rotaciones, type Celda } from '../torre/piezas';

/** Las siete piezas de cuatro cuadrados, con todas sus posiciones de giro. */
export const PIEZAS_DEL_POZO = PIEZAS.filter((pieza) => pieza.tamano === 4).map((pieza) => ({
  id: pieza.id,
  giros: rotaciones(pieza),
}));

export interface Pozo {
  cols: number;
  filas: number;
  /** Índice fila * cols + columna, con la fila 0 abajo. */
  ocupado: boolean[];
}

/** Lo que manda el nivel: velocidad, pieza siguiente y giros por sorpresa. */
export function dificultadDePozo(mundo: number, nivel: number) {
  const p = config.pozo;
  return {
    velocidad: segunNivel(mundo, nivel, p.velocidadCaidaInicialCeldasSeg, p.velocidadCaidaFinalCeldasSeg),
    conSiguiente: mundo <= p.siguienteHastaMundo,
    giroSorpresa: delMundo(p.giroSorpresaPorMundo, mundo),
  };
}

export function pozoVacio(cols: number, filas: number): Pozo {
  return { cols, filas, ocupado: Array.from({ length: cols * filas }, () => false) };
}

/** Los lados y el suelo cuentan como llenos; por encima del borde, vacío. */
export function ocupada(pozo: Pozo, fila: number, col: number): boolean {
  if (col < 0 || col >= pozo.cols || fila < 0) return true;
  if (fila >= pozo.filas) return false;
  return pozo.ocupado[fila * pozo.cols + col];
}

export function celdasEn(celdas: Celda[], col: number, fila: number): Celda[] {
  return celdas.map(([f, c]): Celda => [fila + f, col + c]);
}

export function cabe(pozo: Pozo, celdas: Celda[], col: number, fila: number): boolean {
  return celdasEn(celdas, col, fila).every(([f, c]) => !ocupada(pozo, f, c));
}

/** La fila más baja a la que llega la pieza dejándola caer desde donde está. */
export function filaDeAterrizaje(pozo: Pozo, celdas: Celda[], col: number, fila: number): number {
  let destino = fila;
  while (cabe(pozo, celdas, col, destino - 1)) destino -= 1;
  return destino;
}

export function fijar(pozo: Pozo, celdas: Celda[], col: number, fila: number): Pozo {
  const ocupado = [...pozo.ocupado];
  for (const [f, c] of celdasEn(celdas, col, fila)) {
    if (f >= 0 && f < pozo.filas && c >= 0 && c < pozo.cols) ocupado[f * pozo.cols + c] = true;
  }
  return { ...pozo, ocupado };
}

export function filasLlenas(pozo: Pozo): number[] {
  const llenas: number[] = [];
  for (let f = 0; f < pozo.filas; f += 1) {
    if (pozo.ocupado.slice(f * pozo.cols, (f + 1) * pozo.cols).every(Boolean)) llenas.push(f);
  }
  return llenas;
}

/** Quita filas y baja todo lo de encima. */
export function quitarFilas(pozo: Pozo, filas: number[]): Pozo {
  const quedan: boolean[][] = [];
  for (let f = 0; f < pozo.filas; f += 1) {
    if (!filas.includes(f)) quedan.push(pozo.ocupado.slice(f * pozo.cols, (f + 1) * pozo.cols));
  }
  while (quedan.length < pozo.filas) quedan.push(Array.from({ length: pozo.cols }, () => false));
  return { ...pozo, ocupado: quedan.flat() };
}

/** El pozo lleno se hunde: las filas de abajo desaparecen. Nunca se pierde. */
export function hundir(pozo: Pozo, cuantas = config.pozo.filasQueSeHunden): Pozo {
  return quitarFilas(
    pozo,
    Array.from({ length: Math.min(cuantas, pozo.filas) }, (_, i) => i),
  );
}

/** Huecos tapados: celdas vacías con algo encima en su columna. */
export function huecosTapados(pozo: Pozo): number {
  let huecos = 0;
  for (let c = 0; c < pozo.cols; c += 1) {
    let techo = false;
    for (let f = pozo.filas - 1; f >= 0; f -= 1) {
      if (pozo.ocupado[f * pozo.cols + c]) techo = true;
      else if (techo) huecos += 1;
    }
  }
  return huecos;
}

export interface Colocacion {
  pozo: Pozo;
  filas: number[];
  /**
   * Buena colocación: no tapó ningún hueco nuevo, o completó una fila. Es lo
   * que se consigue cuando se ve bien dónde va la pieza.
   */
  buena: boolean;
}

/** Fija la pieza, limpia las filas completas y juzga la colocación. */
export function colocar(pozo: Pozo, celdas: Celda[], col: number, fila: number): Colocacion {
  const antes = huecosTapados(pozo);
  const fijado = fijar(pozo, celdas, col, fila);
  const filas = filasLlenas(fijado);
  const limpio = quitarFilas(fijado, filas);
  return { pozo: limpio, filas, buena: filas.length > 0 || huecosTapados(limpio) <= antes };
}
