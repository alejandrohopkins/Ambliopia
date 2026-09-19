/**
 * Prueba obligatoria de la fase 6: todas las figuras tienen que poder
 * construirse por gravedad y caber en el tablero de su mundo.
 */
import { describe, it, expect } from 'vitest';
import { config } from '../src/config';
import {
  FIGURAS,
  figurasDelMundo,
  figuraDeNivel,
  figuraPorId,
  bloquesDeFigura,
} from '../src/games/torre/figuras';
import { es } from '../src/i18n/es';

function tableroDe(mundo: number) {
  const lista = config.torre.tablerosPorMundo;
  return lista[Math.max(0, Math.min(lista.length - 1, mundo - 1))];
}

describe('figuras de la Torre', () => {
  it('hay cinco figuras por mundo, veinticinco en total', () => {
    expect(FIGURAS).toHaveLength(
      config.progresion.mundos * config.progresion.nivelesPorMundo,
    );
    for (let mundo = 1; mundo <= config.progresion.mundos; mundo += 1) {
      expect(figurasDelMundo(mundo)).toHaveLength(config.progresion.nivelesPorMundo);
    }
  });

  it('los identificadores no se repiten', () => {
    expect(new Set(FIGURAS.map((f) => f.id)).size).toBe(FIGURAS.length);
  });

  it('cada figura ocupa exactamente las columnas de su tablero', () => {
    for (const figura of FIGURAS) {
      const { cols } = tableroDe(figura.mundo);
      expect(figura.alturas, figura.id).toHaveLength(cols);
    }
  });

  it('ninguna figura pasa de filas menos dos de altura', () => {
    for (const figura of FIGURAS) {
      const { filas } = tableroDe(figura.mundo);
      const maxima = filas - config.torre.margenAlturaMaxima;
      for (const altura of figura.alturas) {
        expect(altura, `${figura.id} tiene una columna de ${altura}`).toBeLessThanOrEqual(maxima);
      }
    }
  });

  it('todas son construibles por gravedad: alturas enteras y no negativas', () => {
    for (const figura of FIGURAS) {
      for (const altura of figura.alturas) {
        expect(Number.isInteger(altura), figura.id).toBe(true);
        expect(altura, figura.id).toBeGreaterThanOrEqual(0);
      }
    }
  });

  it('ninguna figura está vacía', () => {
    for (const figura of FIGURAS) {
      expect(bloquesDeFigura(figura), figura.id).toBeGreaterThan(0);
    }
  });

  /**
   * Simulación directa de la gravedad: dejar caer bloques columna por columna
   * reproduce la figura exactamente, sin huecos ni voladizos.
   */
  it('dejar caer bloques columna por columna reproduce cada figura', () => {
    for (const figura of FIGURAS) {
      const { cols, filas } = tableroDe(figura.mundo);
      const tablero: boolean[][] = Array.from({ length: filas }, () =>
        Array.from({ length: cols }, () => false),
      );

      for (let columna = 0; columna < cols; columna += 1) {
        for (let i = 0; i < figura.alturas[columna]; i += 1) {
          // Un bloque cae hasta el primer hueco libre de su columna.
          let fila = 0;
          while (fila < filas && tablero[fila][columna]) fila += 1;
          expect(fila, `${figura.id} desborda la columna ${columna}`).toBeLessThan(filas);
          tablero[fila][columna] = true;
        }
      }

      for (let columna = 0; columna < cols; columna += 1) {
        const llenas = tablero.filter((fila) => fila[columna]).length;
        expect(llenas, `${figura.id} columna ${columna}`).toBe(figura.alturas[columna]);
        // Sin huecos: lo lleno está abajo y de forma continua.
        for (let fila = 0; fila < filas; fila += 1) {
          expect(tablero[fila][columna]).toBe(fila < figura.alturas[columna]);
        }
      }
    }
  });

  it('cada figura tiene nombre visible en español', () => {
    for (const figura of FIGURAS) {
      expect(es.nombresDeFigura[figura.id], figura.id).toBeTruthy();
    }
  });

  it('cada nivel de cada mundo tiene su figura', () => {
    for (let mundo = 1; mundo <= config.progresion.mundos; mundo += 1) {
      const vistas = new Set<string>();
      for (let nivel = 1; nivel <= config.progresion.nivelesPorMundo; nivel += 1) {
        const figura = figuraDeNivel(mundo, nivel);
        expect(figura.mundo).toBe(mundo);
        vistas.add(figura.id);
      }
      expect(vistas.size).toBe(config.progresion.nivelesPorMundo);
    }
  });

  it('se puede recuperar una figura por su identificador', () => {
    expect(figuraPorId('faro')?.mundo).toBe(3);
    expect(figuraPorId('no-existe')).toBeUndefined();
  });

  it('las figuras crecen en tamaño con los mundos', () => {
    const medias = [1, 2, 3, 4, 5].map((mundo) => {
      const delMundo = figurasDelMundo(mundo);
      return delMundo.reduce((t, f) => t + bloquesDeFigura(f), 0) / delMundo.length;
    });
    expect(medias[0]).toBeLessThan(medias[2]);
    expect(medias[2]).toBeLessThan(medias[4]);
  });
});
