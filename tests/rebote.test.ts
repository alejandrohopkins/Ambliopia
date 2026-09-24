/**
 * Rebote ágil: la física del rebote y partidas simuladas.
 */
import { describe, it, expect } from 'vitest';
import { config } from '../src/config';
import {
  dificultadDeRebote,
  golpeaLaPaleta,
  rebotarEnCaja,
  rebotarEnParedes,
  salidaDePaleta,
} from '../src/games/rebote/fisica';
import { montarJuego } from './ayudas/juegoFalso';

const AREA = { x: 0, y: 0, ancho: 400, alto: 300 };

describe('física del rebote', () => {
  it('rebota en las paredes y en el techo, pero no en el suelo', () => {
    const izquierda = { x: -5, y: 100, vx: -50, vy: 10 };
    rebotarEnParedes(izquierda, AREA);
    expect(izquierda.x).toBe(5);
    expect(izquierda.vx).toBe(50);

    const techo = { x: 100, y: -3, vx: 0, vy: -80 };
    rebotarEnParedes(techo, AREA);
    expect(techo.vy).toBe(80);

    const suelo = { x: 100, y: 320, vx: 0, vy: 80 };
    rebotarEnParedes(suelo, AREA);
    expect(suelo.vy).toBe(80);
  });

  it('el golpe se juzga con el centro: el tamaño de la bola no ayuda', () => {
    const ancho = 100;
    const margen = config.rebote.margenDeGolpePx;
    expect(golpeaLaPaleta(200 + ancho / 2 + margen, 200, ancho)).toBe(true);
    expect(golpeaLaPaleta(200 + ancho / 2 + margen + 1, 200, ancho)).toBe(false);
  });

  it('sale recta desde el centro y más inclinada cuanto más lejos', () => {
    const centro = salidaDePaleta(200, 200, 100, 300);
    expect(centro.vx).toBeCloseTo(0);
    expect(centro.vy).toBeCloseTo(-300);

    const borde = salidaDePaleta(250, 200, 100, 300);
    expect(borde.vx).toBeGreaterThan(0);
    expect(borde.vy).toBeLessThan(0);
    expect(Math.hypot(borde.vx, borde.vy)).toBeCloseTo(300);
    // Nunca sale tumbada: siempre sube.
    const maximo = (config.rebote.anguloMaximoGrados * Math.PI) / 180;
    expect(Math.atan2(borde.vx, -borde.vy)).toBeCloseTo(maximo);
  });

  it('un bloque la devuelve por el lado por el que entró', () => {
    const caja = { x: 100, y: 100, ancho: 60, alto: 20 };
    const desdeAbajo = { x: 130, y: 118, vx: 0, vy: -100 };
    expect(rebotarEnCaja(desdeAbajo, caja)).toBe(true);
    expect(desdeAbajo.vy).toBe(100);

    const lejos = { x: 10, y: 10, vx: 0, vy: 100 };
    expect(rebotarEnCaja(lejos, caja)).toBe(false);
  });

  it('cada nivel superado encoge la paleta en la misma proporción', () => {
    const niveles: number[] = [];
    for (let mundo = 1; mundo <= config.progresion.mundos; mundo += 1) {
      for (let nivel = 1; nivel <= config.progresion.nivelesPorMundo; nivel += 1) {
        niveles.push(dificultadDeRebote(mundo, nivel).paleta);
      }
    }
    expect(niveles[0]).toBeCloseTo(config.rebote.paletaInicial, 9);
    expect(niveles[niveles.length - 1]).toBeCloseTo(config.rebote.paletaFinal, 9);
    for (let i = 1; i < niveles.length; i += 1) {
      const recorte = 1 - niveles[i] / niveles[i - 1];
      // Un poco más del 5 % por nivel: se nota, y es igual al principio y al final.
      expect(recorte).toBeGreaterThan(0.05);
      expect(recorte).toBeLessThan(0.06);
    }
  });

  it('el nivel encoge la paleta y acelera la bola', () => {
    const primero = dificultadDeRebote(1, 1);
    const ultimo = dificultadDeRebote(5, 5);
    expect(ultimo.paleta).toBeLessThan(primero.paleta);
    expect(ultimo.velocidad).toBeGreaterThan(primero.velocidad);
    expect(ultimo.bloques).toBeGreaterThan(primero.bloques);
    expect(ultimo.bolas).toBeGreaterThanOrEqual(primero.bolas);
  });
});

describe('partida de Rebote', () => {
  it('quien sigue la bola la devuelve casi siempre', () => {
    const juego = montarJuego('rebote', 'parche', { mundo: 1, nivel: 1 });
    const bolas = () =>
      (juego.instancia as unknown as { bolas: Array<{ x: number; vy: number; vuelveEnMs: number | null }> }).bolas;
    for (let t = 0; t < 45_000; t += 16) {
      const bola = bolas().find((b) => b.vuelveEnMs === null);
      if (bola) juego.arrastrar(bola.x, 500);
      juego.avanzar(16);
    }
    const medidos = juego.ensayos.filter((e) => !e.esEnsayoDeConfianza);
    expect(medidos.length).toBeGreaterThan(5);
    expect(medidos.every((e) => e.acierto)).toBe(true);
    expect(medidos.every((e) => e.parametro === 'tamano' && e.juego === 'rebote')).toBe(true);
  });

  it('si nadie juega, la bola se escapa, vuelve a salir y nada se pierde', () => {
    const juego = montarJuego('rebote', 'parche');
    juego.tecla('ArrowLeft');
    juego.avanzar(20_000);
    expect(juego.ensayos.length).toBeGreaterThan(3);
    expect(juego.ensayos.some((e) => !e.acierto)).toBe(true);
    expect(juego.fin()).toBeNull();
  });

  it('termina a su hora y suelta todos sus oyentes', () => {
    const juego = montarJuego('rebote', 'parche', { mundo: 5, nivel: 5 });
    juego.avanzar(config.rebote.duracionNivelSeg * 1000 + 100);
    expect(juego.fin()).not.toBeNull();
    juego.instancia.destruir();
    expect(juego.oyentesVivos()).toBe(0);
  });
});
