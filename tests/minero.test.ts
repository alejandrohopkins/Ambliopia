import { describe, it, expect } from 'vitest';
import { config } from '../src/config';
import { escalerasDeMinero, paredDelMundo, segundosPorEnsayo } from '../src/games/minero/Minero';
import { estrellasDeNivel, ContadorDeNivel, factorDePulso, areaDeJuego } from '../src/games/comun';
import { claveDeEscalera } from '../src/games/tipos';
import { DichopticRenderer } from '../src/engine/DichopticRenderer';
import { paletaDe } from '../src/engine/mundos';
import { crearLienzoFalso } from './ayudas/lienzoFalso';

describe('pared del minero', () => {
  it('crece con el mundo', () => {
    const celdas = [1, 2, 3, 4, 5].map((m) => {
      const { cols, filas } = paredDelMundo(m);
      return cols * filas;
    });
    for (let i = 1; i < celdas.length; i += 1) {
      expect(celdas[i]).toBeGreaterThanOrEqual(celdas[i - 1]);
    }
    expect(paredDelMundo(1)).toEqual({ cols: 3, filas: 3 });
    expect(paredDelMundo(5)).toEqual({ cols: 6, filas: 4 });
  });

  it('un mundo fuera de rango se recorta al extremo', () => {
    expect(paredDelMundo(0)).toEqual(paredDelMundo(1));
    expect(paredDelMundo(9)).toEqual(paredDelMundo(5));
  });

  it('el tiempo por ensayo baja del mundo 1 al 5', () => {
    expect(segundosPorEnsayo(1)).toBe(config.minero.segundosPorEnsayoMundo1);
    expect(segundosPorEnsayo(5)).toBe(config.minero.segundosPorEnsayoMundo5);
    expect(segundosPorEnsayo(3)).toBeLessThan(segundosPorEnsayo(1));
    expect(segundosPorEnsayo(3)).toBeGreaterThan(segundosPorEnsayo(5));
  });
});

describe('escaleras del minero', () => {
  it('en parche mide tamaño y contraste', () => {
    const claves = escalerasDeMinero('parche', 1).map((e) => e.clave);
    expect(claves).toEqual([
      claveDeEscalera('minero', 'parche', 'tamano'),
      claveDeEscalera('minero', 'parche', 'contraste'),
    ]);
  });

  it('en lentes solo mide el tamaño: el cristal va a intensidad máxima', () => {
    const claves = escalerasDeMinero('lentes', 1).map((e) => e.clave);
    expect(claves).toEqual([claveDeEscalera('minero', 'lentes', 'tamano')]);
  });

  it('arranca en los valores de config y respeta los mínimos', () => {
    const [tamano, contraste] = escalerasDeMinero('parche', 1);
    expect(tamano.valorInicial).toBe(config.minero.tamanoInicialPx);
    expect(tamano.minimo).toBe(config.minero.tamanoMinimoPx);
    expect(contraste.valorInicial).toBe(config.minero.contrasteInicial);
    expect(contraste.maximo).toBe(config.minero.contrasteMaximo);
    // El mínimo de contraste es el paso representable en 8 bits.
    expect(contraste.minimo).toBeCloseTo(1 / 255, 6);
  });
});

describe('estrellas del nivel', () => {
  it('completar el nivel siempre da una estrella', () => {
    expect(estrellasDeNivel(0, 0)).toBe(1);
    expect(estrellasDeNivel(0.5, 0)).toBe(1);
  });

  it('la segunda estrella llega con el 65 % de aciertos', () => {
    expect(estrellasDeNivel(config.progresion.precisionDosEstrellas, 0)).toBe(2);
    expect(estrellasDeNivel(config.progresion.precisionDosEstrellas - 0.01, 0)).toBe(1);
  });

  it('la tercera llega con el 75 % o con una racha de cinco', () => {
    expect(estrellasDeNivel(config.progresion.precisionTresEstrellas, 0)).toBe(3);
    expect(estrellasDeNivel(0.5, config.progresion.rachaTresEstrellas)).toBe(3);
    expect(estrellasDeNivel(0.5, config.progresion.rachaTresEstrellas - 1)).toBe(1);
  });

  it('con la precisión que persigue la escalera las tres estrellas son alcanzables', () => {
    // La escalera converge cerca del 71 %: dos estrellas seguras, y la tercera
    // con una racha de cinco, que ocurre a menudo a ese nivel de aciertos.
    expect(estrellasDeNivel(0.71, 0)).toBe(2);
    expect(estrellasDeNivel(0.71, 5)).toBe(3);
  });
});

describe('contador de nivel', () => {
  it('los ensayos de confianza no entran en la precisión', () => {
    const contador = new ContadorDeNivel();
    contador.registrar(true, 500, false);
    contador.registrar(false, 900, false);
    contador.registrar(true, 400, true); // confianza: se ignora
    const resumen = contador.resumen({});
    expect(resumen.ensayos).toBe(2);
    expect(resumen.aciertos).toBe(1);
    expect(resumen.precision).toBe(0.5);
  });

  it('guarda la mejor racha, no la última', () => {
    const contador = new ContadorDeNivel();
    for (const acierto of [true, true, true, false, true]) contador.registrar(acierto, 500, false);
    expect(contador.resumen({}).mejorRacha).toBe(3);
  });

  it('el tiempo de reacción medio solo cuenta los aciertos', () => {
    const contador = new ContadorDeNivel();
    contador.registrar(true, 400, false);
    contador.registrar(false, 6000, false);
    contador.registrar(true, 600, false);
    expect(contador.tiempoReaccionMedioMs).toBe(500);
  });

  it('un nivel sin ensayos no rompe la precisión', () => {
    expect(new ContadorDeNivel().resumen({}).precision).toBe(0);
  });
});

describe('pulso del cristal', () => {
  it('nunca sube por encima del valor pedido', () => {
    for (let ms = 0; ms < 4000; ms += 17) {
      expect(factorDePulso(ms)).toBeLessThanOrEqual(1);
      expect(factorDePulso(ms)).toBeGreaterThan(0.8);
    }
  });

  it('late como mucho una vez por segundo, dentro del límite de destellos', () => {
    expect(config.minero.pulsoHz).toBeLessThanOrEqual(config.accesibilidad.maxParpadeosPorSegundo);
    // Un ciclo completo dura al menos un segundo.
    expect(factorDePulso(0)).toBeCloseTo(factorDePulso(1000 / config.minero.pulsoHz), 6);
  });
});

describe('área de juego', () => {
  it('deja sitio para el HUD y no se sale del lienzo', () => {
    const lienzo = crearLienzoFalso();
    const renderer = new DichopticRenderer(lienzo.ctx, {
      modo: 'parche',
      ojoAmbliope: 'derecho',
      lentes: { colorOjoDerecho: null, intensidadMaxRojo: 255, intensidadMaxCian: 255, fecha: null },
      contrasteOjoDominante: 0.2,
      paleta: paletaDe('minero', 1),
    });
    renderer.redimensionar(800, 600, 1);
    const area = areaDeJuego(renderer);
    expect(area.y).toBeGreaterThan(0);
    expect(area.x + area.ancho).toBeLessThanOrEqual(800);
    expect(area.y + area.alto).toBeLessThanOrEqual(600);
  });

  it('en un lienzo diminuto el área sigue teniendo tamaño positivo', () => {
    const lienzo = crearLienzoFalso();
    const renderer = new DichopticRenderer(lienzo.ctx, {
      modo: 'lentes',
      ojoAmbliope: 'derecho',
      lentes: { colorOjoDerecho: 'rojo', intensidadMaxRojo: 200, intensidadMaxCian: 200, fecha: 'x' },
      contrasteOjoDominante: 0.2,
      paleta: paletaDe('minero', 1),
    });
    renderer.redimensionar(40, 30, 1);
    const area = areaDeJuego(renderer);
    expect(area.ancho).toBeGreaterThan(0);
    expect(area.alto).toBeGreaterThan(0);
  });
});
