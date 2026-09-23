/**
 * Piezas con forma de la Torre: giros, tamaños y que ninguna se rompa.
 */
import { describe, it, expect } from 'vitest';
import {
  BLOQUE_SUELTO,
  PIEZAS,
  altoDe,
  anchoDe,
  normalizar,
  piezaPorId,
  piezasDeTamanos,
  rotaciones,
  rotar,
  type Celda,
} from '../src/games/torre/piezas';

/** ¿Todas las celdas se tocan por un lado? Una pieza no puede ir suelta. */
function conectada(celdas: Celda[]): boolean {
  const clave = ([f, c]: Celda) => `${f},${c}`;
  const pendientes = new Set(celdas.map(clave));
  const cola: Celda[] = [celdas[0]];
  pendientes.delete(clave(celdas[0]));

  while (cola.length > 0) {
    const [f, c] = cola.pop()!;
    for (const vecina of [
      [f + 1, c],
      [f - 1, c],
      [f, c + 1],
      [f, c - 1],
    ] as Celda[]) {
      if (pendientes.delete(clave(vecina))) cola.push(vecina);
    }
  }
  return pendientes.size === 0;
}

describe('catálogo de piezas', () => {
  it('los identificadores no se repiten', () => {
    expect(new Set(PIEZAS.map((p) => p.id)).size).toBe(PIEZAS.length);
  });

  it('el tamaño declarado es el número de celdas', () => {
    for (const pieza of PIEZAS) {
      expect(pieza.celdas, pieza.id).toHaveLength(pieza.tamano);
    }
  });

  it('ninguna pieza repite celdas', () => {
    for (const pieza of PIEZAS) {
      const claves = pieza.celdas.map(([f, c]) => `${f},${c}`);
      expect(new Set(claves).size, pieza.id).toBe(pieza.celdas.length);
    }
  });

  it('todas las piezas son de una sola pieza, sin celdas sueltas', () => {
    for (const pieza of PIEZAS) {
      expect(conectada(pieza.celdas), pieza.id).toBe(true);
    }
  });

  it('hay piezas de uno, dos, tres y cuatro', () => {
    for (const tamano of [1, 2, 3, 4]) {
      expect(piezasDeTamanos([tamano]).length, `tamaño ${tamano}`).toBeGreaterThan(0);
    }
  });

  it('el bloque suelto es la pieza de una celda', () => {
    expect(BLOQUE_SUELTO.tamano).toBe(1);
    expect(piezaPorId('bloque')).toBe(BLOQUE_SUELTO);
    expect(piezaPorId('no-existe')).toBeUndefined();
  });

  it('las siete formas de cuatro celdas están todas', () => {
    expect(piezasDeTamanos([4]).map((p) => p.id).sort()).toEqual(
      ['barra', 'cuadro', 'ele', 'ese', 'jota', 'te', 'zeta'].sort(),
    );
  });
});

describe('girar una pieza', () => {
  it('normalizar lleva la forma a la esquina', () => {
    expect(normalizar([[3, 5], [4, 5]])).toEqual([[0, 0], [1, 0]]);
  });

  it('cuatro giros devuelven la pieza a su sitio', () => {
    for (const pieza of PIEZAS) {
      let celdas = normalizar(pieza.celdas);
      for (let i = 0; i < 4; i += 1) celdas = rotar(celdas);
      expect(celdas, pieza.id).toEqual(normalizar(pieza.celdas));
    }
  });

  it('girar conserva el número de celdas y la conexión', () => {
    for (const pieza of PIEZAS) {
      for (const celdas of rotaciones(pieza)) {
        expect(celdas, pieza.id).toHaveLength(pieza.tamano);
        expect(conectada(celdas), pieza.id).toBe(true);
      }
    }
  });

  it('cada pieza tiene las posiciones distintas que le tocan', () => {
    const esperado: Record<string, number> = {
      bloque: 1,
      cuadro: 1,
      par: 2,
      trio: 2,
      barra: 2,
      ese: 2,
      zeta: 2,
      esquina: 4,
      te: 4,
      ele: 4,
      jota: 4,
    };
    for (const pieza of PIEZAS) {
      expect(rotaciones(pieza).length, pieza.id).toBe(esperado[pieza.id]);
    }
  });

  it('girar la barra la pone de pie y al revés la tumba', () => {
    const barra = piezaPorId('barra')!;
    const [tumbada, depie] = rotaciones(barra);
    expect(anchoDe(tumbada)).toBe(4);
    expect(altoDe(tumbada)).toBe(1);
    expect(anchoDe(depie)).toBe(1);
    expect(altoDe(depie)).toBe(4);
  });

  it('la esquina gira a sus cuatro orientaciones y todas son distintas', () => {
    const giros = rotaciones(piezaPorId('esquina')!);
    const claves = giros.map((celdas) => JSON.stringify(celdas));
    expect(new Set(claves).size).toBe(4);
  });
});
