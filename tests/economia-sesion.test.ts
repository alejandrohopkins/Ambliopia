import { describe, it, expect } from 'vitest';
import { config } from '../src/config';
import {
  premioDeNivel,
  monedasPorMinutos,
  bonoDeRacha,
  comparacionDeRecord,
} from '../src/rewards/economia';
import { reducir } from '../src/storage/acciones';
import { estadoInicial, type Estado } from '../src/storage/esquema';
import type { ResumenDeNivel } from '../src/games/tipos';

function resumen(parcial: Partial<ResumenDeNivel> = {}): ResumenDeNivel {
  return {
    ensayos: 15,
    aciertos: 11,
    precision: 11 / 15,
    estrellas: 2,
    umbrales: { tamano: 9.4 },
    duracionMs: 150_000,
    mejorRacha: 4,
    ...parcial,
  };
}

describe('economía', () => {
  it('el premio del nivel suma aciertos, estrellas y el nivel completado', () => {
    const premio = premioDeNivel(resumen());
    expect(premio.porAciertos).toBe(11 * config.economia.monedasPorAcierto);
    expect(premio.porEstrellas).toBe(2 * config.economia.monedasPorEstrellaDeNivel);
    expect(premio.porNivel).toBe(config.economia.monedasPorNivelCompletado);
    expect(premio.monedas).toBe(premio.porAciertos + premio.porEstrellas + premio.porNivel);
  });

  it('fallar nunca resta: un nivel sin aciertos igual paga', () => {
    const premio = premioDeNivel(resumen({ aciertos: 0, estrellas: 1, precision: 0 }));
    expect(premio.monedas).toBeGreaterThan(0);
  });

  it('los minutos pagan solo por minuto completo', () => {
    expect(monedasPorMinutos(0)).toBe(0);
    expect(monedasPorMinutos(0.9)).toBe(0);
    expect(monedasPorMinutos(1)).toBe(config.economia.monedasPorMinutoActivo);
    expect(monedasPorMinutos(20)).toBe(20 * config.economia.monedasPorMinutoActivo);
  });

  it('el bono de racha tiene tope', () => {
    expect(bonoDeRacha(0)).toBe(0);
    expect(bonoDeRacha(3)).toBe(3 * config.economia.bonoRachaPorDia);
    expect(bonoDeRacha(100)).toBe(config.economia.bonoRachaMaximo);
  });

  it('con 20 minutos diarios alcanza para un artículo común al día', () => {
    const minutos = config.sesion.metaDiariaMin;
    // Tres niveles en 20 minutos es un día típico.
    const porNiveles = 3 * premioDeNivel(resumen()).monedas;
    const total =
      monedasPorMinutos(minutos) + porNiveles + config.economia.monedasMetaDiaria +
      config.economia.monedasMisionDelDia;
    expect(total).toBeGreaterThanOrEqual(config.economia.precios.comunMin);
    expect(total).toBeLessThan(config.economia.precios.raroMax);
  });

  it('la comparación de récord elige el tramo correcto', () => {
    expect(comparacionDeRecord(0.5)).toBe('granoDeArena');
    expect(comparacionDeRecord(3)).toBe('hormiga');
    expect(comparacionDeRecord(500)).toBe('moneda');
    expect(comparacionDeRecord(null)).toBeNull();
  });
});

describe('registro de la sesión', () => {
  function conSesion(): Estado {
    return reducir(estadoInicial(), {
      tipo: 'sesion/iniciar',
      id: 's1',
      dia: '2026-09-19',
      modo: 'lentes',
    });
  }

  it('abre una sesión del día y del modo', () => {
    const estado = conSesion();
    expect(estado.sesiones).toHaveLength(1);
    expect(estado.sesiones[0]).toMatchObject({ fecha: '2026-09-19', modo: 'lentes', fin: null });
  });

  it('los minutos se suman a la sesión abierta', () => {
    let estado = conSesion();
    estado = reducir(estado, { tipo: 'sesion/sumarMinutos', minutos: 4 });
    estado = reducir(estado, { tipo: 'sesion/sumarMinutos', minutos: 3 });
    expect(estado.sesiones[0].minutosActivos).toBe(7);
  });

  it('una sesión cerrada ya no recibe minutos', () => {
    let estado = conSesion();
    estado = reducir(estado, { tipo: 'sesion/terminar' });
    estado = reducir(estado, { tipo: 'sesion/sumarMinutos', minutos: 5 });
    expect(estado.sesiones[0].minutosActivos).toBe(0);
    expect(estado.sesiones[0].fin).not.toBeNull();
  });

  it('varios niveles del mismo juego se acumulan en la sesión', () => {
    let estado = conSesion();
    estado = reducir(estado, {
      tipo: 'sesion/registrarJuego',
      juego: 'minero',
      resumen: { ensayos: 15, aciertos: 10, umbrales: { tamano: 12 }, tiempoReaccionMedioMs: 1000 },
    });
    estado = reducir(estado, {
      tipo: 'sesion/registrarJuego',
      juego: 'minero',
      resumen: { ensayos: 15, aciertos: 12, umbrales: { tamano: 9 }, tiempoReaccionMedioMs: 800 },
    });
    const minero = estado.sesiones[0].porJuego.minero!;
    expect(minero.ensayos).toBe(30);
    expect(minero.aciertos).toBe(22);
    // El último umbral es el más informado.
    expect(minero.umbrales.tamano).toBe(9);
    expect(minero.tiempoReaccionMedioMs).toBe(900);
  });

  it('las estrellas de un nivel nunca bajan al repetirlo', () => {
    let estado = estadoInicial();
    estado = reducir(estado, {
      tipo: 'progreso/estrellas',
      juego: 'minero',
      mundo: 1,
      nivel: 2,
      estrellas: 3,
    });
    estado = reducir(estado, {
      tipo: 'progreso/estrellas',
      juego: 'minero',
      mundo: 1,
      nivel: 2,
      estrellas: 1,
    });
    expect(estado.progreso.minero.estrellasPorNivel['1:2']).toBe(3);
  });

  it('el récord guarda el tamaño más pequeño, no el último', () => {
    let estado = estadoInicial();
    estado = reducir(estado, {
      tipo: 'records/registrar',
      clave: 'minero:parche',
      px: 8,
      mm: 2.1,
      dia: '2026-09-19',
    });
    estado = reducir(estado, {
      tipo: 'records/registrar',
      clave: 'minero:parche',
      px: 12,
      mm: 3.2,
      dia: '2026-09-20',
    });
    expect(estado.records['minero:parche'].mejorPx).toBe(8);

    estado = reducir(estado, {
      tipo: 'records/registrar',
      clave: 'minero:parche',
      px: 5,
      mm: 1.3,
      dia: '2026-09-21',
    });
    expect(estado.records['minero:parche'].mejorPx).toBe(5);
    expect(estado.records['minero:parche'].fecha).toBe('2026-09-21');
  });

  it('las monedas solo suben', () => {
    let estado = estadoInicial();
    estado = reducir(estado, { tipo: 'economia/sumar', monedas: 40 });
    estado = reducir(estado, { tipo: 'economia/sumar', monedas: 0, cristales: 1 });
    expect(estado.economia.monedas).toBe(40);
    expect(estado.economia.cristales).toBe(1);
  });

  it('las escaleras guardadas se conservan entre sesiones', () => {
    const escalera = {
      valor: 9,
      minimo: 3,
      maximo: 120,
      aciertosSeguidos: 1,
      ultimaDireccion: -1 as const,
      inversiones: [12, 10, 11],
      historial: [60, 48],
      ensayos: 20,
      proximoEnsayoDeConfianza: 24,
    };
    const estado = reducir(estadoInicial(), {
      tipo: 'escaleras/guardar',
      escaleras: { 'minero:lentes:tamano': escalera },
    });
    expect(estado.escaleras['minero:lentes:tamano']).toEqual(escalera);
  });
});
