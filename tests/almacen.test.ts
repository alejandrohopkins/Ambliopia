import { describe, it, expect, beforeEach } from 'vitest';
import { config } from '../src/config';
import { estadoInicial, colorDelOjo, ojoDominante, lentesCalibrados } from '../src/storage/esquema';
import { migrar } from '../src/storage/migraciones';
import {
  cargar,
  guardar,
  borrarTodo,
  exportarJSON,
  importarJSON,
  nombreDeArchivo,
} from '../src/storage/almacen';

/** localStorage mínimo para probar la capa de guardado sin navegador. */
class AlmacenDePrueba implements Storage {
  private datos = new Map<string, string>();
  get length() {
    return this.datos.size;
  }
  clear() {
    this.datos.clear();
  }
  getItem(clave: string) {
    return this.datos.get(clave) ?? null;
  }
  key(i: number) {
    return [...this.datos.keys()][i] ?? null;
  }
  removeItem(clave: string) {
    this.datos.delete(clave);
  }
  setItem(clave: string, valor: string) {
    this.datos.set(clave, valor);
  }
}

beforeEach(() => {
  Object.defineProperty(globalThis, 'localStorage', {
    value: new AlmacenDePrueba(),
    configurable: true,
    writable: true,
  });
});

describe('guardado', () => {
  it('sin datos guardados devuelve el estado inicial', () => {
    expect(cargar().asistenteCompletado).toBe(false);
    expect(cargar().version).toBe(config.almacenamiento.version);
  });

  it('guarda y recupera el estado igual (ida y vuelta)', () => {
    const estado = estadoInicial();
    estado.perfil.nombre = 'Alana';
    estado.economia.monedas = 137;
    estado.galeria = ['escalera', 'piramide'];
    estado.sesiones.push({
      id: 's1',
      fecha: '2026-09-19',
      modo: 'lentes',
      inicio: '2026-09-19T10:00:00.000Z',
      fin: null,
      minutosActivos: 21,
      porJuego: { minero: { niveles: 1, ensayos: 30, aciertos: 21, umbrales: { tamano: 9.5 }, tiempoReaccionMedioMs: 880 } },
    });

    expect(guardar(estado).ok).toBe(true);
    expect(cargar()).toEqual(estado);
  });

  it('datos corruptos no rompen la app', () => {
    localStorage.setItem(config.almacenamiento.clave, '{esto no es json');
    expect(cargar().version).toBe(config.almacenamiento.version);
  });

  it('borrar todo deja el estado inicial', () => {
    const estado = estadoInicial();
    estado.economia.monedas = 50;
    guardar(estado);
    borrarTodo();
    expect(cargar().economia.monedas).toBe(0);
  });

  it('informa la cuota agotada sin lanzar', () => {
    const lleno = new AlmacenDePrueba();
    lleno.setItem = () => {
      throw new DOMException('lleno', 'QuotaExceededError');
    };
    Object.defineProperty(globalThis, 'localStorage', { value: lleno, configurable: true });
    const resultado = guardar(estadoInicial());
    expect(resultado.ok).toBe(false);
    expect(resultado.motivo).toBe('cuota');
  });
});

describe('migraciones', () => {
  it('un estado sin versión llega a la versión actual con todo completo', () => {
    const viejo = { perfil: { nombre: 'Alana' }, economia: { monedas: 40 } };
    const migrado = migrar(viejo);
    expect(migrado.version).toBe(config.almacenamiento.version);
    expect(migrado.perfil.nombre).toBe('Alana');
    expect(migrado.perfil.ojoAmbliope).toBe(config.ojoAmbliope);
    expect(migrado.economia.monedas).toBe(40);
    expect(migrado.economia.inventario).toEqual([]);
    expect(migrado.racha.protectoresDisponibles).toBe(config.racha.protectoresPorSemana);
    expect(migrado.progreso.torre.mundo).toBe(1);
  });

  it('rellena un juego nuevo sin borrar el progreso existente', () => {
    const viejo = {
      version: 1,
      progreso: { minero: { mundo: 3, nivel: 2, estrellasPorNivel: { '1:1': 3 } } },
    };
    const migrado = migrar(viejo);
    expect(migrado.progreso.minero.mundo).toBe(3);
    expect(migrado.progreso.minero.estrellasPorNivel['1:1']).toBe(3);
    expect(migrado.progreso.meteoritos.mundo).toBe(1);
  });

  it('repara colecciones con el tipo equivocado', () => {
    const migrado = migrar({ version: 1, sesiones: 'no es una lista', insignias: 7 });
    expect(migrado.sesiones).toEqual([]);
    expect(migrado.insignias).toEqual({});
  });

  it('un valor que no es objeto da el estado inicial', () => {
    expect(migrar(null).version).toBe(config.almacenamiento.version);
    expect(migrar([1, 2, 3]).sesiones).toEqual([]);
  });

  it('migrar dos veces es idempotente', () => {
    const una = migrar({ version: 1, economia: { monedas: 9 } });
    expect(migrar(una)).toEqual(una);
  });
});

describe('exportar e importar', () => {
  it('un respaldo exportado se vuelve a importar igual', () => {
    const estado = estadoInicial();
    estado.economia.cristales = 4;
    estado.notas = [{ fecha: '2026-09-19', texto: 'Control con el oftalmólogo' }];
    const texto = exportarJSON(estado);
    const resultado = importarJSON(texto);
    expect(resultado.ok).toBe(true);
    expect(resultado.estado).toEqual(estado);
  });

  it('rechaza un JSON inválido', () => {
    expect(importarJSON('{roto').ok).toBe(false);
    expect(importarJSON('[]').error).toBe('forma');
  });

  it('el nombre de archivo sale limpio de acentos y espacios', () => {
    expect(nombreDeArchivo('Alana', '2026-09-19', 'csv')).toBe('mision-pixel-alana-2026-09-19.csv');
    expect(nombreDeArchivo('María José', '2026-09-19', 'json')).toBe(
      'mision-pixel-maria-jose-2026-09-19.json',
    );
  });
});

describe('derivaciones del esquema', () => {
  it('el ojo dominante es siempre el contrario al ambliope', () => {
    expect(ojoDominante({ nombre: 'A', edad: 12, ojoAmbliope: 'derecho' })).toBe('izquierdo');
    expect(ojoDominante({ nombre: 'A', edad: 12, ojoAmbliope: 'izquierdo' })).toBe('derecho');
  });

  it('el color de cada ojo sale del dato calibrado del hardware', () => {
    const lentes = {
      colorOjoDerecho: 'rojo' as const,
      intensidadMaxRojo: 200,
      intensidadMaxCian: 180,
      fecha: '2026-09-19',
    };
    expect(colorDelOjo(lentes, 'derecho')).toBe('rojo');
    expect(colorDelOjo(lentes, 'izquierdo')).toBe('cian');
  });

  it('sin calibrar, no hay color de lente ni modo lentes', () => {
    const estado = estadoInicial();
    expect(colorDelOjo(estado.calibracion.lentes, 'derecho')).toBeNull();
    expect(lentesCalibrados(estado.calibracion)).toBe(false);
  });
});
