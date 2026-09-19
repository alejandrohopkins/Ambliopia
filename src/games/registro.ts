/** Registro de minijuegos: la base habla con el contrato, no con cada juego. */
import type { IdJuego } from '../config';
import { minero } from './minero/Minero';
import type { Minijuego } from './tipos';

export const MINIJUEGOS: Partial<Record<IdJuego, Minijuego>> = {
  minero,
};

export function minijuego(id: IdJuego): Minijuego | undefined {
  return MINIJUEGOS[id];
}
