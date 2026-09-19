import { describe, it, expect } from 'vitest';
import { config, type IdJuego } from '../src/config';
import { calcularBalance, umbralesPorDia, type EntradaDeHistorial } from '../src/engine/balance';
import type { Sesion } from '../src/storage/esquema';

const INICIAL = config.balance.contrasteInicialOjoDominante;
const MINUTOS = config.balance.minutosMinimosEnLentes;

function historial(entradas: Array<[string, Record<string, number>]>): EntradaDeHistorial[] {
  return entradas.map(([dia, umbrales]) => ({ dia, umbrales: { minero: umbrales } }));
}

function calcular(
  dia: string,
  historialDado: EntradaDeHistorial[],
  parcial: Partial<Parameters<typeof calcularBalance>[0]> = {},
) {
  return calcularBalance({
    balanceActual: INICIAL,
    automatico: true,
    dia,
    minutosEnLentes: MINUTOS,
    historial: historialDado,
    ...parcial,
  });
}

describe('regla diaria de balance', () => {
  it('sin los minutos mínimos en lentes no se toca nada', () => {
    const resultado = calcular('2026-09-19', historial([['2026-09-19', { tamano: 10 }]]), {
      minutosEnLentes: MINUTOS - 1,
    });
    expect(resultado.motivo).toBe('mantiene');
    expect(resultado.valor).toBe(INICIAL);
  });

  it('sin historial previo sube, porque se cumplieron los minutos', () => {
    const resultado = calcular('2026-09-19', historial([['2026-09-19', { tamano: 10 }]]));
    expect(resultado.motivo).toBe('subida');
    expect(resultado.valor).toBeCloseTo(INICIAL + config.balance.pasoSubida, 6);
  });

  it('umbral estable respecto a los días previos: sube', () => {
    const resultado = calcular(
      '2026-09-19',
      historial([
        ['2026-09-16', { tamano: 10 }],
        ['2026-09-17', { tamano: 10 }],
        ['2026-09-18', { tamano: 10 }],
        ['2026-09-19', { tamano: 10.5 }],
      ]),
    );
    expect(resultado.r).toBeCloseTo(1.05, 4);
    expect(resultado.motivo).toBe('subida');
    expect(resultado.valor).toBeCloseTo(INICIAL + config.balance.pasoSubida, 6);
  });

  it('umbral justo en el límite de subida todavía sube', () => {
    const resultado = calcular(
      '2026-09-19',
      historial([
        ['2026-09-18', { tamano: 10 }],
        ['2026-09-19', { tamano: 10 * config.balance.umbralSubida }],
      ]),
    );
    expect(resultado.r).toBeCloseTo(config.balance.umbralSubida, 6);
    expect(resultado.motivo).toBe('subida');
  });

  it('empeoramiento moderado: mantiene', () => {
    const resultado = calcular(
      '2026-09-19',
      historial([
        ['2026-09-18', { tamano: 10 }],
        ['2026-09-19', { tamano: 14 }],
      ]),
    );
    expect(resultado.r).toBeCloseTo(1.4, 4);
    expect(resultado.motivo).toBe('mantiene');
    expect(resultado.valor).toBe(INICIAL);
  });

  it('empeoramiento grande: baja, que es la señal de supresión', () => {
    const resultado = calcular(
      '2026-09-19',
      historial([
        ['2026-09-16', { tamano: 10 }],
        ['2026-09-17', { tamano: 10 }],
        ['2026-09-19', { tamano: 20 }],
      ]),
    );
    expect(resultado.r).toBeCloseTo(2, 4);
    expect(resultado.motivo).toBe('bajada');
    expect(resultado.valor).toBeCloseTo(INICIAL - config.balance.pasoBajada, 6);
  });

  it('usa la mediana de los tres días previos con datos, no el último', () => {
    const resultado = calcular(
      '2026-09-19',
      historial([
        // Un día muy malo no arrastra la referencia: la mediana es 10.
        ['2026-09-15', { tamano: 40 }],
        ['2026-09-16', { tamano: 9 }],
        ['2026-09-17', { tamano: 10 }],
        ['2026-09-18', { tamano: 11 }],
        ['2026-09-19', { tamano: 10 }],
      ]),
    );
    expect(resultado.r).toBeCloseTo(1, 4);
    expect(resultado.motivo).toBe('subida');
  });

  it('combina varios juegos con media geométrica', () => {
    const historialMixto: EntradaDeHistorial[] = [
      { dia: '2026-09-18', umbrales: { minero: { tamano: 10 }, meteoritos: { tamano: 20 } } },
      // Uno mejora a la mitad y el otro empeora al doble: r = 1, mantiene arriba.
      { dia: '2026-09-19', umbrales: { minero: { tamano: 5 }, meteoritos: { tamano: 40 } } },
    ];
    const resultado = calcular('2026-09-19', historialMixto);
    expect(resultado.r).toBeCloseTo(1, 4);
    expect(resultado.motivo).toBe('subida');
  });

  it('combina los espaciados de un mismo juego antes de mezclar juegos', () => {
    const entradas: EntradaDeHistorial[] = [
      {
        dia: '2026-09-18',
        umbrales: { saboteador: { 'diametro:2.0': 10, 'diametro:1.2': 20 } },
      },
      {
        dia: '2026-09-19',
        umbrales: { saboteador: { 'diametro:2.0': 20, 'diametro:1.2': 20 } },
      },
    ];
    const resultado = calcular('2026-09-19', entradas);
    // media geométrica de (2, 1) = 1.414 → entre 1.25 y 1.5 → mantiene.
    expect(resultado.r).toBeCloseTo(Math.sqrt(2), 4);
    expect(resultado.motivo).toBe('mantiene');
  });

  it('respeta el mínimo y el máximo', () => {
    const bajando = calcular(
      '2026-09-19',
      historial([
        ['2026-09-18', { tamano: 10 }],
        ['2026-09-19', { tamano: 100 }],
      ]),
      { balanceActual: config.balance.minimo },
    );
    expect(bajando.valor).toBe(config.balance.minimo);

    const subiendo = calcular('2026-09-19', historial([['2026-09-19', { tamano: 10 }]]), {
      balanceActual: config.balance.maximo,
    });
    expect(subiendo.valor).toBe(config.balance.maximo);
  });

  it('en modo manual el automático no interviene', () => {
    const resultado = calcular('2026-09-19', historial([['2026-09-19', { tamano: 10 }]]), {
      automatico: false,
    });
    expect(resultado.motivo).toBe('manual');
    expect(resultado.valor).toBe(INICIAL);
  });

  it('un día sin datos de hoy no mueve nada', () => {
    const resultado = calcular('2026-09-19', historial([['2026-09-18', { tamano: 10 }]]));
    expect(resultado.motivo).toBe('mantiene');
  });
});

describe('umbrales por día', () => {
  function sesion(
    fecha: string,
    modo: Sesion['modo'],
    juego: IdJuego,
    umbrales: Record<string, number>,
  ): Sesion {
    return {
      id: `${fecha}-${juego}-${modo}`,
      fecha,
      modo,
      inicio: `${fecha}T10:00:00.000Z`,
      fin: null,
      minutosActivos: 20,
      porJuego: { [juego]: { ensayos: 30, aciertos: 21, umbrales, tiempoReaccionMedioMs: 800 } },
    };
  }

  it('ignora las sesiones en modo parche', () => {
    const entradas = umbralesPorDia([
      sesion('2026-09-19', 'parche', 'minero', { tamano: 8 }),
      sesion('2026-09-19', 'lentes', 'minero', { tamano: 12 }),
    ]);
    expect(entradas).toHaveLength(1);
    expect(entradas[0].umbrales.minero?.tamano).toBeCloseTo(12, 6);
  });

  it('combina varias sesiones del mismo día con media geométrica', () => {
    const entradas = umbralesPorDia([
      sesion('2026-09-19', 'lentes', 'minero', { tamano: 8 }),
      sesion('2026-09-19', 'lentes', 'minero', { tamano: 18 }),
    ]);
    expect(entradas[0].umbrales.minero?.tamano).toBeCloseTo(12, 6);
  });

  it('devuelve los días ordenados y sin días vacíos', () => {
    const entradas = umbralesPorDia([
      sesion('2026-09-20', 'lentes', 'minero', { tamano: 9 }),
      sesion('2026-09-18', 'lentes', 'minero', { tamano: 11 }),
      sesion('2026-09-19', 'lentes', 'minero', {}),
    ]);
    expect(entradas.map((e) => e.dia)).toEqual(['2026-09-18', '2026-09-20']);
  });
});
