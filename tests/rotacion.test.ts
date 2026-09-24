import { describe, expect, it } from 'vitest';
import { config, type IdJuego } from '../src/config';
import { juegosDelModo } from '../src/games/registro';
import { intentosDeLaSemana, juegosBloqueados } from '../src/rewards/rotacion';
import { estadoInicial, type Estado, type Sesion } from '../src/storage/esquema';

// Jueves 24 de septiembre de 2026: su semana va del lunes 21 al domingo 27.
const HOY = '2026-09-24';
const N = config.rotacion.intentosPorSemana;

function sesion(fecha: string, niveles: Partial<Record<IdJuego, number>>): Sesion {
  const porJuego: Sesion['porJuego'] = {};
  for (const [juego, cuantos] of Object.entries(niveles)) {
    porJuego[juego as IdJuego] = {
      niveles: cuantos ?? 0,
      ensayos: 10,
      aciertos: 9,
      umbrales: {},
      tiempoReaccionMedioMs: 700,
    };
  }
  return {
    id: Math.random().toString(36).slice(2),
    fecha,
    modo: 'parche',
    inicio: `${fecha}T10:00:00.000Z`,
    fin: null,
    minutosActivos: 5,
    porJuego,
  };
}

function conSesiones(...sesiones: Sesion[]): Estado {
  return { ...estadoInicial(), sesiones };
}

const PARCHE = juegosDelModo('parche');

describe('rotación semanal', () => {
  it('pide tres intentos por juego', () => {
    expect(N).toBe(3);
  });

  it('cuenta los niveles terminados de lunes a domingo', () => {
    const estado = conSesiones(
      sesion('2026-09-20', { minero: 5 }), // domingo anterior: otra semana
      sesion('2026-09-21', { minero: 1, gabor: 2 }), // lunes
      sesion('2026-09-24', { minero: 1 }),
      sesion('2026-09-27', { gabor: 1 }), // domingo: misma semana
      sesion('2026-09-28', { gabor: 4 }), // lunes siguiente
    );
    expect(intentosDeLaSemana(estado, HOY)).toEqual({ minero: 2, gabor: 3 });
  });

  it('al empezar la semana no descansa ningún juego', () => {
    expect(juegosBloqueados(estadoInicial(), HOY, PARCHE)).toEqual([]);
  });

  it('el juego que ya tiene sus intentos descansa mientras falten otros', () => {
    const estado = conSesiones(sesion(HOY, { gabor: N, rebote: N - 1 }));
    expect(juegosBloqueados(estado, HOY, PARCHE)).toEqual(['gabor']);
  });

  it('cuando todos tienen sus intentos se abren todos', () => {
    const todos: Partial<Record<IdJuego, number>> = {};
    for (const juego of PARCHE) todos[juego] = N;
    const estado = conSesiones(sesion(HOY, todos));
    expect(juegosBloqueados(estado, HOY, PARCHE)).toEqual([]);
  });

  it('cada modo rota sus propios juegos', () => {
    // Todos los de parche hechos: en lentes aún descansan los compartidos.
    const todos: Partial<Record<IdJuego, number>> = {};
    for (const juego of PARCHE) todos[juego] = N;
    const estado = conSesiones(sesion(HOY, todos));
    const lentes = juegosDelModo('lentes');
    const bloqueados = juegosBloqueados(estado, HOY, lentes);
    expect(bloqueados.length).toBeGreaterThan(0);
    for (const juego of bloqueados) expect(PARCHE).toContain(juego);
  });

  it('el juego de la misión del día no descansa hasta cumplirla', () => {
    const estado = conSesiones(sesion(HOY, { minero: N, gabor: N }));
    estado.misiones[HOY] = {
      tipo: 'cristales',
      objetivo: 20,
      progreso: 5,
      completada: false,
      cobrada: false,
    };
    expect(juegosBloqueados(estado, HOY, PARCHE)).toEqual(['gabor']);
    estado.misiones[HOY] = { ...estado.misiones[HOY], progreso: 20, completada: true };
    expect(juegosBloqueados(estado, HOY, PARCHE).sort()).toEqual(['gabor', 'minero']);
  });
});
