/**
 * Lógica del escáner previo, aparte de la interfaz para poder probarla.
 * Dos figuras al azar en posiciones al azar: una solo para el ojo ambliope y
 * otra solo para el dominante. Cuál figura va a cada ojo también es al azar,
 * para que no se memorice.
 */
import type { Aleatorio } from '../engine/rng';
import { FIGURAS, type Figura } from './figuras';

export type RespuestaDeEscaner = 'ambliope' | 'dominante' | 'ambas';
export type ResultadoDeEscaner = 'correcto' | 'alReves' | 'revisar';

export interface Prueba {
  figuraAmbliope: Figura;
  figuraDominante: Figura;
  /** Posición relativa (0–1) dentro del área, para cada figura. */
  posicionAmbliope: { x: number; y: number };
  posicionDominante: { x: number; y: number };
  /** Las dos figuras en el orden en que se ofrecen como respuesta. */
  opciones: Figura[];
}

const MARGEN = 0.15;

function posicion(aleatorio: Aleatorio): { x: number; y: number } {
  return {
    x: MARGEN + aleatorio.siguiente() * (1 - 2 * MARGEN),
    y: MARGEN + aleatorio.siguiente() * (1 - 2 * MARGEN),
  };
}

export function generarPrueba(aleatorio: Aleatorio): Prueba {
  const [figuraAmbliope, figuraDominante] = aleatorio.barajar(FIGURAS).slice(0, 2);
  return {
    figuraAmbliope,
    figuraDominante,
    posicionAmbliope: posicion(aleatorio),
    posicionDominante: posicion(aleatorio),
    opciones: aleatorio.barajar([figuraAmbliope, figuraDominante]),
  };
}

/**
 * Con el ojo dominante cerrado solo debería verse la figura del ambliope.
 * Ver la del dominante significa que los lentes están al revés; ver las dos,
 * que no están puestos o no separan.
 */
export function evaluar(respuesta: RespuestaDeEscaner): ResultadoDeEscaner {
  if (respuesta === 'ambliope') return 'correcto';
  if (respuesta === 'dominante') return 'alReves';
  return 'revisar';
}
