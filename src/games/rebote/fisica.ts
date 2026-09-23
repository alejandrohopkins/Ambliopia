/**
 * Física del Rebote ágil, aparte del dibujo para poder probarla.
 * Todas las distancias en píxeles CSS y las velocidades en píxeles por segundo.
 */
import { config } from '../../config';
import { delMundo, segunNivel } from '../base';

export interface Caja {
  x: number;
  y: number;
  ancho: number;
  alto: number;
}

export interface Movil {
  x: number;
  y: number;
  vx: number;
  vy: number;
}

/** Lo que manda el nivel: tamaño de la paleta, velocidad, bloques y bolas. */
export function dificultadDeRebote(mundo: number, nivel: number) {
  return {
    paleta: segunNivel(mundo, nivel, config.rebote.paletaInicial, config.rebote.paletaFinal),
    velocidad: segunNivel(mundo, nivel, config.rebote.velocidadInicial, config.rebote.velocidadFinal),
    bloques: delMundo(config.rebote.bloquesPorMundo, mundo),
    bolas: delMundo(config.rebote.bolasPorMundo, mundo),
  };
}

/** Rebote contra las paredes de los lados y el techo. El suelo es de la paleta. */
export function rebotarEnParedes(bola: Movil, area: Caja): void {
  if (bola.x < area.x) {
    bola.x = area.x + (area.x - bola.x);
    bola.vx = Math.abs(bola.vx);
  } else if (bola.x > area.x + area.ancho) {
    bola.x = area.x + area.ancho - (bola.x - area.x - area.ancho);
    bola.vx = -Math.abs(bola.vx);
  }
  if (bola.y < area.y) {
    bola.y = area.y + (area.y - bola.y);
    bola.vy = Math.abs(bola.vy);
  }
}

/**
 * ¿La paleta devuelve la bola? Se juzga con el centro de la bola más un
 * margen fijo: el tamaño de la bola no cambia lo fácil que es darle, solo lo
 * fácil que es verla.
 */
export function golpeaLaPaleta(
  bolaX: number,
  paletaX: number,
  anchoDePaleta: number,
  margen = config.rebote.margenDeGolpePx,
): boolean {
  return Math.abs(bolaX - paletaX) <= anchoDePaleta / 2 + margen;
}

/**
 * Velocidad de salida tras el golpe: cuanto más lejos del centro de la
 * paleta, más inclinada sale. Así la jugadora puede apuntar.
 */
export function salidaDePaleta(
  bolaX: number,
  paletaX: number,
  anchoDePaleta: number,
  rapidez: number,
): { vx: number; vy: number } {
  const desvio = Math.max(-1, Math.min(1, (bolaX - paletaX) / (anchoDePaleta / 2)));
  const angulo = (desvio * config.rebote.anguloMaximoGrados * Math.PI) / 180;
  return { vx: Math.sin(angulo) * rapidez, vy: -Math.cos(angulo) * rapidez };
}

/**
 * Choque de la bola con un bloque: si su centro entra en la caja, sale por
 * el lado por el que menos se metió. Devuelve si hubo choque.
 */
export function rebotarEnCaja(bola: Movil, caja: Caja): boolean {
  const dentro =
    bola.x > caja.x && bola.x < caja.x + caja.ancho && bola.y > caja.y && bola.y < caja.y + caja.alto;
  if (!dentro) return false;

  const izquierda = bola.x - caja.x;
  const derecha = caja.x + caja.ancho - bola.x;
  const arriba = bola.y - caja.y;
  const abajo = caja.y + caja.alto - bola.y;
  const menor = Math.min(izquierda, derecha, arriba, abajo);

  if (menor === izquierda) {
    bola.x = caja.x;
    bola.vx = -Math.abs(bola.vx);
  } else if (menor === derecha) {
    bola.x = caja.x + caja.ancho;
    bola.vx = Math.abs(bola.vx);
  } else if (menor === arriba) {
    bola.y = caja.y;
    bola.vy = -Math.abs(bola.vy);
  } else {
    bola.y = caja.y + caja.alto;
    bola.vy = Math.abs(bola.vy);
  }
  return true;
}
