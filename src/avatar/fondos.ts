/**
 * Fondos de la base: el paisaje detrás del avatar.
 *
 * Es la categoría que menos se notaba —se compraba y no cambiaba nada—, así
 * que cada fondo trae su cielo, su suelo y sus adornos, dibujados como píxeles
 * sobre una rejilla de 32 × 18 igual que el arte de los portales.
 */
export interface FondoDeBase {
  cielo: string;
  suelo: string;
  adorno: string;
  /** Píxeles de adorno: [x, y] en la rejilla, con el suelo en las filas 15-17. */
  puntos: Array<[number, number]>;
}

/** Salpicado regular pero sin simetría, para que no parezca una cuadrícula. */
function sembrar(semilla: number, cuantos: number): Array<[number, number]> {
  const puntos: Array<[number, number]> = [];
  let valor = semilla;
  for (let i = 0; i < cuantos; i += 1) {
    valor = (valor * 1103515245 + 12345) % 2147483648;
    puntos.push([valor % 32, Math.floor(valor / 32) % 14]);
  }
  return puntos;
}

export const FONDOS: Record<string, FondoDeBase> = {
  'fondo-base-lunar': {
    cielo: '#1B1633',
    suelo: '#5B3FA0',
    adorno: '#3D3564',
    puntos: sembrar(7, 26),
  },
  'fondo-jardin': {
    cielo: '#16301F',
    suelo: '#4F9B3A',
    adorno: '#2E6B33',
    // Tallos que suben del suelo.
    puntos: [
      [3, 13], [3, 12], [4, 12], [8, 13], [8, 12], [8, 11], [7, 11],
      [14, 13], [14, 12], [15, 12], [21, 13], [21, 12], [21, 11], [22, 11],
      [27, 13], [27, 12], [26, 12], [30, 13], [30, 12],
    ],
  },
  'fondo-nebulosa': {
    cielo: '#1B1446',
    suelo: '#6F4FBD',
    adorno: '#D6A8FF',
    puntos: sembrar(31, 34),
  },
  'fondo-taller': {
    cielo: '#251C14',
    suelo: '#8A5A2B',
    adorno: '#4A3A24',
    // Estantes y cajas apiladas.
    puntos: [
      [2, 13], [3, 13], [4, 13], [2, 12], [3, 12], [4, 12],
      [6, 13], [7, 13], [6, 12],
      [24, 13], [25, 13], [26, 13], [24, 12], [25, 12],
      [28, 13], [29, 13], [28, 12], [29, 12], [28, 11], [29, 11],
      [0, 6], [1, 6], [2, 6], [3, 6], [28, 6], [29, 6], [30, 6], [31, 6],
    ],
  },
  'fondo-hielo': {
    cielo: '#0F2028',
    suelo: '#4FB8C6',
    adorno: '#2C6A75',
    // Estalactitas colgando del techo y picos en el suelo.
    puntos: [
      [4, 0], [4, 1], [4, 2], [5, 0], [5, 1], [12, 0], [12, 1],
      [19, 0], [19, 1], [19, 2], [19, 3], [20, 0], [20, 1], [27, 0], [27, 1], [27, 2],
      [1, 13], [1, 12], [9, 13], [9, 12], [9, 11], [10, 13],
      [17, 13], [23, 13], [23, 12], [30, 13], [30, 12], [31, 13],
    ],
  },
};

export const FONDO_POR_DEFECTO = 'fondo-base-lunar';

export function fondoDeBase(id: string | undefined): FondoDeBase {
  return (id && FONDOS[id]) || FONDOS[FONDO_POR_DEFECTO];
}
