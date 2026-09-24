import { describe, expect, it } from 'vitest';
import { config } from '../src/config';
import { nivelSiguiente, nivelSuperado, ordenDeNivel } from '../src/rewards/niveles';
import { reducir } from '../src/storage/acciones';
import { estadoInicial } from '../src/storage/esquema';
import { migrar } from '../src/storage/migraciones';

const { precisionParaSubir, mundos, nivelesPorMundo } = config.progresion;

describe('superar un nivel', () => {
  it('hace falta la precisión pedida', () => {
    expect(precisionParaSubir).toBe(0.85);
    expect(nivelSuperado({ precision: precisionParaSubir })).toBe(true);
    expect(nivelSuperado({ precision: 1 })).toBe(true);
    expect(nivelSuperado({ precision: precisionParaSubir - 0.001 })).toBe(false);
  });

  it('si el juego tiene objetivo, además hay que cumplirlo', () => {
    const figura = (cumplido: boolean) => ({ hecho: 8, total: 10, cumplido });
    expect(nivelSuperado({ precision: 1, objetivo: figura(true) })).toBe(true);
    expect(nivelSuperado({ precision: 1, objetivo: figura(false) })).toBe(false);
  });

  it('después de cada nivel viene el siguiente, y tras el último del mundo, el mundo nuevo', () => {
    expect(nivelSiguiente({ mundo: 1, nivel: 1 })).toEqual({ mundo: 1, nivel: 2 });
    expect(nivelSiguiente({ mundo: 1, nivel: nivelesPorMundo })).toEqual({ mundo: 2, nivel: 1 });
    expect(nivelSiguiente({ mundo: mundos, nivel: nivelesPorMundo })).toBeNull();
    expect(ordenDeNivel({ mundo: 2, nivel: 1 })).toBe(nivelesPorMundo);
  });
});

describe('nivel guardado por juego', () => {
  const superar = (estado = estadoInicial(), mundo = 1, nivel = 1) =>
    reducir(estado, { tipo: 'progreso/superar', juego: 'gabor', mundo, nivel });

  it('empieza en el primer nivel sin ninguno superado', () => {
    expect(estadoInicial().progreso.gabor).toMatchObject({ mundo: 1, nivel: 1, superado: null });
  });

  it('superar un nivel lo guarda y deja el juego en el siguiente', () => {
    const estado = superar();
    expect(estado.progreso.gabor).toMatchObject({
      mundo: 1,
      nivel: 2,
      superado: { mundo: 1, nivel: 1 },
    });
    // Los demás juegos no se mueven.
    expect(estado.progreso.minero).toMatchObject({ mundo: 1, nivel: 1, superado: null });
  });

  it('cada nivel superado sube un poco más la dificultad', () => {
    let estado = estadoInicial();
    for (let i = 0; i < nivelesPorMundo; i += 1) {
      const { mundo, nivel } = estado.progreso.gabor;
      estado = superar(estado, mundo, nivel);
    }
    expect(estado.progreso.gabor).toMatchObject({
      mundo: 2,
      nivel: 1,
      superado: { mundo: 1, nivel: nivelesPorMundo },
    });
  });

  it('el último nivel del último mundo se sigue jugando', () => {
    const estado = superar(estadoInicial(), mundos, nivelesPorMundo);
    expect(estado.progreso.gabor).toMatchObject({
      mundo: mundos,
      nivel: nivelesPorMundo,
      superado: { mundo: mundos, nivel: nivelesPorMundo },
    });
  });

  it('el progreso nunca retrocede', () => {
    let estado = superar(estadoInicial(), 2, 3);
    estado = superar(estado, 1, 1);
    expect(estado.progreso.gabor).toMatchObject({
      mundo: 2,
      nivel: 4,
      superado: { mundo: 2, nivel: 3 },
    });
  });
});

describe('migración a la versión 2', () => {
  it('conserva el nivel de cada juego y empieza la cuenta de niveles en cero', () => {
    const migrado = migrar({
      version: 1,
      progreso: { minero: { mundo: 3, nivel: 2, estrellasPorNivel: { '1:1': 3 } } },
      sesiones: [
        {
          id: 'a',
          fecha: '2026-09-19',
          modo: 'parche',
          inicio: '2026-09-19T10:00:00.000Z',
          fin: null,
          minutosActivos: 12,
          porJuego: { minero: { ensayos: 30, aciertos: 21, umbrales: {}, tiempoReaccionMedioMs: 800 } },
        },
      ],
    });
    expect(migrado.version).toBe(config.almacenamiento.version);
    expect(migrado.progreso.minero).toMatchObject({ mundo: 3, nivel: 2, superado: null });
    expect(migrado.sesiones[0].porJuego.minero).toMatchObject({ niveles: 0, ensayos: 30 });
  });
});
