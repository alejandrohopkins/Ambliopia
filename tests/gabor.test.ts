/**
 * Detector de patrones: parches de Gabor con su contraste real y partidas.
 */
import { describe, it, expect, beforeAll } from 'vitest';
import { config } from '../src/config';
import { srgbALineal } from '../src/engine/color';
import {
  crearParche,
  dificultadDeGabor,
  grisDeFondo,
  michelson,
  orientaciones,
} from '../src/games/gabor/parche';
import { montarJuego, type JuegoFalso } from './ayudas/juegoFalso';

beforeAll(() => {
  // Un documento mínimo: los parches se pasan a lienzos aparte.
  (globalThis as unknown as Record<string, unknown>).document = {
    createElement: () => ({
      width: 0,
      height: 0,
      getContext: () => ({
        createImageData: (ancho: number, alto: number) => ({ data: new Uint8ClampedArray(ancho * alto * 4) }),
        putImageData: () => {},
      }),
    }),
  };
});

describe('parche de Gabor', () => {
  it('con contraste alto, el real se parece mucho al pedido', () => {
    const parche = crearParche({ lado: 120, ciclos: 3, orientacion: 0, contraste: 0.6 });
    expect(parche.contrasteReal).toBeGreaterThan(0.55);
    expect(parche.contrasteReal).toBeLessThan(0.65);
  });

  it('fuera de la campana queda el gris del panel', () => {
    const parche = crearParche({ lado: 100, ciclos: 3, orientacion: 0, contraste: 1 });
    expect(parche.grises[0]).toBe(grisDeFondo());
    expect(parche.grises[parche.grises.length - 1]).toBe(grisDeFondo());
  });

  it('un contraste que no cabe en 8 bits se queda en el paso mínimo, y se anota el real', () => {
    const parche = crearParche({ lado: 80, ciclos: 3, orientacion: 0, contraste: 0.0001 });
    const valores = new Set(parche.grises);
    expect(valores.size).toBe(3);
    const fondo = grisDeFondo();
    expect(parche.contrasteReal).toBeCloseTo(
      michelson(srgbALineal(fondo + 1), srgbALineal(fondo - 1)),
      6,
    );
    expect(parche.contrasteReal).toBeGreaterThan(0.0001);
  });

  it('las rayas siguen la orientación pedida', () => {
    const lado = 64;
    const verticales = crearParche({ lado, ciclos: 4, orientacion: 0, contraste: 1 });
    const horizontales = crearParche({ lado, ciclos: 4, orientacion: Math.PI / 2, contraste: 1 });
    const centro = lado / 2;
    // Rayas verticales: cambian a lo ancho y no a lo alto.
    const filaV = Array.from({ length: 8 }, (_, i) => verticales.grises[centro * lado + centro - 4 + i]);
    const columnaV = Array.from({ length: 3 }, (_, i) => verticales.grises[(centro - 1 + i) * lado + centro]);
    expect(new Set(filaV).size).toBeGreaterThan(2);
    expect(Math.max(...columnaV) - Math.min(...columnaV)).toBeLessThan(6);
    const columnaH = Array.from({ length: 8 }, (_, i) => horizontales.grises[(centro - 4 + i) * lado + centro]);
    expect(new Set(columnaH).size).toBeGreaterThan(2);
  });

  it('solo un parche tiene otra orientación', () => {
    const giros = orientaciones(9, 4, 0.3, 30);
    expect(giros.filter((g) => g === 0.3)).toHaveLength(8);
    expect(giros[4]).toBeCloseTo(0.3 + Math.PI / 6);
  });

  it('el nivel sube la frecuencia, acerca los giros y pone límite de tiempo', () => {
    const primero = dificultadDeGabor(1, 1);
    const ultimo = dificultadDeGabor(5, 5);
    expect(ultimo.ciclos).toBeGreaterThan(primero.ciclos);
    expect(ultimo.diferenciaGrados).toBeLessThan(primero.diferenciaGrados);
    expect(primero.limiteSeg).toBe(0);
    expect(ultimo.limiteSeg).toBeGreaterThan(0);
  });
});

function ensayoActual(juego: JuegoFalso) {
  return (juego.instancia as unknown as { ensayo: { distinto: number; revelarHastaMs: number | null } | null })
    .ensayo;
}

function centroDe(juego: JuegoFalso, indice: number) {
  const caja = (juego.instancia as unknown as { caja(i: number): { x: number; y: number; lado: number } }).caja(
    indice,
  );
  return { x: caja.x + caja.lado / 2, y: caja.y + caja.lado / 2 };
}

describe('partida del detector', () => {
  it('quien encuentra el distinto acierta, anota el contraste real y termina el nivel', () => {
    const juego = montarJuego('gabor', 'parche');
    for (let t = 0; t < 120_000 && !juego.fin(); t += 16) {
      const ensayo = ensayoActual(juego);
      if (ensayo && ensayo.revelarHastaMs === null) {
        const { x, y } = centroDe(juego, ensayo.distinto);
        juego.tocar(x, y);
      }
      juego.avanzar(16);
    }
    expect(juego.fin()).not.toBeNull();
    expect(juego.ensayos).toHaveLength(config.gabor.ensayosPorNivel);
    expect(juego.ensayos.every((e) => e.acierto && e.parametro === 'contraste')).toBe(true);
    expect(juego.ensayos.every((e) => e.valor > 0 && e.valor <= 1)).toBe(true);
    juego.instancia.destruir();
    expect(juego.oyentesVivos()).toBe(0);
  });

  it('elegir otro parche es un fallo, y sin elegir en los mundos altos se acaba el tiempo', () => {
    const juego = montarJuego('gabor', 'parche', { mundo: 5, nivel: 1 });
    juego.avanzar(config.modulos.ayudaSeg * 1000 + 50);
    const ensayo = ensayoActual(juego)!;
    const otro = (ensayo.distinto + 1) % 12;
    const { x, y } = centroDe(juego, otro);
    juego.tocar(x, y);
    expect(juego.ensayos[0].acierto).toBe(false);

    juego.avanzar(config.modulos.revelarMs + config.gabor.limiteSegPorMundo[4] * 1000 + 100);
    expect(juego.ensayos).toHaveLength(2);
    expect(juego.ensayos[1].acierto).toBe(false);
  });

  it('con el teclado se recorre la rejilla y se elige', () => {
    const juego = montarJuego('gabor', 'parche');
    juego.avanzar(config.modulos.ayudaSeg * 1000 + 50);
    const { distinto } = ensayoActual(juego)!;
    const cols = config.gabor.rejillaPorMundo[0].cols;
    for (let i = 0; i < distinto % cols; i += 1) juego.tecla('ArrowRight');
    for (let i = 0; i < Math.floor(distinto / cols); i += 1) juego.tecla('ArrowDown');
    juego.tecla('Enter');
    expect(juego.ensayos[0].acierto).toBe(true);
  });
});
