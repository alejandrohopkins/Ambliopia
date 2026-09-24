import { describe, it, expect } from 'vitest';
import { config } from '../src/config';
import { SessionTimer, type OpcionesDeSessionTimer } from '../src/engine/SessionTimer';

const MINUTO = 60_000;

/** Reloj controlado a mano para no esperar de verdad. */
function crearReloj(inicio = 1_000_000) {
  let t = inicio;
  return {
    ahora: () => t,
    avanzar(ms: number) {
      t += ms;
    },
  };
}

function crear(opciones: OpcionesDeSessionTimer = {}) {
  const reloj = crearReloj();
  const timer = new SessionTimer({ ahora: reloj.ahora, ...opciones });
  return { timer, reloj };
}

describe('minutos activos', () => {
  it('no cuentan sin un minijuego en curso', () => {
    const { timer, reloj } = crear();
    reloj.avanzar(5 * MINUTO);
    timer.actualizar();
    expect(timer.minutosActivos).toBe(0);
    expect(timer.motivoDeParada).toBe('sinJuego');
  });

  it('cuentan mientras se juega e interactúa', () => {
    const { timer, reloj } = crear();
    timer.iniciar();
    for (let i = 0; i < 6; i += 1) {
      reloj.avanzar(10_000);
      timer.marcarInteraccion();
    }
    expect(timer.minutosActivos).toBeCloseTo(1, 5);
    expect(timer.contando).toBe(true);
    expect(timer.motivoDeParada).toBeNull();
  });

  it('no cuentan en pausa', () => {
    const { timer, reloj } = crear();
    timer.iniciar();
    reloj.avanzar(30_000);
    timer.marcarInteraccion();
    timer.pausar();

    reloj.avanzar(10 * MINUTO);
    timer.actualizar();
    expect(timer.minutosActivos).toBeCloseTo(0.5, 5);
    expect(timer.motivoDeParada).toBe('enPausa');

    timer.reanudar();
    reloj.avanzar(30_000);
    timer.marcarInteraccion();
    expect(timer.minutosActivos).toBeCloseTo(1, 5);
  });

  it('no cuentan con la pestaña en segundo plano', () => {
    const { timer, reloj } = crear();
    timer.iniciar();
    reloj.avanzar(20_000);
    timer.marcarVisibilidad(false);

    reloj.avanzar(10 * MINUTO);
    timer.actualizar();
    expect(timer.minutosActivos).toBeCloseTo(20 / 60, 5);
    expect(timer.motivoDeParada).toBe('pestanaOculta');

    timer.marcarVisibilidad(true);
    reloj.avanzar(10_000);
    timer.marcarInteraccion();
    expect(timer.minutosActivos).toBeCloseTo(30 / 60, 5);
  });

  it('se detienen a los 30 s sin interacción y no más allá', () => {
    const { timer, reloj } = crear();
    timer.iniciar();

    reloj.avanzar(10 * MINUTO);
    timer.actualizar();

    // Solo cuentan los 30 s posteriores a la última interacción.
    expect(timer.minutosActivos).toBeCloseTo(config.sesion.inactividadSeg / 60, 5);
    expect(timer.contando).toBe(false);
    expect(timer.motivoDeParada).toBe('sinInteraccion');
  });

  it('vuelven a contar en cuanto hay interacción', () => {
    const { timer, reloj } = crear();
    timer.iniciar();
    reloj.avanzar(5 * MINUTO);
    timer.actualizar();
    const trasInactividad = timer.minutosActivos;

    timer.marcarInteraccion();
    reloj.avanzar(15_000);
    timer.marcarInteraccion();
    expect(timer.minutosActivos).toBeCloseTo(trasInactividad + 0.25, 5);
  });

  it('un tramo largo con interacción a mitad cuenta solo hasta el corte', () => {
    const { timer, reloj } = crear({ inactividadMs: 30_000 });
    timer.iniciar();
    // 45 s sin tocar nada: solo valen los primeros 30.
    reloj.avanzar(45_000);
    timer.actualizar();
    expect(timer.minutosActivos).toBeCloseTo(0.5, 5);
  });

  it('detener el minijuego congela el contador', () => {
    const { timer, reloj } = crear();
    timer.iniciar();
    reloj.avanzar(20_000);
    timer.detener();
    reloj.avanzar(10 * MINUTO);
    timer.actualizar();
    expect(timer.minutosActivos).toBeCloseTo(20 / 60, 5);
  });
});

describe('descansos', () => {
  it('se piden cada tantos minutos activos, no de reloj', () => {
    const { timer, reloj } = crear({ descansoCadaMin: 2 });
    timer.iniciar();

    // Un minuto activo.
    for (let i = 0; i < 6; i += 1) {
      reloj.avanzar(10_000);
      timer.marcarInteraccion();
    }
    expect(timer.descansoPendiente).toBe(false);

    // Diez minutos en pausa no acercan el descanso.
    timer.pausar();
    reloj.avanzar(10 * MINUTO);
    timer.reanudar();
    expect(timer.descansoPendiente).toBe(false);

    // Otro minuto activo sí lo dispara.
    for (let i = 0; i < 6; i += 1) {
      reloj.avanzar(10_000);
      timer.marcarInteraccion();
    }
    expect(timer.descansoPendiente).toBe(true);
    expect(timer.minutosDesdeDescanso).toBeCloseTo(2, 4);
  });

  it('tomar el descanso reinicia su cuenta pero no los minutos del día', () => {
    const { timer, reloj } = crear({ descansoCadaMin: 1 });
    timer.iniciar();
    for (let i = 0; i < 6; i += 1) {
      reloj.avanzar(10_000);
      timer.marcarInteraccion();
    }
    expect(timer.descansoPendiente).toBe(true);
    timer.marcarDescansoTomado();
    expect(timer.descansoPendiente).toBe(false);
    expect(timer.minutosActivos).toBeCloseTo(1, 4);
  });
});

describe('minutos guardados', () => {
  it('consumir minutos enteros no los cuenta dos veces', () => {
    const { timer, reloj } = crear();
    timer.iniciar();
    for (let i = 0; i < 15; i += 1) {
      reloj.avanzar(10_000);
      timer.marcarInteraccion();
    }
    expect(timer.minutosEnteros).toBe(2);
    expect(timer.consumirMinutosEnteros()).toBe(2);
    expect(timer.minutosEnteros).toBe(0);
    // El medio minuto restante no se pierde.
    expect(timer.minutosActivos).toBeCloseTo(0.5, 4);
    expect(timer.consumirMinutosEnteros()).toBe(0);
  });

  it('al salir se guarda también el trozo de minuto, y solo una vez', () => {
    const { timer, reloj } = crear();
    timer.iniciar();
    reloj.avanzar(20_000);
    timer.marcarInteraccion();
    reloj.avanzar(25_000);
    timer.detener();
    expect(timer.consumirMinutos()).toBeCloseTo(0.75, 6);
    expect(timer.consumirMinutos()).toBe(0);
  });
});
