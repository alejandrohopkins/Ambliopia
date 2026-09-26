/**
 * Bolsa de platanitos en pixel art, dibujada por código: una bolsa genérica,
 * sin marca, con una rodaja de plátano en la etiqueta y platanitos debajo.
 */
import { Pixelnauta } from '../../avatar/Pixelnauta';
import type { MapaDePixeles } from '../../avatar/sprites';

const BOLSA: MapaDePixeles = [
  '...K.K.K.K.K.K..',
  '..KGKGKGKGKGKGK.',
  '..KKKKKKKKKKKKK.',
  '.KgGGGGGGGGGGGdK',
  '.KgGGGGGGGGGGGdK',
  '.KgGYYYYYYYYYGdK',
  '.KgYYYYBBBBYYYdK',
  '.KgYYYBBBBBBBYdK',
  '.KgYYbBBWBBBBbdK',
  '.KgYYYYYYYYYYYdK',
  '.KgGGGGGGGGGGGdK',
  '.KgGOOOGGGOOOGdK',
  '.KgOOoOOGOOoOOdK',
  '.KgGOOOGOOOGGGdK',
  '.KgGGGGOOoOGGGdK',
  '.KgGGGGGOOGGGGdK',
  '.KgGGGGGGGGGGGdK',
  '..KKKKKKKKKKKKK.',
  '..KGKGKGKGKGKGK.',
  '...K.K.K.K.K.K..',
];

const COLORES: Record<string, string> = {
  K: '#1E1638',
  G: '#2F9E57',
  g: '#62CF83',
  d: '#1F6E3C',
  Y: '#FFD34D',
  B: '#F4C43C',
  b: '#8A6A1F',
  W: '#FFF6C8',
  O: '#E9B949',
  o: '#B8862A',
};

export function BolsaDePlatanitos({ escala = 6, etiqueta }: { escala?: number; etiqueta: string }) {
  return <Pixelnauta mapa={BOLSA} paleta={COLORES} escala={escala} etiqueta={etiqueta} />;
}
