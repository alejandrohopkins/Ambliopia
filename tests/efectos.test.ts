/**
 * Efectos de acierto dentro de los juegos: salen justo después de anotar el
 * ensayo y, en modo lentes, solo con los cuatro colores permitidos.
 */
import { describe, expect, it } from 'vitest';
import { config } from '../src/config';
import type { Mosaico } from '../src/games/mosaicos/patrones';
import { montarJuego } from './ayudas/juegoFalso';
import { coloresProhibidos } from './ayudas/cuatroColores';

describe('efectos de acierto en lentes', () => {
  it('Minero: el cristal encontrado vuela al contador sin salirse de los cuatro colores', () => {
    const juego = montarJuego('minero', 'lentes');
    juego.avanzar(500);
    const dentro = juego.instancia as unknown as {
      ensayo: { bloque: number } | null;
      cursor: number;
      revelaAcierto: boolean;
    };
    dentro.cursor = dentro.ensayo!.bloque;
    juego.tecla('Enter');
    expect(juego.ensayos.at(-1)?.acierto).toBe(true);
    expect(dentro.revelaAcierto).toBe(true);
    juego.avanzar(config.minero.resaltarFalloMs / 6);
    expect(coloresProhibidos(juego.lienzo)).toEqual([]);
  });

  it('Mosaicos: la onda de la pieza acertada va en el gris de los dos ojos', () => {
    const juego = montarJuego('mosaicos', 'lentes');
    juego.avanzar(config.modulos.ayudaSeg * 1000 + 20);
    const dentro = juego.instancia as unknown as {
      ensayo: { mosaico: Mosaico; revelarHastaMs: number | null };
    };
    const correcta = dentro.ensayo.mosaico.giros[dentro.ensayo.mosaico.falta];
    juego.tecla(String(correcta + 1));
    expect(juego.ensayos[0].acierto).toBe(true);
    juego.avanzar(config.modulos.ondaMs / 2);
    expect(dentro.ensayo.revelarHastaMs).not.toBeNull();
    expect(coloresProhibidos(juego.lienzo)).toEqual([]);
  });

  it('Serpiente: las migas de la manzana van en el color del ojo ambliope', () => {
    const juego = montarJuego('serpiente', 'lentes');
    const dentro = juego.instancia as unknown as {
      manzana: { celda: [number, number] } | null;
      serpiente: { cuerpo: Array<[number, number]>; direccion: string };
      bocados: unknown[];
    };
    juego.avanzar(config.modulos.ayudaSeg * 1000 + 20);
    // La manzana, justo delante de la cabeza: el próximo paso se la come.
    const [c, f] = dentro.serpiente.cuerpo[0];
    const delante: Record<string, [number, number]> = {
      derecha: [c + 1, f],
      izquierda: [c - 1, f],
      arriba: [c, f - 1],
      abajo: [c, f + 1],
    };
    dentro.manzana!.celda = delante[dentro.serpiente.direccion];
    for (let t = 0; t < 2000 && dentro.bocados.length === 0; t += 16) juego.avanzar(16);
    expect(dentro.bocados.length).toBeGreaterThan(0);
    expect(juego.ensayos.at(-1)?.acierto).toBe(true);
    juego.avanzar(config.serpiente.bocadoMs / 3);
    expect(coloresProhibidos(juego.lienzo)).toEqual([]);
  });
});
