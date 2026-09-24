import { beforeAll, describe, expect, it } from 'vitest';
import type { IdJuego } from '../src/config';
import { teclaDe } from '../src/games/comun';
import { montarJuego } from './ayudas/juegoFalso';

const evento = (key: string) => ({ key }) as unknown as Event;

beforeAll(() => {
  // El detector de patrones pasa cada parche a un lienzo aparte.
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

describe('Teclas gemelas', () => {
  it('Z vale lo mismo que Enter y X lo mismo que la barra espaciadora', () => {
    expect(teclaDe(evento('z'))).toBe('Enter');
    expect(teclaDe(evento('Z'))).toBe('Enter');
    expect(teclaDe(evento('x'))).toBe(' ');
    expect(teclaDe(evento('X'))).toBe(' ');
    expect(teclaDe(evento('Enter'))).toBe('Enter');
    expect(teclaDe(evento('ArrowLeft'))).toBe('ArrowLeft');
    expect(teclaDe(evento('a'))).toBe('a');
  });

  /** Lo que se dibuja justo después de pulsar una tecla, en una partida fija. */
  function huella(juego: IdJuego, tecla: string | null): string {
    const partida = montarJuego(juego, 'parche');
    partida.avanzar(5000);
    const desde = partida.lienzo.rectangulos.length;
    if (tecla !== null) partida.tecla(tecla);
    partida.avanzar(600);
    const dibujado = JSON.stringify(partida.lienzo.rectangulos.slice(desde));
    partida.instancia.destruir();
    return `${partida.ensayos.length}|${dibujado}`;
  }

  // Los juegos en los que Enter y la barra espaciadora hacen algo.
  const CON_ACCION: IdJuego[] = [
    'minero',
    'saboteador',
    'torre',
    'cazador',
    'gabor',
    'pozo',
    'ave',
    'mosaicos',
  ];

  for (const juego of CON_ACCION) {
    it(`${juego}: Z hace lo que Enter y X lo que Espacio`, () => {
      const enter = huella(juego, 'Enter');
      expect(enter).not.toBe(huella(juego, null));
      expect(huella(juego, 'z')).toBe(enter);
      expect(huella(juego, 'x')).toBe(huella(juego, ' '));
    });
  }
});
