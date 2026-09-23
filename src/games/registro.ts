/** Registro de minijuegos: la base habla con el contrato, no con cada juego. */
import type { IdJuego, Modo } from '../config';
import { minero } from './minero/Minero';
import { saboteador } from './saboteador/Saboteador';
import { meteoritos } from './meteoritos/Meteoritos';
import { torre } from './torre/Torre';
import { tunel } from './tunel/Tunel';
import { rebote } from './rebote/Rebote';
import { cazador } from './cazador/Cazador';
import { gabor } from './gabor/Gabor';
import { corte } from './corte/Corte';
import { laberinto } from './laberinto/Laberinto';
import { pozo } from './pozo/Pozo';
import { serpiente } from './serpiente/Serpiente';
import { ave } from './ave/Ave';
import { sapo } from './sapo/Sapo';
import { mosaicos } from './mosaicos/Mosaicos';
import type { Minijuego } from './tipos';

export const MINIJUEGOS: Partial<Record<IdJuego, Minijuego>> = {
  minero,
  saboteador,
  meteoritos,
  torre,
  tunel,
  rebote,
  cazador,
  gabor,
  corte,
  laberinto,
  pozo,
  serpiente,
  ave,
  sapo,
  mosaicos,
};

/** Orden en que se muestran: primero los de siempre, luego los del módulo. */
export const ORDEN_DE_JUEGOS: IdJuego[] = [
  'minero',
  'saboteador',
  'torre',
  'meteoritos',
  'tunel',
  'cazador',
  'rebote',
  'gabor',
  'corte',
  'laberinto',
  'pozo',
  'serpiente',
  'ave',
  'sapo',
  'mosaicos',
];

export function minijuego(id: IdJuego): Minijuego | undefined {
  return MINIJUEGOS[id];
}

/** ¿Se puede jugar este minijuego en este modo? */
export function sirveParaModo(juego: Minijuego, modo: Modo): boolean {
  return juego.modulo === 'ambos' || juego.modulo === modo;
}

/** Los minijuegos que se ofrecen en un modo, en su orden. */
export function juegosDelModo(modo: Modo): IdJuego[] {
  return ORDEN_DE_JUEGOS.filter((id) => {
    const juego = MINIJUEGOS[id];
    return juego !== undefined && sirveParaModo(juego, modo);
  });
}
