/**
 * Lecturas para el panel de adultos. Todas son estimaciones del juego, no
 * mediciones clínicas, y así se presentan en pantalla.
 */
import { config, type IdJuego, type Modo } from '../config';
import { mmAArcmin, pxAMm } from '../engine/color';
import { diasEntre, rangoDeDias, sumarDias } from '../engine/fechas';
import { mediana } from '../engine/Staircase';
import type { Estado } from './esquema';

export interface PuntoDeSerie {
  dia: string;
  valor: number;
}

/** Umbral de un parámetro a lo largo de los días, en el orden de las fechas. */
export function serieDeUmbral(
  estado: Estado,
  juego: IdJuego,
  modo: Modo,
  parametro: string,
): PuntoDeSerie[] {
  const porDia = new Map<string, number[]>();
  for (const sesion of estado.sesiones) {
    if (sesion.modo !== modo) continue;
    const umbral = sesion.porJuego[juego]?.umbrales[parametro];
    if (umbral === undefined || !(umbral > 0)) continue;
    porDia.set(sesion.fecha, [...(porDia.get(sesion.fecha) ?? []), umbral]);
  }
  return [...porDia.entries()]
    .map(([dia, valores]) => ({ dia, valor: mediana(valores) }))
    .sort((a, b) => a.dia.localeCompare(b.dia));
}

/** Parámetros con datos para ese juego y modo. */
export function parametrosConDatos(estado: Estado, juego: IdJuego, modo: Modo): string[] {
  const vistos = new Set<string>();
  for (const sesion of estado.sesiones) {
    if (sesion.modo !== modo) continue;
    for (const parametro of Object.keys(sesion.porJuego[juego]?.umbrales ?? {})) {
      vistos.add(parametro);
    }
  }
  return [...vistos].sort();
}

/** Precisión por día de un juego y modo, en tanto por uno. */
export function serieDePrecision(estado: Estado, juego: IdJuego, modo: Modo): PuntoDeSerie[] {
  const porDia = new Map<string, { ensayos: number; aciertos: number }>();
  for (const sesion of estado.sesiones) {
    if (sesion.modo !== modo) continue;
    const resumen = sesion.porJuego[juego];
    if (!resumen || resumen.ensayos === 0) continue;
    const acumulado = porDia.get(sesion.fecha) ?? { ensayos: 0, aciertos: 0 };
    acumulado.ensayos += resumen.ensayos;
    acumulado.aciertos += resumen.aciertos;
    porDia.set(sesion.fecha, acumulado);
  }
  return [...porDia.entries()]
    .map(([dia, { ensayos, aciertos }]) => ({ dia, valor: aciertos / ensayos }))
    .sort((a, b) => a.dia.localeCompare(b.dia));
}

/** Tiempo de reacción medio por día, en milisegundos. */
export function serieDeTiempoDeReaccion(
  estado: Estado,
  juego: IdJuego,
  modo: Modo,
): PuntoDeSerie[] {
  const porDia = new Map<string, number[]>();
  for (const sesion of estado.sesiones) {
    if (sesion.modo !== modo) continue;
    const ms = sesion.porJuego[juego]?.tiempoReaccionMedioMs;
    if (ms === undefined || ms <= 0) continue;
    porDia.set(sesion.fecha, [...(porDia.get(sesion.fecha) ?? []), ms]);
  }
  return [...porDia.entries()]
    .map(([dia, valores]) => ({ dia, valor: valores.reduce((a, b) => a + b, 0) / valores.length }))
    .sort((a, b) => a.dia.localeCompare(b.dia));
}

/**
 * Mediana móvil centrada en una ventana de días. Suaviza el ruido diario sin
 * dejar que un día malo arrastre la línea, como haría una media.
 */
export function medianaMovil(serie: PuntoDeSerie[], ventanaDias = 7): PuntoDeSerie[] {
  const mitad = Math.floor(ventanaDias / 2);
  return serie.map((punto) => {
    const dentro = serie.filter(
      (otro) => Math.abs(diasEntre(punto.dia, otro.dia)) <= mitad,
    );
    return { dia: punto.dia, valor: mediana(dentro.map((p) => p.valor)) };
  });
}

/**
 * Mejora frente a la primera semana con datos:
 * (mediana de la primera semana − mediana de los últimos 7 días) / mediana de
 * la primera semana. Positiva significa umbral más bajo, es decir, mejor.
 */
export function mejoraVsPrimeraSemana(serie: PuntoDeSerie[]): number | null {
  if (serie.length === 0) return null;
  const primerDia = serie[0].dia;
  const finPrimeraSemana = sumarDias(primerDia, 6);
  const primera = serie.filter((p) => p.dia <= finPrimeraSemana).map((p) => p.valor);

  const ultimoDia = serie[serie.length - 1].dia;
  const inicioUltimos = sumarDias(ultimoDia, -6);
  const ultimos = serie.filter((p) => p.dia >= inicioUltimos).map((p) => p.valor);

  if (primera.length === 0 || ultimos.length === 0) return null;
  const base = mediana(primera);
  if (base <= 0) return null;
  // La primera semana y la última son la misma: todavía no hay comparación.
  if (finPrimeraSemana >= ultimoDia) return null;
  return (base - mediana(ultimos)) / base;
}

export interface DiaDelCalendario {
  dia: string;
  minutosParche: number;
  minutosLentes: number;
  total: number;
  metaCumplida: boolean;
}

/** Calendario de minutos por día para el mapa de calor. */
export function calendario(estado: Estado, desde: string, hasta: string): DiaDelCalendario[] {
  return rangoDeDias(desde, hasta).map((dia) => {
    const minutosParche = minutosDe(estado, dia, 'parche');
    const minutosLentes = minutosDe(estado, dia, 'lentes');
    const total = minutosParche + minutosLentes;
    return {
      dia,
      minutosParche,
      minutosLentes,
      total,
      metaCumplida: total >= estado.ajustes.metaDiariaMin,
    };
  });
}

function minutosDe(estado: Estado, dia: string, modo: Modo): number {
  return estado.sesiones
    .filter((s) => s.fecha === dia && s.modo === modo)
    .reduce((total, s) => total + s.minutosActivos, 0);
}

/** Minutos de un rango, separados por modo. */
export function minutosDelRango(estado: Estado, desde: string, hasta: string) {
  let parche = 0;
  let lentes = 0;
  for (const sesion of estado.sesiones) {
    if (sesion.fecha < desde || sesion.fecha > hasta) continue;
    if (sesion.modo === 'parche') parche += sesion.minutosActivos;
    else lentes += sesion.minutosActivos;
  }
  return { parche, lentes, total: parche + lentes };
}

/** Contraste del ojo dominante vigente en una fecha. */
export function balanceEnFecha(estado: Estado, dia: string): number {
  let valor = config.balance.contrasteInicialOjoDominante;
  for (const entrada of [...estado.balance.historial].sort((a, b) => a.fecha.localeCompare(b.fecha))) {
    if (entrada.fecha <= dia) valor = entrada.valor;
  }
  return valor;
}

/** Serie del contraste del ojo dominante, un punto por cambio. */
export function serieDeBalance(estado: Estado): PuntoDeSerie[] {
  return [...estado.balance.historial]
    .sort((a, b) => a.fecha.localeCompare(b.fecha))
    .map((e) => ({ dia: e.fecha, valor: e.valor }));
}

/** Eventos de molestia de un día. */
export function eventosDelDia(estado: Estado, dia: string): number {
  return estado.eventos.filter((e) => e.fecha === dia).length;
}

/** Convierte un umbral en píxeles a milímetros y minutos de arco. */
export function medidasDeUmbral(estado: Estado, px: number) {
  const pxPorMm = estado.calibracion.pxPorMm ?? config.calibracionPantalla.pxPorMmPorDefecto;
  const mm = pxAMm(px, pxPorMm);
  return {
    mm,
    arcmin: mmAArcmin(mm, estado.ajustes.distanciaCm * 10),
    calibrado: estado.calibracion.pxPorMm !== null,
  };
}

/** Los parámetros de tamaño se pueden convertir a milímetros; el contraste no. */
export function esParametroDeTamano(parametro: string): boolean {
  const base = parametro.split(':')[0];
  return ['tamano', 'diametro', 'abertura', 'aberturaVista'].includes(base);
}
