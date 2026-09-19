/**
 * Color y contraste. Todo el cálculo ocurre en luminancia LINEAL:
 * sRGB → lineal, se opera, y se vuelve a sRGB.
 *
 * El canal de 8 bits no representa cualquier contraste: tras redondear, un
 * objetivo puede quedar idéntico al fondo. En ese caso se usa el paso mínimo
 * representable y se registra el contraste REAL obtenido, no el pedido.
 */
import { config, type ColorLente } from '../config';

export interface RGB {
  r: number;
  g: number;
  b: number;
}

const PESOS = { r: 0.2126, g: 0.7152, b: 0.0722 };

export function limitar8(valor: number): number {
  return Math.max(0, Math.min(255, Math.round(valor)));
}

/** sRGB de 8 bits → luminancia lineal del canal (0–1). */
export function srgbALineal(valor8: number): number {
  const v = Math.max(0, Math.min(255, valor8)) / 255;
  return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
}

/** Lineal (0–1) → sRGB de 8 bits, sin redondear. */
export function linealASrgb(lineal: number): number {
  const l = Math.max(0, Math.min(1, lineal));
  const v = l <= 0.0031308 ? l * 12.92 : 1.055 * l ** (1 / 2.4) - 0.055;
  return v * 255;
}

/** Luminancia relativa lineal de un color sRGB. */
export function luminancia({ r, g, b }: RGB): number {
  return PESOS.r * srgbALineal(r) + PESOS.g * srgbALineal(g) + PESOS.b * srgbALineal(b);
}

/** Contraste de Weber: C = (L_objetivo − L_fondo) / L_fondo. */
export function contrasteWeber(objetivo: RGB, fondo: RGB): number {
  const lFondo = luminancia(fondo);
  if (lFondo <= 0) return Infinity;
  return (luminancia(objetivo) - lFondo) / lFondo;
}

/** Escala un color en luminancia lineal y vuelve a sRGB de 8 bits. */
export function escalarLineal(color: RGB, factor: number): RGB {
  return {
    r: limitar8(linealASrgb(srgbALineal(color.r) * factor)),
    g: limitar8(linealASrgb(srgbALineal(color.g) * factor)),
    b: limitar8(linealASrgb(srgbALineal(color.b) * factor)),
  };
}

export interface ColorConContraste {
  rgb: RGB;
  /** Contraste realmente obtenido tras redondear a 8 bits. */
  contrasteReal: number;
  /** El contraste pedido no cabía en 8 bits y se usó el paso mínimo. */
  limitadoPor8Bits: boolean;
}

/**
 * Color objetivo con el contraste de Weber pedido sobre un fondo.
 * Al escalar todos los canales lineales por (1 + C), la luminancia queda
 * multiplicada por (1 + C) exactamente, y el tono del fondo se conserva.
 */
export function aplicarContrasteWeber(fondo: RGB, contraste: number): ColorConContraste {
  const paso = config.color.pasoMinimo8Bits;
  const sinCambio = (c: RGB) => c.r === fondo.r && c.g === fondo.g && c.b === fondo.b;

  let rgb = escalarLineal(fondo, 1 + contraste);
  let limitadoPor8Bits = false;

  if (contraste !== 0 && sinCambio(rgb)) {
    limitadoPor8Bits = true;
    const direccion = contraste > 0 ? paso : -paso;
    // Mover los canales que existen; si el fondo es negro, subir los tres.
    const negro = fondo.r === 0 && fondo.g === 0 && fondo.b === 0;
    rgb = {
      r: negro || fondo.r > 0 ? limitar8(fondo.r + direccion) : 0,
      g: negro || fondo.g > 0 ? limitar8(fondo.g + direccion) : 0,
      b: negro || fondo.b > 0 ? limitar8(fondo.b + direccion) : 0,
    };
    // Contra el tope del canal, mover el fondo no es posible: queda igual.
    if (sinCambio(rgb)) {
      rgb = {
        r: fondo.r > 0 ? limitar8(fondo.r - direccion) : 0,
        g: fondo.g > 0 ? limitar8(fondo.g - direccion) : 0,
        b: fondo.b > 0 ? limitar8(fondo.b - direccion) : 0,
      };
    }
  }

  return { rgb, contrasteReal: contrasteWeber(rgb, fondo), limitadoPor8Bits };
}

/**
 * Intensidad de una capa en modo lentes:
 * valor = sRGB(factor × lineal(intensidad máxima calibrada)).
 */
export function intensidadConFactor(intensidadMax8: number, factor: number): number {
  if (factor <= 0) return 0;
  const bruto = limitar8(linealASrgb(srgbALineal(intensidadMax8) * factor));
  if (bruto === 0 && intensidadMax8 > 0) return config.color.pasoMinimo8Bits;
  return Math.min(bruto, limitar8(intensidadMax8));
}

/** Rojo = rgb(I,0,0); cian = rgb(0,I,I). Nunca se mezclan. */
export function rgbDeLente(color: ColorLente, intensidad: number): RGB {
  const i = limitar8(intensidad);
  return color === 'rojo' ? { r: i, g: 0, b: 0 } : { r: 0, g: i, b: i };
}

export function gris(valor: number): RGB {
  const v = limitar8(valor);
  return { r: v, g: v, b: v };
}

export function aCss({ r, g, b }: RGB): string {
  return `rgb(${limitar8(r)}, ${limitar8(g)}, ${limitar8(b)})`;
}

/** '#RRGGBB' → RGB. Acepta también '#RGB'. */
export function desdeHex(hex: string): RGB {
  const limpio = hex.replace('#', '').trim();
  const completo =
    limpio.length === 3
      ? limpio
          .split('')
          .map((c) => c + c)
          .join('')
      : limpio;
  return {
    r: parseInt(completo.slice(0, 2), 16),
    g: parseInt(completo.slice(2, 4), 16),
    b: parseInt(completo.slice(4, 6), 16),
  };
}

export function aHex({ r, g, b }: RGB): string {
  const dos = (v: number) => limitar8(v).toString(16).padStart(2, '0');
  return `#${dos(r)}${dos(g)}${dos(b)}`;
}

// ---------------------------------------------------------------------------
// Regla crítica del modo lentes: solo existen cuatro formas de color.
// ---------------------------------------------------------------------------

export type FormaDeColor = 'fondo' | 'rojo' | 'cian' | 'gris' | 'prohibido';

export function formaDeColor(color: RGB): FormaDeColor {
  const { r, g, b } = color;
  if (r === 0 && g === 0 && b === 0) return 'fondo';
  if (g === 0 && b === 0) return 'rojo';
  if (r === 0 && g === b) return 'cian';
  if (r === g && g === b) return 'gris';
  return 'prohibido';
}

export interface LimitesDeLentes {
  intensidadMaxRojo: number;
  intensidadMaxCian: number;
}

/**
 * Comprueba que un color cabe en el modo lentes: negro puro, rojo puro sin
 * pasar su máximo calibrado, cian puro sin pasar el suyo, o gris neutro dentro
 * de la banda permitida. Cualquier otra cosa dejaría pasar luz al ojo equivocado.
 */
export function colorPermitidoEnLentes(color: RGB, limites: LimitesDeLentes): boolean {
  switch (formaDeColor(color)) {
    case 'fondo':
      return true;
    case 'rojo':
      return color.r <= limites.intensidadMaxRojo;
    case 'cian':
      return color.g <= limites.intensidadMaxCian;
    case 'gris':
      return color.r >= config.color.grisAmbosMin && color.r <= config.color.grisAmbosMax;
    default:
      return false;
  }
}

/** Lee 'rgb(r, g, b)' o '#rrggbb'. Devuelve null si no reconoce el formato. */
export function leerCss(css: string): RGB | null {
  const texto = css.trim();
  if (texto.startsWith('#')) return desdeHex(texto);
  const coincidencia = texto.match(/^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/);
  if (!coincidencia) return null;
  return {
    r: Number(coincidencia[1]),
    g: Number(coincidencia[2]),
    b: Number(coincidencia[3]),
  };
}

// ---------------------------------------------------------------------------
// Conversión de píxeles a milímetros y a minutos de arco.
// ---------------------------------------------------------------------------

export function pxAMm(px: number, pxPorMm: number): number {
  return px / pxPorMm;
}

/** minutos_de_arco = 2 × atan(mm / (2 × distancia_mm)) × (180/π) × 60. */
export function mmAArcmin(mm: number, distanciaMm: number): number {
  return 2 * Math.atan(mm / (2 * distanciaMm)) * (180 / Math.PI) * 60;
}

export function pxAArcmin(px: number, pxPorMm: number, distanciaCm: number): number {
  return mmAArcmin(pxAMm(px, pxPorMm), distanciaCm * 10);
}
