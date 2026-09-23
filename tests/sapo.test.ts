/**
 * El sapo cruzador: carriles, troncos y partidas en modo lentes.
 */
import { describe, it, expect } from 'vitest';
import { config } from '../src/config';
import { crearAleatorio } from '../src/engine/rng';
import {
  atropella,
  crearFilas,
  dificultadDeSapo,
  filaDeRegreso,
  hundido,
  moverFilas,
  porHundirse,
  troncoBajo,
  type Fila,
} from '../src/games/sapo/carriles';
import { montarJuego, type JuegoFalso } from './ayudas/juegoFalso';
import { coloresProhibidos } from './ayudas/cuatroColores';

describe('carriles', () => {
  it('de abajo arriba: salida, calles, medio, ríos y meta', () => {
    const filas = crearFilas(dificultadDeSapo(3, 1), 11, crearAleatorio(1));
    const tipos = filas.map((f) => f.tipo);
    expect(tipos[0]).toBe('salida');
    expect(tipos[tipos.length - 1]).toBe('meta');
    expect(tipos).toContain('medio');
    expect(tipos.indexOf('medio')).toBeLessThan(tipos.indexOf('rio'));
    // Sin río en el primer mundo.
    expect(crearFilas(dificultadDeSapo(1, 1), 11, crearAleatorio(1)).map((f) => f.tipo)).not.toContain('rio');
  });

  it('los objetos dan la vuelta sin cambiar su separación', () => {
    const [, calle] = crearFilas(dificultadDeSapo(2, 3), 11, crearAleatorio(5));
    const separacion = () =>
      calle.objetos
        .map((o) => o.x)
        .sort((a, b) => a - b)
        .map((x, i, xs) => (i === 0 ? 0 : x - xs[i - 1]))
        .slice(1);
    const antes = separacion();
    for (let i = 0; i < 400; i += 1) moverFilas([calle], 0.05);
    const despues = separacion();
    expect(new Set(despues.map((d) => d.toFixed(3))).size).toBe(new Set(antes.map((d) => d.toFixed(3))).size);
    for (const objeto of calle.objetos) {
      expect(objeto.x).toBeGreaterThanOrEqual(-6);
      expect(objeto.x).toBeLessThan(calle.vuelta - 6);
    }
  });

  it('un coche atropella si toca la franja del sapo', () => {
    const calle: Fila = { tipo: 'calle', direccion: 1, velocidad: 1, vuelta: 20, objetos: [{ x: 3, largo: 1, faseDeHundirse: null }] };
    expect(atropella(calle, 3.5, 4.1)).toBe(true);
    expect(atropella(calle, 4.2, 4.8)).toBe(false);
  });

  it('un tronco sostiene mientras flota, avisa antes y se hunde un rato', () => {
    const tronco = { x: 2, largo: 3, faseDeHundirse: 0 };
    const rio: Fila = { tipo: 'rio', direccion: 1, velocidad: 1, vuelta: 20, objetos: [tronco] };
    const { flotandoSeg, hundidoSeg, avisoHundirseSeg } = config.sapo;
    expect(troncoBajo(rio, 3, 0)).toBe(tronco);
    expect(hundido(tronco, flotandoSeg - 0.01)).toBe(false);
    expect(porHundirse(tronco, flotandoSeg - avisoHundirseSeg / 2)).toBe(true);
    expect(hundido(tronco, flotandoSeg + 0.01)).toBe(true);
    expect(troncoBajo(rio, 3, flotandoSeg + 0.01)).toBeNull();
    expect(hundido(tronco, flotandoSeg + hundidoSeg + 0.01)).toBe(false);
    expect(troncoBajo(rio, 6, 0)).toBeNull();
  });

  it('tras un tropiezo vuelve al principio de su tramo', () => {
    const filas = crearFilas(dificultadDeSapo(3, 1), 11, crearAleatorio(1));
    const medio = filas.findIndex((f) => f.tipo === 'medio');
    expect(filaDeRegreso(filas, 1)).toBe(0);
    expect(filaDeRegreso(filas, medio + 1)).toBe(medio);
  });

  it('el nivel suma carriles, acelera, achica huecos y troncos, y trae sorpresas', () => {
    const primero = dificultadDeSapo(1, 1);
    const ultimo = dificultadDeSapo(5, 5);
    expect(ultimo.calles + ultimo.rios).toBeGreaterThan(primero.calles + primero.rios);
    expect(ultimo.velocidad).toBeGreaterThan(primero.velocidad);
    expect(ultimo.hueco).toBeLessThan(primero.hueco);
    expect(ultimo.tronco).toBeLessThan(primero.tronco);
    expect(primero.seHunden || primero.corrientes).toBe(false);
    expect(ultimo.seHunden && ultimo.corrientes && ultimo.desordenado).toBe(true);
  });
});

interface Interior {
  filas: Fila[];
  sapo: { x: number; fila: number };
  cruces: number;
  tiempoMs: number;
}

/**
 * ¿Estará libre esta fila bajo el sapo durante los próximos segundos? Mira
 * hacia el futuro moviendo cada coche o tronco con su carril, como haría una
 * jugadora atenta.
 */
function libreDurante(dentro: Interior, fila: number, segundos: number): boolean {
  const destino = dentro.filas[fila];
  if (!destino) return false;
  const ahora = dentro.tiempoMs / 1000;
  const media = config.sapo.anchoDeChoque / 2;
  for (let t = 0; t <= segundos; t += 0.05) {
    const desplazamiento = destino.direccion * destino.velocidad * t;
    if (destino.tipo === 'calle') {
      const x = dentro.sapo.x;
      const choca = destino.objetos.some(
        (coche) => coche.x + desplazamiento < x + media && coche.x + desplazamiento + coche.largo > x - media,
      );
      if (choca) return false;
    } else if (destino.tipo === 'rio') {
      // Sobre el río el sapo viaja con el tronco: tiene que seguir encima y a flote.
      const x = dentro.sapo.x + desplazamiento;
      if (x < 0.5 || x > config.sapo.columnas - 0.5) return false;
      const debajo = destino.objetos.find(
        (tronco) => x >= tronco.x + desplazamiento + 0.3 && x <= tronco.x + desplazamiento + tronco.largo - 0.3,
      );
      if (!debajo || hundido(debajo, ahora + t)) return false;
    }
  }
  return true;
}

/** Salta hacia delante cuando el carril siguiente seguirá libre; si el suyo se complica, retrocede. */
function cruzarConCuidado(juego: JuegoFalso, ms: number): void {
  const dentro = juego.instancia as unknown as Interior;
  for (let t = 0; t < ms; t += 16) {
    if (t % 48 === 0) {
      const { fila } = dentro.sapo;
      if (libreDurante(dentro, fila + 1, 0.9)) juego.tecla('ArrowUp');
      else if (!libreDurante(dentro, fila, 0.35) && libreDurante(dentro, fila - 1, 0.6)) juego.tecla('ArrowDown');
    }
    juego.avanzar(16);
  }
}

describe('partida del sapo', () => {
  it('quien salta con cuidado cruza y acierta la mayoría de carriles', () => {
    const juego = montarJuego('sapo', 'lentes', { mundo: 2, nivel: 1 });
    cruzarConCuidado(juego, 45_000);
    const dentro = juego.instancia as unknown as Interior;
    expect(dentro.cruces).toBeGreaterThan(3);
    const medidos = juego.ensayos.filter((e) => !e.esEnsayoDeConfianza);
    expect(medidos.filter((e) => e.acierto).length / medidos.length).toBeGreaterThan(0.8);
    expect(juego.ensayos.every((e) => e.parametro === 'tamano')).toBe(true);
  });

  it('en lentes solo se pintan los cuatro colores permitidos', () => {
    const juego = montarJuego('sapo', 'lentes', { mundo: 5, nivel: 5 });
    cruzarConCuidado(juego, 20_000);
    expect(coloresProhibidos(juego.lienzo)).toEqual([]);
  });

  it('un tropiezo es un fallo y lo devuelve a la salida; la partida sigue', () => {
    const juego = montarJuego('sapo', 'lentes', { mundo: 5, nivel: 5 });
    for (let t = 0; t < 20_000; t += 16) {
      if (t % 480 === 0) juego.tecla('ArrowUp');
      juego.avanzar(16);
    }
    expect(juego.ensayos.some((e) => !e.acierto)).toBe(true);
    expect(juego.fin()).toBeNull();
    juego.avanzar(config.sapo.duracionNivelSeg * 1000);
    expect(juego.fin()).not.toBeNull();
    juego.instancia.destruir();
    expect(juego.oyentesVivos()).toBe(0);
  });

  it('tocar el tablero salta hacia delante y la cruceta hacia su lado', () => {
    const juego = montarJuego('sapo', 'lentes');
    const dentro = juego.instancia as unknown as Interior & {
      botones: Array<{ id: string; x: number; y: number; lado: number }>;
    };
    juego.tocar(200, 300);
    juego.soltar(200, 300);
    expect(dentro.sapo.fila).toBe(1);
    juego.avanzar(config.sapo.saltoMs + 20);
    const x = dentro.sapo.x;
    const derecha = dentro.botones.find((b) => b.id === 'derecha')!;
    juego.tocar(derecha.x + 5, derecha.y + 5);
    expect(dentro.sapo.x === x + 1 || dentro.sapo.fila === 0).toBe(true);
  });
});
