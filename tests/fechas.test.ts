import { describe, it, expect } from 'vitest';
import {
  diaISO,
  desdeDiaISO,
  sumarDias,
  diasEntre,
  semanaISO,
  lunesDeLaSemana,
  diasDeLaSemana,
  rangoDeDias,
} from '../src/engine/fechas';

describe('fechas locales', () => {
  it('formatea el día con ceros a la izquierda', () => {
    expect(diaISO(new Date(2026, 0, 5))).toBe('2026-01-05');
    expect(diaISO(new Date(2026, 11, 31))).toBe('2026-12-31');
  });

  it('ida y vuelta entre día ISO y Date local', () => {
    const fecha = desdeDiaISO('2026-09-19');
    expect(fecha.getFullYear()).toBe(2026);
    expect(fecha.getMonth()).toBe(8);
    expect(fecha.getDate()).toBe(19);
  });

  it('suma días cruzando mes y año', () => {
    expect(sumarDias('2026-01-31', 1)).toBe('2026-02-01');
    expect(sumarDias('2026-12-31', 1)).toBe('2027-01-01');
    expect(sumarDias('2026-03-01', -1)).toBe('2026-02-28');
  });

  it('cuenta días entre fechas', () => {
    expect(diasEntre('2026-09-19', '2026-09-20')).toBe(1);
    expect(diasEntre('2026-09-20', '2026-09-19')).toBe(-1);
    expect(diasEntre('2026-09-19', '2026-09-19')).toBe(0);
    expect(diasEntre('2026-02-27', '2026-03-02')).toBe(3);
  });

  it('calcula la semana ISO (lunes a domingo)', () => {
    // 2026-01-01 es jueves: semana 1 de 2026.
    expect(semanaISO('2026-01-01')).toBe('2026-W01');
    // El domingo siguiente cierra esa misma semana.
    expect(semanaISO('2026-01-04')).toBe('2026-W01');
    // El lunes siguiente abre la semana 2.
    expect(semanaISO('2026-01-05')).toBe('2026-W02');
  });

  it('todos los días de una semana comparten semana ISO', () => {
    const dias = diasDeLaSemana('2026-09-19');
    expect(dias).toHaveLength(7);
    expect(lunesDeLaSemana('2026-09-19')).toBe(dias[0]);
    const semanas = new Set(dias.map(semanaISO));
    expect(semanas.size).toBe(1);
  });

  it('el rango de días incluye ambos extremos', () => {
    expect(rangoDeDias('2026-09-19', '2026-09-21')).toEqual([
      '2026-09-19',
      '2026-09-20',
      '2026-09-21',
    ]);
    expect(rangoDeDias('2026-09-21', '2026-09-19')).toEqual([]);
  });
});
