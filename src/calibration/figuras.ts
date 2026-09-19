/**
 * Figuras del escáner previo y del patrón de verificación.
 * Mapas de píxeles propios: nada de iconos ni fuentes de terceros.
 */
export interface Figura {
  id: string;
  pixeles: string[];
}

export const FIGURAS: Figura[] = [
  {
    id: 'circulo',
    pixeles: [
      '...###...',
      '.#######.',
      '.#######.',
      '#########',
      '#########',
      '#########',
      '.#######.',
      '.#######.',
      '...###...',
    ],
  },
  {
    id: 'triangulo',
    pixeles: [
      '....#....',
      '....#....',
      '...###...',
      '...###...',
      '..#####..',
      '..#####..',
      '.#######.',
      '#########',
      '#########',
    ],
  },
  {
    id: 'cuadrado',
    pixeles: [
      '#########',
      '#########',
      '##.....##',
      '##.....##',
      '##.....##',
      '##.....##',
      '##.....##',
      '#########',
      '#########',
    ],
  },
  {
    id: 'rombo',
    pixeles: [
      '....#....',
      '...###...',
      '..#####..',
      '.#######.',
      '#########',
      '.#######.',
      '..#####..',
      '...###...',
      '....#....',
    ],
  },
  {
    id: 'cruz',
    pixeles: [
      '##.....##',
      '###...###',
      '.###.###.',
      '..#####..',
      '...###...',
      '..#####..',
      '.###.###.',
      '###...###',
      '##.....##',
    ],
  },
];

export function figuraPorId(id: string): Figura {
  return FIGURAS.find((f) => f.id === id) ?? FIGURAS[0];
}
