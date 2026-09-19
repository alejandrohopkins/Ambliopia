import { describe, it, expect } from 'vitest';
import { config } from '../src/config';
import { Staircase, mediaGeometrica, mediana, type ConfigDeEscalera } from '../src/engine/Staircase';
import { crearAleatorio } from '../src/engine/rng';

function crear(parcial: Partial<ConfigDeEscalera> = {}) {
  return new Staircase({
    clave: 'minero:parche:tamano',
    valorInicial: 60,
    minimo: 3,
    maximo: 120,
    ...parcial,
  });
}

/**
 * Responde una lista de ensayos REALES. Los ensayos de confianza que caigan
 * en medio se responden acertando y no cuentan: no mueven la escalera.
 */
function responder(escalera: Staircase, respuestas: boolean[]) {
  for (const acierto of respuestas) {
    let ensayo = escalera.proximoEnsayo();
    while (ensayo.esEnsayoDeConfianza) {
      escalera.record(true);
      ensayo = escalera.proximoEnsayo();
    }
    escalera.record(acierto);
  }
}

describe('reglas de la escalera', () => {
  it('dos aciertos seguidos la hacen más difícil', () => {
    const e = crear();
    responder(e, [true]);
    expect(e.current()).toBe(60);
    responder(e, [true]);
    expect(e.current()).toBeCloseTo(60 * config.escalera.factorMasDificil, 6);
  });

  it('un fallo la hace más fácil de inmediato', () => {
    const e = crear();
    responder(e, [false]);
    expect(e.current()).toBeCloseTo(60 * config.escalera.factorMasFacil, 6);
  });

  it('un acierto suelto entre fallos no la mueve', () => {
    const e = crear();
    responder(e, [false]);
    const trasFallo = e.current();
    responder(e, [true]);
    expect(e.current()).toBe(trasFallo);
  });

  it('respeta el mínimo y el máximo', () => {
    const e = crear({ valorInicial: 4, minimo: 3, maximo: 10 });
    responder(e, Array(30).fill(true));
    expect(e.current()).toBeGreaterThanOrEqual(3);
    responder(e, Array(30).fill(false));
    expect(e.current()).toBeLessThanOrEqual(10);
  });

  it('cuenta una inversión cada vez que cambia de sentido', () => {
    const e = crear();
    responder(e, [true, true]); // baja
    expect(e.inversiones).toBe(0);
    responder(e, [false]); // sube: primera inversión
    expect(e.inversiones).toBe(1);
    responder(e, [true, true]); // baja: segunda
    expect(e.inversiones).toBe(2);
  });

  it('tras cuatro inversiones usa pasos finos', () => {
    const e = crear();
    // Alternar fallo / dos aciertos genera inversiones rápido.
    responder(e, [true, true, false, true, true, false, true, true, false, true, true]);
    expect(e.inversiones).toBeGreaterThanOrEqual(config.escalera.inversionesParaPasoFino);
    const antes = e.current();
    responder(e, [false]);
    expect(e.current() / antes).toBeCloseTo(config.escalera.factorFinoMasFacil, 4);
  });
});

describe('ensayos de confianza', () => {
  it('aparecen aproximadamente cada cinco ensayos', () => {
    const e = crear({ aleatorio: crearAleatorio(1) });
    let confianza = 0;
    const total = 300;
    for (let i = 0; i < total; i += 1) {
      const ensayo = e.proximoEnsayo();
      if (ensayo.esEnsayoDeConfianza) confianza += 1;
      e.record(true);
    }
    const cada = total / confianza;
    expect(cada).toBeGreaterThanOrEqual(config.escalera.confianzaCadaMin);
    expect(cada).toBeLessThanOrEqual(config.escalera.confianzaCadaMax + 1);
  });

  it('se presentan a 2.5 veces el valor actual', () => {
    const e = crear({ aleatorio: crearAleatorio(1) });
    for (let i = 0; i < 40; i += 1) {
      const antes = e.current();
      const ensayo = e.proximoEnsayo();
      if (ensayo.esEnsayoDeConfianza) {
        expect(ensayo.valor).toBeCloseTo(
          Math.min(e.maximo, antes * config.escalera.factorEnsayoDeConfianza),
          6,
        );
        return;
      }
      e.record(true);
    }
    throw new Error('No apareció ningún ensayo de confianza');
  });

  it('no mueven la escalera, acierte o falle', () => {
    const e = crear({ aleatorio: crearAleatorio(1) });
    for (let i = 0; i < 40; i += 1) {
      const antes = e.current();
      const inversionesAntes = e.inversiones;
      const ensayo = e.proximoEnsayo();
      if (ensayo.esEnsayoDeConfianza) {
        e.record(false);
        expect(e.current()).toBe(antes);
        expect(e.inversiones).toBe(inversionesAntes);
        return;
      }
      e.record(true);
    }
    throw new Error('No apareció ningún ensayo de confianza');
  });
});

describe('umbral estimado', () => {
  it('sin inversiones usa los últimos valores presentados', () => {
    const e = crear();
    responder(e, [true]);
    expect(e.threshold()).toBeGreaterThan(0);
  });

  it('con seis o más inversiones usa las últimas seis', () => {
    const e = crear();
    responder(e, Array.from({ length: 60 }, (_, i) => i % 3 !== 2));
    expect(e.inversiones).toBeGreaterThanOrEqual(config.escalera.inversionesParaUmbral);
    const ultimas = e.reversals.slice(-config.escalera.inversionesParaUmbral);
    expect(e.threshold()).toBeCloseTo(mediaGeometrica(ultimas), 6);
  });
});

describe('guardar y continuar', () => {
  it('toJSON y fromJSON devuelven la misma escalera', () => {
    const e = crear();
    responder(e, [true, true, false, true, true, false]);
    const copia = Staircase.fromJSON(e.toJSON(), {
      clave: e.clave,
      valorInicial: 60,
      minimo: e.minimo,
      maximo: e.maximo,
    });
    expect(copia.current()).toBe(e.current());
    expect(copia.threshold()).toBe(e.threshold());
    expect(copia.reversals).toEqual(e.reversals);
    expect(copia.toJSON()).toEqual(e.toJSON());
  });

  it('la sesión siguiente arranca en el umbral por el factor de calentamiento', () => {
    const e = crear();
    responder(e, Array.from({ length: 40 }, (_, i) => i % 3 !== 2));
    const guardado = e.toJSON();
    const siguiente = Staircase.continuar(guardado, {
      clave: e.clave,
      valorInicial: 60,
      minimo: e.minimo,
      maximo: e.maximo,
    });
    expect(siguiente.current()).toBeCloseTo(
      Math.min(e.maximo, e.threshold() * config.escalera.factorCalentamiento),
      6,
    );
    // Arranca más fácil que donde quedó.
    expect(siguiente.current()).toBeGreaterThan(e.threshold());
  });

  it('sin nada guardado empieza en el valor inicial', () => {
    const e = Staircase.continuar(undefined, {
      clave: 'minero:lentes:tamano',
      valorInicial: 48,
      minimo: 3,
      maximo: 96,
    });
    expect(e.current()).toBe(48);
  });
});

describe('utilidades', () => {
  it('la media geométrica es la que corresponde a una escala logarítmica', () => {
    expect(mediaGeometrica([1, 100])).toBeCloseTo(10, 6);
    expect(mediaGeometrica([4, 4, 4])).toBeCloseTo(4, 6);
    expect(mediaGeometrica([])).toBe(0);
  });

  it('la mediana promedia el centro cuando hay un número par', () => {
    expect(mediana([3, 1, 2])).toBe(2);
    expect(mediana([4, 1, 3, 2])).toBe(2.5);
    expect(mediana([])).toBe(0);
  });
});
