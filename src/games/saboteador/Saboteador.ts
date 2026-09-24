/**
 * ¿Quién es el saboteador?
 * Habilidad: agudeza con amontonamiento (crowding) y discriminación de detalle.
 *
 * Un grupo compacto de tripulantes. El visor de cada uno es un anillo con una
 * abertura, como una letra C; todos la tienen hacia el mismo lado menos el
 * saboteador. Cuanto más juntos están, más difícil es leer la abertura: por eso
 * cada espaciado lleva su propia escalera.
 *
 * Capas en modo lentes:
 *   ojo ambliope → los visores de todos los tripulantes
 *   ojo dominante → cuerpos, cascos y decoración de la estación
 *   ambos → marco del área de juego y HUD
 */
import { config, type Modo } from '../../config';
import { porMundo } from '../../engine/mundos';
import { crearAleatorio, type Aleatorio } from '../../engine/rng';
import type { ConfigDeEscalera } from '../../engine/Staircase';
import { GameLoop } from '../../engine/GameLoop';
import { ContadorDeNivel, areaDeJuego, dibujarMarcoYHud, factorDePulso, teclaDe } from '../comun';
import { claveDeEscalera, type ContextoDeJuego, type InstanciaDeJuego, type Minijuego } from '../tipos';

const PARAMETRO = 'diametro';

export function tripulantesDelMundo(mundo: number): number {
  const lista = config.saboteador.tripulantesPorMundo;
  return lista[Math.max(0, Math.min(lista.length - 1, mundo - 1))];
}

export function espaciadoDelMundo(mundo: number): number {
  const lista = config.saboteador.espaciadoPorMundo;
  return lista[Math.max(0, Math.min(lista.length - 1, mundo - 1))];
}

export function segundosPorEnsayo(mundo: number): number {
  return porMundo(
    mundo,
    config.saboteador.segundosPorEnsayoMundo1,
    config.saboteador.segundosPorEnsayoMundo5,
  );
}

/**
 * Disposición compacta del grupo: en fila cuando son pocos, en cuadrícula
 * cuando son muchos. Devuelve columna y fila de cada tripulante, y el ancho de
 * cada fila para poder centrarla.
 */
export function disposicion(cuantos: number): Array<{ columna: number; fila: number; enSuFila: number }> {
  const filas: number[] = [];
  if (cuantos <= 5) {
    filas.push(cuantos);
  } else if (cuantos <= 7) {
    filas.push(Math.ceil(cuantos / 2), Math.floor(cuantos / 2));
  } else {
    const porFila = Math.ceil(cuantos / 3);
    let restantes = cuantos;
    for (let i = 0; i < 3; i += 1) {
      const cuantosAqui = Math.min(porFila, restantes);
      if (cuantosAqui > 0) filas.push(cuantosAqui);
      restantes -= cuantosAqui;
    }
  }

  const salida: Array<{ columna: number; fila: number; enSuFila: number }> = [];
  filas.forEach((cuantosEnFila, fila) => {
    for (let columna = 0; columna < cuantosEnFila; columna += 1) {
      salida.push({ columna, fila, enSuFila: cuantosEnFila });
    }
  });
  return salida;
}

/** Una escalera por espaciado: el amontonamiento cambia el umbral. */
export function escalerasDeSaboteador(modo: Modo, mundo: number): ConfigDeEscalera[] {
  const espaciado = espaciadoDelMundo(mundo);
  return [
    {
      clave: claveDeEscalera('saboteador', modo, `${PARAMETRO}:${espaciado.toFixed(1)}`),
      valorInicial: config.saboteador.diametroInicialPx,
      minimo: config.saboteador.diametroMinimoPx,
      maximo: config.saboteador.diametroMaximoPx,
    },
  ];
}

type Fase = 'jugando' | 'revelando' | 'terminado';

interface Ensayo {
  clave: string;
  valor: number;
  esEnsayoDeConfianza: boolean;
  diametro: number;
  /** Dirección de la abertura del grupo y la del saboteador: 0 der, 1 abajo, 2 izq, 3 arriba. */
  direccionDelGrupo: number;
  direccionDelSaboteador: number;
  saboteador: number;
  inicioMs: number;
}

class InstanciaDeSaboteador implements InstanciaDeJuego {
  private readonly bucle: GameLoop;
  private readonly contador = new ContadorDeNivel();
  private readonly aleatorio: Aleatorio;
  private readonly cuantos: number;
  private readonly espaciado: number;
  private readonly segundos: number;
  private readonly puestos: ReturnType<typeof disposicion>;

  private fase: Fase = 'jugando';
  private ensayo: Ensayo | null = null;
  private ensayosHechos = 0;
  private atrapados = 0;
  private cursor = 0;
  private revelarHasta = 0;
  private ultimoAcierto = false;
  private destruido = false;

  constructor(
    private readonly canvas: HTMLCanvasElement,
    private readonly ctx: ContextoDeJuego,
  ) {
    this.cuantos = tripulantesDelMundo(ctx.mundo);
    this.espaciado = espaciadoDelMundo(ctx.mundo);
    this.segundos = segundosPorEnsayo(ctx.mundo);
    this.puestos = disposicion(this.cuantos);
    this.aleatorio = crearAleatorio(`saboteador:${ctx.mundo}:${ctx.nivel}:${Date.now()}`);
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

  private prepararEnsayo(): void {
    const clave = escalerasDeSaboteador(this.ctx.modo, this.ctx.mundo)[0].clave;
    const escalera = this.ctx.escaleras[clave];
    const propuesto = escalera.proximoEnsayo();

    const direccionDelGrupo = this.aleatorio.entero(0, 3);
    // El saboteador apunta a otra de las cuatro direcciones, nunca a la misma.
    const direccionDelSaboteador = (direccionDelGrupo + this.aleatorio.entero(1, 3)) % 4;

    this.ensayo = {
      clave,
      valor: propuesto.valor,
      esEnsayoDeConfianza: propuesto.esEnsayoDeConfianza,
      diametro: Math.min(propuesto.valor, this.diametroMaximoQueCabe()),
      direccionDelGrupo,
      direccionDelSaboteador,
      saboteador: this.aleatorio.entero(0, this.cuantos - 1),
      inicioMs: this.bucle.tiempoMs,
    };
    this.fase = 'jugando';
  }

  private responder(elegido: number | null): void {
    if (this.fase !== 'jugando' || !this.ensayo) return;
    const ensayo = this.ensayo;
    const acierto = elegido === ensayo.saboteador;
    const tiempoReaccionMs = this.bucle.tiempoMs - ensayo.inicioMs;

    this.ctx.escaleras[ensayo.clave].record(acierto);
    this.contador.registrar(acierto, tiempoReaccionMs, ensayo.esEnsayoDeConfianza);
    if (acierto) this.atrapados += 1;

    this.ctx.onEnsayo({
      juego: 'saboteador',
      modo: this.ctx.modo,
      parametro: ensayo.clave.split(':').slice(2).join(':'),
      valor: ensayo.diametro,
      acierto,
      tiempoReaccionMs,
      esEnsayoDeConfianza: ensayo.esEnsayoDeConfianza,
    });

    this.ensayosHechos += 1;
    this.ultimoAcierto = acierto;
    this.fase = 'revelando';
    this.revelarHasta =
      this.bucle.tiempoMs + (acierto ? config.saboteador.revelarFalloMs / 2 : config.saboteador.revelarFalloMs);
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
    const elegido = this.tripulanteEn(evento.clientX - caja.left, evento.clientY - caja.top);
    if (elegido !== null) {
      this.cursor = elegido;
      this.responder(elegido);
    }
  };

  private alTeclado = (evento: KeyboardEvent): void => {
    if (this.fase !== 'jugando') return;
    switch (teclaDe(evento)) {
      case 'ArrowLeft':
        this.cursor = (this.cursor - 1 + this.cuantos) % this.cuantos;
        break;
      case 'ArrowRight':
        this.cursor = (this.cursor + 1) % this.cuantos;
        break;
      case 'ArrowUp':
        this.cursor = this.saltarDeFila(-1);
        break;
      case 'ArrowDown':
        this.cursor = this.saltarDeFila(1);
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

  private saltarDeFila(direccion: number): number {
    const actual = this.puestos[this.cursor];
    const destino = actual.fila + direccion;
    const candidatos = this.puestos
      .map((p, i) => ({ ...p, i }))
      .filter((p) => p.fila === destino);
    if (candidatos.length === 0) return this.cursor;
    const cercano = candidatos.reduce((mejor, p) =>
      Math.abs(p.columna - actual.columna) < Math.abs(mejor.columna - actual.columna) ? p : mejor,
    );
    return cercano.i;
  }

  // -------------------------------------------------------------------------
  // Geometría
  // -------------------------------------------------------------------------

  /** El grupo entero tiene que caber en el área, con el espaciado del mundo. */
  private diametroMaximoQueCabe(): number {
    const area = areaDeJuego(this.ctx.renderer);
    const columnas = Math.max(...this.puestos.map((p) => p.enSuFila));
    const filas = Math.max(...this.puestos.map((p) => p.fila)) + 1;
    const anchoPorDiametro = config.saboteador.factorAnchoTripulante * this.espaciado;
    const altoPorDiametro = config.saboteador.factorAnchoTripulante * 1.6 * this.espaciado;
    return Math.max(
      config.saboteador.diametroMinimoPx,
      Math.min(
        config.saboteador.diametroMaximoPx,
        area.ancho / (columnas * anchoPorDiametro),
        area.alto / (filas * altoPorDiametro),
      ),
    );
  }

  private medidas(diametro: number) {
    const ancho = diametro * config.saboteador.factorAnchoTripulante;
    return {
      ancho,
      alto: ancho * 1.6,
      pasoX: ancho * this.espaciado,
      pasoY: ancho * 1.6 * this.espaciado,
    };
  }

  private posicion(indice: number, diametro: number): { x: number; y: number } {
    const area = areaDeJuego(this.ctx.renderer);
    const { pasoX, pasoY } = this.medidas(diametro);
    const puesto = this.puestos[indice];
    const filas = Math.max(...this.puestos.map((p) => p.fila)) + 1;

    const anchoDeSuFila = puesto.enSuFila * pasoX;
    const x = area.x + (area.ancho - anchoDeSuFila) / 2 + (puesto.columna + 0.5) * pasoX;
    const altoTotal = filas * pasoY;
    const y = area.y + (area.alto - altoTotal) / 2 + (puesto.fila + 0.5) * pasoY;
    return { x, y };
  }

  private tripulanteEn(x: number, y: number): number | null {
    if (!this.ensayo) return null;
    const { ancho, alto } = this.medidas(this.ensayo.diametro);
    for (let i = 0; i < this.cuantos; i += 1) {
      const centro = this.posicion(i, this.ensayo.diametro);
      if (
        Math.abs(x - centro.x) <= ancho / 2 &&
        Math.abs(y - centro.y) <= alto / 2
      ) {
        return i;
      }
    }
    return null;
  }

  // -------------------------------------------------------------------------
  // Dibujo
  // -------------------------------------------------------------------------

  private cuadro(tiempoMs: number): void {
    if (this.destruido) return;

    if (this.fase === 'jugando' && this.ensayo) {
      if (tiempoMs - this.ensayo.inicioMs >= this.segundos * 1000) this.responder(null);
    } else if (this.fase === 'revelando' && tiempoMs >= this.revelarHasta) {
      if (this.ensayosHechos >= config.saboteador.ensayosPorNivel) this.terminarNivel();
      else this.prepararEnsayo();
    }

    this.dibujar(tiempoMs);
  }

  private dibujar(tiempoMs: number): void {
    const { renderer } = this.ctx;
    renderer.limpiar();
    this.dibujarEstacion();

    if (this.ensayo && this.fase !== 'terminado') {
      const ensayo = this.ensayo;
      const { ancho, alto } = this.medidas(ensayo.diametro);

      for (let i = 0; i < this.cuantos; i += 1) {
        const centro = this.posicion(i, ensayo.diametro);
        const esSaboteador = i === ensayo.saboteador;
        const direccion = esSaboteador ? ensayo.direccionDelSaboteador : ensayo.direccionDelGrupo;
        this.dibujarTripulante(i, centro.x, centro.y, ancho, alto, ensayo.diametro, direccion);
      }

      // Revelado: burbuja al acierto, marco suave al fallo. Sin destellos.
      if (this.fase === 'revelando') {
        const centro = this.posicion(ensayo.saboteador, ensayo.diametro);
        const factor = factorDePulso(tiempoMs, 1);
        if (this.ultimoAcierto) {
          this.dibujarBurbuja(centro.x, centro.y, Math.max(ancho, alto) * 0.75, factor);
        } else {
          renderer.marco(
            'ambos',
            centro.x - ancho / 2 - 4,
            centro.y - alto / 2 - 4,
            ancho + 8,
            alto + 8,
            2,
            { factor },
          );
        }
      }

      this.dibujarCursor(ancho, alto, ensayo.diametro);
    }

    const restante =
      this.fase === 'jugando' && this.ensayo
        ? Math.max(0, 1 - (tiempoMs - this.ensayo.inicioMs) / (this.segundos * 1000))
        : 0;

    dibujarMarcoYHud(
      renderer,
      `${Math.min(this.ensayosHechos + 1, config.saboteador.ensayosPorNivel)}/${config.saboteador.ensayosPorNivel}`,
      `${this.atrapados}`,
      restante,
    );
  }

  /** Paneles y remaches de la estación: decoración de la capa del ojo dominante. */
  private dibujarEstacion(): void {
    const area = areaDeJuego(this.ctx.renderer);
    const paso = Math.max(24, Math.round(area.ancho / 16));
    for (let x = area.x; x < area.x + area.ancho; x += paso) {
      this.ctx.renderer.rect('ojoDominante', x, area.y, 1, area.alto, {
        tono: this.ctx.renderer.paleta.secundario,
        factor: 0.5,
      });
    }
    for (let y = area.y; y < area.y + area.alto; y += paso) {
      this.ctx.renderer.rect('ojoDominante', area.x, y, area.ancho, 1, {
        tono: this.ctx.renderer.paleta.secundario,
        factor: 0.5,
      });
    }
  }

  private dibujarTripulante(
    indice: number,
    cx: number,
    cy: number,
    ancho: number,
    alto: number,
    diametro: number,
    direccion: number,
  ): void {
    const { renderer } = this.ctx;
    // En parche los cuerpos son de colores variados; los visores, todos iguales.
    const tono = renderer.paleta.variantes[indice % renderer.paleta.variantes.length];
    const x = cx - ancho / 2;
    const y = cy - alto / 2;
    const altoCasco = diametro * 1.35;

    // Cuerpo y casco: capa del ojo dominante.
    renderer.rect('ojoDominante', x, y + altoCasco, ancho, alto - altoCasco, { tono });
    renderer.rect('ojoDominante', x + ancho * 0.1, y, ancho * 0.8, altoCasco, {
      tono: renderer.paleta.primario,
    });
    // Antena.
    renderer.rect('ojoDominante', cx - 1, y - Math.max(2, diametro * 0.2), 2, diametro * 0.2, {
      tono: renderer.paleta.secundario,
    });

    // Visor: capa del ojo ambliope. Es lo único que hay que leer.
    renderer.anilloConAbertura(
      'ojoAmbliope',
      cx,
      y + altoCasco / 2,
      diametro,
      Math.max(1, diametro / 5),
      direccion,
      config.saboteador.fraccionAbertura,
      { tono: renderer.paleta.acento },
    );
  }

  private dibujarBurbuja(cx: number, cy: number, radio: number, factor: number): void {
    const pasos = 28;
    for (let i = 0; i < pasos; i += 1) {
      const angulo = (i / pasos) * Math.PI * 2;
      this.ctx.renderer.rect(
        'ambos',
        cx + Math.cos(angulo) * radio,
        cy + Math.sin(angulo) * radio,
        2,
        2,
        { factor },
      );
    }
  }

  private dibujarCursor(ancho: number, alto: number, diametro: number): void {
    const centro = this.posicion(this.cursor, diametro);
    const x = centro.x - ancho / 2 - 3;
    const y = centro.y - alto / 2 - 3;
    const w = ancho + 6;
    const h = alto + 6;
    const largo = Math.max(4, Math.round(Math.min(w, h) / 4));
    const esquinas: Array<[number, number, number, number]> = [
      [x, y, largo, 2],
      [x, y, 2, largo],
      [x + w - largo, y, largo, 2],
      [x + w - 2, y, 2, largo],
      [x, y + h - 2, largo, 2],
      [x, y + h - largo, 2, largo],
      [x + w - largo, y + h - 2, largo, 2],
      [x + w - 2, y + h - largo, 2, largo],
    ];
    for (const [ex, ey, ew, eh] of esquinas) this.ctx.renderer.rect('ambos', ex, ey, ew, eh);
  }
}

export const saboteador: Minijuego = {
  id: 'saboteador',
  modulo: 'ambos',
  escaleras: escalerasDeSaboteador,
  crear: (canvas, contexto) => new InstanciaDeSaboteador(canvas, contexto),
};
