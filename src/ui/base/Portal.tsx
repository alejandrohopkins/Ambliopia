/**
 * Portal de un minijuego. Cada uno lleva el arte de su mundo, dibujado por código:
 * cueva, estación, plano cuadriculado, campo de estrellas y túnel en fuga.
 */
import type { IdJuego } from '../../config';
import { es } from '../../i18n/es';
import { useEstado } from '../../storage/contexto';
import { estrellasTotales } from '../../storage/selectores';

export function Portal({ juego, alEntrar }: { juego: IdJuego; alEntrar: () => void }) {
  const { estado } = useEstado();
  const { mundo } = estado.progreso[juego];
  const estrellas = estrellasTotales(estado, juego);

  return (
    <button
      className="pixelado"
      onClick={alEntrar}
      style={{
        display: 'block',
        width: '100%',
        textAlign: 'left',
        padding: 0,
        background: 'var(--superficie)',
        color: 'var(--texto)',
        border: '3px solid var(--borde)',
        minHeight: 'auto',
      }}
    >
      <ArteDePortal juego={juego} />
      <span style={{ display: 'block', padding: '10px 14px 14px' }}>
        <strong style={{ display: 'block', fontFamily: 'var(--fuente-titulos)', fontSize: 21 }}>
          {es.juegos[juego]}
        </strong>
        <span style={{ display: 'block', color: 'var(--texto-tenue)', fontSize: 15 }}>
          {es.habilidades[juego]}
        </span>
        <span style={{ display: 'block', marginTop: 6 }}>
          {es.base.mundo(mundo)} · {es.mundos[juego][mundo - 1]} ·{' '}
          <span className="numero">{estrellas}★</span>
        </span>
      </span>
    </button>
  );
}

function ArteDePortal({ juego }: { juego: IdJuego }) {
  const comun = {
    viewBox: '0 0 32 18',
    width: '100%',
    height: 100,
    'aria-hidden': true,
    shapeRendering: 'crispEdges' as const,
    preserveAspectRatio: 'none' as const,
  };

  if (juego === 'minero') {
    return (
      <svg {...comun}>
        <rect width="32" height="18" fill="#2a2036" />
        {[0, 8, 16, 24].map((x) =>
          [0, 6, 12].map((y) => (
            <rect key={`${x}-${y}`} x={x + 1} y={y + 1} width="6" height="4" fill="#43364f" />
          )),
        )}
        <path d="M14 7h2v1h1v2h-1v1h-2v-1h-1V8h1z" fill="var(--cristal)" />
      </svg>
    );
  }

  if (juego === 'saboteador') {
    return (
      <svg {...comun}>
        <rect width="32" height="18" fill="#101a33" />
        <rect y="12" width="32" height="6" fill="#20305c" />
        {[4, 11, 18, 25].map((x) => (
          <g key={x}>
            <rect x={x} y="5" width="4" height="4" fill="#8fa6d8" />
            <rect x={x + 1} y="6" width="2" height="2" fill="#101a33" />
            <rect x={x} y="9" width="4" height="4" fill="var(--nebulosa)" />
          </g>
        ))}
      </svg>
    );
  }

  if (juego === 'torre') {
    return (
      <svg {...comun}>
        <rect width="32" height="18" fill="#141b3d" />
        {Array.from({ length: 8 }, (_, i) => (
          <rect key={i} x={i * 4} y="0" width="1" height="18" fill="#222c5e" />
        ))}
        {Array.from({ length: 5 }, (_, i) => (
          <rect key={i} x="0" y={i * 4} width="32" height="1" fill="#222c5e" />
        ))}
        <rect x="8" y="10" width="4" height="8" fill="var(--musgo-pixel)" />
        <rect x="13" y="6" width="4" height="12" fill="var(--musgo-pixel)" />
        <rect x="18" y="12" width="4" height="6" fill="var(--musgo-pixel)" />
      </svg>
    );
  }

  if (juego === 'tunel') {
    const fuga = { x: 16, y: 5 };
    return (
      <svg {...comun}>
        <rect width="32" height="18" fill="#131a24" />
        {/* Carriles que se juntan en el punto de fuga. */}
        {[-4, 8, 24, 36].map((x) => (
          <path
            key={x}
            d={`M${x} 18 L${x + 1.4} 18 L${fuga.x} ${fuga.y}z`}
            fill="#31465c"
          />
        ))}
        {/* Muro con una sola abertura, abajo en el carril del centro. */}
        <rect x="7" y="8" width="6" height="6" fill="var(--ambar-estelar)" />
        <rect x="19" y="8" width="6" height="6" fill="var(--ambar-estelar)" />
        <rect x="13" y="8" width="6" height="3" fill="var(--ambar-estelar)" />
        {/* La corredora, rodando por debajo. */}
        <rect x="14" y="15" width="4" height="2" fill="#5a7d99" />
        <rect x="17" y="14" width="2" height="3" fill="#5a7d99" />
      </svg>
    );
  }

  return (
    <svg {...comun}>
      <rect width="32" height="18" fill="#0d0a28" />
      {[
        [3, 3],
        [9, 7],
        [15, 2],
        [21, 9],
        [27, 5],
        [6, 13],
        [19, 15],
        [29, 12],
      ].map(([x, y]) => (
        <rect key={`${x}-${y}`} x={x} y={y} width="1" height="1" fill="var(--polvo-lunar)" />
      ))}
      <path d="M15 12h2v1h1v2h-4v-2h1z" fill="var(--ambar-estelar)" />
      <rect x="15" y="10" width="2" height="2" fill="var(--cristal)" />
    </svg>
  );
}
