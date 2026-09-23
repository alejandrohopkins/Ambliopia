/**
 * Modelo del tablero de la Torre, aparte del dibujo para poder probarlo.
 *
 * Es una rejilla de ocupación de verdad: cada celda está llena o vacía, con la
 * fila 0 abajo. Así las piezas con forma chocan como deben, pueden dejar
 * huecos debajo y una fila puede llenarse de lado a lado.
 *
 * El plano de la figura sigue siendo una altura por columna, porque todas las
 * figuras se construyen por gravedad. Una celda por debajo de esa altura es
 * "de figura" (cuenta para terminar el nivel); cualquier otra celda ocupada es
 * escombro, que estorba y acaba desmoronándose.
 */
import type { Celda, Pieza } from './piezas';
import { anchoDe, rotaciones } from './piezas';

export interface EstadoDeTablero {
  cols: number;
  filas: number;
  /** Altura objetivo de cada columna (la figura). */
  plano: number[];
  /** Ocupación, indexada por fila * cols + columna, con la fila 0 abajo. */
  ocupado: boolean[];
}

export interface ResultadoDeColocacion {
  ocupado: boolean[];
  /** Todas las celdas de la pieza cayeron dentro del plano. */
  acierto: boolean;
  /** Celdas que quedaron fuera del plano: escombro. */
  sobran: number;
  /** Celdas de figura nuevas que aporta esta pieza. */
  nuevasDeFigura: number;
  /** Filas del tablero que quedaron llenas de lado a lado. */
  filasLlenas: number[];
}

export function tableroVacio(plano: number[], filas: number): EstadoDeTablero {
  return {
    cols: plano.length,
    filas,
    plano,
    ocupado: Array.from({ length: plano.length * filas }, () => false),
  };
}

function indice(estado: EstadoDeTablero, fila: number, col: number): number {
  return fila * estado.cols + col;
}

/**
 * ¿Esta celda está ocupada? Los lados y el suelo cuentan como ocupados —son
 * pared— y el cielo como libre, para que la pieza pueda nacer por encima.
 */
export function ocupada(estado: EstadoDeTablero, fila: number, col: number): boolean {
  if (col < 0 || col >= estado.cols || fila < 0) return true;
  if (fila >= estado.filas) return false;
  return estado.ocupado[indice(estado, fila, col)];
}

/** Una celda es de figura si está por debajo de la altura que pide el plano. */
export function esDeFigura(estado: EstadoDeTablero, fila: number, col: number): boolean {
  if (col < 0 || col >= estado.cols || fila < 0) return false;
  return fila < estado.plano[col];
}

/** Celdas de una pieza llevadas a su sitio del tablero. */
export function celdasEn(celdas: Celda[], col: number, fila: number): Celda[] {
  return celdas.map(([f, c]): Celda => [fila + f, col + c]);
}

/** ¿La pieza cabe aquí, sin salirse ni pisar nada? */
export function cabe(
  estado: EstadoDeTablero,
  celdas: Celda[],
  col: number,
  fila: number,
): boolean {
  return celdasEn(celdas, col, fila).every(([f, c]) => !ocupada(estado, f, c));
}

/** Hasta dónde baja la pieza si se la suelta desde aquí. */
export function aterrizaje(
  estado: EstadoDeTablero,
  celdas: Celda[],
  col: number,
  filaDesde: number,
): number {
  let fila = filaDesde;
  while (cabe(estado, celdas, col, fila - 1)) fila -= 1;
  return fila;
}

function filaLlena(estado: EstadoDeTablero, ocupado: boolean[], fila: number): boolean {
  if (fila < 0 || fila >= estado.filas) return false;
  for (let col = 0; col < estado.cols; col += 1) {
    if (!ocupado[indice(estado, fila, col)]) return false;
  }
  return true;
}

/** Fija la pieza en el tablero y cuenta lo que ha pasado. */
export function colocar(
  estado: EstadoDeTablero,
  celdas: Celda[],
  col: number,
  fila: number,
): ResultadoDeColocacion {
  const ocupado = [...estado.ocupado];
  const puestas = celdasEn(celdas, col, fila);
  let nuevasDeFigura = 0;
  let sobran = 0;

  for (const [f, c] of puestas) {
    if (f >= 0 && f < estado.filas && c >= 0 && c < estado.cols) {
      ocupado[indice(estado, f, c)] = true;
    }
    if (esDeFigura(estado, f, c)) nuevasDeFigura += 1;
    else sobran += 1;
  }

  const filasLlenas = [...new Set(puestas.map(([f]) => f))]
    .filter((f) => filaLlena(estado, ocupado, f))
    .sort((a, b) => a - b);

  return { ocupado, acierto: sobran === 0, sobran, nuevasDeFigura, filasLlenas };
}

/** Celdas ocupadas que no son de figura. */
export function escombro(estado: EstadoDeTablero): Celda[] {
  const fuera: Celda[] = [];
  for (let fila = 0; fila < estado.filas; fila += 1) {
    for (let col = 0; col < estado.cols; col += 1) {
      if (estado.ocupado[indice(estado, fila, col)] && !esDeFigura(estado, fila, col)) {
        fuera.push([fila, col]);
      }
    }
  }
  return fuera;
}

/** Quita todo el escombro y deja la figura intacta: nunca se pierde lo hecho. */
export function barrerEscombro(estado: EstadoDeTablero): boolean[] {
  return estado.ocupado.map((lleno, i) => {
    const fila = Math.floor(i / estado.cols);
    const col = i % estado.cols;
    return lleno && esDeFigura(estado, fila, col);
  });
}

export function figuraCompleta(estado: EstadoDeTablero): boolean {
  for (let col = 0; col < estado.cols; col += 1) {
    for (let fila = 0; fila < estado.plano[col]; fila += 1) {
      if (!estado.ocupado[indice(estado, fila, col)]) return false;
    }
  }
  return true;
}

/** Celdas de figura que todavía faltan. */
export function bloquesRestantes(estado: EstadoDeTablero): number {
  let faltan = 0;
  for (let col = 0; col < estado.cols; col += 1) {
    for (let fila = 0; fila < estado.plano[col]; fila += 1) {
      if (!estado.ocupado[indice(estado, fila, col)]) faltan += 1;
    }
  }
  return faltan;
}

export function bloquesDelPlano(estado: EstadoDeTablero): number {
  return estado.plano.reduce((total, altura) => total + altura, 0);
}

/** Columnas a las que todavía les falta alguna celda de figura. */
export function columnasPendientes(estado: EstadoDeTablero): number[] {
  const pendientes: number[] = [];
  for (let col = 0; col < estado.cols; col += 1) {
    for (let fila = 0; fila < estado.plano[col]; fila += 1) {
      if (!estado.ocupado[indice(estado, fila, col)]) {
        pendientes.push(col);
        break;
      }
    }
  }
  return pendientes;
}

/**
 * Celdas de figura que están sin construir y tapadas por arriba: huecos que
 * la gravedad ya no puede rellenar. Cero es lo sano.
 */
export function huecosEnterrados(estado: EstadoDeTablero, ocupado = estado.ocupado): number {
  let enterrados = 0;
  for (let col = 0; col < estado.cols; col += 1) {
    let tapado = false;
    for (let fila = estado.filas - 1; fila >= 0; fila -= 1) {
      if (ocupado[fila * estado.cols + col]) tapado = true;
      else if (tapado && fila < estado.plano[col]) enterrados += 1;
    }
  }
  return enterrados;
}

export interface Colocacion {
  pieza: Pieza;
  rotacion: number;
  celdas: Celda[];
  col: number;
  fila: number;
}

/**
 * Todas las colocaciones que dejan la pieza entera dentro del plano y sin
 * enterrar ningún hueco. Se prueba cada giro en cada columna y se deja caer de
 * verdad, así que lo que devuelve son jugadas posibles, no aproximaciones.
 */
export function colocacionesPerfectas(pieza: Pieza, estado: EstadoDeTablero): Colocacion[] {
  const buenas: Colocacion[] = [];
  const enterradosAntes = huecosEnterrados(estado);

  rotaciones(pieza).forEach((celdas, rotacion) => {
    const ancho = anchoDe(celdas);
    for (let col = 0; col + ancho <= estado.cols; col += 1) {
      if (!cabe(estado, celdas, col, estado.filas)) continue;
      const fila = aterrizaje(estado, celdas, col, estado.filas);
      const puestas = celdasEn(celdas, col, fila);
      if (!puestas.every(([f, c]) => esDeFigura(estado, f, c))) continue;

      const ocupado = [...estado.ocupado];
      for (const [f, c] of puestas) ocupado[f * estado.cols + c] = true;
      if (huecosEnterrados(estado, ocupado) > enterradosAntes) continue;

      buenas.push({ pieza, rotacion, celdas, col, fila });
    }
  });
  return buenas;
}

/**
 * Piezas que todavía pueden colocarse enteras dentro del plano. Es lo que
 * garantiza que la figura siempre se pueda terminar: nunca se ofrece una
 * pieza que ya no cabe en ningún sitio.
 */
export function piezasQueCaben(piezas: Pieza[], estado: EstadoDeTablero): Pieza[] {
  const caben = piezas.filter((pieza) => colocacionesPerfectas(pieza, estado).length > 0);
  return caben.length > 0 ? caben : [];
}
