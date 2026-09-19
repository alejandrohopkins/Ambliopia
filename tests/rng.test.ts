import { describe, it, expect } from 'vitest';
import { crearAleatorio, semillaDesdeTexto } from '../src/engine/rng';

describe('aleatorio con semilla', () => {
  it('la misma semilla da la misma secuencia', () => {
    const a = crearAleatorio('2026-09-19');
    const b = crearAleatorio('2026-09-19');
    const serie = (r: ReturnType<typeof crearAleatorio>) =>
      Array.from({ length: 20 }, () => r.siguiente());
    expect(serie(a)).toEqual(serie(b));
  });

  it('semillas distintas dan secuencias distintas', () => {
    expect(crearAleatorio('a').siguiente()).not.toBe(crearAleatorio('b').siguiente());
  });

  it('los números caen en [0, 1)', () => {
    const r = crearAleatorio(7);
    for (let i = 0; i < 2000; i += 1) {
      const v = r.siguiente();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });

  it('los enteros incluyen ambos extremos y no se salen', () => {
    const r = crearAleatorio(11);
    const vistos = new Set<number>();
    for (let i = 0; i < 3000; i += 1) {
      const v = r.entero(3, 6);
      expect(Number.isInteger(v)).toBe(true);
      expect(v).toBeGreaterThanOrEqual(3);
      expect(v).toBeLessThanOrEqual(6);
      vistos.add(v);
    }
    expect([...vistos].sort()).toEqual([3, 4, 5, 6]);
  });

  it('barajar conserva todos los elementos sin mutar el original', () => {
    const original = [1, 2, 3, 4, 5, 6, 7, 8];
    const barajado = crearAleatorio(3).barajar(original);
    expect(barajado).not.toBe(original);
    expect([...barajado].sort((a, b) => a - b)).toEqual(original);
    expect(original).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
  });

  it('la probabilidad se acerca al valor pedido', () => {
    const r = crearAleatorio(5);
    let ciertos = 0;
    const total = 10000;
    for (let i = 0; i < total; i += 1) if (r.probabilidad(0.3)) ciertos += 1;
    expect(Math.abs(ciertos / total - 0.3)).toBeLessThan(0.02);
  });

  it('la semilla de texto es estable y distingue textos', () => {
    expect(semillaDesdeTexto('2026-09-19')).toBe(semillaDesdeTexto('2026-09-19'));
    expect(semillaDesdeTexto('2026-09-19')).not.toBe(semillaDesdeTexto('2026-09-20'));
  });
});
