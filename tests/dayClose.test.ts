import { describe, it, expect } from 'vitest';
import { config } from '../src/config';
import { cerrarDias, hayCierrePendiente } from '../src/engine/dayClose';
import { estadoInicial, type Estado, type Sesion } from '../src/storage/esquema';

function sesion(fecha: string, minutos: number, modo: Sesion['modo'] = 'parche'): Sesion {
  return {
    id: `${fecha}-${modo}-${minutos}`,
    fecha,
    modo,
    inicio: `${fecha}T10:00:00.000Z`,
    fin: `${fecha}T10:30:00.000Z`,
    minutosActivos: minutos,
    porJuego: {},
  };
}

function conSesionesDeLentes(fecha: string, minutos: number, umbral: number): Sesion {
  return {
    ...sesion(fecha, minutos, 'lentes'),
    porJuego: {
      minero: { ensayos: 30, aciertos: 21, umbrales: { tamano: umbral }, tiempoReaccionMedioMs: 800 },
    },
  };
}

function base(parcial: Partial<Estado> = {}): Estado {
  return { ...estadoInicial(), ultimoCierre: '2026-09-18', ...parcial };
}

describe('cierre del día', () => {
  it('la primera vez solo deja constancia del día', () => {
    const { estado, resumen } = cerrarDias(estadoInicial(), { hoy: '2026-09-19' });
    expect(estado.ultimoCierre).toBe('2026-09-19');
    expect(resumen.dias).toEqual([]);
  });

  it('el mismo día no vuelve a cerrar', () => {
    const inicial = base();
    const { estado, resumen } = cerrarDias(inicial, { hoy: '2026-09-18' });
    expect(estado).toBe(inicial);
    expect(resumen.dias).toEqual([]);
    expect(hayCierrePendiente(inicial, '2026-09-18')).toBe(false);
  });

  it('cierra un día cumplido: sube la racha y da un cristal', () => {
    const inicial = base({ sesiones: [sesion('2026-09-18', config.sesion.metaDiariaMin)] });
    const { estado, resumen } = cerrarDias(inicial, { hoy: '2026-09-19' });

    expect(resumen.dias).toEqual(['2026-09-18']);
    expect(resumen.diasCumplidos).toEqual(['2026-09-18']);
    expect(estado.racha.actual).toBe(1);
    expect(estado.racha.ultimoDiaCumplido).toBe('2026-09-18');
    expect(estado.economia.cristales).toBe(config.economia.cristalesPorDiaConMeta);
    expect(estado.ultimoCierre).toBe('2026-09-19');
  });

  it('un día sin la meta no da cristal ni sube la racha', () => {
    const inicial = base({ sesiones: [sesion('2026-09-18', config.sesion.metaDiariaMin - 1)] });
    const { estado, resumen } = cerrarDias(inicial, { hoy: '2026-09-19' });
    expect(resumen.diasCumplidos).toEqual([]);
    expect(estado.racha.actual).toBe(0);
    expect(estado.economia.cristales).toBe(0);
  });

  it('procesa varios días pendientes en orden', () => {
    const meta = config.sesion.metaDiariaMin;
    const inicial = base({
      ultimoCierre: '2026-09-15',
      sesiones: [
        sesion('2026-09-16', meta),
        sesion('2026-09-17', meta),
        sesion('2026-09-18', meta),
      ],
    });
    const { estado, resumen } = cerrarDias(inicial, { hoy: '2026-09-19' });
    expect(resumen.dias).toEqual([
      '2026-09-15',
      '2026-09-16',
      '2026-09-17',
      '2026-09-18',
    ]);
    expect(estado.racha.actual).toBe(3);
    expect(estado.economia.cristales).toBe(3 * config.economia.cristalesPorDiaConMeta);
  });

  it('el protector semanal cubre un día faltante al cerrar varios días', () => {
    const meta = config.sesion.metaDiariaMin;
    const inicial = base({
      ultimoCierre: '2026-09-13',
      sesiones: [
        sesion('2026-09-14', meta),
        sesion('2026-09-15', meta),
        // Falta el 16.
        sesion('2026-09-17', meta),
      ],
    });
    const { estado } = cerrarDias(inicial, { hoy: '2026-09-18' });
    expect(estado.racha.actual).toBe(3);
    expect(estado.racha.protectoresDisponibles).toBe(0);
  });

  it('una ausencia larga deja la racha en cero', () => {
    const inicial = base({
      ultimoCierre: '2026-09-10',
      sesiones: [sesion('2026-09-10', config.sesion.metaDiariaMin)],
      racha: {
        actual: 5,
        mejor: 5,
        protectoresDisponibles: 1,
        ultimoDiaCumplido: '2026-09-10',
        semanaDeProtectores: '2026-W37',
      },
    });
    const { estado } = cerrarDias(inicial, { hoy: '2026-09-19' });
    expect(estado.racha.actual).toBe(0);
    expect(estado.racha.mejor).toBe(5);
  });

  it('aplica la regla de balance y la deja anotada en el historial', () => {
    const inicial = base({
      ultimoCierre: '2026-09-17',
      sesiones: [conSesionesDeLentes('2026-09-18', config.balance.minutosMinimosEnLentes, 10)],
    });
    const { estado, resumen } = cerrarDias(inicial, { hoy: '2026-09-19' });

    expect(resumen.cambiosDeBalance).toHaveLength(1);
    expect(resumen.cambiosDeBalance[0].motivo).toBe('subida');
    expect(estado.balance.contrasteOjoDominante).toBeCloseTo(
      config.balance.contrasteInicialOjoDominante + config.balance.pasoSubida,
      6,
    );
    expect(estado.balance.historial.at(-1)).toMatchObject({
      fecha: '2026-09-18',
      motivo: 'subida',
    });
  });

  it('con pocos minutos en lentes el balance no se mueve', () => {
    const inicial = base({
      ultimoCierre: '2026-09-17',
      sesiones: [conSesionesDeLentes('2026-09-18', config.balance.minutosMinimosEnLentes - 1, 10)],
    });
    const { estado, resumen } = cerrarDias(inicial, { hoy: '2026-09-19' });
    expect(resumen.cambiosDeBalance).toEqual([]);
    expect(estado.balance.contrasteOjoDominante).toBe(
      config.balance.contrasteInicialOjoDominante,
    );
  });

  it('un umbral que empeora mucho hace bajar el contraste', () => {
    const minutos = config.balance.minutosMinimosEnLentes;
    const inicial = base({
      ultimoCierre: '2026-09-18',
      balance: {
        contrasteOjoDominante: 0.5,
        automatico: true,
        historial: [],
      },
      sesiones: [
        conSesionesDeLentes('2026-09-16', minutos, 10),
        conSesionesDeLentes('2026-09-17', minutos, 10),
        conSesionesDeLentes('2026-09-18', minutos, 25),
      ],
    });
    const { estado, resumen } = cerrarDias(inicial, { hoy: '2026-09-19' });
    expect(resumen.cambiosDeBalance.at(-1)?.motivo).toBe('bajada');
    expect(estado.balance.contrasteOjoDominante).toBeCloseTo(0.5 - config.balance.pasoBajada, 6);
  });

  it('en modo manual el cierre no toca el balance', () => {
    const inicial = base({
      ultimoCierre: '2026-09-17',
      balance: { contrasteOjoDominante: 0.6, automatico: false, historial: [] },
      sesiones: [conSesionesDeLentes('2026-09-18', config.balance.minutosMinimosEnLentes, 10)],
    });
    const { estado, resumen } = cerrarDias(inicial, { hoy: '2026-09-19' });
    expect(resumen.cambiosDeBalance).toEqual([]);
    expect(estado.balance.contrasteOjoDominante).toBe(0.6);
  });

  it('el gancho de fases posteriores recibe cada día cerrado', () => {
    const vistos: string[] = [];
    const inicial = base({ ultimoCierre: '2026-09-16' });
    cerrarDias(inicial, {
      hoy: '2026-09-19',
      alCerrarDia: (estado, dia) => {
        vistos.push(dia);
        return estado;
      },
    });
    expect(vistos).toEqual(['2026-09-16', '2026-09-17', '2026-09-18']);
  });

  it('volver tras meses no recorre meses enteros', () => {
    const inicial = base({ ultimoCierre: '2024-01-01' });
    const { resumen } = cerrarDias(inicial, { hoy: '2026-09-19' });
    expect(resumen.dias.length).toBeLessThanOrEqual(61);
    expect(resumen.dias.at(-1)).toBe('2026-09-18');
  });

  it('detecta si hay cierre pendiente', () => {
    expect(hayCierrePendiente(base(), '2026-09-19')).toBe(true);
    expect(hayCierrePendiente(base(), '2026-09-18')).toBe(false);
    expect(hayCierrePendiente(estadoInicial(), '2026-09-19')).toBe(false);
  });
});
