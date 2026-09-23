/** Registro de minijuegos: la base habla con el contrato, no con cada juego. */
import type { IdJuego } from '../config';
import { minero } from './minero/Minero';
import { saboteador } from './saboteador/Saboteador';
import { meteoritos } from './meteoritos/Meteoritos';
import { torre } from './torre/Torre';
import { tunel } from './tunel/Tunel';
import type { Minijuego } from './tipos';

export const MINIJUEGOS: Partial<Record<IdJuego, Minijuego>> = {
  minero,
  saboteador,
  meteoritos,
  torre,
  tunel,
};

export function minijuego(id: IdJuego): Minijuego | undefined {
  return MINIJUEGOS[id];
}
