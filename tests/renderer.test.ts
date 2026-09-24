import { describe, it, expect } from 'vitest';
import { config, type Modo, type Ojo } from '../src/config';
import { DichopticRenderer, type Capa, type Sprite } from '../src/engine/DichopticRenderer';
import { colorPermitidoEnLentes, formaDeColor, leerCss } from '../src/engine/color';
import { paletaDe } from '../src/engine/mundos';
import type { CalibracionLentes } from '../src/storage/esquema';
import { crearLienzoFalso } from './ayudas/lienzoFalso';

const LENTES: CalibracionLentes = {
  colorOjoDerecho: 'rojo',
  intensidadMaxRojo: 210,
  intensidadMaxCian: 185,
  fecha: '2026-09-19',
};

const CAPAS: Capa[] = ['ojoAmbliope', 'ojoDominante', 'ambos'];

const SPRITE: Sprite = {
  pixeles: ['.KK.', 'KHHK', 'KHVK', '.KK.'],
  paleta: {
    K: { color: '#1B1446', factorLentes: 0.5 },
    H: { color: '#EDE9FF', factorLentes: 1 },
    V: { color: '#3FD6C6', factorLentes: 0.8 },
  },
};

function crear(modo: Modo, ojoAmbliope: Ojo = 'derecho') {
  const lienzo = crearLienzoFalso();
  const renderer = new DichopticRenderer(lienzo.ctx, {
    modo,
    ojoAmbliope,
    lentes: LENTES,
    contrasteOjoDominante: config.balance.contrasteInicialOjoDominante,
    paleta: paletaDe('minero', 1),
  });
  renderer.redimensionar(400, 300, 2);
  return { renderer, lienzo };
}

/** Recorre todo el repertorio de dibujo del renderer. */
function dibujarDeTodo(renderer: DichopticRenderer) {
  renderer.limpiar();
  for (const capa of CAPAS) {
    renderer.rect(capa, 10, 10, 40, 40);
    renderer.rect(capa, 10, 10, 40, 40, { factor: 0.35 });
    renderer.rect(capa, 10, 10, 40, 40, { tono: '#FF00AA' });
    renderer.marco(capa, 5, 5, 80, 60, 3);
    renderer.anilloConAbertura(capa, 120, 120, 24, 4, 0, config.saboteador.fraccionAbertura);
    renderer.anilloConAbertura(capa, 120, 120, 9, 2, 2, config.saboteador.fraccionAbertura);
    renderer.poligono(capa, [
      [200, 100],
      [220, 130],
      [180, 130],
    ]);
    renderer.sprite(capa, SPRITE, 250, 40, 4);
    renderer.texto(capa, '12 de 20 min', 300, 10, 16, 'right');
  }
}

describe('DichopticRenderer en modo lentes', () => {
  it('solo produce colores permitidos', () => {
    const { renderer, lienzo } = crear('lentes');
    dibujarDeTodo(renderer);

    expect(lienzo.pintados.length).toBeGreaterThan(20);
    const prohibidos = lienzo.pintados
      .map((css) => ({ css, rgb: leerCss(css)! }))
      .filter(({ rgb }) => !colorPermitidoEnLentes(rgb, LENTES));

    expect(prohibidos.map((p) => p.css)).toEqual([]);
  });

  it('el fondo es negro puro', () => {
    const { renderer, lienzo } = crear('lentes');
    renderer.limpiar();
    expect(lienzo.pintados[0]).toBe(config.color.fondoLentes);
  });

  it('ignora el tono que le pasen: el color lo manda la capa', () => {
    const { renderer } = crear('lentes');
    const conTono = renderer.cssDeCapa('ojoAmbliope', { tono: '#FF00AA' });
    const sinTono = renderer.cssDeCapa('ojoAmbliope');
    expect(conTono).toBe(sinTono);
  });

  it('cada ojo recibe el color de SU lente y nada del otro', () => {
    const { renderer } = crear('lentes', 'derecho');
    const ambliope = leerCss(renderer.cssDeCapa('ojoAmbliope'))!;
    const dominante = leerCss(renderer.cssDeCapa('ojoDominante'))!;
    // Lente rojo sobre el ojo derecho (ambliope) → rojo puro para él.
    expect(formaDeColor(ambliope)).toBe('rojo');
    expect(ambliope.g).toBe(0);
    expect(ambliope.b).toBe(0);
    // El izquierdo (dominante) recibe cian puro, sin nada de rojo.
    expect(formaDeColor(dominante)).toBe('cian');
    expect(dominante.r).toBe(0);
  });

  it('cambiar el ojo ambliope invierte las capas', () => {
    const derecho = crear('lentes', 'derecho').renderer;
    const izquierdo = crear('lentes', 'izquierdo').renderer;
    const forma = (r: DichopticRenderer, capa: Capa) =>
      formaDeColor(leerCss(r.cssDeCapa(capa))!);

    // El lente rojo está sobre el ojo derecho: quien sea ambliope recibe el
    // color de SU lente, y la capa contraria recibe el del otro.
    expect(forma(derecho, 'ojoAmbliope')).toBe('rojo');
    expect(forma(derecho, 'ojoDominante')).toBe('cian');
    expect(forma(izquierdo, 'ojoAmbliope')).toBe('cian');
    expect(forma(izquierdo, 'ojoDominante')).toBe('rojo');

    // Y la intensidad sigue a la capa, no al ojo: el ambliope siempre al máximo.
    expect(leerCss(izquierdo.cssDeCapa('ojoAmbliope'))!.g).toBe(LENTES.intensidadMaxCian);
    expect(leerCss(izquierdo.cssDeCapa('ojoDominante'))!.r).toBeLessThan(
      LENTES.intensidadMaxRojo,
    );
  });

  it('la capa del ojo ambliope va a la intensidad máxima calibrada', () => {
    const { renderer } = crear('lentes');
    expect(leerCss(renderer.cssDeCapa('ojoAmbliope'))!.r).toBe(LENTES.intensidadMaxRojo);
  });

  it('la capa del ojo dominante lleva el contraste de balance', () => {
    const { renderer } = crear('lentes');
    const bajo = leerCss(renderer.cssDeCapa('ojoDominante'))!;
    renderer.actualizar({ contrasteOjoDominante: 1 });
    const alto = leerCss(renderer.cssDeCapa('ojoDominante'))!;
    expect(bajo.g).toBeLessThan(alto.g);
    expect(alto.g).toBe(LENTES.intensidadMaxCian);
  });

  it('el gris de ambos ojos se queda dentro de su banda neutra', () => {
    const { renderer } = crear('lentes');
    for (const factor of [0, 0.1, 0.5, 1, 2]) {
      const rgb = leerCss(renderer.cssDeCapa('ambos', { factor }))!;
      expect(formaDeColor(rgb)).toBe('gris');
      expect(rgb.r).toBeGreaterThanOrEqual(config.color.grisAmbosMin);
      expect(rgb.r).toBeLessThanOrEqual(config.color.grisAmbosMax);
    }
  });

  it('sin lentes calibrados no inventa una separación que no existe', () => {
    const lienzo = crearLienzoFalso();
    const renderer = new DichopticRenderer(lienzo.ctx, {
      modo: 'lentes',
      ojoAmbliope: 'derecho',
      lentes: { colorOjoDerecho: null, intensidadMaxRojo: 255, intensidadMaxCian: 255, fecha: null },
      contrasteOjoDominante: 0.2,
      paleta: paletaDe('minero', 1),
    });
    renderer.redimensionar(400, 300, 1);
    expect(formaDeColor(leerCss(renderer.cssDeCapa('ojoAmbliope'))!)).toBe('gris');
  });

  it('todas las paletas de mundo siguen siendo irrelevantes en lentes', () => {
    for (let mundo = 1; mundo <= 5; mundo += 1) {
      const { renderer, lienzo } = crear('lentes');
      renderer.actualizar({ paleta: paletaDe('meteoritos', mundo) });
      dibujarDeTodo(renderer);
      for (const css of lienzo.pintados) {
        expect(colorPermitidoEnLentes(leerCss(css)!, LENTES)).toBe(true);
      }
    }
  });
});

describe('DichopticRenderer en modo parche', () => {
  it('usa los colores del mundo, no los de los lentes', () => {
    const { renderer, lienzo } = crear('parche');
    renderer.limpiar();
    expect(lienzo.pintados[0]).toBe(paletaDe('minero', 1).fondo);
    expect(renderer.cssDeCapa('ojoAmbliope')).toBe('rgb(63, 214, 198)');
  });

  it('respeta el tono que le pasen (el cristal con su contraste calculado)', () => {
    const { renderer } = crear('parche');
    expect(renderer.cssDeCapa('ojoDominante', { tono: '#6B4F26' })).toBe('rgb(107, 79, 38)');
  });

  it('las capas no separan nada: el parche ya lo hace', () => {
    const { renderer } = crear('parche');
    const tono = '#7BD65A';
    const colores = CAPAS.map((capa) => renderer.cssDeCapa(capa, { tono }));
    expect(new Set(colores).size).toBe(1);
  });
});

describe('lienzo', () => {
  it('escala por devicePixelRatio y apaga el suavizado', () => {
    const lienzo = crearLienzoFalso();
    const renderer = new DichopticRenderer(lienzo.ctx, {
      modo: 'parche',
      ojoAmbliope: 'derecho',
      lentes: LENTES,
      contrasteOjoDominante: 0.2,
      paleta: paletaDe('torre', 1),
    });
    renderer.redimensionar(320, 240, 3);
    expect(lienzo.ctx.canvas.width).toBe(960);
    expect(lienzo.ctx.canvas.height).toBe(720);
    expect(renderer.ancho).toBe(320);
    expect(lienzo.ctx.imageSmoothingEnabled).toBe(false);
  });
});

/**
 * Un borde suavizado sobre algo ya dibujado deja píxeles a medio camino entre
 * los dos colores. En modo lentes eso sería un píxel con rojo y cian a la vez,
 * que verían los dos ojos, y rompería la separación dicóptica. Por eso los
 * polígonos se rellenan con rectángulos enteros, nunca trazando un camino.
 */
describe('polígonos sin suavizado', () => {
  const dibujante = (modo: 'parche' | 'lentes') => {
    const lienzo = crearLienzoFalso();
    const renderer = new DichopticRenderer(lienzo.ctx, {
      modo,
      ojoAmbliope: 'derecho',
      lentes: LENTES,
      contrasteOjoDominante: 0.2,
      paleta: paletaDe('sapo', 1),
    });
    renderer.redimensionar(400, 300, 1);
    lienzo.llamadas.length = 0;
    lienzo.rectangulos.length = 0;
    return { lienzo, renderer };
  };

  it('nunca rellena trazando un camino', () => {
    for (const modo of ['parche', 'lentes'] as const) {
      const { lienzo, renderer } = dibujante(modo);
      renderer.poligono('ojoAmbliope', [
        [10, 10],
        [60, 20],
        [40, 70],
      ]);
      expect(lienzo.llamadas, modo).not.toContain('fill');
      expect(lienzo.llamadas.every((nombre) => nombre === 'fillRect'), modo).toBe(true);
    }
  });

  it('pinta con coordenadas enteras', () => {
    const { lienzo, renderer } = dibujante('lentes');
    renderer.poligono('ojoDominante', [
      [10.4, 10.6],
      [60.2, 20.9],
      [40.7, 70.3],
    ]);
    expect(lienzo.rectangulos.length).toBeGreaterThan(0);
    for (const [x, y, ancho, alto] of lienzo.rectangulos) {
      expect(Number.isInteger(x)).toBe(true);
      expect(Number.isInteger(y)).toBe(true);
      expect(Number.isInteger(ancho)).toBe(true);
      expect(alto).toBe(1);
    }
  });

  it('un polígono muy fino se sigue viendo', () => {
    const { lienzo, renderer } = dibujante('lentes');
    // Una línea de carril lejana: casi sin alto y casi sin ancho.
    renderer.poligono('ambos', [
      [100, 50],
      [100.4, 50],
      [100.3, 50.4],
      [100.1, 50.4],
    ]);
    expect(lienzo.rectangulos.length).toBeGreaterThan(0);
    for (const [, , ancho] of lienzo.rectangulos) expect(ancho).toBeGreaterThanOrEqual(1);
  });

  it('cubre el alto del polígono, fila a fila', () => {
    const { lienzo, renderer } = dibujante('parche');
    renderer.poligono('ambos', [
      [0, 20],
      [40, 20],
      [40, 26],
      [0, 26],
    ]);
    const filas = lienzo.rectangulos.map(([, y]) => y).sort((a, b) => a - b);
    expect(filas).toEqual([20, 21, 22, 23, 24, 25]);
  });
});
