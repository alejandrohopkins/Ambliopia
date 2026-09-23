/**
 * El sapo cruzador (módulo de lentes).
 * Habilidad: seguir al personaje con el ojo ambliope.
 *
 * Hay que cruzar la calle esquivando coches y el río saltando por troncos
 * hasta llegar arriba. El sapo solo lo ve el ojo ambliope; los coches, los
 * troncos y el agua, solo el dominante; las franjas seguras, los dos. Cada
 * carril peligroso es un ensayo: cruzarlo sin tropezar es un acierto. La
 * escalera mueve el tamaño del sapo —con qué se choca no cambia, solo lo que
 * cuesta verlo—; el nivel, los carriles, la velocidad, los huecos, el largo
 * de los troncos y, en los últimos mundos, troncos que se hunden y
 * corrientes que cambian. Un tropiezo solo lo devuelve al principio del
 * tramo: nunca se pierde.
 *
 * Capas en modo lentes:
 *   ojo ambliope → el sapo
 *   ojo dominante → coches, troncos y agua
 *   ambos → franjas seguras, cruceta, marco y HUD
 */
import { config, type Modo } from '../../config';
import type { ConfigDeEscalera } from '../../engine/Staircase';
import { JuegoBase } from '../base';
import { botonEn, cruceta, dibujarBotonera, ladoDeBoton, type Boton } from '../botonera';
import { dibujarMarcoYHud, puntosDeCirculo } from '../comun';
import { claveDeEscalera, type ContextoDeJuego, type Minijuego } from '../tipos';
import {
  atropella,
  crearFilas,
  dificultadDeSapo,
  filaDeRegreso,
  hundido,
  moverFilas,
  porHundirse,
  troncoBajo,
  type Fila,
} from './carriles';

const PARAMETRO = 'tamano';

export function escalerasDeSapo(modo: Modo): ConfigDeEscalera[] {
  return [
    {
      clave: claveDeEscalera('sapo', modo, PARAMETRO),
      valorInicial: config.sapo.tamanoInicialPx,
      minimo: config.sapo.tamanoMinimoPx,
      maximo: config.sapo.tamanoMaximoPx,
    },
  ];
}

type Direccion = 'arriba' | 'abajo' | 'izquierda' | 'derecha';

const TECLAS: Record<string, Direccion> = {
  ArrowUp: 'arriba',
  ArrowDown: 'abajo',
  ArrowLeft: 'izquierda',
  ArrowRight: 'derecha',
};

interface Ensayo {
  fila: number;
  tamano: number;
  esEnsayoDeConfianza: boolean;
  inicioMs: number;
}

class InstanciaDeSapo extends JuegoBase {
  private readonly dificultad: ReturnType<typeof dificultadDeSapo>;
  private readonly cols = config.sapo.columnas;
  private filas: Fila[] = [];
  /** Centro del sapo, en celdas. */
  private sapo = { x: 0, fila: 0 };
  private salto: { x: number; fila: number; hastaMs: number } | null = null;
  private ensayo: Ensayo | null = null;
  private tamano = config.sapo.tamanoInicialPx;
  private cruces = 0;
  private choque: { x: number; fila: number; ms: number } | null = null;
  private proximaCorrienteMs = 0;
  private botones: Array<Boton<Direccion>> = [];
  private dedo: { x: number; y: number } | null = null;
  private tiempoMs = 0;

  constructor(canvas: HTMLCanvasElement, ctx: ContextoDeJuego) {
    super(canvas, ctx, 'sapo');
    this.dificultad = dificultadDeSapo(ctx.mundo, ctx.nivel);
  }

  protected alIniciar(): void {
    this.filas = crearFilas(this.dificultad, this.cols, this.aleatorio);
    this.sapo = { x: Math.floor(this.cols / 2) + 0.5, fila: 0 };
    this.proximaCorrienteMs = config.sapo.corrienteCadaSeg * 1000;
    this.botones = cruceta(this.area, { arriba: 'arriba', abajo: 'abajo', izquierda: 'izquierda', derecha: 'derecha' });

    this.escuchar(this.canvas, 'pointerdown', (evento) => {
      const punto = this.puntoDe(evento as PointerEvent);
      const direccion = botonEn(this.botones, punto.x, punto.y);
      if (direccion) this.saltar(direccion);
      else this.dedo = punto;
    });
    // Tocar el tablero salta hacia delante; deslizar salta hacia donde se desliza.
    this.escuchar(window, 'pointerup', (evento) => {
      const dedo = this.dedo;
      this.dedo = null;
      if (!dedo) return;
      const punto = this.puntoDe(evento as PointerEvent);
      const dx = punto.x - dedo.x;
      const dy = punto.y - dedo.y;
      if (Math.max(Math.abs(dx), Math.abs(dy)) < config.modulos.deslizarMinimoPx) this.saltar('arriba');
      else if (Math.abs(dx) > Math.abs(dy)) this.saltar(dx > 0 ? 'derecha' : 'izquierda');
      else this.saltar(dy > 0 ? 'abajo' : 'arriba');
    });
    this.escuchar(window, 'keydown', (evento) => {
      const direccion = TECLAS[(evento as KeyboardEvent).key];
      if (!direccion) return;
      this.saltar(direccion);
      evento.preventDefault();
    });
  }

  private peligrosa(fila: number): boolean {
    const tipo = this.filas[fila]?.tipo;
    return tipo === 'calle' || tipo === 'rio';
  }

  // -------------------------------------------------------------------------
  // Movimiento
  // -------------------------------------------------------------------------

  private saltar(direccion: Direccion): void {
    if (this.salto && this.tiempoMs < this.salto.hastaMs) return;
    const desde = { ...this.sapo };
    const destino = { ...this.sapo };
    if (direccion === 'arriba') destino.fila = Math.min(this.filas.length - 1, destino.fila + 1);
    else if (direccion === 'abajo') destino.fila = Math.max(0, destino.fila - 1);
    else destino.x = Math.max(0.5, Math.min(this.cols - 0.5, destino.x + (direccion === 'izquierda' ? -1 : 1)));
    if (destino.fila === desde.fila && destino.x === desde.x) return;

    // Cruzar un carril peligroso —salir por delante sin tropezar— es un
    // acierto. Volver atrás para esquivar no cuenta ni a favor ni en contra:
    // si contara, entrar y salir de un carril vacío regalaría aciertos.
    if (destino.fila > desde.fila && this.ensayo) this.cerrarEnsayo(true);
    else if (destino.fila < desde.fila) this.ensayo = null;

    this.sapo = destino;
    this.salto = { ...desde, hastaMs: this.tiempoMs + config.sapo.saltoMs };

    if (this.filas[destino.fila].tipo === 'meta') {
      this.cruces += 1;
      this.sapo = { x: Math.floor(this.cols / 2) + 0.5, fila: 0 };
      this.salto = null;
      return;
    }
    if (this.peligrosa(destino.fila) && !this.ensayo) this.abrirEnsayo(destino.fila);
  }

  /** Cada carril peligroso abre un ensayo: aquí cambia el tamaño del sapo. */
  private abrirEnsayo(fila: number): void {
    const propuesto = this.escalera(PARAMETRO)?.proximoEnsayo() ?? {
      valor: config.sapo.tamanoInicialPx,
      esEnsayoDeConfianza: false,
    };
    this.tamano = Math.min(propuesto.valor, this.lado() * 0.9);
    this.ensayo = {
      fila,
      tamano: this.tamano,
      esEnsayoDeConfianza: propuesto.esEnsayoDeConfianza,
      inicioMs: this.tiempoMs,
    };
  }

  private cerrarEnsayo(acierto: boolean): void {
    const ensayo = this.ensayo;
    if (!ensayo) return;
    this.ensayo = null;
    this.anotar({
      parametro: PARAMETRO,
      valor: ensayo.tamano,
      acierto,
      tiempoReaccionMs: this.tiempoMs - ensayo.inicioMs,
      esEnsayoDeConfianza: ensayo.esEnsayoDeConfianza,
    });
  }

  /** Un tropiezo: fallo, y vuelta al principio del tramo. */
  private tropezar(): void {
    this.cerrarEnsayo(false);
    this.choque = { ...this.sapo, ms: this.tiempoMs };
    this.sapo = { x: Math.floor(this.cols / 2) + 0.5, fila: filaDeRegreso(this.filas, this.sapo.fila) };
    this.salto = null;
  }

  // -------------------------------------------------------------------------
  // Simulación
  // -------------------------------------------------------------------------

  protected cuadro(dtMs: number, tiempoMs: number): void {
    this.tiempoMs = tiempoMs;
    const dt = dtMs / 1000;
    const segundos = tiempoMs / 1000;
    moverFilas(this.filas, dt);

    // Corrientes que cambian: un río da la vuelta de vez en cuando.
    if (this.dificultad.corrientes && tiempoMs >= this.proximaCorrienteMs) {
      const rios = this.filas.filter((f) => f.tipo === 'rio');
      if (rios.length > 0) this.aleatorio.elegir(rios).direccion *= -1;
      this.proximaCorrienteMs += config.sapo.corrienteCadaSeg * 1000;
    }

    const fila = this.filas[this.sapo.fila];
    const enElAire = this.salto !== null && tiempoMs < this.salto.hastaMs;
    if (!enElAire && fila.tipo === 'calle') {
      const media = config.sapo.anchoDeChoque / 2;
      if (atropella(fila, this.sapo.x - media, this.sapo.x + media)) this.tropezar();
    } else if (!enElAire && fila.tipo === 'rio') {
      const tronco = troncoBajo(fila, this.sapo.x, segundos);
      if (!tronco) this.tropezar();
      else {
        // Sobre un tronco, el río lo lleva; si lo saca de la pantalla, tropieza.
        this.sapo.x += fila.direccion * fila.velocidad * dt;
        if (this.sapo.x < 0 || this.sapo.x > this.cols) this.tropezar();
      }
    }

    if (tiempoMs >= config.sapo.duracionNivelSeg * 1000) {
      this.terminarNivel();
      return;
    }
    this.dibujar(tiempoMs);
  }

  // -------------------------------------------------------------------------
  // Dibujo
  // -------------------------------------------------------------------------

  /** Lado de la celda: el tablero deja libre la columna de la cruceta. */
  private lado(): number {
    const { area } = this;
    const cruz = ladoDeBoton() * 3.4;
    return Math.floor(Math.min((area.ancho - cruz) / this.cols, (area.alto - 8) / this.filas.length));
  }

  private dibujar(tiempoMs: number): void {
    const { renderer, area } = this;
    const lado = this.lado();
    const alto = this.filas.length * lado;
    const x0 = Math.round(area.x + 4);
    const y0 = Math.round(area.y + (area.alto - alto) / 2);
    const ancho = this.cols * lado;
    const yDe = (fila: number) => y0 + (this.filas.length - 1 - fila) * lado;
    const segundos = tiempoMs / 1000;
    renderer.limpiar();

    this.filas.forEach((fila, f) => {
      const y = yDe(f);
      if (fila.tipo === 'salida' || fila.tipo === 'medio' || fila.tipo === 'meta') {
        // Franjas seguras: las ven los dos ojos.
        renderer.rect('ambos', x0, y + 1, ancho, 2);
        renderer.rect('ambos', x0, y + lado - 3, ancho, 2);
        return;
      }
      if (fila.tipo === 'rio') {
        for (let c = 0; c < this.cols; c += 2) {
          renderer.rect('ojoDominante', x0 + c * lado + lado / 4, y + lado / 2, lado / 2, 2, {
            factor: config.sapo.factorDeAgua,
          });
        }
      }
      for (const objeto of fila.objetos) {
        const izquierda = Math.max(x0, x0 + objeto.x * lado);
        const derecha = Math.min(x0 + ancho, x0 + (objeto.x + objeto.largo) * lado);
        if (derecha <= izquierda) continue;
        if (fila.tipo === 'calle') {
          renderer.rect('ojoDominante', izquierda + 2, y + lado * 0.18, derecha - izquierda - 4, lado * 0.64);
          // Parabrisas mirando hacia donde va.
          const frente = fila.direccion > 0 ? derecha - lado * 0.35 : izquierda + lado * 0.15;
          if (frente > izquierda && frente + lado * 0.2 < derecha) {
            renderer.borrar(frente, y + lado * 0.3, lado * 0.2, lado * 0.4);
          }
        } else if (hundido(objeto, segundos)) {
          renderer.marco('ojoDominante', izquierda + 2, y + lado * 0.2, derecha - izquierda - 4, lado * 0.6, 2, {
            factor: config.sapo.factorHundido,
          });
        } else {
          const factor = porHundirse(objeto, segundos) ? config.sapo.factorAvisoHundirse : 1;
          renderer.rect('ojoDominante', izquierda + 2, y + lado * 0.2, derecha - izquierda - 4, lado * 0.6, {
            factor,
          });
        }
      }
    });

    // El sapo: ojo ambliope. Durante el salto se desliza de una celda a otra.
    let { x, fila } = this.sapo;
    let avance = 1;
    if (this.salto && tiempoMs < this.salto.hastaMs) {
      avance = 1 - (this.salto.hastaMs - tiempoMs) / config.sapo.saltoMs;
      x = this.salto.x + (x - this.salto.x) * avance;
    }
    const filaVisible = this.salto && avance < 1 ? this.salto.fila + (fila - this.salto.fila) * avance : fila;
    this.dibujarSapo(x0 + x * lado, yDe(0) - filaVisible * lado + lado / 2);

    if (this.choque && tiempoMs - this.choque.ms < config.sapo.avisoChoqueMs) {
      renderer.anilloConAbertura('ambos', x0 + this.choque.x * lado, yDe(this.choque.fila) + lado / 2, lado, 2, 3, 0);
    }

    dibujarBotonera(renderer, this.botones);
    const duracion = config.sapo.duracionNivelSeg;
    const restante = Math.max(0, 1 - tiempoMs / (duracion * 1000));
    dibujarMarcoYHud(renderer, `${this.cruces}`, `${Math.ceil(restante * duracion)} s`, restante);
    this.dibujarAyuda(tiempoMs);
  }

  /** El sapo: un cuerpo redondo con dos ojos saltones. */
  private dibujarSapo(cx: number, cy: number): void {
    const { renderer } = this;
    const t = this.tamano;
    renderer.poligono('ojoAmbliope', puntosDeCirculo(cx, cy + t * 0.08, t * 0.42));
    for (const lado of [-1, 1]) {
      renderer.poligono('ojoAmbliope', puntosDeCirculo(cx + lado * t * 0.26, cy - t * 0.3, t * 0.16));
    }
  }
}

export const sapo: Minijuego = {
  id: 'sapo',
  modulo: 'lentes',
  escaleras: (modo) => escalerasDeSapo(modo),
  crear: (canvas, contexto) => new InstanciaDeSapo(canvas, contexto),
};
