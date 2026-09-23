/**
 * Pozo de bloques: el pozo, las colocaciones y partidas en modo lentes.
 */
import { describe, it, expect } from 'vitest';
import { config } from '../src/config';
import {
  PIEZAS_DEL_POZO,
  cabe,
  colocar,
  dificultadDePozo,
  filaDeAterrizaje,
  hundir,
  huecosTapados,
  pozoVacio,
  type Pozo,
} from '../src/games/pozo/rejilla';
import type { Celda } from '../src/games/torre/piezas';
import { montarJuego, type JuegoFalso } from './ayudas/juegoFalso';
import { coloresProhibidos } from './ayudas/cuatroColores';

const BARRA: Celda[] = [
  [0, 0],
  [0, 1],
  [0, 2],
  [0, 3],
];
const CUADRO: Celda[] = [
  [0, 0],
  [0, 1],
  [1, 0],
  [1, 1],
];

/** Pozo con filas dibujadas de abajo arriba: '#' lleno, '.' vacío. */
function pozoCon(filas: string[]): Pozo {
  const cols = filas[0].length;
  const pozo = pozoVacio(cols, 8);
  filas.forEach((fila, f) => [...fila].forEach((c, col) => (pozo.ocupado[f * cols + col] = c === '#')));
  return pozo;
}

describe('el pozo', () => {
  it('tiene las siete piezas de cuatro cuadrados', () => {
    expect(PIEZAS_DEL_POZO).toHaveLength(7);
    for (const pieza of PIEZAS_DEL_POZO) expect(pieza.giros[0]).toHaveLength(4);
  });

  it('las paredes y el suelo no dejan pasar; por encima del borde, sí', () => {
    const pozo = pozoVacio(6, 8);
    expect(cabe(pozo, BARRA, 0, 0)).toBe(true);
    expect(cabe(pozo, BARRA, 3, 0)).toBe(false);
    expect(cabe(pozo, BARRA, -1, 0)).toBe(false);
    expect(cabe(pozo, BARRA, 0, -1)).toBe(false);
    expect(cabe(pozo, BARRA, 0, 9)).toBe(true);
  });

  it('una pieza cae hasta apoyarse', () => {
    const pozo = pozoCon(['##....']);
    expect(filaDeAterrizaje(pozo, CUADRO, 0, 6)).toBe(1);
    expect(filaDeAterrizaje(pozo, CUADRO, 2, 6)).toBe(0);
  });

  it('completar una fila la quita y es buena colocación', () => {
    const pozo = pozoCon(['##..##']);
    const resultado = colocar(pozo, CUADRO, 2, 0);
    expect(resultado.filas).toEqual([0]);
    expect(resultado.buena).toBe(true);
    // Queda la mitad de arriba del cuadro, bajada una fila.
    expect(resultado.pozo.ocupado.slice(0, 6)).toEqual([false, false, true, true, false, false]);
  });

  it('tapar un hueco es mala colocación; apoyarse limpio, buena', () => {
    const pozo = pozoCon(['#.....']);
    // La barra tumbada encima del bloque deja huecos debajo.
    expect(colocar(pozo, BARRA, 0, 1).buena).toBe(false);
    expect(colocar(pozo, BARRA, 1, 0).buena).toBe(true);
    expect(huecosTapados(colocar(pozo, BARRA, 0, 1).pozo)).toBe(3);
  });

  it('cuando se llena, el fondo se hunde y deja sitio', () => {
    const lleno = pozoVacio(4, 6);
    lleno.ocupado.fill(true);
    lleno.ocupado[0] = false;
    const hundido = hundir(lleno, 4);
    const ocupadas = hundido.ocupado.filter(Boolean).length;
    expect(ocupadas).toBe(4 * 2);
    expect(cabe(hundido, BARRA, 0, 5)).toBe(true);
  });

  it('el nivel acelera la caída, quita la siguiente y trae giros por sorpresa', () => {
    const primero = dificultadDePozo(1, 1);
    const ultimo = dificultadDePozo(5, 5);
    expect(ultimo.velocidad).toBeGreaterThan(primero.velocidad);
    expect(primero.conSiguiente).toBe(true);
    expect(ultimo.conSiguiente).toBe(false);
    expect(primero.giroSorpresa).toBe(0);
    expect(ultimo.giroSorpresa).toBeGreaterThan(0);
  });
});

/** Juega pulsando teclas al azar y soltando piezas. */
function jugarAlAzar(juego: JuegoFalso, ms: number): void {
  const teclas = ['ArrowLeft', 'ArrowRight', 'ArrowUp', ' '];
  let i = 0;
  for (let t = 0; t < ms; t += 16) {
    if (t % 160 === 0) juego.tecla(teclas[i++ % teclas.length]);
    juego.avanzar(16);
  }
}

describe('partida del pozo', () => {
  it('en lentes solo se pintan los cuatro colores permitidos', () => {
    const juego = montarJuego('pozo', 'lentes', { mundo: 2, nivel: 3 });
    jugarAlAzar(juego, 20_000);
    expect(juego.lienzo.pintados.length).toBeGreaterThan(1000);
    expect(coloresProhibidos(juego.lienzo)).toEqual([]);
    expect(juego.lienzo.llamadas).not.toContain('drawImage');
  });

  it('cada pieza colocada es un ensayo con la luminancia de la pieza', () => {
    const juego = montarJuego('pozo', 'lentes');
    jugarAlAzar(juego, 30_000);
    expect(juego.ensayos.length).toBeGreaterThan(10);
    for (const ensayo of juego.ensayos) {
      expect(ensayo.parametro).toBe('contraste');
      expect(ensayo.valor).toBeGreaterThanOrEqual(config.pozo.contrasteMinimo);
      expect(ensayo.valor).toBeLessThanOrEqual(config.pozo.contrasteMaximo);
    }
  });

  it('soltando todo sin mirar, el pozo se llena, se hunde y el juego sigue', () => {
    const juego = montarJuego('pozo', 'lentes', { mundo: 5, nivel: 5 });
    for (let t = 0; t < 60_000; t += 16) {
      if (t % 96 === 0) juego.tecla(' ');
      juego.avanzar(16);
    }
    const hundido = (juego.instancia as unknown as { hundidoMs: number | null }).hundidoMs;
    expect(hundido).not.toBeNull();
    expect(juego.fin()).toBeNull();
    juego.avanzar(config.pozo.duracionNivelSeg * 1000);
    expect(juego.fin()).not.toBeNull();
    juego.instancia.destruir();
    expect(juego.oyentesVivos()).toBe(0);
  });

  it('los botones en pantalla mueven y sueltan la pieza', () => {
    const juego = montarJuego('pozo', 'lentes');
    juego.avanzar(16);
    const interior = juego.instancia as unknown as {
      pieza: { col: number } | null;
      botones: Array<{ id: string; x: number; y: number; lado: number }>;
    };
    const boton = (id: string) => interior.botones.find((b) => b.id === id)!;
    const antes = interior.pieza!.col;
    const izquierda = boton('izquierda');
    juego.tocar(izquierda.x + 5, izquierda.y + 5);
    expect(interior.pieza!.col).toBe(antes - 1);
    const soltar = boton('soltar');
    juego.tocar(soltar.x + 5, soltar.y + 5);
    expect(juego.ensayos).toHaveLength(1);
  });
});
