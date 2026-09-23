/**
 * La Torre en modo lentes: ahora mide el brillo de la pieza que ve el ojo
 * ambliope, sin romper la regla de los cuatro colores.
 */
import { describe, it, expect } from 'vitest';
import { config } from '../src/config';
import { montarJuego } from './ayudas/juegoFalso';
import { coloresProhibidos } from './ayudas/cuatroColores';

describe('Torre en lentes', () => {
  it('cada pieza es un ensayo con el brillo que pide la escalera', () => {
    const juego = montarJuego('torre', 'lentes', { mundo: 2, nivel: 1 });
    const teclas = ['ArrowLeft', 'ArrowUp', 'ArrowRight', ' '];
    for (let t = 0; t < 40_000 && !juego.fin(); t += 16) {
      if (t % 400 === 0) juego.tecla(teclas[(t / 400) % teclas.length]);
      juego.avanzar(16);
    }
    // Soltando al azar se tapan huecos pronto y el nivel se cierra a medias.
    expect(juego.ensayos.length).toBeGreaterThan(2);
    for (const ensayo of juego.ensayos) {
      expect(ensayo.parametro).toBe('contraste');
      expect(ensayo.valor).toBeGreaterThanOrEqual(config.torre.brilloPiezaLentesMinimo);
      expect(ensayo.valor).toBeLessThanOrEqual(config.torre.brilloPiezaLentesMaximo);
    }
  });

  it('con la pieza más tenue solo se pintan los cuatro colores permitidos', () => {
    const juego = montarJuego('torre', 'lentes', { mundo: 3, nivel: 2 });
    const [escalera] = Object.values(juego.escaleras);
    // Muchos aciertos seguidos la llevan al brillo mínimo.
    for (let i = 0; i < 40; i += 1) escalera.record(true);
    for (let t = 0; t < 15_000; t += 16) {
      if (t % 480 === 0) juego.tecla(' ');
      juego.avanzar(16);
    }
    expect(coloresProhibidos(juego.lienzo)).toEqual([]);
  });
});
