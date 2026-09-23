/**
 * Pozo de bloques (módulo de lentes).
 * Habilidad: juntar lo que ve cada ojo.
 *
 * Piezas de cuatro cuadrados caen en un pozo; las filas completas se van.
 * La pieza que cae solo la ve el ojo ambliope; el pozo y lo ya colocado, solo
 * el dominante. Para colocar bien hay que usar los dos a la vez.
 *
 * Cada pieza es un ensayo: colocarla sin tapar huecos nuevos (o completando
 * una fila) es un acierto. La escalera mueve la luminancia de la pieza dentro
 * del color de su lente —la "transparencia"—; el nivel, la velocidad, si se
 * ve la pieza siguiente y los giros por sorpresa. No hay fin de partida: si
 * el pozo se llena, el fondo se hunde y se sigue jugando.
 *
 * Capas en modo lentes:
 *   ojo ambliope → la pieza que cae, su sombra de aterrizaje y la siguiente
 *   ojo dominante → paredes del pozo y bloques colocados
 *   ambos → marco, HUD, botones y avisos
 */
import { config, type Modo } from '../../config';
import { es } from '../../i18n/es';
import type { ConfigDeEscalera } from '../../engine/Staircase';
import { JuegoBase } from '../base';
import { altoDeBotonera, botonEn, botonera, dibujarBotonera, type Boton } from '../botonera';
import { dibujarMarcoYHud } from '../comun';
import { anchoDe, altoDe, type Celda } from '../torre/piezas';
import { claveDeEscalera, type ContextoDeJuego, type Minijuego } from '../tipos';
import {
  PIEZAS_DEL_POZO,
  cabe,
  celdasEn,
  colocar,
  dificultadDePozo,
  filaDeAterrizaje,
  hundir,
  pozoVacio,
  type Pozo,
} from './rejilla';

const PARAMETRO = 'contraste';

export function escalerasDePozo(modo: Modo): ConfigDeEscalera[] {
  return [
    {
      clave: claveDeEscalera('pozo', modo, PARAMETRO),
      valorInicial: config.pozo.contrasteInicial,
      minimo: config.pozo.contrasteMinimo,
      maximo: config.pozo.contrasteMaximo,
    },
  ];
}

type Accion = 'izquierda' | 'derecha' | 'girar' | 'soltar';

interface Cayendo {
  tipo: number;
  giro: number;
  col: number;
  fila: number;
  factor: number;
  esEnsayoDeConfianza: boolean;
  nacioMs: number;
  /** Fila en la que gira sola, si le toca sorpresa. */
  sorpresaEnFila: number | null;
}

class InstanciaDePozo extends JuegoBase {
  private readonly dificultad: ReturnType<typeof dificultadDePozo>;
  private pozo: Pozo = pozoVacio(config.pozo.cols, config.pozo.filas);
  private pieza: Cayendo | null = null;
  private bolsa: number[] = [];
  private siguiente = 0;
  private acumulado = 0;
  private rapido = false;
  private lineas = 0;
  private filasAviso: { filas: number[]; ms: number } | null = null;
  private hundidoMs: number | null = null;
  private botones: Array<Boton<Accion>> = [];
  private tiempoMs = 0;

  constructor(canvas: HTMLCanvasElement, ctx: ContextoDeJuego) {
    super(canvas, ctx, 'pozo');
    this.dificultad = dificultadDePozo(ctx.mundo, ctx.nivel);
  }

  protected alIniciar(): void {
    this.siguiente = this.sacarDeLaBolsa();
    this.botones = botonera(this.area, [
      { id: 'izquierda', icono: 'izquierda' },
      { id: 'girar', icono: 'girar' },
      { id: 'derecha', icono: 'derecha' },
      { id: 'soltar', icono: 'abajo' },
    ]);

    this.escuchar(this.canvas, 'pointerdown', (evento) => {
      const { x, y } = this.puntoDe(evento as PointerEvent);
      const accion = botonEn(this.botones, x, y);
      if (accion) this.hacer(accion);
    });
    this.escuchar(window, 'keydown', (evento) => {
      const tecla = (evento as KeyboardEvent).key;
      if (tecla === 'ArrowLeft') this.hacer('izquierda');
      else if (tecla === 'ArrowRight') this.hacer('derecha');
      else if (tecla === 'ArrowUp') this.hacer('girar');
      else if (tecla === 'ArrowDown') this.rapido = true;
      else if (tecla === ' ' || tecla === 'Enter') this.hacer('soltar');
      else return;
      evento.preventDefault();
    });
    this.escuchar(window, 'keyup', (evento) => {
      if ((evento as KeyboardEvent).key === 'ArrowDown') this.rapido = false;
    });
  }

  // -------------------------------------------------------------------------
  // Piezas
  // -------------------------------------------------------------------------

  /** Bolsa de siete: salen todas las formas antes de repetir ninguna. */
  private sacarDeLaBolsa(): number {
    if (this.bolsa.length === 0) {
      this.bolsa = this.aleatorio.barajar(PIEZAS_DEL_POZO.map((_, i) => i));
    }
    return this.bolsa.pop()!;
  }

  private celdasDe(pieza: Cayendo): Celda[] {
    const { giros } = PIEZAS_DEL_POZO[pieza.tipo];
    return giros[pieza.giro % giros.length];
  }

  private nacer(): void {
    const tipo = this.siguiente;
    this.siguiente = this.sacarDeLaBolsa();
    const celdas = PIEZAS_DEL_POZO[tipo].giros[0];
    const col = Math.floor((this.pozo.cols - anchoDe(celdas)) / 2);
    const fila = this.pozo.filas - altoDe(celdas);

    // Pozo lleno: el fondo se hunde para que quepa. Nunca se pierde.
    if (!cabe(this.pozo, celdas, col, fila)) {
      this.pozo = hundir(this.pozo);
      this.hundidoMs = this.tiempoMs;
    }

    const propuesto = this.escalera(PARAMETRO)?.proximoEnsayo() ?? {
      valor: config.pozo.contrasteInicial,
      esEnsayoDeConfianza: false,
    };
    const sorpresa = this.aleatorio.probabilidad(this.dificultad.giroSorpresa);
    this.pieza = {
      tipo,
      giro: 0,
      col,
      fila,
      factor: propuesto.valor,
      esEnsayoDeConfianza: propuesto.esEnsayoDeConfianza,
      nacioMs: this.tiempoMs,
      sorpresaEnFila: sorpresa ? Math.round(fila * (0.3 + this.aleatorio.siguiente() * 0.4)) : null,
    };
    this.acumulado = 0;
  }

  private hacer(accion: Accion): void {
    const pieza = this.pieza;
    if (!pieza) return;
    if (accion === 'izquierda' || accion === 'derecha') {
      const destino = pieza.col + (accion === 'izquierda' ? -1 : 1);
      if (cabe(this.pozo, this.celdasDe(pieza), destino, pieza.fila)) pieza.col = destino;
    } else if (accion === 'girar') {
      this.girar(pieza);
    } else {
      pieza.fila = filaDeAterrizaje(this.pozo, this.celdasDe(pieza), pieza.col, pieza.fila);
      this.fijar();
    }
  }

  /** Gira un cuarto de vuelta; si choca, prueba a apartarla un poco. */
  private girar(pieza: Cayendo): void {
    const giros = PIEZAS_DEL_POZO[pieza.tipo].giros;
    const giro = (pieza.giro + 1) % giros.length;
    for (const desvio of config.torre.desviosAlGirar) {
      if (cabe(this.pozo, giros[giro], pieza.col + desvio, pieza.fila)) {
        pieza.giro = giro;
        pieza.col += desvio;
        return;
      }
    }
  }

  private fijar(): void {
    const pieza = this.pieza;
    if (!pieza) return;
    const resultado = colocar(this.pozo, this.celdasDe(pieza), pieza.col, pieza.fila);
    this.pozo = resultado.pozo;
    if (resultado.filas.length > 0) {
      this.lineas += resultado.filas.length;
      this.filasAviso = { filas: resultado.filas, ms: this.tiempoMs };
    }
    this.pieza = null;
    this.anotar({
      parametro: PARAMETRO,
      valor: pieza.factor,
      acierto: resultado.buena,
      tiempoReaccionMs: this.tiempoMs - pieza.nacioMs,
      esEnsayoDeConfianza: pieza.esEnsayoDeConfianza,
    });
  }

  // -------------------------------------------------------------------------
  // Simulación
  // -------------------------------------------------------------------------

  protected cuadro(dtMs: number, tiempoMs: number): void {
    this.tiempoMs = tiempoMs;
    if (!this.pieza) this.nacer();
    const pieza = this.pieza!;

    const velocidad = this.dificultad.velocidad * (this.rapido ? config.pozo.factorCaidaSuave : 1);
    this.acumulado += (velocidad * dtMs) / 1000;
    while (this.acumulado >= 1 && this.pieza) {
      this.acumulado -= 1;
      if (cabe(this.pozo, this.celdasDe(pieza), pieza.col, pieza.fila - 1)) pieza.fila -= 1;
      else this.fijar();
    }

    if (this.pieza && pieza.sorpresaEnFila !== null && pieza.fila <= pieza.sorpresaEnFila) {
      pieza.sorpresaEnFila = null;
      this.girar(pieza);
    }

    if (tiempoMs >= config.pozo.duracionNivelSeg * 1000) {
      this.terminarNivel();
      return;
    }
    this.dibujar(tiempoMs);
  }

  // -------------------------------------------------------------------------
  // Dibujo
  // -------------------------------------------------------------------------

  private geometria() {
    const { area } = this;
    const { cols, filas } = this.pozo;
    const extra = this.dificultad.conSiguiente ? config.pozo.columnasParaSiguiente : 0;
    const alto = area.alto - altoDeBotonera() - 8;
    const celda = Math.floor(Math.min(area.ancho / (cols + extra + 1), alto / (filas + 1)));
    const ancho = (cols + extra) * celda;
    return {
      celda,
      x: Math.round(area.x + (area.ancho - ancho) / 2),
      y: Math.round(area.y + (alto - filas * celda) / 2),
    };
  }

  private dibujar(tiempoMs: number): void {
    const { renderer } = this;
    const { celda, x, y } = this.geometria();
    const { cols, filas } = this.pozo;
    const muro = Math.max(3, Math.round(celda / 5));
    const aPantalla = (fila: number, col: number) => ({
      px: x + col * celda,
      py: y + (filas - 1 - fila) * celda,
    });
    renderer.limpiar();

    // El pozo y lo colocado: ojo dominante.
    renderer.rect('ojoDominante', x - muro, y, muro, filas * celda + muro);
    renderer.rect('ojoDominante', x + cols * celda, y, muro, filas * celda + muro);
    renderer.rect('ojoDominante', x, y + filas * celda, cols * celda, muro);
    for (let f = 0; f < filas; f += 1) {
      for (let c = 0; c < cols; c += 1) {
        if (!this.pozo.ocupado[f * cols + c]) continue;
        const { px, py } = aPantalla(f, c);
        renderer.rect('ojoDominante', px, py, celda - 1, celda - 1);
      }
    }

    // La pieza que cae y su sombra: ojo ambliope.
    const pieza = this.pieza;
    if (pieza) {
      const celdas = this.celdasDe(pieza);
      const aterrizaje = filaDeAterrizaje(this.pozo, celdas, pieza.col, pieza.fila);
      for (const [f, c] of celdasEn(celdas, pieza.col, aterrizaje)) {
        if (f >= filas) continue;
        const { px, py } = aPantalla(f, c);
        renderer.marco('ojoAmbliope', px + 1, py + 1, celda - 3, celda - 3, 2, {
          factor: pieza.factor * config.pozo.factorDeSombra,
        });
      }
      for (const [f, c] of celdasEn(celdas, pieza.col, pieza.fila)) {
        if (f >= filas) continue;
        const { px, py } = aPantalla(f, c);
        renderer.rect('ojoAmbliope', px, py, celda - 1, celda - 1, { factor: pieza.factor });
      }

      if (this.dificultad.conSiguiente) {
        const siguientes = PIEZAS_DEL_POZO[this.siguiente].giros[0];
        const caja = { x: x + (cols + 1) * celda, y, lado: 4 * celda };
        renderer.marco('ambos', caja.x, caja.y, caja.lado, caja.lado, 2);
        const chica = Math.floor(celda * 0.8);
        const ox = caja.x + (caja.lado - anchoDe(siguientes) * chica) / 2;
        const oy = caja.y + (caja.lado - altoDe(siguientes) * chica) / 2;
        for (const [f, c] of siguientes) {
          renderer.rect(
            'ojoAmbliope',
            ox + c * chica,
            oy + (altoDe(siguientes) - 1 - f) * chica,
            chica - 1,
            chica - 1,
            { factor: pieza.factor },
          );
        }
      }
    }

    // Filas completas: una franja breve donde estaban.
    if (this.filasAviso && tiempoMs - this.filasAviso.ms < config.pozo.avisoFilaMs) {
      for (const f of this.filasAviso.filas) {
        const { px, py } = aPantalla(f, 0);
        renderer.rect('ambos', px, py + celda / 2 - 1, cols * celda, 3);
      }
    }

    if (this.hundidoMs !== null && tiempoMs - this.hundidoMs < config.pozo.avisoHundidoMs) {
      const tamano = config.accesibilidad.textoMinimoPx;
      const cy = y + (filas * celda) / 2;
      renderer.borrar(x, cy - tamano, cols * celda, tamano * 2 + 4);
      renderer.texto('ambos', es.pozo.hundido, x + (cols * celda) / 2, cy - tamano / 2, tamano, 'center');
    }

    dibujarBotonera(renderer, this.botones);
    const duracion = config.pozo.duracionNivelSeg;
    const restante = Math.max(0, 1 - tiempoMs / (duracion * 1000));
    dibujarMarcoYHud(renderer, `${this.lineas}`, `${Math.ceil(restante * duracion)} s`, restante);
    this.dibujarAyuda(tiempoMs);
  }
}

export const pozo: Minijuego = {
  id: 'pozo',
  modulo: 'lentes',
  escaleras: (modo) => escalerasDePozo(modo),
  crear: (canvas, contexto) => new InstanciaDePozo(canvas, contexto),
};
