/**
 * Tienda. Regla crítica: nunca se pierden monedas ni progreso por fallar.
 * Comprar sí gasta, pero solo cuando la jugadora lo pide y le alcanza.
 */
import type { Economia } from '../storage/esquema';
import { CATALOGO, articulo, type Articulo, type Rareza } from './catalogo';

export type MotivoDeRechazo = 'noExiste' | 'yaLoTiene' | 'sinMonedas' | 'sinCristales';

export interface ResultadoDeCompra {
  ok: boolean;
  economia: Economia;
  motivo?: MotivoDeRechazo;
}

export function precioDe(art: Articulo): { monedas: number; cristales: number } {
  return { monedas: art.precioMonedas ?? 0, cristales: art.precioCristales ?? 0 };
}

export function puedePagar(economia: Economia, art: Articulo): boolean {
  const precio = precioDe(art);
  return economia.monedas >= precio.monedas && economia.cristales >= precio.cristales;
}

export function loTiene(economia: Economia, id: string): boolean {
  return economia.inventario.includes(id);
}

export function comprar(economia: Economia, id: string): ResultadoDeCompra {
  const art = articulo(id);
  if (!art) return { ok: false, economia, motivo: 'noExiste' };
  if (loTiene(economia, id)) return { ok: false, economia, motivo: 'yaLoTiene' };

  const precio = precioDe(art);
  if (economia.monedas < precio.monedas) return { ok: false, economia, motivo: 'sinMonedas' };
  if (economia.cristales < precio.cristales) {
    return { ok: false, economia, motivo: 'sinCristales' };
  }

  return {
    ok: true,
    economia: {
      ...economia,
      monedas: economia.monedas - precio.monedas,
      cristales: economia.cristales - precio.cristales,
      inventario: [...economia.inventario, id],
      // Lo recién comprado se equipa solo: es lo que la jugadora espera.
      equipado: { ...economia.equipado, [art.categoria]: id },
    },
  };
}

export function equipar(economia: Economia, id: string): Economia {
  const art = articulo(id);
  if (!art || !loTiene(economia, id)) return economia;
  return { ...economia, equipado: { ...economia.equipado, [art.categoria]: id } };
}

/** Regalar un artículo (cofre semanal): entra al inventario sin cobrar nada. */
export function regalar(economia: Economia, id: string): Economia {
  if (!articulo(id) || loTiene(economia, id)) return economia;
  return { ...economia, inventario: [...economia.inventario, id] };
}

/** Artículos de esas rarezas que todavía no tiene, en el orden del catálogo. */
export function faltantesPorRareza(economia: Economia, rarezas: Rareza[]): string[] {
  const buscadas = new Set(rarezas);
  return CATALOGO.filter((a) => buscadas.has(a.rareza) && !loTiene(economia, a.id)).map(
    (a) => a.id,
  );
}
