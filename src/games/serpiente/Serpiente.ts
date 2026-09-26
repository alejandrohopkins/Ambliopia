/**
 * La serpiente (módulo de lentes).
 * Habilidad: buscar con el ojo ambliope.
 *
 * Hay que guiar a la serpiente hasta cada manzana. La manzana solo la ve el
 * ojo ambliope; la serpiente, solo el dominante; los muros, los dos. Cada
 * manzana es un ensayo: comerla antes de que cambie de sitio es un acierto.
 * El plazo sale del camino más corto hasta ella, así que no castiga que esté
 * lejos. La escalera mueve el tamaño de la manzana; el nivel, la velocidad,
 * el tablero, los muros interiores y lo que tarda la manzana en mudarse.
 * Chocar con un muro solo la detiene y morderse la cola la acorta: nunca se
 * pierde la partida.
 *
 * Capas en modo lentes:
 *   ojo ambliope → la manzana
 *   ojo dominante → la serpiente
 *   ambos → borde, muros interiores, cruceta, marco y HUD
 */
import { config, type Modo } from '../../config';
import type { ConfigDeEscalera } from '../../engine/Staircase';
import { JuegoBase } from '../base';
import { botonEn, cruceta, dibujarBotonera, ladoDeBoton, type Boton } from '../botonera';
import { dibujarMarcoYHud, puntosDeCirculo } from '../comun';
import { claveDeEscalera, type ContextoDeJuego, type Minijuego } from '../tipos';
import {
  avanzar,
  clave,
  crearMuros,
  dificultadDeSerpiente,
  distancia,
  libreDeMuros,
  puedeGirar,
  type Celda,
  type Direccion,
  type Serpiente,
  type Tablero,
} from './tablero';

const PARAMETRO = 'tamano';

export function escalerasDeSerpiente(modo: Modo): ConfigDeEscalera[] {
  return [
    {
      clave: claveDeEscalera('serpiente', modo, PARAMETRO),
      valorInicial: config.serpiente.tamanoInicialPx,
      minimo: config.serpiente.tamanoMinimoPx,
      maximo: config.serpiente.tamanoMaximoPx,
    },
  ];
}

interface Manzana {
  celda: Celda;
  tamano: number;
  esEnsayoDeConfianza: boolean;
  nacioMs: number;
  hastaMs: number;
}

const TECLAS: Record<string, Direccion> = {
  ArrowUp: 'arriba',
  ArrowDown: 'abajo',
  ArrowLeft: 'izquierda',
  ArrowRight: 'derecha',
};

class InstanciaDeSerpiente extends JuegoBase {
  private readonly dificultad: ReturnType<typeof dificultadDeSerpiente>;
  private tablero!: Tablero;
  private serpiente!: Serpiente;
  private manzana: Manzana | null = null;
  private giros: Direccion[] = [];
  private acumulado = 0;
  private comidas = 0;
  /** Manzanas recién comidas, para su estallido de migas. */
  private bocados: Array<{ celda: Celda; tamano: number; ms: number }> = [];
  private botones: Array<Boton<Direccion>> = [];
  private dedo: { x: number; y: number } | null = null;
  private tiempoMs = 0;

  constructor(canvas: HTMLCanvasElement, ctx: ContextoDeJuego) {
    super(canvas, ctx, 'serpiente');
    this.dificultad = dificultadDeSerpiente(ctx.mundo, ctx.nivel);
  }

  protected alIniciar(): void {
    const { cols, filas } = this.dificultad.tablero;
    const fila = Math.floor(filas / 2);
    const cuerpo: Celda[] = Array.from({ length: config.serpiente.largoInicial }, (_, i) => [
      3 + config.serpiente.largoInicial - 1 - i,
      fila,
    ]);
    // La fila de salida queda libre de muros para arrancar sin chocar.
    const reservadas: Celda[] = Array.from({ length: cols }, (_, c) => [c, fila]);
    this.tablero = {
      cols,
      filas,
      muros: crearMuros(cols, filas, this.dificultad.muros, this.aleatorio, reservadas),
    };
    this.serpiente = { cuerpo, direccion: 'derecha' };
    this.botones = cruceta(this.area, { arriba: 'arriba', abajo: 'abajo', izquierda: 'izquierda', derecha: 'derecha' });

    this.escuchar(this.canvas, 'pointerdown', (evento) => {
      const punto = this.puntoDe(evento as PointerEvent);
      const direccion = botonEn(this.botones, punto.x, punto.y);
      if (direccion) this.girar(direccion);
      else this.dedo = punto;
    });
    // Deslizar el dedo por el tablero también gira, sin tener que soltarlo.
    this.escuchar(this.canvas, 'pointermove', (evento) => {
      if (!this.dedo) return;
      const punto = this.puntoDe(evento as PointerEvent);
      const dx = punto.x - this.dedo.x;
      const dy = punto.y - this.dedo.y;
      if (Math.max(Math.abs(dx), Math.abs(dy)) < config.modulos.deslizarMinimoPx) return;
      if (Math.abs(dx) > Math.abs(dy)) this.girar(dx > 0 ? 'derecha' : 'izquierda');
      else this.girar(dy > 0 ? 'abajo' : 'arriba');
      this.dedo = punto;
    });
    this.escuchar(window, 'pointerup', () => {
      this.dedo = null;
    });
    this.escuchar(window, 'keydown', (evento) => {
      const direccion = TECLAS[(evento as KeyboardEvent).key];
      if (!direccion) return;
      this.girar(direccion);
      evento.preventDefault();
    });
  }

  /** Los giros se guardan en cola para que dos pulsaciones rápidas no se pierdan. */
  private girar(direccion: Direccion): void {
    const ultima = this.giros[this.giros.length - 1] ?? this.serpiente.direccion;
    if (direccion === ultima || !puedeGirar(ultima, direccion) || this.giros.length >= 2) return;
    this.giros.push(direccion);
  }

  // -------------------------------------------------------------------------
  // Manzanas
  // -------------------------------------------------------------------------

  private ponerManzana(): void {
    const cuerpo = new Set(this.serpiente.cuerpo.map(clave));
    const cabeza = this.serpiente.cuerpo[0];
    const libres: Celda[] = [];
    for (let f = 0; f < this.tablero.filas; f += 1) {
      for (let c = 0; c < this.tablero.cols; c += 1) {
        const celda: Celda = [c, f];
        if (!libreDeMuros(this.tablero, celda) || cuerpo.has(clave(celda))) continue;
        if (Math.abs(c - cabeza[0]) + Math.abs(f - cabeza[1]) < 3) continue;
        libres.push(celda);
      }
    }
    if (libres.length === 0) return;
    const celda = this.aleatorio.elegir(libres);
    const pasos = Math.max(1, distancia(this.tablero, cabeza, celda, cuerpo));
    const propuesto = this.escalera(PARAMETRO)?.proximoEnsayo() ?? {
      valor: config.serpiente.tamanoInicialPx,
      esEnsayoDeConfianza: false,
    };
    // Plazo: lo que se tarda por el camino más corto, con holgura, más un margen.
    const plazoSeg = config.serpiente.margenSeg + (this.dificultad.holgura * pasos) / this.dificultad.velocidad;
    this.manzana = {
      celda,
      tamano: Math.min(propuesto.valor, this.lado()),
      esEnsayoDeConfianza: propuesto.esEnsayoDeConfianza,
      nacioMs: this.tiempoMs,
      hastaMs: this.tiempoMs + plazoSeg * 1000,
    };
  }

  private cerrarManzana(acierto: boolean): void {
    const manzana = this.manzana;
    if (!manzana) return;
    this.manzana = null;
    this.anotar({
      parametro: PARAMETRO,
      valor: manzana.tamano,
      acierto,
      tiempoReaccionMs: this.tiempoMs - manzana.nacioMs,
      esEnsayoDeConfianza: manzana.esEnsayoDeConfianza,
    });
  }

  // -------------------------------------------------------------------------
  // Simulación
  // -------------------------------------------------------------------------

  protected cuadro(dtMs: number, tiempoMs: number): void {
    this.tiempoMs = tiempoMs;
    // Arranca cuando se ha leído la explicación.
    const enMarcha = tiempoMs >= config.modulos.ayudaSeg * 1000;
    if (enMarcha && !this.manzana) this.ponerManzana();

    if (enMarcha) this.acumulado += (this.dificultad.velocidad * dtMs) / 1000;
    while (this.acumulado >= 1) {
      this.acumulado -= 1;
      this.paso();
    }

    if (this.manzana && tiempoMs >= this.manzana.hastaMs) this.cerrarManzana(false);

    if (tiempoMs >= config.serpiente.duracionNivelSeg * 1000) {
      this.terminarNivel();
      return;
    }
    this.dibujar(tiempoMs);
  }

  private paso(): void {
    const siguiente = this.giros.shift();
    if (siguiente) this.serpiente.direccion = siguiente;
    const libres = this.tablero.cols * this.tablero.filas - this.tablero.muros.size;
    const crecer = this.serpiente.cuerpo.length < libres * config.serpiente.largoMaximo;
    const resultado = avanzar(this.tablero, this.serpiente, this.manzana?.celda ?? null, crecer);
    if (resultado === 'come' && this.manzana) {
      this.comidas += 1;
      this.bocados.push({ celda: this.manzana.celda, tamano: this.manzana.tamano, ms: this.tiempoMs });
      this.cerrarManzana(true);
    }
  }

  // -------------------------------------------------------------------------
  // Dibujo
  // -------------------------------------------------------------------------

  /** Lado de la celda: el tablero deja libre la columna de la cruceta. */
  private lado(): number {
    const { area } = this;
    const { cols, filas } = this.tablero;
    const cruz = ladoDeBoton() * 3.4;
    return Math.floor(Math.min((area.ancho - cruz) / cols, (area.alto - 8) / filas));
  }

  private dibujar(tiempoMs: number): void {
    const { renderer, area } = this;
    const { cols, filas } = this.tablero;
    const lado = this.lado();
    const x0 = Math.round(area.x + 4);
    const y0 = Math.round(area.y + (area.alto - filas * lado) / 2);
    renderer.limpiar();

    // Borde y muros interiores: los dos ojos.
    renderer.marco('ambos', x0 - 3, y0 - 3, cols * lado + 6, filas * lado + 6, 2);
    for (const k of this.tablero.muros) {
      const [c, f] = k.split(',').map(Number);
      renderer.rect('ambos', x0 + c * lado + 1, y0 + f * lado + 1, lado - 2, lado - 2);
    }

    // La serpiente: ojo dominante, con dos ojitos en la cabeza.
    this.serpiente.cuerpo.forEach(([c, f], i) => {
      const hueco = i === 0 ? 0 : 2;
      renderer.rect('ojoDominante', x0 + c * lado + hueco, y0 + f * lado + hueco, lado - hueco * 2, lado - hueco * 2);
    });
    const [cc, cf] = this.serpiente.cuerpo[0];
    const ojo = Math.max(2, Math.round(lado / 6));
    renderer.borrar(x0 + cc * lado + lado / 4, y0 + cf * lado + lado / 4, ojo, ojo);
    renderer.borrar(x0 + cc * lado + (lado * 3) / 4 - ojo, y0 + cf * lado + lado / 4, ojo, ojo);

    this.dibujarBocados(tiempoMs, x0, y0, lado);

    // La manzana: ojo ambliope.
    if (this.manzana) {
      const [c, f] = this.manzana.celda;
      renderer.poligono(
        'ojoAmbliope',
        puntosDeCirculo(x0 + (c + 0.5) * lado, y0 + (f + 0.5) * lado, this.manzana.tamano / 2),
      );
    }

    dibujarBotonera(renderer, this.botones);
    const duracion = config.serpiente.duracionNivelSeg;
    const restante = Math.max(0, 1 - tiempoMs / (duracion * 1000));
    dibujarMarcoYHud(renderer, `${this.comidas}`, `${Math.ceil(restante * duracion)} s`, restante);
    this.dibujarAyuda(tiempoMs);
  }

  /**
   * Al comerse la manzana, ya anotado el ensayo, unas migas salen de donde
   * estaba, en el color de la manzana, y se encogen hasta desaparecer.
   */
  private dibujarBocados(tiempoMs: number, x0: number, y0: number, lado: number): void {
    const { bocadoMs, migas, migaLadoPx } = config.serpiente;
    this.bocados = this.bocados.filter((b) => tiempoMs - b.ms < bocadoMs);
    for (const bocado of this.bocados) {
      const avance = (tiempoMs - bocado.ms) / bocadoMs;
      const cx = x0 + (bocado.celda[0] + 0.5) * lado;
      const cy = y0 + (bocado.celda[1] + 0.5) * lado;
      const radio = bocado.tamano / 2 + lado * (1 - (1 - avance) ** 2);
      const miga = Math.max(1, Math.round(migaLadoPx * (1 - avance)));
      for (let i = 0; i < migas; i += 1) {
        const angulo = (i / migas) * Math.PI * 2 + Math.PI / migas;
        this.renderer.rect(
          'ojoAmbliope',
          Math.round(cx + Math.cos(angulo) * radio - miga / 2),
          Math.round(cy + Math.sin(angulo) * radio - miga / 2),
          miga,
          miga,
        );
      }
    }
  }
}

export const serpiente: Minijuego = {
  id: 'serpiente',
  modulo: 'lentes',
  escaleras: (modo) => escalerasDeSerpiente(modo),
  crear: (canvas, contexto) => new InstanciaDeSerpiente(canvas, contexto),
};
