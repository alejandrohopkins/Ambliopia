/**
 * Compone el avatar por capas: accesorio (detrás), traje, casco y visor.
 * Devuelve un mapa de caracteres listo para dibujar, y la paleta de colores
 * que le corresponde según lo equipado.
 */
import { articulo } from '../rewards/catalogo';
import { ACCESORIOS, ALTO, ANCHO, CASCOS, CUERPO } from './piezas';
import { PALETA_POR_DEFECTO, type MapaDePixeles, type PaletaDeSprite } from './sprites';

export interface Equipo {
  cascos?: string;
  trajes?: string;
  visores?: string;
  accesorios?: string;
}

/** Superpone un mapa sobre otro; '.' deja ver lo de abajo. */
function superponer(base: MapaDePixeles, encima: MapaDePixeles): MapaDePixeles {
  return base.map((fila, y) => {
    const capa = encima[y];
    if (!capa) return fila;
    return [...fila]
      .map((caracter, x) => (capa[x] && capa[x] !== '.' ? capa[x] : caracter))
      .join('');
  });
}

function vacio(): MapaDePixeles {
  return Array.from({ length: ALTO }, () => '.'.repeat(ANCHO));
}

export function componerAvatar(equipo: Equipo): MapaDePixeles {
  let mapa = vacio();

  // El accesorio va detrás del cuerpo: mochila, capa o alas asoman por los lados.
  const accesorio = equipo.accesorios ? ACCESORIOS[equipo.accesorios] : undefined;
  if (accesorio) mapa = superponer(mapa, accesorio);

  mapa = superponer(mapa, CUERPO);

  const casco = CASCOS[equipo.cascos ?? 'casco-clasico'] ?? CASCOS['casco-clasico'];
  mapa = superponer(mapa, casco);

  return mapa;
}

/** Paleta del avatar según el traje y el visor equipados. */
export function paletaDeAvatar(equipo: Equipo): PaletaDeSprite {
  const traje = equipo.trajes ? articulo(equipo.trajes) : undefined;
  const visor = equipo.visores ? articulo(equipo.visores) : undefined;
  return {
    ...PALETA_POR_DEFECTO,
    B: traje?.color ?? PALETA_POR_DEFECTO.B,
    V: visor?.color ?? PALETA_POR_DEFECTO.V,
  };
}

/** Paleta con el color del accesorio, que comparte carácter en todos los sprites. */
export function paletaCompleta(equipo: Equipo): Record<string, string> {
  return { ...paletaDeAvatar(equipo), A: '#FFC23D' };
}

/** La misma pixelnauta respirando: un píxel arriba y abajo. */
export function respirar(mapa: MapaDePixeles, arriba: boolean): MapaDePixeles {
  if (!arriba) return mapa;
  return [...mapa.slice(1), '.'.repeat(mapa[0].length)];
}

/** Parpadeo: el visor se cierra un instante. */
export function parpadear(mapa: MapaDePixeles): MapaDePixeles {
  return mapa.map((fila) => fila.replace(/V/g, 'H'));
}
