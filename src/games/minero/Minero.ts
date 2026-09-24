/**
 * Minero de cristales.
 * Habilidad: agudeza (tamaño mínimo) y sensibilidad al contraste.
 *
 * Una pared de bloques; en uno de ellos, en una posición al azar dentro del
 * bloque, aparece un cristal. Hay que picar ese bloque antes de que se acabe
 * el tiempo.
 *
 * Capas en modo lentes:
 *   ojo ambliope → el cristal y su brillo
 *   ojo dominante → bloques, grietas y la pixelnauta con su pico
 *   ambos → marco de la cuadrícula, cursor y HUD
 */
import { config, type Modo } from '../../config';
import { aCss, aplicarContrasteWeber, desdeHex } from '../../engine/color';
import { porMundo } from '../../engine/mundos';
import { crearAleatorio, type Aleatorio } from '../../engine/rng';
import type { ConfigDeEscalera, Staircase } from '../../engine/Staircase';
import { GameLoop } from '../../engine/GameLoop';
import {
  ContadorDeNivel,
  areaDeJuego,
  dibujarMarcoYHud,
  factorDePulso,
  teclaDe,
  type AreaDeJuego,
} from '../comun';
import { claveDeEscalera, type ContextoDeJuego, type InstanciaDeJuego, type Minijuego } from '../tipos';
import { dibujarMineraConPico } from './arte';

const PARAMETRO_TAMANO = 'tamano';
const PARAMETRO_CONTRASTE = 'contraste';

export function paredDelMundo(mundo: number) {
  const lista = config.minero.paredPorMundo;
  return lista[Math.max(0, Math.min(lista.length - 1, mundo - 1))];
}

export function segundosPorEnsayo(mundo: number): number {
  return porMundo(
    mundo,
    config.minero.segundosPorEnsayoMundo1,
    config.minero.segundosPorEnsayoMundo5,
  );
}

/** Escaleras del juego según el modo: en lentes solo se mide el tamaño. */
export function escalerasDeMinero(modo: Modo, mundo: number): ConfigDeEscalera[] {
  void mundo;
  const tamano: ConfigDeEscalera = {
    clave: claveDeEscalera('minero', modo, PARAMETRO_TAMANO),
    valorInicial: config.minero.tamanoInicialPx,
    minimo: config.minero.tamanoMinimoPx,
    // Techo generoso: el límite real (80 % del lado del bloque) depende del
    // tamaño de la pantalla, así que se recorta al dibujar y el ensayo
    // registra el tamaño que de verdad se mostró.
    maximo: config.minero.tamanoInicialPx * 2,
  };
  if (modo === 'lentes') return [tamano];

  return [
    tamano,
    {
      clave: claveDeEscalera('minero', modo, PARAMETRO_CONTRASTE),
      valorInicial: config.minero.contrasteInicial,
      minimo: 1 / 255,
      maximo: config.minero.contrasteMaximo,
    },
  ];
}

type Fase = 'jugando' | 'revelando' | 'terminado';

interface Ensayo {
  parametro: string;
  escalera: Staircase;
  valor: number;
  esEnsayoDeConfianza: boolean;
  bloque: number;
  /** Posición del cristal dentro del bloque, en fracción del lado. */
  dx: number;
  dy: number;
  inicioMs: number;
  /** Tamaño y contraste realmente presentados. */
  tamanoPx: number;
  contraste: number;
}

class InstanciaDeMinero implements InstanciaDeJuego {
  private readonly bucle: GameLoop;
  private readonly contador = new ContadorDeNivel();
  private readonly aleatorio: Aleatorio;
  private readonly cols: number;
  private readonly filas: number;
  private readonly segundos: number;

  private fase: Fase = 'jugando';
  private ensayo: Ensayo | null = null;
  private ensayosHechos = 0;
  private cristalesEncontrados = 0;
  private cursor = 0;
  private revelarHasta = 0;
  private destruido = false;

  constructor(
    private readonly canvas: HTMLCanvasElement,
    private readonly ctx: ContextoDeJuego,
  ) {
    const pared = paredDelMundo(ctx.mundo);
    this.cols = pared.cols;
    this.filas = pared.filas;
    this.segundos = segundosPorEnsayo(ctx.mundo);
    this.aleatorio = crearAleatorio(`minero:${ctx.mundo}:${ctx.nivel}:${Date.now()}`);
    this.bucle = new GameLoop((_, tiempo) => this.cuadro(tiempo));
  }

  iniciar(): void {
    this.canvas.addEventListener('pointerdown', this.alTocar);
    window.addEventListener('keydown', this.alTeclado);
    this.prepararEnsayo();
    this.bucle.iniciar();
  }

  pausar(): void {
    this.bucle.pausar();
  }

  reanudar(): void {
    // El ensayo en curso vuelve a empezar: no se pierde tiempo por la pausa.
    if (this.ensayo) this.ensayo.inicioMs = this.bucle.tiempoMs;
    this.bucle.reanudar();
  }

  destruir(): void {
    this.destruido = true;
    this.bucle.detener();
    this.canvas.removeEventListener('pointerdown', this.alTocar);
    window.removeEventListener('keydown', this.alTeclado);
  }

  fps(): number {
    return this.bucle.fps;
  }

  // -------------------------------------------------------------------------
  // Ensayos
  // -------------------------------------------------------------------------

  private prepararEnsayo(): void {
    const usarContraste =
      this.ctx.modo === 'parche' &&
      this.ctx.escaleras[claveDeEscalera('minero', 'parche', PARAMETRO_CONTRASTE)] !== undefined &&
      this.aleatorio.probabilidad(config.minero.probabilidadEscaleraContraste);

    const parametro = usarContraste ? PARAMETRO_CONTRASTE : PARAMETRO_TAMANO;
    const escalera = this.ctx.escaleras[claveDeEscalera('minero', this.ctx.modo, parametro)];
    const propuesto = escalera.proximoEnsayo();

    const lado = this.ladoDeBloque();
    const maximoPorBloque = lado * config.minero.tamanoMaximoFraccionBloque;

    let tamanoPx: number;
    let contraste: number;

    if (usarContraste) {
      // Contraste variable, tamaño fijo: el mayor entre 3 × umbral y 24 px.
      const umbralDeTamano =
        this.ctx.escaleras[claveDeEscalera('minero', this.ctx.modo, PARAMETRO_TAMANO)].threshold();
      tamanoPx = Math.min(
        maximoPorBloque,
        Math.max(umbralDeTamano * config.minero.factorTamanoFijo, config.minero.tamanoFijoMinimoPx),
      );
      contraste = propuesto.valor;
    } else {
      // Tamaño variable, contraste alto fijo.
      tamanoPx = Math.max(
        config.minero.tamanoMinimoPx,
        Math.min(maximoPorBloque, propuesto.valor),
      );
      contraste = config.minero.contrasteFijoAlto;
    }

    this.ensayo = {
      parametro,
      escalera,
      valor: propuesto.valor,
      esEnsayoDeConfianza: propuesto.esEnsayoDeConfianza,
      bloque: this.aleatorio.entero(0, this.cols * this.filas - 1),
      dx: 0.2 + this.aleatorio.siguiente() * 0.6,
      dy: 0.2 + this.aleatorio.siguiente() * 0.6,
      inicioMs: this.bucle.tiempoMs,
      tamanoPx,
      contraste,
    };
    this.fase = 'jugando';
  }

  private responder(bloqueElegido: number | null): void {
    if (this.fase !== 'jugando' || !this.ensayo) return;
    const ensayo = this.ensayo;
    const acierto = bloqueElegido === ensayo.bloque;
    const tiempoReaccionMs = this.bucle.tiempoMs - ensayo.inicioMs;

    ensayo.escalera.record(acierto);
    this.contador.registrar(acierto, tiempoReaccionMs, ensayo.esEnsayoDeConfianza);
    if (acierto) this.cristalesEncontrados += 1;

    this.ctx.onEnsayo({
      juego: 'minero',
      modo: this.ctx.modo,
      parametro: ensayo.parametro,
      valor: ensayo.parametro === PARAMETRO_TAMANO ? ensayo.tamanoPx : ensayo.contraste,
      acierto,
      tiempoReaccionMs,
      esEnsayoDeConfianza: ensayo.esEnsayoDeConfianza,
    });

    this.ensayosHechos += 1;
    this.fase = 'revelando';
    this.revelarHasta = this.bucle.tiempoMs + config.minero.resaltarFalloMs;
    // Un acierto no necesita que le enseñen dónde estaba.
    if (acierto) this.revelarHasta = this.bucle.tiempoMs + config.minero.resaltarFalloMs / 3;
  }

  private terminarNivel(): void {
    if (this.fase === 'terminado') return;
    this.fase = 'terminado';
    this.bucle.detener();

    const umbrales: Record<string, number> = {};
    for (const [clave, escalera] of Object.entries(this.ctx.escaleras)) {
      umbrales[clave.split(':').slice(2).join(':')] = escalera.threshold();
    }
    this.ctx.onFinNivel(this.contador.resumen(umbrales));
  }

  // -------------------------------------------------------------------------
  // Entrada
  // -------------------------------------------------------------------------

  private alTocar = (evento: PointerEvent): void => {
    if (this.fase !== 'jugando') return;
    const caja = this.canvas.getBoundingClientRect();
    const bloque = this.bloqueEn(evento.clientX - caja.left, evento.clientY - caja.top);
    if (bloque !== null) {
      this.cursor = bloque;
      this.responder(bloque);
    }
  };

  private alTeclado = (evento: KeyboardEvent): void => {
    if (this.fase !== 'jugando') return;
    const fila = Math.floor(this.cursor / this.cols);
    const columna = this.cursor % this.cols;

    switch (teclaDe(evento)) {
      case 'ArrowLeft':
        this.cursor = fila * this.cols + Math.max(0, columna - 1);
        break;
      case 'ArrowRight':
        this.cursor = fila * this.cols + Math.min(this.cols - 1, columna + 1);
        break;
      case 'ArrowUp':
        this.cursor = Math.max(0, fila - 1) * this.cols + columna;
        break;
      case 'ArrowDown':
        this.cursor = Math.min(this.filas - 1, fila + 1) * this.cols + columna;
        break;
      case ' ':
      case 'Enter':
        this.responder(this.cursor);
        break;
      default:
        return;
    }
    evento.preventDefault();
  };

  // -------------------------------------------------------------------------
  // Geometría
  // -------------------------------------------------------------------------

  private area(): AreaDeJuego {
    return areaDeJuego(this.ctx.renderer);
  }

  private ladoDeBloque(): number {
    const area = this.area();
    return Math.floor(Math.min(area.ancho / this.cols, area.alto / this.filas));
  }

  private origen(): { x: number; y: number } {
    const area = this.area();
    const lado = this.ladoDeBloque();
    return {
      x: area.x + Math.floor((area.ancho - lado * this.cols) / 2),
      y: area.y + Math.floor((area.alto - lado * this.filas) / 2),
    };
  }

  private cajaDeBloque(indice: number) {
    const lado = this.ladoDeBloque();
    const origen = this.origen();
    return {
      x: origen.x + (indice % this.cols) * lado,
      y: origen.y + Math.floor(indice / this.cols) * lado,
      lado,
    };
  }

  private bloqueEn(x: number, y: number): number | null {
    const lado = this.ladoDeBloque();
    const origen = this.origen();
    const columna = Math.floor((x - origen.x) / lado);
    const fila = Math.floor((y - origen.y) / lado);
    if (columna < 0 || columna >= this.cols || fila < 0 || fila >= this.filas) return null;
    return fila * this.cols + columna;
  }

  // -------------------------------------------------------------------------
  // Dibujo
  // -------------------------------------------------------------------------

  private cuadro(tiempoMs: number): void {
    if (this.destruido) return;

    if (this.fase === 'jugando' && this.ensayo) {
      const transcurrido = tiempoMs - this.ensayo.inicioMs;
      // Tiempo agotado: cuenta como fallo.
      if (transcurrido >= this.segundos * 1000) this.responder(null);
    } else if (this.fase === 'revelando' && tiempoMs >= this.revelarHasta) {
      if (this.ensayosHechos >= config.minero.ensayosPorNivel) {
        this.terminarNivel();
      } else {
        this.prepararEnsayo();
      }
    }

    this.dibujar(tiempoMs);
  }

  private dibujar(tiempoMs: number): void {
    const { renderer } = this.ctx;
    renderer.limpiar();

    const lado = this.ladoDeBloque();
    const total = this.cols * this.filas;

    // Bloques y grietas: capa del ojo dominante.
    for (let i = 0; i < total; i += 1) {
      const caja = this.cajaDeBloque(i);
      const tono = renderer.paleta.variantes[i % renderer.paleta.variantes.length];
      renderer.rect('ojoDominante', caja.x + 1, caja.y + 1, lado - 2, lado - 2, { tono });
      renderer.marco('ojoDominante', caja.x, caja.y, lado, lado, 1, {
        tono: renderer.paleta.secundario,
      });
      this.dibujarGrietas(i, caja.x, caja.y, lado);
    }

    // La pixelnauta con su pico, también en la capa del ojo dominante.
    dibujarMineraConPico(
      renderer,
      this.area(),
      lado,
      this.origen().x,
      this.ctx.equipo,
      this.ctx.ojoTapado,
    );

    // Cristal: capa del ojo ambliope.
    if (this.ensayo && (this.fase === 'jugando' || this.fase === 'revelando')) {
      this.dibujarCristal(tiempoMs);
    }

    // Cursor y revelado: capa de ambos ojos.
    this.dibujarCursor();
    if (this.fase === 'revelando' && this.ensayo) {
      const caja = this.cajaDeBloque(this.ensayo.bloque);
      renderer.marco('ambos', caja.x, caja.y, lado, lado, 3);
    }

    const restante =
      this.fase === 'jugando' && this.ensayo
        ? Math.max(0, 1 - (tiempoMs - this.ensayo.inicioMs) / (this.segundos * 1000))
        : 0;

    dibujarMarcoYHud(
      renderer,
      `${Math.min(this.ensayosHechos + 1, config.minero.ensayosPorNivel)}/${config.minero.ensayosPorNivel}`,
      `${this.cristalesEncontrados}`,
      restante,
    );
  }

  /** En los mundos 4 y 5 hay más grietas como ruido visual, nunca con forma de cristal. */
  private dibujarGrietas(indice: number, x: number, y: number, lado: number): void {
    const cuantas = this.ctx.mundo >= 4 ? 4 : 2;
    const grieta = crearAleatorio(`grieta:${this.ctx.mundo}:${indice}`);
    for (let i = 0; i < cuantas; i += 1) {
      const gx = x + Math.floor(grieta.siguiente() * (lado - 6)) + 3;
      const gy = y + Math.floor(grieta.siguiente() * (lado - 6)) + 3;
      const largo = 2 + Math.floor(grieta.siguiente() * Math.max(2, lado / 6));
      const horizontal = grieta.probabilidad(0.5);
      this.ctx.renderer.rect(
        'ojoDominante',
        gx,
        gy,
        horizontal ? largo : 1,
        horizontal ? 1 : largo,
        { tono: this.ctx.renderer.paleta.secundario },
      );
    }
  }

  private dibujarCristal(tiempoMs: number): void {
    const ensayo = this.ensayo!;
    const { renderer } = this.ctx;
    const caja = this.cajaDeBloque(ensayo.bloque);
    const tamano = Math.max(1, Math.round(ensayo.tamanoPx));
    const margen = tamano / 2 + 2;
    const cx = Math.round(caja.x + margen + ensayo.dx * Math.max(0, caja.lado - margen * 2));
    const cy = Math.round(caja.y + margen + ensayo.dy * Math.max(0, caja.lado - margen * 2));

    // El pulso nunca sube por encima del valor pedido, así que el contraste
    // registrado es siempre el máximo que se llegó a mostrar.
    const pulso = factorDePulso(tiempoMs);

    if (renderer.modo === 'parche') {
      const fondo = desdeHex(
        renderer.paleta.variantes[ensayo.bloque % renderer.paleta.variantes.length],
      );
      const { rgb } = aplicarContrasteWeber(fondo, ensayo.contraste * pulso);
      this.rombo(cx, cy, tamano, { tono: aCss(rgb) });
    } else {
      this.rombo(cx, cy, tamano, { factor: pulso });
    }
  }

  /** Rombo pixelado: filas horizontales que crecen y decrecen. */
  private rombo(cx: number, cy: number, tamano: number, op: { tono?: string; factor?: number }) {
    const radio = Math.max(1, Math.round(tamano / 2));
    for (let dy = -radio; dy <= radio; dy += 1) {
      const ancho = radio - Math.abs(dy);
      if (ancho < 0) continue;
      this.ctx.renderer.rect('ojoAmbliope', cx - ancho, cy + dy, ancho * 2 + 1, 1, op);
    }
  }

  private dibujarCursor(): void {
    const caja = this.cajaDeBloque(this.cursor);
    const { renderer } = this.ctx;
    const largo = Math.max(4, Math.round(caja.lado / 5));
    const esquinas: Array<[number, number, number, number]> = [
      [caja.x, caja.y, largo, 2],
      [caja.x, caja.y, 2, largo],
      [caja.x + caja.lado - largo, caja.y, largo, 2],
      [caja.x + caja.lado - 2, caja.y, 2, largo],
      [caja.x, caja.y + caja.lado - 2, largo, 2],
      [caja.x, caja.y + caja.lado - largo, 2, largo],
      [caja.x + caja.lado - largo, caja.y + caja.lado - 2, largo, 2],
      [caja.x + caja.lado - 2, caja.y + caja.lado - largo, 2, largo],
    ];
    for (const [x, y, ancho, alto] of esquinas) renderer.rect('ambos', x, y, ancho, alto);
  }
}

export const minero: Minijuego = {
  id: 'minero',
  modulo: 'ambos',
  escaleras: escalerasDeMinero,
  crear: (canvas, contexto) => new InstanciaDeMinero(canvas, contexto),
};

