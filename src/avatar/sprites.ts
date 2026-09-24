/**
 * Sprites como mapas de caracteres. Diseño propio: casco cuadrado con antena,
 * visor rectangular y traje de bloque. Nada copiado de ningún juego existente.
 *
 * Paleta de caracteres:
 *   '.' transparente · 'K' contorno · 'H' casco · 'V' visor · 'B' traje · 'P' parche
 */
import type { Ojo } from '../config';

export type MapaDePixeles = string[];

export const PIXELNAUTA: MapaDePixeles = [
  '....KK....',
  '....K.....',
  '.KKKKKKKK.',
  '.KHHHHHHK.',
  '.KHVVVVHK.',
  '.KHVVVVHK.',
  '.KHHHHHHK.',
  '.KKKKKKKK.',
  'KBBBBBBBBK',
  'KBKBBBBKBK',
  'KBKBBBBKBK',
  '..KBBBBK..',
  '..KBKKBK..',
  '..KKKKKK..',
];

/**
 * Lado de la imagen donde cae un ojo del avatar. Nos mira de frente, así que
 * su ojo derecho cae a la izquierda de quien mira.
 */
export function ladoEnLaImagen(ojo: Ojo): 'izquierda' | 'derecha' {
  return ojo === 'derecho' ? 'izquierda' : 'derecha';
}

/**
 * La misma pixelnauta con el parche sobre un ojo.
 * Sirve para cualquier avatar compuesto, no solo para el de serie.
 */
export function conParche(ojoTapado: Ojo, mapa: MapaDePixeles = PIXELNAUTA): MapaDePixeles {
  const ladoIzquierdoDeLaImagen = ladoEnLaImagen(ojoTapado) === 'izquierda';
  return mapa.map((fila, y) => {
    if (y < 4 || y > 5) return fila;
    return [...fila]
      .map((caracter, x) => {
        if (caracter !== 'V') return caracter;
        const enEseLado = ladoIzquierdoDeLaImagen ? x < 6 : x >= 6;
        return enEseLado ? 'P' : caracter;
      })
      .join('');
  }).map((fila, y) => (y === 3 || y === 6 ? marcarCinta(fila, ojoTapado) : fila));
}

/** La cinta del parche cruza el casco por encima y por debajo del visor. */
function marcarCinta(fila: string, ojoTapado: Ojo): string {
  const columna = ojoTapado === 'derecho' ? 4 : 7;
  if (fila[columna] !== 'H') return fila;
  return fila.slice(0, columna) + 'P' + fila.slice(columna + 1);
}

export interface PaletaDeSprite {
  K: string;
  H: string;
  V: string;
  B: string;
  /** Segundo tono del traje, para los de rayas. */
  C: string;
  P: string;
}

export const PALETA_POR_DEFECTO: PaletaDeSprite = {
  K: '#0F0A2C',
  H: '#EDE9FF',
  V: '#3FD6C6',
  B: '#5B3FA0',
  C: '#7A5CC6',
  P: '#191233',
};
