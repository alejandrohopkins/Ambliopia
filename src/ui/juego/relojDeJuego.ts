/**
 * Un solo reloj de juego para toda la app. Así el descanso llega a los
 * minutos activos seguidos aunque se cambie de nivel o de juego, y el reloj
 * del día puede sumar lo que aún no se guardó.
 */
import { SessionTimer } from '../../engine/SessionTimer';

let reloj: SessionTimer | null = null;
let cadaMin = 0;

export function relojDeJuego(descansoCadaMin: number): SessionTimer {
  if (!reloj || cadaMin !== descansoCadaMin) {
    reloj = new SessionTimer({ descansoCadaMin });
    cadaMin = descansoCadaMin;
  }
  return reloj;
}
