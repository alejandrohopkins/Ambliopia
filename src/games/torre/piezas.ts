/**
 * Piezas de la Torre de bloques.
 *
 * Cada pieza es un poliominó: un grupo de celdas pegadas. Las celdas van como
 * [fila, columna] relativas, con la fila 0 abajo, igual que el tablero.
 *
 * Arte propio: son las formas geométricas elementales que se pueden hacer con
 * uno, dos, tres o cuatro cuadrados. Los nombres son descriptivos en español.
 */
export type Celda = [number, number];

export interface Pieza {
  id: string;
  /** Cuántas celdas ocupa. Es lo que el mundo usa para elegir su dificultad. */
  tamano: number;
  celdas: Celda[];
}

/** Lleva una forma a la esquina: fila mínima 0 y columna mínima 0. */
export function normalizar(celdas: Celda[]): Celda[] {
  const filaMin = Math.min(...celdas.map(([fila]) => fila));
  const colMin = Math.min(...celdas.map(([, col]) => col));
  return celdas
    .map(([fila, col]): Celda => [fila - filaMin, col - colMin])
    .sort((a, b) => a[0] - b[0] || a[1] - b[1]);
}

/**
 * Gira la forma un cuarto de vuelta en el sentido de las agujas del reloj.
 * Con la fila hacia arriba, girar así lleva (fila, columna) a (−columna, fila).
 */
export function rotar(celdas: Celda[]): Celda[] {
  return normalizar(celdas.map(([fila, col]): Celda => [-col, fila]));
}

function mismaForma(a: Celda[], b: Celda[]): boolean {
  if (a.length !== b.length) return false;
  return a.every(([fila, col], i) => fila === b[i][0] && col === b[i][1]);
}

/** Las posiciones distintas de una pieza al girarla: una, dos o cuatro. */
export function rotaciones(pieza: Pieza): Celda[][] {
  const lista: Celda[][] = [normalizar(pieza.celdas)];
  for (let i = 0; i < 3; i += 1) {
    const siguiente = rotar(lista[lista.length - 1]);
    if (lista.some((forma) => mismaForma(forma, siguiente))) break;
    lista.push(siguiente);
  }
  return lista;
}

export function anchoDe(celdas: Celda[]): number {
  return Math.max(...celdas.map(([, col]) => col)) + 1;
}

export function altoDe(celdas: Celda[]): number {
  return Math.max(...celdas.map(([fila]) => fila)) + 1;
}

/**
 * Catálogo completo. De una a cuatro celdas, todas las formas posibles sin
 * contar las que solo se diferencian por un giro.
 */
export const PIEZAS: Pieza[] = [
  { id: 'bloque', tamano: 1, celdas: [[0, 0]] },
  { id: 'par', tamano: 2, celdas: [[0, 0], [0, 1]] },
  { id: 'trio', tamano: 3, celdas: [[0, 0], [0, 1], [0, 2]] },
  { id: 'esquina', tamano: 3, celdas: [[0, 0], [0, 1], [1, 0]] },
  { id: 'barra', tamano: 4, celdas: [[0, 0], [0, 1], [0, 2], [0, 3]] },
  { id: 'cuadro', tamano: 4, celdas: [[0, 0], [0, 1], [1, 0], [1, 1]] },
  { id: 'te', tamano: 4, celdas: [[0, 0], [0, 1], [0, 2], [1, 1]] },
  { id: 'ele', tamano: 4, celdas: [[0, 0], [0, 1], [0, 2], [1, 2]] },
  { id: 'jota', tamano: 4, celdas: [[0, 0], [0, 1], [0, 2], [1, 0]] },
  { id: 'ese', tamano: 4, celdas: [[0, 0], [0, 1], [1, 1], [1, 2]] },
  { id: 'zeta', tamano: 4, celdas: [[0, 1], [0, 2], [1, 0], [1, 1]] },
];

/** La pieza de una sola celda: el comodín que siempre cabe. */
export const BLOQUE_SUELTO = PIEZAS[0];

export function piezaPorId(id: string): Pieza | undefined {
  return PIEZAS.find((pieza) => pieza.id === id);
}

/** Las piezas de los tamaños que admite un mundo. */
export function piezasDeTamanos(tamanos: number[]): Pieza[] {
  return PIEZAS.filter((pieza) => tamanos.includes(pieza.tamano));
}
