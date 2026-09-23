/**
 * Corte de precisión (módulo de parche).
 * Habilidad: seguir objetos en movimiento.
 *
 * Por el huerto cruzan frutas que hay que cortar deslizando el dedo sobre
 * ellas. Cada fruta es un ensayo: cortarla antes de que se vaya es un acierto
 * y dejarla ir, un fallo. La escalera mueve el contraste de Weber de la fruta
 * sobre el huerto —el real, en 8 bits—; el nivel la achica, la acelera, curva
 * su trayectoria, lanza varias a la vez y, en los últimos mundos, les da
 * acelerones a mitad de vuelo.
 */
import { config, type Modo } from '../../config';
import type { ConfigDeEscalera } from '../../engine/Staircase';
import { aCss, aplicarContrasteWeber, desdeHex } from '../../engine/color';
import { JuegoBase } from '../base';
import { dibujarMarcoYHud, puntosDeCirculo } from '../comun';
import { claveDeEscalera, type ContextoDeJuego, type Minijuego } from '../tipos';
import { dificultadDeCorte, lanzar, mover, seFue, trazoCorta, type Vuelo } from './vuelo';

const PARAMETRO = 'contraste';

export function escalerasDeCorte(modo: Modo): ConfigDeEscalera[] {
  return [
    {
      clave: claveDeEscalera('corte', modo, PARAMETRO),
      valorInicial: config.corte.contrasteInicial,
      minimo: config.corte.contrasteMinimo,
      maximo: config.corte.contrasteMaximo,
    },
  ];
}

interface Fruta {
  vuelo: Vuelo;
  radio: number;
  color: string;
  contrasteReal: number;
  esEnsayoDeConfianza: boolean;
  nacioMs: number;
}

interface Mitad {
  x: number;
  y: number;
  vx: number;
  radio: number;
  color: string;
  /** −1 la de la izquierda, 1 la de la derecha. */
  lado: number;
  nacioMs: number;
}

interface Punto {
  x: number;
  y: number;
}

class InstanciaDeCorte extends JuegoBase {
  private readonly dificultad: ReturnType<typeof dificultadDeCorte>;
  private frutas: Fruta[] = [];
  private mitades: Mitad[] = [];
  private rastro: Array<Punto & { ms: number }> = [];
  private dedo: Punto | null = null;
  private hoja: Punto | null = null;
  private readonly teclas = new Set<string>();
  private proximaMs = 0;
  private cortadas = 0;
  private tiempoMs = 0;

  constructor(canvas: HTMLCanvasElement, ctx: ContextoDeJuego) {
    super(canvas, ctx, 'corte');
    this.dificultad = dificultadDeCorte(ctx.mundo, ctx.nivel);
  }

  protected alIniciar(): void {
    this.proximaMs = config.modulos.ayudaSeg * 1000;

    this.escuchar(this.canvas, 'pointerdown', (evento) => {
      this.dedo = this.puntoDe(evento as PointerEvent);
      this.rastro.push({ ...this.dedo, ms: this.tiempoMs });
    });
    this.escuchar(this.canvas, 'pointermove', (evento) => {
      if (!this.dedo) return;
      const punto = this.puntoDe(evento as PointerEvent);
      this.trazar(this.dedo, punto);
      this.dedo = punto;
    });
    this.escuchar(window, 'pointerup', () => {
      this.dedo = null;
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

  /** Un tramo del dedo o de la hoja: deja rastro y corta lo que atraviesa. */
  private trazar(desde: Punto, hasta: Punto): void {
    this.rastro.push({ ...hasta, ms: this.tiempoMs });
    for (const fruta of [...this.frutas]) {
      if (!trazoCorta(desde, hasta, fruta.vuelo, fruta.radio)) continue;
      this.frutas = this.frutas.filter((f) => f !== fruta);
      this.cortadas += 1;
      for (const lado of [-1, 1]) {
        this.mitades.push({
          x: fruta.vuelo.x,
          y: fruta.vuelo.y,
          vx: lado * fruta.radio * 3,
          radio: fruta.radio,
          color: fruta.color,
          lado,
          nacioMs: this.tiempoMs,
        });
      }
      this.resolver(fruta, true);
    }
  }

  private resolver(fruta: Fruta, acierto: boolean): void {
    this.anotar({
      parametro: PARAMETRO,
      valor: fruta.contrasteReal,
      acierto,
      tiempoReaccionMs: this.tiempoMs - fruta.nacioMs,
      esEnsayoDeConfianza: fruta.esEnsayoDeConfianza,
    });
  }

  private lanzarFruta(): void {
    const propuesto = this.escalera(PARAMETRO)?.proximoEnsayo() ?? {
      valor: config.corte.contrasteInicial,
      esEnsayoDeConfianza: false,
    };
    const huerto = desdeHex(this.renderer.paleta.secundario);
    const color = aplicarContrasteWeber(huerto, propuesto.valor);
    const radio = this.dificultad.tamano / 2;
    this.frutas.push({
      vuelo: lanzar(this.area, this.dificultad, radio, this.aleatorio),
      radio,
      color: aCss(color.rgb),
      contrasteReal: color.contrasteReal,
      esEnsayoDeConfianza: propuesto.esEnsayoDeConfianza,
      nacioMs: this.tiempoMs,
    });
  }

  protected cuadro(dtMs: number, tiempoMs: number): void {
    this.tiempoMs = tiempoMs;
    const dt = dtMs / 1000;
    const { area } = this;

    // Teclado: una hoja que corta mientras se mueve.
    if (this.teclas.size > 0) {
      const desde = this.hoja ?? { x: area.x + area.ancho / 2, y: area.y + area.alto / 2 };
      const paso = config.corte.hojaTecladoVelocidad * area.ancho * dt;
      const hasta = {
        x: desde.x + ((this.teclas.has('ArrowRight') ? 1 : 0) - (this.teclas.has('ArrowLeft') ? 1 : 0)) * paso,
        y: desde.y + ((this.teclas.has('ArrowDown') ? 1 : 0) - (this.teclas.has('ArrowUp') ? 1 : 0)) * paso,
      };
      hasta.x = Math.max(area.x, Math.min(area.x + area.ancho, hasta.x));
      hasta.y = Math.max(area.y, Math.min(area.y + area.alto, hasta.y));
      this.trazar(desde, hasta);
      this.hoja = hasta;
    }

    for (const fruta of [...this.frutas]) {
      mover(fruta.vuelo, dt);
      if (!seFue(fruta.vuelo, area, fruta.radio)) continue;
      this.frutas = this.frutas.filter((f) => f !== fruta);
      this.resolver(fruta, false);
    }

    if (tiempoMs >= this.proximaMs && this.frutas.length < this.dificultad.simultaneos) {
      this.lanzarFruta();
      this.proximaMs = tiempoMs + config.corte.esperaEntreFrutasMs;
    }

    this.mitades = this.mitades.filter((m) => tiempoMs - m.nacioMs < config.corte.mitadesMs);
    this.rastro = this.rastro.filter((p) => tiempoMs - p.ms < config.corte.rastroMs);

    if (tiempoMs >= config.corte.duracionNivelSeg * 1000) {
      this.terminarNivel();
      return;
    }
    this.dibujar(tiempoMs);
  }

  // -------------------------------------------------------------------------
  // Dibujo
  // -------------------------------------------------------------------------

  private dibujar(tiempoMs: number): void {
    const { renderer, area } = this;
    renderer.limpiar();
    renderer.rect('ojoDominante', area.x, area.y, area.ancho, area.alto, {
      tono: renderer.paleta.secundario,
    });

    for (const fruta of this.frutas) this.dibujarFruta(fruta.vuelo.x, fruta.vuelo.y, fruta.radio, fruta.color);

    // Las dos mitades se separan y caen.
    for (const mitad of this.mitades) {
      const segundos = (tiempoMs - mitad.nacioMs) / 1000;
      const x = mitad.x + mitad.vx * segundos;
      const y = mitad.y + 0.5 * config.corte.gravedad * area.alto * segundos * segundos;
      const inicio = mitad.lado < 0 ? Math.PI / 2 : -Math.PI / 2;
      const puntos = Array.from({ length: 9 }, (_, i): [number, number] => {
        const angulo = inicio + (i / 8) * Math.PI;
        return [x + Math.cos(angulo) * mitad.radio, y + Math.sin(angulo) * mitad.radio];
      });
      renderer.poligono('ojoAmbliope', puntos, { tono: mitad.color });
    }

    // El rastro del corte: una fila de puntos que se borra enseguida.
    for (let i = 1; i < this.rastro.length; i += 1) {
      const a = this.rastro[i - 1];
      const b = this.rastro[i];
      const pasos = Math.max(1, Math.ceil(Math.hypot(b.x - a.x, b.y - a.y) / 6));
      for (let p = 0; p <= pasos; p += 1) {
        const x = a.x + ((b.x - a.x) * p) / pasos;
        const y = a.y + ((b.y - a.y) * p) / pasos;
        renderer.rect('ambos', x - 2, y - 2, 4, 4);
      }
    }
    if (this.hoja) {
      renderer.rect('ambos', this.hoja.x - 8, this.hoja.y - 1, 16, 2);
      renderer.rect('ambos', this.hoja.x - 1, this.hoja.y - 8, 2, 16);
    }

    const duracion = config.corte.duracionNivelSeg;
    const restante = Math.max(0, 1 - tiempoMs / (duracion * 1000));
    dibujarMarcoYHud(renderer, `${this.cortadas}`, `${Math.ceil(restante * duracion)} s`, restante);
    this.dibujarAyuda(tiempoMs);
  }

  /** Fruta redonda con su hoja: todo del mismo color, para que solo cuente el contraste. */
  private dibujarFruta(x: number, y: number, radio: number, color: string): void {
    const { renderer } = this;
    renderer.poligono('ojoAmbliope', puntosDeCirculo(x, y, radio), { tono: color });
    renderer.poligono(
      'ojoAmbliope',
      [
        [x, y - radio * 0.8],
        [x + radio * 0.6, y - radio * 1.35],
        [x + radio * 0.15, y - radio * 0.75],
      ],
      { tono: color },
    );
  }
}

export const corte: Minijuego = {
  id: 'corte',
  modulo: 'parche',
  escaleras: (modo) => escalerasDeCorte(modo),
  crear: (canvas, contexto) => new InstanciaDeCorte(canvas, contexto),
};
