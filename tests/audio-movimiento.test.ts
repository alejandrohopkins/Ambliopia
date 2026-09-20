import { describe, it, expect, beforeEach, vi } from 'vitest';
import { config } from '../src/config';
import { Audio, duracionDeEfecto, notasDeEfecto, subeDeTono, type Efecto } from '../src/engine/audio';
import { respirar, parpadear, componerAvatar } from '../src/avatar/compositor';

const EFECTOS: Efecto[] = ['acierto', 'fallo', 'monedas', 'nivel', 'compra', 'insignia'];

describe('sonidos sintetizados', () => {
  it('todos los efectos tienen notas y duran poco', () => {
    for (const efecto of EFECTOS) {
      expect(notasDeEfecto(efecto).length, efecto).toBeGreaterThan(0);
      expect(duracionDeEfecto(efecto), efecto).toBeGreaterThan(0);
      // Nada que corte el ritmo del juego.
      expect(duracionDeEfecto(efecto), efecto).toBeLessThan(1);
    }
  });

  it('el acierto sube de tono y el fallo baja', () => {
    expect(subeDeTono('acierto')).toBe(true);
    expect(subeDeTono('nivel')).toBe(true);
    expect(subeDeTono('monedas')).toBe(true);
    // Un fallo nunca suena a castigo: es un tono suave que baja.
    expect(subeDeTono('fallo')).toBe(false);
  });

  it('el fallo usa onda senoidal, más suave que la cuadrada', () => {
    for (const nota of notasDeEfecto('fallo')) expect(nota.tipo).toBe('sine');
  });

  it('las notas están dentro de un rango audible y cómodo', () => {
    for (const efecto of EFECTOS) {
      for (const nota of notasDeEfecto(efecto)) {
        expect(nota.hz, efecto).toBeGreaterThan(100);
        expect(nota.hz, efecto).toBeLessThan(4000);
        expect(nota.dura, efecto).toBeGreaterThan(0);
      }
    }
  });
});

describe('interruptores de sonido', () => {
  const creados: Array<{ frecuencias: number[] }> = [];

  /** AudioContext falso: anota cuántos osciladores se crearon. */
  function contextoFalso() {
    const nodo = () => ({
      connect: () => {},
      gain: {
        value: 0,
        setValueAtTime: () => {},
        exponentialRampToValueAtTime: () => {},
      },
    });
    return class {
      currentTime = 0;
      state = 'running';
      destination = {};
      createGain() {
        return nodo();
      }
      createOscillator() {
        const registro = { frecuencias: [] as number[] };
        creados.push(registro);
        return {
          type: 'square',
          frequency: { setValueAtTime: (hz: number) => registro.frecuencias.push(hz) },
          connect: () => {},
          start: () => {},
          stop: () => {},
        };
      }
      resume() {
        return Promise.resolve();
      }
      close() {
        return Promise.resolve();
      }
    };
  }

  beforeEach(() => {
    creados.length = 0;
    vi.stubGlobal('AudioContext', contextoFalso());
  });

  it('con el sonido apagado no suena nada', () => {
    const audio = new Audio({ sonido: false, musica: false, volumen: 1 });
    audio.reproducir('acierto');
    expect(creados).toHaveLength(0);
  });

  it('con el sonido encendido suena cada nota del efecto', () => {
    const audio = new Audio({ sonido: true, musica: false, volumen: 0.8 });
    audio.reproducir('acierto');
    expect(creados).toHaveLength(notasDeEfecto('acierto').length);
    expect(creados[0].frecuencias[0]).toBe(notasDeEfecto('acierto')[0].hz);
  });

  it('apagar el sonido a mitad de la sesión lo calla', () => {
    const audio = new Audio({ sonido: true, musica: false, volumen: 1 });
    audio.reproducir('monedas');
    const antes = creados.length;
    audio.actualizar({ sonido: false });
    audio.reproducir('monedas');
    expect(creados).toHaveLength(antes);
  });

  it('la música está apagada por defecto', () => {
    expect(config.audio.musicaPorDefecto).toBe(false);
  });

  it('sin Web Audio la app no se rompe', () => {
    vi.stubGlobal('AudioContext', undefined);
    const audio = new Audio({ sonido: true, musica: true, volumen: 1 });
    expect(() => audio.reproducir('nivel')).not.toThrow();
    expect(() => audio.iniciarMusica()).not.toThrow();
    expect(() => audio.destruir()).not.toThrow();
  });
});

describe('movimiento del avatar', () => {
  it('respirar sube el sprite un píxel y no pierde filas', () => {
    const mapa = componerAvatar({});
    const arriba = respirar(mapa, true);
    expect(arriba).toHaveLength(mapa.length);
    expect(arriba[0]).toBe(mapa[1]);
    expect(arriba[arriba.length - 1]).toBe('.'.repeat(mapa[0].length));
  });

  it('sin respiración el sprite no cambia', () => {
    const mapa = componerAvatar({});
    expect(respirar(mapa, false)).toBe(mapa);
  });

  it('parpadear cierra el visor sin tocar el resto', () => {
    const mapa = componerAvatar({});
    const cerrado = parpadear(mapa);
    expect(cerrado.join('')).not.toContain('V');
    expect(cerrado).toHaveLength(mapa.length);
    // El traje sigue donde estaba.
    expect(cerrado[8]).toBe(mapa[8]);
  });

  it('la respiración va muy por debajo del límite de destellos', () => {
    const hz = 1000 / config.avatar.respiracionMs;
    expect(hz).toBeLessThan(config.accesibilidad.maxParpadeosPorSegundo);
  });
});
