import { describe, expect, it } from 'vitest';
import { config } from '../src/config';
import { monedasPorTiempo } from '../src/rewards/economia';
import { reducir } from '../src/storage/acciones';
import { estadoInicial, type Estado, type Sesion } from '../src/storage/esquema';
import {
  metaCumplida,
  minutosDelDia,
  precisionDelDia,
  premioDePantallaGanado,
} from '../src/storage/selectores';
import { mmss } from '../src/ui/componentes/RelojDelDia';

const DIA = '2026-09-24';

function sesion(parcial: Partial<Sesion> = {}): Sesion {
  return {
    id: Math.random().toString(36).slice(2),
    fecha: DIA,
    modo: 'parche',
    inicio: `${DIA}T10:00:00.000Z`,
    fin: null,
    minutosActivos: 0,
    porJuego: {},
    ...parcial,
  };
}

const jugado = (ensayos: number, aciertos: number) => ({
  niveles: 1,
  ensayos,
  aciertos,
  umbrales: {},
  tiempoReaccionMedioMs: 700,
});

function conSesiones(...sesiones: Sesion[]): Estado {
  return { ...estadoInicial(), sesiones };
}

describe('reloj del día', () => {
  it('se muestra como minutos y segundos', () => {
    expect(mmss(0)).toBe('0:00');
    expect(mmss(754)).toBe('12:34');
    expect(mmss(20 * 60)).toBe('20:00');
    expect(mmss(61 * 60 + 5)).toBe('61:05');
  });

  it('los trozos de minuto se suman sin perder segundos', () => {
    let estado = reducir(estadoInicial(), { tipo: 'sesion/iniciar', id: 'a', dia: DIA, modo: 'parche' });
    for (let i = 0; i < 80; i += 1) {
      estado = reducir(estado, { tipo: 'sesion/sumarMinutos', minutos: 15 / 60 });
    }
    // 80 × 15 s = 20 min justos: sin un 19,999… que no llegue a la meta.
    expect(minutosDelDia(estado, DIA)).toBe(20);
    expect(metaCumplida(estado, DIA)).toBe(true);
  });

  it('el último trozo llega a su sesión aunque ya se haya cerrado', () => {
    let estado = reducir(estadoInicial(), { tipo: 'sesion/iniciar', id: 'a', dia: DIA, modo: 'parche' });
    estado = reducir(estado, { tipo: 'sesion/terminar' });
    estado = reducir(estado, { tipo: 'sesion/sumarMinutos', minutos: 0.5, id: 'a' });
    expect(estado.sesiones[0].minutosActivos).toBe(0.5);
  });

  it('las monedas pagan cada minuto entero del día, aunque llegue a trozos', () => {
    const porMinuto = config.economia.monedasPorMinutoActivo;
    expect(monedasPorTiempo(0, 0.75)).toBe(0);
    expect(monedasPorTiempo(0.75, 1.25)).toBe(porMinuto);
    expect(monedasPorTiempo(1.25, 4)).toBe(3 * porMinuto);
  });
});

describe('premio de tiempo de pantalla', () => {
  const meta = config.sesion.metaDiariaMin;

  it('la precisión del día junta todos los juegos', () => {
    const estado = conSesiones(
      sesion({ porJuego: { minero: jugado(10, 9), gabor: jugado(10, 8) } }),
      sesion({ porJuego: { torre: jugado(20, 17) } }),
      sesion({ fecha: '2026-09-23', porJuego: { minero: jugado(10, 0) } }),
    );
    expect(precisionDelDia(estado, DIA)).toBeCloseTo(34 / 40, 6);
    expect(precisionDelDia(estado, '2026-09-22')).toBeNull();
  });

  it('se gana con la meta de minutos y el 85 % de aciertos', () => {
    expect(config.premioDePantalla.precisionMinima).toBe(0.85);
    expect(config.premioDePantalla.minutosExtra).toBe(15);
    const conMinutos = (minutos: number, aciertos: number) =>
      conSesiones(sesion({ minutosActivos: minutos, porJuego: { minero: jugado(100, aciertos) } }));

    expect(premioDePantallaGanado(conMinutos(meta, 85), DIA)).toBe(true);
    expect(premioDePantallaGanado(conMinutos(meta, 84), DIA)).toBe(false);
    expect(premioDePantallaGanado(conMinutos(meta - 1, 95), DIA)).toBe(false);
    expect(premioDePantallaGanado(conSesiones(sesion({ minutosActivos: meta })), DIA)).toBe(false);
  });

  it('se marca como visto una sola vez por día', () => {
    let estado = reducir(estadoInicial(), { tipo: 'premio/visto', dia: DIA });
    estado = reducir(estado, { tipo: 'premio/visto', dia: DIA });
    expect(estado.premiosDePantalla).toEqual([DIA]);
  });
});
