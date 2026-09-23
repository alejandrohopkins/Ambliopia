/**
 * Arte del Túnel de escape, dibujado por código.
 * La corredora es la misma pixelnauta de la base, reducida a bloques: casco
 * con visor, traje, mochila y piernas que alternan al correr.
 */
import type { Capa, DichopticRenderer } from '../../engine/DichopticRenderer';
import type { Postura } from './pista';

export interface CajaDeCorredora {
  x: number;
  /** Borde inferior: los pies. */
  suelo: number;
  ancho: number;
  alto: number;
}

/**
 * Dibuja la corredora dentro de su caja. `fase` va de 0 a 1 y solo mueve las
 * piernas: es el paso de carrera, sin cambios de luminancia.
 */
export function dibujarCorredora(
  renderer: DichopticRenderer,
  capa: Capa,
  caja: CajaDeCorredora,
  postura: Postura,
  fase: number,
): void {
  const { x, suelo, ancho, alto } = caja;
  const tono = renderer.paleta.primario;
  const claro = renderer.paleta.acento;
  const px = Math.max(1, Math.round(Math.min(ancho, alto) / 8));

  if (postura === 'deslizando') {
    // Rodando: cuerpo tumbado, casco por delante.
    const altoCuerpo = Math.max(px * 2, alto * 0.62);
    const y = suelo - altoCuerpo;
    renderer.rect(capa, x + ancho * 0.1, y, ancho * 0.7, altoCuerpo, { tono });
    renderer.rect(capa, x + ancho * 0.66, y - px, ancho * 0.3, altoCuerpo + px, { tono });
    renderer.rect(capa, x + ancho * 0.74, y + px, ancho * 0.16, altoCuerpo * 0.4, {
      tono: claro,
      factor: 0.85,
    });
    return;
  }

  const anchoCuerpo = ancho * 0.6;
  const x0 = x + (ancho - anchoCuerpo) / 2;
  const altoCasco = alto * 0.3;
  const altoTronco = alto * 0.4;
  const altoPiernas = alto - altoCasco - altoTronco;
  const yCasco = suelo - alto;
  const yTronco = yCasco + altoCasco;
  const yPiernas = yTronco + altoTronco;

  // Mochila, para que se lea de espaldas.
  renderer.rect(capa, x0 - px, yTronco, px * 1.5, altoTronco * 0.8, { tono, factor: 0.7 });
  renderer.rect(capa, x0, yCasco, anchoCuerpo, altoCasco, { tono });
  renderer.rect(capa, x0 + anchoCuerpo * 0.18, yCasco + altoCasco * 0.3, anchoCuerpo * 0.64, altoCasco * 0.4, {
    tono: claro,
    factor: 0.9,
  });
  renderer.rect(capa, x0, yTronco, anchoCuerpo, altoTronco, { tono });

  // Piernas: una adelante y otra atrás, según el paso.
  const abierta = postura === 'saltando' ? 0.9 : Math.abs(Math.sin(fase * Math.PI * 2));
  const anchoPierna = anchoCuerpo * 0.34;
  const separacion = anchoPierna * (0.4 + abierta);
  renderer.rect(capa, x0 + anchoCuerpo / 2 - separacion - anchoPierna / 2, yPiernas, anchoPierna, altoPiernas, {
    tono,
    factor: 0.8,
  });
  renderer.rect(capa, x0 + anchoCuerpo / 2 + separacion - anchoPierna / 2, yPiernas, anchoPierna, altoPiernas, {
    tono,
  });
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
