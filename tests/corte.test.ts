/**
 * Corte de precisión: vuelos, cortes y partidas simuladas.
 */
import { describe, it, expect } from 'vitest';
import { config } from '../src/config';
import { crearAleatorio } from '../src/engine/rng';
import {
  dificultadDeCorte,
  distanciaASegmento,
  lanzar,
  mover,
  seFue,
  trazoCorta,
} from '../src/games/corte/vuelo';
import { montarJuego, type JuegoFalso } from './ayudas/juegoFalso';

const AREA = { x: 0, y: 0, ancho: 1000, alto: 600 };

describe('vuelo de las frutas', () => {
  it('en los primeros niveles cruzan en línea recta de lado a lado', () => {
    const dificultad = dificultadDeCorte(1, 1);
    expect(dificultad.curvatura).toBe(0);
    const aleatorio = crearAleatorio(3);
    for (let i = 0; i < 20; i += 1) {
      const vuelo = lanzar(AREA, dificultad, 30, aleatorio);
      expect(vuelo.ay).toBe(0);
      let segundos = 0;
      while (!seFue(vuelo, AREA, 30) && segundos < 30) {
        mover(vuelo, 0.05);
        segundos += 0.05;
      }
      expect(segundos).toBeLessThan(30);
      // Cruzó entero: salió por el lado contrario al que entró.
      expect(vuelo.x < AREA.x || vuelo.x > AREA.ancho || vuelo.y > AREA.alto).toBe(true);
    }
  });

  it('en los últimos, suben en parábola, llegan a su cima y caen', () => {
    const dificultad = { ...dificultadDeCorte(5, 5), acelerones: false };
    const aleatorio = crearAleatorio(8);
    const vuelo = lanzar(AREA, dificultad, 20, aleatorio);
    expect(vuelo.ay).toBeGreaterThan(0);
    let cima = vuelo.y;
    while (!seFue(vuelo, AREA, 20)) {
      mover(vuelo, 0.02);
      cima = Math.min(cima, vuelo.y);
    }
    const [minima, maxima] = config.corte.cimaDeParabola;
    const subida = AREA.alto + 20 - cima;
    expect(subida).toBeGreaterThan(AREA.alto * minima * 0.95);
    expect(subida).toBeLessThan(AREA.alto * maxima * 1.05);
  });

  it('un acelerón la hace ir más rápido de golpe', () => {
    const vuelo = { x: 0, y: 300, vx: 100, vy: 0, ay: 0, aceleronEnSeg: 0.5, segundos: 0 };
    mover(vuelo, 0.4);
    expect(vuelo.vx).toBe(100);
    mover(vuelo, 0.2);
    expect(vuelo.vx).toBeCloseTo(100 * config.corte.factorDeAceleron);
  });

  it('un trazo corta si pasa por encima; quedarse quieto no corta', () => {
    const fruta = { x: 100, y: 100 };
    expect(trazoCorta({ x: 50, y: 110 }, { x: 150, y: 110 }, fruta, 15)).toBe(true);
    expect(trazoCorta({ x: 50, y: 130 }, { x: 150, y: 130 }, fruta, 15)).toBe(false);
    expect(trazoCorta({ x: 100, y: 100 }, { x: 100, y: 100 }, fruta, 15)).toBe(false);
    expect(distanciaASegmento(0, 5, -10, 0, 10, 0)).toBeCloseTo(5);
  });
});

function frutas(juego: JuegoFalso) {
  return (juego.instancia as unknown as { frutas: Array<{ vuelo: { x: number; y: number }; radio: number }> })
    .frutas;
}

describe('partida de corte', () => {
  it('quien pasa el dedo por cada fruta las corta todas', () => {
    const juego = montarJuego('corte', 'parche', { mundo: 3, nivel: 2 });
    for (let t = 0; t < 40_000; t += 16) {
      for (const fruta of frutas(juego)) {
        const { x, y } = fruta.vuelo;
        if (x < 20 || x > 1000 || y < 60 || y > 680) continue;
        juego.tocar(x - 30, y);
        juego.arrastrar(x + 30, y);
        juego.soltar(x + 30, y);
      }
      juego.avanzar(16);
    }
    const medidos = juego.ensayos.filter((e) => !e.esEnsayoDeConfianza);
    expect(medidos.length).toBeGreaterThan(8);
    expect(medidos.every((e) => e.acierto)).toBe(true);
    expect(juego.ensayos.every((e) => e.parametro === 'contraste' && e.valor > 0)).toBe(true);
  });

  it('las frutas que se van sin cortar son fallos, y no se pierde nada', () => {
    const juego = montarJuego('corte', 'parche');
    juego.avanzar(30_000);
    expect(juego.ensayos.length).toBeGreaterThan(3);
    expect(juego.ensayos.every((e) => !e.acierto)).toBe(true);
    expect(juego.fin()).toBeNull();
  });

  it('con el teclado, la hoja corta mientras se mueve', () => {
    const juego = montarJuego('corte', 'parche');
    juego.avanzar(config.modulos.ayudaSeg * 1000 + 16);
    const [fruta] = frutas(juego);
    expect(fruta).toBeDefined();
    // Se persigue la fruta con las flechas, como haría la jugadora.
    const hoja = () => (juego.instancia as unknown as { hoja: { x: number; y: number } | null }).hoja;
    for (let i = 0; i < 600 && juego.ensayos.length === 0; i += 1) {
      const { x, y } = hoja() ?? { x: 512, y: 342 };
      for (const tecla of ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown']) juego.tecla(tecla, false);
      if (fruta.vuelo.x < x - 4) juego.tecla('ArrowLeft');
      if (fruta.vuelo.x > x + 4) juego.tecla('ArrowRight');
      if (fruta.vuelo.y < y - 4) juego.tecla('ArrowUp');
      if (fruta.vuelo.y > y + 4) juego.tecla('ArrowDown');
      juego.avanzar(16);
    }
    expect(juego.ensayos[0]?.acierto).toBe(true);
  });

  it('termina a su hora y suelta todos sus oyentes', () => {
    const juego = montarJuego('corte', 'parche', { mundo: 5, nivel: 5 });
    juego.avanzar(config.corte.duracionNivelSeg * 1000 + 50);
    expect(juego.fin()).not.toBeNull();
    juego.instancia.destruir();
    expect(juego.oyentesVivos()).toBe(0);
  });
});
