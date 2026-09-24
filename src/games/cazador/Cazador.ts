/**
 * Cazador de objetivos (módulo de parche).
 * Habilidad: reaccionar y buscar con la mirada.
 *
 * En una rejilla de agujeros asoman dianas que hay que tocar antes de que se
 * escondan. Cada diana es un ensayo: tocarla a tiempo es un acierto y dejarla
 * ir, un fallo. Desde los primeros mundos también asoman bombas del mismo
 * tamaño y brillo —una diana es un anillo con un punto, una bomba es un
 * disco lleno—: tocar una bomba cuenta como fallo. La escalera mueve el
 * tamaño; el nivel, el tiempo que se quedan, el ritmo, cuántas asoman a la
 * vez, las bombas y el vaivén de la rejilla.
 */
import { config, type Modo } from '../../config';
import type { ConfigDeEscalera } from '../../engine/Staircase';
import { JuegoBase } from '../base';
import { dibujarMarcoYHud, puntosDeCirculo, teclaDe } from '../comun';
import { claveDeEscalera, type ContextoDeJuego, type Minijuego } from '../tipos';
import { desplazamientoDeVaiven, dificultadDeCazador, siguienteEspera, toqueAcierta } from './ritmo';

const PARAMETRO = 'tamano';

export function escalerasDeCazador(modo: Modo): ConfigDeEscalera[] {
  return [
    {
      clave: claveDeEscalera('cazador', modo, PARAMETRO),
      valorInicial: config.cazador.tamanoInicialPx,
      minimo: config.cazador.tamanoMinimoPx,
      maximo: config.cazador.tamanoMaximoPx,
    },
  ];
}

type Tipo = 'diana' | 'bomba';

interface Aparicion {
  col: number;
  fila: number;
  tipo: Tipo;
  tamano: number;
  esEnsayoDeConfianza: boolean;
  nacioMs: number;
  hastaMs: number;
}

interface Aviso {
  x: number;
  y: number;
  acierto: boolean;
  nacioMs: number;
}

class InstanciaDeCazador extends JuegoBase {
  private readonly dificultad: ReturnType<typeof dificultadDeCazador>;
  private apariciones: Aparicion[] = [];
  private avisos: Aviso[] = [];
  private proximaMs = 0;
  private cazadas = 0;
  private tiempoMs = 0;
  private cursor = { col: 0, fila: 0 };
  private conTeclado = false;

  constructor(canvas: HTMLCanvasElement, ctx: ContextoDeJuego) {
    super(canvas, ctx, 'cazador');
    this.dificultad = dificultadDeCazador(ctx.mundo, ctx.nivel);
  }

  protected alIniciar(): void {
    // La primera diana espera a que se lea la explicación, que tapa la fila de arriba.
    this.proximaMs = config.modulos.ayudaSeg * 1000;

    this.escuchar(this.canvas, 'pointerdown', (evento) => {
      const punto = this.puntoDe(evento as PointerEvent);
      this.conTeclado = false;
      this.tocar(punto.x, punto.y);
    });
    this.escuchar(window, 'keydown', (evento) => {
      const { cols, filas } = this.dificultad.rejilla;
      const tecla = teclaDe(evento);
      if (tecla === 'ArrowLeft') this.cursor.col = Math.max(0, this.cursor.col - 1);
      else if (tecla === 'ArrowRight') this.cursor.col = Math.min(cols - 1, this.cursor.col + 1);
      else if (tecla === 'ArrowUp') this.cursor.fila = Math.max(0, this.cursor.fila - 1);
      else if (tecla === 'ArrowDown') this.cursor.fila = Math.min(filas - 1, this.cursor.fila + 1);
      else if (tecla === ' ' || tecla === 'Enter') this.golpearCursor();
      else return;
      this.conTeclado = true;
      evento.preventDefault();
    });
  }

  // -------------------------------------------------------------------------
  // Geometría
  // -------------------------------------------------------------------------

  /** Lado de la celda: cabe con el vaivén incluido y deja libre el botón de pausa. */
  private lado(): number {
    const { area } = this;
    const { cols, filas } = this.dificultad.rejilla;
    const alto = area.alto - config.modulos.margenInferiorPx;
    return Math.floor(Math.min(area.ancho / (cols + 2 * this.dificultad.vaiven), alto / filas));
  }

  private centroDe(col: number, fila: number): { x: number; y: number } {
    const { area } = this;
    const { cols, filas } = this.dificultad.rejilla;
    const lado = this.lado();
    const alto = area.alto - config.modulos.margenInferiorPx;
    const x0 = area.x + (area.ancho - lado * cols) / 2;
    const y0 = area.y + (alto - lado * filas) / 2;
    const vaiven = desplazamientoDeVaiven(this.dificultad.vaiven, lado, this.tiempoMs);
    return { x: x0 + vaiven + (col + 0.5) * lado, y: y0 + (fila + 0.5) * lado };
  }

  private ladoDeAgujero(): number {
    return Math.round(this.lado() * config.cazador.agujeroEnCelda);
  }

  private tamanoQueCabe(valor: number): number {
    return Math.min(valor, this.ladoDeAgujero() * config.cazador.fraccionMaximaDelAgujero);
  }

  // -------------------------------------------------------------------------
  // Entrada
  // -------------------------------------------------------------------------

  private tocar(x: number, y: number): void {
    let elegida: Aparicion | null = null;
    let menor = Infinity;
    for (const aparicion of this.apariciones) {
      const centro = this.centroDe(aparicion.col, aparicion.fila);
      if (!toqueAcierta(x, y, centro.x, centro.y, aparicion.tamano)) continue;
      const distancia = Math.hypot(x - centro.x, y - centro.y);
      if (distancia < menor) {
        menor = distancia;
        elegida = aparicion;
      }
    }
    if (elegida) this.resolver(elegida, true);
  }

  /** Con el teclado se golpea el agujero entero: no hay dedo que afinar. */
  private golpearCursor(): void {
    const aparicion = this.apariciones.find(
      (a) => a.col === this.cursor.col && a.fila === this.cursor.fila,
    );
    if (aparicion) this.resolver(aparicion, true);
  }

  /** Un toque sobre una aparición, o una diana que se esconde sin tocar. */
  private resolver(aparicion: Aparicion, tocada: boolean): void {
    this.apariciones = this.apariciones.filter((a) => a !== aparicion);
    const acierto = aparicion.tipo === 'diana' ? tocada : !tocada;
    const centro = this.centroDe(aparicion.col, aparicion.fila);
    if (tocada) this.avisos.push({ ...centro, acierto, nacioMs: this.tiempoMs });
    if (aparicion.tipo === 'diana' && tocada) this.cazadas += 1;

    this.anotar({
      parametro: PARAMETRO,
      valor: aparicion.tamano,
      acierto,
      tiempoReaccionMs: this.tiempoMs - aparicion.nacioMs,
      esEnsayoDeConfianza: aparicion.esEnsayoDeConfianza,
      detalle: aparicion.tipo,
    });
  }

  // -------------------------------------------------------------------------
  // Simulación
  // -------------------------------------------------------------------------

  private asomar(): void {
    const { cols, filas } = this.dificultad.rejilla;
    const libres: Array<[number, number]> = [];
    for (let fila = 0; fila < filas; fila += 1) {
      for (let col = 0; col < cols; col += 1) {
        if (!this.apariciones.some((a) => a.col === col && a.fila === fila)) libres.push([col, fila]);
      }
    }
    if (libres.length === 0) return;
    const [col, fila] = this.aleatorio.elegir(libres);

    const bomba = this.aleatorio.probabilidad(this.dificultad.bombas);
    const escalera = this.escalera(PARAMETRO);
    // La bomba toma el tamaño del momento sin gastar un ensayo de la escalera.
    const propuesto = bomba
      ? { valor: escalera?.current() ?? config.cazador.tamanoInicialPx, esEnsayoDeConfianza: false }
      : escalera?.proximoEnsayo() ?? { valor: config.cazador.tamanoInicialPx, esEnsayoDeConfianza: false };

    this.apariciones.push({
      col,
      fila,
      tipo: bomba ? 'bomba' : 'diana',
      tamano: this.tamanoQueCabe(propuesto.valor),
      esEnsayoDeConfianza: propuesto.esEnsayoDeConfianza,
      nacioMs: this.tiempoMs,
      hastaMs: this.tiempoMs + this.dificultad.visibleMs,
    });
  }

  protected cuadro(_dtMs: number, tiempoMs: number): void {
    this.tiempoMs = tiempoMs;

    // Las dianas que se esconden sin tocar son un fallo; las bombas, nada.
    for (const aparicion of [...this.apariciones]) {
      if (tiempoMs < aparicion.hastaMs) continue;
      if (aparicion.tipo === 'diana') this.resolver(aparicion, false);
      else this.apariciones = this.apariciones.filter((a) => a !== aparicion);
    }

    if (tiempoMs >= this.proximaMs && this.apariciones.length < this.dificultad.simultaneos) {
      this.asomar();
      this.proximaMs =
        tiempoMs + siguienteEspera(this.dificultad.esperaMs, this.dificultad.irregularidad, this.aleatorio);
    }

    this.avisos = this.avisos.filter((a) => tiempoMs - a.nacioMs < config.cazador.avisoMs);

    if (tiempoMs >= config.cazador.duracionNivelSeg * 1000) {
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
    const { cols, filas } = this.dificultad.rejilla;
    const agujero = this.ladoDeAgujero();
    const borde = Math.max(3, Math.round(agujero / 12));
    renderer.limpiar();

    for (let fila = 0; fila < filas; fila += 1) {
      for (let col = 0; col < cols; col += 1) {
        const { x, y } = this.centroDe(col, fila);
        renderer.rect('ojoDominante', x - agujero / 2, y - agujero / 2, agujero, agujero, {
          tono: paleta.secundario,
        });
        renderer.borrar(
          x - agujero / 2 + borde,
          y - agujero / 2 + borde,
          agujero - borde * 2,
          agujero - borde * 2,
        );
        if (this.conTeclado && col === this.cursor.col && fila === this.cursor.fila) {
          renderer.marco('ambos', x - agujero / 2 - 4, y - agujero / 2 - 4, agujero + 8, agujero + 8, 2);
        }
      }
    }

    for (const aparicion of this.apariciones) {
      const { x, y } = this.centroDe(aparicion.col, aparicion.fila);
      if (aparicion.tipo === 'diana') this.dibujarDiana(x, y, aparicion.tamano);
      else this.dibujarBomba(x, y, aparicion.tamano);
    }

    // Al tocar: un estallido de puntos que se abre (diana) o se queda quieto (bomba).
    for (const aviso of this.avisos) {
      const avance = (tiempoMs - aviso.nacioMs) / config.cazador.avisoMs;
      const radio = agujero * (aviso.acierto ? 0.2 + 0.3 * avance : 0.2);
      const cuantos = aviso.acierto ? 8 : 4;
      for (let i = 0; i < cuantos; i += 1) {
        const angulo = (i / cuantos) * Math.PI * 2 + (aviso.acierto ? 0 : Math.PI / 4);
        renderer.rect('ambos', aviso.x + Math.cos(angulo) * radio - 2, aviso.y + Math.sin(angulo) * radio - 2, 4, 4);
      }
    }

    const duracion = config.cazador.duracionNivelSeg;
    const restante = Math.max(0, 1 - tiempoMs / (duracion * 1000));
    dibujarMarcoYHud(renderer, `${this.cazadas}`, `${Math.ceil(restante * duracion)} s`, restante);
    this.dibujarAyuda(tiempoMs);
  }

  /** Diana: un anillo con un punto en el centro. */
  private dibujarDiana(x: number, y: number, tamano: number): void {
    const { renderer } = this;
    const tono = { tono: renderer.paleta.acento };
    const trazo = Math.max(1, tamano / 5);
    renderer.poligono('ojoAmbliope', puntosDeCirculo(x, y, tamano / 2), tono);
    // El hueco se vacía con el color del fondo, que es el del interior del agujero.
    renderer.borrarPoligono(puntosDeCirculo(x, y, tamano / 2 - trazo));
    const punto = Math.max(1, Math.round(trazo));
    renderer.rect('ojoAmbliope', x - punto / 2, y - punto / 2, punto, punto, tono);
  }

  /** Bomba: un disco lleno con su mecha. Mismo tamaño y brillo que la diana. */
  private dibujarBomba(x: number, y: number, tamano: number): void {
    const { renderer } = this;
    const tono = { tono: renderer.paleta.acento };
    renderer.poligono('ojoAmbliope', puntosDeCirculo(x, y, tamano / 2), tono);
    const mecha = Math.max(1, Math.round(tamano / 6));
    renderer.rect('ojoAmbliope', x + tamano / 5, y - tamano / 2 - mecha, mecha, mecha * 1.5, tono);
  }
}

export const cazador: Minijuego = {
  id: 'cazador',
  modulo: 'parche',
  escaleras: (modo) => escalerasDeCazador(modo),
  crear: (canvas, contexto) => new InstanciaDeCazador(canvas, contexto),
};
