/**
 * Misión del día. Se genera con aleatorio sembrado con la fecha, así que no
 * cambia durante el día por mucho que se abra y cierre la app.
 */
import { config } from '../config';
import { crearAleatorio } from '../engine/rng';
import type { Mision, TipoDeMision } from '../storage/esquema';

export const TIPOS: TipoDeMision[] = [
  'minutos',
  'cristales',
  'saboteadores',
  'figuras',
  'estrellasDeEnergia',
  'estrellasDeNivel',
  'juegosDistintos',
];

/** La misión de un día concreto. Siempre la misma para la misma fecha. */
export function misionDelDia(dia: string): Mision {
  const aleatorio = crearAleatorio(`mision:${dia}`);
  const tipo = aleatorio.elegir(TIPOS);
  const [minimo, maximo] = config.misiones.rangos[tipo];
  return {
    tipo,
    objetivo: aleatorio.entero(minimo, maximo),
    progreso: 0,
    completada: false,
    cobrada: false,
  };
}

/** Avance de la misión. Nunca baja: el progreso no se pierde. */
export function avanzar(mision: Mision, tipo: TipoDeMision, cantidad: number): Mision {
  if (mision.tipo !== tipo || cantidad <= 0) return mision;
  const progreso = Math.min(mision.objetivo, mision.progreso + cantidad);
  return { ...mision, progreso, completada: progreso >= mision.objetivo };
}

/** Para los tipos que se miden como un total del día, no como incrementos. */
export function fijarProgreso(mision: Mision, tipo: TipoDeMision, total: number): Mision {
  if (mision.tipo !== tipo) return mision;
  const progreso = Math.min(mision.objetivo, Math.max(mision.progreso, total));
  return { ...mision, progreso, completada: progreso >= mision.objetivo };
}

/** El premio se cobra una sola vez. */
export function cobrar(mision: Mision): { mision: Mision; monedas: number } {
  if (!mision.completada || mision.cobrada) return { mision, monedas: 0 };
  return { mision: { ...mision, cobrada: true }, monedas: config.economia.monedasMisionDelDia };
}
