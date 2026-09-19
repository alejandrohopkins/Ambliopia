/**
 * Mapa de calor de las últimas semanas: minutos por día y color según el modo.
 * Es lo primero que mira un adulto, así que va arriba del resumen.
 */
import { es } from '../../i18n/es';
import type { DiaDelCalendario } from '../../storage/analisis';

const LADO = 18;
const HUECO = 3;

export function Calendario({ dias, meta }: { dias: DiaDelCalendario[]; meta: number }) {
  if (dias.length === 0) return null;

  const semanas: DiaDelCalendario[][] = [];
  for (const dia of dias) {
    const diaDeSemana = (new Date(dia.dia + 'T00:00:00').getDay() + 6) % 7;
    if (semanas.length === 0 || diaDeSemana === 0) semanas.push([]);
    const ultima = semanas[semanas.length - 1];
    // Rellenar los huecos de la primera semana incompleta.
    while (ultima.length < diaDeSemana) ultima.push({ ...dia, dia: '', total: -1 });
    ultima.push(dia);
  }

  // Se reserva un carril a la izquierda para las iniciales de los días.
  const CARRIL = 18;
  const ancho = CARRIL + semanas.length * (LADO + HUECO);
  const alto = 7 * (LADO + HUECO);

  return (
    <svg
      viewBox={`0 0 ${ancho} ${alto}`}
      width="100%"
      style={{ maxWidth: ancho, display: 'block' }}
      role="img"
      aria-label={es.adultos.calendario}
    >
      {semanas.map((semana, x) =>
        semana.map((dia, y) => {
          if (dia.total < 0) return null;
          return (
            <rect
              key={`${x}-${y}`}
              x={CARRIL + x * (LADO + HUECO)}
              y={y * (LADO + HUECO)}
              width={LADO}
              height={LADO}
              fill={colorDelDia(dia, meta)}
              stroke={dia.metaCumplida ? 'var(--musgo-pixel)' : 'var(--borde)'}
              strokeWidth={dia.metaCumplida ? 2 : 1}
            >
              <title>{`${dia.dia}: ${Math.round(dia.total)} ${es.comun.minutos}`}</title>
            </rect>
          );
        }),
      )}
      {es.adultos.diasDeSemana.map((letra: string, y: number) => (
        <text
          key={letra + y}
          x={CARRIL - 6}
          y={y * (LADO + HUECO) + LADO - 4}
          textAnchor="end"
          fill="var(--texto-tenue)"
          fontSize="11"
        >
          {letra}
        </text>
      ))}
    </svg>
  );
}

/**
 * Color por modo: más parche tira a ámbar, más lentes a cristal, y la
 * intensidad sube con los minutos.
 */
function colorDelDia(dia: DiaDelCalendario, meta: number): string {
  if (dia.total === 0) return '#1a1440';
  const intensidad = Math.min(1, dia.total / Math.max(1, meta));
  const alpha = 0.25 + intensidad * 0.75;
  const mayoriaLentes = dia.minutosLentes > dia.minutosParche;
  const base = mayoriaLentes ? '63, 214, 198' : '255, 194, 61';
  return `rgba(${base}, ${alpha.toFixed(2)})`;
}
