import { describe, it, expect } from 'vitest';
import { config } from '../src/config';
import {
  tableroVacio,
  colocar,
  desmoronar,
  figuraCompleta,
  columnasPendientes,
  dentroDelPlano,
  bloquesRestantes,
  tamanosDePieza,
} from '../src/games/torre/tablero';
import {
  bloquesPorPieza,
  escalerasDeTorre,
  tableroDelMundo,
  velocidadDeCaida,
} from '../src/games/torre/Torre';
import { grisConContraste, contrasteWeber, desdeHex, formaDeColor } from '../src/engine/color';

describe('tablero de la Torre', () => {
  it('arranca vacío con el plano de la figura', () => {
    const tablero = tableroVacio([1, 2, 3]);
    expect(tablero.alturas).toEqual([0, 0, 0]);
    expect(bloquesRestantes(tablero)).toBe(6);
    expect(figuraCompleta(tablero)).toBe(false);
  });

  it('una pieza cae hasta el primer hueco libre de su columna', () => {
    let tablero = tableroVacio([3, 3, 3]);
    const primera = colocar(tablero, 1, 1);
    expect(primera.desde).toBe(0);
    tablero = { ...tablero, alturas: primera.alturas };
    const segunda = colocar(tablero, 1, 1);
    expect(segunda.desde).toBe(1);
    expect(segunda.alturas[1]).toBe(2);
  });

  it('acierta si todos sus bloques caen dentro del plano', () => {
    const tablero = tableroVacio([3, 1, 2]);
    expect(colocar(tablero, 0, 3).acierto).toBe(true);
    expect(colocar(tablero, 0, 2).acierto).toBe(true);
  });

  it('falla si algún bloque queda fuera, y solo sobran esos', () => {
    const tablero = tableroVacio([2, 2]);
    const resultado = colocar(tablero, 0, 3);
    expect(resultado.acierto).toBe(false);
    expect(resultado.sobran).toBe(1);
    expect(resultado.alturas[0]).toBe(3);
  });

  it('los bloques de fuera se deshacen y los de dentro se quedan', () => {
    let tablero = tableroVacio([2, 2]);
    tablero = { ...tablero, alturas: colocar(tablero, 0, 3).alturas };
    expect(tablero.alturas[0]).toBe(3);
    expect(desmoronar(tablero)).toEqual([2, 0]);
  });

  it('la figura se completa cuando cada columna llega a su altura', () => {
    let tablero = tableroVacio([1, 2]);
    tablero = { ...tablero, alturas: colocar(tablero, 0, 1).alturas };
    expect(figuraCompleta(tablero)).toBe(false);
    tablero = { ...tablero, alturas: colocar(tablero, 1, 2).alturas };
    expect(figuraCompleta(tablero)).toBe(true);
    expect(columnasPendientes(tablero)).toEqual([]);
  });

  it('sabe qué columnas faltan', () => {
    let tablero = tableroVacio([1, 2, 1]);
    tablero = { ...tablero, alturas: colocar(tablero, 1, 2).alturas };
    expect(columnasPendientes(tablero)).toEqual([0, 2]);
  });

  it('un bloque está dentro del plano según su altura', () => {
    const tablero = tableroVacio([2, 0]);
    expect(dentroDelPlano(tablero, 0, 0)).toBe(true);
    expect(dentroDelPlano(tablero, 0, 1)).toBe(true);
    expect(dentroDelPlano(tablero, 0, 2)).toBe(false);
    expect(dentroDelPlano(tablero, 1, 0)).toBe(false);
  });

  it('la pieza nunca es más grande que el hueco más alto que queda', () => {
    let tablero = tableroVacio([3, 1]);
    expect(tamanosDePieza([1, 2, 3], tablero)).toEqual([1, 2, 3]);
    tablero = { ...tablero, alturas: [2, 1] };
    // Solo falta un bloque en la primera columna.
    expect(tamanosDePieza([1, 2, 3], tablero)).toEqual([1]);
  });

  it('con el plano completo se sigue ofreciendo la pieza más pequeña', () => {
    const tablero = { plano: [1], alturas: [1] };
    expect(tamanosDePieza([1, 2], tablero)).toEqual([1]);
  });

  /** Jugar una figura entera con una estrategia sensata la termina. */
  it('una partida completa termina la figura sin bloques de más', () => {
    const plano = [3, 2, 4, 1, 5];
    let tablero = tableroVacio(plano);
    let piezas = 0;

    while (!figuraCompleta(tablero) && piezas < 200) {
      const pendientes = columnasPendientes(tablero);
      const columna = pendientes[0];
      const hueco = tablero.plano[columna] - tablero.alturas[columna];
      const bloques = Math.min(hueco, Math.max(...tamanosDePieza([1, 2, 3], tablero)));
      const resultado = colocar(tablero, columna, bloques);
      expect(resultado.acierto).toBe(true);
      tablero = { ...tablero, alturas: resultado.alturas };
      piezas += 1;
    }

    expect(figuraCompleta(tablero)).toBe(true);
    expect(tablero.alturas).toEqual(plano);
  });
});

describe('dificultad de la Torre', () => {
  it('los tableros crecen con los mundos', () => {
    const celdas = [1, 2, 3, 4, 5].map((m) => {
      const { cols, filas } = tableroDelMundo(m);
      return cols * filas;
    });
    for (let i = 1; i < celdas.length; i += 1) {
      expect(celdas[i]).toBeGreaterThanOrEqual(celdas[i - 1]);
    }
  });

  it('las piezas se hacen más largas con los mundos', () => {
    expect(bloquesPorPieza(1)).toEqual([1]);
    expect(bloquesPorPieza(2)).toEqual([1, 2]);
    expect(bloquesPorPieza(4)).toEqual([1, 2, 3]);
  });

  it('la caída va de una a tres celdas por segundo', () => {
    expect(velocidadDeCaida(1, 1)).toBe(config.torre.velocidadCaidaInicialCeldasSeg);
    expect(velocidadDeCaida(5, 5)).toBe(config.torre.velocidadCaidaFinalCeldasSeg);
    expect(velocidadDeCaida(3, 1)).toBeGreaterThan(velocidadDeCaida(1, 1));
  });

  it('en parche hay escalera de contraste del plano; en lentes no', () => {
    const parche = escalerasDeTorre('parche', 1);
    expect(parche).toHaveLength(1);
    expect(parche[0].clave).toContain('contraste');
    expect(parche[0].valorInicial).toBe(config.torre.contrastePlanoInicial);
    // En lentes el plano va en la capa del ojo dominante con el contraste de balance.
    expect(escalerasDeTorre('lentes', 1)).toEqual([]);
  });
});

describe('plano gris sobre el color del mundo', () => {
  it('produce un gris neutro, no un tono del fondo', () => {
    const fondo = desdeHex('#14203A');
    const { rgb } = grisConContraste(fondo, 0.5);
    expect(formaDeColor(rgb)).toBe('gris');
  });

  it('acierta el contraste de Weber pedido', () => {
    const fondo = desdeHex('#14203A');
    for (const pedido of [0.2, 0.5, 1.0]) {
      const { contrasteReal } = grisConContraste(fondo, pedido);
      expect(Math.abs(contrasteReal - pedido)).toBeLessThan(0.06);
    }
  });

  it('más contraste, plano más claro', () => {
    const fondo = desdeHex('#14203A');
    expect(grisConContraste(fondo, 1.0).rgb.r).toBeGreaterThan(
      grisConContraste(fondo, 0.2).rgb.r,
    );
  });

  it('un contraste imposible de representar usa el paso mínimo', () => {
    const fondo = desdeHex('#14203A');
    const resultado = grisConContraste(fondo, 0.0001);
    expect(contrasteWeber(resultado.rgb, fondo)).not.toBe(0);
  });
});
