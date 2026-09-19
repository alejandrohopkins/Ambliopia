/**
 * Cofre semanal: si cumple la meta cinco días de una semana (lunes a domingo),
 * se abre un cofre con un artículo que no tenga y unas monedas.
 */
import { config } from '../config';
import { crearAleatorio } from '../engine/rng';
import { diasDeLaSemana, semanaISO } from '../engine/fechas';
import type { Economia } from '../storage/esquema';
import { faltantesPorRareza, regalar } from './tienda';

export interface PremioDeCofre {
  articulo: string | null;
  monedas: number;
}

/** ¿Se ganó el cofre de la semana a la que pertenece este día? */
export function cofreGanado(diasCumplidos: string[], dia: string): boolean {
  const deLaSemana = new Set(diasDeLaSemana(dia));
  const cumplidos = new Set(diasCumplidos.filter((d) => deLaSemana.has(d)));
  return cumplidos.size >= config.economia.diasParaCofreSemanal;
}

/**
 * Contenido del cofre: un artículo común o raro que no tenga, y monedas.
 * La elección se siembra con la semana, así que es la misma si se recalcula.
 */
export function abrirCofre(economia: Economia, dia: string): {
  economia: Economia;
  premio: PremioDeCofre;
} {
  const semana = semanaISO(dia);
  const candidatos = faltantesPorRareza(economia, ['comun', 'raro']);
  const elegido = candidatos.length > 0 ? crearAleatorio(`cofre:${semana}`).elegir(candidatos) : null;

  const monedas = config.economia.cofreSemanalMonedas;
  const conArticulo = elegido ? regalar(economia, elegido) : economia;

  return {
    economia: { ...conArticulo, monedas: conArticulo.monedas + monedas },
    premio: { articulo: elegido, monedas },
  };
}

export function claveDeCofre(dia: string): string {
  return semanaISO(dia);
}
