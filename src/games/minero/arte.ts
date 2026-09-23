/**
 * Arte de la cueva: la jugadora con su pico —el suyo, el que lleva equipado—
 * apoyada a un lado de la pared, con su mascota si tiene una. Va en la capa
 * del ojo dominante, así que nunca compite con el cristal.
 */
import { config, type Ojo } from '../../config';
import type { DichopticRenderer } from '../../engine/DichopticRenderer';
import type { AreaDeJuego } from '../comun';
import {
  avatarDeJuego,
  mascotaDeJuego,
  medida,
  picoDeJuego,
  spriteDeEquipo,
  type EquipoDeJuego,
} from '../../avatar/enJuego';

/**
 * Dibuja a la minera con su pico en el hueco que queda a la izquierda de la
 * pared, si cabe. Con la pared muy pegada al borde se omite: nunca debe tapar
 * un bloque.
 *
 * El hueco es el que hay entre el borde del área y la pared, que va centrada.
 * Medirlo desde el borde del lienzo dejaba siempre 16 píxeles y la minera no
 * llegaba a salir nunca.
 */
function anchoEnColumnas(mapa: string[]): number {
  return Math.max(...mapa.map((fila) => fila.length));
}

/**
 * Dibuja a la minera con su pico y su mascota en el hueco que queda a la
 * izquierda de la pared, si cabe. Con la pared muy pegada al borde se omite:
 * nunca debe tapar un bloque.
 *
 * El hueco es el que hay entre el borde del área y la pared, que va centrada.
 * Medirlo desde el borde del lienzo dejaba siempre 16 píxeles y la minera no
 * llegaba a salir nunca.
 */
export function dibujarMineraConPico(
  renderer: DichopticRenderer,
  area: AreaDeJuego,
  ladoDeBloque: number,
  xDeLaPared: number,
  equipo: EquipoDeJuego,
  ojoTapado: Ojo | null,
): void {
  const avatar = avatarDeJuego(equipo, { ojoTapado: ojoTapado ?? undefined });
  const pico = picoDeJuego(equipo);
  const mascota = mascotaDeJuego(equipo);

  // Todo va en fila y apoyado en el mismo suelo: la minera, su pico y su
  // mascota. La escala la manda el hueco, no el tamaño del bloque: con una
  // pared de pocos bloques los bloques son enormes y no cabría nada al lado.
  const piezas = mascota ? [avatar, pico, mascota] : [avatar, pico];
  const columnas = piezas.reduce((total, pieza) => total + anchoEnColumnas(pieza), 0) + piezas.length;
  const libre = xDeLaPared - area.x;
  const escala = Math.min(
    Math.max(1, Math.floor(ladoDeBloque / 16)),
    Math.floor(libre / columnas),
  );
  if (escala < 2) return;

  const anchoTotal = columnas * escala;
  const suelo = area.y + area.alto - config.minero.margenDePausaPx;
  let x = area.x + Math.floor((libre - anchoTotal) / 2);

  for (const pieza of piezas) {
    const suya = medida(pieza, escala);
    renderer.sprite('ojoDominante', spriteDeEquipo(pieza, renderer, equipo), x, suelo - suya.alto, escala);
    x += suya.ancho + escala;
  }
}
