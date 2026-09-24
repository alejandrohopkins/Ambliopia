/**
 * Mosaicos y secuencias (módulo de lentes).
 * Habilidad: detalle fino y lógica.
 *
 * Un mosaico de piezas con el mismo símbolo girado sigue una regla; falta una
 * pieza y hay que elegirla entre cuatro. Las piezas de las que se deduce la
 * que falta y las cuatro opciones solo las ve el ojo ambliope; el resto del
 * mosaico, solo el dominante; los marcos, los dos. Cada mosaico es un
 * ensayo. La escalera mueve el tamaño del símbolo; el nivel cambia la regla,
 * agranda el mosaico y, en los últimos mundos, pone un límite de tiempo.
 *
 * Capas en modo lentes:
 *   ojo ambliope → piezas clave y opciones
 *   ojo dominante → el resto del mosaico
 *   ambos → marcos de las piezas, el hueco, marco y HUD
 */
import { config, type Modo } from '../../config';
import type { ConfigDeEscalera } from '../../engine/Staircase';
import type { Capa } from '../../engine/DichopticRenderer';
import { JuegoBase } from '../base';
import { dibujarMarcoYHud, teclaDe } from '../comun';
import { claveDeEscalera, type ContextoDeJuego, type Minijuego } from '../tipos';
import {
  crearMosaico,
  dificultadDeMosaicos,
  mapaDeSimbolo,
  tamanoDibujable,
  type Giro,
  type Mosaico,
} from './patrones';

const PARAMETRO = 'tamano';
const OPCIONES: Giro[] = [0, 1, 2, 3];

/** Signo de interrogación del hueco, en una rejilla de 5 × 7. */
const PREGUNTA = ['.###.', '#...#', '....#', '...#.', '..#..', '.....', '..#..'];

export function escalerasDeMosaicos(modo: Modo): ConfigDeEscalera[] {
  return [
    {
      clave: claveDeEscalera('mosaicos', modo, PARAMETRO),
      valorInicial: config.mosaicos.tamanoInicialPx,
      minimo: config.mosaicos.tamanoMinimoPx,
      maximo: config.mosaicos.tamanoMaximoPx,
    },
  ];
}

interface Ensayo {
  mosaico: Mosaico;
  tamano: number;
  esEnsayoDeConfianza: boolean;
  inicioMs: number;
  elegida: number | null;
  revelarHastaMs: number | null;
}

class InstanciaDeMosaicos extends JuegoBase {
  private readonly dificultad: ReturnType<typeof dificultadDeMosaicos>;
  private ensayo: Ensayo | null = null;
  private hechos = 0;
  private aciertos = 0;
  private cursor = 0;
  private conTeclado = false;
  private tiempoMs = 0;

  constructor(canvas: HTMLCanvasElement, ctx: ContextoDeJuego) {
    super(canvas, ctx, 'mosaicos');
    this.dificultad = dificultadDeMosaicos(ctx.mundo);
  }

  protected alIniciar(): void {
    this.escuchar(this.canvas, 'pointerdown', (evento) => {
      const { x, y } = this.puntoDe(evento as PointerEvent);
      this.conTeclado = false;
      const indice = this.opciones().findIndex(
        (caja) => x >= caja.x && x <= caja.x + caja.lado && y >= caja.y && y <= caja.y + caja.lado,
      );
      if (indice >= 0) this.elegir(indice);
    });
    this.escuchar(window, 'keydown', (evento) => {
      const tecla = teclaDe(evento);
      const numero = Number(tecla);
      if (numero >= 1 && numero <= OPCIONES.length) this.elegir(numero - 1);
      else if (tecla === 'ArrowLeft') this.cursor = Math.max(0, this.cursor - 1);
      else if (tecla === 'ArrowRight') this.cursor = Math.min(OPCIONES.length - 1, this.cursor + 1);
      else if (tecla === ' ' || tecla === 'Enter') this.elegir(this.cursor);
      else return;
      this.conTeclado = true;
      evento.preventDefault();
    });
  }

  // -------------------------------------------------------------------------
  // Geometría
  // -------------------------------------------------------------------------

  private ladoDeOpcion(): number {
    const { area } = this;
    return Math.floor(Math.min(area.alto * 0.18, (area.ancho - config.modulos.zonaDePausaPx) / 5));
  }

  private opciones(): Array<{ x: number; y: number; lado: number }> {
    const { area } = this;
    const lado = this.ladoDeOpcion();
    const hueco = lado * 0.25;
    const total = OPCIONES.length * lado + (OPCIONES.length - 1) * hueco;
    const x0 = Math.max(area.x + (area.ancho - total) / 2, config.modulos.zonaDePausaPx);
    const y = area.y + area.alto - lado - 8;
    return OPCIONES.map((_, i) => ({ x: x0 + i * (lado + hueco), y, lado }));
  }

  private rejilla(): { x: number; y: number; pieza: number } {
    const { area } = this;
    const { lado } = this.dificultad;
    const alto = area.alto - this.ladoDeOpcion() - 32;
    const pieza = Math.floor(Math.min(alto / lado, (area.ancho * 0.9) / lado));
    return {
      x: Math.round(area.x + (area.ancho - pieza * lado) / 2),
      y: Math.round(area.y + (alto - pieza * lado) / 2),
      pieza,
    };
  }

  /** El símbolo cabe siempre en su pieza y en su opción, con trazos enteros. */
  private tamanoQueCabe(valor: number): number {
    const cabe = Math.min(this.rejilla().pieza, this.ladoDeOpcion()) * 0.8;
    return Math.min(tamanoDibujable(valor), Math.max(5, Math.floor(cabe / 5) * 5));
  }

  // -------------------------------------------------------------------------
  // Ensayos
  // -------------------------------------------------------------------------

  private nuevoEnsayo(): void {
    const propuesto = this.escalera(PARAMETRO)?.proximoEnsayo() ?? {
      valor: config.mosaicos.tamanoInicialPx,
      esEnsayoDeConfianza: false,
    };
    this.ensayo = {
      mosaico: crearMosaico(this.dificultad.lado, this.dificultad.regla, this.aleatorio),
      tamano: this.tamanoQueCabe(propuesto.valor),
      esEnsayoDeConfianza: propuesto.esEnsayoDeConfianza,
      inicioMs: this.tiempoMs,
      elegida: null,
      revelarHastaMs: null,
    };
  }

  /** Elegir una opción, o quedarse sin tiempo (null). */
  private elegir(indice: number | null): void {
    const ensayo = this.ensayo;
    if (!ensayo || ensayo.revelarHastaMs !== null) return;
    const correcta = ensayo.mosaico.giros[ensayo.mosaico.falta];
    const acierto = indice !== null && OPCIONES[indice] === correcta;
    ensayo.elegida = indice;
    ensayo.revelarHastaMs = this.tiempoMs + config.modulos.revelarMs;
    this.hechos += 1;
    if (acierto) this.aciertos += 1;
    this.anotar({
      parametro: PARAMETRO,
      valor: ensayo.tamano,
      acierto,
      tiempoReaccionMs: this.tiempoMs - ensayo.inicioMs,
      esEnsayoDeConfianza: ensayo.esEnsayoDeConfianza,
    });
  }

  protected cuadro(_dtMs: number, tiempoMs: number): void {
    this.tiempoMs = tiempoMs;
    const ensayo = this.ensayo;
    if (!ensayo && tiempoMs >= config.modulos.ayudaSeg * 1000) this.nuevoEnsayo();

    const { limiteSeg } = this.dificultad;
    if (ensayo && ensayo.revelarHastaMs === null && limiteSeg > 0) {
      if (tiempoMs - ensayo.inicioMs >= limiteSeg * 1000) this.elegir(null);
    }

    if (ensayo && ensayo.revelarHastaMs !== null && tiempoMs >= ensayo.revelarHastaMs) {
      if (this.hechos >= config.mosaicos.ensayosPorNivel) {
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

  private simbolo(capa: Capa, giro: Giro, cx: number, cy: number, tamano: number): void {
    const escala = tamano / 5;
    this.renderer.sprite(
      capa,
      { pixeles: mapaDeSimbolo(giro), paleta: { '#': { color: this.renderer.paleta.acento } } },
      cx - tamano / 2,
      cy - tamano / 2,
      escala,
    );
  }

  private dibujar(tiempoMs: number): void {
    const { renderer } = this;
    renderer.limpiar();
    const ensayo = this.ensayo;

    if (ensayo) {
      const { mosaico, tamano } = ensayo;
      const { x, y, pieza } = this.rejilla();
      const claves = new Set(mosaico.claves);
      const revelando = ensayo.revelarHastaMs !== null;

      mosaico.giros.forEach((giro, i) => {
        const px = x + (i % mosaico.lado) * pieza;
        const py = y + Math.floor(i / mosaico.lado) * pieza;
        const cx = px + pieza / 2;
        const cy = py + pieza / 2;
        if (i === mosaico.falta) {
          renderer.marco('ambos', px + 2, py + 2, pieza - 4, pieza - 4, 3);
          if (revelando) this.simbolo('ojoAmbliope', giro, cx, cy, tamano);
          else {
            const escala = Math.max(2, Math.floor(pieza / 16));
            renderer.sprite(
              'ambos',
              { pixeles: PREGUNTA, paleta: { '#': { color: renderer.paleta.hud } } },
              cx - (5 * escala) / 2,
              cy - (7 * escala) / 2,
              escala,
            );
          }
          return;
        }
        renderer.marco('ambos', px + 2, py + 2, pieza - 4, pieza - 4, 1);
        this.simbolo(claves.has(i) ? 'ojoAmbliope' : 'ojoDominante', giro, cx, cy, tamano);
      });

      const correcta = mosaico.giros[mosaico.falta];
      this.opciones().forEach((caja, i) => {
        const resaltada = revelando ? OPCIONES[i] === correcta : this.conTeclado && i === this.cursor;
        renderer.marco('ambos', caja.x, caja.y, caja.lado, caja.lado, resaltada ? 4 : 2);
        this.simbolo('ojoAmbliope', OPCIONES[i], caja.x + caja.lado / 2, caja.y + caja.lado / 2, tamano);
      });
    }

    const total = config.mosaicos.ensayosPorNivel;
    let derecha = `${this.hechos}/${total}`;
    const { limiteSeg } = this.dificultad;
    if (ensayo && ensayo.revelarHastaMs === null && limiteSeg > 0) {
      derecha = `${Math.max(0, Math.ceil(limiteSeg - (tiempoMs - ensayo.inicioMs) / 1000))} s`;
    }
    dibujarMarcoYHud(renderer, `${this.aciertos}`, derecha, this.hechos / total);
    this.dibujarAyuda(tiempoMs);
  }
}

export const mosaicos: Minijuego = {
  id: 'mosaicos',
  modulo: 'lentes',
  escaleras: (modo) => escalerasDeMosaicos(modo),
  crear: (canvas, contexto) => new InstanciaDeMosaicos(canvas, contexto),
};
