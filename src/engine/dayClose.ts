/**
 * Cierre del día. Se ejecuta al abrir la app en un día nuevo (fecha local del
 * dispositivo) y procesa uno por uno los días pendientes desde el último cierre:
 * racha y protectores, regla de balance del modo lentes, cofre semanal y misión
 * del día.
 */
import { config } from '../config';
import { diaISO, rangoDeDias, sumarDias } from './fechas';
import { cerrarRacha, registrarMetaCumplida, reponerProtectores } from './racha';
import { calcularBalance, minutosEnModo, umbralesPorDia } from './balance';
import type { Estado } from '../storage/esquema';
import { minutosDelDia } from '../storage/selectores';

export interface ResumenDeCierre {
  /** Días efectivamente procesados. */
  dias: string[];
  /** Días en que se cumplió la meta. */
  diasCumplidos: string[];
  cambiosDeBalance: Array<{ dia: string; de: number; a: number; motivo: string; r?: number }>;
  cristalesGanados: number;
}

export interface OpcionesDeCierre {
  hoy?: string;
  /** Gancho para las recompensas del día (meta, racha, misión y cofre). */
  alCerrarDia?: (estado: Estado, dia: string) => Estado;
}

/**
 * Cuántos días atrás como máximo se procesan de una vez, para que volver tras
 * unas vacaciones no recorra meses enteros.
 */
const MAXIMO_DIAS_ATRASADOS = 60;

export function cerrarDias(
  estado: Estado,
  opciones: OpcionesDeCierre = {},
): { estado: Estado; resumen: ResumenDeCierre } {
  const hoy = opciones.hoy ?? diaISO();
  const resumen: ResumenDeCierre = {
    dias: [],
    diasCumplidos: [],
    cambiosDeBalance: [],
    cristalesGanados: 0,
  };

  // Primera vez: no hay nada que cerrar, solo dejar constancia.
  if (estado.ultimoCierre === null) {
    return { estado: { ...estado, ultimoCierre: hoy, racha: reponerProtectores(estado.racha, hoy) }, resumen };
  }
  if (estado.ultimoCierre >= hoy) return { estado, resumen };

  const desde = ultimoDiaProcesable(estado.ultimoCierre, hoy);
  const pendientes = rangoDeDias(desde, sumarDias(hoy, -1));

  let actual = estado;
  const historial = umbralesPorDia(estado.sesiones);

  for (const dia of pendientes) {
    actual = cerrarUnDia(actual, dia, historial, resumen);
    if (opciones.alCerrarDia) actual = opciones.alCerrarDia(actual, dia);
    resumen.dias.push(dia);
  }

  actual = {
    ...actual,
    racha: cerrarRacha(reponerProtectores(actual.racha, hoy), hoy),
    ultimoCierre: hoy,
  };

  return { estado: actual, resumen };
}

/**
 * Se procesa desde el propio día del último cierre: ese día todavía no había
 * terminado cuando se selló, así que su cierre sigue pendiente.
 */
function ultimoDiaProcesable(ultimoCierre: string, hoy: string): string {
  const limite = sumarDias(hoy, -MAXIMO_DIAS_ATRASADOS);
  return ultimoCierre < limite ? limite : ultimoCierre;
}

function cerrarUnDia(
  estado: Estado,
  dia: string,
  historial: ReturnType<typeof umbralesPorDia>,
  resumen: ResumenDeCierre,
): Estado {
  let actual = estado;

  // 1. Racha y cristales, si ese día se cumplió la meta.
  if (minutosDelDia(actual, dia) >= actual.ajustes.metaDiariaMin) {
    const { racha } = registrarMetaCumplida(actual.racha, dia);
    actual = {
      ...actual,
      racha,
      economia: {
        ...actual.economia,
        cristales: actual.economia.cristales + config.economia.cristalesPorDiaConMeta,
      },
    };
    resumen.diasCumplidos.push(dia);
    resumen.cristalesGanados += config.economia.cristalesPorDiaConMeta;
  }

  // 2. Regla de balance del modo lentes.
  const resultado = calcularBalance({
    balanceActual: actual.balance.contrasteOjoDominante,
    automatico: actual.balance.automatico,
    dia,
    minutosEnLentes: minutosEnModo(actual, dia, 'lentes'),
    historial,
  });

  if (resultado.motivo !== 'manual' && resultado.valor !== actual.balance.contrasteOjoDominante) {
    resumen.cambiosDeBalance.push({
      dia,
      de: actual.balance.contrasteOjoDominante,
      a: resultado.valor,
      motivo: resultado.motivo,
      ...(resultado.r === undefined ? {} : { r: resultado.r }),
    });
    actual = {
      ...actual,
      balance: {
        ...actual.balance,
        contrasteOjoDominante: resultado.valor,
        historial: [
          ...actual.balance.historial,
          { fecha: dia, valor: resultado.valor, motivo: resultado.motivo },
        ],
      },
    };
  }

  return actual;
}

/** ¿Hay un día nuevo que cerrar? */
export function hayCierrePendiente(estado: Estado, hoy = diaISO()): boolean {
  return estado.ultimoCierre !== null && estado.ultimoCierre < hoy;
}
