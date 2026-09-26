import { describe, it, expect } from 'vitest';
import { config } from '../src/config';
import { estadoInicial, type Estado, type Sesion } from '../src/storage/esquema';
import {
  minutosDelDia,
  maximoDelDia,
  metaCumplida,
  limiteAlcanzado,
  diasConMetaCumplida,
  juegosDelDia,
  modosDisponibles,
} from '../src/storage/selectores';

function sesion(parcial: Partial<Sesion>): Sesion {
  return {
    id: Math.random().toString(36).slice(2),
    fecha: '2026-09-19',
    modo: 'parche',
    inicio: '2026-09-19T10:00:00.000Z',
    fin: null,
    minutosActivos: 10,
    porJuego: {},
    ...parcial,
  };
}

function conSesiones(...sesiones: Sesion[]): Estado {
  const estado = estadoInicial();
  estado.sesiones = sesiones;
  return estado;
}

describe('selectores de tiempo', () => {
  it('suma los minutos del día y los separa por modo', () => {
    const estado = conSesiones(
      sesion({ minutosActivos: 12, modo: 'parche' }),
      sesion({ minutosActivos: 8, modo: 'lentes' }),
      sesion({ fecha: '2026-09-18', minutosActivos: 30 }),
    );
    expect(minutosDelDia(estado, '2026-09-19')).toBe(20);
    expect(minutosDelDia(estado, '2026-09-19', 'lentes')).toBe(8);
    expect(minutosDelDia(estado, '2026-09-18')).toBe(30);
  });

  it('la meta se cumple al llegar a los minutos configurados', () => {
    const estado = conSesiones(sesion({ minutosActivos: config.sesion.metaDiariaMin }));
    expect(metaCumplida(estado, '2026-09-19')).toBe(true);
    expect(metaCumplida(estado, '2026-09-18')).toBe(false);
  });

  it('la extensión del adulto solo vale para su día', () => {
    const estado = conSesiones(sesion({ minutosActivos: config.sesion.maxDiarioMin }));
    expect(limiteAlcanzado(estado, '2026-09-19')).toBe(true);
    estado.extraDelDia = { fecha: '2026-09-19', minutos: config.sesion.extensionMin };
    expect(maximoDelDia(estado, '2026-09-19')).toBe(
      config.sesion.maxDiarioMin + config.sesion.extensionMin,
    );
    expect(limiteAlcanzado(estado, '2026-09-19')).toBe(false);
    expect(maximoDelDia(estado, '2026-09-20')).toBe(config.sesion.maxDiarioMin);
  });

  it('lista los días con la meta cumplida', () => {
    const estado = conSesiones(
      sesion({ fecha: '2026-09-17', minutosActivos: 11 }),
      sesion({ fecha: '2026-09-17', minutosActivos: 11 }),
      sesion({ fecha: '2026-09-18', minutosActivos: 5 }),
      sesion({ fecha: '2026-09-19', minutosActivos: 25 }),
    );
    expect(diasConMetaCumplida(estado)).toEqual(['2026-09-17', '2026-09-19']);
  });

  it('cuenta los juegos distintos del día', () => {
    const resumen = { niveles: 1, perfectos: 0, ensayos: 1, aciertos: 1, umbrales: {}, tiempoReaccionMedioMs: 500 };
    const estado = conSesiones(
      sesion({ porJuego: { minero: resumen } }),
      sesion({ porJuego: { torre: resumen, minero: resumen } }),
    );
    expect(juegosDelDia(estado, '2026-09-19').sort()).toEqual(['minero', 'torre']);
  });
});


describe('modos disponibles', () => {
  it('sin lentes solo hay modo parche', () => {
    expect(modosDisponibles(estadoInicial())).toEqual(['parche']);
  });

  it('el modo fijo del adulto manda sobre los permitidos', () => {
    const estado = estadoInicial();
    estado.ajustes.modosPermitidos = ['parche', 'lentes'];
    estado.ajustes.modoFijo = 'lentes';
    expect(modosDisponibles(estado)).toEqual(['lentes']);
  });
});
