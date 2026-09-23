/**
 * Dibuja por capas según el modo.
 *
 * En modo lentes solo existen cuatro formas de color: fondo negro puro,
 * el color del lente del ojo ambliope, el del ojo dominante y gris neutro para
 * lo que ven ambos ojos. Ningún dibujo puede saltarse el renderer: por eso
 * los métodos piden la capa y el renderer decide el color.
 *
 * En modo parche todo se ve con colores normales y el renderer usa la paleta
 * del mundo; el tono concreto lo puede fijar quien dibuja (por ejemplo el
 * cristal con su contraste de Weber calculado).
 */
import { config, type Modo, type Ojo } from '../config';
import { colorDelOjo, intensidadMaxima, type CalibracionLentes } from '../storage/esquema';
import { aCss, gris, intensidadConFactor, rgbDeLente, type RGB } from './color';
import type { PaletaDeMundo } from './mundos';

/** Capa a la que pertenece un elemento del juego. */
export type Capa = 'ojoAmbliope' | 'ojoDominante' | 'ambos';

export interface OpcionesDeRenderer {
  modo: Modo;
  ojoAmbliope: Ojo;
  lentes: CalibracionLentes;
  /** Contraste de la capa del ojo dominante (balance dicóptico). */
  contrasteOjoDominante: number;
  paleta: PaletaDeMundo;
}

export interface OpcionesDeDibujo {
  /** Factor extra de luminancia (pulsos suaves). Nunca cambia el tono. */
  factor?: number;
  /** Color concreto para modo parche. En lentes se ignora. */
  tono?: string;
}

/** Mapa de píxeles: filas de caracteres + paleta por carácter. */
export interface Sprite {
  pixeles: string[];
  /** '.' siempre es transparente. */
  paleta: Record<string, { color: string; factorLentes?: number }>;
}

export class DichopticRenderer {
  private anchoCss = 0;
  private altoCss = 0;

  constructor(
    private readonly ctx: CanvasRenderingContext2D,
    private opciones: OpcionesDeRenderer,
  ) {}

  get ancho(): number {
    return this.anchoCss;
  }

  get alto(): number {
    return this.altoCss;
  }

  get modo(): Modo {
    return this.opciones.modo;
  }

  get paleta(): PaletaDeMundo {
    return this.opciones.paleta;
  }

  actualizar(cambios: Partial<OpcionesDeRenderer>): void {
    this.opciones = { ...this.opciones, ...cambios };
  }

  /** Ajusta el lienzo a su tamaño en píxeles CSS, escalando por devicePixelRatio. */
  redimensionar(anchoCss: number, altoCss: number, dpr = globalThis.devicePixelRatio || 1): void {
    this.anchoCss = Math.floor(anchoCss);
    this.altoCss = Math.floor(altoCss);
    const lienzo = this.ctx.canvas;
    lienzo.width = Math.floor(this.anchoCss * dpr);
    lienzo.height = Math.floor(this.altoCss * dpr);
    if (lienzo.style) {
      lienzo.style.width = `${this.anchoCss}px`;
      lienzo.style.height = `${this.altoCss}px`;
    }
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.ctx.imageSmoothingEnabled = false;
  }

  // -------------------------------------------------------------------------
  // Colores
  // -------------------------------------------------------------------------

  /** Ojo al que pertenece cada capa. La capa 'ambos' no tiene ojo propio. */
  private ojoDeCapa(capa: Capa): Ojo | null {
    if (capa === 'ambos') return null;
    if (capa === 'ojoAmbliope') return this.opciones.ojoAmbliope;
    return this.opciones.ojoAmbliope === 'derecho' ? 'izquierdo' : 'derecho';
  }

  /** Color de la capa como RGB. Es el único punto donde nacen los colores. */
  colorDeCapa(capa: Capa, opciones: OpcionesDeDibujo = {}): RGB {
    const factor = opciones.factor ?? 1;

    if (this.opciones.modo === 'parche') {
      const base = opciones.tono ?? this.tonoPorDefecto(capa);
      return aplicarFactorHex(base, factor);
    }

    if (capa === 'ambos') {
      // El gris de "ambos ojos" vive siempre dentro de su banda neutra:
      // atenuarlo fuera de ella rompería la regla de los cuatro colores.
      const valor = Math.round(config.color.grisAmbos * clamp01(factor));
      return gris(
        Math.max(config.color.grisAmbosMin, Math.min(config.color.grisAmbosMax, valor)),
      );
    }

    const ojo = this.ojoDeCapa(capa)!;
    const color = colorDelOjo(this.opciones.lentes, ojo);
    // Sin lentes calibrados no se puede separar los ojos: se cae a gris neutro.
    if (!color) return gris(config.color.grisAmbos);

    const maximo = intensidadMaxima(this.opciones.lentes, color);
    const base = capa === 'ojoDominante' ? this.opciones.contrasteOjoDominante : 1;
    return rgbDeLente(color, intensidadConFactor(maximo, base * clamp01(factor)));
  }

  cssDeCapa(capa: Capa, opciones: OpcionesDeDibujo = {}): string {
    return aCss(this.colorDeCapa(capa, opciones));
  }

  private tonoPorDefecto(capa: Capa): string {
    const { paleta } = this.opciones;
    if (capa === 'ojoAmbliope') return paleta.acento;
    if (capa === 'ojoDominante') return paleta.primario;
    return paleta.hud;
  }

  // -------------------------------------------------------------------------
  // Dibujo
  // -------------------------------------------------------------------------

  /** Limpia el lienzo: negro puro en lentes, fondo del mundo en parche. */
  limpiar(): void {
    this.ctx.fillStyle =
      this.opciones.modo === 'lentes' ? config.color.fondoLentes : this.opciones.paleta.fondo;
    this.ctx.fillRect(0, 0, this.anchoCss, this.altoCss);
  }

  /**
   * Pinta con el color del FONDO, para vaciar una zona (el cráter de una roca,
   * por ejemplo). En lentes es negro puro; en parche, el fondo del mundo.
   */
  borrar(x: number, y: number, ancho: number, alto: number): void {
    this.ctx.fillStyle =
      this.opciones.modo === 'lentes' ? config.color.fondoLentes : this.opciones.paleta.fondo;
    this.ctx.fillRect(Math.round(x), Math.round(y), Math.round(ancho), Math.round(alto));
  }

  rect(capa: Capa, x: number, y: number, ancho: number, alto: number, op?: OpcionesDeDibujo): void {
    this.ctx.fillStyle = this.cssDeCapa(capa, op);
    this.ctx.fillRect(Math.round(x), Math.round(y), Math.round(ancho), Math.round(alto));
  }

  /** Marco de grosor entero, dibujado con cuatro rectángulos (sin antialias). */
  marco(
    capa: Capa,
    x: number,
    y: number,
    ancho: number,
    alto: number,
    grosor = 2,
    op?: OpcionesDeDibujo,
  ): void {
    const g = Math.max(1, Math.round(grosor));
    this.rect(capa, x, y, ancho, g, op);
    this.rect(capa, x, y + alto - g, ancho, g, op);
    this.rect(capa, x, y + g, g, alto - 2 * g, op);
    this.rect(capa, x + ancho - g, y + g, g, alto - 2 * g, op);
  }

  /** Anillo con una abertura (el visor del tripulante), dibujado por píxeles. */
  anilloConAbertura(
    capa: Capa,
    cx: number,
    cy: number,
    diametro: number,
    grosor: number,
    /** 0 derecha, 1 abajo, 2 izquierda, 3 arriba. */
    direccion: number,
    fraccionAbertura: number,
    op?: OpcionesDeDibujo,
  ): void {
    this.ctx.fillStyle = this.cssDeCapa(capa, op);
    const radio = diametro / 2;
    const radioInterno = Math.max(0, radio - Math.max(1, grosor));
    const mediaAbertura = (fraccionAbertura * diametro) / 2;
    const x0 = Math.round(cx - radio);
    const y0 = Math.round(cy - radio);
    const lado = Math.max(1, Math.round(diametro));

    for (let py = 0; py < lado; py += 1) {
      for (let px = 0; px < lado; px += 1) {
        const dx = px + 0.5 - lado / 2;
        const dy = py + 0.5 - lado / 2;
        const d = Math.hypot(dx, dy);
        if (d > radio || d < radioInterno) continue;
        if (enAbertura(dx, dy, direccion, mediaAbertura)) continue;
        this.ctx.fillRect(x0 + px, y0 + py, 1, 1);
      }
    }
  }

  /**
   * Polígono relleno (roca, estrella, nave, carriles del túnel).
   * Coordenadas en píxeles CSS.
   *
   * Se rellena línea a línea con rectángulos enteros en vez de trazar un
   * camino: el relleno de un camino va suavizado, y un borde suavizado sobre
   * algo ya dibujado produce píxeles a medio camino entre los dos colores. En
   * modo lentes eso significaría un píxel con rojo y cian a la vez, que verían
   * los dos ojos: justo lo que la regla de los cuatro colores prohíbe.
   */
  poligono(capa: Capa, puntos: Array<[number, number]>, op?: OpcionesDeDibujo): void {
    if (puntos.length < 3) return;
    this.ctx.fillStyle = this.cssDeCapa(capa, op);

    let arriba = Infinity;
    let abajo = -Infinity;
    for (const [, y] of puntos) {
      arriba = Math.min(arriba, y);
      abajo = Math.max(abajo, y);
    }
    const desde = Math.round(arriba);
    // Un polígono más fino que un píxel se dibuja igual, con una línea.
    const hasta = Math.max(desde + 1, Math.round(abajo));

    for (let y = desde; y < hasta; y += 1) {
      // El corte se toma dentro del polígono: así una forma más fina que un
      // píxel —una línea de carril lejana— tampoco se pierde.
      const centro = Math.min(Math.max(y + 0.5, arriba + 1e-6), abajo - 1e-6);
      const cortes: number[] = [];
      for (let i = 0; i < puntos.length; i += 1) {
        const [x1, y1] = puntos[i];
        const [x2, y2] = puntos[(i + 1) % puntos.length];
        if ((y1 <= centro && y2 > centro) || (y2 <= centro && y1 > centro)) {
          cortes.push(x1 + ((centro - y1) / (y2 - y1)) * (x2 - x1));
        }
      }
      cortes.sort((a, b) => a - b);
      for (let i = 0; i + 1 < cortes.length; i += 2) {
        const x0 = Math.round(cortes[i]);
        const x1 = Math.round(cortes[i + 1]);
        if (cortes[i + 1] > cortes[i]) this.ctx.fillRect(x0, y, Math.max(1, x1 - x0), 1);
      }
    }
  }

  /**
   * Sprite de mapa de píxeles con escalado entero.
   *
   * En lentes todo el sprite es monocromático: cada carácter aporta solo su
   * factor de luminancia dentro del color de la capa, y así se sigue
   * distinguiendo el traje del casco sin sacar un quinto color.
   *
   * En parche cada carácter sale con su color tal cual. El factor es para las
   * lentes —lo dice su nombre—: si también se aplicara aquí, el traje que la
   * jugadora eligió saldría más apagado que el que compró.
   */
  sprite(capa: Capa, sprite: Sprite, x: number, y: number, escala: number): void {
    const e = Math.max(1, Math.round(escala));
    const x0 = Math.round(x);
    const y0 = Math.round(y);
    const enLentes = this.opciones.modo === 'lentes';

    for (let fila = 0; fila < sprite.pixeles.length; fila += 1) {
      const texto = sprite.pixeles[fila];
      for (let columna = 0; columna < texto.length; columna += 1) {
        const caracter = texto[columna];
        if (caracter === '.') continue;
        const entrada = sprite.paleta[caracter];
        if (!entrada) continue;
        const factor = entrada.factorLentes ?? 1;
        if (factor <= 0) continue;
        this.ctx.fillStyle = this.cssDeCapa(capa, {
          tono: entrada.color,
          factor: enLentes ? factor : 1,
        });
        this.ctx.fillRect(x0 + columna * e, y0 + fila * e, e, e);
      }
    }
  }

  /** Texto del HUD. Siempre en la capa que se le indique. */
  texto(
    capa: Capa,
    texto: string,
    x: number,
    y: number,
    tamanoPx: number,
    alineacion: CanvasTextAlign = 'left',
    op?: OpcionesDeDibujo,
  ): void {
    this.ctx.fillStyle = this.cssDeCapa(capa, op);
    this.ctx.font = `${Math.round(tamanoPx)}px "Pixelify Sans", monospace`;
    this.ctx.textAlign = alineacion;
    this.ctx.textBaseline = 'top';
    this.ctx.fillText(texto, Math.round(x), Math.round(y));
  }
}

function clamp01(valor: number): number {
  return Math.max(0, Math.min(1, valor));
}

/** Aplica un factor de luminancia a un color hexadecimal (solo modo parche). */
function aplicarFactorHex(hex: string, factor: number): RGB {
  const base = hexARgb(hex);
  if (factor === 1) return base;
  const f = Math.max(0, factor);
  return {
    r: Math.max(0, Math.min(255, Math.round(base.r * f))),
    g: Math.max(0, Math.min(255, Math.round(base.g * f))),
    b: Math.max(0, Math.min(255, Math.round(base.b * f))),
  };
}

function hexARgb(hex: string): RGB {
  if (!hex.startsWith('#')) {
    const coincidencia = hex.match(/^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/);
    if (coincidencia) {
      return {
        r: Number(coincidencia[1]),
        g: Number(coincidencia[2]),
        b: Number(coincidencia[3]),
      };
    }
    return { r: 0, g: 0, b: 0 };
  }
  const limpio = hex.slice(1);
  const completo =
    limpio.length === 3
      ? limpio
          .split('')
          .map((c) => c + c)
          .join('')
      : limpio;
  return {
    r: parseInt(completo.slice(0, 2), 16),
    g: parseInt(completo.slice(2, 4), 16),
    b: parseInt(completo.slice(4, 6), 16),
  };
}

/** ¿Este píxel del anillo cae dentro de la abertura? */
function enAbertura(dx: number, dy: number, direccion: number, mediaAbertura: number): boolean {
  switch (((direccion % 4) + 4) % 4) {
    case 0:
      return dx > 0 && Math.abs(dy) <= mediaAbertura;
    case 1:
      return dy > 0 && Math.abs(dx) <= mediaAbertura;
    case 2:
      return dx < 0 && Math.abs(dy) <= mediaAbertura;
    default:
      return dy < 0 && Math.abs(dx) <= mediaAbertura;
  }
}
