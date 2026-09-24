/**
 * Lo que se cobra al cerrar un día: meta diaria, bono de racha, misión del día
 * y cofre semanal. Todo junto y puro, para poder probarlo de una pieza.
 */
import { config } from '../config';
import { diasConMetaCumplida, minutosDelDia } from '../storage/selectores';
import { rachaVigente } from '../engine/racha';
import type { Estado } from '../storage/esquema';
import { bonoDeRacha } from './economia';
import { TIPOS, cobrar, misionDelDia } from './mision';
import { abrirCofre, claveDeCofre, cofreGanado, type PremioDeCofre } from './cofre';
import { insigniasNuevas } from './insignias';

export interface PremiosDelDia {
  monedasPorMeta: number;
  monedasPorRacha: number;
  monedasPorMision: number;
  cofre: PremioDeCofre | null;
  insignias: string[];
}

/**
 * Aplica al estado los premios del día indicado.
 * Solo paga una vez: la meta y la misión se marcan como cobradas.
 */
export function cobrarDia(estado: Estado, dia: string): { estado: Estado; premios: PremiosDelDia } {
  const premios: PremiosDelDia = {
    monedasPorMeta: 0,
    monedasPorRacha: 0,
    monedasPorMision: 0,
    cofre: null,
    insignias: [],
  };
  let actual = estado;

  const cumplio = minutosDelDia(actual, dia) >= actual.ajustes.metaDiariaMin;

  // 1. Meta diaria y bono de racha.
  if (cumplio) {
    premios.monedasPorMeta = config.economia.monedasMetaDiaria;
    premios.monedasPorRacha = bonoDeRacha(rachaVigente(actual.racha, dia));
  }

  // 2. Misión del día: se cobra si quedó completada.
  const mision = actual.misiones[dia];
  if (mision) {
    const { mision: cobrada, monedas } = cobrar(mision);
    premios.monedasPorMision = monedas;
    if (monedas > 0) {
      actual = { ...actual, misiones: { ...actual.misiones, [dia]: cobrada } };
    }
  }

  // 3. Cofre semanal, una vez por semana.
  const clave = claveDeCofre(dia);
  if (!actual.cofres[clave]?.abierto && cofreGanado(diasConMetaCumplida(actual), dia)) {
    const { economia, premio } = abrirCofre(actual.economia, dia);
    actual = { ...actual, economia, cofres: { ...actual.cofres, [clave]: { abierto: true } } };
    premios.cofre = premio;
  }

  const monedas =
    premios.monedasPorMeta + premios.monedasPorRacha + premios.monedasPorMision;
  if (monedas > 0) {
    actual = { ...actual, economia: { ...actual.economia, monedas: actual.economia.monedas + monedas } };
  }

  // 4. Misión del día siguiente, lista para cuando abra la app.
  actual = asegurarMision(actual, dia);

  // 5. Insignias, después de todo lo demás.
  actual = otorgarInsignias(actual, dia, premios);

  return { estado: actual, premios };
}

/**
 * Deja creada la misión de un día si todavía no existe. Si la que había es de
 * un tipo que ya no se puede cumplir —de un juego que se quitó—, se cambia.
 */
export function asegurarMision(estado: Estado, dia: string): Estado {
  const guardada = estado.misiones[dia];
  if (guardada && TIPOS.includes(guardada.tipo)) return estado;
  return { ...estado, misiones: { ...estado.misiones, [dia]: misionDelDia(dia) } };
}

export function otorgarInsignias(estado: Estado, dia: string, premios?: PremiosDelDia): Estado {
  const nuevas = insigniasNuevas(estado, dia);
  if (nuevas.length === 0) return estado;
  if (premios) premios.insignias.push(...nuevas.map((n) => n.id));

  const insignias = { ...estado.insignias };
  for (const { id, nivel } of nuevas) insignias[id] = { nivel, fecha: dia };
  return { ...estado, insignias };
}
