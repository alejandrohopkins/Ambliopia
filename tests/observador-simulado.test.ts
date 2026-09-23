/**
 * Prueba obligatoria del motor adaptativo.
 *
 * Un observador simulado responde según una función psicométrica de Weibull
 * con un umbral conocido. Sobre 200 simulaciones de 60 ensayos, el umbral que
 * estima la escalera debe quedar a ±15 % del umbral simulado.
 */
import { describe, it, expect } from 'vitest';
import { nivelDeAciertosBuscado } from '../src/config';
import { Staircase, mediaGeometrica } from '../src/engine/Staircase';
import { crearAleatorio, type Aleatorio } from '../src/engine/rng';

/** Nivel de aciertos al que converge la escalera con la configuración actual. */
const NIVEL_DE_CONVERGENCIA = nivelDeAciertosBuscado();

interface Observador {
  /** Probabilidad de acertar con este valor del parámetro. */
  probabilidad(valor: number): number;
  /** Valor en el que acierta tanto como busca la escalera. */
  umbral: number;
}

/**
 * Weibull: P(x) = 1 − (1 − adivinanza) · exp(−(x/alfa)^beta).
 * Menor valor = más difícil, igual que en los minijuegos.
 */
function crearObservador(alfa: number, beta: number, adivinanza: number): Observador {
  const probabilidad = (valor: number) =>
    1 - (1 - adivinanza) * Math.exp(-((Math.max(0, valor) / alfa) ** beta));

  // Umbral simulado: el valor donde la curva pasa por el nivel de convergencia.
  let bajo = 1e-6;
  let alto = alfa * 100;
  for (let i = 0; i < 200; i += 1) {
    const medio = (bajo + alto) / 2;
    if (probabilidad(medio) < NIVEL_DE_CONVERGENCIA) bajo = medio;
    else alto = medio;
  }
  return { probabilidad, umbral: (bajo + alto) / 2 };
}

function simular(observador: Observador, aleatorio: Aleatorio, ensayosReales: number): number {
  const escalera = new Staircase({
    clave: 'simulacion',
    // Arranca claramente por encima del umbral, como el calentamiento real.
    valorInicial: observador.umbral * 3,
    minimo: observador.umbral / 50,
    maximo: observador.umbral * 20,
    aleatorio,
  });

  let reales = 0;
  while (reales < ensayosReales) {
    const ensayo = escalera.proximoEnsayo();
    const acierto = aleatorio.siguiente() < observador.probabilidad(ensayo.valor);
    escalera.record(acierto);
    if (!ensayo.esEnsayoDeConfianza) reales += 1;
  }
  return escalera.threshold();
}

describe('observador simulado', () => {
  it('el umbral estimado queda a ±15 % del simulado (200 × 60 ensayos)', () => {
    const observador = crearObservador(10, 3, 0.25);
    const estimados: number[] = [];

    for (let i = 0; i < 200; i += 1) {
      estimados.push(simular(observador, crearAleatorio(1000 + i), 60));
    }

    const medio = mediaGeometrica(estimados);
    const error = Math.abs(medio - observador.umbral) / observador.umbral;

    expect(error).toBeLessThanOrEqual(0.15);
  });

  it('converge igual con otra pendiente y otra tasa de adivinanza', () => {
    const observador = crearObservador(24, 2, 1 / 9);
    const estimados = Array.from({ length: 200 }, (_, i) =>
      simular(observador, crearAleatorio(5000 + i), 60),
    );
    const error = Math.abs(mediaGeometrica(estimados) - observador.umbral) / observador.umbral;
    expect(error).toBeLessThanOrEqual(0.15);
  });

  it('un umbral más bajo se estima más bajo: la escalera sigue al observador', () => {
    const facil = crearObservador(30, 3, 0.25);
    const dificil = crearObservador(6, 3, 0.25);
    const estimar = (o: Observador) =>
      mediaGeometrica(
        Array.from({ length: 60 }, (_, i) => simular(o, crearAleatorio(200 + i), 60)),
      );
    expect(estimar(dificil)).toBeLessThan(estimar(facil));
  });

  it('la precisión alcanzada ronda la que persigue la escalera', () => {
    const observador = crearObservador(10, 3, 0.25);
    let aciertos = 0;
    let total = 0;

    for (let i = 0; i < 100; i += 1) {
      const aleatorio = crearAleatorio(9000 + i);
      const escalera = new Staircase({
        clave: 'simulacion',
        valorInicial: observador.umbral * 3,
        minimo: observador.umbral / 50,
        maximo: observador.umbral * 20,
        aleatorio,
      });
      let reales = 0;
      while (reales < 60) {
        const ensayo = escalera.proximoEnsayo();
        const acierto = aleatorio.siguiente() < observador.probabilidad(ensayo.valor);
        escalera.record(acierto);
        if (!ensayo.esEnsayoDeConfianza) {
          reales += 1;
          // Solo la segunda mitad: la primera es calentamiento.
          if (reales > 30) {
            total += 1;
            if (acierto) aciertos += 1;
          }
        }
      }
    }

    const precision = aciertos / total;
    expect(Math.abs(precision - NIVEL_DE_CONVERGENCIA)).toBeLessThan(0.06);
  });
});
