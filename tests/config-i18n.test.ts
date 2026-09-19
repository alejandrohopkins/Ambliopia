import { describe, it, expect } from 'vitest';
import { config } from '../src/config';
import { es, ojoContrario, nombreDeOjo } from '../src/i18n/es';

describe('config', () => {
  it('define el ojo ambliope por defecto', () => {
    expect(config.ojoAmbliope).toBe('derecho');
  });

  it('tiene meta diaria menor que el máximo diario', () => {
    expect(config.sesion.metaDiariaMin).toBeLessThan(config.sesion.maxDiarioMin);
  });

  it('respeta el límite de destellos', () => {
    expect(config.minero.pulsoHz).toBeLessThanOrEqual(config.accesibilidad.maxParpadeosPorSegundo);
  });

  it('el balance arranca dentro de sus límites', () => {
    const { contrasteInicialOjoDominante, minimo, maximo } = config.balance;
    expect(contrasteInicialOjoDominante).toBeGreaterThanOrEqual(minimo);
    expect(contrasteInicialOjoDominante).toBeLessThanOrEqual(maximo);
  });
});

describe('i18n', () => {
  it('el ojo contrario es el que se tapa con el parche', () => {
    expect(ojoContrario('derecho')).toBe('izquierdo');
    expect(ojoContrario('izquierdo')).toBe('derecho');
  });

  it('el chequeo de parche nombra el ojo contrario al ambliope', () => {
    const tapado = ojoContrario(config.ojoAmbliope);
    expect(es.chequeo.parche(tapado)).toContain(nombreDeOjo(tapado));
    expect(es.chequeo.parche(tapado)).not.toContain(nombreDeOjo(config.ojoAmbliope));
  });

  it('el saludo usa el nombre de la jugadora', () => {
    expect(es.base.saludo('Alana')).toContain('Alana');
  });
});
