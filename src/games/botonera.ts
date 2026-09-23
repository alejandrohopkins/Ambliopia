/**
 * Botones en pantalla para jugar con el dedo en la tablet.
 *
 * Todos van en la capa de ambos ojos —son parte del marco, no de la tarea— y
 * miden como mínimo lo que pide la accesibilidad. Se colocan centrados en la
 * franja de abajo del área de juego.
 */
import { config } from '../config';
import type { DichopticRenderer } from '../engine/DichopticRenderer';
import type { AreaDeJuego } from './comun';

export type Icono = 'izquierda' | 'derecha' | 'arriba' | 'abajo' | 'girar';

export interface Boton<Id extends string = string> {
  id: Id;
  icono: Icono;
  x: number;
  y: number;
  lado: number;
}

/** Lado de un botón: el mínimo accesible o un poco más. */
export function ladoDeBoton(): number {
  return Math.max(config.accesibilidad.botonMinimoPx, 54);
}

/**
 * Una fila de botones centrada, pegada abajo del área. Si la pantalla es
 * estrecha se corre a la derecha para no tapar el botón de pausa.
 */
export function botonera<Id extends string>(
  area: AreaDeJuego,
  botones: Array<{ id: Id; icono: Icono }>,
  separacionInferior = 0,
): Array<Boton<Id>> {
  const lado = ladoDeBoton();
  const y = area.y + area.alto - lado - separacionInferior;
  const hueco = lado * 1.15;
  const centro = area.x + area.ancho / 2;
  const inicio = Math.max(
    centro - (hueco * (botones.length - 1)) / 2 - lado / 2,
    config.modulos.zonaDePausaPx,
  );
  return botones.map((boton, i) => ({ ...boton, x: inicio + hueco * i, y, lado }));
}

/** Alto que ocupa una fila de botones, con su respiro. */
export function altoDeBotonera(): number {
  return ladoDeBoton() + 12;
}

/** Cruceta de cuatro direcciones, en la esquina inferior derecha. */
export function cruceta<Id extends string>(
  area: AreaDeJuego,
  ids: { arriba: Id; abajo: Id; izquierda: Id; derecha: Id },
): Array<Boton<Id>> {
  const lado = ladoDeBoton();
  const paso = lado * 1.08;
  const cx = area.x + area.ancho - paso * 1.5 - 4;
  const cy = area.y + area.alto - paso * 1.5 - 4;
  return [
    { id: ids.arriba, icono: 'arriba' as const, x: cx - lado / 2, y: cy - paso - lado / 2, lado },
    { id: ids.abajo, icono: 'abajo' as const, x: cx - lado / 2, y: cy + paso - lado / 2, lado },
    { id: ids.izquierda, icono: 'izquierda' as const, x: cx - paso - lado / 2, y: cy - lado / 2, lado },
    { id: ids.derecha, icono: 'derecha' as const, x: cx + paso - lado / 2, y: cy - lado / 2, lado },
  ];
}

export function botonEn<Id extends string>(botones: Array<Boton<Id>>, x: number, y: number): Id | null {
  for (const boton of botones) {
    if (x >= boton.x && x <= boton.x + boton.lado && y >= boton.y && y <= boton.y + boton.lado) {
      return boton.id;
    }
  }
  return null;
}

/** Dibuja cada botón: un marco con su flecha o su giro dentro. */
export function dibujarBotonera(renderer: DichopticRenderer, botones: Boton[], factor = 0.8): void {
  for (const boton of botones) {
    renderer.marco('ambos', boton.x, boton.y, boton.lado, boton.lado, 2, { factor });
    const cx = boton.x + boton.lado / 2;
    const cy = boton.y + boton.lado / 2;
    const r = boton.lado / 5;

    if (boton.icono === 'girar') {
      renderer.anilloConAbertura('ambos', cx, cy, r * 2.4, Math.max(2, r / 2.2), 3, 0.45, { factor });
      renderer.poligono(
        'ambos',
        [
          [cx + r * 0.2, cy - r * 1.9],
          [cx + r * 1.5, cy - r * 1.2],
          [cx + r * 0.2, cy - r * 0.5],
        ],
        { factor },
      );
      continue;
    }

    const flechas: Record<Exclude<Icono, 'girar'>, Array<[number, number]>> = {
      izquierda: [
        [cx - r, cy],
        [cx + r, cy - r],
        [cx + r, cy + r],
      ],
      derecha: [
        [cx + r, cy],
        [cx - r, cy - r],
        [cx - r, cy + r],
      ],
      arriba: [
        [cx, cy - r],
        [cx + r, cy + r],
        [cx - r, cy + r],
      ],
      abajo: [
        [cx, cy + r],
        [cx - r, cy - r],
        [cx + r, cy - r],
      ],
    };
    renderer.poligono('ambos', flechas[boton.icono], { factor });
  }
}
