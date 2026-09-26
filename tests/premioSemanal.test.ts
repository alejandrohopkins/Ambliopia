import { describe, expect, it } from 'vitest';
import { config, type IdJuego, type Modo } from '../src/config';
import { juegosDelModo } from '../src/games/registro';
import { nivelPerfecto, premioDeLaSemana } from '../src/rewards/premioSemanal';
import { reducir } from '../src/storage/acciones';
import { estadoInicial, type Estado, type Sesion } from '../src/storage/esquema';
import { migrar } from '../src/storage/migraciones';

// Jueves 24 de septiembre de 2026: semana ISO 2026-W39, del lunes 21 al domingo 27.
const HOY = '2026-09-24';

function sesion(fecha: string, modo: Modo, perfectos: Partial<Record<IdJuego, number>>): Sesion {
  const porJuego: Sesion['porJuego'] = {};
  for (const [juego, cuantos] of Object.entries(perfectos)) {
    porJuego[juego as IdJuego] = {
      niveles: 2,
      perfectos: cuantos ?? 0,
      ensayos: 30,
      aciertos: 28,
      umbrales: {},
      tiempoReaccionMedioMs: 700,
    };
  }
  return {
    id: Math.random().toString(36).slice(2),
    fecha,
    modo,
    inicio: `${fecha}T10:00:00.000Z`,
    fin: null,
    minutosActivos: 10,
    porJuego,
  };
}

const conSesiones = (...sesiones: Sesion[]): Estado => ({ ...estadoInicial(), sesiones });

/** Un nivel perfecto en cada uno de los primeros `n` juegos de parche. */
function perfectosEn(n: number, fecha = HOY): Sesion {
  const cuales: Partial<Record<IdJuego, number>> = {};
  for (const juego of juegosDelModo('parche').slice(0, n)) cuales[juego] = 1;
  return sesion(fecha, 'parche', cuales);
}

describe('nivel perfecto', () => {
  it('es un nivel sin ningún fallo, con ensayos suficientes', () => {
    const minimo = config.premioSemanal.ensayosMinimos;
    expect(nivelPerfecto({ ensayos: 15, aciertos: 15 })).toBe(true);
    expect(nivelPerfecto({ ensayos: 15, aciertos: 14 })).toBe(false);
    expect(nivelPerfecto({ ensayos: minimo - 1, aciertos: minimo - 1 })).toBe(false);
    expect(nivelPerfecto({ ensayos: 0, aciertos: 0 })).toBe(false);
  });

  it('en la Torre, además, hay que terminar la figura', () => {
    const figura = (cumplido: boolean) => ({ hecho: 10, total: 12, cumplido });
    expect(nivelPerfecto({ ensayos: 12, aciertos: 12, objetivo: figura(true) })).toBe(true);
    expect(nivelPerfecto({ ensayos: 12, aciertos: 12, objetivo: figura(false) })).toBe(false);
  });
});

describe('bolsa de platanitos', () => {
  const PARCHE = juegosDelModo('parche').length;
  const META = Math.ceil(PARCHE * config.premioSemanal.fraccionDeJuegos);

  it('pide 100 % en la mitad de los juegos de la semana', () => {
    expect(config.premioSemanal.fraccionDeJuegos).toBe(0.5);
    const premio = premioDeLaSemana(estadoInicial(), HOY, 'parche');
    expect(premio.juegos).toHaveLength(PARCHE);
    expect(premio.meta).toBe(META);
    expect(premio.ganado).toBe(false);
    expect(premio.semana).toBe('2026-W39');
  });

  it('se gana al llegar a la mitad de los juegos con un nivel perfecto', () => {
    expect(premioDeLaSemana(conSesiones(perfectosEn(META - 1)), HOY, 'parche').ganado).toBe(false);
    const premio = premioDeLaSemana(conSesiones(perfectosEn(META)), HOY, 'parche');
    expect(premio.perfectos).toHaveLength(META);
    expect(premio.ganado).toBe(true);
  });

  it('solo cuenta la semana en curso', () => {
    const semanaPasada = perfectosEn(PARCHE, '2026-09-20');
    expect(premioDeLaSemana(conSesiones(semanaPasada), HOY, 'parche').perfectos).toHaveLength(0);
  });

  it('si se jugaron los dos modos, cuentan los juegos de los dos', () => {
    const estado = conSesiones(perfectosEn(1), sesion(HOY, 'lentes', { pozo: 0 }));
    const todos = new Set([...juegosDelModo('parche'), ...juegosDelModo('lentes')]);
    const premio = premioDeLaSemana(estado, HOY, 'parche');
    expect(premio.juegos).toHaveLength(todos.size);
    expect(premio.meta).toBe(Math.ceil(todos.size / 2));
  });

  it('la felicitación se marca como vista una sola vez por semana', () => {
    let estado = reducir(estadoInicial(), { tipo: 'premioSemanal/visto', semana: '2026-W39' });
    estado = reducir(estado, { tipo: 'premioSemanal/visto', semana: '2026-W39' });
    expect(estado.premiosSemanales).toEqual(['2026-W39']);
  });

  it('los niveles perfectos se suman al combinar niveles de una sesión', () => {
    let estado = reducir(estadoInicial(), { tipo: 'sesion/iniciar', id: 'a', dia: HOY, modo: 'parche' });
    const nivel = (perfectos: number) => ({
      niveles: 1,
      perfectos,
      ensayos: 15,
      aciertos: 15 - (1 - perfectos),
      umbrales: {},
      tiempoReaccionMedioMs: 600,
    });
    estado = reducir(estado, { tipo: 'sesion/registrarJuego', juego: 'minero', resumen: nivel(1) });
    estado = reducir(estado, { tipo: 'sesion/registrarJuego', juego: 'minero', resumen: nivel(0) });
    expect(estado.sesiones[0].porJuego.minero).toMatchObject({ niveles: 2, perfectos: 1 });
  });
});

describe('migración a la versión 4', () => {
  it('las sesiones viejas empiezan sin niveles perfectos y sin premios', () => {
    const migrado = migrar({
      version: 3,
      sesiones: [
        {
          id: 'a',
          fecha: HOY,
          modo: 'parche',
          inicio: `${HOY}T10:00:00.000Z`,
          fin: null,
          minutosActivos: 12,
          porJuego: { minero: { niveles: 2, ensayos: 30, aciertos: 30, umbrales: {}, tiempoReaccionMedioMs: 800 } },
        },
      ],
    });
    expect(migrado.version).toBe(config.almacenamiento.version);
    expect(migrado.sesiones[0].porJuego.minero).toMatchObject({ niveles: 2, perfectos: 0 });
    expect(migrado.premiosSemanales).toEqual([]);
  });
});
