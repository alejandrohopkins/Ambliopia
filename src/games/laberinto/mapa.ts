/**
 * El laberinto: se genera, se resuelve y se convierte en muros, aparte del
 * dibujo para poder probarlo. Las celdas van como [columna, fila], con la
 * fila 0 arriba.
 */
import { config } from '../../config';
import type { Aleatorio } from '../../engine/rng';
import { delMundo, segunNivel } from '../base';

export type Celda = [number, number];

export interface Laberinto {
  cols: number;
  filas: number;
  /** Paso abierto entre (c, f) y (c + 1, f). */
  derecha: boolean[];
  /** Paso abierto entre (c, f) y (c, f + 1). */
  abajo: boolean[];
}

export interface Caja {
  x: number;
  y: number;
  ancho: number;
  alto: number;
}

/** Lo que manda el nivel: tamaño máximo, pasillo, muro, obstáculos y límite de tiempo. */
export function dificultadDeLaberinto(mundo: number, nivel: number) {
  const l = config.laberinto;
  return {
    maximo: delMundo(l.celdasPorMundo, mundo),
    pasillo: segunNivel(mundo, nivel, l.pasilloInicialPx, l.pasilloFinalPx),
    muro: segunNivel(mundo, nivel, l.muroInicialPx, l.muroFinalPx),
    obstaculos: delMundo(l.obstaculosPorMundo, mundo),
    limiteSeg: delMundo(l.limiteDeTramoSegPorMundo, mundo),
  };
}

function indice(lab: { cols: number }, [c, f]: Celda): number {
  return f * lab.cols + c;
}

/** Vecinos a los que se puede pasar desde una celda. */
export function vecinosAbiertos(lab: Laberinto, [c, f]: Celda): Celda[] {
  const vecinos: Celda[] = [];
  if (c + 1 < lab.cols && lab.derecha[indice(lab, [c, f])]) vecinos.push([c + 1, f]);
  if (c > 0 && lab.derecha[indice(lab, [c - 1, f])]) vecinos.push([c - 1, f]);
  if (f + 1 < lab.filas && lab.abajo[indice(lab, [c, f])]) vecinos.push([c, f + 1]);
  if (f > 0 && lab.abajo[indice(lab, [c, f - 1])]) vecinos.push([c, f - 1]);
  return vecinos;
}

/**
 * Laberinto perfecto por búsqueda en profundidad al azar: entre dos celdas
 * cualesquiera hay exactamente un camino, así que siempre tiene solución.
 */
export function generarLaberinto(cols: number, filas: number, aleatorio: Aleatorio): Laberinto {
  const lab: Laberinto = {
    cols,
    filas,
    derecha: Array.from({ length: cols * filas }, () => false),
    abajo: Array.from({ length: cols * filas }, () => false),
  };
  const visitada = Array.from({ length: cols * filas }, () => false);
  const pila: Celda[] = [[0, 0]];
  visitada[0] = true;

  while (pila.length > 0) {
    const [c, f] = pila[pila.length - 1];
    const opciones = ([
      [c + 1, f],
      [c - 1, f],
      [c, f + 1],
      [c, f - 1],
    ] as Celda[]).filter(
      ([x, y]) => x >= 0 && x < cols && y >= 0 && y < filas && !visitada[indice(lab, [x, y])],
    );
    if (opciones.length === 0) {
      pila.pop();
      continue;
    }
    const [x, y] = aleatorio.elegir(opciones);
    if (x !== c) lab.derecha[indice(lab, [Math.min(x, c), f])] = true;
    else lab.abajo[indice(lab, [c, Math.min(y, f)])] = true;
    visitada[indice(lab, [x, y])] = true;
    pila.push([x, y]);
  }
  return lab;
}

/** Camino más corto entre dos celdas, las dos incluidas. */
export function caminoMasCorto(lab: Laberinto, desde: Celda, hasta: Celda): Celda[] {
  const previa = new Map<number, number>();
  const cola: Celda[] = [desde];
  previa.set(indice(lab, desde), -1);
  while (cola.length > 0) {
    const actual = cola.shift()!;
    if (actual[0] === hasta[0] && actual[1] === hasta[1]) break;
    for (const vecino of vecinosAbiertos(lab, actual)) {
      if (previa.has(indice(lab, vecino))) continue;
      previa.set(indice(lab, vecino), indice(lab, actual));
      cola.push(vecino);
    }
  }
  const camino: Celda[] = [];
  let paso = indice(lab, hasta);
  if (!previa.has(paso)) return camino;
  while (paso !== -1) {
    camino.unshift([paso % lab.cols, Math.floor(paso / lab.cols)]);
    paso = previa.get(paso)!;
  }
  return camino;
}

/**
 * Controles del camino: cada tantas celdas, y siempre la meta. Llegar al
 * siguiente sin tocar un muro es un ensayo acertado.
 */
export function controles(camino: Celda[], cada = config.laberinto.celdasPorTramo): Celda[] {
  const lista = camino.filter((_, i) => i > 0 && i % cada === 0);
  const meta = camino[camino.length - 1];
  if (meta && lista[lista.length - 1] !== meta) lista.push(meta);
  return lista;
}

/**
 * Los muros como rectángulos en píxeles: el borde y cada paso cerrado.
 * Cada tramo se alarga medio grosor por los dos lados para que las esquinas
 * queden llenas.
 */
export function muros(
  lab: Laberinto,
  origen: { x: number; y: number },
  celda: number,
  grosor: number,
): Caja[] {
  const g = grosor;
  const cajas: Caja[] = [
    { x: origen.x - g / 2, y: origen.y - g / 2, ancho: lab.cols * celda + g, alto: g },
    { x: origen.x - g / 2, y: origen.y + lab.filas * celda - g / 2, ancho: lab.cols * celda + g, alto: g },
    { x: origen.x - g / 2, y: origen.y - g / 2, ancho: g, alto: lab.filas * celda + g },
    { x: origen.x + lab.cols * celda - g / 2, y: origen.y - g / 2, ancho: g, alto: lab.filas * celda + g },
  ];
  for (let f = 0; f < lab.filas; f += 1) {
    for (let c = 0; c < lab.cols; c += 1) {
      if (c + 1 < lab.cols && !lab.derecha[indice(lab, [c, f])]) {
        cajas.push({
          x: origen.x + (c + 1) * celda - g / 2,
          y: origen.y + f * celda - g / 2,
          ancho: g,
          alto: celda + g,
        });
      }
      if (f + 1 < lab.filas && !lab.abajo[indice(lab, [c, f])]) {
        cajas.push({
          x: origen.x + c * celda - g / 2,
          y: origen.y + (f + 1) * celda - g / 2,
          ancho: celda + g,
          alto: g,
        });
      }
    }
  }
  return cajas;
}

/** ¿Un círculo toca una caja? */
export function circuloTocaCaja(x: number, y: number, radio: number, caja: Caja): boolean {
  const cercaX = Math.max(caja.x, Math.min(x, caja.x + caja.ancho));
  const cercaY = Math.max(caja.y, Math.min(y, caja.y + caja.alto));
  return Math.hypot(x - cercaX, y - cercaY) < radio;
}

/**
 * ¿El punto toca algún muro yendo de un sitio a otro? Se revisa el trayecto a
 * pasos cortos: un arrastre rápido no puede atravesar una pared.
 */
export function trayectoTocaMuro(
  desde: { x: number; y: number },
  hasta: { x: number; y: number },
  radio: number,
  cajas: Caja[],
): { x: number; y: number } | null {
  const largo = Math.hypot(hasta.x - desde.x, hasta.y - desde.y);
  const pasos = Math.max(1, Math.ceil(largo / Math.max(1, radio / 2)));
  for (let i = 1; i <= pasos; i += 1) {
    const x = desde.x + ((hasta.x - desde.x) * i) / pasos;
    const y = desde.y + ((hasta.y - desde.y) * i) / pasos;
    if (cajas.some((caja) => circuloTocaCaja(x, y, radio, caja))) return { x, y };
  }
  return null;
}

/**
 * Recorridos rectos del laberinto de al menos `largo` celdas: por ahí
 * patrullan los obstáculos, de punta a punta.
 */
export function pasillosRectos(lab: Laberinto, largo: number): Array<{ desde: Celda; hasta: Celda }> {
  const lista: Array<{ desde: Celda; hasta: Celda }> = [];
  for (let f = 0; f < lab.filas; f += 1) {
    let inicio = 0;
    for (let c = 0; c < lab.cols; c += 1) {
      const sigue = c + 1 < lab.cols && lab.derecha[indice(lab, [c, f])];
      if (!sigue) {
        if (c - inicio + 1 >= largo) lista.push({ desde: [inicio, f], hasta: [c, f] });
        inicio = c + 1;
      }
    }
  }
  for (let c = 0; c < lab.cols; c += 1) {
    let inicio = 0;
    for (let f = 0; f < lab.filas; f += 1) {
      const sigue = f + 1 < lab.filas && lab.abajo[indice(lab, [c, f])];
      if (!sigue) {
        if (f - inicio + 1 >= largo) lista.push({ desde: [c, inicio], hasta: [c, f] });
        inicio = f + 1;
      }
    }
  }
  return lista;
}
