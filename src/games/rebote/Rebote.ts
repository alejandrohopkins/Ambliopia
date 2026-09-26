/**
 * Rebote ágil (módulo de parche).
 * Habilidad: anticipar trayectorias y seguir un objeto pequeño que se mueve.
 *
 * Una paleta abajo devuelve la bola, que rebota en las paredes y en el techo.
 * Cada vez que una bola baja hacia la paleta hay un ensayo: devolverla es un
 * acierto y dejarla pasar, un fallo. La escalera mueve el tamaño de la bola;
 * el nivel, la velocidad, el ancho de la paleta, los bloques que la aceleran
 * y hasta cuántas bolas puede haber.
 *
 * La bola se divide: tras unas cuantas devoluciones seguidas, la que se acaba
 * de devolver se parte en dos, y así hasta el tope del nivel. Antes de
 * partirla se calcula dónde y cuándo llegará cada bola a la paleta, y solo se
 * divide si se puede llegar a todas: siempre es posible ganar. La bola que se
 * escapa desaparece si quedan otras —fallar devuelve a menos bolas— y, si era
 * la última, vuelve a salir desde arriba: nunca se pierde.
 */
import { config, type Modo } from '../../config';
import type { ConfigDeEscalera } from '../../engine/Staircase';
import { JuegoBase } from '../base';
import { dibujarMarcoYHud, puntosDeCirculo } from '../comun';
import { velocidadDeTeclado } from '../meteoritos/Meteoritos';
import { claveDeEscalera, type ContextoDeJuego, type Minijuego } from '../tipos';
import {
  avanzarBola,
  dificultadDeRebote,
  golpeaLaPaleta,
  llegadaALaPaleta,
  llegadasAlcanzables,
  salidaDePaleta,
  type Caja,
  type Llegada,
} from './fisica';

const PARAMETRO = 'tamano';

export function escalerasDeRebote(modo: Modo): ConfigDeEscalera[] {
  return [
    {
      clave: claveDeEscalera('rebote', modo, PARAMETRO),
      valorInicial: config.rebote.tamanoInicialPx,
      minimo: config.rebote.tamanoMinimoPx,
      maximo: config.rebote.tamanoMaximoPx,
    },
  ];
}

interface Bola {
  x: number;
  y: number;
  vx: number;
  vy: number;
  tamano: number;
  esEnsayoDeConfianza: boolean;
  /** Baja hacia la paleta con un ensayo abierto. */
  enEnsayo: boolean;
  inicioMs: number;
  /** Lo que la aceleraron los bloques; vuelve a 1 al tocar la paleta. */
  acelerada: number;
  /** Escapada: vuelve a salir en este instante. */
  vuelveEnMs: number | null;
}

class InstanciaDeRebote extends JuegoBase {
  private readonly dificultad: ReturnType<typeof dificultadDeRebote>;
  private bolas: Bola[] = [];
  private bloques: Caja[] = [];
  private paletaX = 0;
  private devueltas = 0;
  /** Devoluciones seguidas desde la última división o el último fallo. */
  private seguidas = 0;
  private teclaIzquierda = false;
  private teclaDerecha = false;
  private segundosPulsada = 0;
  /** Tiempo aún sin simular, para que la física avance siempre a paso fijo. */
  private sinSimularSeg = 0;
  /** Chasquidos de las bolas que se acaban de partir: se ve que salen de una. */
  private chasquidos: Array<{ x: number; y: number; tamano: number; ms: number }> = [];

  constructor(canvas: HTMLCanvasElement, ctx: ContextoDeJuego) {
    super(canvas, ctx, 'rebote');
    this.dificultad = dificultadDeRebote(ctx.mundo, ctx.nivel);
  }

  protected alIniciar(): void {
    const { area } = this;
    this.paletaX = area.x + area.ancho / 2;
    this.bloques = this.crearBloques();
    // Se empieza con una sola bola: las demás salen de ella al dividirse.
    this.bolas.push(this.bolaNueva(0));

    const moverA = (evento: Event) => {
      const punto = this.puntoDe(evento as PointerEvent);
      this.paletaX = punto.x;
      this.limitarPaleta();
    };
    // Con ratón la paleta sigue al puntero sin apretar; con el dedo, al arrastrar.
    this.escuchar(this.canvas, 'pointerdown', moverA);
    this.escuchar(this.canvas, 'pointermove', moverA);
    this.escuchar(window, 'keydown', (evento) => {
      const tecla = (evento as KeyboardEvent).key;
      if (tecla === 'ArrowLeft') this.teclaIzquierda = true;
      else if (tecla === 'ArrowRight') this.teclaDerecha = true;
      else return;
      evento.preventDefault();
    });
    this.escuchar(window, 'keyup', (evento) => {
      const tecla = (evento as KeyboardEvent).key;
      if (tecla === 'ArrowLeft') this.teclaIzquierda = false;
      if (tecla === 'ArrowRight') this.teclaDerecha = false;
    });
  }

  // -------------------------------------------------------------------------
  // Geometría
  // -------------------------------------------------------------------------

  private anchoDePaleta(): number {
    return Math.max(config.rebote.anchoMinimoDePaletaPx, this.dificultad.paleta * this.area.ancho);
  }

  private paletaY(): number {
    const { area } = this;
    return area.y + area.alto - config.rebote.separacionInferiorPx;
  }

  private rapidez(): number {
    return this.dificultad.velocidad * this.area.alto;
  }

  private limitarPaleta(): void {
    const { area } = this;
    const mitad = this.anchoDePaleta() / 2;
    this.paletaX = Math.max(area.x + mitad, Math.min(area.x + area.ancho - mitad, this.paletaX));
  }

  /** Bloques en la franja del medio, sin tocarse entre ellos. */
  private crearBloques(): Caja[] {
    const { area } = this;
    const bloques: Caja[] = [];
    const ancho = area.ancho * config.rebote.bloqueEnAncho;
    const alto = area.alto * config.rebote.bloqueEnAlto;
    const [desde, hasta] = config.rebote.franjaDeBloques;
    for (let intento = 0; bloques.length < this.dificultad.bloques && intento < 200; intento += 1) {
      const caja = {
        x: area.x + ancho / 2 + this.aleatorio.siguiente() * (area.ancho - ancho * 2),
        y: area.y + area.alto * (desde + this.aleatorio.siguiente() * (hasta - desde)),
        ancho,
        alto,
      };
      const choca = bloques.some(
        (otro) =>
          caja.x < otro.x + otro.ancho + ancho / 2 &&
          otro.x < caja.x + caja.ancho + ancho / 2 &&
          caja.y < otro.y + otro.alto + alto &&
          otro.y < caja.y + caja.alto + alto,
      );
      if (!choca) bloques.push(caja);
    }
    return bloques;
  }

  /** Una bola que sale desde arriba, hacia abajo y un poco de lado. */
  private bolaNueva(retrasoMs: number): Bola {
    const { area } = this;
    const angulo = (this.aleatorio.siguiente() - 0.5) * (Math.PI / 3);
    const rapidez = this.rapidez();
    return {
      x: area.x + area.ancho * (0.2 + this.aleatorio.siguiente() * 0.6),
      y: area.y + 8,
      vx: Math.sin(angulo) * rapidez,
      vy: Math.cos(angulo) * rapidez,
      tamano: config.rebote.tamanoInicialPx,
      esEnsayoDeConfianza: false,
      enEnsayo: false,
      inicioMs: 0,
      acelerada: 1,
      vuelveEnMs: retrasoMs,
    };
  }

  /**
   * Abre el ensayo de una bola que empieza a bajar: aquí cambia de tamaño.
   * Como mucho una bola de confianza a la vez: las demás, al tamaño que mide.
   */
  private abrirEnsayo(bola: Bola, tiempoMs: number): void {
    const escalera = this.escalera(PARAMETRO);
    const propuesto = escalera?.proximoEnsayo();
    const otraDeConfianza = this.bolas.some((b) => b !== bola && b.enEnsayo && b.esEnsayoDeConfianza);
    const deConfianza = (propuesto?.esEnsayoDeConfianza ?? false) && !otraDeConfianza;
    bola.tamano = deConfianza
      ? propuesto!.valor
      : (escalera?.current() ?? config.rebote.tamanoInicialPx);
    bola.esEnsayoDeConfianza = deConfianza;
    bola.enEnsayo = true;
    bola.inicioMs = tiempoMs;
  }

  /** Bolas en juego: las que no están esperando para volver a salir. */
  private enJuego(): Bola[] {
    return this.bolas.filter((b) => b.vuelveEnMs === null);
  }

  /** Cuándo y dónde llegará cada bola en juego a la paleta. */
  private llegadas(bolas: Bola[]): Llegada[] {
    const lineaY = this.paletaY();
    return bolas
      .map((b) => llegadaALaPaleta(b, this.area, this.bloques, lineaY))
      .filter((l): l is Llegada => l !== null);
  }

  /** ¿Se puede llegar a todas estas bolas con la paleta, sin prisas imposibles? */
  private alcanzables(bolas: Bola[]): boolean {
    const r = config.rebote;
    const alcance = (this.anchoDePaleta() / 2) * (1 - r.holguraDePaleta);
    return llegadasAlcanzables(
      this.llegadas(bolas),
      this.paletaX,
      alcance,
      r.velocidadSupuestaDePaleta * this.area.ancho,
      r.reaccionSeg,
    );
  }

  /**
   * Ayuda invisible al devolver una bola: si con su nueva trayectoria no se
   * pudiera llegar a todas las bolas, sale un poco torcida o un poco más lenta
   * o rápida. Se prueba primero lo que menos se nota; si nada sirve, sale
   * como la devolvió la jugadora.
   */
  private ajustarSalida(bola: Bola): void {
    if (this.enJuego().length < 2 || this.alcanzables(this.enJuego())) return;
    const r = config.rebote;
    const { vx, vy } = bola;
    const rapidez = Math.hypot(vx, vy);
    const suyo = Math.atan2(vx, -vy);
    const limite = (r.anguloMaximoGrados * Math.PI) / 180;
    for (const grados of r.ajustesDeAnguloGrados) {
      const angulo = Math.max(-limite, Math.min(limite, suyo + (grados * Math.PI) / 180));
      for (const factor of r.ajustesDeRapidez) {
        bola.vx = Math.sin(angulo) * rapidez * factor;
        bola.vy = -Math.cos(angulo) * rapidez * factor;
        if (this.alcanzables(this.enJuego())) return;
      }
    }
    bola.vx = vx;
    bola.vy = vy;
  }

  /**
   * Tras unas cuantas devoluciones seguidas, la bola recién devuelta se parte
   * en dos. La nueva sale con otro ángulo; se prueban varios y se queda el
   * primero con el que se puede llegar a todas las bolas. Si ninguno sirve,
   * se espera a la próxima devolución.
   */
  private quizaDividir(bola: Bola, tiempoMs: number): void {
    const r = config.rebote;
    if (this.seguidas < r.devolucionesParaDividir) return;
    if (this.enJuego().length >= this.dificultad.bolasMax) return;

    const rapidez = Math.hypot(bola.vx, bola.vy);
    const suyo = (Math.atan2(bola.vx, -bola.vy) * 180) / Math.PI;
    const candidatos = [-suyo, ...this.aleatorio.barajar(r.angulosDeDivisionGrados.flatMap((a) => [a, -a]))];
    for (const grados of candidatos) {
      if (Math.abs(grados - suyo) < r.aperturaMinimaGrados) continue;
      const angulo = (grados * Math.PI) / 180;
      const nueva: Bola = {
        ...bola,
        vx: Math.sin(angulo) * rapidez,
        vy: -Math.cos(angulo) * rapidez,
        enEnsayo: false,
        esEnsayoDeConfianza: false,
        acelerada: 1,
        vuelveEnMs: null,
      };
      if (!this.alcanzables([...this.enJuego(), nueva])) continue;
      this.bolas.push(nueva);
      this.chasquidos.push({ x: bola.x, y: bola.y, tamano: bola.tamano, ms: tiempoMs });
      this.seguidas = 0;
      return;
    }
  }

  // -------------------------------------------------------------------------
  // Simulación
  // -------------------------------------------------------------------------

  protected cuadro(dtMs: number, tiempoMs: number): void {
    const dt = dtMs / 1000;
    const { area } = this;

    if (this.teclaIzquierda !== this.teclaDerecha) {
      this.segundosPulsada += dt;
      const paso = velocidadDeTeclado(this.segundosPulsada, area.ancho) * dt;
      this.paletaX += this.teclaDerecha ? paso : -paso;
      this.limitarPaleta();
    } else {
      this.segundosPulsada = 0;
    }

    // La física avanza a paso fijo, igual que el cálculo de las llegadas.
    const paso = config.rebote.pasoFisicoSeg;
    for (this.sinSimularSeg += dt; this.sinSimularSeg >= paso; this.sinSimularSeg -= paso) {
      // Se recorre una copia: al dividirse o escaparse, la lista cambia.
      for (const bola of [...this.bolas]) this.moverBola(bola, paso, tiempoMs);
    }

    if (tiempoMs >= config.rebote.duracionNivelSeg * 1000) {
      this.terminarNivel();
      return;
    }
    this.dibujar(tiempoMs);
  }

  private moverBola(bola: Bola, dt: number, tiempoMs: number): void {
    if (bola.vuelveEnMs !== null) {
      if (tiempoMs < bola.vuelveEnMs) return;
      Object.assign(bola, this.bolaNueva(0), { vuelveEnMs: null });
      this.abrirEnsayo(bola, tiempoMs);
    }

    const bajaba = bola.vy > 0;
    avanzarBola(bola, dt, this.area, this.bloques);

    // Empieza a bajar: se abre el ensayo de esta bajada.
    if (!bajaba && bola.vy > 0 && !bola.enEnsayo) this.abrirEnsayo(bola, tiempoMs);

    const linea = this.paletaY();
    if (bola.vy <= 0 || bola.y < linea) return;

    const acierto = golpeaLaPaleta(bola.x, this.paletaX, this.anchoDePaleta());
    if (bola.enEnsayo) {
      this.anotar({
        parametro: PARAMETRO,
        valor: bola.tamano,
        acierto,
        tiempoReaccionMs: tiempoMs - bola.inicioMs,
        esEnsayoDeConfianza: bola.esEnsayoDeConfianza,
      });
      bola.enEnsayo = false;
    }

    if (acierto) {
      this.devueltas += 1;
      this.seguidas += 1;
      bola.acelerada = 1;
      const salida = salidaDePaleta(bola.x, this.paletaX, this.anchoDePaleta(), this.rapidez());
      bola.vx = salida.vx;
      bola.vy = salida.vy;
      bola.y = linea;
      this.ajustarSalida(bola);
      this.quizaDividir(bola, tiempoMs);
      return;
    }

    this.seguidas = 0;
    // Si quedan otras bolas, la que se escapa desaparece; si era la única,
    // vuelve a salir desde arriba. Nunca se queda sin bola.
    if (this.enJuego().length > 1) this.bolas = this.bolas.filter((b) => b !== bola);
    else bola.vuelveEnMs = tiempoMs + config.rebote.reaparecerMs;
  }

  // -------------------------------------------------------------------------
  // Dibujo
  // -------------------------------------------------------------------------

  private dibujar(tiempoMs: number): void {
    const { renderer } = this;
    const paleta = renderer.paleta;
    renderer.limpiar();

    // Bloques que aceleran: con dos flechas, para que se note qué hacen.
    for (const bloque of this.bloques) {
      renderer.rect('ojoDominante', bloque.x, bloque.y, bloque.ancho, bloque.alto, {
        tono: paleta.secundario,
      });
      const cy = bloque.y + bloque.alto / 2;
      const r = bloque.alto / 3;
      for (const dx of [-r, r]) {
        const cx = bloque.x + bloque.ancho / 2 + dx;
        renderer.poligono(
          'ojoDominante',
          [
            [cx - r / 2, cy - r],
            [cx + r / 2, cy],
            [cx - r / 2, cy + r],
          ],
          { tono: paleta.primario },
        );
      }
    }

    const ancho = this.anchoDePaleta();
    renderer.rect('ojoDominante', this.paletaX - ancho / 2, this.paletaY(), ancho, config.rebote.altoDePaletaPx, {
      tono: paleta.primario,
    });

    for (const bola of this.bolas) {
      if (bola.vuelveEnMs !== null) continue;
      renderer.poligono('ojoAmbliope', puntosDeCirculo(bola.x, bola.y, bola.tamano / 2), {
        tono: paleta.acento,
      });
    }
    this.dibujarChasquidos(tiempoMs);

    const duracion = config.rebote.duracionNivelSeg;
    const restante = Math.max(0, 1 - tiempoMs / (duracion * 1000));
    dibujarMarcoYHud(renderer, `${this.devueltas}`, `${Math.ceil(restante * duracion)} s`, restante);
    this.dibujarAyuda(tiempoMs);
  }

  /** Al partirse una bola, unas esquirlas salen del punto y se encogen hasta desaparecer. */
  private dibujarChasquidos(tiempoMs: number): void {
    const { chasquidoMs, esquirlas, esquirlaLadoPx } = config.rebote;
    this.chasquidos = this.chasquidos.filter((c) => tiempoMs - c.ms < chasquidoMs);
    for (const chasquido of this.chasquidos) {
      const avance = (tiempoMs - chasquido.ms) / chasquidoMs;
      const radio = chasquido.tamano * (0.5 + 1.2 * (1 - (1 - avance) ** 2));
      const lado = Math.max(1, Math.round(esquirlaLadoPx * (1 - avance)));
      for (let i = 0; i < esquirlas; i += 1) {
        const angulo = (i / esquirlas) * Math.PI * 2;
        this.renderer.rect(
          'ojoAmbliope',
          Math.round(chasquido.x + Math.cos(angulo) * radio - lado / 2),
          Math.round(chasquido.y + Math.sin(angulo) * radio - lado / 2),
          lado,
          lado,
          { tono: this.renderer.paleta.acento },
        );
      }
    }
  }
}

export const rebote: Minijuego = {
  id: 'rebote',
  modulo: 'parche',
  escaleras: (modo) => escalerasDeRebote(modo),
  crear: (canvas, contexto) => new InstanciaDeRebote(canvas, contexto),
};
