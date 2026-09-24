/** Luces y sombras de un color, para dar volumen al avatar vectorial. */

function aRgb(hex: string): [number, number, number] {
  const limpio = hex.replace('#', '');
  const largo = limpio.length === 3 ? limpio.replace(/./g, '$&$&') : limpio;
  const valor = parseInt(largo, 16);
  return [(valor >> 16) & 255, (valor >> 8) & 255, valor & 255];
}

function aHex([r, g, b]: [number, number, number]): string {
  return `#${[r, g, b].map((c) => Math.round(c).toString(16).padStart(2, '0')).join('')}`;
}

/** Mezcla dos colores: t = 0 da el primero, t = 1 el segundo. */
export function mezclar(a: string, b: string, t: number): string {
  const [ra, ga, ba] = aRgb(a);
  const [rb, gb, bb] = aRgb(b);
  return aHex([ra + (rb - ra) * t, ga + (gb - ga) * t, ba + (bb - ba) * t]);
}

export function aclarar(color: string, t: number): string {
  return mezclar(color, '#ffffff', t);
}

export function oscurecer(color: string, t: number): string {
  return mezclar(color, '#000000', t);
}
