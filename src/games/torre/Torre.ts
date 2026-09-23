/**
 * Torre de bloques.
 * Habilidad: visión binocular (combinar lo que ve cada ojo), planificación y
 * coordinación.
 *
 * Caen piezas con forma —de una a cuatro celdas— que se pueden girar y encajar
 * para reproducir el plano. En modo lentes un ojo ve la pieza y el otro el
 * plano: sin juntar los dos no se puede acertar. Ahí está el entrenamiento
 * binocular.
 *
 * Capas en modo lentes:
 *   ojo ambliope → la pieza que cae, su sombra de aterrizaje y la siguiente
 *   ojo dominante → el plano (silueta objetivo)
 *   ambos → bloques ya colocados, cuadrícula, marco, botones y HUD
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
  BLOQUE_SUELTO,
  anchoDe,
  piezasDeTamanos,
  rotaciones,
  type Celda,
  type Pieza,
} from './piezas';
import {
  aterrizaje,
  barrerEscombro,
  bloquesRestantes,
  cabe,
  celdasEn,
  colocar,
  escombro,
  esDeFigura,
  figuraCompleta,
  piezasQueCaben,
  tableroVacio,
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
 * Piezas que puede sacar un mundo. Siempre se filtran después por las que
 * todavía caben enteras en el plano, y si no cabe ninguna se recurre al bloque
 * suelto, que cabe siempre: así la figura nunca se queda a medias.
 */
export function piezasDelMundo(mundo: number): Pieza[] {
  return piezasDeTamanos(bloquesPorPieza(mundo));
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

interface PiezaEnJuego {
  forma: Pieza;
  rotacion: number;
  col: number;
  /** Fila desde el suelo, con decimales mientras cae. */
  fila: number;
  contraste: number;
  esEnsayoDeConfianza: boolean;
  /** Cuándo apareció: mide lo que tarda en decidir dónde ponerla. */
  nacidaMs: number;
}

/** Zona táctil de los botones en pantalla. */
interface Boton {
  id: 'izquierda' | 'girar' | 'derecha' | 'bajar';
  x: number;
  y: number;
  lado: number;
}

const ORDEN_DE_BOTONES: Array<Boton['id']> = ['izquierda', 'girar', 'derecha', 'bajar'];

class InstanciaDeTorre implements InstanciaDeJuego {
  private readonly bucle: GameLoop;
  private readonly contador = new ContadorDeNivel();
  private readonly aleatorio: Aleatorio;
  private readonly figura: Figura;
  private readonly cols: number;
  private readonly filas: number;
  private readonly velocidad: number;
  private readonly catalogo: Pieza[];

  private tablero: EstadoDeTablero;
  private pieza: PiezaEnJuego | null = null;
  private siguiente: Pieza | null = null;
  private filasHechas = 0;
  private terminado = false;
  private destruido = false;
  private cayendoRapido = false;
  private arrastreDesde: { x: number; y: number; col: number } | null = null;
  /** Cuándo se desmorona el escombro que hay ahora en el tablero. */
  private escombroHasta = Infinity;
  /** Filas recién completadas y hasta cuándo se resaltan. */
  private filasBrillando: number[] = [];
  private brilloHasta = 0;

  constructor(
    private readonly canvas: HTMLCanvasElement,
    private readonly ctx: ContextoDeJuego,
  ) {
    const tablero = tableroDelMundo(ctx.mundo);
    this.cols = tablero.cols;
    this.filas = tablero.filas;
    this.figura = figuraDeNivel(ctx.mundo, ctx.nivel);
    this.velocidad = velocidadDeCaida(ctx.mundo, ctx.nivel);
    this.catalogo = piezasDelMundo(ctx.mundo);
    this.tablero = tableroVacio(this.figura.alturas, this.filas);
    this.aleatorio = crearAleatorio(`torre:${ctx.mundo}:${ctx.nivel}:${Date.now()}`);
    this.bucle = new GameLoop((dt, tiempo) => this.cuadro(dt, tiempo));
  }

  iniciar(): void {
    this.canvas.addEventListener('pointerdown', this.alTocar);
    this.canvas.addEventListener('pointermove', this.alMover);
    window.addEventListener('pointerup', this.alSoltar);
    window.addEventListener('keydown', this.alBajarTecla);
    window.addEventListener('keyup', this.alSubirTecla);
    this.siguiente = this.sortearPieza();
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
    window.removeEventListener('keydown', this.alBajarTecla);
    window.removeEventListener('keyup', this.alSubirTecla);
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

  private sortearPieza(): Pieza {
    const caben = piezasQueCaben(this.catalogo, this.tablero);
    return this.aleatorio.elegir(caben.length > 0 ? caben : [BLOQUE_SUELTO]);
  }

  private celdasDe(forma: Pieza, rotacion: number): Celda[] {
    const giros = rotaciones(forma);
    return giros[((rotacion % giros.length) + giros.length) % giros.length];
  }

  private celdasActuales(): Celda[] {
    if (!this.pieza) return [];
    return this.celdasDe(this.pieza.forma, this.pieza.rotacion);
  }

  private nuevaPieza(): void {
    const forma = this.siguiente ?? this.sortearPieza();
    this.siguiente = this.sortearPieza();

    let contraste = config.torre.contrastePlanoMaximo;
    let esEnsayoDeConfianza = false;
    const escalera = this.ctx.escaleras[claveDeEscalera('torre', this.ctx.modo, PARAMETRO)];
    if (escalera) {
      const propuesto = escalera.proximoEnsayo();
      contraste = propuesto.valor;
      esEnsayoDeConfianza = propuesto.esEnsayoDeConfianza;
    }

    const celdas = this.celdasDe(forma, 0);
    const ancho = anchoDe(celdas);
    this.pieza = {
      forma,
      rotacion: 0,
      col: Math.max(0, Math.min(this.cols - ancho, Math.floor((this.cols - ancho) / 2))),
      fila: this.filas,
      contraste,
      esEnsayoDeConfianza,
      nacidaMs: this.bucle.tiempoMs,
    };
    this.cayendoRapido = false;
  }

  private aterrizar(tiempoMs: number): void {
    const pieza = this.pieza;
    if (!pieza) return;

    const resultado = colocar(this.tablero, this.celdasActuales(), pieza.col, Math.round(pieza.fila));
    this.tablero = { ...this.tablero, ocupado: resultado.ocupado };

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
      detalle: pieza.forma.id,
    });

    // Una fila llena de lado a lado barre todo el escombro del tablero.
    // La figura nunca se destruye: es lo que hay que construir.
    if (resultado.filasLlenas.length > 0) {
      this.filasHechas += resultado.filasLlenas.length;
      this.filasBrillando = resultado.filasLlenas;
      this.brilloHasta = tiempoMs + config.torre.avisoFilaMs;
      this.tablero = { ...this.tablero, ocupado: barrerEscombro(this.tablero) };
    }

    // El escombro que quede se desmorona solo al cabo de un rato.
    this.escombroHasta =
      escombro(this.tablero).length > 0
        ? tiempoMs + config.torre.desvanecerBloqueFueraMs
        : Infinity;

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
      else if (boton === 'girar') this.girar();
      else this.bajarRapido();
      return;
    }

    this.arrastreDesde = { x, y, col: this.pieza.col };
    this.llevarA(x);
  };

  private alMover = (evento: PointerEvent): void => {
    if (!this.arrastreDesde || !this.pieza) return;
    const caja = this.canvas.getBoundingClientRect();
    this.llevarA(evento.clientX - caja.left);
  };

  private alSoltar = (evento: PointerEvent): void => {
    const arrastre = this.arrastreDesde;
    if (!arrastre) return;
    const caja = this.canvas.getBoundingClientRect();
    const recorrido = evento.clientY - caja.top - arrastre.y;
    this.arrastreDesde = null;
    // Deslizar hacia abajo baja la pieza de golpe; un toque seco la gira.
    if (recorrido > this.ladoDeCelda()) this.bajarRapido();
    else if (Math.abs(recorrido) < 6 && this.pieza?.col === arrastre.col) this.girar();
  };

  private alBajarTecla = (evento: KeyboardEvent): void => {
    if (!this.pieza) return;
    switch (evento.key) {
      case 'ArrowLeft':
        this.mover(-1);
        break;
      case 'ArrowRight':
        this.mover(1);
        break;
      case 'ArrowUp':
        this.girar();
        break;
      case 'ArrowDown':
        this.cayendoRapido = true;
        break;
      case ' ':
      case 'Enter':
        this.bajarRapido();
        break;
      default:
        return;
    }
    evento.preventDefault();
  };

  private alSubirTecla = (evento: KeyboardEvent): void => {
    if (evento.key === 'ArrowDown') this.cayendoRapido = false;
  };

  /** Columna de colisión de la pieza mientras cae. */
  private filaEntera(): number {
    return this.pieza ? Math.floor(this.pieza.fila) : 0;
  }

  private mover(direccion: number): void {
    const pieza = this.pieza;
    if (!pieza) return;
    const destino = pieza.col + direccion;
    if (cabe(this.tablero, this.celdasActuales(), destino, this.filaEntera())) {
      pieza.col = destino;
    }
  }

  /** Lleva el borde izquierdo de la pieza a la columna que se está tocando. */
  private llevarA(x: number): void {
    const pieza = this.pieza;
    if (!pieza) return;
    const celdas = this.celdasActuales();
    const columna = this.columnaEn(x);
    if (columna === null) return;
    const destino = Math.max(0, Math.min(this.cols - anchoDe(celdas), columna));
    if (cabe(this.tablero, celdas, destino, this.filaEntera())) pieza.col = destino;
  }

  /**
   * Gira un cuarto de vuelta. Si al girar choca con la pared o con un bloque,
   * se prueba a apartarla un poco antes de rendirse.
   */
  private girar(): void {
    const pieza = this.pieza;
    if (!pieza) return;
    const celdas = this.celdasDe(pieza.forma, pieza.rotacion + 1);
    const fila = this.filaEntera();
    for (const desvio of config.torre.desviosAlGirar) {
      const destino = pieza.col + desvio;
      if (destino < 0 || destino + anchoDe(celdas) > this.cols) continue;
      if (cabe(this.tablero, celdas, destino, fila)) {
        pieza.rotacion += 1;
        pieza.col = destino;
        return;
      }
    }
  }

  private bajarRapido(): void {
    const pieza = this.pieza;
    if (!pieza) return;
    pieza.fila = aterrizaje(this.tablero, this.celdasActuales(), pieza.col, Math.ceil(pieza.fila));
  }

  /** Dónde aterriza la pieza si se la suelta ya: la sombra. */
  private filaDeSombra(): number {
    const pieza = this.pieza;
    if (!pieza) return 0;
    return aterrizaje(this.tablero, this.celdasActuales(), pieza.col, Math.ceil(pieza.fila));
  }

  // -------------------------------------------------------------------------
  // Geometría
  // -------------------------------------------------------------------------

  /** Columnas de ancho que se reservan a la derecha para la pieza siguiente. */
  private get columnasDeReserva(): number {
    return config.torre.columnasParaSiguiente;
  }

  private ladoDeCelda(): number {
    const area = areaDeJuego(this.ctx.renderer);
    return Math.max(
      4,
      Math.floor(
        Math.min(
          area.ancho / (this.cols + this.columnasDeReserva),
          (area.alto - config.torre.altoDeBotonesPx) / this.filas,
        ),
      ),
    );
  }

  private origen(): { x: number; y: number } {
    const area = areaDeJuego(this.ctx.renderer);
    const lado = this.ladoDeCelda();
    const anchoTotal = lado * (this.cols + this.columnasDeReserva);
    return {
      x: area.x + Math.floor((area.ancho - anchoTotal) / 2),
      y: area.y + Math.floor((area.alto - config.torre.altoDeBotonesPx - lado * this.filas) / 2),
    };
  }

  /** Esquina superior izquierda de la celda (columna, fila desde abajo). */
  private celda(columna: number, fila: number): { x: number; y: number } {
    const lado = this.ladoDeCelda();
    const origen = this.origen();
    return { x: origen.x + columna * lado, y: origen.y + (this.filas - 1 - fila) * lado };
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
    const hueco = lado * 1.15;
    const centro = area.x + area.ancho / 2;
    const inicio = centro - (hueco * (ORDEN_DE_BOTONES.length - 1)) / 2 - lado / 2;
    return ORDEN_DE_BOTONES.map((id, i) => ({ id, x: inicio + hueco * i, y, lado }));
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
      const factor = this.cayendoRapido ? config.torre.factorCaidaSuave : 1;
      this.pieza.fila -= this.velocidad * factor * (dtMs / 1000);
      const suelo = this.filaDeSombra();
      if (this.pieza.fila <= suelo) {
        this.pieza.fila = suelo;
        this.aterrizar(tiempoMs);
      }
    }

    // Los bloques que quedaron fuera del plano se deshacen pasado su tiempo.
    if (tiempoMs >= this.escombroHasta) {
      this.tablero = { ...this.tablero, ocupado: barrerEscombro(this.tablero) };
      this.escombroHasta = Infinity;
    }
    if (tiempoMs >= this.brilloHasta) this.filasBrillando = [];

    this.dibujar(tiempoMs);
  }

  private dibujar(tiempoMs: number): void {
    const { renderer } = this.ctx;
    const lado = this.ladoDeCelda();
    renderer.limpiar();

    this.dibujarCuadricula(lado);
    this.dibujarPlano(lado);
    this.dibujarColocados(lado, tiempoMs);
    this.dibujarSombra(lado);
    this.dibujarPieza(lado);
    this.dibujarSiguiente(lado);
    this.dibujarBotones();

    const total = bloquesDeFigura(this.figura);
    const puestos = total - bloquesRestantes(this.tablero);
    dibujarMarcoYHud(renderer, `${puestos}/${total}`, `${this.filasHechas}`, puestos / total);
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
      for (let fila = 0; fila < this.tablero.plano[columna]; fila += 1) {
        if (this.tablero.ocupado[fila * this.cols + columna]) continue;
        const { x, y } = this.celda(columna, fila);
        renderer.rect('ojoDominante', x + 1, y + 1, lado - 2, lado - 2, tono ? { tono } : undefined);
      }
    }
  }

  /** Bloques ya colocados: gris para los dos ojos en lentes, color del mundo en parche. */
  private dibujarColocados(lado: number, tiempoMs: number): void {
    const { renderer } = this.ctx;
    // El resalte de una fila terminada sube y baja una sola vez, sin destellos.
    const brillo = this.filasBrillando.length > 0 && tiempoMs < this.brilloHasta;

    for (let fila = 0; fila < this.filas; fila += 1) {
      for (let columna = 0; columna < this.cols; columna += 1) {
        if (!this.tablero.ocupado[fila * this.cols + columna]) continue;
        const { x, y } = this.celda(columna, fila);
        const fuera = !esDeFigura(this.tablero, fila, columna);
        const tono =
          this.figura.coloresPorFila?.[fila] ??
          renderer.paleta.variantes[fila % renderer.paleta.variantes.length];
        renderer.rect('ambos', x + 1, y + 1, lado - 2, lado - 2, {
          tono,
          // El escombro se ve apagado mientras se deshace; una fila recién
          // terminada se queda un momento a plena luz.
          factor: fuera ? 0.5 : brillo && this.filasBrillando.includes(fila) ? 1 : 0.85,
        });
      }
    }
  }

  /**
   * Sombra de aterrizaje: dónde cae la pieza si se suelta ya.
   * Va en la capa del ojo ambliope, igual que la pieza: si fuera para los dos
   * ojos, el ojo dominante conocería la forma y se perdería el trabajo binocular.
   */
  private dibujarSombra(lado: number): void {
    const pieza = this.pieza;
    if (!pieza) return;
    const fila = this.filaDeSombra();
    if (fila >= Math.floor(pieza.fila)) return;
    const { renderer } = this.ctx;
    for (const [f, c] of celdasEn(this.celdasActuales(), pieza.col, fila)) {
      const { x, y } = this.celda(c, f);
      renderer.marco('ojoAmbliope', x + 1, y + 1, lado - 2, lado - 2, 1, {
        factor: config.torre.factorDeSombra,
        tono: renderer.paleta.acento,
      });
    }
  }

  /** La pieza que cae: capa del ojo ambliope. */
  private dibujarPieza(lado: number): void {
    const pieza = this.pieza;
    if (!pieza) return;
    const { renderer } = this.ctx;
    for (const [f, c] of celdasEn(this.celdasActuales(), pieza.col, pieza.fila)) {
      const { x, y } = this.celda(c, f);
      renderer.rect('ojoAmbliope', x + 1, y + 1, lado - 2, lado - 2, {
        tono: renderer.paleta.acento,
      });
    }
    // Marca de la columna elegida: ancla de fusión, sin revelar la forma.
    const origen = this.origen();
    renderer.rect('ambos', origen.x + pieza.col * lado, origen.y, 2, this.filas * lado, {
      factor: 0.6,
    });
  }

  /** Hueco de la derecha con la pieza que viene. */
  private dibujarSiguiente(lado: number): void {
    const siguiente = this.siguiente;
    if (!siguiente) return;
    const { renderer } = this.ctx;
    const origen = this.origen();
    const reserva = this.columnasDeReserva;
    const x0 = origen.x + (this.cols + 1) * lado;
    const y0 = origen.y + lado;
    const caja = (reserva - 1) * lado;

    renderer.marco('ambos', x0, y0, caja, caja, 1, { factor: 0.45 });

    const celdas = this.celdasDe(siguiente, 0);
    const ancho = Math.max(...celdas.map(([, c]) => c)) + 1;
    const alto = Math.max(...celdas.map(([f]) => f)) + 1;
    const mini = Math.max(3, Math.floor((caja - 6) / Math.max(ancho, alto, 2)));
    const cx = x0 + (caja - mini * ancho) / 2;
    const cy = y0 + (caja - mini * alto) / 2;
    for (const [f, c] of celdas) {
      renderer.rect('ojoAmbliope', cx + c * mini + 1, cy + (alto - 1 - f) * mini + 1, mini - 2, mini - 2, {
        tono: renderer.paleta.acento,
      });
    }
  }

  /** Botones ◀ ↻ ▶ ▼ en pantalla, de 48 px o más, para jugar en tablet. */
  private dibujarBotones(): void {
    const { renderer } = this.ctx;
    for (const boton of this.botones()) {
      renderer.marco('ambos', boton.x, boton.y, boton.lado, boton.lado, 2);
      const cx = boton.x + boton.lado / 2;
      const cy = boton.y + boton.lado / 2;
      const r = boton.lado / 5;

      if (boton.id === 'girar') {
        // Flecha en arco: un anillo con una abertura y una punta al final.
        renderer.anilloConAbertura('ambos', cx, cy, r * 2.4, Math.max(2, r / 2.2), 3, 0.45);
        renderer.poligono('ambos', [
          [cx + r * 0.2, cy - r * 1.9],
          [cx + r * 1.5, cy - r * 1.2],
          [cx + r * 0.2, cy - r * 0.5],
        ]);
        continue;
      }

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
