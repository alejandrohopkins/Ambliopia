import { describe, it, expect } from 'vitest';
import { config } from '../src/config';
import {
  disposicion,
  escalerasDeSaboteador,
  espaciadoDelMundo,
  tripulantesDelMundo,
  segundosPorEnsayo,
} from '../src/games/saboteador/Saboteador';
import {
  cuentaComoEnsayo,
  hayChoque,
  dificultad,
  escalerasDeMeteoritos,
} from '../src/games/meteoritos/Meteoritos';
import { Staircase } from '../src/engine/Staircase';
import { crearAleatorio } from '../src/engine/rng';

describe('grupo del saboteador', () => {
  it('el número de tripulantes sigue la especificación', () => {
    expect([1, 2, 3, 4, 5].map(tripulantesDelMundo)).toEqual([5, 7, 7, 9, 9]);
  });

  it('el espaciado se cierra con los mundos: más amontonamiento', () => {
    expect(espaciadoDelMundo(1)).toBe(2.0);
    expect(espaciadoDelMundo(2)).toBe(1.6);
    expect(espaciadoDelMundo(3)).toBe(1.2);
    expect(espaciadoDelMundo(5)).toBe(1.2);
  });

  it('el tiempo por ensayo baja del mundo 1 al 5', () => {
    expect(segundosPorEnsayo(1)).toBe(config.saboteador.segundosPorEnsayoMundo1);
    expect(segundosPorEnsayo(5)).toBe(config.saboteador.segundosPorEnsayoMundo5);
  });

  it('coloca a todos los tripulantes, sin repetir puesto', () => {
    for (const cuantos of [5, 7, 9]) {
      const puestos = disposicion(cuantos);
      expect(puestos).toHaveLength(cuantos);
      const claves = puestos.map((p) => `${p.fila}:${p.columna}`);
      expect(new Set(claves).size).toBe(cuantos);
    }
  });

  it('cinco van en fila y nueve en cuadrícula de tres por tres', () => {
    const cinco = disposicion(5);
    expect(new Set(cinco.map((p) => p.fila)).size).toBe(1);

    const nueve = disposicion(9);
    expect(new Set(nueve.map((p) => p.fila)).size).toBe(3);
    expect(nueve.every((p) => p.enSuFila === 3)).toBe(true);
  });

  it('cada fila sabe cuántos lleva, para poder centrarla', () => {
    for (const puesto of disposicion(7)) {
      expect(puesto.columna).toBeLessThan(puesto.enSuFila);
    }
  });

  it('una escalera por espaciado: mundos con el mismo espaciado la comparten', () => {
    const clave = (mundo: number) => escalerasDeSaboteador('parche', mundo)[0].clave;
    expect(clave(1)).not.toBe(clave(2));
    expect(clave(3)).toBe(clave(4));
    expect(clave(4)).toBe(clave(5));
    expect(clave(1)).toContain('2.0');
    expect(clave(2)).toContain('1.6');
    expect(clave(3)).toContain('1.2');
  });

  it('la escalera mide el diámetro del visor, igual en los dos modos', () => {
    for (const modo of ['parche', 'lentes'] as const) {
      const [escalera] = escalerasDeSaboteador(modo, 1);
      expect(escalera.valorInicial).toBe(config.saboteador.diametroInicialPx);
      expect(escalera.minimo).toBe(config.saboteador.diametroMinimoPx);
      expect(escalera.maximo).toBe(config.saboteador.diametroMaximoPx);
      expect(escalera.clave).toContain(modo);
    }
  });

  it('la abertura mide una quinta parte del diámetro', () => {
    expect(config.saboteador.fraccionAbertura).toBeCloseTo(1 / 5, 6);
  });

  it('el saboteador nunca apunta hacia el mismo lado que el grupo', () => {
    const aleatorio = crearAleatorio(42);
    for (let i = 0; i < 500; i += 1) {
      const grupo = aleatorio.entero(0, 3);
      const saboteador = (grupo + aleatorio.entero(1, 3)) % 4;
      expect(saboteador).not.toBe(grupo);
      expect(saboteador).toBeGreaterThanOrEqual(0);
      expect(saboteador).toBeLessThanOrEqual(3);
    }
  });
});

describe('regla de ensayo de meteoritos', () => {
  const anchoNave = 40;
  const limite = anchoNave * config.meteoritos.anchosDeNaveParaEnsayo;

  it('un objeto que pasa cerca cuenta como ensayo', () => {
    expect(cuentaComoEnsayo(0, anchoNave)).toBe(true);
    expect(cuentaComoEnsayo(limite - 1, anchoNave)).toBe(true);
    expect(cuentaComoEnsayo(-(limite - 1), anchoNave)).toBe(true);
  });

  it('un objeto lejano no cuenta: no mide nada', () => {
    expect(cuentaComoEnsayo(limite + 1, anchoNave)).toBe(false);
    expect(cuentaComoEnsayo(-(limite + 1), anchoNave)).toBe(false);
  });

  it('el choque depende del solape de la nave y el objeto', () => {
    expect(hayChoque(0, anchoNave, 20)).toBe(true);
    expect(hayChoque(29, anchoNave, 20)).toBe(true);
    expect(hayChoque(31, anchoNave, 20)).toBe(false);
  });

  it('un objeto puede pasar cerca sin chocar: ahí está la tarea', () => {
    const distancia = 50;
    expect(cuentaComoEnsayo(distancia, anchoNave)).toBe(true);
    expect(hayChoque(distancia, anchoNave, 20)).toBe(false);
  });

  it('atrapar la estrella y esquivar la roca son los dos aciertos', () => {
    const acierto = (tipo: 'estrella' | 'roca', choque: boolean) =>
      tipo === 'estrella' ? choque : !choque;
    expect(acierto('estrella', true)).toBe(true);
    expect(acierto('estrella', false)).toBe(false);
    expect(acierto('roca', false)).toBe(true);
    expect(acierto('roca', true)).toBe(false);
  });
});

describe('dificultad de meteoritos', () => {
  it('sube del primer al último nivel', () => {
    const primero = dificultad(1, 1);
    const ultimo = dificultad(config.progresion.mundos, config.progresion.nivelesPorMundo);
    expect(primero.velocidad).toBe(config.meteoritos.velocidadCaidaInicialPxSeg);
    expect(ultimo.velocidad).toBe(config.meteoritos.velocidadCaidaFinalPxSeg);
    expect(primero.simultaneos).toBe(config.meteoritos.objetosSimultaneosMin);
    expect(ultimo.simultaneos).toBe(config.meteoritos.objetosSimultaneosMax);
  });

  it('nunca retrocede', () => {
    let anterior = 0;
    for (let mundo = 1; mundo <= config.progresion.mundos; mundo += 1) {
      for (let nivel = 1; nivel <= config.progresion.nivelesPorMundo; nivel += 1) {
        const { velocidad } = dificultad(mundo, nivel);
        expect(velocidad).toBeGreaterThanOrEqual(anterior);
        anterior = velocidad;
      }
    }
  });

  it('la escalera solo controla el tamaño', () => {
    const [escalera] = escalerasDeMeteoritos('lentes', 3);
    expect(escalera.clave).toContain('tamano');
    expect(escalera.valorInicial).toBe(config.meteoritos.tamanoInicialPx);
    expect(escalera.minimo).toBe(config.meteoritos.tamanoMinimoPx);
    expect(escalera.maximo).toBe(config.meteoritos.tamanoMaximoPx);
  });
});

describe('escalera con varios estímulos en el aire', () => {
  it('cada objeto recuerda si era de confianza, aunque se resuelvan a destiempo', () => {
    const escalera = new Staircase({
      clave: 'meteoritos:parche:tamano',
      valorInicial: 48,
      minimo: 6,
      maximo: 96,
      aleatorio: crearAleatorio(1),
    });

    // Nacen tres objetos seguidos antes de resolver ninguno.
    const enVuelo = [escalera.proximoEnsayo(), escalera.proximoEnsayo(), escalera.proximoEnsayo()];

    const antes = escalera.current();
    // Se resuelven en otro orden; el de confianza no debe mover la escalera.
    for (const objeto of [enVuelo[2], enVuelo[0], enVuelo[1]]) {
      escalera.record(true, objeto.esEnsayoDeConfianza);
    }

    const reales = enVuelo.filter((o) => !o.esEnsayoDeConfianza).length;
    // Dos aciertos reales bajan la escalera una vez.
    const bajadas = Math.floor(reales / 2);
    expect(escalera.current()).toBeCloseTo(antes * config.escalera.factorMasDificil ** bajadas, 6);
  });

  it('marcar un ensayo como de confianza lo deja fuera de la escalera', () => {
    const escalera = new Staircase({
      clave: 'x',
      valorInicial: 48,
      minimo: 6,
      maximo: 96,
      aleatorio: crearAleatorio(2),
    });
    const antes = escalera.current();
    escalera.record(false, true);
    escalera.record(false, true);
    expect(escalera.current()).toBe(antes);
    expect(escalera.inversiones).toBe(0);
  });
});
