/**
 * Aleatorio con semilla (mulberry32). Reproducible: la misma semilla da
 * siempre la misma secuencia, para que la misión del día no cambie durante
 * el día y las pruebas sean estables.
 */

/** Hash de texto a entero de 32 bits, para sembrar con una fecha. */
export function semillaDesdeTexto(texto: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < texto.length; i += 1) {
    h ^= texto.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h >>> 0;
}

export interface Aleatorio {
  /** Número en [0, 1). */
  siguiente(): number;
  /** Entero en [min, max], ambos incluidos. */
  entero(min: number, max: number): number;
  /** Un elemento al azar. */
  elegir<T>(lista: readonly T[]): T;
  /** Copia barajada de la lista. */
  barajar<T>(lista: readonly T[]): T[];
  /** Verdadero con la probabilidad dada. */
  probabilidad(p: number): boolean;
}

export function crearAleatorio(semilla: number | string): Aleatorio {
  let estado = (typeof semilla === 'string' ? semillaDesdeTexto(semilla) : semilla) >>> 0;

  const siguiente = () => {
    estado = (estado + 0x6d2b79f5) >>> 0;
    let t = estado;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };

  return {
    siguiente,
    entero: (min, max) => min + Math.floor(siguiente() * (max - min + 1)),
    elegir: (lista) => lista[Math.floor(siguiente() * lista.length)],
    barajar: (lista) => {
      const copia = [...lista];
      for (let i = copia.length - 1; i > 0; i -= 1) {
        const j = Math.floor(siguiente() * (i + 1));
        [copia[i], copia[j]] = [copia[j], copia[i]];
      }
      return copia;
    },
    probabilidad: (p) => siguiente() < p,
  };
}
