/**
 * Arte del Túnel de escape, dibujado por código: las marcas del suelo y las
 * celdas de energía. La corredora es el avatar de la jugadora, con lo que
 * lleve puesto, así que se arma en el propio juego.
 */
import type { Capa, DichopticRenderer } from '../../engine/DichopticRenderer';

/**
 * Marca en el suelo: un óvalo aplastado bajo algo, dibujado en perspectiva.
 * Es lo que deja ver de un vistazo si la corredora va por el aire y a qué
 * altura, y a qué distancia está una celda de energía. Sin ella la escena es
 * plana y no hay manera de calcular cuándo llega nada.
 */
export function dibujarMarcaDeSuelo(
  renderer: DichopticRenderer,
  capa: Capa,
  cx: number,
  y: number,
  ancho: number,
  factor: number,
): void {
  const a = Math.max(2, ancho / 2);
  const b = Math.max(1, a * 0.3);
  renderer.poligono(
    capa,
    [
      [cx - a, y],
      [cx, y - b],
      [cx + a, y],
      [cx, y + b],
    ],
    { factor },
  );
}

/** Celda de energía: un rombo pequeño que gira sobre sí mismo. */
export function dibujarCeldaDeEnergia(
  renderer: DichopticRenderer,
  capa: Capa,
  cx: number,
  cy: number,
  lado: number,
  fase: number,
): void {
  // El giro solo estrecha el rombo: no hay cambios de luminancia.
  const ancho = Math.max(1, lado * (0.35 + 0.65 * Math.abs(Math.cos(fase * Math.PI * 2))));
  renderer.poligono(capa, [
    [cx, cy - lado],
    [cx + ancho, cy],
    [cx, cy + lado],
    [cx - ancho, cy],
  ]);
}
