/**
 * Módulos de juegos: cada modo ofrece los suyos y cada juego trae sus textos.
 */
import { describe, it, expect } from 'vitest';
import { config } from '../src/config';
import { es } from '../src/i18n/es';
import { MINIJUEGOS, ORDEN_DE_JUEGOS, juegosDelModo, minijuego } from '../src/games/registro';
import { claveDeEscalera } from '../src/games/tipos';
import { JUEGOS } from '../src/storage/esquema';
import { PALETAS } from '../src/engine/mundos';

describe('registro de juegos', () => {
  it('todos los juegos del esquema están registrados y en el orden de la base', () => {
    expect([...ORDEN_DE_JUEGOS].sort()).toEqual([...JUEGOS].sort());
    for (const id of JUEGOS) expect(minijuego(id)?.id).toBe(id);
  });

  it('con parche se ofrecen los de siempre y los del módulo de parche; con lentes, igual', () => {
    const deParche = juegosDelModo('parche');
    const deLentes = juegosDelModo('lentes');
    for (const id of ['cazador', 'rebote', 'gabor', 'corte', 'laberinto'] as const) {
      expect(deParche).toContain(id);
      expect(deLentes).not.toContain(id);
    }
    for (const id of ['pozo', 'serpiente', 'ave', 'sapo', 'mosaicos'] as const) {
      expect(deLentes).toContain(id);
      expect(deParche).not.toContain(id);
    }
    for (const id of ['minero', 'saboteador', 'torre', 'meteoritos'] as const) {
      expect(deParche).toContain(id);
      expect(deLentes).toContain(id);
    }
  });

  it('cada juego pide escaleras de su modo, con claves bien formadas', () => {
    for (const juego of Object.values(MINIJUEGOS)) {
      const modos = juego.modulo === 'ambos' ? (['parche', 'lentes'] as const) : ([juego.modulo] as const);
      for (const modo of modos) {
        const escaleras = juego.escaleras(modo, 1);
        // Todos miden algo en cada modo en que se juegan.
        expect(escaleras.length, `${juego.id} en ${modo}`).toBeGreaterThan(0);
        for (const escalera of escaleras) {
          expect(escalera.clave.startsWith(claveDeEscalera(juego.id, modo, ''))).toBe(true);
          expect(escalera.minimo).toBeLessThan(escalera.maximo);
          expect(escalera.valorInicial).toBeGreaterThanOrEqual(escalera.minimo);
          expect(escalera.valorInicial).toBeLessThanOrEqual(escalera.maximo);
        }
      }
    }
  });
});

describe('textos de cada juego', () => {
  it('nombre, habilidad, un mundo por cada mundo y una paleta por mundo', () => {
    for (const id of JUEGOS) {
      expect(es.juegos[id]).toBeTruthy();
      expect(es.habilidades[id]).toBeTruthy();
      expect(es.mundos[id]).toHaveLength(config.progresion.mundos);
      expect(PALETAS[id]).toHaveLength(config.progresion.mundos);
    }
  });

  it('cada juego dice sus teclas y sus gestos antes de empezar', () => {
    for (const id of JUEGOS) {
      const { teclas, dedo, zxPropias } = es.controles.porJuego[id];
      expect(teclas.length, id).toBeGreaterThan(0);
      expect(dedo, id).toBeTruthy();
      for (const fila of teclas) {
        expect(fila.accion, id).toBeTruthy();
        // Enter y Z van juntas, igual que la barra espaciadora y X, salvo en
        // los juegos donde Z y X tienen su propio papel.
        if (zxPropias) continue;
        expect(fila.teclas.includes('Enter'), id).toBe(fila.teclas.includes('Z'));
        expect(fila.teclas.includes('Espacio'), id).toBe(fila.teclas.includes('X'));
      }
    }
  });

  it('los juegos de los módulos explican cómo se juega, en líneas que caben en una tablet', () => {
    for (const juego of Object.values(MINIJUEGOS)) {
      if (juego.modulo === 'ambos') continue;
      const lineas = es.ayudas[juego.id];
      expect(lineas, juego.id).toBeDefined();
      for (const linea of lineas!) expect(linea.length, linea).toBeLessThanOrEqual(28);
    }
  });

  it('ninguna ayuda nombra un ojo en duro', () => {
    const todo = Object.values(es.ayudas).flat().join(' ').toLowerCase();
    expect(todo).not.toMatch(/derech|izquierd/);
  });
});
