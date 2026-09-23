/**
 * Cazador de objetivos: ritmo, toques y partidas simuladas.
 */
import { describe, it, expect } from 'vitest';
import { config } from '../src/config';
import { crearAleatorio } from '../src/engine/rng';
import {
  desplazamientoDeVaiven,
  dificultadDeCazador,
  siguienteEspera,
  toqueAcierta,
} from '../src/games/cazador/ritmo';
import { montarJuego, type JuegoFalso } from './ayudas/juegoFalso';

interface Aparicion {
  col: number;
  fila: number;
  tipo: 'diana' | 'bomba';
}

function apariciones(juego: JuegoFalso): Aparicion[] {
  return (juego.instancia as unknown as { apariciones: Aparicion[] }).apariciones;
}

function centro(juego: JuegoFalso, a: Aparicion): { x: number; y: number } {
  return (juego.instancia as unknown as { centroDe(c: number, f: number): { x: number; y: number } }).centroDe(
    a.col,
    a.fila,
  );
}

describe('ritmo del cazador', () => {
  it('en los primeros niveles es un metrónomo, y después se desordena', () => {
    const aleatorio = crearAleatorio(1);
    const fijo = Array.from({ length: 10 }, () => siguienteEspera(600, 0, aleatorio));
    expect(new Set(fijo).size).toBe(1);
    const variable = Array.from({ length: 10 }, () => siguienteEspera(600, 0.8, aleatorio));
    expect(new Set(variable).size).toBeGreaterThan(5);
    expect(Math.min(...variable)).toBeGreaterThan(0);
  });

  it('el nivel acorta el tiempo visible y trae bombas y vaivén', () => {
    const primero = dificultadDeCazador(1, 1);
    const ultimo = dificultadDeCazador(5, 5);
    expect(primero.visibleMs).toBe(config.cazador.visibleMsInicial);
    expect(ultimo.visibleMs).toBe(config.cazador.visibleMsFinal);
    expect(primero.bombas).toBe(0);
    expect(ultimo.bombas).toBeGreaterThan(0);
    expect(primero.vaiven).toBe(0);
    expect(ultimo.simultaneos).toBeGreaterThan(primero.simultaneos);
  });

  it('un toque cerca vale aunque la diana sea diminuta, uno lejos no', () => {
    const tolerancia = config.cazador.toleranciaMinimaPx;
    expect(toqueAcierta(100 + tolerancia, 100, 100, 100, 6)).toBe(true);
    expect(toqueAcierta(100 + tolerancia + 2, 100, 100, 100, 6)).toBe(false);
    // Una diana grande se puede tocar en todo su círculo.
    expect(toqueAcierta(140, 100, 100, 100, 90)).toBe(true);
  });

  it('sin vaivén la rejilla no se mueve', () => {
    expect(desplazamientoDeVaiven(0, 100, 1234)).toBe(0);
    expect(Math.abs(desplazamientoDeVaiven(0.3, 100, 1500))).toBeLessThanOrEqual(30);
  });
});

describe('partida del cazador', () => {
  it('quien toca las dianas y deja las bombas acierta todo', () => {
    const juego = montarJuego('cazador', 'parche', { mundo: 5, nivel: 3 });
    for (let t = 0; t < 30_000; t += 16) {
      for (const a of apariciones(juego).filter((a) => a.tipo === 'diana')) {
        const { x, y } = centro(juego, a);
        juego.tocar(x, y);
      }
      juego.avanzar(16);
    }
    const medidos = juego.ensayos.filter((e) => !e.esEnsayoDeConfianza);
    expect(medidos.length).toBeGreaterThan(10);
    expect(medidos.every((e) => e.acierto && e.detalle === 'diana')).toBe(true);
  });

  it('tocar una bomba es un fallo; las dianas que se esconden, también', () => {
    const juego = montarJuego('cazador', 'parche', { mundo: 5, nivel: 5 });
    for (let t = 0; t < 30_000; t += 16) {
      for (const a of apariciones(juego).filter((a) => a.tipo === 'bomba')) {
        const { x, y } = centro(juego, a);
        juego.tocar(x, y);
      }
      juego.avanzar(16);
    }
    expect(juego.ensayos.some((e) => e.detalle === 'bomba' && !e.acierto)).toBe(true);
    expect(juego.ensayos.some((e) => e.detalle === 'diana' && !e.acierto)).toBe(true);
    expect(juego.ensayos.some((e) => e.acierto)).toBe(false);
  });

  it('con el teclado se mueve el cursor y se golpea el agujero', () => {
    const juego = montarJuego('cazador', 'parche');
    juego.avanzar(config.modulos.ayudaSeg * 1000 + 50);
    const [diana] = apariciones(juego);
    expect(diana).toBeDefined();
    for (let i = 0; i < diana.col; i += 1) juego.tecla('ArrowRight');
    for (let i = 0; i < diana.fila; i += 1) juego.tecla('ArrowDown');
    juego.tecla(' ');
    expect(juego.ensayos).toHaveLength(1);
    expect(juego.ensayos[0].acierto).toBe(true);
  });

  it('termina a su hora y suelta todos sus oyentes', () => {
    const juego = montarJuego('cazador', 'parche');
    juego.avanzar(config.cazador.duracionNivelSeg * 1000 + 50);
    expect(juego.fin()).not.toBeNull();
    juego.instancia.destruir();
    expect(juego.oyentesVivos()).toBe(0);
  });
});
