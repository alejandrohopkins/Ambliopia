/**
 * Exportación a CSV para llevar a consulta.
 *
 * Formato pensado para que abra directo en Excel en español:
 * separador ';', decimales con coma, UTF-8 con BOM y fechas AAAA-MM-DD.
 *
 * Una fila por sesión, juego y parámetro medido. Filtrando por
 * `parametro_umbral` queda exactamente una fila por sesión y juego.
 * Los minutos de cada sesión se reparten entre sus juegos en proporción a los
 * ensayos, de modo que la columna suma los minutos reales del día.
 */
import type { IdJuego } from '../config';
import { JUEGOS, type Estado } from './esquema';
import { balanceEnFecha, esParametroDeTamano, eventosDelDia, medidasDeUmbral } from './analisis';

export const COLUMNAS = [
  'fecha',
  'modo',
  'juego',
  'minutos_activos',
  'ensayos',
  'aciertos',
  'precision_pct',
  'parametro_umbral',
  'umbral_px',
  'umbral_mm',
  'umbral_arcmin',
  'contraste_ojo_dominante',
  'calibrado',
  'eventos_molestia',
] as const;

const SEPARADOR = ';';
const BOM = '﻿';

/** Decimales con coma, como espera Excel en español. */
function numero(valor: number | null, decimales = 2): string {
  if (valor === null || !Number.isFinite(valor)) return '';
  return valor.toFixed(decimales).replace('.', ',');
}

/** Escapa un texto para CSV: comillas dobles si lleva separador o salto. */
function texto(valor: string): string {
  if (/[";\n\r]/.test(valor)) return `"${valor.replace(/"/g, '""')}"`;
  return valor;
}

export function generarCSV(estado: Estado): string {
  const filas: string[][] = [[...COLUMNAS]];

  for (const sesion of [...estado.sesiones].sort((a, b) => a.fecha.localeCompare(b.fecha))) {
    const jugados = JUEGOS.filter((juego) => sesion.porJuego[juego]);
    if (jugados.length === 0) continue;

    const ensayosTotales = jugados.reduce(
      (total, juego) => total + (sesion.porJuego[juego]?.ensayos ?? 0),
      0,
    );

    for (const juego of jugados) {
      const resumen = sesion.porJuego[juego]!;
      // Reparto de los minutos de la sesión entre sus juegos.
      const proporcion =
        ensayosTotales > 0 ? resumen.ensayos / ensayosTotales : 1 / jugados.length;
      const minutos = sesion.minutosActivos * proporcion;
      const precision = resumen.ensayos > 0 ? (resumen.aciertos / resumen.ensayos) * 100 : 0;
      const parametros = Object.keys(resumen.umbrales);

      if (parametros.length === 0) {
        filas.push(
          fila(estado, sesion.fecha, sesion.modo, juego, minutos, resumen, precision, null, null),
        );
        continue;
      }

      for (const parametro of parametros) {
        filas.push(
          fila(
            estado,
            sesion.fecha,
            sesion.modo,
            juego,
            minutos,
            resumen,
            precision,
            parametro,
            resumen.umbrales[parametro],
          ),
        );
      }
    }
  }

  return BOM + filas.map((f) => f.map(texto).join(SEPARADOR)).join('\r\n') + '\r\n';
}

function fila(
  estado: Estado,
  fecha: string,
  modo: string,
  juego: IdJuego,
  minutos: number,
  resumen: { ensayos: number; aciertos: number },
  precision: number,
  parametro: string | null,
  umbral: number | null,
): string[] {
  const deTamano = parametro !== null && esParametroDeTamano(parametro);
  const medidas = deTamano && umbral !== null ? medidasDeUmbral(estado, umbral) : null;

  return [
    fecha,
    modo,
    juego,
    numero(minutos, 1),
    String(resumen.ensayos),
    String(resumen.aciertos),
    numero(precision, 1),
    parametro ?? '',
    // El contraste no se mide en píxeles: esa columna queda vacía.
    deTamano ? numero(umbral, 2) : '',
    medidas ? numero(medidas.mm, 3) : '',
    medidas ? numero(medidas.arcmin, 2) : '',
    numero(balanceEnFecha(estado, fecha), 2),
    estado.calibracion.pxPorMm === null ? 'no' : 'si',
    String(eventosDelDia(estado, fecha)),
  ];
}
