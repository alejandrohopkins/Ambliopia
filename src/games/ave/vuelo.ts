/**
 * El vuelo del ave y las barreras, aparte del dibujo para poder probarlos.
 * Distancias en píxeles CSS; tiempos en segundos.
 */
import { config } from '../../config';
import { delMundo, segunNivel } from '../base';

/** Lo que manda el nivel: hueco, avance, aceleración y vaivén de las barreras. */
export function dificultadDeAve(mundo: number, nivel: number) {
  const a = config.ave;
  return {
    hueco: segunNivel(mundo, nivel, a.huecoInicial, a.huecoFinal),
    velocidad: segunNivel(mundo, nivel, a.velocidadInicial, a.velocidadFinal),
    aceleracion: delMundo(a.aceleracionPorMundo, mundo),
    vaiven: delMundo(a.vaivenPorMundo, mundo),
  };
}

export interface Ave {
  y: number;
  vy: number;
}

/** Un aleteo: sale hacia arriba con la misma fuerza, caiga como caiga. */
export function aletear(ave: Ave, alto: number): void {
  ave.vy = -config.ave.impulso * alto;
}

/**
 * Cae con gravedad, con una velocidad máxima de caída. El techo y el suelo
 * solo la frenan: tocarlos no cuenta como choque.
 */
export function caer(ave: Ave, dt: number, alto: number, techo: number, suelo: number): void {
  ave.vy = Math.min(ave.vy + config.ave.gravedad * alto * dt, config.ave.caidaMaxima * alto);
  ave.y += ave.vy * dt;
  if (ave.y < techo) {
    ave.y = techo;
    ave.vy = 0;
  } else if (ave.y > suelo) {
    ave.y = suelo;
    ave.vy = 0;
  }
}

/** Centro del hueco de la barrera siguiente: nunca un salto imposible desde la anterior. */
export function siguienteHueco(
  anterior: number,
  hueco: number,
  techo: number,
  suelo: number,
  azar: number,
): number {
  const minimo = techo + hueco / 2;
  const maximo = suelo - hueco / 2;
  const salto = (suelo - techo) * config.ave.saltoMaximoDeHueco;
  const desde = Math.max(minimo, anterior - salto);
  const hasta = Math.min(maximo, anterior + salto);
  return desde + (hasta - desde) * azar;
}

/** ¿El ave, en su columna, queda fuera del hueco? */
export function chocaConBarrera(
  aveX: number,
  aveY: number,
  radio: number,
  barreraX: number,
  anchoDeBarrera: number,
  centroDelHueco: number,
  hueco: number,
): boolean {
  const enColumna = aveX + radio > barreraX && aveX - radio < barreraX + anchoDeBarrera;
  if (!enColumna) return false;
  return aveY - radio < centroDelHueco - hueco / 2 || aveY + radio > centroDelHueco + hueco / 2;
}
