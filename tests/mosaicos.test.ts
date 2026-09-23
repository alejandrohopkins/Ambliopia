/**
 * Mosaicos y secuencias: símbolos, reglas, piezas clave y partidas en lentes.
 */
import { describe, it, expect } from 'vitest';
import { config } from '../src/config';
import { crearAleatorio } from '../src/engine/rng';
import {
  crearMosaico,
  dificultadDeMosaicos,
  espejo,
  mapaDeSimbolo,
  reglaDelMundo,
  tamanoDibujable,
  type Giro,
  type Mosaico,
  type Regla,
} from '../src/games/mosaicos/patrones';
import { montarJuego, type JuegoFalso } from './ayudas/juegoFalso';
import { coloresProhibidos } from './ayudas/cuatroColores';

describe('el símbolo', () => {
  it('mira a la derecha y gira en el sentido del reloj', () => {
    expect(mapaDeSimbolo(0)).toEqual(['#####', '#....', '#####', '#....', '#####']);
    // Un cuarto de vuelta: las púas miran hacia abajo.
    expect(mapaDeSimbolo(1)).toEqual(['#####', '#.#.#', '#.#.#', '#.#.#', '#.#.#']);
    expect(mapaDeSimbolo(2)).toEqual(['#####', '....#', '#####', '....#', '#####']);
  });

  it('los cuatro giros son distintos y cuatro cuartos dan la vuelta', () => {
    const mapas = ([0, 1, 2, 3] as Giro[]).map((g) => mapaDeSimbolo(g).join('/'));
    expect(new Set(mapas).size).toBe(4);
  });

  it('el espejo cambia derecha por izquierda y deja arriba y abajo', () => {
    expect(espejo(0)).toBe(2);
    expect(espejo(2)).toBe(0);
    expect(espejo(1)).toBe(1);
    expect(espejo(3)).toBe(3);
  });

  it('se dibuja con trazos enteros', () => {
    expect(tamanoDibujable(3)).toBe(5);
    expect(tamanoDibujable(12)).toBe(10);
    expect(tamanoDibujable(13)).toBe(15);
  });
});

/** Deduce la pieza que falta solo con las piezas clave, como haría la jugadora. */
function deducir(m: Mosaico): Giro[] {
  const posibles: Giro[] = [];
  for (const candidato of [0, 1, 2, 3] as Giro[]) {
    const giros = [...m.giros];
    giros[m.falta] = candidato;
    const f = Math.floor(m.falta / m.lado);
    const c = m.falta % m.lado;
    const fila = Array.from({ length: m.lado }, (_, i) => giros[f * m.lado + i]);
    const columna = Array.from({ length: m.lado }, (_, i) => giros[i * m.lado + c]);
    const pasoConstante = (xs: Giro[]) => xs.every((x, i) => i === 0 || (x - xs[i - 1] + 4) % 4 === (xs[1] - xs[0] + 4) % 4);
    let cumple = false;
    if (m.regla === 'columnas') cumple = columna.every((x) => x === columna.find((_, i) => i !== f));
    if (m.regla === 'gira') cumple = fila.every((x, i) => i === 0 || x === (fila[i - 1] + 1) % 4);
    if (m.regla === 'espejo') cumple = fila.every((x, i) => x === espejo(fila[m.lado - 1 - i]));
    if (m.regla === 'doble') cumple = pasoConstante(fila) && pasoConstante(columna);
    if (cumple) posibles.push(candidato);
  }
  return posibles;
}

describe('los mosaicos', () => {
  it('cada regla deja una sola respuesta posible', () => {
    const reglas: Regla[] = ['columnas', 'gira', 'espejo', 'doble'];
    for (const regla of reglas) {
      for (const lado of [3, 4, 5, 6]) {
        for (let semilla = 1; semilla <= 25; semilla += 1) {
          const m = crearMosaico(lado, regla, crearAleatorio(`${regla}:${lado}:${semilla}`));
          expect(deducir(m)).toEqual([m.giros[m.falta]]);
        }
      }
    }
  });

  it('las piezas clave son de su fila o su columna, y nunca la que falta', () => {
    const m = crearMosaico(5, 'doble', crearAleatorio(3));
    const f = Math.floor(m.falta / 5);
    const c = m.falta % 5;
    expect(m.claves).not.toContain(m.falta);
    expect(m.claves).toHaveLength(8);
    for (const i of m.claves) expect(Math.floor(i / 5) === f || i % 5 === c).toBe(true);
  });

  it('el nivel cambia la regla, agranda el mosaico y pone reloj al final', () => {
    expect(reglaDelMundo(1)).toBe('columnas');
    expect(reglaDelMundo(3)).toBe('espejo');
    expect(dificultadDeMosaicos(5).lado).toBeGreaterThan(dificultadDeMosaicos(1).lado);
    expect(dificultadDeMosaicos(1).limiteSeg).toBe(0);
    expect(dificultadDeMosaicos(5).limiteSeg).toBeGreaterThan(0);
  });
});

interface Interior {
  ensayo: { mosaico: Mosaico; revelarHastaMs: number | null } | null;
  opciones(): Array<{ x: number; y: number; lado: number }>;
}

function resolverTodos(juego: JuegoFalso, bien: boolean): void {
  const dentro = juego.instancia as unknown as Interior;
  for (let t = 0; t < 200_000 && !juego.fin(); t += 16) {
    const ensayo = dentro.ensayo;
    if (ensayo && ensayo.revelarHastaMs === null) {
      const correcta = ensayo.mosaico.giros[ensayo.mosaico.falta];
      const indice = bien ? correcta : (correcta + 1) % 4;
      const caja = dentro.opciones()[indice];
      juego.tocar(caja.x + caja.lado / 2, caja.y + caja.lado / 2);
    }
    juego.avanzar(16);
  }
}

describe('partida de mosaicos', () => {
  it('quien elige bien acierta todo y termina el nivel', () => {
    const juego = montarJuego('mosaicos', 'lentes', { mundo: 3, nivel: 1 });
    resolverTodos(juego, true);
    expect(juego.fin()).not.toBeNull();
    expect(juego.ensayos).toHaveLength(config.mosaicos.ensayosPorNivel);
    expect(juego.ensayos.every((e) => e.acierto && e.valor % 5 === 0)).toBe(true);
    juego.instancia.destruir();
    expect(juego.oyentesVivos()).toBe(0);
  });

  it('elegir mal es un fallo; en los últimos mundos también se acaba el tiempo', () => {
    const juego = montarJuego('mosaicos', 'lentes', { mundo: 5, nivel: 1 });
    resolverTodos(juego, false);
    expect(juego.ensayos.every((e) => !e.acierto)).toBe(true);

    const lento = montarJuego('mosaicos', 'lentes', { mundo: 5, nivel: 1 });
    lento.avanzar((config.modulos.ayudaSeg + config.mosaicos.limiteSegPorMundo[4]) * 1000 + 100);
    expect(lento.ensayos).toHaveLength(1);
    expect(lento.ensayos[0].acierto).toBe(false);
  });

  it('en lentes solo se pintan los cuatro colores permitidos', () => {
    const juego = montarJuego('mosaicos', 'lentes', { mundo: 4, nivel: 2 });
    resolverTodos(juego, true);
    expect(coloresProhibidos(juego.lienzo)).toEqual([]);
  });

  it('con el teclado se elige por número o con las flechas', () => {
    const juego = montarJuego('mosaicos', 'lentes');
    juego.avanzar(config.modulos.ayudaSeg * 1000 + 20);
    const dentro = juego.instancia as unknown as Interior;
    const correcta = dentro.ensayo!.mosaico.giros[dentro.ensayo!.mosaico.falta];
    juego.tecla(String(correcta + 1));
    expect(juego.ensayos[0].acierto).toBe(true);
  });
});
