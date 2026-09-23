/**
 * Laberinto de trazado (módulo de parche).
 * Habilidad: control fino con la mirada fija.
 *
 * Hay que llevar un punto con el dedo desde la salida hasta la meta sin tocar
 * las paredes. El camino tiene controles invisibles cada pocas celdas: llegar
 * al siguiente sin rozar nada es un ensayo acertado, y tocar una pared es un
 * fallo que devuelve el punto al último control, nunca al principio. La
 * escalera mueve el contraste de Weber de las paredes sobre el suelo; el
 * nivel estrecha los pasillos, adelgaza las paredes y, en los últimos
 * mundos, pone obstáculos que patrullan y un tiempo por tramo.
 */
import { config, type Modo } from '../../config';
import type { ConfigDeEscalera } from '../../engine/Staircase';
import { aCss, aplicarContrasteWeber, desdeHex } from '../../engine/color';
import { JuegoBase } from '../base';
import { dibujarMarcoYHud, puntosDeCirculo } from '../comun';
import { claveDeEscalera, type ContextoDeJuego, type Minijuego } from '../tipos';
import {
  caminoMasCorto,
  circuloTocaCaja,
  controles,
  dificultadDeLaberinto,
  generarLaberinto,
  muros,
  pasillosRectos,
  trayectoTocaMuro,
  type Caja,
  type Celda,
  type Laberinto,
} from './mapa';

const PARAMETRO = 'contraste';

export function escalerasDeLaberinto(modo: Modo): ConfigDeEscalera[] {
  return [
    {
      clave: claveDeEscalera('laberinto', modo, PARAMETRO),
      valorInicial: config.laberinto.contrasteInicial,
      minimo: config.laberinto.contrasteMinimo,
      maximo: config.laberinto.contrasteMaximo,
    },
  ];
}

interface Punto {
  x: number;
  y: number;
}

interface Obstaculo {
  desde: Punto;
  hasta: Punto;
  /** Avance de 0 a 2: ida y vuelta. */
  fase: number;
}

interface Tramo {
  inicioMs: number;
  colorDeMuro: string;
  contrasteReal: number;
  esEnsayoDeConfianza: boolean;
}

class InstanciaDeLaberinto extends JuegoBase {
  private readonly dificultad: ReturnType<typeof dificultadDeLaberinto>;
  private lab!: Laberinto;
  private origen: Punto = { x: 0, y: 0 };
  private cajas: Caja[] = [];
  private controles: Celda[] = [];
  private siguiente = 0;
  private ultimoControl: Celda = [0, 0];
  private punto: Punto = { x: 0, y: 0 };
  private agarre: Punto | null = null;
  private obstaculos: Obstaculo[] = [];
  private tramo!: Tramo;
  private choque: (Punto & { ms: number }) | null = null;
  private readonly teclas = new Set<string>();
  private logrados = 0;
  private tiempoMs = 0;

  constructor(canvas: HTMLCanvasElement, ctx: ContextoDeJuego) {
    super(canvas, ctx, 'laberinto');
    this.dificultad = dificultadDeLaberinto(ctx.mundo, ctx.nivel);
  }

  protected alIniciar(): void {
    this.nuevoLaberinto();
    this.abrirTramo();

    this.escuchar(this.canvas, 'pointerdown', (evento) => {
      const p = this.puntoDe(evento as PointerEvent);
      // Se agarra el punto tocando cerca; desde ahí se mueve con el dedo, sin saltos.
      if (Math.hypot(p.x - this.punto.x, p.y - this.punto.y) <= config.laberinto.agarreMaximoPx) {
        this.agarre = { x: this.punto.x - p.x, y: this.punto.y - p.y };
      }
    });
    this.escuchar(this.canvas, 'pointermove', (evento) => {
      if (!this.agarre) return;
      const p = this.puntoDe(evento as PointerEvent);
      this.moverA({ x: p.x + this.agarre.x, y: p.y + this.agarre.y });
    });
    this.escuchar(window, 'pointerup', () => {
      this.agarre = null;
    });
    this.escuchar(window, 'keydown', (evento) => {
      const tecla = (evento as KeyboardEvent).key;
      if (!tecla.startsWith('Arrow')) return;
      this.teclas.add(tecla);
      evento.preventDefault();
    });
    this.escuchar(window, 'keyup', (evento) => {
      this.teclas.delete((evento as KeyboardEvent).key);
    });
  }

  // -------------------------------------------------------------------------
  // Laberinto
  // -------------------------------------------------------------------------

  private get celda(): number {
    return this.dificultad.pasillo + this.dificultad.muro;
  }

  private centroDe([c, f]: Celda): Punto {
    return { x: this.origen.x + (c + 0.5) * this.celda, y: this.origen.y + (f + 0.5) * this.celda };
  }

  private celdaDe(p: Punto): Celda {
    return [Math.floor((p.x - this.origen.x) / this.celda), Math.floor((p.y - this.origen.y) / this.celda)];
  }

  private nuevoLaberinto(): void {
    const { area } = this;
    const { maximo, muro } = this.dificultad;
    const celda = this.celda;
    const alto = area.alto - config.modulos.margenInferiorPx;
    const cols = Math.max(2, Math.min(maximo.cols, Math.floor((area.ancho - muro) / celda)));
    const filas = Math.max(2, Math.min(maximo.filas, Math.floor((alto - muro) / celda)));

    this.lab = generarLaberinto(cols, filas, this.aleatorio);
    this.origen = {
      x: Math.round(area.x + (area.ancho - cols * celda) / 2),
      y: Math.round(area.y + (alto - filas * celda) / 2),
    };
    this.cajas = muros(this.lab, this.origen, celda, muro);

    // Se sale abajo a la izquierda y la meta está arriba a la derecha.
    const salida: Celda = [0, filas - 1];
    const camino = caminoMasCorto(this.lab, salida, [cols - 1, 0]);
    this.controles = controles(camino);
    this.siguiente = 0;
    this.ultimoControl = salida;
    this.punto = this.centroDe(salida);
    this.agarre = null;

    const rectos = pasillosRectos(this.lab, config.laberinto.pasilloDeObstaculo).filter(
      ({ desde, hasta }) =>
        !(desde[0] === salida[0] && desde[1] === salida[1]) &&
        !(hasta[0] === salida[0] && hasta[1] === salida[1]),
    );
    this.obstaculos = this.aleatorio
      .barajar(rectos)
      .slice(0, this.dificultad.obstaculos)
      .map(({ desde, hasta }) => ({
        desde: this.centroDe(desde),
        hasta: this.centroDe(hasta),
        fase: this.aleatorio.siguiente() * 2,
      }));
  }

  /** Un tramo nuevo: la escalera decide el contraste de las paredes. */
  private abrirTramo(): void {
    const propuesto = this.escalera(PARAMETRO)?.proximoEnsayo() ?? {
      valor: config.laberinto.contrasteInicial,
      esEnsayoDeConfianza: false,
    };
    const color = aplicarContrasteWeber(desdeHex(this.renderer.paleta.secundario), propuesto.valor);
    this.tramo = {
      inicioMs: this.tiempoMs,
      colorDeMuro: aCss(color.rgb),
      contrasteReal: color.contrasteReal,
      esEnsayoDeConfianza: propuesto.esEnsayoDeConfianza,
    };
  }

  private cerrarTramo(acierto: boolean): void {
    this.anotar({
      parametro: PARAMETRO,
      valor: this.tramo.contrasteReal,
      acierto,
      tiempoReaccionMs: this.tiempoMs - this.tramo.inicioMs,
      esEnsayoDeConfianza: this.tramo.esEnsayoDeConfianza,
    });
  }

  // -------------------------------------------------------------------------
  // Movimiento
  // -------------------------------------------------------------------------

  private moverA(destino: Punto): void {
    const radio = config.laberinto.radioDelPuntoPx;
    const golpe = trayectoTocaMuro(this.punto, destino, radio, this.cajas);
    if (golpe) {
      this.chocar(golpe);
      return;
    }
    this.punto = destino;

    const control = this.controles[this.siguiente];
    const [c, f] = this.celdaDe(destino);
    if (!control || c !== control[0] || f !== control[1]) return;

    this.cerrarTramo(true);
    this.logrados += 1;
    this.ultimoControl = control;
    this.siguiente += 1;
    if (this.siguiente >= this.controles.length) this.nuevoLaberinto();
    this.abrirTramo();
  }

  /** Tocar una pared o un obstáculo: fallo, y vuelta al último control. */
  private chocar(donde: Punto): void {
    this.cerrarTramo(false);
    this.choque = { ...donde, ms: this.tiempoMs };
    this.punto = this.centroDe(this.ultimoControl);
    this.agarre = null;
    this.abrirTramo();
  }

  private posicionDe(obstaculo: Obstaculo): Punto {
    const t = obstaculo.fase <= 1 ? obstaculo.fase : 2 - obstaculo.fase;
    return {
      x: obstaculo.desde.x + (obstaculo.hasta.x - obstaculo.desde.x) * t,
      y: obstaculo.desde.y + (obstaculo.hasta.y - obstaculo.desde.y) * t,
    };
  }

  private ladoDeObstaculo(): number {
    return this.dificultad.pasillo * config.laberinto.obstaculoEnPasillo;
  }

  protected cuadro(dtMs: number, tiempoMs: number): void {
    this.tiempoMs = tiempoMs;
    const dt = dtMs / 1000;

    if (this.teclas.size > 0) {
      const paso = config.laberinto.velocidadTecladoCeldasSeg * this.celda * dt;
      const dx = (this.teclas.has('ArrowRight') ? 1 : 0) - (this.teclas.has('ArrowLeft') ? 1 : 0);
      const dy = (this.teclas.has('ArrowDown') ? 1 : 0) - (this.teclas.has('ArrowUp') ? 1 : 0);
      if (dx !== 0 || dy !== 0) this.moverA({ x: this.punto.x + dx * paso, y: this.punto.y + dy * paso });
    }

    const lado = this.ladoDeObstaculo();
    for (const obstaculo of this.obstaculos) {
      const largo = Math.hypot(obstaculo.hasta.x - obstaculo.desde.x, obstaculo.hasta.y - obstaculo.desde.y);
      const avance = (config.laberinto.velocidadObstaculoCeldasSeg * this.celda * dt) / Math.max(1, largo);
      obstaculo.fase = (obstaculo.fase + avance) % 2;
      const { x, y } = this.posicionDe(obstaculo);
      const caja = { x: x - lado / 2, y: y - lado / 2, ancho: lado, alto: lado };
      // Recién devuelto al control, el obstáculo que pasa por ahí no vuelve a contar.
      const reciente = this.choque !== null && tiempoMs - this.choque.ms < config.laberinto.avisoChoqueMs;
      if (!reciente && circuloTocaCaja(this.punto.x, this.punto.y, config.laberinto.radioDelPuntoPx, caja)) {
        this.chocar(this.punto);
      }
    }

    // Con límite de tiempo, un tramo que no se termina a tiempo es un fallo.
    if (this.dificultad.limiteSeg > 0 && tiempoMs - this.tramo.inicioMs >= this.dificultad.limiteSeg * 1000) {
      this.cerrarTramo(false);
      this.abrirTramo();
    }

    if (tiempoMs >= config.laberinto.duracionNivelSeg * 1000) {
      this.terminarNivel();
      return;
    }
    this.dibujar(tiempoMs);
  }

  // -------------------------------------------------------------------------
  // Dibujo
  // -------------------------------------------------------------------------

  private dibujar(tiempoMs: number): void {
    const { renderer } = this;
    const paleta = renderer.paleta;
    const { cols, filas } = this.lab;
    const { muro, pasillo } = this.dificultad;
    renderer.limpiar();

    renderer.rect(
      'ojoDominante',
      this.origen.x - muro / 2,
      this.origen.y - muro / 2,
      cols * this.celda + muro,
      filas * this.celda + muro,
      { tono: paleta.secundario },
    );
    for (const caja of this.cajas) {
      renderer.rect('ojoAmbliope', caja.x, caja.y, caja.ancho, caja.alto, { tono: this.tramo.colorDeMuro });
    }

    // La meta: una estrella de cuatro puntas.
    const meta = this.centroDe([cols - 1, 0]);
    const r = pasillo * 0.35;
    renderer.poligono(
      'ojoDominante',
      Array.from({ length: 8 }, (_, i): [number, number] => {
        const angulo = (i / 8) * Math.PI * 2 - Math.PI / 2;
        const radio = i % 2 === 0 ? r : r * 0.4;
        return [meta.x + Math.cos(angulo) * radio, meta.y + Math.sin(angulo) * radio];
      }),
      { tono: paleta.acento },
    );

    const lado = this.ladoDeObstaculo();
    for (const obstaculo of this.obstaculos) {
      const { x, y } = this.posicionDe(obstaculo);
      renderer.rect('ojoDominante', x - lado / 2, y - lado / 2, lado, lado, { tono: paleta.primario });
    }

    const radio = config.laberinto.radioDelPuntoPx;
    renderer.poligono('ojoAmbliope', puntosDeCirculo(this.punto.x, this.punto.y, radio), {
      tono: paleta.acento,
    });
    // Sin agarrar, un anillo dice dónde poner el dedo.
    if (!this.agarre && this.teclas.size === 0) {
      const d = Math.min(config.laberinto.agarreMaximoPx, pasillo) * 1.2;
      renderer.anilloConAbertura('ambos', this.punto.x, this.punto.y, d, 2, 0, 0.25);
    }

    if (this.choque && tiempoMs - this.choque.ms < config.laberinto.avisoChoqueMs) {
      renderer.anilloConAbertura('ambos', this.choque.x, this.choque.y, radio * 5, 2, 3, 0);
    }

    const duracion = config.laberinto.duracionNivelSeg;
    const restante = Math.max(0, 1 - tiempoMs / (duracion * 1000));
    dibujarMarcoYHud(renderer, `${this.logrados}`, `${Math.ceil(restante * duracion)} s`, restante);
    this.dibujarAyuda(tiempoMs);
  }
}

export const laberinto: Minijuego = {
  id: 'laberinto',
  modulo: 'parche',
  escaleras: (modo) => escalerasDeLaberinto(modo),
  crear: (canvas, contexto) => new InstanciaDeLaberinto(canvas, contexto),
};
