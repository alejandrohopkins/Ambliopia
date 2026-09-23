/**
 * El ave voladora: física, barreras y partidas en modo lentes.
 */
import { describe, it, expect } from 'vitest';
import { config } from '../src/config';
import { aletear, caer, chocaConBarrera, dificultadDeAve, siguienteHueco } from '../src/games/ave/vuelo';
import { montarJuego, type JuegoFalso } from './ayudas/juegoFalso';
import { coloresProhibidos } from './ayudas/cuatroColores';

describe('vuelo', () => {
  it('aletear siempre sube con la misma fuerza', () => {
    const ave = { y: 300, vy: 500 };
    aletear(ave, 600);
    expect(ave.vy).toBeCloseTo(-config.ave.impulso * 600);
  });

  it('cae cada vez más rápido, hasta un máximo', () => {
    const ave = { y: 100, vy: 0 };
    caer(ave, 0.1, 600, 0, 10_000);
    const primera = ave.vy;
    caer(ave, 0.1, 600, 0, 10_000);
    expect(ave.vy).toBeGreaterThan(primera);
    for (let i = 0; i < 100; i += 1) caer(ave, 0.1, 600, 0, 10_000);
    expect(ave.vy).toBeCloseTo(config.ave.caidaMaxima * 600);
  });

  it('el suelo y el techo solo la frenan', () => {
    const ave = { y: 590, vy: 400 };
    caer(ave, 0.1, 600, 10, 595);
    expect(ave.y).toBe(595);
    expect(ave.vy).toBe(0);
    const arriba = { y: 12, vy: -400 };
    caer(arriba, 0.1, 600, 10, 595);
    expect(arriba.y).toBe(10);
  });

  it('el hueco siguiente cabe en pantalla y nunca pide un salto imposible', () => {
    for (let azar = 0; azar <= 1; azar += 0.1) {
      const centro = siguienteHueco(100, 150, 0, 600, azar);
      expect(centro).toBeGreaterThanOrEqual(75);
      expect(centro).toBeLessThanOrEqual(525);
      expect(Math.abs(centro - 100)).toBeLessThanOrEqual(600 * config.ave.saltoMaximoDeHueco + 1e-9);
    }
  });

  it('choca fuera del hueco y no dentro, y solo en la columna de la barrera', () => {
    expect(chocaConBarrera(100, 300, 10, 95, 40, 300, 120)).toBe(false);
    expect(chocaConBarrera(100, 245, 10, 95, 40, 300, 120)).toBe(true);
    expect(chocaConBarrera(100, 245, 10, 200, 40, 300, 120)).toBe(false);
  });

  it('el nivel estrecha el hueco, acelera y hace moverse las barreras', () => {
    const primero = dificultadDeAve(1, 1);
    const ultimo = dificultadDeAve(5, 5);
    expect(ultimo.hueco).toBeLessThan(primero.hueco);
    expect(ultimo.velocidad).toBeGreaterThan(primero.velocidad);
    expect(primero.aceleracion).toBe(0);
    expect(ultimo.aceleracion).toBeGreaterThan(0);
    expect(ultimo.vaiven).toBeGreaterThan(primero.vaiven);
  });
});

interface Interior {
  ave: { y: number; vy: number };
  barreras: Array<{ x: number }>;
  centroAhora(b: unknown): number;
  aveX(): number;
  radio(): number;
  anchoDeBarrera(): number;
  hueco(): number;
}

/** Vuela apuntando al centro del hueco de la barrera que viene. */
function volarBien(juego: JuegoFalso, ms: number): void {
  const dentro = juego.instancia as unknown as Interior;
  for (let t = 0; t < ms; t += 16) {
    const proxima = dentro.barreras.find((b) => b.x + dentro.anchoDeBarrera() >= dentro.aveX() - dentro.radio());
    const objetivo = proxima ? dentro.centroAhora(proxima) + dentro.hueco() * 0.12 : 350;
    if (dentro.ave.y > objetivo && dentro.ave.vy >= 0) juego.tecla(' ');
    juego.avanzar(16);
  }
}

describe('partida del ave', () => {
  it('quien apunta al hueco pasa casi todas las barreras', () => {
    const juego = montarJuego('ave', 'lentes', { mundo: 2, nivel: 2 });
    volarBien(juego, 45_000);
    const medidos = juego.ensayos.filter((e) => !e.esEnsayoDeConfianza);
    expect(medidos.length).toBeGreaterThan(8);
    const aciertos = medidos.filter((e) => e.acierto).length;
    expect(aciertos / medidos.length).toBeGreaterThan(0.85);
    expect(juego.ensayos.every((e) => e.parametro === 'contraste')).toBe(true);
  });

  it('en lentes solo se pintan los cuatro colores permitidos', () => {
    const juego = montarJuego('ave', 'lentes', { mundo: 5, nivel: 5 });
    volarBien(juego, 20_000);
    expect(coloresProhibidos(juego.lienzo)).toEqual([]);
  });

  it('sin aletear, choca, atraviesa como fantasma y sigue hasta el final', () => {
    const juego = montarJuego('ave', 'lentes');
    juego.avanzar(40_000);
    expect(juego.ensayos.length).toBeGreaterThan(3);
    expect(juego.ensayos.some((e) => !e.acierto)).toBe(true);
    expect(juego.fin()).toBeNull();
    juego.avanzar(config.ave.duracionNivelSeg * 1000);
    expect(juego.fin()).not.toBeNull();
    juego.instancia.destruir();
    expect(juego.oyentesVivos()).toBe(0);
  });

  it('un toque en la pantalla también aletea', () => {
    const juego = montarJuego('ave', 'lentes');
    juego.tocar(500, 400);
    const dentro = juego.instancia as unknown as Interior;
    expect(dentro.ave.vy).toBeLessThan(0);
  });
});
