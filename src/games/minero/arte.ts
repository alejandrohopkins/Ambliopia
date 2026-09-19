/**
 * Arte de la cueva, dibujado por código: la pixelnauta con su pico, apoyada a
 * un lado de la pared. Va en la capa del ojo dominante, así que nunca compite
 * con el cristal.
 */
import type { DichopticRenderer, Sprite } from '../../engine/DichopticRenderer';
import type { AreaDeJuego } from '../comun';
import { PIXELNAUTA } from '../../avatar/sprites';

/** Pico de minería: mango y cabeza. */
export const PICO: string[] = [
  '..KKK..',
  '.KMMMK.',
  'KM...MK',
  'K..P..K',
  '...P...',
  '...P...',
  '...P...',
];

function spriteDe(pixeles: string[], renderer: DichopticRenderer): Sprite {
  const { paleta } = renderer;
  return {
    pixeles,
    paleta: {
      K: { color: '#0F0A2C', factorLentes: 0.45 },
      H: { color: paleta.hud, factorLentes: 1 },
      V: { color: paleta.acento, factorLentes: 0.8 },
      B: { color: paleta.primario, factorLentes: 0.7 },
      M: { color: paleta.secundario, factorLentes: 0.8 },
      P: { color: '#6B4F26', factorLentes: 0.55 },
    },
  };
}

/**
 * Dibuja a la minera con su pico en el margen libre, si cabe.
 * Con la pared muy pegada al borde se omite: nunca debe tapar un bloque.
 */
export function dibujarMineraConPico(
  renderer: DichopticRenderer,
  area: AreaDeJuego,
  ladoDeBloque: number,
): void {
  const escala = Math.max(1, Math.floor(ladoDeBloque / 16));
  const anchoNauta = PIXELNAUTA[0].length * escala;
  const anchoPico = PICO[0].length * escala;
  const necesario = anchoNauta + anchoPico + escala * 2;

  const libreIzquierda = area.x;
  if (libreIzquierda < necesario) return;

  const y = area.y + area.alto - PIXELNAUTA.length * escala;
  renderer.sprite('ojoDominante', spriteDe(PIXELNAUTA, renderer), 2, y, escala);
  renderer.sprite(
    'ojoDominante',
    spriteDe(PICO, renderer),
    2 + anchoNauta + escala,
    y + escala * 2,
    escala,
  );
}
