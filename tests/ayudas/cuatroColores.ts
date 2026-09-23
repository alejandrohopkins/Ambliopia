/**
 * Comprobación de la regla de los cuatro colores sobre un lienzo falso: cada
 * color que se usó para pintar tiene que ser negro, rojo puro, cian puro o el
 * gris neutro de su banda, sin pasar los máximos calibrados.
 */
import { colorPermitidoEnLentes, leerCss } from '../../src/engine/color';
import type { LienzoFalso } from './lienzoFalso';
import { LENTES_DE_PRUEBA } from './juegoFalso';

export function coloresProhibidos(lienzo: LienzoFalso): string[] {
  const prohibidos = new Set<string>();
  for (const css of lienzo.pintados) {
    const rgb = leerCss(css);
    if (!rgb || !colorPermitidoEnLentes(rgb, LENTES_DE_PRUEBA)) prohibidos.add(css);
  }
  return [...prohibidos];
}
