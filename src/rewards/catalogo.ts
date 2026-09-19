/**
 * Catálogo de artículos. Los nombres visibles viven en i18n/es.ts;
 * aquí solo están el identificador, la categoría, la rareza y el precio.
 */
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
  /** Color del traje o del visor, solo para el modo parche y la base. */
  color?: string;
}

/** Artículos gratis con los que arranca cualquier partida nueva. */
export const ARTICULOS_GRATIS: Articulo[] = [
  { id: 'casco-clasico', categoria: 'cascos', rareza: 'gratis' },
  { id: 'casco-antena', categoria: 'cascos', rareza: 'gratis' },
  { id: 'traje-cristal', categoria: 'trajes', rareza: 'gratis', color: '#3FD6C6' },
  { id: 'traje-ambar', categoria: 'trajes', rareza: 'gratis', color: '#FFC23D' },
  { id: 'nave-exploradora', categoria: 'naves', rareza: 'gratis' },
  { id: 'estela-chispas', categoria: 'estelas', rareza: 'gratis' },
  { id: 'pico-basico', categoria: 'picos', rareza: 'gratis' },
  { id: 'fondo-base-lunar', categoria: 'fondos', rareza: 'gratis' },
];

export function articuloGratis(id: string): Articulo | undefined {
  return ARTICULOS_GRATIS.find((a) => a.id === id);
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
