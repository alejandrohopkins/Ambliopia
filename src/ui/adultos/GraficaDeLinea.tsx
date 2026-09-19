/**
 * Gráfica de línea propia, en SVG. Sin librerías.
 * Eje Y logarítmico para los umbrales, donde más bajo es mejor.
 */
import type { PuntoDeSerie } from '../../storage/analisis';
import { diasEntre } from '../../engine/fechas';

export interface Marca {
  dia: string;
  etiqueta: string;
}

const ANCHO = 620;
const ALTO = 220;
const MARGEN = { arriba: 12, derecha: 12, abajo: 26, izquierda: 46 };

export function GraficaDeLinea({
  serie,
  suavizada,
  marcas = [],
  logaritmica = false,
  formatoY = (v: number) => v.toFixed(1),
  etiqueta,
}: {
  serie: PuntoDeSerie[];
  /** Mediana móvil, dibujada más gruesa encima de los puntos. */
  suavizada?: PuntoDeSerie[];
  /** Marcas en el eje X: cambios de contraste y notas. */
  marcas?: Marca[];
  logaritmica?: boolean;
  formatoY?: (valor: number) => string;
  etiqueta: string;
}) {
  if (serie.length === 0) return null;

  const dias = serie.map((p) => p.dia);
  const primero = dias[0];
  const ultimo = dias[dias.length - 1];
  const span = Math.max(1, diasEntre(primero, ultimo));

  const valores = serie.map((p) => p.valor).filter((v) => v > 0);
  const minimo = Math.min(...valores);
  const maximo = Math.max(...valores);
  const usarLog = logaritmica && minimo > 0 && maximo / minimo > 1.5;

  const aY = (valor: number) => {
    const alto = ALTO - MARGEN.arriba - MARGEN.abajo;
    if (maximo === minimo) return MARGEN.arriba + alto / 2;
    const t = usarLog
      ? (Math.log(valor) - Math.log(minimo)) / (Math.log(maximo) - Math.log(minimo))
      : (valor - minimo) / (maximo - minimo);
    // Menor es mejor: el valor más bajo va abajo, como una bajada del umbral.
    return MARGEN.arriba + alto * (1 - t);
  };

  const aX = (dia: string) =>
    MARGEN.izquierda +
    (diasEntre(primero, dia) / span) * (ANCHO - MARGEN.izquierda - MARGEN.derecha);

  const camino = (puntos: PuntoDeSerie[]) =>
    puntos.map((p, i) => `${i === 0 ? 'M' : 'L'}${aX(p.dia).toFixed(1)},${aY(p.valor).toFixed(1)}`).join(' ');

  const referencias = [minimo, Math.sqrt(minimo * maximo), maximo].filter(
    (v, i, lista) => Number.isFinite(v) && lista.indexOf(v) === i,
  );

  return (
    <svg
      viewBox={`0 0 ${ANCHO} ${ALTO}`}
      width="100%"
      role="img"
      aria-label={etiqueta}
      style={{ display: 'block', maxWidth: ANCHO }}
    >
      {referencias.map((valor) => (
        <g key={valor}>
          <line
            x1={MARGEN.izquierda}
            x2={ANCHO - MARGEN.derecha}
            y1={aY(valor)}
            y2={aY(valor)}
            stroke="var(--borde)"
            strokeWidth="1"
          />
          <text
            x={MARGEN.izquierda - 6}
            y={aY(valor) + 4}
            textAnchor="end"
            fill="var(--texto-tenue)"
            fontSize="11"
          >
            {formatoY(valor)}
          </text>
        </g>
      ))}

      {marcas.map((marca) => (
        <line
          key={`${marca.dia}-${marca.etiqueta}`}
          x1={aX(marca.dia)}
          x2={aX(marca.dia)}
          y1={MARGEN.arriba}
          y2={ALTO - MARGEN.abajo}
          stroke="var(--ambar-estelar)"
          strokeWidth="1"
          strokeDasharray="3 3"
        >
          <title>{marca.etiqueta}</title>
        </line>
      ))}

      <path d={camino(serie)} fill="none" stroke="var(--texto-tenue)" strokeWidth="1.5" />
      {suavizada && suavizada.length > 1 && (
        <path d={camino(suavizada)} fill="none" stroke="var(--cristal)" strokeWidth="3" />
      )}

      {serie.map((punto) => (
        <rect
          key={punto.dia}
          x={aX(punto.dia) - 2}
          y={aY(punto.valor) - 2}
          width="4"
          height="4"
          fill="var(--polvo-lunar)"
        />
      ))}

      <text x={MARGEN.izquierda} y={ALTO - 8} fill="var(--texto-tenue)" fontSize="11">
        {primero}
      </text>
      <text
        x={ANCHO - MARGEN.derecha}
        y={ALTO - 8}
        textAnchor="end"
        fill="var(--texto-tenue)"
        fontSize="11"
      >
        {ultimo}
      </text>
    </svg>
  );
}
