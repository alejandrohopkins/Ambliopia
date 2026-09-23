/**
 * Parches de Gabor: una onda de rayas dentro de una campana, sobre gris.
 *
 * Todo se calcula en luminancia lineal y se pasa a sRGB de 8 bits al final.
 * Igual que en el resto del juego, el contraste que se anota es el REAL, el
 * que queda después de redondear a 8 bits, no el pedido.
 */
import { config } from '../../config';
import { linealASrgb, limitar8, srgbALineal } from '../../engine/color';
import { delMundo, segunNivel } from '../base';

/** Lo que manda el nivel: rejilla, frecuencia, diferencia de giro y límite de tiempo. */
export function dificultadDeGabor(mundo: number, nivel: number) {
  const g = config.gabor;
  return {
    rejilla: delMundo(g.rejillaPorMundo, mundo),
    ciclos: segunNivel(mundo, nivel, g.ciclosInicial, g.ciclosFinal),
    diferenciaGrados: segunNivel(mundo, nivel, g.diferenciaInicialGrados, g.diferenciaFinalGrados),
    limiteSeg: delMundo(g.limiteSegPorMundo, mundo),
  };
}

export interface Parche {
  lado: number;
  /** Nivel de gris de cada píxel, fila a fila. */
  grises: Uint8Array;
  /** Contraste de Michelson que de verdad quedó en la pantalla. */
  contrasteReal: number;
}

export interface OpcionesDeParche {
  lado: number;
  ciclos: number;
  /** Orientación de las rayas, en radianes. */
  orientacion: number;
  /** Contraste de Michelson pedido (0–1). */
  contraste: number;
  fase?: number;
  luminanciaMedia?: number;
  sigma?: number;
}

/** Contraste de Michelson entre la luminancia más alta y la más baja. */
export function michelson(maxima: number, minima: number): number {
  return maxima + minima > 0 ? (maxima - minima) / (maxima + minima) : 0;
}

/** El gris de fondo del panel, en 8 bits. */
export function grisDeFondo(luminanciaMedia = config.gabor.luminanciaMedia): number {
  return limitar8(linealASrgb(luminanciaMedia));
}

export function crearParche(opciones: OpcionesDeParche): Parche {
  const {
    lado,
    ciclos,
    orientacion,
    contraste,
    fase = 0,
    luminanciaMedia = config.gabor.luminanciaMedia,
    sigma = config.gabor.sigmaEnParche,
  } = opciones;

  const grises = new Uint8Array(lado * lado);
  const modulacion = new Float32Array(lado * lado);
  const coseno = Math.cos(orientacion);
  const seno = Math.sin(orientacion);
  const dosSigma2 = 2 * sigma * sigma;
  let pico = 0;

  for (let y = 0; y < lado; y += 1) {
    const v = (y + 0.5) / lado - 0.5;
    for (let x = 0; x < lado; x += 1) {
      const u = (x + 0.5) / lado - 0.5;
      const onda = Math.sin(2 * Math.PI * ciclos * (u * coseno + v * seno) + fase);
      const campana = Math.exp(-(u * u + v * v) / dosSigma2);
      const m = onda * campana;
      modulacion[y * lado + x] = m;
      pico = Math.max(pico, Math.abs(m));
    }
  }

  // La cresta más alta llega justo al contraste pedido, sea cual sea la fase:
  // así todos los parches de una rejilla tienen el mismo contraste.
  for (let i = 0; i < grises.length; i += 1) {
    const m = pico > 0 ? modulacion[i] / pico : 0;
    grises[i] = limitar8(linealASrgb(luminanciaMedia * (1 + contraste * m)));
  }

  let maximo = 0;
  let minimo = 255;
  for (const gris of grises) {
    maximo = Math.max(maximo, gris);
    minimo = Math.min(minimo, gris);
  }

  // Límite de 8 bits: si el contraste pedido no llega a mover ni un nivel de
  // gris, las crestas suben un paso y los valles bajan otro. Es el contraste
  // más bajo que la pantalla puede mostrar.
  if (contraste > 0 && maximo === minimo && pico > 0) {
    const fondo = maximo;
    for (let i = 0; i < grises.length; i += 1) {
      // Solo cerca de las crestas y los valles: es donde la onda asoma primero.
      if (modulacion[i] >= pico * 0.9) grises[i] = limitar8(fondo + config.color.pasoMinimo8Bits);
      else if (modulacion[i] <= -pico * 0.9) grises[i] = limitar8(fondo - config.color.pasoMinimo8Bits);
    }
    maximo = limitar8(fondo + config.color.pasoMinimo8Bits);
    minimo = limitar8(fondo - config.color.pasoMinimo8Bits);
  }

  return { lado, grises, contrasteReal: michelson(srgbALineal(maximo), srgbALineal(minimo)) };
}

/** Orientaciones de la rejilla: todas iguales menos la del parche distinto. */
export function orientaciones(
  cuantos: number,
  distinto: number,
  base: number,
  diferenciaGrados: number,
): number[] {
  const diferencia = (diferenciaGrados * Math.PI) / 180;
  return Array.from({ length: cuantos }, (_, i) => (i === distinto ? base + diferencia : base));
}
