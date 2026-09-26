import { describe, expect, it } from 'vitest';
import { config } from '../src/config';
import {
  ajustarAPaleta,
  coloresDelDibujo,
  reducirPorBloques,
  rejillaDeDibujo,
  rgb,
  tamanoDePixel,
  type Rgb,
} from '../src/avatar/pixelar';

describe('pixel art del avatar', () => {
  it('la paleta son los colores del propio dibujo, sin repetir', () => {
    const svg =
      '<svg><defs><linearGradient id="pixr1_traje"><stop stop-color="#FF0000"/></linearGradient></defs>' +
      '<rect fill="url(#pixr1_traje)" stroke="#1e1638"/><circle fill="#ff0000"/></svg>';
    expect(coloresDelDibujo(svg)).toEqual([
      [255, 0, 0],
      [30, 22, 56],
    ]);
  });

  it('cada píxel queda opaco o transparente, y con un color de la paleta', () => {
    const paleta: Rgb[] = [
      [30, 22, 56],
      [238, 234, 255],
      [255, 194, 61],
    ];
    const pixeles = new Uint8ClampedArray([
      // Casi blanco y opaco: blanco del casco.
      230, 230, 250, 255,
      // Borde a medio pintar entre el contorno y el casco: el más cercano, y opaco.
      60, 50, 90, 200,
      // Apenas pintado: fuera.
      255, 194, 61, 40,
      // Dorado un poco más oscuro: dorado.
      240, 180, 50, 255,
    ]);
    ajustarAPaleta(pixeles, paleta);
    expect([...pixeles]).toEqual([
      238, 234, 255, 255,
      30, 22, 56, 255,
      0, 0, 0, 0,
      255, 194, 61, 255,
    ]);
  });

  it('al reducir, cada píxel toma el color que más ocupa, y el contorno gana aunque sea fino', () => {
    const TINTA = rgb('#1e1638');
    const CASCO = rgb('#eeeaff');
    const nada = null;
    /** Un bloque de 4 × 4 con `n` puntos del primer color y el resto del segundo. */
    const bloque = (n: number, a: Rgb | null, b: Rgb | null) => {
      const puntos = new Uint8ClampedArray(16 * 4);
      for (let i = 0; i < 16; i += 1) {
        const color = i < n ? a : b;
        if (color) puntos.set([...color, 255], i * 4);
      }
      return [...reducirPorBloques(puntos, 4, 4, TINTA)];
    };
    const minimo = Math.ceil(config.avatar.pixelado.contornoMinimo * 16);
    // El contorno, con poco que cubra, se queda: ojos, bocas y bordes finos.
    expect(bloque(minimo, TINTA, CASCO)).toEqual([...TINTA, 255]);
    expect(bloque(minimo - 1, TINTA, CASCO)).toEqual([...CASCO, 255]);
    expect(bloque(minimo, TINTA, nada)).toEqual([...TINTA, 255]);
    // Si no, manda lo que más ocupa; en un empate, lo pintado.
    expect(bloque(9, nada, CASCO)).toEqual([0, 0, 0, 0]);
    expect(bloque(8, nada, CASCO)).toEqual([...CASCO, 255]);
  });

  it('el píxel se amplía un número entero de veces y la figura tiene unas 64 filas', () => {
    const { filasObjetivo, tamanoMinimo } = config.avatar.pixelado;
    for (const alto of [96, 104, 150, 170, 200, 210, 240, 260]) {
      const tamano = tamanoDePixel(alto);
      expect(Number.isInteger(tamano)).toBe(true);
      expect(tamano).toBeGreaterThanOrEqual(tamanoMinimo);
      if (alto / filasObjetivo >= tamanoMinimo) {
        expect(Math.abs(alto / tamano - filasObjetivo)).toBeLessThanOrEqual(filasObjetivo / 3);
      }
    }
  });

  it('el lienzo cubre la caja y lo que sobresale, centrado en el eje y con píxeles cuadrados', () => {
    const vista = { ancho: 200, alto: 280 };
    const desborde = { lados: 6, arriba: 10, abajo: 2 };
    for (const alto of [96, 150, 210, 260]) {
      const r = rejillaDeDibujo(vista, desborde, alto);
      const [x, y, ancho, altoDeLaCaja] = r.caja.split(' ').map(Number);
      expect(r.columnas % 2).toBe(0);
      expect(x + ancho / 2).toBeCloseTo(vista.ancho / 2, 9);
      expect(ancho / r.columnas).toBeCloseTo(altoDeLaCaja / r.filas, 9);
      expect(x).toBeLessThanOrEqual(-desborde.lados);
      expect(x + ancho).toBeGreaterThanOrEqual(vista.ancho + desborde.lados);
      expect(y).toBeLessThanOrEqual(-desborde.arriba);
      expect(y + altoDeLaCaja).toBeGreaterThanOrEqual(vista.alto + desborde.abajo);

      // Sin lo que sobresale, en la página ocupa lo mismo que el dibujo pedido.
      const [arriba, lados, abajo] = r.margen.split(' ').map((m) => -parseFloat(m));
      const altoEnPagina = r.filas * r.tamano - arriba - abajo;
      expect(Math.abs(altoEnPagina - alto)).toBeLessThanOrEqual(r.tamano / 2);
      const anchoEnPagina = r.columnas * r.tamano - 2 * lados;
      expect(Math.abs(anchoEnPagina - (alto * vista.ancho) / vista.alto)).toBeLessThanOrEqual(
        2 * r.tamano,
      );
    }
  });

  it('una mascota puede usar el tamaño de píxel de la figura que acompaña', () => {
    const figura = tamanoDePixel(210);
    const mascota = rejillaDeDibujo({ ancho: 100, alto: 100 }, { lados: 3, arriba: 6, abajo: 2 }, 84, figura);
    expect(mascota.tamano).toBe(figura);
    expect(mascota.filas * mascota.tamano).toBeGreaterThanOrEqual(84);
  });
});
