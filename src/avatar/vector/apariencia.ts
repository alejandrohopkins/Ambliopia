/**
 * Apariencia del avatar: tono de piel y color de pelo. No se compran: se
 * eligen gratis en «Mi avatar» y se ven a través del visor del casco.
 */
export const PIELES: Record<string, string> = {
  'piel-clara': '#F7D9C4',
  'piel-rosada': '#EFC0A4',
  'piel-miel': '#DDA776',
  'piel-canela': '#B97A4E',
  'piel-cacao': '#8A5536',
  'piel-ebano': '#5C3622',
};

export const PELOS: Record<string, string> = {
  'pelo-castano': '#6B3E26',
  'pelo-negro': '#2B1F1C',
  'pelo-rubio': '#E6BC5C',
  'pelo-pelirrojo': '#C2502A',
  'pelo-lila': '#B08AE6',
  'pelo-azul': '#5B8FE0',
};

export interface Apariencia {
  piel: string;
  pelo: string;
}

export const APARIENCIA_INICIAL: Apariencia = {
  piel: 'piel-miel',
  pelo: 'pelo-castano',
};

export function colorDePiel(apariencia: Partial<Apariencia> | undefined): string {
  return PIELES[apariencia?.piel ?? ''] ?? PIELES[APARIENCIA_INICIAL.piel];
}

export function colorDePelo(apariencia: Partial<Apariencia> | undefined): string {
  return PELOS[apariencia?.pelo ?? ''] ?? PELOS[APARIENCIA_INICIAL.pelo];
}
