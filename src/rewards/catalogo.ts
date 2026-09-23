/**
 * Catálogo de artículos. Los nombres visibles viven en i18n/es.ts; aquí solo
 * el identificador, la categoría, la rareza y el precio.
 *
 * Precios calibrados para que con la meta diaria de minutos se pueda comprar
 * aproximadamente un artículo común al día y uno legendario cada una o dos
 * semanas (ver tests/recompensas.test.ts). Como cumplir la meta da un cristal
 * al día, ningún legendario pasa de 14: dos semanas constantes siempre bastan.
 */
import { config } from '../config';

export type Categoria =
  | 'cascos'
  | 'trajes'
  | 'visores'
  | 'accesorios'
  | 'mascotas'
  | 'naves'
  | 'estelas'
  | 'picos'
  | 'fondos';

export type Rareza = 'gratis' | 'comun' | 'raro' | 'legendario';

export interface Articulo {
  id: string;
  categoria: Categoria;
  rareza: Rareza;
  precioMonedas?: number;
  precioCristales?: number;
  /** Color del traje, del visor o de la estela. Solo para parche y la base. */
  color?: string;
  /** Segundo tono: el traje sale a rayas. Es lo que distingue a los especiales. */
  color2?: string;
}

export const CATEGORIAS: Categoria[] = [
  'cascos',
  'trajes',
  'visores',
  'accesorios',
  'mascotas',
  'naves',
  'estelas',
  'picos',
  'fondos',
];

const { comunMin, comunMax, raroMin, raroMax, legendarioCristalesMin, legendarioCristalesMax } =
  config.economia.precios;

function comun(id: string, categoria: Categoria, precio: number, color?: string): Articulo {
  return { id, categoria, rareza: 'comun', precioMonedas: precio, ...(color ? { color } : {}) };
}
function raro(id: string, categoria: Categoria, precio: number, color?: string): Articulo {
  return { id, categoria, rareza: 'raro', precioMonedas: precio, ...(color ? { color } : {}) };
}
function legendario(
  id: string,
  categoria: Categoria,
  cristales: number,
  color?: string,
  color2?: string,
): Articulo {
  return {
    id,
    categoria,
    rareza: 'legendario',
    precioCristales: cristales,
    ...(color ? { color } : {}),
    ...(color2 ? { color2 } : {}),
  };
}
/** Traje o visor de dos tonos: sale a rayas. */
function dosTonos(base: Articulo, color: string, color2: string): Articulo {
  return { ...base, color, color2 };
}
function gratis(id: string, categoria: Categoria, color?: string): Articulo {
  return { id, categoria, rareza: 'gratis', ...(color ? { color } : {}) };
}

export const CATALOGO: Articulo[] = [
  // Cascos
  gratis('casco-clasico', 'cascos'),
  gratis('casco-antena', 'cascos'),
  comun('casco-gato', 'cascos', 200),
  raro('casco-dragon', 'cascos', 550),
  raro('casco-burbuja', 'cascos', 480),
  comun('casco-visera', 'cascos', 210),
  comun('casco-aletas', 'cascos', 230),
  raro('casco-estrella', 'cascos', 520),
  legendario('casco-corona', 'cascos', 12),

  // Trajes: ocho colores sólidos, dos gratis.
  gratis('traje-cristal', 'trajes', '#3FD6C6'),
  gratis('traje-ambar', 'trajes', '#FFC23D'),
  comun('traje-musgo', 'trajes', 150, '#7BD65A'),
  comun('traje-nebulosa', 'trajes', 150, '#5B3FA0'),
  comun('traje-coral', 'trajes', 170, '#FF7A6B'),
  comun('traje-cielo', 'trajes', 170, '#6FB3FF'),
  comun('traje-lila', 'trajes', 190, '#C49BFF'),
  comun('traje-lunar', 'trajes', 190, '#EDE9FF'),
  comun('traje-menta', 'trajes', 160, '#7FE8C4'),
  comun('traje-fresa', 'trajes', 200, '#FF7AA8'),
  comun('traje-cobre', 'trajes', 220, '#D98A4F'),
  dosTonos(raro('traje-galaxia', 'trajes', 600), '#3B2A7A', '#8F6FE8'),
  dosTonos(raro('traje-lava', 'trajes', 620), '#C43A16', '#FFA23C'),
  dosTonos(legendario('traje-arcoiris', 'trajes', 14), '#FF5FA2', '#6FB3FF'),

  // Visores
  comun('visor-cristal', 'visores', 160, '#3FD6C6'),
  comun('visor-ambar', 'visores', 160, '#FFC23D'),
  comun('visor-musgo', 'visores', 160, '#7BD65A'),
  comun('visor-coral', 'visores', 180, '#FF7A6B'),
  comun('visor-cielo', 'visores', 180, '#6FB3FF'),
  comun('visor-lila', 'visores', 190, '#C49BFF'),
  comun('visor-lunar', 'visores', 200, '#EDE9FF'),
  raro('visor-espejo', 'visores', 520, '#C9F2FF'),

  // Accesorios
  comun('accesorio-mochila', 'accesorios', 220),
  comun('accesorio-bufanda', 'accesorios', 180),
  comun('accesorio-antenas', 'accesorios', 190),
  comun('accesorio-bufanda-larga', 'accesorios', 240),
  raro('accesorio-capa', 'accesorios', 560),
  raro('accesorio-jetpack', 'accesorios', 580),
  legendario('accesorio-alas', 'accesorios', 14),

  // Mascotas
  comun('mascota-gato', 'mascotas', 240),
  comun('mascota-zorro', 'mascotas', 240),
  raro('mascota-robotito', 'mascotas', 500),
  raro('mascota-pulpo', 'mascotas', 640),
  raro('mascota-ajolote', 'mascotas', 680),
  comun('mascota-buho', 'mascotas', 230),
  comun('mascota-tortuga', 'mascotas', 220),
  comun('mascota-conejo', 'mascotas', 240),
  raro('mascota-medusa', 'mascotas', 520),
  legendario('mascota-dragon', 'mascotas', 14),
  legendario('mascota-fenix', 'mascotas', 13),

  // Naves
  gratis('nave-exploradora', 'naves'),
  comun('nave-cometa', 'naves', 250),
  comun('nave-flecha', 'naves', 230),
  raro('nave-ballena', 'naves', 700),
  raro('nave-orca', 'naves', 660),
  legendario('nave-castillo', 'naves', 14),

  // Estelas
  gratis('estela-chispas', 'estelas'),
  comun('estela-burbujas', 'estelas', 150),
  comun('estela-corazones', 'estelas', 150),
  comun('estela-anillos', 'estelas', 170),
  raro('estela-estrellas', 'estelas', 400),
  raro('estela-rayos', 'estelas', 420),
  legendario('estela-arcoiris', 'estelas', 10),

  // Picos
  gratis('pico-basico', 'picos'),
  comun('pico-dorado', 'picos', 210),
  comun('pico-cristal', 'picos', 240),
  raro('pico-hielo', 'picos', 430),
  raro('pico-doble', 'picos', 470),
  legendario('pico-laser', 'picos', 8),

  // Fondos de la base
  gratis('fondo-base-lunar', 'fondos'),
  comun('fondo-jardin', 'fondos', 230),
  comun('fondo-taller', 'fondos', 200),
  raro('fondo-nebulosa', 'fondos', 470),
  raro('fondo-hielo', 'fondos', 440),
];

export const ARTICULOS_GRATIS: Articulo[] = CATALOGO.filter((a) => a.rareza === 'gratis');

export function articulo(id: string): Articulo | undefined {
  return CATALOGO.find((a) => a.id === id);
}

export function articulosDe(categoria: Categoria): Articulo[] {
  return CATALOGO.filter((a) => a.categoria === categoria);
}

/** Rangos de precio por rareza, tal como los fija la especificación. */
export function rangoDePrecio(rareza: Rareza): { min: number; max: number } | null {
  if (rareza === 'comun') return { min: comunMin, max: comunMax };
  if (rareza === 'raro') return { min: raroMin, max: raroMax };
  if (rareza === 'legendario') return { min: legendarioCristalesMin, max: legendarioCristalesMax };
  return null;
}

/** Equipo inicial: lo primero de cada categoría gratis. */
export function equipoInicial(casco: string, traje: string): Record<string, string> {
  return {
    cascos: casco,
    trajes: traje,
    naves: 'nave-exploradora',
    estelas: 'estela-chispas',
    picos: 'pico-basico',
    fondos: 'fondo-base-lunar',
  };
}
