import { describe, it, expect } from 'vitest';
import { config } from '../src/config';
import { crearAleatorio } from '../src/engine/rng';
import { generarPrueba, evaluar } from '../src/calibration/escaner';
import { FIGURAS } from '../src/calibration/figuras';
import { PIXELNAUTA, conParche } from '../src/avatar/sprites';
import { aCss, rgbDeLente, formaDeColor, leerCss, colorPermitidoEnLentes } from '../src/engine/color';

describe('escáner previo', () => {
  it('ofrece dos figuras distintas, una por ojo', () => {
    for (let semilla = 0; semilla < 50; semilla += 1) {
      const prueba = generarPrueba(crearAleatorio(semilla));
      expect(prueba.figuraAmbliope.id).not.toBe(prueba.figuraDominante.id);
      expect(prueba.opciones).toHaveLength(2);
      expect(new Set(prueba.opciones.map((f) => f.id)).size).toBe(2);
    }
  });

  it('qué figura va a cada ojo cambia entre pruebas: no se memoriza', () => {
    const asignaciones = new Set<string>();
    for (let semilla = 0; semilla < 40; semilla += 1) {
      asignaciones.add(generarPrueba(crearAleatorio(semilla)).figuraAmbliope.id);
    }
    expect(asignaciones.size).toBeGreaterThan(1);
  });

  it('las posiciones caen dentro del área, con margen', () => {
    for (let semilla = 0; semilla < 40; semilla += 1) {
      const { posicionAmbliope, posicionDominante } = generarPrueba(crearAleatorio(semilla));
      for (const p of [posicionAmbliope, posicionDominante]) {
        expect(p.x).toBeGreaterThan(0.1);
        expect(p.x).toBeLessThan(0.9);
        expect(p.y).toBeGreaterThan(0.1);
        expect(p.y).toBeLessThan(0.9);
      }
    }
  });

  it('la misma semilla da siempre la misma prueba', () => {
    expect(generarPrueba(crearAleatorio('2026-09-19'))).toEqual(
      generarPrueba(crearAleatorio('2026-09-19')),
    );
  });

  it('interpreta la respuesta', () => {
    expect(evaluar('ambliope')).toBe('correcto');
    expect(evaluar('dominante')).toBe('alReves');
    expect(evaluar('ambas')).toBe('revisar');
  });
});

describe('colores de la calibración', () => {
  it('los cuadrados de identificación son rojo y cian puros', () => {
    const rojo = leerCss(aCss(rgbDeLente('rojo', 255)))!;
    const cian = leerCss(aCss(rgbDeLente('cian', 255)))!;
    expect(formaDeColor(rojo)).toBe('rojo');
    expect(formaDeColor(cian)).toBe('cian');
    expect(colorPermitidoEnLentes(rojo, { intensidadMaxRojo: 255, intensidadMaxCian: 255 })).toBe(
      true,
    );
  });

  it('el fondo de calibración es negro puro', () => {
    expect(config.color.fondoLentes).toBe('#000000');
  });
});

describe('figuras', () => {
  it('todas son cuadradas y del mismo tamaño', () => {
    for (const figura of FIGURAS) {
      expect(figura.pixeles).toHaveLength(9);
      for (const fila of figura.pixeles) expect(fila).toHaveLength(9);
    }
  });

  it('todas tienen píxeles encendidos y se distinguen entre sí', () => {
    const siluetas = new Set<string>();
    for (const figura of FIGURAS) {
      const texto = figura.pixeles.join('');
      expect(texto).toContain('#');
      siluetas.add(texto);
    }
    expect(siluetas.size).toBe(FIGURAS.length);
  });
});

describe('pixelnauta con parche', () => {
  it('el parche tapa la mitad del visor del ojo indicado', () => {
    const tapaDerecho = conParche('derecho');
    const tapaIzquierdo = conParche('izquierdo');

    // Nos mira de frente: su ojo derecho cae a la izquierda de la imagen.
    expect(tapaDerecho[4].slice(0, 6)).not.toContain('V');
    expect(tapaDerecho[4].slice(6)).toContain('V');
    expect(tapaIzquierdo[4].slice(6)).not.toContain('V');
    expect(tapaIzquierdo[4].slice(0, 6)).toContain('V');
  });

  it('no altera nada fuera del visor y la cinta', () => {
    const conParcheDerecho = conParche('derecho');
    for (const fila of [0, 1, 2, 7, 8, 9, 10, 11, 12, 13]) {
      expect(conParcheDerecho[fila]).toBe(PIXELNAUTA[fila]);
    }
  });

  it('el sprite base es rectangular y usa solo caracteres conocidos', () => {
    const ancho = PIXELNAUTA[0].length;
    for (const fila of PIXELNAUTA) {
      expect(fila).toHaveLength(ancho);
      expect(fila).toMatch(/^[.KHVB]+$/);
    }
  });
});
