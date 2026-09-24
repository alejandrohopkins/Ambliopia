/** Piezas compartidas por los minijuegos. */
import { config } from '../config';
import type { DichopticRenderer } from '../engine/DichopticRenderer';
import { nivelSuperado } from '../rewards/niveles';
import type { ResumenDeNivel } from './tipos';

/**
 * Estrellas del nivel: una por terminarlo, dos con buena precisión y tres al
 * superarlo, que es lo que abre el nivel siguiente. Como la escalera ajusta
 * la dificultad a cómo ve la jugadora, las tres son siempre alcanzables:
 * premian el esfuerzo y la constancia, no ver bien.
 */
export function estrellasDeNivel(resumen: Pick<ResumenDeNivel, 'precision' | 'objetivo'>): number {
  if (nivelSuperado(resumen)) return 3;
  return resumen.precision >= config.progresion.precisionDosEstrellas ? 2 : 1;
}

/**
 * Z hace lo mismo que Enter y X lo mismo que la barra espaciadora, para jugar
 * con una mano en esas teclas y la otra en las flechas.
 */
const TECLAS_GEMELAS: Record<string, string> = { z: 'Enter', x: ' ' };

/** La tecla de un evento de teclado, con Z y X ya traducidas. */
export function teclaDe(evento: Event): string {
  const tecla = (evento as KeyboardEvent).key;
  return TECLAS_GEMELAS[tecla.toLowerCase()] ?? tecla;
}

/** Acumula los ensayos de un nivel y produce su resumen. */
export class ContadorDeNivel {
  private ensayos = 0;
  private aciertos = 0;
  private tiemposDeReaccion: number[] = [];
  private readonly inicio = Date.now();

  registrar(acierto: boolean, tiempoReaccionMs: number, esEnsayoDeConfianza: boolean): void {
    // Los ensayos de confianza no miden nada: no entran en la precisión.
    if (esEnsayoDeConfianza) return;
    this.ensayos += 1;
    if (!acierto) return;
    this.aciertos += 1;
    this.tiemposDeReaccion.push(tiempoReaccionMs);
  }

  get total(): number {
    return this.ensayos;
  }

  get tiempoReaccionMedioMs(): number {
    if (this.tiemposDeReaccion.length === 0) return 0;
    return this.tiemposDeReaccion.reduce((a, b) => a + b, 0) / this.tiemposDeReaccion.length;
  }

  resumen(
    umbrales: Record<string, number>,
    objetivo?: ResumenDeNivel['objetivo'],
  ): ResumenDeNivel {
    const precision = this.ensayos > 0 ? this.aciertos / this.ensayos : 0;
    return {
      objetivo,
      ensayos: this.ensayos,
      aciertos: this.aciertos,
      precision,
      estrellas: estrellasDeNivel({ precision, objetivo }),
      umbrales,
      duracionMs: Date.now() - this.inicio,
    };
  }
}

export interface AreaDeJuego {
  x: number;
  y: number;
  ancho: number;
  alto: number;
}

/** Altura reservada arriba para el HUD, y marco del área de juego. */
export const ALTO_DE_HUD = 40;
export const MARGEN = 16;
export const GROSOR_DE_MARCO = 3;

export function areaDeJuego(renderer: DichopticRenderer): AreaDeJuego {
  return {
    x: MARGEN,
    y: ALTO_DE_HUD + MARGEN,
    ancho: Math.max(1, renderer.ancho - MARGEN * 2),
    alto: Math.max(1, renderer.alto - ALTO_DE_HUD - MARGEN * 2),
  };
}

/**
 * Marco y HUD: siempre en la capa 'ambos'. En modo lentes son las anclas de
 * fusión, lo único que los dos ojos ven igual.
 */
export function dibujarMarcoYHud(
  renderer: DichopticRenderer,
  izquierda: string,
  derecha: string,
  progreso?: number,
): void {
  const area = areaDeJuego(renderer);
  renderer.marco(
    'ambos',
    area.x - GROSOR_DE_MARCO,
    area.y - GROSOR_DE_MARCO,
    area.ancho + GROSOR_DE_MARCO * 2,
    area.alto + GROSOR_DE_MARCO * 2,
    GROSOR_DE_MARCO,
  );
  renderer.texto('ambos', izquierda, MARGEN, 10, 18, 'left');
  renderer.texto('ambos', derecha, renderer.ancho - MARGEN, 10, 18, 'right');

  if (progreso !== undefined) {
    const ancho = Math.max(0, Math.min(1, progreso)) * (renderer.ancho - MARGEN * 2);
    renderer.rect('ambos', MARGEN, ALTO_DE_HUD - 8, ancho, 4);
  }
}

/** Pulso suave del objetivo: nunca sube por encima del valor pedido. */
export function factorDePulso(tiempoMs: number, hz = config.minero.pulsoHz): number {
  const fase = (tiempoMs / 1000) * hz * Math.PI * 2;
  return 0.925 + 0.075 * Math.sin(fase);
}

/** Vértices de un círculo, para dibujarlo con el polígono sin suavizado. */
export function puntosDeCirculo(
  cx: number,
  cy: number,
  radio: number,
  lados = 16,
): Array<[number, number]> {
  return Array.from({ length: lados }, (_, i): [number, number] => {
    const angulo = (i / lados) * Math.PI * 2;
    return [cx + Math.cos(angulo) * radio, cy + Math.sin(angulo) * radio];
  });
}
