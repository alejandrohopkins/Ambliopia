/**
 * Figuras de la Torre de bloques.
 *
 * Regla: todas deben poder construirse por gravedad, así que se definen como
 * ALTURAS POR COLUMNA. Cada columna se llena de forma continua desde abajo,
 * sin huecos ni voladizos. La altura máxima es (filas del tablero − 2), para
 * que siempre quede sitio donde aparece la pieza.
 *
 * Los nombres visibles viven en i18n/es.ts.
 */
export interface Figura {
  id: string;
  mundo: number;
  alturas: number[];
  /** Colores por fila, solo para modo parche. Si falta, se usa la paleta. */
  coloresPorFila?: string[];
}

export const FIGURAS: Figura[] = [
  // Mundo 1 — tablero de 6 × 9, altura máxima 7.
  { id: 'escalera', mundo: 1, alturas: [1, 2, 3, 4, 5, 6] },
  { id: 'piramide', mundo: 1, alturas: [1, 2, 4, 4, 2, 1] },
  { id: 'torre', mundo: 1, alturas: [2, 2, 7, 7, 2, 2] },
  { id: 'copa', mundo: 1, alturas: [5, 2, 1, 1, 2, 5] },
  { id: 'muralla', mundo: 1, alturas: [5, 3, 5, 3, 5, 3] },

  // Mundo 2 — tablero de 8 × 11, altura máxima 9.
  { id: 'castillo', mundo: 2, alturas: [7, 7, 4, 5, 5, 4, 7, 7] },
  { id: 'cohete', mundo: 2, alturas: [2, 3, 6, 9, 9, 6, 3, 2] },
  { id: 'pino', mundo: 2, alturas: [1, 3, 5, 8, 8, 5, 3, 1] },
  { id: 'puente', mundo: 2, alturas: [6, 6, 2, 1, 1, 2, 6, 6] },
  { id: 'antena', mundo: 2, alturas: [1, 1, 2, 9, 9, 2, 1, 1] },

  // Mundo 3 — tablero de 10 × 13, altura máxima 11.
  { id: 'ciudad', mundo: 3, alturas: [3, 5, 2, 7, 4, 8, 3, 6, 2, 4] },
  { id: 'montana', mundo: 3, alturas: [1, 2, 4, 6, 9, 7, 5, 6, 3, 1] },
  { id: 'faro', mundo: 3, alturas: [1, 2, 2, 3, 11, 11, 3, 2, 2, 1] },
  { id: 'corona', mundo: 3, alturas: [6, 3, 5, 3, 7, 7, 3, 5, 3, 6] },
  { id: 'cascada', mundo: 3, alturas: [11, 9, 7, 5, 4, 3, 2, 2, 1, 1] },

  // Mundo 4 — tablero de 12 × 15, altura máxima 13.
  { id: 'robot', mundo: 4, alturas: [2, 6, 6, 2, 9, 11, 11, 9, 2, 6, 6, 2] },
  { id: 'castillo_grande', mundo: 4, alturas: [9, 9, 5, 6, 5, 12, 12, 5, 6, 5, 9, 9] },
  { id: 'puerto_espacial', mundo: 4, alturas: [10, 10, 4, 3, 3, 4, 10, 10, 4, 3, 3, 4] },
  { id: 'dragon', mundo: 4, alturas: [2, 3, 5, 8, 11, 13, 10, 7, 5, 4, 3, 2] },
  { id: 'doble_torre', mundo: 4, alturas: [1, 2, 4, 9, 12, 6, 6, 12, 9, 4, 2, 1] },

  // Mundo 5 — tablero de 12 × 15, altura máxima 13.
  { id: 'cohete_lunar', mundo: 5, alturas: [3, 2, 2, 4, 8, 13, 13, 8, 4, 2, 2, 3] },
  { id: 'estacion_orbital', mundo: 5, alturas: [5, 5, 8, 8, 11, 13, 13, 11, 8, 8, 5, 5] },
  { id: 'antena_larga', mundo: 5, alturas: [2, 2, 3, 3, 4, 13, 13, 4, 3, 3, 2, 2] },
  { id: 'cometa', mundo: 5, alturas: [1, 2, 3, 5, 8, 12, 13, 11, 8, 5, 3, 1] },
  { id: 'cristal_gigante', mundo: 5, alturas: [1, 3, 6, 9, 12, 13, 13, 12, 9, 6, 3, 1] },
];

export function figurasDelMundo(mundo: number): Figura[] {
  return FIGURAS.filter((f) => f.mundo === mundo);
}

/** Cada nivel de un mundo es una figura. */
export function figuraDeNivel(mundo: number, nivel: number): Figura {
  const delMundo = figurasDelMundo(mundo);
  return delMundo[Math.max(0, Math.min(delMundo.length - 1, nivel - 1))];
}

export function figuraPorId(id: string): Figura | undefined {
  return FIGURAS.find((f) => f.id === id);
}

/** Cuántos bloques hay que colocar para completar la figura. */
export function bloquesDeFigura(figura: Figura): number {
  return figura.alturas.reduce((total, altura) => total + altura, 0);
}
