/**
 * Puente entre lo que la jugadora lleva equipado y los minijuegos.
 *
 * Aquí se arma el sprite que de verdad sale en pantalla mientras juega: su
 * casco, su traje, su visor, su pico, su nave, su estela y su mascota. Es lo
 * que hace que gastar monedas signifique algo: si lo comprado solo se viera
 * en la pantalla del avatar, la tienda sería un catálogo y no un premio.
 */
import type { Ojo } from '../config';
import type { DichopticRenderer, Sprite } from '../engine/DichopticRenderer';
import { componerAvatar, paletaCompleta } from './compositor';
import { ESTELAS, MASCOTAS, NAVES, PICOS } from './piezas';
import { conParche, type MapaDePixeles } from './sprites';

/** Lo equipado, tal como lo guarda la economía: categoría → identificador. */
export type EquipoDeJuego = Record<string, string>;

export interface OpcionesDeAvatar {
  /** Si se está jugando con parche, el ojo que lo lleva. */
  ojoTapado?: Ojo;
}

/**
 * El avatar tal como sale en los juegos.
 * En modo parche lleva su parche puesto, igual que la jugadora.
 */
export function avatarDeJuego(
  equipo: EquipoDeJuego,
  opciones: OpcionesDeAvatar = {},
): MapaDePixeles {
  const mapa = componerAvatar(equipo);
  if (!opciones.ojoTapado) return mapa;
  return conParche(opciones.ojoTapado, mapa);
}

function elegir(
  piezas: Record<string, MapaDePixeles>,
  id: string | undefined,
  respaldo: string,
): MapaDePixeles {
  return (id && piezas[id]) || piezas[respaldo];
}

export function picoDeJuego(equipo: EquipoDeJuego): MapaDePixeles {
  return elegir(PICOS, equipo.picos, 'pico-basico');
}

export function naveDeJuego(equipo: EquipoDeJuego): MapaDePixeles {
  return elegir(NAVES, equipo.naves, 'nave-exploradora');
}

export function estelaDeJuego(equipo: EquipoDeJuego): MapaDePixeles {
  return elegir(ESTELAS, equipo.estelas, 'estela-chispas');
}

/** La mascota, si lleva alguna. Es opcional: no todo el mundo tiene una. */
export function mascotaDeJuego(equipo: EquipoDeJuego): MapaDePixeles | undefined {
  return equipo.mascotas ? MASCOTAS[equipo.mascotas] : undefined;
}

/**
 * Sprite listo para el renderer, con los colores de lo equipado.
 *
 * En modo lentes el renderer ignora estos colores y deja solo su luminancia
 * dentro del color de la capa, así que el traje se sigue distinguiendo del
 * contorno sin romper la regla de los cuatro colores.
 */
export function spriteDeEquipo(
  pixeles: MapaDePixeles,
  renderer: DichopticRenderer,
  equipo: EquipoDeJuego,
): Sprite {
  const paleta = paletaCompleta(equipo);
  return {
    pixeles,
    paleta: {
      K: { color: paleta.K, factorLentes: 0.4 },
      H: { color: paleta.H, factorLentes: 1 },
      V: { color: paleta.V, factorLentes: 0.85 },
      B: { color: paleta.B, factorLentes: 0.7 },
      C: { color: paleta.C, factorLentes: 0.85 },
      A: { color: paleta.A, factorLentes: 0.95 },
      P: { color: paleta.P, factorLentes: 0.3 },
      M: { color: renderer.paleta.secundario, factorLentes: 0.8 },
    },
  };
}

/** Ancho y alto en píxeles de pantalla de un mapa a cierta escala. */
export function medida(mapa: MapaDePixeles, escala: number): { ancho: number; alto: number } {
  return {
    ancho: Math.max(...mapa.map((fila) => fila.length)) * escala,
    alto: mapa.length * escala,
  };
}

/** Escala entera que hace que un mapa quepa en un ancho dado. */
export function escalaPara(mapa: MapaDePixeles, anchoDisponible: number): number {
  const columnas = Math.max(...mapa.map((fila) => fila.length));
  return Math.max(1, Math.floor(anchoDisponible / columnas));
}
