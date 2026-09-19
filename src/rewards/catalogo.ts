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
function legendario(id: string, categoria: Categoria, cristales: number): Articulo {
  return { id, categoria, rareza: 'legendario', precioCristales: cristales };
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
  raro('traje-galaxia', 'trajes', 600),
  raro('traje-lava', 'trajes', 620),
  legendario('traje-arcoiris', 'trajes', 14),

  // Visores
  comun('visor-cristal', 'visores', 160, '#3FD6C6'),
  comun('visor-ambar', 'visores', 160, '#FFC23D'),
  comun('visor-musgo', 'visores', 160, '#7BD65A'),
  comun('visor-coral', 'visores', 180, '#FF7A6B'),
  comun('visor-cielo', 'visores', 180, '#6FB3FF'),
  raro('visor-espejo', 'visores', 520),

  // Accesorios
  comun('accesorio-mochila', 'accesorios', 220),
  comun('accesorio-bufanda', 'accesorios', 180),
  raro('accesorio-capa', 'accesorios', 560),
  legendario('accesorio-alas', 'accesorios', 14),

  // Mascotas
  comun('mascota-gato', 'mascotas', 240),
  comun('mascota-zorro', 'mascotas', 240),
  raro('mascota-robotito', 'mascotas', 500),
  raro('mascota-pulpo', 'mascotas', 640),
  raro('mascota-ajolote', 'mascotas', 680),
  legendario('mascota-dragon', 'mascotas', 14),

  // Naves
  gratis('nave-exploradora', 'naves'),
  comun('nave-cometa', 'naves', 250),
  raro('nave-ballena', 'naves', 700),
  legendario('nave-castillo', 'naves', 14),

  // Estelas
  gratis('estela-chispas', 'estelas'),
  comun('estela-burbujas', 'estelas', 150),
  comun('estela-corazones', 'estelas', 150),
  raro('estela-estrellas', 'estelas', 400),
  legendario('estela-arcoiris', 'estelas', 10),

  // Picos
  gratis('pico-basico', 'picos'),
  comun('pico-dorado', 'picos', 210),
  raro('pico-hielo', 'picos', 430),
  legendario('pico-laser', 'picos', 8),

  // Fondos de la base
  gratis('fondo-base-lunar', 'fondos'),
  comun('fondo-jardin', 'fondos', 230),
  raro('fondo-nebulosa', 'fondos', 470),
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
