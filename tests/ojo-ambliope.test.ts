/**
 * Criterio de aceptación: cambiar ojoAmbliope a 'izquierdo' invierte capas,
 * parche y textos. Nada en la lógica ni en los textos escribe un ojo en duro.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { config, type Ojo } from '../src/config';
import { es, nombreDeOjo, ojoContrario } from '../src/i18n/es';
import { DichopticRenderer } from '../src/engine/DichopticRenderer';
import { formaDeColor, leerCss } from '../src/engine/color';
import { paletaDe } from '../src/engine/mundos';
import { colorDelOjo, ojoDominante, type CalibracionLentes } from '../src/storage/esquema';
import { generarPrueba } from '../src/calibration/escaner';
import { crearAleatorio } from '../src/engine/rng';
import { conParche } from '../src/avatar/sprites';
import { crearLienzoFalso } from './ayudas/lienzoFalso';

const LENTES: CalibracionLentes = {
  colorOjoDerecho: 'rojo',
  intensidadMaxRojo: 210,
  intensidadMaxCian: 185,
  fecha: '2026-09-19',
};

function renderer(ojoAmbliope: Ojo) {
  const lienzo = crearLienzoFalso();
  const dibujante = new DichopticRenderer(lienzo.ctx, {
    modo: 'lentes',
    ojoAmbliope,
    lentes: LENTES,
    contrasteOjoDominante: 0.2,
    paleta: paletaDe('minero', 1),
  });
  dibujante.redimensionar(400, 300, 1);
  return dibujante;
}

describe('cambiar el ojo ambliope', () => {
  it('invierte el color de cada capa', () => {
    const derecho = renderer('derecho');
    const izquierdo = renderer('izquierdo');
    const forma = (r: DichopticRenderer, capa: 'ojoAmbliope' | 'ojoDominante') =>
      formaDeColor(leerCss(r.cssDeCapa(capa))!);

    // El lente rojo cubre el ojo derecho: la capa del ambliope sigue al ojo.
    expect(forma(derecho, 'ojoAmbliope')).toBe('rojo');
    expect(forma(izquierdo, 'ojoAmbliope')).toBe('cian');
    expect(forma(derecho, 'ojoDominante')).toBe('cian');
    expect(forma(izquierdo, 'ojoDominante')).toBe('rojo');
  });

  it('el gris de ambos ojos no cambia: es el ancla de fusión', () => {
    expect(renderer('derecho').cssDeCapa('ambos')).toBe(renderer('izquierdo').cssDeCapa('ambos'));
  });

  it('invierte el ojo dominante', () => {
    expect(ojoDominante({ nombre: 'A', edad: 12, ojoAmbliope: 'derecho' })).toBe('izquierdo');
    expect(ojoDominante({ nombre: 'A', edad: 12, ojoAmbliope: 'izquierdo' })).toBe('derecho');
  });

  it('invierte el ojo que se tapa con el parche', () => {
    expect(ojoContrario('derecho')).toBe('izquierdo');
    expect(ojoContrario('izquierdo')).toBe('derecho');
  });

  it('invierte el lado del parche en la pixelnauta', () => {
    const tapaDerecho = conParche('derecho');
    const tapaIzquierdo = conParche('izquierdo');
    expect(tapaDerecho).not.toEqual(tapaIzquierdo);
    // Nos mira de frente: su ojo derecho cae a la izquierda de la imagen.
    expect(tapaDerecho[4].slice(0, 6)).not.toContain('V');
    expect(tapaIzquierdo[4].slice(6)).not.toContain('V');
  });

  it('invierte el texto del chequeo de parche', () => {
    const conAmbliopeDerecho = es.chequeo.parche(ojoContrario('derecho'));
    const conAmbliopeIzquierdo = es.chequeo.parche(ojoContrario('izquierdo'));
    expect(conAmbliopeDerecho).toContain('izquierdo');
    expect(conAmbliopeDerecho).not.toContain('derecho');
    expect(conAmbliopeIzquierdo).toContain('derecho');
    expect(conAmbliopeIzquierdo).not.toContain('izquierdo');
  });

  it('invierte el ojo que se cierra en la calibración y en el escáner', () => {
    for (const ojo of ['derecho', 'izquierdo'] as Ojo[]) {
      const dominante = ojoDominante({ nombre: 'A', edad: 12, ojoAmbliope: ojo });
      const texto = es.calibracion.escaner.instruccion(nombreDeOjo(dominante));
      expect(texto).toContain(nombreDeOjo(dominante));
      expect(texto).not.toContain(nombreDeOjo(ojo));
    }
  });

  it('el color del lente de cada ojo sale del dato de hardware, no del perfil', () => {
    // Los lentes no cambian: lo que cambia es a qué ojo le toca cada capa.
    expect(colorDelOjo(LENTES, 'derecho')).toBe('rojo');
    expect(colorDelOjo(LENTES, 'izquierdo')).toBe('cian');
  });

  it('el escáner previo sigue dando una figura por ojo', () => {
    const prueba = generarPrueba(crearAleatorio('2026-09-19'));
    expect(prueba.figuraAmbliope.id).not.toBe(prueba.figuraDominante.id);
  });

  it('el ojo ambliope por defecto es el de la usuaria', () => {
    expect(config.ojoAmbliope).toBe('derecho');
  });
});

describe('ningún ojo escrito en duro', () => {
  function archivosDe(carpeta: string, extensiones: string[]): string[] {
    const salida: string[] = [];
    for (const entrada of readdirSync(carpeta)) {
      const ruta = join(carpeta, entrada);
      if (statSync(ruta).isDirectory()) salida.push(...archivosDe(ruta, extensiones));
      else if (extensiones.some((e) => entrada.endsWith(e))) salida.push(ruta);
    }
    return salida;
  }

  /**
   * Fuera de config.ts (que fija el valor por defecto), i18n/es.ts (que traduce
   * el nombre) y esquema.ts (que guarda el dato de hardware), ningún módulo
   * debe decidir nada mirando un ojo escrito en duro.
   */
  it('la lógica no compara contra un ojo literal', () => {
    const permitidos = new Set([
      'src/config.ts',
      'src/i18n/es.ts',
      'src/storage/esquema.ts',
      'src/engine/DichopticRenderer.ts',
      'src/calibration/CalibracionDeLentes.tsx',
      'src/ui/adultos/Configuracion.tsx',
      'src/ui/AsistenteInicial.tsx',
      'src/avatar/sprites.ts',
      'src/ui/MisRecords.tsx',
    ]);

    const culpables: string[] = [];
    for (const ruta of archivosDe('src', ['.ts', '.tsx'])) {
      if (permitidos.has(ruta.replace(/\\/g, '/'))) continue;
      const contenido = readFileSync(ruta, 'utf8');
      // Comparaciones o literales de ojo fuera de los archivos permitidos.
      if (/['"](derecho|izquierdo)['"]/.test(contenido)) culpables.push(ruta);
    }

    expect(culpables).toEqual([]);
  });

  it('config.ts fija el ojo por defecto en un solo sitio', () => {
    const configuracion = readFileSync('src/config.ts', 'utf8');
    // Una línea define el tipo y otra el valor por defecto: nada más.
    expect(configuracion.match(/^export type Ojo = /m)).not.toBeNull();
    expect(configuracion.match(/ojoAmbliope: '(derecho|izquierdo)'/g) ?? []).toHaveLength(1);
  });
});
