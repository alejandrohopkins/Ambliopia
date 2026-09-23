/**
 * El tablero de la serpiente, aparte del dibujo para poder probarlo.
 * Las celdas van como [columna, fila], con la fila 0 arriba.
 */
import { config } from '../../config';
import type { Aleatorio } from '../../engine/rng';
import { delMundo, segunNivel } from '../base';

export type Celda = [number, number];
export type Direccion = 'arriba' | 'abajo' | 'izquierda' | 'derecha';

export const PASO: Record<Direccion, Celda> = {
  arriba: [0, -1],
  abajo: [0, 1],
  izquierda: [-1, 0],
  derecha: [1, 0],
};

const CONTRARIA: Record<Direccion, Direccion> = {
  arriba: 'abajo',
  abajo: 'arriba',
  izquierda: 'derecha',
  derecha: 'izquierda',
};

/** Lo que manda el nivel: tablero, velocidad, muros y cuánto espera la manzana. */
export function dificultadDeSerpiente(mundo: number, nivel: number) {
  const s = config.serpiente;
  return {
    tablero: delMundo(s.celdasPorMundo, mundo),
    velocidad: segunNivel(mundo, nivel, s.velocidadInicialCeldasSeg, s.velocidadFinalCeldasSeg),
    muros: delMundo(s.murosPorMundo, mundo),
    holgura: segunNivel(mundo, nivel, s.holguraInicial, s.holguraFinal),
  };
}

export function clave([c, f]: Celda): string {
  return `${c},${f}`;
}

export function mismaCelda(a: Celda, b: Celda): boolean {
  return a[0] === b[0] && a[1] === b[1];
}

/** No se puede dar media vuelta sobre sí misma. */
export function puedeGirar(actual: Direccion, nueva: Direccion): boolean {
  return CONTRARIA[actual] !== nueva;
}

export interface Tablero {
  cols: number;
  filas: number;
  /** Muros interiores, por clave de celda. */
  muros: Set<string>;
}

export function dentro(tablero: Tablero, [c, f]: Celda): boolean {
  return c >= 0 && c < tablero.cols && f >= 0 && f < tablero.filas;
}

export function libreDeMuros(tablero: Tablero, celda: Celda): boolean {
  return dentro(tablero, celda) && !tablero.muros.has(clave(celda));
}

/**
 * Muros interiores: tramos rectos que no tocan el borde ni la zona de salida.
 * Nunca cierran el tablero en dos, porque cada tramo deja libre el anillo de
 * celdas junto al borde.
 */
export function crearMuros(
  cols: number,
  filas: number,
  cuantos: number,
  aleatorio: Aleatorio,
  reservadas: Celda[],
): Set<string> {
  const muros = new Set<string>();
  const largo = config.serpiente.largoDeMuro;
  const prohibidas = new Set(reservadas.map(clave));
  for (let intento = 0; muros.size < cuantos * largo && intento < cuantos * 50; intento += 1) {
    const horizontal = aleatorio.probabilidad(0.5);
    const c0 = aleatorio.entero(2, cols - 3 - (horizontal ? largo : 0));
    const f0 = aleatorio.entero(2, filas - 3 - (horizontal ? 0 : largo));
    const tramo: Celda[] = Array.from({ length: largo }, (_, i) =>
      horizontal ? [c0 + i, f0] : [c0, f0 + i],
    );
    // Separados entre sí y de la salida, para que ningún rincón quede encerrado.
    const choca = tramo.some(([c, f]) => {
      for (let dc = -1; dc <= 1; dc += 1) {
        for (let df = -1; df <= 1; df += 1) {
          if (muros.has(clave([c + dc, f + df])) || prohibidas.has(clave([c + dc, f + df]))) return true;
        }
      }
      return false;
    });
    if (!choca) for (const celda of tramo) muros.add(clave(celda));
  }
  return muros;
}

/** Pasos del camino más corto entre dos celdas esquivando muros y cuerpo; −1 si no hay. */
export function distancia(tablero: Tablero, desde: Celda, hasta: Celda, cuerpo: Set<string>): number {
  const vista = new Set([clave(desde)]);
  let frente: Celda[] = [desde];
  for (let pasos = 0; frente.length > 0; pasos += 1) {
    const siguiente: Celda[] = [];
    for (const celda of frente) {
      if (mismaCelda(celda, hasta)) return pasos;
      for (const [dc, df] of Object.values(PASO)) {
        const vecina: Celda = [celda[0] + dc, celda[1] + df];
        const k = clave(vecina);
        if (vista.has(k) || !libreDeMuros(tablero, vecina) || cuerpo.has(k)) continue;
        vista.add(k);
        siguiente.push(vecina);
      }
    }
    frente = siguiente;
  }
  return -1;
}

export interface Serpiente {
  /** La cabeza es la primera celda. */
  cuerpo: Celda[];
  direccion: Direccion;
}

export type ResultadoDePaso = 'avanza' | 'come' | 'bloqueada' | 'se muerde';

/**
 * Un paso de la serpiente. Contra un muro o el borde se queda quieta
 * esperando otro giro; si se muerde la cola, pierde el trozo mordido y sigue.
 * Nunca hay fin de partida.
 */
export function avanzar(
  tablero: Tablero,
  serpiente: Serpiente,
  manzana: Celda | null,
  crecer: boolean,
): ResultadoDePaso {
  const [dc, df] = PASO[serpiente.direccion];
  const cabeza = serpiente.cuerpo[0];
  const destino: Celda = [cabeza[0] + dc, cabeza[1] + df];
  if (!libreDeMuros(tablero, destino)) return 'bloqueada';

  const come = manzana !== null && mismaCelda(destino, manzana);
  // La punta de la cola se mueve a la vez que la cabeza: pisarla no es morderse.
  const cuerpoQueQueda = come && crecer ? serpiente.cuerpo : serpiente.cuerpo.slice(0, -1);
  const mordida = cuerpoQueQueda.findIndex((celda) => mismaCelda(celda, destino));

  serpiente.cuerpo = [destino, ...cuerpoQueQueda];
  if (mordida >= 0) {
    serpiente.cuerpo = serpiente.cuerpo.slice(0, mordida + 1);
    return 'se muerde';
  }
  return come ? 'come' : 'avanza';
}
