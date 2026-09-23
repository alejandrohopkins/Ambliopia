/**
 * Reglas del Cazador de objetivos, aparte del dibujo para poder probarlas.
 */
import { config } from '../../config';
import type { Aleatorio } from '../../engine/rng';
import { delMundo, enteroSegunNivel, segunNivel } from '../base';

/** Lo que manda el nivel: rejilla, tiempos, bombas y vaivén. */
export function dificultadDeCazador(mundo: number, nivel: number) {
  const c = config.cazador;
  return {
    rejilla: delMundo(c.rejillaPorMundo, mundo),
    visibleMs: segunNivel(mundo, nivel, c.visibleMsInicial, c.visibleMsFinal),
    esperaMs: segunNivel(mundo, nivel, c.esperaMsInicial, c.esperaMsFinal),
    irregularidad: segunNivel(mundo, nivel, c.irregularidadInicial, c.irregularidadFinal),
    simultaneos: enteroSegunNivel(mundo, nivel, c.simultaneosInicial, c.simultaneosFinal),
    bombas: segunNivel(mundo, nivel, c.bombasInicial, c.bombasFinal),
    vaiven: segunNivel(mundo, nivel, c.vaivenInicial, c.vaivenFinal),
  };
}

/**
 * Espera hasta la siguiente aparición. Con irregularidad 0 es un metrónomo
 * —en los primeros niveles se sabe cuándo va a salir—; con 1 puede ir de
 * casi nada al doble.
 */
export function siguienteEspera(esperaMs: number, irregularidad: number, aleatorio: Aleatorio): number {
  const variacion = irregularidad * (aleatorio.siguiente() * 2 - 1);
  return esperaMs * Math.max(0.2, 1 + variacion);
}

/** ¿El toque cae sobre la diana? */
export function toqueAcierta(
  toqueX: number,
  toqueY: number,
  centroX: number,
  centroY: number,
  tamano: number,
): boolean {
  const alcance = Math.max(tamano / 2, config.cazador.toleranciaMinimaPx);
  return Math.hypot(toqueX - centroX, toqueY - centroY) <= alcance;
}

/** Desplazamiento horizontal de la rejilla que se mece, en píxeles. */
export function desplazamientoDeVaiven(vaiven: number, lado: number, tiempoMs: number): number {
  const fase = (tiempoMs / 1000 / config.cazador.vaivenPeriodoSeg) * Math.PI * 2;
  return Math.round(vaiven * lado * Math.sin(fase));
}
