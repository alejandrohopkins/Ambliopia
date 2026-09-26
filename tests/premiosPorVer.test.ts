import { describe, expect, it } from 'vitest';
import { config } from '../src/config';
import { cerrarYApuntar, juntarPremios } from '../src/rewards/premiosPorVer';
import { reducir } from '../src/storage/acciones';
import { estadoInicial, type Estado, type PremiosPorVer, type Sesion } from '../src/storage/esquema';
import { migrar } from '../src/storage/migraciones';

function sesion(fecha: string, minutos: number): Sesion {
  return {
    id: `${fecha}-${minutos}`,
    fecha,
    modo: 'parche',
    inicio: `${fecha}T10:00:00.000Z`,
    fin: `${fecha}T10:30:00.000Z`,
    minutosActivos: minutos,
    porJuego: {},
  };
}

function base(parcial: Partial<Estado> = {}): Estado {
  return { ...estadoInicial(), ultimoCierre: '2026-09-21', ...parcial };
}

const META = config.sesion.metaDiariaMin;

describe('premios del cierre del día', () => {
  it('lo que se paga al cerrar un día con la meta queda apuntado para verlo', () => {
    const estado = cerrarYApuntar(base({ sesiones: [sesion('2026-09-21', META)] }), '2026-09-22');
    expect(estado.premiosPorVer).toMatchObject({
      monedasPorMeta: config.economia.monedasMetaDiaria,
      cristales: config.economia.cristalesPorDiaConMeta,
      rachaAntes: 0,
      rachaDespues: 1,
      cofres: [],
    });
    // Lo apuntado es lo que de verdad se pagó.
    expect(estado.economia.cristales).toBe(config.economia.cristalesPorDiaConMeta);
  });

  it('el cofre semanal sale en la tarjeta con sus monedas', () => {
    const dias = ['2026-09-21', '2026-09-22', '2026-09-23', '2026-09-24', '2026-09-25'];
    const estado = cerrarYApuntar(base({ sesiones: dias.map((d) => sesion(d, META)) }), '2026-09-26');
    expect(estado.premiosPorVer?.cofres).toHaveLength(1);
    expect(estado.premiosPorVer?.cofres[0].monedas).toBe(config.economia.cofreSemanalMonedas);
    expect(estado.premiosPorVer?.rachaDespues).toBe(dias.length);
  });

  it('una insignia nueva sale aunque no haya día que cerrar', () => {
    const inicial = base({
      ultimoCierre: '2026-09-26',
      contadores: { ...estadoInicial().contadores, cristalesEncontrados: 1 },
    });
    const estado = cerrarYApuntar(inicial, '2026-09-26');
    expect(estado.premiosPorVer?.insignias).toContain('primer_cristal');
  });

  it('si no hay nada nuevo, el estado no cambia', () => {
    const inicial = cerrarYApuntar(base({ ultimoCierre: '2026-09-26' }), '2026-09-26');
    expect(cerrarYApuntar(inicial, '2026-09-26')).toBe(inicial);
    expect(inicial.premiosPorVer).toBeNull();
  });

  it('lo que no se vio se junta con lo nuevo, y al verlo se borra', () => {
    const uno: PremiosPorVer = {
      monedasPorMeta: 20,
      monedasPorRacha: 5,
      monedasPorMision: 0,
      cristales: 1,
      cofres: [],
      insignias: ['primer_cristal'],
      rachaAntes: 2,
      rachaDespues: 3,
    };
    const dos: PremiosPorVer = { ...uno, cofres: [{ articulo: null, monedas: 50 }], rachaAntes: 3, rachaDespues: 4 };
    expect(juntarPremios(uno, dos)).toEqual({
      monedasPorMeta: 40,
      monedasPorRacha: 10,
      monedasPorMision: 0,
      cristales: 2,
      cofres: [{ articulo: null, monedas: 50 }],
      insignias: ['primer_cristal'],
      rachaAntes: 2,
      rachaDespues: 4,
    });
    const visto = reducir({ ...estadoInicial(), premiosPorVer: uno }, { tipo: 'premiosPorVer/vistos' });
    expect(visto.premiosPorVer).toBeNull();
  });
});

describe('galería vista', () => {
  it('se marca vista hasta la última figura construida', () => {
    const estado = reducir({ ...estadoInicial(), galeria: ['a', 'b'] }, { tipo: 'galeria/vista' });
    expect(estado.galeriaVista).toBe(2);
  });
});

describe('migración a la versión 5', () => {
  it('sin premios por ver y con la galería de antes ya vista', () => {
    const migrado = migrar({ version: 4, galeria: ['corazon', 'cohete'] });
    expect(migrado.version).toBe(config.almacenamiento.version);
    expect(migrado.premiosPorVer).toBeNull();
    expect(migrado.galeriaVista).toBe(2);
  });

  it('unos premios a medias se completan al importar', () => {
    const migrado = migrar({ version: 5, premiosPorVer: { monedasPorMeta: 20 } });
    expect(migrado.premiosPorVer).toMatchObject({ monedasPorMeta: 20, cofres: [], insignias: [] });
  });
});
