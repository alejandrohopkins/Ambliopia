/**
 * Paletas de los mundos. Solo se usan en modo parche:
 * en modo lentes la pantalla de juego ignora estos colores por completo.
 * Arte propio, generado por código. Ninguna referencia a marcas de terceros.
 */
import type { IdJuego } from '../config';

export interface PaletaDeMundo {
  fondo: string;
  /** Bloques, cuerpos, celdas. */
  primario: string;
  /** Grietas, sombras, detalle. */
  secundario: string;
  /** El objetivo de la tarea (cristal, visor, pieza, estrella). */
  acento: string;
  /** Marco y HUD. */
  hud: string;
  /** Colores alternos para variedad (cuerpos de tripulantes, filas de figura). */
  variantes: string[];
}

function paleta(
  fondo: string,
  primario: string,
  secundario: string,
  acento: string,
  variantes: string[],
): PaletaDeMundo {
  return { fondo, primario, secundario, acento, hud: '#EDE9FF', variantes };
}

export const PALETAS: Record<IdJuego, PaletaDeMundo[]> = {
  minero: [
    paleta('#241F2E', '#4A4257', '#5D5470', '#3FD6C6', ['#4A4257', '#544B63']),
    paleta('#2B2114', '#6B4F26', '#85642F', '#FFC23D', ['#6B4F26', '#7A5A2B']),
    paleta('#16212E', '#365070', '#43628A', '#9FE8FF', ['#365070', '#3E5A7E']),
    paleta('#2C1310', '#6E2A1D', '#8A3524', '#FF9A3C', ['#6E2A1D', '#7C3021']),
    paleta('#1F1533', '#4B3579', '#5D4193', '#D6A8FF', ['#4B3579', '#553B86']),
  ],
  saboteador: [
    paleta('#101A33', '#2B3F6E', '#3D548C', '#CDD9F5', ['#7BD65A', '#FFC23D', '#3FD6C6', '#D6A8FF']),
    paleta('#1A1A26', '#3F3F52', '#545468', '#ECE9F2', ['#8FA6D8', '#FFC23D', '#7BD65A', '#FF9A3C']),
    paleta('#2B1712', '#6B3524', '#8A452E', '#FFD9C0', ['#FF9A3C', '#3FD6C6', '#D6A8FF', '#7BD65A']),
    paleta('#1C1830', '#4A3F6E', '#5F5289', '#FFE6B0', ['#FFC23D', '#9FE8FF', '#7BD65A', '#FF9A3C']),
    paleta('#1B1446', '#5B3FA0', '#6F4FBD', '#EDE9FF', ['#D6A8FF', '#3FD6C6', '#FFC23D', '#7BD65A']),
  ],
  torre: [
    paleta('#14203A', '#7BD65A', '#4F9B3A', '#EDE9FF', ['#7BD65A', '#5FBF45', '#4F9B3A']),
    paleta('#171B3C', '#6F8AD6', '#4C63A3', '#EDE9FF', ['#6F8AD6', '#5C77BE', '#4C63A3']),
    paleta('#12121F', '#9A9AB0', '#6D6D80', '#EDE9FF', ['#9A9AB0', '#84849A', '#6D6D80']),
    paleta('#2A1410', '#C05A3C', '#8A3E29', '#FFD9C0', ['#C05A3C', '#A64B32', '#8A3E29']),
    paleta('#0F1630', '#3FD6C6', '#2A8F85', '#EDE9FF', ['#3FD6C6', '#34B3A6', '#2A8F85']),
  ],
  tunel: [
    paleta('#131A24', '#5A7D99', '#31465C', '#FFC23D', ['#5A7D99', '#47647A']),
    paleta('#1B1A26', '#7A7490', '#4A4660', '#9FE8FF', ['#7A7490', '#635E76']),
    paleta('#0E1730', '#4C7FD6', '#2C4A85', '#FFD9C0', ['#4C7FD6', '#3E68B0']),
    paleta('#0F2028', '#4FB8C6', '#2C6A75', '#EDE9FF', ['#4FB8C6', '#3F97A3']),
    paleta('#26101F', '#B04F86', '#73325A', '#FFC23D', ['#B04F86', '#93416F']),
  ],
  meteoritos: [
    paleta('#0D0A28', '#4A6AB5', '#2E4176', '#FFC23D', ['#4A6AB5', '#3B558F']),
    paleta('#141221', '#6B6478', '#474152', '#FFC23D', ['#6B6478', '#575064']),
    paleta('#0C1830', '#4FB0D6', '#2F7391', '#EDE9FF', ['#4FB0D6', '#3D8EAE']),
    paleta('#241505', '#D68A2A', '#8F5A18', '#FFE8B0', ['#D68A2A', '#B0711F']),
    paleta('#1A0F33', '#7A4FB5', '#513280', '#EDE9FF', ['#7A4FB5', '#65409A']),
  ],
};

export function paletaDe(juego: IdJuego, mundo: number): PaletaDeMundo {
  const lista = PALETAS[juego];
  return lista[Math.max(0, Math.min(lista.length - 1, mundo - 1))];
}

/** Interpola un valor entre el mundo 1 y el mundo 5. */
export function porMundo(mundo: number, enMundo1: number, enMundo5: number, mundos = 5): number {
  if (mundos <= 1) return enMundo1;
  const t = (Math.max(1, Math.min(mundos, mundo)) - 1) / (mundos - 1);
  return enMundo1 + (enMundo5 - enMundo1) * t;
}
