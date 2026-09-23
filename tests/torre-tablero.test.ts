import { describe, it, expect } from 'vitest';
import { config } from '../src/config';
import {
  aterrizaje,
  barrerEscombro,
  bloquesDelPlano,
  bloquesRestantes,
  cabe,
  celdasEn,
  colocacionesPerfectas,
  colocar,
  columnasPendientes,
  escombro,
  esDeFigura,
  figuraCompleta,
  ocupada,
  piezasQueCaben,
  tableroVacio,
  type EstadoDeTablero,
} from '../src/games/torre/tablero';
import { BLOQUE_SUELTO, piezaPorId, rotaciones } from '../src/games/torre/piezas';
import {
  bloquesPorPieza,
  escalerasDeTorre,
  piezasDelMundo,
  tableroDelMundo,
  velocidadDeCaida,
} from '../src/games/torre/Torre';
import { FIGURAS } from '../src/games/torre/figuras';
import { grisConContraste, contrasteWeber, desdeHex, formaDeColor } from '../src/engine/color';

const BLOQUE = BLOQUE_SUELTO.celdas;
const PAR = piezaPorId('par')!.celdas;

/** Deja caer una pieza desde arriba y devuelve el tablero resultante. */
function soltar(estado: EstadoDeTablero, celdas: typeof BLOQUE, col: number): EstadoDeTablero {
  const fila = aterrizaje(estado, celdas, col, estado.filas);
  return { ...estado, ocupado: colocar(estado, celdas, col, fila).ocupado };
}

describe('rejilla del tablero', () => {
  it('arranca vacía, con el plano de la figura', () => {
    const tablero = tableroVacio([1, 2, 3], 5);
    expect(tablero.cols).toBe(3);
    expect(tablero.ocupado.every((celda) => !celda)).toBe(true);
    expect(bloquesDelPlano(tablero)).toBe(6);
    expect(bloquesRestantes(tablero)).toBe(6);
    expect(figuraCompleta(tablero)).toBe(false);
  });

  it('los lados y el suelo son pared; el cielo está libre', () => {
    const tablero = tableroVacio([1, 1], 4);
    expect(ocupada(tablero, 0, -1)).toBe(true);
    expect(ocupada(tablero, 0, 2)).toBe(true);
    expect(ocupada(tablero, -1, 0)).toBe(true);
    expect(ocupada(tablero, 0, 0)).toBe(false);
    // Por encima del tablero hay sitio: ahí nacen las piezas.
    expect(ocupada(tablero, 9, 0)).toBe(false);
  });

  it('una celda es de figura si está por debajo de la altura del plano', () => {
    const tablero = tableroVacio([2, 0], 4);
    expect(esDeFigura(tablero, 0, 0)).toBe(true);
    expect(esDeFigura(tablero, 1, 0)).toBe(true);
    expect(esDeFigura(tablero, 2, 0)).toBe(false);
    expect(esDeFigura(tablero, 0, 1)).toBe(false);
  });
});

describe('caída y colisión', () => {
  it('una pieza cae hasta el suelo y la siguiente se le pone encima', () => {
    let tablero = tableroVacio([3, 3], 6);
    expect(aterrizaje(tablero, BLOQUE, 0, tablero.filas)).toBe(0);
    tablero = soltar(tablero, BLOQUE, 0);
    expect(aterrizaje(tablero, BLOQUE, 0, tablero.filas)).toBe(1);
    expect(aterrizaje(tablero, BLOQUE, 1, tablero.filas)).toBe(0);
  });

  it('una pieza ancha se apoya en la columna más alta de las que cubre', () => {
    let tablero = tableroVacio([4, 4], 6);
    tablero = soltar(tablero, BLOQUE, 0);
    tablero = soltar(tablero, BLOQUE, 0);
    // La columna 0 tiene dos bloques: el par horizontal se queda arriba.
    expect(aterrizaje(tablero, PAR, 0, tablero.filas)).toBe(2);
  });

  it('una pieza puede dejar un hueco debajo: la colisión es de verdad', () => {
    let tablero = tableroVacio([0, 0], 6);
    tablero = soltar(tablero, BLOQUE, 0);
    tablero = soltar(tablero, PAR, 0);
    // El par quedó en la fila 1 y dejó vacío el (0, 1).
    expect(ocupada(tablero, 1, 0)).toBe(true);
    expect(ocupada(tablero, 1, 1)).toBe(true);
    expect(ocupada(tablero, 0, 1)).toBe(false);
  });

  it('no cabe donde ya hay algo ni fuera de los lados', () => {
    const tablero = soltar(tableroVacio([2, 2], 5), BLOQUE, 0);
    expect(cabe(tablero, BLOQUE, 0, 0)).toBe(false);
    expect(cabe(tablero, BLOQUE, 0, 1)).toBe(true);
    expect(cabe(tablero, PAR, 1, 0)).toBe(false);
  });

  it('las celdas se llevan a su sitio del tablero', () => {
    expect(celdasEn(PAR, 2, 3)).toEqual([
      [3, 2],
      [3, 3],
    ]);
  });
});

describe('colocar una pieza', () => {
  it('acierta si todas sus celdas caen dentro del plano', () => {
    const tablero = tableroVacio([2, 2], 5);
    const resultado = colocar(tablero, PAR, 0, 0);
    expect(resultado.acierto).toBe(true);
    expect(resultado.sobran).toBe(0);
    expect(resultado.nuevasDeFigura).toBe(2);
  });

  it('falla si alguna celda queda fuera, y cuenta solo esas', () => {
    const tablero = tableroVacio([2, 0], 5);
    const resultado = colocar(tablero, PAR, 0, 0);
    expect(resultado.acierto).toBe(false);
    expect(resultado.sobran).toBe(1);
    expect(resultado.nuevasDeFigura).toBe(1);
  });

  it('avisa de las filas que quedan llenas de lado a lado', () => {
    const tablero = soltar(tableroVacio([1, 1, 1], 5), PAR, 0);
    const resultado = colocar(tablero, BLOQUE, 2, 0);
    expect(resultado.filasLlenas).toEqual([0]);
  });

  it('una fila a medias no cuenta', () => {
    const tablero = tableroVacio([1, 1, 1], 5);
    expect(colocar(tablero, PAR, 0, 0).filasLlenas).toEqual([]);
  });
});

describe('escombro', () => {
  it('es lo ocupado que no es de figura', () => {
    const tablero = soltar(tableroVacio([1, 1], 5), PAR, 0);
    expect(escombro(tablero)).toEqual([]);
    const conEscombro = soltar(tablero, PAR, 0);
    expect(escombro(conEscombro)).toEqual([
      [1, 0],
      [1, 1],
    ]);
  });

  it('barrerlo deja la figura intacta: nunca se pierde lo construido', () => {
    let tablero = soltar(tableroVacio([1, 1], 5), PAR, 0);
    tablero = soltar(tablero, PAR, 0);
    tablero = { ...tablero, ocupado: barrerEscombro(tablero) };
    expect(ocupada(tablero, 0, 0)).toBe(true);
    expect(ocupada(tablero, 0, 1)).toBe(true);
    expect(ocupada(tablero, 1, 0)).toBe(false);
    expect(figuraCompleta(tablero)).toBe(true);
  });
});

describe('progreso de la figura', () => {
  it('se completa cuando cada columna llega a su altura', () => {
    let tablero = tableroVacio([1, 2], 5);
    tablero = soltar(tablero, BLOQUE, 0);
    expect(figuraCompleta(tablero)).toBe(false);
    expect(columnasPendientes(tablero)).toEqual([1]);
    tablero = soltar(tablero, BLOQUE, 1);
    tablero = soltar(tablero, BLOQUE, 1);
    expect(figuraCompleta(tablero)).toBe(true);
    expect(bloquesRestantes(tablero)).toBe(0);
    expect(columnasPendientes(tablero)).toEqual([]);
  });
});

describe('piezas que todavía caben', () => {
  it('una colocación perfecta deja la pieza entera dentro del plano', () => {
    const tablero = tableroVacio([2, 2, 0], 6);
    const buenas = colocacionesPerfectas(piezaPorId('par')!, tablero);
    expect(buenas.length).toBeGreaterThan(0);
    for (const { celdas, col, fila } of buenas) {
      for (const [f, c] of celdasEn(celdas, col, fila)) {
        expect(esDeFigura(tablero, f, c)).toBe(true);
      }
    }
  });

  it('descarta las piezas que ya no caben en lo que falta', () => {
    // Solo falta una celda: ni el par ni nada mayor entra entero.
    let tablero = tableroVacio([2, 1], 6);
    tablero = soltar(tablero, BLOQUE, 0);
    tablero = soltar(tablero, BLOQUE, 1);
    const caben = piezasQueCaben(
      [BLOQUE_SUELTO, piezaPorId('par')!, piezaPorId('cuadro')!],
      tablero,
    );
    expect(caben.map((p) => p.id)).toEqual(['bloque']);
  });

  it('con la figura terminada ya no cabe ninguna', () => {
    const tablero = soltar(tableroVacio([1], 4), BLOQUE, 0);
    expect(piezasQueCaben([BLOQUE_SUELTO], tablero)).toEqual([]);
  });

  it('tiene en cuenta los giros: el par de pie cabe en una torre estrecha', () => {
    const tablero = tableroVacio([2], 6);
    const buenas = colocacionesPerfectas(piezaPorId('par')!, tablero);
    expect(buenas.length).toBeGreaterThan(0);
    // En un tablero de una sola columna, la única forma es de pie.
    expect(rotaciones(piezaPorId('par')!)[buenas[0].rotacion]).toEqual([
      [0, 0],
      [1, 0],
    ]);
  });
});

/**
 * Criterio de la fase 6, ahora con piezas de verdad: toda figura tiene que
 * poder construirse entera con las piezas que ofrece su mundo. El solucionador
 * juega como el juego: pide las piezas que caben y las coloca perfectas.
 */
describe('todas las figuras se pueden terminar con las piezas de su mundo', () => {
  it('un jugador que siempre coloca bien termina cada figura', () => {
    for (const figura of FIGURAS) {
      const { filas } = tableroDelMundo(figura.mundo);
      const catalogo = piezasDelMundo(figura.mundo);
      let tablero = tableroVacio(figura.alturas, filas);
      let piezas = 0;

      while (!figuraCompleta(tablero) && piezas < 500) {
        const caben = piezasQueCaben(catalogo, tablero);
        const lista = caben.length > 0 ? caben : [BLOQUE_SUELTO];
        const opciones = colocacionesPerfectas(lista[0], tablero);
        expect(opciones.length, `${figura.id} se quedó sin jugada`).toBeGreaterThan(0);
        const { celdas, col, fila } = opciones[0];
        const resultado = colocar(tablero, celdas, col, fila);
        expect(resultado.acierto, figura.id).toBe(true);
        tablero = { ...tablero, ocupado: resultado.ocupado };
        piezas += 1;
      }

      expect(figuraCompleta(tablero), `${figura.id} no se terminó`).toBe(true);
      expect(escombro(tablero), figura.id).toEqual([]);
    }
  });

  it('las piezas grandes se usan de verdad: no todo se resuelve a bloques sueltos', () => {
    const figura = FIGURAS.find((f) => f.mundo === 4)!;
    const { filas } = tableroDelMundo(4);
    const tablero = tableroVacio(figura.alturas, filas);
    const caben = piezasQueCaben(piezasDelMundo(4), tablero);
    expect(caben.some((pieza) => pieza.tamano >= 3)).toBe(true);
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

  it('desde el primer mundo hay formas que girar', () => {
    expect(Math.max(...bloquesPorPieza(1))).toBeGreaterThan(1);
    expect(piezasDelMundo(1).some((pieza) => rotaciones(pieza).length > 1)).toBe(true);
  });

  it('las piezas se hacen más grandes con los mundos', () => {
    const mayor = (mundo: number) => Math.max(...bloquesPorPieza(mundo));
    expect(mayor(1)).toBeLessThan(mayor(2));
    // Los mundos altos dejan de regalar el bloque suelto.
    expect(bloquesPorPieza(5)).not.toContain(1);
  });

  it('la caída va de una a tres celdas por segundo', () => {
    expect(velocidadDeCaida(1, 1)).toBe(config.torre.velocidadCaidaInicialCeldasSeg);
    expect(velocidadDeCaida(5, 5)).toBe(config.torre.velocidadCaidaFinalCeldasSeg);
    expect(velocidadDeCaida(3, 1)).toBeGreaterThan(velocidadDeCaida(1, 1));
  });

  it('la caída suave es más rápida que la normal, pero no instantánea', () => {
    expect(config.torre.factorCaidaSuave).toBeGreaterThan(1);
    expect(config.torre.factorCaidaSuave).toBeLessThan(20);
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
    expect(grisConContraste(fondo, 1.0).rgb.r).toBeGreaterThan(grisConContraste(fondo, 0.2).rgb.r);
  });

  it('un contraste imposible de representar usa el paso mínimo', () => {
    const fondo = desdeHex('#14203A');
    const resultado = grisConContraste(fondo, 0.0001);
    expect(contrasteWeber(resultado.rgb, fondo)).not.toBe(0);
  });
});
