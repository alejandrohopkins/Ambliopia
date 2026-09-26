/**
 * Galería: las figuras que la jugadora ha construido en la Torre de bloques.
 * Cada figura se dibuja a partir de sus alturas por columna, igual que en el juego.
 */
import { useEffect, useState } from 'react';
import { config } from '../config';
import { es } from '../i18n/es';
import { useEstado } from '../storage/contexto';
import { FIGURAS, type Figura } from '../games/torre/figuras';
import { tableroDelMundo } from '../games/torre/Torre';
import { paletaDe } from '../engine/mundos';
import { conAnimacion } from './animacion';

export function Galeria({ alVolver }: { alVolver: () => void }) {
  const { estado, despachar } = useEstado();
  const construidas = new Set(estado.galeria);
  // Las figuras construidas desde la última visita se levantan bloque a bloque.
  const [nuevas] = useState(() => new Set(estado.galeria.slice(estado.galeriaVista)));
  useEffect(() => {
    despachar({ tipo: 'galeria/vista' });
  }, [despachar]);

  return (
    <main style={{ padding: 24, maxWidth: 1000, margin: '0 auto' }}>
      <h1>{es.galeria.titulo}</h1>
      <p className="numero">{es.galeria.construidas(construidas.size, FIGURAS.length)}</p>

      {construidas.size === 0 && <p>{es.galeria.vacia}</p>}

      <ul
        style={{
          listStyle: 'none',
          padding: 0,
          display: 'grid',
          gap: 14,
          gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))',
          marginBottom: 20,
        }}
      >
        {FIGURAS.map((figura) => (
          <li key={figura.id} className="panel pixelado" style={{ textAlign: 'center' }}>
            <FiguraDeGaleria
              figura={figura}
              construida={construidas.has(figura.id)}
              nueva={nuevas.has(figura.id)}
            />
            <p style={{ margin: '8px 0 0' }}>
              {construidas.has(figura.id)
                ? es.nombresDeFigura[figura.id]
                : es.galeria.porConstruir}
            </p>
            <p style={{ margin: 0, color: 'var(--texto-tenue)', fontSize: 15 }}>
              {es.base.mundo(figura.mundo)}
            </p>
          </li>
        ))}
      </ul>

      <button className="pixelado" onClick={alVolver}>
        {es.comun.volverALaBase}
      </button>
    </main>
  );
}

function FiguraDeGaleria({
  figura,
  construida,
  nueva,
}: {
  figura: Figura;
  construida: boolean;
  nueva: boolean;
}) {
  const { cols, filas } = tableroDelMundo(figura.mundo);
  const paleta = paletaDe('torre', figura.mundo);
  const alto = filas - 2;
  const { bloqueMs, caidaDeBloqueMs } = config.animacion;
  // Se construye de abajo arriba, fila a fila, como en la Torre.
  const bloques = figura.alturas
    .flatMap((altura, columna) => Array.from({ length: altura }, (_, fila) => [fila, columna]))
    .sort((a, b) => a[0] - b[0] || a[1] - b[1])
    .map(([fila, columna]) => `${columna}-${fila}`);
  const orden = (columna: number, fila: number) => bloques.indexOf(`${columna}-${fila}`);

  return (
    <svg
      viewBox={`0 0 ${cols} ${alto}`}
      width="100%"
      height={110}
      shapeRendering="crispEdges"
      role="img"
      aria-label={construida ? es.nombresDeFigura[figura.id] : es.galeria.porConstruir}
    >
      {figura.alturas.map((altura, columna) =>
        Array.from({ length: altura }, (_, i) => (
          <rect
            key={`${columna}-${i}`}
            className={nueva ? 'bloque-cae' : undefined}
            style={nueva ? conAnimacion(caidaDeBloqueMs, orden(columna, i) * bloqueMs) : undefined}
            x={columna}
            y={alto - 1 - i}
            width="0.92"
            height="0.92"
            fill={
              construida
                ? (figura.coloresPorFila?.[i] ?? paleta.variantes[i % paleta.variantes.length])
                : 'var(--borde)'
            }
          />
        )),
      )}
    </svg>
  );
}
