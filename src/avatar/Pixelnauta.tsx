/** Dibuja un mapa de píxeles como SVG con escalado entero, sin suavizado. */
import { PALETA_POR_DEFECTO, type MapaDePixeles, type PaletaDeSprite } from './sprites';

export function Pixelnauta({
  mapa,
  paleta = PALETA_POR_DEFECTO,
  escala = 6,
  etiqueta,
}: {
  mapa: MapaDePixeles;
  paleta?: Partial<PaletaDeSprite>;
  escala?: number;
  etiqueta: string;
}) {
  const colores = { ...PALETA_POR_DEFECTO, ...paleta } as Record<string, string>;
  const ancho = Math.max(...mapa.map((f) => f.length));
  const alto = mapa.length;
  const pixeles: Array<{ x: number; y: number; color: string }> = [];

  for (let y = 0; y < alto; y += 1) {
    for (let x = 0; x < mapa[y].length; x += 1) {
      const caracter = mapa[y][x];
      if (caracter === '.') continue;
      const color = colores[caracter];
      if (color) pixeles.push({ x, y, color });
    }
  }

  return (
    <svg
      width={ancho * escala}
      height={alto * escala}
      viewBox={`0 0 ${ancho} ${alto}`}
      shapeRendering="crispEdges"
      role="img"
      aria-label={etiqueta}
    >
      {pixeles.map((p) => (
        <rect key={`${p.x}-${p.y}`} x={p.x} y={p.y} width="1" height="1" fill={p.color} />
      ))}
    </svg>
  );
}
