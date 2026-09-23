/**
 * Rebote ágil (módulo de parche).
 * Habilidad: anticipar trayectorias y seguir un objeto pequeño que se mueve.
 *
 * Una paleta abajo devuelve la bola, que rebota en las paredes y en el techo.
 * Cada vez que la bola baja hacia la paleta hay un ensayo: devolverla es un
 * acierto y dejarla pasar, un fallo. La escalera mueve el tamaño de la bola;
 * el nivel, la velocidad, el ancho de la paleta, los bloques que la aceleran
 * y cuántas bolas hay a la vez. Nunca se pierde: la bola que se escapa vuelve
 * a salir desde arriba.
 */
import { config, type Modo } from '../../config';
import type { ConfigDeEscalera } from '../../engine/Staircase';
import { JuegoBase } from '../base';
import { dibujarMarcoYHud, puntosDeCirculo } from '../comun';
import { velocidadDeTeclado } from '../meteoritos/Meteoritos';
import { claveDeEscalera, type ContextoDeJuego, type Minijuego } from '../tipos';
import {
  dificultadDeRebote,
  golpeaLaPaleta,
  rebotarEnCaja,
  rebotarEnParedes,
  salidaDePaleta,
  type Caja,
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
  private teclaIzquierda = false;
  private teclaDerecha = false;
  private segundosPulsada = 0;

  constructor(canvas: HTMLCanvasElement, ctx: ContextoDeJuego) {
    super(canvas, ctx, 'rebote');
    this.dificultad = dificultadDeRebote(ctx.mundo, ctx.nivel);
  }

  protected alIniciar(): void {
    const { area } = this;
    this.paletaX = area.x + area.ancho / 2;
    this.bloques = this.crearBloques();
    // Las bolas salen escalonadas, para no tener que seguir dos a la vez desde el principio.
    for (let i = 0; i < this.dificultad.bolas; i += 1) {
      this.bolas.push(this.bolaNueva(i * config.rebote.reaparecerMs * 3));
    }

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

  /** Abre el ensayo de una bola que empieza a bajar: aquí cambia de tamaño. */
  private abrirEnsayo(bola: Bola, tiempoMs: number): void {
    const propuesto = this.escalera(PARAMETRO)?.proximoEnsayo();
    bola.tamano = propuesto?.valor ?? config.rebote.tamanoInicialPx;
    bola.esEnsayoDeConfianza = propuesto?.esEnsayoDeConfianza ?? false;
    bola.enEnsayo = true;
    bola.inicioMs = tiempoMs;
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

    for (const bola of this.bolas) this.moverBola(bola, dt, tiempoMs);

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
    bola.x += bola.vx * dt;
    bola.y += bola.vy * dt;
    rebotarEnParedes(bola, this.area);

    for (const bloque of this.bloques) {
      if (!rebotarEnCaja(bola, bloque)) continue;
      // Acelerón repentino: dura hasta que la paleta la devuelve.
      const factor = config.rebote.aceleracionDeBloque;
      if (bola.acelerada < factor * factor) {
        bola.acelerada *= factor;
        bola.vx *= factor;
        bola.vy *= factor;
      }
    }

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
      bola.acelerada = 1;
      const salida = salidaDePaleta(bola.x, this.paletaX, this.anchoDePaleta(), this.rapidez());
      bola.vx = salida.vx;
      bola.vy = salida.vy;
      bola.y = linea;
    } else {
      bola.vuelveEnMs = tiempoMs + config.rebote.reaparecerMs;
    }
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

    const duracion = config.rebote.duracionNivelSeg;
    const restante = Math.max(0, 1 - tiempoMs / (duracion * 1000));
    dibujarMarcoYHud(renderer, `${this.devueltas}`, `${Math.ceil(restante * duracion)} s`, restante);
    this.dibujarAyuda(tiempoMs);
  }
}

export const rebote: Minijuego = {
  id: 'rebote',
  modulo: 'parche',
  escaleras: (modo) => escalerasDeRebote(modo),
  crear: (canvas, contexto) => new InstanciaDeRebote(canvas, contexto),
};
