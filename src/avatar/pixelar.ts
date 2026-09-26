/**
 * Del dibujo vectorial al pixel art. El avatar, las mascotas y los fondos se
 * dibujan con vectores (avatar/vector) y se muestran pixelados: se
 * rasterizan con pocos píxeles y se amplían sin suavizar (avatar/Pixelado).
 *
 * En el avatar y las mascotas, además, cada píxel queda opaco del todo o
 * transparente, y con uno de los colores que usa el propio dibujo: sin bordes
 * difuminados ni medios tonos, como un sprite hecho a mano. Para eso se
 * dibuja con más detalle, cada punto toma el color de la paleta más cercano y
 * cada píxel se queda con el color que más ocupa de su bloque; el contorno
 * gana aunque ocupe menos, para que no se pierdan ojos, bocas ni bordes. Los
 * degradados quedan en franjas de color que hacen de luces y sombras.
 */
import { config } from '../config';

export type Rgb = [number, number, number];

export function rgb(hex: string): Rgb {
  return [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)) as Rgb;
}

/** Los colores (#RRGGBB) que usa un SVG, sin repetir. */
export function coloresDelDibujo(svg: string): Rgb[] {
  const colores = new Set((svg.match(/#[0-9a-f]{6}\b/gi) ?? []).map((c) => c.toLowerCase()));
  return [...colores].map(rgb);
}

/** Distancia entre colores que pesa el rojo, el verde y el azul como los ve el ojo. */
function distancia([r, g, b]: Rgb, r2: number, g2: number, b2: number): number {
  const rojoMedio = (r + r2) / 2;
  return (
    (2 + rojoMedio / 256) * (r - r2) ** 2 +
    4 * (g - g2) ** 2 +
    (2 + (255 - rojoMedio) / 256) * (b - b2) ** 2
  );
}

/**
 * Deja cada píxel (RGBA) opaco del todo o transparente, y con el color de la
 * paleta más cercano al suyo.
 */
export function ajustarAPaleta(pixeles: Uint8ClampedArray, paleta: Rgb[]): void {
  const cercanos = new Map<number, Rgb>();
  for (let i = 0; i < pixeles.length; i += 4) {
    if (pixeles[i + 3] < config.avatar.pixelado.opacidadMinima || paleta.length === 0) {
      pixeles.fill(0, i, i + 4);
      continue;
    }
    const [r, g, b] = [pixeles[i], pixeles[i + 1], pixeles[i + 2]];
    const clave = (r << 16) | (g << 8) | b;
    let color = cercanos.get(clave);
    if (!color) {
      color = paleta.reduce((mejor, otro) =>
        distancia(otro, r, g, b) < distancia(mejor, r, g, b) ? otro : mejor,
      );
      cercanos.set(clave, color);
    }
    pixeles.set([...color, 255], i);
  }
}

/**
 * Reduce una imagen RGBA (ya ajustada a la paleta) `escala` veces: cada píxel
 * se queda con el color que más ocupa de su bloque, o con el del contorno si
 * este cubre al menos `contornoMinimo` del bloque. Ante un empate, gana lo
 * pintado sobre lo transparente.
 */
export function reducirPorBloques(
  pixeles: Uint8ClampedArray,
  ancho: number,
  escala: number,
  contorno?: Rgb,
): Uint8ClampedArray {
  const alto = pixeles.length / 4 / ancho;
  const [columnas, filas] = [ancho / escala, alto / escala];
  const salida = new Uint8ClampedArray(columnas * filas * 4);
  const transparente = -1;
  const delContorno = contorno ? (contorno[0] << 16) | (contorno[1] << 8) | contorno[2] : null;
  const minimo = config.avatar.pixelado.contornoMinimo * escala * escala;

  for (let fila = 0; fila < filas; fila += 1) {
    for (let columna = 0; columna < columnas; columna += 1) {
      const votos = new Map<number, number>();
      for (let y = fila * escala; y < (fila + 1) * escala; y += 1) {
        for (let x = columna * escala; x < (columna + 1) * escala; x += 1) {
          const i = (y * ancho + x) * 4;
          const color =
            pixeles[i + 3] === 0 ? transparente : (pixeles[i] << 16) | (pixeles[i + 1] << 8) | pixeles[i + 2];
          votos.set(color, (votos.get(color) ?? 0) + 1);
        }
      }
      let elegido = transparente;
      if (delContorno !== null && (votos.get(delContorno) ?? 0) >= minimo) {
        elegido = delContorno;
      } else {
        let mas = votos.get(transparente) ?? 0;
        for (const [color, cuantos] of votos) {
          if (color !== transparente && cuantos >= mas) [elegido, mas] = [color, cuantos];
        }
      }
      if (elegido !== transparente) {
        salida.set([elegido >> 16, (elegido >> 8) & 255, elegido & 255, 255], (fila * columnas + columna) * 4);
      }
    }
  }
  return salida;
}

/** Lo que un dibujo puede sobresalir de su caja (alas, orejas, coronas), en unidades del SVG. */
export interface Desborde {
  lados: number;
  arriba: number;
  abajo: number;
}

export interface Rejilla {
  /** Píxeles de pantalla por píxel del dibujo: siempre entero, para que no se deformen. */
  tamano: number;
  /** Tamaño del lienzo, en píxeles del dibujo. */
  columnas: number;
  filas: number;
  /** La parte del SVG que va al lienzo (viewBox). */
  caja: string;
  /** Márgenes negativos: en la página el dibujo ocupa su caja, y lo demás sobresale. */
  margen: string;
}

/** Píxeles de pantalla por píxel del dibujo para un dibujo de `alto` px. */
export function tamanoDePixel(alto: number): number {
  const { filasObjetivo, tamanoMinimo } = config.avatar.pixelado;
  return Math.max(tamanoMinimo, Math.round(alto / filasObjetivo));
}

/**
 * Rejilla para mostrar pixelado un dibujo de caja `vista` con `alto` px de
 * alto en pantalla. El eje vertical del dibujo cae entre dos columnas: una
 * figura simétrica sale simétrica también en píxeles.
 */
export function rejillaDeDibujo(
  vista: { ancho: number; alto: number },
  desborde: Desborde,
  alto: number,
  tamano = tamanoDePixel(alto),
): Rejilla {
  const filasDeLaCaja = Math.max(1, Math.round(alto / tamano));
  const unidad = vista.alto / filasDeLaCaja;
  const mitad = Math.ceil(vista.ancho / 2 / unidad);
  const lados = Math.ceil(desborde.lados / unidad);
  const arriba = Math.ceil(desborde.arriba / unidad);
  const abajo = Math.ceil(desborde.abajo / unidad);
  const columnas = 2 * (mitad + lados);
  const filas = filasDeLaCaja + arriba + abajo;
  const caja = [vista.ancho / 2 - (columnas / 2) * unidad, -arriba * unidad, columnas * unidad, filas * unidad];
  return {
    tamano,
    columnas,
    filas,
    caja: caja.join(' '),
    margen: [arriba, lados, abajo, lados].map((n) => `${-n * tamano}px`).join(' '),
  };
}
