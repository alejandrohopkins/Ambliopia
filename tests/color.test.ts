import { describe, it, expect } from 'vitest';
import { config } from '../src/config';
import {
  srgbALineal,
  linealASrgb,
  luminancia,
  contrasteWeber,
  aplicarContrasteWeber,
  escalarLineal,
  intensidadConFactor,
  rgbDeLente,
  gris,
  aCss,
  leerCss,
  desdeHex,
  aHex,
  formaDeColor,
  colorPermitidoEnLentes,
  pxAMm,
  mmAArcmin,
  pxAArcmin,
} from '../src/engine/color';

describe('sRGB y luminancia lineal', () => {
  it('ida y vuelta entre sRGB y lineal', () => {
    for (const v of [0, 1, 10, 64, 128, 200, 255]) {
      expect(Math.round(linealASrgb(srgbALineal(v)))).toBe(v);
    }
  });

  it('el negro tiene luminancia 0 y el blanco 1', () => {
    expect(luminancia({ r: 0, g: 0, b: 0 })).toBe(0);
    expect(luminancia({ r: 255, g: 255, b: 255 })).toBeCloseTo(1, 6);
  });

  it('la luminancia no es lineal en sRGB: el gris medio está muy por debajo de 0.5', () => {
    expect(luminancia(gris(128))).toBeLessThan(0.25);
  });
});

describe('contraste de Weber', () => {
  it('escalar la luminancia lineal por (1+C) da el contraste pedido', () => {
    const fondo = gris(120);
    const objetivo = escalarLineal(fondo, 1.5);
    // El redondeo a 8 bits deja una diferencia pequeña: por eso se registra
    // el contraste REAL obtenido y no el pedido.
    expect(Math.abs(contrasteWeber(objetivo, fondo) - 0.5)).toBeLessThan(0.02);
  });

  it('contraste 0 devuelve el propio fondo', () => {
    const fondo = gris(100);
    const { rgb, limitadoPor8Bits } = aplicarContrasteWeber(fondo, 0);
    expect(rgb).toEqual(fondo);
    expect(limitadoPor8Bits).toBe(false);
  });

  it('reproduce contrastes medios con buena fidelidad', () => {
    const fondo = gris(90);
    for (const pedido of [0.1, 0.3, 0.5, 0.8, 1.0]) {
      const { contrasteReal } = aplicarContrasteWeber(fondo, pedido);
      expect(Math.abs(contrasteReal - pedido)).toBeLessThan(0.03);
    }
  });

  it('conserva el tono del fondo, no solo su luminancia', () => {
    const fondo = desdeHex('#6B4F26');
    const { rgb } = aplicarContrasteWeber(fondo, 0.4);
    // Los tres canales suben juntos: el ámbar sigue siendo ámbar.
    expect(rgb.r).toBeGreaterThan(fondo.r);
    expect(rgb.g).toBeGreaterThan(fondo.g);
    expect(rgb.b).toBeGreaterThan(fondo.b);
    expect(rgb.r / rgb.g).toBeCloseTo(fondo.r / fondo.g, 1);
  });
});

describe('límite de 8 bits', () => {
  it('un contraste imposible de representar usa el paso mínimo', () => {
    const fondo = gris(120);
    const { rgb, contrasteReal, limitadoPor8Bits } = aplicarContrasteWeber(fondo, 0.0001);
    expect(limitadoPor8Bits).toBe(true);
    expect(rgb.r).toBe(fondo.r + config.color.pasoMinimo8Bits);
    // El contraste registrado es el real obtenido, no el pedido.
    expect(contrasteReal).toBeGreaterThan(0.0001);
    expect(contrasteReal).toBeLessThan(0.05);
  });

  it('el contraste registrado nunca es el pedido cuando hubo redondeo', () => {
    const fondo = gris(60);
    const { contrasteReal } = aplicarContrasteWeber(fondo, 0.5);
    const objetivo = escalarLineal(fondo, 1.5);
    expect(contrasteReal).toBeCloseTo(contrasteWeber(objetivo, fondo), 10);
  });

  it('contra el tope del canal, el paso mínimo va hacia abajo', () => {
    const fondo = gris(255);
    const { rgb } = aplicarContrasteWeber(fondo, 0.0001);
    expect(rgb.r).toBe(254);
  });
});

describe('intensidad en modo lentes', () => {
  it('el factor 1 devuelve la intensidad máxima calibrada', () => {
    expect(intensidadConFactor(200, 1)).toBe(200);
  });

  it('el factor se aplica en luminancia lineal', () => {
    const maximo = 200;
    const resultado = intensidadConFactor(maximo, 0.2);
    expect(resultado).toBeLessThan(maximo);
    expect(srgbALineal(resultado) / srgbALineal(maximo)).toBeCloseTo(0.2, 2);
  });

  it('nunca supera la intensidad máxima calibrada', () => {
    expect(intensidadConFactor(120, 5)).toBe(120);
  });

  it('un factor diminuto no desaparece: queda el paso mínimo', () => {
    expect(intensidadConFactor(200, 1e-9)).toBe(config.color.pasoMinimo8Bits);
  });

  it('factor cero apaga el color', () => {
    expect(intensidadConFactor(200, 0)).toBe(0);
  });
});

describe('colores de lente', () => {
  it('rojo es rgb(I,0,0) y cian es rgb(0,I,I)', () => {
    expect(rgbDeLente('rojo', 180)).toEqual({ r: 180, g: 0, b: 0 });
    expect(rgbDeLente('cian', 180)).toEqual({ r: 0, g: 180, b: 180 });
  });

  it('reconoce las cuatro formas permitidas', () => {
    expect(formaDeColor({ r: 0, g: 0, b: 0 })).toBe('fondo');
    expect(formaDeColor({ r: 200, g: 0, b: 0 })).toBe('rojo');
    expect(formaDeColor({ r: 0, g: 200, b: 200 })).toBe('cian');
    expect(formaDeColor(gris(157))).toBe('gris');
    expect(formaDeColor({ r: 200, g: 100, b: 20 })).toBe('prohibido');
  });

  it('rechaza lo que dejaría pasar luz al ojo equivocado', () => {
    const limites = { intensidadMaxRojo: 200, intensidadMaxCian: 180 };
    expect(colorPermitidoEnLentes({ r: 200, g: 0, b: 0 }, limites)).toBe(true);
    expect(colorPermitidoEnLentes({ r: 201, g: 0, b: 0 }, limites)).toBe(false);
    expect(colorPermitidoEnLentes({ r: 0, g: 181, b: 181 }, limites)).toBe(false);
    expect(colorPermitidoEnLentes({ r: 10, g: 200, b: 200 }, limites)).toBe(false);
    expect(colorPermitidoEnLentes(gris(157), limites)).toBe(true);
    // Un gris fuera de la banda neutra tampoco vale.
    expect(colorPermitidoEnLentes(gris(40), limites)).toBe(false);
    expect(colorPermitidoEnLentes(gris(240), limites)).toBe(false);
  });
});

describe('utilidades de color', () => {
  it('ida y vuelta entre hex y RGB', () => {
    expect(desdeHex('#3FD6C6')).toEqual({ r: 63, g: 214, b: 198 });
    expect(aHex({ r: 63, g: 214, b: 198 })).toBe('#3fd6c6');
    expect(desdeHex('#fff')).toEqual({ r: 255, g: 255, b: 255 });
  });

  it('ida y vuelta entre CSS y RGB', () => {
    expect(aCss({ r: 1, g: 2, b: 3 })).toBe('rgb(1, 2, 3)');
    expect(leerCss('rgb(1, 2, 3)')).toEqual({ r: 1, g: 2, b: 3 });
    expect(leerCss('#000000')).toEqual({ r: 0, g: 0, b: 0 });
    expect(leerCss('no es un color')).toBeNull();
  });
});

describe('píxeles, milímetros y minutos de arco', () => {
  it('convierte píxeles a milímetros con la calibración', () => {
    expect(pxAMm(100, 4)).toBe(25);
  });

  it('un objeto más lejano abarca menos minutos de arco', () => {
    expect(mmAArcmin(5, 400)).toBeGreaterThan(mmAArcmin(5, 600));
  });

  it('1 mm a 40 cm ronda los 8.6 minutos de arco', () => {
    expect(mmAArcmin(1, 400)).toBeCloseTo(8.59, 1);
  });

  it('encadena píxeles → mm → arcmin', () => {
    const pxPorMm = config.calibracionPantalla.pxPorMmPorDefecto;
    expect(pxAArcmin(10, pxPorMm, 40)).toBeCloseTo(mmAArcmin(10 / pxPorMm, 400), 6);
  });
});
