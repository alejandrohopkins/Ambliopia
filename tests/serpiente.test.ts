/**
 * La serpiente: pasos, muros, plazos y partidas en modo lentes.
 */
import { describe, it, expect } from 'vitest';
import { config } from '../src/config';
import { crearAleatorio } from '../src/engine/rng';
import {
  PASO,
  avanzar,
  clave,
  crearMuros,
  dificultadDeSerpiente,
  distancia,
  libreDeMuros,
  puedeGirar,
  type Celda,
  type Direccion,
  type Serpiente,
  type Tablero,
} from '../src/games/serpiente/tablero';
import { montarJuego, type JuegoFalso } from './ayudas/juegoFalso';
import { coloresProhibidos } from './ayudas/cuatroColores';

const ABIERTO: Tablero = { cols: 8, filas: 6, muros: new Set() };

function serpienteEn(cuerpo: Celda[], direccion: Direccion): Serpiente {
  return { cuerpo: cuerpo.map((c) => [...c] as Celda), direccion };
}

describe('pasos de la serpiente', () => {
  it('avanza, y al comer crece una celda', () => {
    const s = serpienteEn([[2, 2], [1, 2], [0, 2]], 'derecha');
    expect(avanzar(ABIERTO, s, null, true)).toBe('avanza');
    expect(s.cuerpo).toEqual([[3, 2], [2, 2], [1, 2]]);
    expect(avanzar(ABIERTO, s, [4, 2], true)).toBe('come');
    expect(s.cuerpo).toHaveLength(4);
  });

  it('contra el borde se queda quieta, sin perder nada', () => {
    const s = serpienteEn([[7, 0], [6, 0]], 'derecha');
    expect(avanzar(ABIERTO, s, null, true)).toBe('bloqueada');
    expect(s.cuerpo).toEqual([[7, 0], [6, 0]]);
  });

  it('morderse la cola la acorta y sigue', () => {
    // Enroscada: la cabeza baja hacia su propio cuerpo.
    const s = serpienteEn([[1, 1], [2, 1], [2, 2], [1, 2], [0, 2], [0, 1], [0, 0]], 'abajo');
    expect(avanzar(ABIERTO, s, null, true)).toBe('se muerde');
    expect(s.cuerpo[0]).toEqual([1, 2]);
    expect(s.cuerpo).toEqual([[1, 2], [1, 1], [2, 1], [2, 2]]);
  });

  it('pisar la punta de la cola no es morderse: la cola se va a la vez', () => {
    const s = serpienteEn([[1, 1], [1, 2], [2, 2], [2, 1]], 'derecha');
    expect(avanzar(ABIERTO, s, null, true)).toBe('avanza');
  });

  it('no puede dar media vuelta', () => {
    expect(puedeGirar('derecha', 'izquierda')).toBe(false);
    expect(puedeGirar('derecha', 'arriba')).toBe(true);
  });
});

describe('muros y distancias', () => {
  it('los muros no tapan la salida ni cierran ningún rincón', () => {
    for (let semilla = 1; semilla <= 15; semilla += 1) {
      const reservadas: Celda[] = Array.from({ length: 24 }, (_, c) => [c, 7]);
      const muros = crearMuros(24, 14, 6, crearAleatorio(semilla), reservadas);
      const tablero: Tablero = { cols: 24, filas: 14, muros };
      for (const celda of reservadas) expect(muros.has(clave(celda))).toBe(false);
      // Todas las celdas libres se alcanzan desde la salida.
      let libres = 0;
      for (let f = 0; f < 14; f += 1) {
        for (let c = 0; c < 24; c += 1) {
          if (!libreDeMuros(tablero, [c, f])) continue;
          libres += 1;
          expect(distancia(tablero, [0, 7], [c, f], new Set())).toBeGreaterThanOrEqual(0);
        }
      }
      expect(libres).toBe(24 * 14 - muros.size);
    }
  });

  it('la distancia rodea los muros', () => {
    const tablero: Tablero = { cols: 5, filas: 5, muros: new Set(['2,0', '2,1', '2,2', '2,3']) };
    expect(distancia(tablero, [0, 0], [4, 0], new Set())).toBe(12);
    expect(distancia(ABIERTO, [0, 0], [3, 2], new Set())).toBe(5);
  });

  it('el nivel acelera, agranda el tablero, pone muros y apura la manzana', () => {
    const primero = dificultadDeSerpiente(1, 1);
    const ultimo = dificultadDeSerpiente(5, 5);
    expect(ultimo.velocidad).toBeGreaterThan(primero.velocidad);
    expect(ultimo.tablero.cols).toBeGreaterThan(primero.tablero.cols);
    expect(primero.muros).toBe(0);
    expect(ultimo.muros).toBeGreaterThan(0);
    expect(ultimo.holgura).toBeLessThan(primero.holgura);
  });
});

interface Interior {
  tablero: Tablero;
  serpiente: Serpiente;
  manzana: { celda: Celda } | null;
}

/** Elige la dirección del primer paso del camino más corto hasta la manzana. */
function rumbo(dentro: Interior): Direccion | null {
  if (!dentro.manzana) return null;
  const cabeza = dentro.serpiente.cuerpo[0];
  const cuerpo = new Set(dentro.serpiente.cuerpo.slice(0, -1).map(clave));
  let mejor: Direccion | null = null;
  let menor = Infinity;
  for (const [nombre, [dc, df]] of Object.entries(PASO) as Array<[Direccion, Celda]>) {
    const vecina: Celda = [cabeza[0] + dc, cabeza[1] + df];
    if (!libreDeMuros(dentro.tablero, vecina) || cuerpo.has(clave(vecina))) continue;
    const d = distancia(dentro.tablero, vecina, dentro.manzana.celda, cuerpo);
    if (d >= 0 && d < menor && puedeGirar(dentro.serpiente.direccion, nombre)) {
      menor = d;
      mejor = nombre;
    }
  }
  return mejor;
}

const TECLA: Record<Direccion, string> = {
  arriba: 'ArrowUp',
  abajo: 'ArrowDown',
  izquierda: 'ArrowLeft',
  derecha: 'ArrowRight',
};

function jugarBien(juego: JuegoFalso, ms: number): void {
  const dentro = juego.instancia as unknown as Interior;
  for (let t = 0; t < ms; t += 16) {
    const direccion = rumbo(dentro);
    if (direccion) juego.tecla(TECLA[direccion]);
    juego.avanzar(16);
  }
}

describe('partida de la serpiente', () => {
  it('quien va derecho a cada manzana se las come todas', () => {
    const juego = montarJuego('serpiente', 'lentes', { mundo: 3, nivel: 2 });
    jugarBien(juego, 40_000);
    const medidos = juego.ensayos.filter((e) => !e.esEnsayoDeConfianza);
    expect(medidos.length).toBeGreaterThan(8);
    expect(medidos.every((e) => e.acierto && e.parametro === 'tamano')).toBe(true);
  });

  it('en lentes solo se pintan los cuatro colores permitidos', () => {
    const juego = montarJuego('serpiente', 'lentes', { mundo: 5, nivel: 5 });
    jugarBien(juego, 15_000);
    expect(coloresProhibidos(juego.lienzo)).toEqual([]);
  });

  it('sin jugar, la manzana se muda y cuenta como fallo; la partida sigue', () => {
    const juego = montarJuego('serpiente', 'lentes');
    juego.avanzar(40_000);
    // Alguna manzana puede caer justo en su camino, pero casi todas se mudan.
    expect(juego.ensayos.filter((e) => !e.acierto).length).toBeGreaterThan(1);
    expect(juego.fin()).toBeNull();
    juego.avanzar(config.serpiente.duracionNivelSeg * 1000);
    expect(juego.fin()).not.toBeNull();
    juego.instancia.destruir();
    expect(juego.oyentesVivos()).toBe(0);
  });

  it('la cruceta y el deslizamiento también giran', () => {
    const juego = montarJuego('serpiente', 'lentes');
    const dentro = juego.instancia as unknown as Interior & {
      botones: Array<{ id: Direccion; x: number; y: number; lado: number }>;
      giros: Direccion[];
    };
    const arriba = dentro.botones.find((b) => b.id === 'arriba')!;
    juego.tocar(arriba.x + 5, arriba.y + 5);
    expect(dentro.giros).toEqual(['arriba']);
    juego.avanzar(config.modulos.ayudaSeg * 1000 + 400);
    juego.tocar(300, 300);
    juego.arrastrar(300 + config.modulos.deslizarMinimoPx + 5, 302);
    expect(dentro.giros[dentro.giros.length - 1] ?? dentro.serpiente.direccion).toBe('derecha');
  });
});
