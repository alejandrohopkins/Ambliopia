/**
 * Base común de los minijuegos por módulo.
 *
 * Bucle, pausa, oyentes, registro de ensayos y cierre del nivel viven aquí:
 * cada juego solo escribe su simulación y su dibujo. Así los diez juegos se
 * comportan igual en lo que importa para el tratamiento —cómo se mide, cómo
 * se guarda y cómo termina un nivel— y no puede haber uno que se olvide de
 * anotar un ensayo o de quitar sus oyentes.
 */
import { config, type IdJuego } from '../config';
import { es } from '../i18n/es';
import { crearAleatorio, type Aleatorio } from '../engine/rng';
import type { Staircase } from '../engine/Staircase';
import type { DichopticRenderer } from '../engine/DichopticRenderer';
import { GameLoop } from '../engine/GameLoop';
import { ContadorDeNivel, areaDeJuego, type AreaDeJuego } from './comun';
import {
  claveDeEscalera,
  type ContextoDeJuego,
  type InstanciaDeJuego,
  type ResumenDeNivel,
} from './tipos';

/** Avance de 0 a 1 a lo largo de los veinticinco niveles. */
export function avanceDeNivel(mundo: number, nivel: number): number {
  const niveles = config.progresion.mundos * config.progresion.nivelesPorMundo;
  const indice = (mundo - 1) * config.progresion.nivelesPorMundo + (nivel - 1);
  return niveles > 1 ? Math.max(0, Math.min(1, indice / (niveles - 1))) : 0;
}

/** Un parámetro que va del primer nivel al último en línea recta. */
export function segunNivel(mundo: number, nivel: number, desde: number, hasta: number): number {
  return desde + (hasta - desde) * avanceDeNivel(mundo, nivel);
}

/** Lo mismo, redondeado: para cantidades que tienen que ser enteras. */
export function enteroSegunNivel(mundo: number, nivel: number, desde: number, hasta: number): number {
  return Math.round(segunNivel(mundo, nivel, desde, hasta));
}

/** El valor que toca en un mundo, de una lista con uno por mundo. */
export function delMundo<T>(lista: readonly T[], mundo: number): T {
  return lista[Math.max(0, Math.min(lista.length - 1, mundo - 1))];
}

/** Umbral de cada escalera, con la clave sin juego ni modo. */
export function umbralesDe(escaleras: Record<string, Staircase>): Record<string, number> {
  const umbrales: Record<string, number> = {};
  for (const [clave, escalera] of Object.entries(escaleras)) {
    umbrales[clave.split(':').slice(2).join(':')] = escalera.threshold();
  }
  return umbrales;
}

export interface EnsayoAnotado {
  parametro: string;
  valor: number;
  acierto: boolean;
  tiempoReaccionMs: number;
  esEnsayoDeConfianza: boolean;
  detalle?: string;
}

export abstract class JuegoBase implements InstanciaDeJuego {
  protected readonly bucle: GameLoop;
  protected readonly contador = new ContadorDeNivel();
  protected readonly aleatorio: Aleatorio;
  protected terminado = false;
  protected destruido = false;
  private readonly quitarOyentes: Array<() => void> = [];

  constructor(
    protected readonly canvas: HTMLCanvasElement,
    protected readonly ctx: ContextoDeJuego,
    protected readonly id: IdJuego,
  ) {
    this.aleatorio = crearAleatorio(`${id}:${ctx.mundo}:${ctx.nivel}:${Date.now()}`);
    this.bucle = new GameLoop((dt, tiempo) => {
      if (this.destruido || this.terminado) return;
      this.cuadro(dt, tiempo);
    });
  }

  iniciar(): void {
    this.alIniciar();
    this.bucle.iniciar();
  }

  pausar(): void {
    this.bucle.pausar();
  }

  reanudar(): void {
    this.bucle.reanudar();
  }

  destruir(): void {
    this.destruido = true;
    this.bucle.detener();
    for (const quitar of this.quitarOyentes) quitar();
    this.quitarOyentes.length = 0;
  }

  fps(): number {
    return this.bucle.fps;
  }

  protected get renderer(): DichopticRenderer {
    return this.ctx.renderer;
  }

  protected get area(): AreaDeJuego {
    return areaDeJuego(this.ctx.renderer);
  }

  /** Registra un oyente que se quita solo al destruir el juego. */
  protected escuchar(
    objetivo: Window | HTMLElement,
    tipo: string,
    alPasar: (evento: Event) => void,
  ): void {
    objetivo.addEventListener(tipo, alPasar);
    this.quitarOyentes.push(() => objetivo.removeEventListener(tipo, alPasar));
  }

  /** Posición del puntero en píxeles CSS del lienzo. */
  protected puntoDe(evento: PointerEvent): { x: number; y: number } {
    const caja = this.canvas.getBoundingClientRect();
    return { x: evento.clientX - caja.left, y: evento.clientY - caja.top };
  }

  /** La escalera de un parámetro de este juego en el modo actual. */
  protected escalera(parametro: string): Staircase | undefined {
    return this.ctx.escaleras[claveDeEscalera(this.id, this.ctx.modo, parametro)];
  }

  /** Anota un ensayo en su escalera, en el contador del nivel y en las métricas. */
  protected anotar(ensayo: EnsayoAnotado): void {
    this.escalera(ensayo.parametro)?.record(ensayo.acierto, ensayo.esEnsayoDeConfianza);
    this.contador.registrar(ensayo.acierto, ensayo.tiempoReaccionMs, ensayo.esEnsayoDeConfianza);
    this.ctx.onEnsayo({ juego: this.id, modo: this.ctx.modo, ...ensayo });
  }

  /**
   * La explicación del juego, en los primeros segundos de cada nivel.
   * Va en la capa de ambos ojos sobre un recuadro vacío, para que se lea
   * aunque pase algo por detrás.
   */
  protected dibujarAyuda(tiempoMs: number): void {
    const lineas = es.ayudas[this.id];
    if (!lineas || tiempoMs > config.modulos.ayudaSeg * 1000) return;
    const { renderer, area } = this;
    const tamano = config.accesibilidad.textoMinimoPx + 2;
    const alto = lineas.length * (tamano + 6) + 16;
    const ancho = Math.min(area.ancho, 360);
    const x = area.x + (area.ancho - ancho) / 2;
    const y = area.y + 12;
    renderer.borrar(x, y, ancho, alto);
    renderer.marco('ambos', x, y, ancho, alto, 2);
    lineas.forEach((linea, i) => {
      renderer.texto('ambos', linea, x + ancho / 2, y + 8 + i * (tamano + 6), tamano, 'center');
    });
  }

  protected terminarNivel(objetivo?: ResumenDeNivel['objetivo']): void {
    if (this.terminado) return;
    this.terminado = true;
    this.bucle.detener();
    this.ctx.onFinNivel(this.contador.resumen(umbralesDe(this.ctx.escaleras), objetivo));
  }

  /** Lo que el juego prepara antes de que arranque el bucle. */
  protected abstract alIniciar(): void;

  /** Un cuadro: simular y dibujar. Nunca se llama con el juego terminado. */
  protected abstract cuadro(dtMs: number, tiempoMs: number): void;
}
