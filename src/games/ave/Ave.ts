/**
 * El ave voladora (módulo de lentes).
 * Habilidad: guiar con los dos ojos.
 *
 * Tocando se aletea; hay que pasar por el hueco de cada barrera. Las
 * barreras solo las ve el ojo ambliope; el ave y las nubes, solo el
 * dominante. Cada barrera es un ensayo: cruzarla sin rozar es un acierto.
 * La escalera mueve la luminancia de las barreras dentro del color de su
 * lente; el nivel estrecha el hueco, acelera el avance y, en los últimos
 * mundos, hace que las barreras suban y bajen. Chocar no termina nada: el ave
 * atraviesa la barrera como un fantasma y sigue volando.
 *
 * Capas en modo lentes:
 *   ojo ambliope → las barreras
 *   ojo dominante → el ave y las nubes del fondo
 *   ambos → el suelo, el marco y el HUD
 */
import { config, type Modo } from '../../config';
import type { ConfigDeEscalera } from '../../engine/Staircase';
import type { Sprite } from '../../engine/DichopticRenderer';
import { JuegoBase } from '../base';
import { dibujarMarcoYHud, teclaDe } from '../comun';
import { claveDeEscalera, type ContextoDeJuego, type Minijuego } from '../tipos';
import { aletear, caer, chocaConBarrera, dificultadDeAve, siguienteHueco, type Ave } from './vuelo';

const PARAMETRO = 'contraste';

export function escalerasDeAve(modo: Modo): ConfigDeEscalera[] {
  return [
    {
      clave: claveDeEscalera('ave', modo, PARAMETRO),
      valorInicial: config.ave.contrasteInicial,
      minimo: config.ave.contrasteMinimo,
      maximo: config.ave.contrasteMaximo,
    },
  ];
}

/** El ave, mirando a la derecha: con el ala arriba al subir y abajo al caer. */
const AVE_SUBE = [
  '..WW.....',
  '.KWWK....',
  '.KHHHKK..',
  'KHHHHH.K.',
  'KHHHHHHKP',
  '.KHHHHK..',
  '..KKKK...',
];
const AVE_BAJA = [
  '...KKK...',
  '..KHHHK..',
  '.KHHHHH.K',
  'KHHHHHHKP',
  'KWWHHHHK.',
  '.KWWHHK..',
  '..KKK....',
];

const PALETA_DEL_AVE: Sprite['paleta'] = {
  K: { color: '#3D6FA8', factorLentes: 0.55 },
  H: { color: '#6FB3FF', factorLentes: 1 },
  W: { color: '#EDE9FF', factorLentes: 0.8 },
  P: { color: '#FFC23D', factorLentes: 0.9 },
};

interface Barrera {
  x: number;
  centro: number;
  fase: number;
  factor: number;
  esEnsayoDeConfianza: boolean;
  nacioMs: number;
  chocada: boolean;
}

class InstanciaDeAve extends JuegoBase {
  private readonly dificultad: ReturnType<typeof dificultadDeAve>;
  private ave: Ave = { y: 0, vy: 0 };
  private barreras: Barrera[] = [];
  private nubes: Array<{ x: number; y: number; ancho: number }> = [];
  private volando = false;
  private fantasmaHastaMs = 0;
  private superadas = 0;
  private tiempoMs = 0;

  constructor(canvas: HTMLCanvasElement, ctx: ContextoDeJuego) {
    super(canvas, ctx, 'ave');
    this.dificultad = dificultadDeAve(ctx.mundo, ctx.nivel);
  }

  protected alIniciar(): void {
    const { area } = this;
    this.ave = { y: area.y + area.alto / 2, vy: 0 };
    this.nubes = Array.from({ length: 7 }, () => ({
      x: area.x + this.aleatorio.siguiente() * area.ancho,
      y: area.y + this.aleatorio.siguiente() * area.alto * 0.8,
      ancho: area.ancho * (0.06 + this.aleatorio.siguiente() * 0.08),
    }));

    const aleteo = () => {
      this.volando = true;
      aletear(this.ave, this.area.alto);
    };
    this.escuchar(this.canvas, 'pointerdown', aleteo);
    this.escuchar(window, 'keydown', (evento) => {
      const tecla = teclaDe(evento);
      if (tecla !== ' ' && tecla !== 'ArrowUp' && tecla !== 'Enter') return;
      evento.preventDefault();
      aleteo();
    });
  }

  // -------------------------------------------------------------------------
  // Geometría
  // -------------------------------------------------------------------------

  private escala(): number {
    return Math.max(2, Math.round(this.area.alto / 110));
  }

  private radio(): number {
    return (AVE_SUBE.length * this.escala()) / 2 - 1;
  }

  private aveX(): number {
    return this.area.x + this.area.ancho * config.ave.posicionDelAve;
  }

  private techo(): number {
    return this.area.y + this.radio();
  }

  private suelo(): number {
    return this.area.y + this.area.alto - config.ave.sueloPx - this.radio();
  }

  private anchoDeBarrera(): number {
    return Math.max(config.ave.anchoMinimoDeBarreraPx, this.area.ancho * config.ave.anchoDeBarrera);
  }

  private hueco(): number {
    return this.dificultad.hueco * this.area.alto;
  }

  private centroAhora(barrera: Barrera): number {
    const { vaiven } = this.dificultad;
    if (vaiven === 0) return barrera.centro;
    const fase = (this.tiempoMs / 1000 / config.ave.vaivenPeriodoSeg) * Math.PI * 2 + barrera.fase;
    const recorrido = vaiven * this.area.alto;
    // El vaivén no puede sacar el hueco fuera de la pantalla.
    const minimo = this.area.y + this.hueco() / 2;
    const maximo = this.area.y + this.area.alto - config.ave.sueloPx - this.hueco() / 2;
    return Math.max(minimo, Math.min(maximo, barrera.centro + Math.sin(fase) * recorrido));
  }

  private rapidez(): number {
    const base = this.dificultad.velocidad * this.area.ancho;
    const segundos = Math.max(0, this.tiempoMs / 1000 - config.modulos.ayudaSeg);
    const acelerada = base + this.dificultad.aceleracion * this.area.ancho * segundos;
    return Math.min(acelerada, base * config.ave.aceleracionMaxima);
  }

  // -------------------------------------------------------------------------
  // Simulación
  // -------------------------------------------------------------------------

  private nuevaBarrera(): void {
    const { area } = this;
    const anterior = this.barreras[this.barreras.length - 1]?.centro ?? area.y + area.alto / 2;
    const propuesto = this.escalera(PARAMETRO)?.proximoEnsayo() ?? {
      valor: config.ave.contrasteInicial,
      esEnsayoDeConfianza: false,
    };
    this.barreras.push({
      x: area.x + area.ancho,
      centro: siguienteHueco(
        anterior,
        this.hueco(),
        area.y,
        area.y + area.alto - config.ave.sueloPx,
        this.aleatorio.siguiente(),
      ),
      fase: this.aleatorio.siguiente() * Math.PI * 2,
      factor: propuesto.valor,
      esEnsayoDeConfianza: propuesto.esEnsayoDeConfianza,
      nacioMs: this.tiempoMs,
      chocada: false,
    });
  }

  protected cuadro(dtMs: number, tiempoMs: number): void {
    this.tiempoMs = tiempoMs;
    const dt = dtMs / 1000;
    const { area } = this;
    const empezo = tiempoMs >= config.modulos.ayudaSeg * 1000;

    // Hasta el primer aleteo el ave planea quieta.
    if (this.volando || empezo) {
      this.volando = true;
      caer(this.ave, dt, area.alto, this.techo(), this.suelo());
    }

    const rapidez = this.rapidez();
    for (const nube of this.nubes) {
      nube.x -= rapidez * dt * 0.3;
      if (nube.x + nube.ancho < area.x) nube.x = area.x + area.ancho;
    }

    if (empezo) {
      const ultima = this.barreras[this.barreras.length - 1];
      if (!ultima || ultima.x <= area.x + area.ancho * (1 - config.ave.separacionDeBarreras)) {
        this.nuevaBarrera();
      }
    }

    const ancho = this.anchoDeBarrera();
    const aveX = this.aveX();
    const radio = this.radio();
    for (const barrera of [...this.barreras]) {
      barrera.x -= rapidez * dt;
      const centro = this.centroAhora(barrera);
      if (
        !barrera.chocada &&
        tiempoMs >= this.fantasmaHastaMs &&
        chocaConBarrera(aveX, this.ave.y, radio, barrera.x, ancho, centro, this.hueco())
      ) {
        barrera.chocada = true;
        this.fantasmaHastaMs = tiempoMs + config.ave.fantasmaMs;
      }
      // Ya la dejó atrás: se juzga.
      if (barrera.x + ancho < aveX - radio) {
        this.barreras = this.barreras.filter((b) => b !== barrera);
        if (!barrera.chocada) this.superadas += 1;
        this.anotar({
          parametro: PARAMETRO,
          valor: barrera.factor,
          acierto: !barrera.chocada,
          tiempoReaccionMs: tiempoMs - barrera.nacioMs,
          esEnsayoDeConfianza: barrera.esEnsayoDeConfianza,
        });
      }
    }

    if (tiempoMs >= config.ave.duracionNivelSeg * 1000) {
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

    for (const nube of this.nubes) {
      const alto = Math.max(4, nube.ancho / 4);
      const op = { factor: config.ave.factorDeNubes };
      renderer.rect('ojoDominante', nube.x, nube.y, nube.ancho, alto, op);
      renderer.rect('ojoDominante', nube.x + nube.ancho * 0.2, nube.y - alto / 2, nube.ancho * 0.45, alto / 2, op);
    }

    // Barreras: ojo ambliope, con un reborde en la boca del hueco.
    const ancho = this.anchoDeBarrera();
    const hueco = this.hueco();
    const suelo = area.y + area.alto - config.ave.sueloPx;
    const reborde = Math.max(4, Math.round(ancho / 6));
    for (const barrera of this.barreras) {
      const centro = this.centroAhora(barrera);
      const arriba = centro - hueco / 2;
      const abajo = centro + hueco / 2;
      const x = Math.max(area.x, barrera.x);
      const derecha = Math.min(area.x + area.ancho, barrera.x + ancho);
      if (derecha <= x) continue;
      const op = { factor: barrera.factor };
      renderer.rect('ojoAmbliope', x, area.y, derecha - x, arriba - area.y, op);
      renderer.rect('ojoAmbliope', x, abajo, derecha - x, suelo - abajo, op);
      const xr = Math.max(area.x, barrera.x - reborde);
      const derechaR = Math.min(area.x + area.ancho, barrera.x + ancho + reborde);
      renderer.rect('ojoAmbliope', xr, arriba - reborde * 2, derechaR - xr, reborde * 2, op);
      renderer.rect('ojoAmbliope', xr, abajo, derechaR - xr, reborde * 2, op);
    }

    renderer.rect('ambos', area.x, suelo, area.ancho, config.ave.sueloPx);

    // El ave: ojo dominante. Recién chocada se ve más tenue: está de fantasma.
    const escala = this.escala();
    const mapa = this.ave.vy < 0 ? AVE_SUBE : AVE_BAJA;
    const fantasma = tiempoMs < this.fantasmaHastaMs;
    const paleta = fantasma
      ? Object.fromEntries(
          Object.entries(PALETA_DEL_AVE).map(([k, v]) => [k, { ...v, factorLentes: (v.factorLentes ?? 1) * 0.5 }]),
        )
      : PALETA_DEL_AVE;
    renderer.sprite(
      'ojoDominante',
      { pixeles: mapa, paleta },
      this.aveX() - (mapa[0].length * escala) / 2,
      this.ave.y - (mapa.length * escala) / 2,
      escala,
    );

    const duracion = config.ave.duracionNivelSeg;
    const restante = Math.max(0, 1 - tiempoMs / (duracion * 1000));
    dibujarMarcoYHud(renderer, `${this.superadas}`, `${Math.ceil(restante * duracion)} s`, restante);
    this.dibujarAyuda(tiempoMs);
  }
}

export const ave: Minijuego = {
  id: 'ave',
  modulo: 'lentes',
  escaleras: (modo) => escalerasDeAve(modo),
  crear: (canvas, contexto) => new InstanciaDeAve(canvas, contexto),
};
