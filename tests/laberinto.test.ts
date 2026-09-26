/**
 * Laberinto de trazado: generación, solución, muros y partidas simuladas.
 */
import { describe, it, expect } from 'vitest';
import { config } from '../src/config';
import { crearAleatorio } from '../src/engine/rng';
import {
  caminoMasCorto,
  circuloTocaCaja,
  controles,
  dificultadDeLaberinto,
  generarLaberinto,
  muros,
  pasillosRectos,
  trayectoTocaMuro,
  vecinosAbiertos,
  type Celda,
  type Laberinto,
} from '../src/games/laberinto/mapa';
import { puntoDelRecorrido } from '../src/games/laberinto/Laberinto';
import { montarJuego, type JuegoFalso } from './ayudas/juegoFalso';

describe('el laberinto', () => {
  it('es perfecto: todo se alcanza y hay un solo camino entre dos celdas', () => {
    for (let semilla = 1; semilla <= 20; semilla += 1) {
      const lab = generarLaberinto(9, 6, crearAleatorio(semilla));
      const abiertos = [...lab.derecha, ...lab.abajo].filter(Boolean).length;
      // Un árbol que une n celdas tiene n − 1 pasos.
      expect(abiertos).toBe(9 * 6 - 1);
      const visto = new Set<string>(['0,0']);
      const cola: Celda[] = [[0, 0]];
      while (cola.length) {
        for (const v of vecinosAbiertos(lab, cola.shift()!)) {
          if (!visto.has(`${v}`)) {
            visto.add(`${v}`);
            cola.push(v);
          }
        }
      }
      expect(visto.size).toBe(9 * 6);
    }
  });

  it('el camino más corto va de la salida a la meta por pasos abiertos', () => {
    const lab = generarLaberinto(8, 5, crearAleatorio(4));
    const camino = caminoMasCorto(lab, [0, 4], [7, 0]);
    expect(camino[0]).toEqual([0, 4]);
    expect(camino[camino.length - 1]).toEqual([7, 0]);
    for (let i = 1; i < camino.length; i += 1) {
      expect(vecinosAbiertos(lab, camino[i - 1])).toContainEqual(camino[i]);
    }
  });

  it('pone un control cada pocas celdas y siempre en la meta', () => {
    const camino: Celda[] = Array.from({ length: 10 }, (_, i) => [i, 0]);
    expect(controles(camino, 4)).toEqual([
      [4, 0],
      [8, 0],
      [9, 0],
    ]);
    expect(controles(camino.slice(0, 9), 4)).toEqual([
      [4, 0],
      [8, 0],
    ]);
  });

  it('el centro de una celda no toca ningún muro; el borde, sí', () => {
    const lab = generarLaberinto(5, 4, crearAleatorio(2));
    const cajas = muros(lab, { x: 0, y: 0 }, 60, 8);
    // Borde + un muro por cada paso cerrado.
    const cerrados = (5 - 1) * 4 + 5 * (4 - 1) - (5 * 4 - 1);
    expect(cajas).toHaveLength(4 + cerrados);
    for (let f = 0; f < 4; f += 1) {
      for (let c = 0; c < 5; c += 1) {
        const x = c * 60 + 30;
        const y = f * 60 + 30;
        expect(cajas.some((caja) => circuloTocaCaja(x, y, 20, caja))).toBe(false);
      }
    }
    expect(cajas.some((caja) => circuloTocaCaja(2, 30, 5, caja))).toBe(true);
  });

  it('un arrastre rápido no puede atravesar una pared', () => {
    const pared = [{ x: 100, y: 0, ancho: 4, alto: 200 }];
    expect(trayectoTocaMuro({ x: 50, y: 100 }, { x: 150, y: 100 }, 5, pared)).not.toBeNull();
    expect(trayectoTocaMuro({ x: 50, y: 100 }, { x: 80, y: 100 }, 5, pared)).toBeNull();
  });

  it('los pasillos rectos son rectos, abiertos y largos', () => {
    const lab = generarLaberinto(12, 7, crearAleatorio(9));
    const rectos = pasillosRectos(lab, 3);
    expect(rectos.length).toBeGreaterThan(0);
    for (const { desde, hasta } of rectos) {
      const horizontal = desde[1] === hasta[1];
      expect(horizontal || desde[0] === hasta[0]).toBe(true);
      const largo = horizontal ? hasta[0] - desde[0] + 1 : hasta[1] - desde[1] + 1;
      expect(largo).toBeGreaterThanOrEqual(3);
      const camino = caminoMasCorto(lab, desde, hasta);
      expect(camino).toHaveLength(largo);
    }
  });

  it('el nivel estrecha el pasillo y trae obstáculos y reloj', () => {
    const primero = dificultadDeLaberinto(1, 1);
    const ultimo = dificultadDeLaberinto(5, 5);
    expect(ultimo.pasillo).toBeLessThan(primero.pasillo);
    expect(ultimo.muro).toBeLessThan(primero.muro);
    expect(primero.obstaculos).toBe(0);
    expect(ultimo.obstaculos).toBeGreaterThan(0);
    expect(ultimo.limiteSeg).toBeGreaterThan(0);
  });
});

interface Interior {
  lab: Laberinto;
  punto: { x: number; y: number };
  centroDe(c: Celda): { x: number; y: number };
  celdaDe(p: { x: number; y: number }): Celda;
}

function interior(juego: JuegoFalso): Interior {
  return juego.instancia as unknown as Interior;
}

/** Lleva el punto con el dedo por el camino correcto, celda a celda. */
function recorrer(juego: JuegoFalso, celdas: number): void {
  for (let i = 0; i < celdas; i += 1) {
    const dentro = interior(juego);
    const { lab } = dentro;
    const actual = dentro.celdaDe(dentro.punto);
    const camino = caminoMasCorto(lab, actual, [lab.cols - 1, 0]);
    const destino = dentro.centroDe(camino[1] ?? actual);
    const desde = { ...dentro.punto };
    juego.tocar(desde.x, desde.y);
    for (let paso = 1; paso <= 10; paso += 1) {
      juego.arrastrar(desde.x + ((destino.x - desde.x) * paso) / 10, desde.y + ((destino.y - desde.y) * paso) / 10);
    }
    juego.soltar(destino.x, destino.y);
    juego.avanzar(16);
  }
}

describe('partida del laberinto', () => {
  it('quien sigue los pasillos sin rozar acierta cada tramo y cambia de laberinto', () => {
    const juego = montarJuego('laberinto', 'parche', { mundo: 2, nivel: 3 });
    const primero = interior(juego).lab;
    recorrer(juego, 80);
    expect(juego.ensayos.length).toBeGreaterThan(8);
    expect(juego.ensayos.every((e) => e.acierto && e.parametro === 'contraste' && e.valor > 0)).toBe(true);
    expect(interior(juego).lab).not.toBe(primero);
  });

  it('tocar una pared es un fallo y el punto vuelve al último control', () => {
    const juego = montarJuego('laberinto', 'parche');
    const dentro = interior(juego);
    const salida = { ...dentro.punto };
    juego.tocar(salida.x, salida.y);
    // Hacia abajo solo hay borde: el punto choca.
    juego.arrastrar(salida.x, salida.y + 200);
    expect(juego.ensayos).toHaveLength(1);
    expect(juego.ensayos[0].acierto).toBe(false);
    expect(interior(juego).punto).toEqual(salida);
  });

  it('tras chocar lejos del control, el punto vuelve deslizándose por el pasillo', () => {
    const juego = montarJuego('laberinto', 'parche');
    const salida = { ...interior(juego).punto };
    recorrer(juego, 2);
    const dentro = interior(juego);
    const antes = { ...dentro.punto };
    const celda = dentro.celdaDe(antes);
    // Una dirección sin paso desde esta celda: por ahí hay muro.
    const pared = ([[1, 0], [-1, 0], [0, 1], [0, -1]] as const).find(([dx, dy]) => {
      const vecina: Celda = [celda[0] + dx, celda[1] + dy];
      const dentroDelMapa = vecina[0] >= 0 && vecina[1] >= 0 && vecina[0] < dentro.lab.cols && vecina[1] < dentro.lab.filas;
      return !dentroDelMapa || caminoMasCorto(dentro.lab, celda, vecina).length !== 2;
    })!;
    const ensayos = juego.ensayos.length;
    juego.tocar(antes.x, antes.y);
    juego.arrastrar(antes.x + pared[0] * 200, antes.y + pared[1] * 200);
    expect(juego.ensayos).toHaveLength(ensayos + 1);
    expect(juego.ensayos.at(-1)!.acierto).toBe(false);

    // Todavía no está en el control: va de camino.
    juego.avanzar(config.laberinto.vueltaMs / 2);
    const aMedias = interior(juego).punto;
    expect(aMedias).not.toEqual(salida);
    expect(Math.hypot(aMedias.x - salida.x, aMedias.y - salida.y)).toBeLessThan(
      Math.hypot(antes.x - salida.x, antes.y - salida.y),
    );
    juego.avanzar(config.laberinto.vueltaMs);
    expect(interior(juego).punto).toEqual(salida);
  });

  it('el recorrido de vuelta avanza por lo andado, tramo a tramo', () => {
    const camino = [
      { x: 0, y: 0 },
      { x: 10, y: 0 },
      { x: 10, y: 30 },
    ];
    expect(puntoDelRecorrido(camino, 0)).toEqual({ x: 0, y: 0 });
    expect(puntoDelRecorrido(camino, 0.25)).toEqual({ x: 10, y: 0 });
    expect(puntoDelRecorrido(camino, 0.5)).toEqual({ x: 10, y: 10 });
    expect(puntoDelRecorrido(camino, 1)).toEqual({ x: 10, y: 30 });
  });

  it('con el teclado el punto también avanza y también choca', () => {
    const juego = montarJuego('laberinto', 'parche');
    juego.tecla('ArrowDown');
    juego.avanzar(3000);
    juego.tecla('ArrowDown', false);
    expect(juego.ensayos.some((e) => !e.acierto)).toBe(true);
  });

  it('termina a su hora y suelta todos sus oyentes', () => {
    const juego = montarJuego('laberinto', 'parche', { mundo: 5, nivel: 5 });
    juego.avanzar(config.laberinto.duracionNivelSeg * 1000 + 50);
    expect(juego.fin()).not.toBeNull();
    // Con reloj por tramo, aunque nadie juegue hay ensayos: los tramos vencidos.
    expect(juego.ensayos.length).toBeGreaterThan(0);
    juego.instancia.destruir();
    expect(juego.oyentesVivos()).toBe(0);
  });
});
