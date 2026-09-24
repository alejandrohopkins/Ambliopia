/**
 * Detector de patrones (módulo de parche).
 * Habilidad: sensibilidad al contraste.
 *
 * Una rejilla de parches de rayas sobre un panel gris. Todos tienen las rayas
 * igual de giradas menos uno: hay que encontrarlo. Cada rejilla es un ensayo.
 * La escalera mueve el contraste de Michelson de las rayas —el que de verdad
 * queda en 8 bits—; el nivel sube la frecuencia espacial, acerca las
 * orientaciones, agranda la rejilla y, en los últimos mundos, pone un límite
 * de tiempo.
 */
import { config, type Modo } from '../../config';
import type { ConfigDeEscalera } from '../../engine/Staircase';
import { gris, aCss } from '../../engine/color';
import { JuegoBase } from '../base';
import { dibujarMarcoYHud, teclaDe } from '../comun';
import { claveDeEscalera, type ContextoDeJuego, type Minijuego } from '../tipos';
import { crearParche, dificultadDeGabor, grisDeFondo, orientaciones, type Parche } from './parche';

const PARAMETRO = 'contraste';

export function escalerasDeGabor(modo: Modo): ConfigDeEscalera[] {
  return [
    {
      clave: claveDeEscalera('gabor', modo, PARAMETRO),
      valorInicial: config.gabor.contrasteInicial,
      minimo: config.gabor.contrasteMinimo,
      maximo: config.gabor.contrasteMaximo,
    },
  ];
}

/** Pasa un parche a un lienzo aparte, para dibujarlo cada cuadro sin recalcularlo. */
function aLienzo(parche: Parche): HTMLCanvasElement {
  const lienzo = document.createElement('canvas');
  lienzo.width = parche.lado;
  lienzo.height = parche.lado;
  const ctx = lienzo.getContext('2d');
  if (!ctx) return lienzo;
  const imagen = ctx.createImageData(parche.lado, parche.lado);
  parche.grises.forEach((valor, i) => {
    imagen.data[i * 4] = valor;
    imagen.data[i * 4 + 1] = valor;
    imagen.data[i * 4 + 2] = valor;
    imagen.data[i * 4 + 3] = 255;
  });
  ctx.putImageData(imagen, 0, 0);
  return lienzo;
}

interface Ensayo {
  distinto: number;
  lienzos: HTMLCanvasElement[];
  contrasteReal: number;
  esEnsayoDeConfianza: boolean;
  inicioMs: number;
  elegido: number | null;
  /** Mientras se enseña la respuesta, hasta este instante. */
  revelarHastaMs: number | null;
}

class InstanciaDeGabor extends JuegoBase {
  private readonly dificultad: ReturnType<typeof dificultadDeGabor>;
  private ensayo: Ensayo | null = null;
  private hechos = 0;
  private encontrados = 0;
  private tiempoMs = 0;
  private cursor = 0;
  private conTeclado = false;

  constructor(canvas: HTMLCanvasElement, ctx: ContextoDeJuego) {
    super(canvas, ctx, 'gabor');
    this.dificultad = dificultadDeGabor(ctx.mundo, ctx.nivel);
  }

  private get cuantos(): number {
    return this.dificultad.rejilla.cols * this.dificultad.rejilla.filas;
  }

  protected alIniciar(): void {
    this.escuchar(this.canvas, 'pointerdown', (evento) => {
      const { x, y } = this.puntoDe(evento as PointerEvent);
      this.conTeclado = false;
      const indice = this.celdaEn(x, y);
      if (indice !== null) this.elegir(indice);
    });
    this.escuchar(window, 'keydown', (evento) => {
      const { cols } = this.dificultad.rejilla;
      const tecla = teclaDe(evento);
      const col = this.cursor % cols;
      if (tecla === 'ArrowLeft' && col > 0) this.cursor -= 1;
      else if (tecla === 'ArrowRight' && col < cols - 1) this.cursor += 1;
      else if (tecla === 'ArrowUp' && this.cursor >= cols) this.cursor -= cols;
      else if (tecla === 'ArrowDown' && this.cursor + cols < this.cuantos) this.cursor += cols;
      else if (tecla === ' ' || tecla === 'Enter') this.elegir(this.cursor);
      else if (!tecla.startsWith('Arrow')) return;
      this.conTeclado = true;
      evento.preventDefault();
    });
  }

  // -------------------------------------------------------------------------
  // Geometría
  // -------------------------------------------------------------------------

  private celda(): number {
    const { area } = this;
    const { cols, filas } = this.dificultad.rejilla;
    return Math.floor(Math.min(area.ancho / cols, (area.alto - config.modulos.margenInferiorPx) / filas));
  }

  private ladoDeParche(): number {
    return Math.floor(Math.min(config.gabor.parcheMaximoPx, this.celda() * config.gabor.fraccionDeCelda));
  }

  private origen(): { x: number; y: number } {
    const { area } = this;
    const { cols, filas } = this.dificultad.rejilla;
    const celda = this.celda();
    return {
      x: area.x + (area.ancho - celda * cols) / 2,
      y: area.y + (area.alto - config.modulos.margenInferiorPx - celda * filas) / 2,
    };
  }

  private caja(indice: number): { x: number; y: number; lado: number } {
    const { cols } = this.dificultad.rejilla;
    const celda = this.celda();
    const lado = this.ladoDeParche();
    const origen = this.origen();
    return {
      x: origen.x + (indice % cols) * celda + (celda - lado) / 2,
      y: origen.y + Math.floor(indice / cols) * celda + (celda - lado) / 2,
      lado,
    };
  }

  private celdaEn(x: number, y: number): number | null {
    const { cols, filas } = this.dificultad.rejilla;
    const celda = this.celda();
    const origen = this.origen();
    const col = Math.floor((x - origen.x) / celda);
    const fila = Math.floor((y - origen.y) / celda);
    if (col < 0 || col >= cols || fila < 0 || fila >= filas) return null;
    return fila * cols + col;
  }

  // -------------------------------------------------------------------------
  // Ensayos
  // -------------------------------------------------------------------------

  private nuevoEnsayo(): void {
    const propuesto = this.escalera(PARAMETRO)?.proximoEnsayo() ?? {
      valor: config.gabor.contrasteInicial,
      esEnsayoDeConfianza: false,
    };
    const distinto = this.aleatorio.entero(0, this.cuantos - 1);
    const giros = orientaciones(
      this.cuantos,
      distinto,
      this.aleatorio.siguiente() * Math.PI,
      this.dificultad.diferenciaGrados,
    );
    const lado = this.ladoDeParche();
    const parches = giros.map((orientacion) =>
      crearParche({
        lado,
        ciclos: this.dificultad.ciclos,
        orientacion,
        contraste: propuesto.valor,
        fase: this.aleatorio.siguiente() * Math.PI * 2,
      }),
    );

    this.ensayo = {
      distinto,
      lienzos: parches.map(aLienzo),
      contrasteReal: parches[distinto].contrasteReal,
      esEnsayoDeConfianza: propuesto.esEnsayoDeConfianza,
      inicioMs: this.tiempoMs,
      elegido: null,
      revelarHastaMs: null,
    };
  }

  /** Elegir un parche, o quedarse sin tiempo (índice null). */
  private elegir(indice: number | null): void {
    const ensayo = this.ensayo;
    if (!ensayo || ensayo.revelarHastaMs !== null) return;
    const acierto = indice === ensayo.distinto;
    ensayo.elegido = indice;
    ensayo.revelarHastaMs = this.tiempoMs + config.modulos.revelarMs;
    this.hechos += 1;
    if (acierto) this.encontrados += 1;
    this.anotar({
      parametro: PARAMETRO,
      valor: ensayo.contrasteReal,
      acierto,
      tiempoReaccionMs: this.tiempoMs - ensayo.inicioMs,
      esEnsayoDeConfianza: ensayo.esEnsayoDeConfianza,
    });
  }

  protected cuadro(_dtMs: number, tiempoMs: number): void {
    this.tiempoMs = tiempoMs;
    const ensayo = this.ensayo;

    // El primero espera a que se lea la explicación.
    if (!ensayo && tiempoMs >= config.modulos.ayudaSeg * 1000) this.nuevoEnsayo();

    if (ensayo && ensayo.revelarHastaMs === null && this.dificultad.limiteSeg > 0) {
      if (tiempoMs - ensayo.inicioMs >= this.dificultad.limiteSeg * 1000) this.elegir(null);
    }

    if (ensayo && ensayo.revelarHastaMs !== null && tiempoMs >= ensayo.revelarHastaMs) {
      if (this.hechos >= config.gabor.ensayosPorNivel) {
        this.terminarNivel();
        return;
      }
      this.nuevoEnsayo();
    }

    this.dibujar(tiempoMs);
  }

  // -------------------------------------------------------------------------
  // Dibujo
  // -------------------------------------------------------------------------

  private dibujar(tiempoMs: number): void {
    const { renderer } = this;
    const { cols, filas } = this.dificultad.rejilla;
    const celda = this.celda();
    const origen = this.origen();
    renderer.limpiar();

    // El panel gris es el mismo gris medio de los parches: así sus bordes no se ven.
    renderer.rect('ambos', origen.x, origen.y, celda * cols, celda * filas, {
      tono: aCss(gris(grisDeFondo())),
    });

    const ensayo = this.ensayo;
    if (ensayo) {
      ensayo.lienzos.forEach((lienzo, i) => {
        const { x, y, lado } = this.caja(i);
        renderer.imagen(lienzo, x, y, lado, lado);
      });

      if (ensayo.revelarHastaMs !== null) {
        const correcto = this.caja(ensayo.distinto);
        renderer.marco('ambos', correcto.x - 5, correcto.y - 5, correcto.lado + 10, correcto.lado + 10, 4, {
          tono: renderer.paleta.acento,
        });
        if (ensayo.elegido !== null && ensayo.elegido !== ensayo.distinto) {
          const elegido = this.caja(ensayo.elegido);
          renderer.marco('ambos', elegido.x - 3, elegido.y - 3, elegido.lado + 6, elegido.lado + 6, 2);
        }
      } else if (this.conTeclado) {
        const { x, y, lado } = this.caja(this.cursor);
        renderer.marco('ambos', x - 4, y - 4, lado + 8, lado + 8, 2);
      }
    }

    const total = config.gabor.ensayosPorNivel;
    let derecha = `${this.hechos}/${total}`;
    if (ensayo && ensayo.revelarHastaMs === null && this.dificultad.limiteSeg > 0) {
      const quedan = this.dificultad.limiteSeg - (tiempoMs - ensayo.inicioMs) / 1000;
      derecha = `${Math.max(0, Math.ceil(quedan))} s`;
    }
    dibujarMarcoYHud(renderer, `${this.encontrados}`, derecha, this.hechos / total);
    this.dibujarAyuda(tiempoMs);
  }
}

export const gabor: Minijuego = {
  id: 'gabor',
  modulo: 'parche',
  escaleras: (modo) => escalerasDeGabor(modo),
  crear: (canvas, contexto) => new InstanciaDeGabor(canvas, contexto),
};
