/**
 * Física del Rebote ágil, aparte del dibujo para poder probarla.
 * Todas las distancias en píxeles CSS y las velocidades en píxeles por segundo.
 */
import { config } from '../../config';
import { avanceDeNivel, delMundo, enteroSegunNivel, segunNivel } from '../base';

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

/** Una bola en vuelo, con lo que ya la aceleraron los bloques. */
export interface BolaEnVuelo extends Movil {
  acelerada: number;
}

/** Acelerón al chocar con un bloque: dura hasta que la paleta la devuelve. */
export function acelerarEnBloque(bola: BolaEnVuelo): void {
  const factor = config.rebote.aceleracionDeBloque;
  if (bola.acelerada >= factor * factor) return;
  bola.acelerada *= factor;
  bola.vx *= factor;
  bola.vy *= factor;
}

export interface Llegada {
  /** Segundos que faltan para que llegue a la línea de la paleta. */
  t: number;
  x: number;
}

/**
 * Cuándo y dónde llegará una bola a la línea de la paleta: se simula su vuelo
 * —paredes, techo y bloques— a pasos cortos, sin tocar la bola de verdad.
 */
export function llegadaALaPaleta(
  bola: BolaEnVuelo,
  area: Caja,
  bloques: Caja[],
  lineaY: number,
  maximoSeg = 10,
): Llegada | null {
  const copia = { ...bola };
  const paso = config.rebote.pasoFisicoSeg;
  for (let pasos = 1; pasos * paso <= maximoSeg; pasos += 1) {
    avanzarBola(copia, paso, area, bloques);
    if (copia.vy > 0 && copia.y >= lineaY) return { t: pasos * paso, x: copia.x };
  }
  return null;
}

/** Un paso de física: avanza, rebota en paredes y techo, y en los bloques. */
export function avanzarBola(bola: BolaEnVuelo, paso: number, area: Caja, bloques: Caja[]): void {
  bola.x += bola.vx * paso;
  bola.y += bola.vy * paso;
  rebotarEnParedes(bola, area);
  for (const bloque of bloques) {
    // Acelerón repentino: dura hasta que la paleta la devuelve.
    if (rebotarEnCaja(bola, bloque)) acelerarEnBloque(bola);
  }
}

/**
 * ¿Puede la paleta llegar a todas estas bolas? Se recorren las llegadas en
 * orden y la paleta se mueve lo justo para cubrir cada una, a una velocidad
 * dada y dejando un tiempo de reacción entre una y la siguiente. Si así llega
 * a todas, se puede.
 */
export function llegadasAlcanzables(
  llegadas: Llegada[],
  paletaX: number,
  alcance: number,
  velocidad: number,
  reaccionSeg: number,
): boolean {
  let x = paletaX;
  let antes = 0;
  for (const llegada of [...llegadas].sort((a, b) => a.t - b.t)) {
    const destino = Math.max(llegada.x - alcance, Math.min(llegada.x + alcance, x));
    const tiempo = Math.max(0, llegada.t - antes - reaccionSeg);
    if (Math.abs(destino - x) > velocidad * tiempo + 1e-9) return false;
    x = destino;
    antes = llegada.t;
  }
  return true;
}

/** Lo que manda el nivel: tamaño de la paleta, velocidad, bloques y tope de bolas. */
export function dificultadDeRebote(mundo: number, nivel: number) {
  const { paletaInicial, paletaFinal } = config.rebote;
  return {
    // Mismo recorte en proporción en cada nivel: siempre se nota al subir.
    paleta: paletaInicial * (paletaFinal / paletaInicial) ** avanceDeNivel(mundo, nivel),
    velocidad: segunNivel(mundo, nivel, config.rebote.velocidadInicial, config.rebote.velocidadFinal),
    bloques: delMundo(config.rebote.bloquesPorMundo, mundo),
    bolasMax: enteroSegunNivel(mundo, nivel, config.rebote.bolasMaxInicial, config.rebote.bolasMaxFinal),
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
