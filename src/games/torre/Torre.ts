/**
 * Torre de bloques.
 * Habilidad: visión binocular (combinar lo que ve cada ojo), planificación y
 * coordinación.
 *
 * Cae una pieza vertical y hay que elegir su columna para reproducir el plano.
 * En modo lentes un ojo ve la pieza y el otro el plano: sin juntar los dos no
 * se puede acertar. Ahí está el entrenamiento binocular.
 *
 * Capas en modo lentes:
 *   ojo ambliope → la pieza que cae
 *   ojo dominante → el plano (silueta objetivo)
 *   ambos → bloques ya colocados, marco del tablero y HUD
 */
import { config, type Modo } from '../../config';
import { aCss, desdeHex, grisConContraste } from '../../engine/color';
import { crearAleatorio, type Aleatorio } from '../../engine/rng';
import type { ConfigDeEscalera } from '../../engine/Staircase';
import { GameLoop } from '../../engine/GameLoop';
import { ContadorDeNivel, areaDeJuego, dibujarMarcoYHud } from '../comun';
import { claveDeEscalera, type ContextoDeJuego, type InstanciaDeJuego, type Minijuego } from '../tipos';
import { figuraDeNivel, bloquesDeFigura, type Figura } from './figuras';
import {
  colocar,
  desmoronar,
  figuraCompleta,
  tableroVacio,
  tamanosDePieza,
  type EstadoDeTablero,
} from './tablero';

const PARAMETRO = 'contraste';

export function tableroDelMundo(mundo: number) {
  const lista = config.torre.tablerosPorMundo;
  return lista[Math.max(0, Math.min(lista.length - 1, mundo - 1))];
}

export function bloquesPorPieza(mundo: number): number[] {
  const lista = config.torre.bloquesPorPiezaPorMundo;
  return lista[Math.max(0, Math.min(lista.length - 1, mundo - 1))];
}

/** Celdas por segundo que cae la pieza: de 1 a 3 a lo largo de los 25 niveles. */
export function velocidadDeCaida(mundo: number, nivel: number): number {
  const niveles = config.progresion.mundos * config.progresion.nivelesPorMundo;
  const indice = (mundo - 1) * config.progresion.nivelesPorMundo + (nivel - 1);
  const avance = niveles > 1 ? Math.max(0, Math.min(1, indice / (niveles - 1))) : 0;
  return (
    config.torre.velocidadCaidaInicialCeldasSeg +
    (config.torre.velocidadCaidaFinalCeldasSeg - config.torre.velocidadCaidaInicialCeldasSeg) *
      avance
  );
}

/**
 * En parche, el plano se lee con una escalera de contraste.
 * En lentes no hay escalera: el plano va en la capa del ojo dominante con el
 * contraste de balance, que ya lo controla la regla diaria.
 */
export function escalerasDeTorre(modo: Modo, mundo: number): ConfigDeEscalera[] {
  void mundo;
  if (modo === 'lentes') return [];
  return [
    {
      clave: claveDeEscalera('torre', modo, PARAMETRO),
      valorInicial: config.torre.contrastePlanoInicial,
      minimo: 1 / 255,
      maximo: config.torre.contrastePlanoMaximo,
    },
  ];
}

interface Pieza {
  columna: number;
  bloques: number;
  /** Altura en celdas desde el suelo, con decimales mientras cae. */
  altura: number;
  contraste: number;
  esEnsayoDeConfianza: boolean;
  /** Cuándo apareció: mide lo que tarda en decidir la columna. */
  nacidaMs: number;
}

interface Polvo {
  columna: number;
  desde: number;
  cantidad: number;
  hasta: number;
}

/** Zona táctil de los botones en pantalla. */
interface Boton {
  id: 'izquierda' | 'derecha' | 'bajar';
  x: number;
  y: number;
  lado: number;
}

class InstanciaDeTorre implements InstanciaDeJuego {
  private readonly bucle: GameLoop;
  private readonly contador = new ContadorDeNivel();
  private readonly aleatorio: Aleatorio;
  private readonly figura: Figura;
  private readonly cols: number;
  private readonly filas: number;
  private readonly velocidad: number;
  private readonly tamanos: number[];

  private tablero: EstadoDeTablero;
  private pieza: Pieza | null = null;
  private polvo: Polvo[] = [];
  private colocadas = 0;
  private terminado = false;
  private destruido = false;
  private arrastreDesde: { x: number; y: number } | null = null;

  constructor(
    private readonly canvas: HTMLCanvasElement,
    private readonly ctx: ContextoDeJuego,
  ) {
    const tablero = tableroDelMundo(ctx.mundo);
    this.cols = tablero.cols;
    this.filas = tablero.filas;
    this.figura = figuraDeNivel(ctx.mundo, ctx.nivel);
    this.velocidad = velocidadDeCaida(ctx.mundo, ctx.nivel);
    this.tamanos = bloquesPorPieza(ctx.mundo);
    this.tablero = tableroVacio(this.figura.alturas);
    this.aleatorio = crearAleatorio(`torre:${ctx.mundo}:${ctx.nivel}:${Date.now()}`);
    this.bucle = new GameLoop((dt, tiempo) => this.cuadro(dt, tiempo));
  }

  iniciar(): void {
    this.canvas.addEventListener('pointerdown', this.alTocar);
    this.canvas.addEventListener('pointermove', this.alMover);
    window.addEventListener('pointerup', this.alSoltar);
    window.addEventListener('keydown', this.alTeclado);
    this.nuevaPieza();
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
    this.canvas.removeEventListener('pointerdown', this.alTocar);
    this.canvas.removeEventListener('pointermove', this.alMover);
    window.removeEventListener('pointerup', this.alSoltar);
    window.removeEventListener('keydown', this.alTeclado);
  }

  fps(): number {
    return this.bucle.fps;
  }

  /** Figura terminada, para guardarla en la galería. */
  get idDeFigura(): string {
    return this.figura.id;
  }

  // -------------------------------------------------------------------------
  // Piezas
  // -------------------------------------------------------------------------

  private nuevaPieza(): void {
    const posibles = tamanosDePieza(this.tamanos, this.tablero);
    const bloques = this.aleatorio.elegir(posibles);

    let contraste = config.torre.contrastePlanoMaximo;
    let esEnsayoDeConfianza = false;
    const escalera = this.ctx.escaleras[claveDeEscalera('torre', this.ctx.modo, PARAMETRO)];
    if (escalera) {
      const propuesto = escalera.proximoEnsayo();
      contraste = propuesto.valor;
      esEnsayoDeConfianza = propuesto.esEnsayoDeConfianza;
    }

    this.pieza = {
      columna: this.columnaPendienteMasCercana(this.pieza?.columna ?? Math.floor(this.cols / 2)),
      bloques,
      altura: this.filas,
      contraste,
      esEnsayoDeConfianza,
      nacidaMs: this.bucle.tiempoMs,
    };
  }

  private columnaPendienteMasCercana(desde: number): number {
    const limpio = Math.max(0, Math.min(this.cols - 1, desde));
    if (this.tablero.alturas[limpio] < this.tablero.plano[limpio]) return limpio;
    for (let distancia = 1; distancia < this.cols; distancia += 1) {
      for (const candidata of [limpio - distancia, limpio + distancia]) {
        if (candidata < 0 || candidata >= this.cols) continue;
        if (this.tablero.alturas[candidata] < this.tablero.plano[candidata]) return candidata;
      }
    }
    return limpio;
  }

  private aterrizar(tiempoMs: number): void {
    const pieza = this.pieza;
    if (!pieza) return;

    const resultado = colocar(this.tablero, pieza.columna, pieza.bloques);
    this.tablero = { ...this.tablero, alturas: resultado.alturas };
    this.colocadas += 1;

    const escalera = this.ctx.escaleras[claveDeEscalera('torre', this.ctx.modo, PARAMETRO)];
    if (escalera) escalera.record(resultado.acierto, pieza.esEnsayoDeConfianza);

    const tiempoReaccionMs = tiempoMs - pieza.nacidaMs;
    this.contador.registrar(resultado.acierto, tiempoReaccionMs, pieza.esEnsayoDeConfianza);
    this.ctx.onEnsayo({
      juego: 'torre',
      modo: this.ctx.modo,
      parametro: PARAMETRO,
      valor: pieza.contraste,
      acierto: resultado.acierto,
      tiempoReaccionMs,
      esEnsayoDeConfianza: pieza.esEnsayoDeConfianza,
    });

    if (resultado.sobran > 0) {
      this.polvo.push({
        columna: pieza.columna,
        desde: this.tablero.plano[pieza.columna],
        cantidad: resultado.sobran,
        hasta: tiempoMs + config.torre.desvanecerBloqueFueraMs,
      });
    }

    this.pieza = null;
    if (figuraCompleta(this.tablero)) this.terminarNivel();
    else this.nuevaPieza();
  }

  private terminarNivel(): void {
    if (this.terminado) return;
    this.terminado = true;
    this.bucle.detener();
    const umbrales: Record<string, number> = {};
    for (const [clave, escalera] of Object.entries(this.ctx.escaleras)) {
      umbrales[clave.split(':').slice(2).join(':')] = escalera.threshold();
    }
    this.ctx.onFinNivel(this.contador.resumen(umbrales));
  }

  // -------------------------------------------------------------------------
  // Entrada
  // -------------------------------------------------------------------------

  private alTocar = (evento: PointerEvent): void => {
    if (!this.pieza) return;
    const caja = this.canvas.getBoundingClientRect();
    const x = evento.clientX - caja.left;
    const y = evento.clientY - caja.top;

    const boton = this.botonEn(x, y);
    if (boton) {
      if (boton === 'izquierda') this.mover(-1);
      else if (boton === 'derecha') this.mover(1);
      else this.bajarRapido();
      return;
    }

    this.arrastreDesde = { x, y };
    const columna = this.columnaEn(x);
    if (columna !== null) this.pieza.columna = columna;
  };

  private alMover = (evento: PointerEvent): void => {
    if (!this.arrastreDesde || !this.pieza) return;
    const caja = this.canvas.getBoundingClientRect();
    const columna = this.columnaEn(evento.clientX - caja.left);
    if (columna !== null) this.pieza.columna = columna;
  };

  private alSoltar = (evento: PointerEvent): void => {
    if (!this.arrastreDesde) return;
    const caja = this.canvas.getBoundingClientRect();
    const recorrido = evento.clientY - caja.top - this.arrastreDesde.y;
    this.arrastreDesde = null;
    // Deslizar hacia abajo baja la pieza de golpe.
    if (recorrido > this.ladoDeCelda()) this.bajarRapido();
  };

  private alTeclado = (evento: KeyboardEvent): void => {
    if (!this.pieza) return;
    switch (evento.key) {
      case 'ArrowLeft':
        this.mover(-1);
        break;
      case 'ArrowRight':
        this.mover(1);
        break;
      case 'ArrowDown':
      case ' ':
      case 'Enter':
        this.bajarRapido();
        break;
      default:
        return;
    }
    evento.preventDefault();
  };

  private mover(direccion: number): void {
    if (!this.pieza) return;
    this.pieza.columna = Math.max(0, Math.min(this.cols - 1, this.pieza.columna + direccion));
  }

  private bajarRapido(): void {
    if (!this.pieza) return;
    this.pieza.altura = this.tablero.alturas[this.pieza.columna];
  }

  // -------------------------------------------------------------------------
  // Geometría
  // -------------------------------------------------------------------------

  private ladoDeCelda(): number {
    const area = areaDeJuego(this.ctx.renderer);
    return Math.max(4, Math.floor(Math.min(area.ancho / this.cols, (area.alto - 60) / this.filas)));
  }

  private origen(): { x: number; y: number } {
    const area = areaDeJuego(this.ctx.renderer);
    const lado = this.ladoDeCelda();
    return {
      x: area.x + Math.floor((area.ancho - lado * this.cols) / 2),
      y: area.y + Math.floor((area.alto - 60 - lado * this.filas) / 2),
    };
  }

  /** Esquina superior izquierda de la celda (columna, altura desde abajo). */
  private celda(columna: number, altura: number): { x: number; y: number } {
    const lado = this.ladoDeCelda();
    const origen = this.origen();
    return { x: origen.x + columna * lado, y: origen.y + (this.filas - 1 - altura) * lado };
  }

  private columnaEn(x: number): number | null {
    const lado = this.ladoDeCelda();
    const origen = this.origen();
    const columna = Math.floor((x - origen.x) / lado);
    return columna >= 0 && columna < this.cols ? columna : null;
  }

  private botones(): Boton[] {
    const area = areaDeJuego(this.ctx.renderer);
    const lado = Math.max(config.accesibilidad.botonMinimoPx, 54);
    const y = area.y + area.alto - lado;
    const centro = area.x + area.ancho / 2;
    return [
      { id: 'izquierda', x: centro - lado * 1.7, y, lado },
      { id: 'bajar', x: centro - lado / 2, y, lado },
      { id: 'derecha', x: centro + lado * 0.7, y, lado },
    ];
  }

  private botonEn(x: number, y: number): Boton['id'] | null {
    for (const boton of this.botones()) {
      if (x >= boton.x && x <= boton.x + boton.lado && y >= boton.y && y <= boton.y + boton.lado) {
        return boton.id;
      }
    }
    return null;
  }

  // -------------------------------------------------------------------------
  // Bucle y dibujo
  // -------------------------------------------------------------------------

  private cuadro(dtMs: number, tiempoMs: number): void {
    if (this.destruido || this.terminado) return;

    if (this.pieza) {
      this.pieza.altura -= this.velocidad * (dtMs / 1000);
      const suelo = this.tablero.alturas[this.pieza.columna];
      if (this.pieza.altura <= suelo) {
        this.pieza.altura = suelo;
        this.aterrizar(tiempoMs);
      }
    }

    // Los bloques que quedaron fuera se deshacen pasado su tiempo.
    if (this.polvo.length > 0 && this.polvo.some((p) => tiempoMs >= p.hasta)) {
      this.polvo = this.polvo.filter((p) => tiempoMs < p.hasta);
      this.tablero = { ...this.tablero, alturas: desmoronar(this.tablero) };
    }

    this.dibujar();
  }

  private dibujar(): void {
    const { renderer } = this.ctx;
    const lado = this.ladoDeCelda();
    renderer.limpiar();

    this.dibujarCuadricula(lado);
    this.dibujarPlano(lado);
    this.dibujarColocados(lado);
    this.dibujarPieza(lado);
    this.dibujarBotones();

    const puestos = bloquesDeFigura(this.figura) - this.bloquesQueFaltan();
    dibujarMarcoYHud(
      renderer,
      `${puestos}/${bloquesDeFigura(this.figura)}`,
      `${this.colocadas}`,
      puestos / bloquesDeFigura(this.figura),
    );
  }

  private bloquesQueFaltan(): number {
    return this.tablero.plano.reduce(
      (total, objetivo, columna) => total + Math.max(0, objetivo - this.tablero.alturas[columna]),
      0,
    );
  }

  /** Rejilla del tablero: referencia común a los dos ojos. */
  private dibujarCuadricula(lado: number): void {
    const origen = this.origen();
    const { renderer } = this.ctx;
    for (let columna = 0; columna <= this.cols; columna += 1) {
      renderer.rect('ambos', origen.x + columna * lado, origen.y, 1, this.filas * lado, {
        factor: 0.35,
        tono: renderer.paleta.secundario,
      });
    }
    for (let fila = 0; fila <= this.filas; fila += 1) {
      renderer.rect('ambos', origen.x, origen.y + fila * lado, this.cols * lado, 1, {
        factor: 0.35,
        tono: renderer.paleta.secundario,
      });
    }
  }

  /** El plano: tenue en parche según la escalera, capa del ojo dominante en lentes. */
  private dibujarPlano(lado: number): void {
    const { renderer } = this.ctx;
    const contraste = this.pieza?.contraste ?? config.torre.contrastePlanoMaximo;
    const tono =
      renderer.modo === 'parche'
        ? aCss(grisConContraste(desdeHex(renderer.paleta.fondo), contraste).rgb)
        : undefined;

    for (let columna = 0; columna < this.cols; columna += 1) {
      for (let altura = 0; altura < this.tablero.plano[columna]; altura += 1) {
        if (altura < this.tablero.alturas[columna]) continue;
        const { x, y } = this.celda(columna, altura);
        renderer.rect('ojoDominante', x + 1, y + 1, lado - 2, lado - 2, tono ? { tono } : undefined);
      }
    }
  }

  /** Bloques ya colocados: gris para los dos ojos en lentes, color del mundo en parche. */
  private dibujarColocados(lado: number): void {
    const { renderer } = this.ctx;
    for (let columna = 0; columna < this.cols; columna += 1) {
      for (let altura = 0; altura < this.tablero.alturas[columna]; altura += 1) {
        const { x, y } = this.celda(columna, altura);
        const fuera = altura >= this.tablero.plano[columna];
        const tono =
          this.figura.coloresPorFila?.[altura] ??
          renderer.paleta.variantes[altura % renderer.paleta.variantes.length];
        renderer.rect('ambos', x + 1, y + 1, lado - 2, lado - 2, {
          tono,
          // Un bloque fuera del plano se ve apagado mientras se deshace.
          factor: fuera ? 0.5 : 1,
        });
      }
    }
  }

  /** La pieza que cae: capa del ojo ambliope. */
  private dibujarPieza(lado: number): void {
    const pieza = this.pieza;
    if (!pieza) return;
    const { renderer } = this.ctx;
    for (let i = 0; i < pieza.bloques; i += 1) {
      const { x, y } = this.celda(pieza.columna, pieza.altura + i);
      renderer.rect('ojoAmbliope', x + 1, y + 1, lado - 2, lado - 2, {
        tono: renderer.paleta.acento,
      });
    }
    // Guía vertical de la columna elegida.
    const origen = this.origen();
    renderer.rect('ambos', origen.x + pieza.columna * lado, origen.y, 2, this.filas * lado, {
      factor: 0.6,
    });
  }

  /** Botones ◀ ▼ ▶ en pantalla, de 48 px o más, para jugar en tablet. */
  private dibujarBotones(): void {
    const { renderer } = this.ctx;
    for (const boton of this.botones()) {
      renderer.marco('ambos', boton.x, boton.y, boton.lado, boton.lado, 2);
      const cx = boton.x + boton.lado / 2;
      const cy = boton.y + boton.lado / 2;
      const r = boton.lado / 5;
      const puntos: Array<[number, number]> =
        boton.id === 'izquierda'
          ? [
              [cx - r, cy],
              [cx + r, cy - r],
              [cx + r, cy + r],
            ]
          : boton.id === 'derecha'
            ? [
                [cx + r, cy],
                [cx - r, cy - r],
                [cx - r, cy + r],
              ]
            : [
                [cx, cy + r],
                [cx - r, cy - r],
                [cx + r, cy - r],
              ];
      renderer.poligono('ambos', puntos);
    }
  }
}

export const torre: Minijuego = {
  id: 'torre',
  escaleras: escalerasDeTorre,
  crear: (canvas, contexto) => new InstanciaDeTorre(canvas, contexto),
};
