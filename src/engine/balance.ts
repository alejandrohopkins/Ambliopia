/**
 * Regla diaria del balance dicóptico (modo lentes).
 *
 * Por qué el umbral y no la precisión: la escalera mantiene la precisión cerca
 * del 71 % siempre, así que la precisión no revela si el ojo ambliope está
 * siendo suprimido. Si al subir el contraste del ojo dominante el umbral del
 * ambliope empeora mucho, es señal de supresión y hay que retroceder.
 */
import { config, type IdJuego } from '../config';
import { mediaGeometrica, mediana } from './Staircase';
import type { Estado, MotivoDeBalance, Sesion } from '../storage/esquema';

/** Umbrales de un día: juego → parámetro → umbral. */
export type UmbralesDelDia = Partial<Record<IdJuego, Record<string, number>>>;

export interface EntradaDeHistorial {
  dia: string;
  umbrales: UmbralesDelDia;
}

export interface ResultadoDeBalance {
  valor: number;
  motivo: MotivoDeBalance;
  /** Razón de empeoramiento del umbral. Ausente si no se pudo calcular. */
  r?: number;
}

/**
 * Agrupa los umbrales de las sesiones en modo lentes por día y juego.
 * Varias sesiones del mismo día se combinan con media geométrica.
 */
export function umbralesPorDia(sesiones: Sesion[]): EntradaDeHistorial[] {
  const porDia = new Map<string, Map<IdJuego, Map<string, number[]>>>();

  for (const sesion of sesiones) {
    if (sesion.modo !== 'lentes') continue;
    const juegos = porDia.get(sesion.fecha) ?? new Map<IdJuego, Map<string, number[]>>();
    porDia.set(sesion.fecha, juegos);

    for (const [juego, resumen] of Object.entries(sesion.porJuego)) {
      if (!resumen) continue;
      const parametros = juegos.get(juego as IdJuego) ?? new Map<string, number[]>();
      juegos.set(juego as IdJuego, parametros);
      for (const [parametro, umbral] of Object.entries(resumen.umbrales)) {
        if (!(umbral > 0)) continue;
        parametros.set(parametro, [...(parametros.get(parametro) ?? []), umbral]);
      }
    }
  }

  return [...porDia.entries()]
    .map(([dia, juegos]) => {
      const umbrales: UmbralesDelDia = {};
      for (const [juego, parametros] of juegos) {
        const combinados: Record<string, number> = {};
        for (const [parametro, valores] of parametros) {
          combinados[parametro] = mediaGeometrica(valores);
        }
        if (Object.keys(combinados).length > 0) umbrales[juego] = combinados;
      }
      return { dia, umbrales };
    })
    .filter((entrada) => Object.keys(entrada.umbrales).length > 0)
    .sort((a, b) => a.dia.localeCompare(b.dia));
}

export interface EntradaDeCalculo {
  balanceActual: number;
  automatico: boolean;
  dia: string;
  /** Minutos activos en modo lentes ese día. */
  minutosEnLentes: number;
  historial: EntradaDeHistorial[];
}

/**
 * r = media geométrica, entre los juegos con escalera jugados en lentes, de
 * (umbral de hoy / mediana de los umbrales de los días previos con datos).
 * Más de 1 significa que hoy hizo falta un estímulo más grande: peor.
 */
export function calcularBalance(entrada: EntradaDeCalculo): ResultadoDeBalance {
  const { balanceActual, automatico, dia, minutosEnLentes, historial } = entrada;
  const quieto: ResultadoDeBalance = { valor: balanceActual, motivo: 'mantiene' };

  if (!automatico) return { valor: balanceActual, motivo: 'manual' };
  if (minutosEnLentes < config.balance.minutosMinimosEnLentes) return quieto;

  const hoy = historial.find((e) => e.dia === dia);
  if (!hoy) return quieto;

  const previos = historial.filter((e) => e.dia < dia);
  const razonesPorJuego: number[] = [];
  let huboReferencia = false;

  for (const [juego, parametros] of Object.entries(hoy.umbrales)) {
    if (!parametros) continue;
    const razonesDelJuego: number[] = [];

    for (const [parametro, umbralDeHoy] of Object.entries(parametros)) {
      const referencia = medianaDeReferencia(previos, juego as IdJuego, parametro);
      if (referencia === null || umbralDeHoy <= 0) continue;
      huboReferencia = true;
      razonesDelJuego.push(umbralDeHoy / referencia);
    }

    if (razonesDelJuego.length > 0) razonesPorJuego.push(mediaGeometrica(razonesDelJuego));
  }

  // Sin historial previo: subir, ya que se cumplieron los minutos.
  if (!huboReferencia || razonesPorJuego.length === 0) {
    return { valor: subir(balanceActual), motivo: 'subida' };
  }

  const r = mediaGeometrica(razonesPorJuego);
  if (r <= config.balance.umbralSubida) return { valor: subir(balanceActual), motivo: 'subida', r };
  if (r > config.balance.umbralBajada) return { valor: bajar(balanceActual), motivo: 'bajada', r };
  return { ...quieto, r };
}

/** Mediana de los umbrales de los últimos días con datos para ese parámetro. */
function medianaDeReferencia(
  previos: EntradaDeHistorial[],
  juego: IdJuego,
  parametro: string,
): number | null {
  const valores: number[] = [];
  for (let i = previos.length - 1; i >= 0; i -= 1) {
    const umbral = previos[i].umbrales[juego]?.[parametro];
    if (umbral !== undefined && umbral > 0) valores.push(umbral);
    if (valores.length === config.balance.diasDeReferencia) break;
  }
  return valores.length > 0 ? mediana(valores) : null;
}

function subir(valor: number): number {
  return redondear(Math.min(config.balance.maximo, valor + config.balance.pasoSubida));
}

function bajar(valor: number): number {
  return redondear(Math.max(config.balance.minimo, valor - config.balance.pasoBajada));
}

/** Dos decimales: el balance se mueve en pasos de 0.05 y 0.1. */
function redondear(valor: number): number {
  return Math.round(valor * 100) / 100;
}

/** Minutos activos de un día en un modo concreto. */
export function minutosEnModo(estado: Estado, dia: string, modo: Sesion['modo']): number {
  return estado.sesiones
    .filter((s) => s.fecha === dia && s.modo === modo)
    .reduce((total, s) => total + s.minutosActivos, 0);
}
