/** Dibuja una figura de mapa de píxeles en un color plano, con escalado entero. */
import type { Figura } from './figuras';

export function FiguraPixel({
  figura,
  color,
  escala = 6,
  etiqueta,
}: {
  figura: Figura;
  color: string;
  escala?: number;
  etiqueta?: string;
}) {
  const ancho = figura.pixeles[0].length;
  const alto = figura.pixeles.length;
  const rects: Array<{ x: number; y: number }> = [];
  for (let y = 0; y < alto; y += 1) {
    for (let x = 0; x < ancho; x += 1) {
      if (figura.pixeles[y][x] === '#') rects.push({ x, y });
    }
  }
  return (
    <svg
      width={ancho * escala}
      height={alto * escala}
      viewBox={`0 0 ${ancho} ${alto}`}
      shapeRendering="crispEdges"
      role="img"
      aria-label={etiqueta ?? figura.id}
    >
      {rects.map(({ x, y }) => (
        <rect key={`${x}-${y}`} x={x} y={y} width="1" height="1" fill={color} />
      ))}
    </svg>
  );
}
