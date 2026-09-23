/**
 * Vuelo de las frutas y el corte, aparte del dibujo para poder probarlos.
 * Distancias en píxeles CSS, tiempos en segundos.
 */
import { config } from '../../config';
import type { Aleatorio } from '../../engine/rng';
import type { AreaDeJuego } from '../comun';
import { enteroSegunNivel, segunNivel } from '../base';

/** Lo que manda el nivel: tamaño, velocidad, curvas, frutas a la vez y acelerones. */
export function dificultadDeCorte(mundo: number, nivel: number) {
  const c = config.corte;
  return {
    tamano: segunNivel(mundo, nivel, c.tamanoInicialPx, c.tamanoFinalPx),
    velocidad: segunNivel(mundo, nivel, c.velocidadInicial, c.velocidadFinal),
    curvatura: segunNivel(mundo, nivel, c.curvaturaInicial, c.curvaturaFinal),
    simultaneos: enteroSegunNivel(mundo, nivel, c.simultaneosInicial, c.simultaneosFinal),
    acelerones: mundo >= c.aceleronDesdeMundo,
  };
}

export interface Vuelo {
  x: number;
  y: number;
  vx: number;
  vy: number;
  /** Aceleración hacia abajo: cero en línea recta. */
  ay: number;
  /** Segundos de vuelo en los que acelera de golpe, si le toca. */
  aceleronEnSeg: number | null;
  segundos: number;
}

/**
 * Lanza una fruta. En línea recta cruza de un lado al otro; en parábola sale
 * de abajo, sube y vuelve a caer, más rápido cuanto más alto es el nivel.
 */
export function lanzar(
  area: AreaDeJuego,
  dificultad: ReturnType<typeof dificultadDeCorte>,
  radio: number,
  aleatorio: Aleatorio,
): Vuelo {
  const rapidez = dificultad.velocidad * area.ancho;
  const aceleronEnSeg =
    dificultad.acelerones && aleatorio.probabilidad(config.corte.probabilidadDeAceleron)
      ? 0.5 + aleatorio.siguiente()
      : null;

  if (!aleatorio.probabilidad(dificultad.curvatura)) {
    const desdeIzquierda = aleatorio.probabilidad(0.5);
    return {
      x: desdeIzquierda ? area.x - radio : area.x + area.ancho + radio,
      y: area.y + area.alto * (0.25 + aleatorio.siguiente() * 0.5),
      vx: desdeIzquierda ? rapidez : -rapidez,
      vy: (aleatorio.siguiente() - 0.5) * rapidez * 0.3,
      ay: 0,
      aceleronEnSeg,
      segundos: 0,
    };
  }

  // Parábola: la gravedad crece con el cuadrado de la velocidad, así el vuelo
  // entero dura menos en los niveles rápidos sin cambiar de forma.
  const escala = dificultad.velocidad / config.corte.velocidadInicial;
  const gravedad = config.corte.gravedad * area.alto * escala * escala;
  const [cimaMin, cimaMax] = config.corte.cimaDeParabola;
  const subida = area.alto * (cimaMin + aleatorio.siguiente() * (cimaMax - cimaMin));
  const x = area.x + area.ancho * (0.15 + aleatorio.siguiente() * 0.7);
  const haciaElCentro = x < area.x + area.ancho / 2 ? 1 : -1;
  return {
    x,
    y: area.y + area.alto + radio,
    vx: haciaElCentro * rapidez * (0.2 + aleatorio.siguiente() * 0.3),
    vy: -Math.sqrt(2 * gravedad * subida),
    ay: gravedad,
    aceleronEnSeg,
    segundos: 0,
  };
}

export function mover(vuelo: Vuelo, dt: number): void {
  const antes = vuelo.segundos;
  vuelo.segundos += dt;
  if (vuelo.aceleronEnSeg !== null && antes < vuelo.aceleronEnSeg && vuelo.segundos >= vuelo.aceleronEnSeg) {
    vuelo.vx *= config.corte.factorDeAceleron;
    vuelo.vy *= config.corte.factorDeAceleron;
    vuelo.ay *= config.corte.factorDeAceleron * config.corte.factorDeAceleron;
  }
  vuelo.x += vuelo.vx * dt;
  vuelo.y += vuelo.vy * dt + 0.5 * vuelo.ay * dt * dt;
  vuelo.vy += vuelo.ay * dt;
}

/** ¿Ya salió del área para no volver? */
export function seFue(vuelo: Vuelo, area: AreaDeJuego, radio: number): boolean {
  if (vuelo.vx > 0 && vuelo.x > area.x + area.ancho + radio) return true;
  if (vuelo.vx < 0 && vuelo.x < area.x - radio) return true;
  return vuelo.vy > 0 && vuelo.y > area.y + area.alto + radio;
}

/** Distancia de un punto a un segmento. */
export function distanciaASegmento(
  px: number,
  py: number,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
): number {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const largo2 = dx * dx + dy * dy;
  const t = largo2 > 0 ? Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / largo2)) : 0;
  return Math.hypot(px - (x1 + t * dx), py - (y1 + t * dy));
}

/** Un trazo del dedo corta la fruta si pasa por encima de ella. */
export function trazoCorta(
  desde: { x: number; y: number },
  hasta: { x: number; y: number },
  fruta: { x: number; y: number },
  radio: number,
): boolean {
  if (desde.x === hasta.x && desde.y === hasta.y) return false;
  return distanciaASegmento(fruta.x, fruta.y, desde.x, desde.y, hasta.x, hasta.y) <= radio;
}
