/**
 * Lluvia de meteoritos.
 * Habilidad: seguimiento visual, coordinación ojo-mano y distinguir formas
 * pequeñas con rapidez.
 *
 * Caen estrellas de energía (atrapar) y rocas (esquivar) del mismo tamaño y
 * brillo: solo la forma las distingue. La nave nunca se destruye; chocar resta
 * un poco de un medidor que se recarga solo.
 *
 * Un objeto cuenta como ensayo únicamente si pasa cerca de la nave. Los que
 * caen lejos no miden nada y no entran en la precisión.
 *
 * Capas en modo lentes:
 *   ojo ambliope → estrellas y rocas que caen
 *   ojo dominante → nave, estela y estrellas del fondo
 *   ambos → bordes laterales, medidor de energía y HUD
 */
import { config, type Modo } from '../../config';
import { crearAleatorio, type Aleatorio } from '../../engine/rng';
import type { ConfigDeEscalera } from '../../engine/Staircase';
import { GameLoop } from '../../engine/GameLoop';
import { ContadorDeNivel, areaDeJuego, dibujarMarcoYHud } from '../comun';
import { claveDeEscalera, type ContextoDeJuego, type InstanciaDeJuego, type Minijuego } from '../tipos';

const PARAMETRO = 'tamano';

export function escalerasDeMeteoritos(modo: Modo, mundo: number): ConfigDeEscalera[] {
  void mundo;
  return [
    {
      clave: claveDeEscalera('meteoritos', modo, PARAMETRO),
      valorInicial: config.meteoritos.tamanoInicialPx,
      minimo: config.meteoritos.tamanoMinimoPx,
      maximo: config.meteoritos.tamanoMaximoPx,
    },
  ];
}

/**
 * La velocidad y los objetos simultáneos suben a lo largo de los 25 niveles.
 * La escalera solo controla el tamaño; la velocidad la controlan los niveles.
 */
export function dificultad(mundo: number, nivel: number) {
  const niveles = config.progresion.mundos * config.progresion.nivelesPorMundo;
  const indice = (mundo - 1) * config.progresion.nivelesPorMundo + (nivel - 1);
  const avance = niveles > 1 ? Math.max(0, Math.min(1, indice / (niveles - 1))) : 0;

  const entre = (desde: number, hasta: number) => desde + (hasta - desde) * avance;
  return {
    velocidad: entre(
      config.meteoritos.velocidadCaidaInicialPxSeg,
      config.meteoritos.velocidadCaidaFinalPxSeg,
    ),
    simultaneos: Math.round(
      entre(config.meteoritos.objetosSimultaneosMin, config.meteoritos.objetosSimultaneosMax),
    ),
  };
}

/**
 * ¿Este objeto pasó lo bastante cerca de la nave como para contar?
 * Todas las distancias en píxeles CSS.
 */
export function cuentaComoEnsayo(
  distanciaHorizontal: number,
  anchoDeNave: number,
  anchosDeNave = config.meteoritos.anchosDeNaveParaEnsayo,
): boolean {
  return Math.abs(distanciaHorizontal) <= anchoDeNave * anchosDeNave;
}

/** Choque entre la nave y un objeto, por solape de sus cajas. */
export function hayChoque(
  distanciaHorizontal: number,
  anchoDeNave: number,
  tamanoDelObjeto: number,
): boolean {
  return Math.abs(distanciaHorizontal) <= (anchoDeNave + tamanoDelObjeto) / 2;
}

type Tipo = 'estrella' | 'roca';

interface Objeto {
  tipo: Tipo;
  x: number;
  y: number;
  tamano: number;
  valorDeEscalera: number;
  esEnsayoDeConfianza: boolean;
  /** Semilla de la forma de la roca, para que no cambie mientras cae. */
  semilla: number;
  resuelto: boolean;
  nacidoMs: number;
}

class InstanciaDeMeteoritos implements InstanciaDeJuego {
  private readonly bucle: GameLoop;
  private readonly contador = new ContadorDeNivel();
  private readonly aleatorio: Aleatorio;
  private readonly clave: string;
  private readonly velocidad: number;
  private readonly simultaneos: number;

  private objetos: Objeto[] = [];
  private naveX = 0;
  private energia = config.meteoritos.energiaMaxima;
  private estrellasAtrapadas = 0;
  private terminado = false;
  private destruido = false;
  private arrastrando = false;
  private teclaIzquierda = false;
  private teclaDerecha = false;
  private fondo: Array<{ x: number; y: number }> = [];

  constructor(
    private readonly canvas: HTMLCanvasElement,
    private readonly ctx: ContextoDeJuego,
  ) {
    this.clave = escalerasDeMeteoritos(ctx.modo, ctx.mundo)[0].clave;
    const nivelDificil = dificultad(ctx.mundo, ctx.nivel);
    this.velocidad = nivelDificil.velocidad;
    this.simultaneos = nivelDificil.simultaneos;
    this.aleatorio = crearAleatorio(`meteoritos:${ctx.mundo}:${ctx.nivel}:${Date.now()}`);
    this.bucle = new GameLoop((dt, tiempo) => this.cuadro(dt, tiempo));
  }

  iniciar(): void {
    const area = areaDeJuego(this.ctx.renderer);
    this.naveX = area.x + area.ancho / 2;
    this.fondo = Array.from({ length: 40 }, () => ({
      x: area.x + this.aleatorio.siguiente() * area.ancho,
      y: area.y + this.aleatorio.siguiente() * area.alto,
    }));

    this.canvas.addEventListener('pointerdown', this.alTocar);
    this.canvas.addEventListener('pointermove', this.alMover);
    window.addEventListener('pointerup', this.alSoltar);
    window.addEventListener('keydown', this.alBajarTecla);
    window.addEventListener('keyup', this.alSubirTecla);
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

  // -------------------------------------------------------------------------
  // Entrada
  // -------------------------------------------------------------------------

  private alTocar = (evento: PointerEvent) => {
    this.arrastrando = true;
    this.moverNaveHacia(evento);
  };

  private alMover = (evento: PointerEvent) => {
    if (this.arrastrando) this.moverNaveHacia(evento);
  };

  private alSoltar = () => {
    this.arrastrando = false;
  };

  private moverNaveHacia(evento: PointerEvent) {
    const caja = this.canvas.getBoundingClientRect();
    this.naveX = evento.clientX - caja.left;
    this.limitarNave();
  }

  private alBajarTecla = (evento: KeyboardEvent) => {
    if (evento.key === 'ArrowLeft') this.teclaIzquierda = true;
    else if (evento.key === 'ArrowRight') this.teclaDerecha = true;
    else return;
    evento.preventDefault();
  };

  private alSubirTecla = (evento: KeyboardEvent) => {
    if (evento.key === 'ArrowLeft') this.teclaIzquierda = false;
    if (evento.key === 'ArrowRight') this.teclaDerecha = false;
  };

  private limitarNave() {
    const area = areaDeJuego(this.ctx.renderer);
    const mitad = this.anchoDeNave() / 2;
    this.naveX = Math.max(area.x + mitad, Math.min(area.x + area.ancho - mitad, this.naveX));
  }

  // -------------------------------------------------------------------------
  // Simulación
  // -------------------------------------------------------------------------

  private anchoDeNave(): number {
    const area = areaDeJuego(this.ctx.renderer);
    return Math.max(28, Math.round(area.ancho / 14));
  }

  private naveY(): number {
    const area = areaDeJuego(this.ctx.renderer);
    return area.y + area.alto - this.anchoDeNave() * 0.8;
  }

  private nacerObjeto(tiempoMs: number): void {
    const area = areaDeJuego(this.ctx.renderer);
    const escalera = this.ctx.escaleras[this.clave];
    const propuesto = escalera.proximoEnsayo();
    const tipo: Tipo = this.aleatorio.probabilidad(config.meteoritos.probabilidadEstrella)
      ? 'estrella'
      : 'roca';

    // Casi siempre cerca de la nave, para que la mayoría de objetos midan algo.
    const cerca = this.aleatorio.probabilidad(0.75);
    const x = cerca
      ? this.naveX + (this.aleatorio.siguiente() - 0.5) * this.anchoDeNave() * 4
      : area.x + this.aleatorio.siguiente() * area.ancho;

    this.objetos.push({
      tipo,
      x: Math.max(area.x + 10, Math.min(area.x + area.ancho - 10, x)),
      y: area.y - propuesto.valor,
      tamano: propuesto.valor,
      valorDeEscalera: propuesto.valor,
      esEnsayoDeConfianza: propuesto.esEnsayoDeConfianza,
      semilla: this.aleatorio.entero(1, 100000),
      resuelto: false,
      nacidoMs: tiempoMs,
    });
  }

  private cuadro(dtMs: number, tiempoMs: number): void {
    if (this.destruido || this.terminado) return;
    const dt = dtMs / 1000;
    const area = areaDeJuego(this.ctx.renderer);

    // Teclado: la nave se desliza mientras la flecha está pulsada.
    const pasoTeclado = area.ancho * 0.8 * dt;
    if (this.teclaIzquierda) this.naveX -= pasoTeclado;
    if (this.teclaDerecha) this.naveX += pasoTeclado;
    if (this.teclaIzquierda || this.teclaDerecha) this.limitarNave();

    // Nacen escalonados: un hueco vertical mínimo evita que caigan en racimo.
    const enElAire = this.objetos.filter((o) => !o.resuelto);
    const masAlto = enElAire.reduce((menor, o) => Math.min(menor, o.y), Infinity);
    const huecoMinimo = area.alto / (this.simultaneos + 1);
    if (enElAire.length < this.simultaneos && (!Number.isFinite(masAlto) || masAlto > area.y + huecoMinimo)) {
      this.nacerObjeto(tiempoMs);
    }

    const naveY = this.naveY();
    const anchoNave = this.anchoDeNave();

    for (const objeto of this.objetos) {
      objeto.y += this.velocidad * dt;
      if (objeto.resuelto || objeto.y < naveY) continue;

      objeto.resuelto = true;
      const distancia = objeto.x - this.naveX;

      // Solo los objetos que pasan cerca miden algo.
      if (!cuentaComoEnsayo(distancia, anchoNave)) continue;

      const choque = hayChoque(distancia, anchoNave, objeto.tamano);
      const acierto = objeto.tipo === 'estrella' ? choque : !choque;

      if (objeto.tipo === 'estrella' && choque) this.estrellasAtrapadas += 1;
      if (objeto.tipo === 'roca' && choque) {
        // La nave nunca se destruye: solo baja la energía, que se recarga sola.
        this.energia = Math.max(0, this.energia - config.meteoritos.energiaPorChoque);
      }

      // Cada objeto recuerda si nació como ensayo de confianza: aquí se
      // resuelven en el orden en que llegan, no en el que nacieron.
      this.ctx.escaleras[this.clave].record(acierto, objeto.esEnsayoDeConfianza);

      this.contador.registrar(acierto, tiempoMs - objeto.nacidoMs, objeto.esEnsayoDeConfianza);
      this.ctx.onEnsayo({
        juego: 'meteoritos',
        modo: this.ctx.modo,
        parametro: PARAMETRO,
        valor: objeto.tamano,
        acierto,
        tiempoReaccionMs: tiempoMs - objeto.nacidoMs,
        esEnsayoDeConfianza: objeto.esEnsayoDeConfianza,
        detalle: objeto.tipo,
      });
    }

    this.objetos = this.objetos.filter((o) => o.y < area.y + area.alto + o.tamano);
    this.energia = Math.min(
      config.meteoritos.energiaMaxima,
      this.energia + config.meteoritos.energiaRecargaPorSeg * dt,
    );

    if (tiempoMs >= config.meteoritos.duracionNivelSeg * 1000) {
      this.terminarNivel();
      return;
    }
    this.dibujar(tiempoMs);
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
  // Dibujo
  // -------------------------------------------------------------------------

  private dibujar(tiempoMs: number): void {
    const { renderer } = this.ctx;
    const area = areaDeJuego(renderer);
    renderer.limpiar();

    // Estrellas del fondo y nave: capa del ojo dominante.
    for (const punto of this.fondo) {
      renderer.rect('ojoDominante', punto.x, punto.y, 1, 1, { tono: renderer.paleta.secundario });
    }
    this.dibujarNave();

    // Estrellas de energía y rocas: capa del ojo ambliope, mismo color y tamaño.
    for (const objeto of this.objetos) {
      if (objeto.tipo === 'estrella') this.dibujarEstrella(objeto);
      else this.dibujarRoca(objeto);
    }

    // Medidor de energía y HUD: capa de ambos ojos.
    // Va pegado al borde derecho para no chocar con el botón de pausa.
    const anchoMedidor = Math.round(area.ancho * 0.25);
    const xMedidor = area.x + area.ancho - anchoMedidor;
    const yMedidor = area.y + area.alto - 12;
    const lleno = Math.round((this.energia / config.meteoritos.energiaMaxima) * (anchoMedidor - 2));
    renderer.marco('ambos', xMedidor, yMedidor, anchoMedidor, 12, 1);
    renderer.rect('ambos', xMedidor + 1, yMedidor + 1, Math.max(0, lleno), 10);

    const restante = Math.max(0, 1 - tiempoMs / (config.meteoritos.duracionNivelSeg * 1000));
    dibujarMarcoYHud(renderer, `${this.estrellasAtrapadas}`, `${Math.ceil(restante * config.meteoritos.duracionNivelSeg)} s`, restante);
  }

  private dibujarNave(): void {
    const { renderer } = this.ctx;
    const ancho = this.anchoDeNave();
    const y = this.naveY();
    const x = this.naveX;
    const mitad = ancho / 2;

    renderer.poligono('ojoDominante', [
      [x, y - mitad * 0.9],
      [x + mitad, y + mitad * 0.6],
      [x, y + mitad * 0.2],
      [x - mitad, y + mitad * 0.6],
    ]);
    // Estela.
    renderer.rect('ojoDominante', x - 2, y + mitad * 0.4, 4, mitad * 0.6, { factor: 0.6 });
  }

  /** Estrella de cuatro puntas. */
  private dibujarEstrella(objeto: Objeto): void {
    const r = objeto.tamano / 2;
    const interno = r * 0.34;
    const puntos: Array<[number, number]> = [];
    for (let i = 0; i < 8; i += 1) {
      const angulo = (i / 8) * Math.PI * 2 - Math.PI / 2;
      const radio = i % 2 === 0 ? r : interno;
      puntos.push([objeto.x + Math.cos(angulo) * radio, objeto.y + Math.sin(angulo) * radio]);
    }
    this.ctx.renderer.poligono('ojoAmbliope', puntos, {
      tono: this.ctx.renderer.paleta.acento,
    });
  }

  /** Roca: polígono irregular con un cráter. Mismo tamaño y brillo que la estrella. */
  private dibujarRoca(objeto: Objeto): void {
    const forma = crearAleatorio(objeto.semilla);
    const r = objeto.tamano / 2;
    const lados = 7;
    const puntos: Array<[number, number]> = [];
    for (let i = 0; i < lados; i += 1) {
      const angulo = (i / lados) * Math.PI * 2;
      const radio = r * (0.75 + forma.siguiente() * 0.25);
      puntos.push([objeto.x + Math.cos(angulo) * radio, objeto.y + Math.sin(angulo) * radio]);
    }
    this.ctx.renderer.poligono('ojoAmbliope', puntos, { tono: this.ctx.renderer.paleta.acento });

    // El cráter se vacía al color del fondo para que se lea como hueco.
    const crater = Math.max(1, Math.round(objeto.tamano * 0.22));
    this.ctx.renderer.borrar(objeto.x - crater / 2, objeto.y - crater / 2, crater, crater);
  }
}

export const meteoritos: Minijuego = {
  id: 'meteoritos',
  escaleras: escalerasDeMeteoritos,
  crear: (canvas, contexto) => new InstanciaDeMeteoritos(canvas, contexto),
};
