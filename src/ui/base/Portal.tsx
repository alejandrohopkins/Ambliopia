/**
 * Portal de un minijuego. Cada uno lleva el arte de su mundo, dibujado por código:
 * cueva, estación, plano cuadriculado, campo de estrellas y una escena propia
 * para cada juego de los módulos.
 */
import type { IdJuego } from '../../config';
import { es } from '../../i18n/es';
import { useEstado } from '../../storage/contexto';
import { estrellasTotales } from '../../storage/selectores';

export function Portal({ juego, alEntrar }: { juego: IdJuego; alEntrar: () => void }) {
  const { estado } = useEstado();
  const { mundo, nivel } = estado.progreso[juego];
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
          {es.base.mundo(mundo)} · {es.mundos[juego][mundo - 1]} · {es.controles.nivel(nivel)} ·{' '}
          <span className="numero">{estrellas}★</span>
        </span>
      </span>
    </button>
  );
}

/** Rectángulos de un píxel de la rejilla del portal. */
function Puntos({ puntos, color }: { puntos: Array<[number, number]>; color: string }) {
  return (
    <>
      {puntos.map(([x, y]) => (
        <rect key={`${x}-${y}`} x={x} y={y} width="1" height="1" fill={color} />
      ))}
    </>
  );
}

/**
 * Colores de los portales de lentes: rojo y cian recuerdan que ahí cada ojo
 * ve su parte. En la base no rige la regla de los cuatro colores, porque
 * nadie lleva puestos los lentes mientras elige.
 */
const ROJO = '#e0504a';
const CIAN = '#3fd6c6';

const ARTE: Record<IdJuego, () => JSX.Element> = {
  minero: () => (
    <>
      <rect width="32" height="18" fill="#2a2036" />
      {[0, 8, 16, 24].map((x) =>
        [0, 6, 12].map((y) => (
          <rect key={`${x}-${y}`} x={x + 1} y={y + 1} width="6" height="4" fill="#43364f" />
        )),
      )}
      <path d="M14 7h2v1h1v2h-1v1h-2v-1h-1V8h1z" fill="var(--cristal)" />
    </>
  ),

  saboteador: () => (
    <>
      <rect width="32" height="18" fill="#101a33" />
      <rect y="12" width="32" height="6" fill="#20305c" />
      {[4, 11, 18, 25].map((x) => (
        <g key={x}>
          <rect x={x} y="5" width="4" height="4" fill="#8fa6d8" />
          <rect x={x + 1} y="6" width="2" height="2" fill="#101a33" />
          <rect x={x} y="9" width="4" height="4" fill="var(--nebulosa)" />
        </g>
      ))}
    </>
  ),

  torre: () => (
    <>
      <rect width="32" height="18" fill="#141b3d" />
      {Array.from({ length: 8 }, (_, i) => (
        <rect key={`c${i}`} x={i * 4} y="0" width="1" height="18" fill="#222c5e" />
      ))}
      {Array.from({ length: 5 }, (_, i) => (
        <rect key={`f${i}`} x="0" y={i * 4} width="32" height="1" fill="#222c5e" />
      ))}
      <rect x="8" y="10" width="4" height="8" fill="var(--musgo-pixel)" />
      <rect x="13" y="6" width="4" height="12" fill="var(--musgo-pixel)" />
      <rect x="18" y="12" width="4" height="6" fill="var(--musgo-pixel)" />
    </>
  ),

  meteoritos: () => (
    <>
      <rect width="32" height="18" fill="#0d0a28" />
      <Puntos
        puntos={[[3, 3], [9, 7], [15, 2], [21, 9], [27, 5], [6, 13], [19, 15], [29, 12]]}
        color="var(--polvo-lunar)"
      />
      <path d="M15 12h2v1h1v2h-4v-2h1z" fill="var(--ambar-estelar)" />
      <rect x="15" y="10" width="2" height="2" fill="var(--cristal)" />
    </>
  ),

  // Módulo de parche.

  cazador: () => (
    <>
      <rect width="32" height="18" fill="#141a2e" />
      {[5, 13, 21].map((x) =>
        [2, 10].map((y) => (
          <rect key={`${x}-${y}`} x={x} y={y} width="6" height="5" fill="#2b3558" />
        )),
      )}
      {/* Una diana asomando en un agujero. */}
      <rect x="14" y="2" width="4" height="4" fill="var(--ambar-estelar)" />
      <rect x="15" y="3" width="2" height="2" fill="#141a2e" />
    </>
  ),

  rebote: () => (
    <>
      <rect width="32" height="18" fill="#10202a" />
      <Puntos puntos={[[6, 4], [9, 6], [12, 8], [15, 10]]} color="#2a8f85" />
      <rect x="18" y="12" width="2" height="2" fill="var(--polvo-lunar)" />
      <rect x="13" y="16" width="10" height="1" fill="var(--cristal)" />
    </>
  ),

  gabor: () => (
    <>
      <rect width="32" height="18" fill="#5e5e72" />
      {[3, 12, 21].map((x, i) => (
        <g key={x}>
          {[0, 2, 4].map((d) =>
            i === 1 ? (
              <rect key={d} x={x} y={5 + d} width="7" height="1" fill="#d8d8e6" />
            ) : (
              <rect key={d} x={x + d + 1} y="4" width="1" height="7" fill="#d8d8e6" />
            ),
          )}
        </g>
      ))}
    </>
  ),

  corte: () => (
    <>
      <rect width="32" height="18" fill="#12240f" />
      <rect x="11" y="6" width="8" height="7" fill="#4f9b3a" />
      <rect x="12" y="5" width="6" height="9" fill="#4f9b3a" />
      <rect x="15" y="3" width="2" height="2" fill="var(--musgo-pixel)" />
      {/* El corte en diagonal. */}
      <Puntos
        puntos={[[8, 14], [10, 13], [12, 12], [14, 11], [16, 9], [18, 8], [20, 7], [22, 6]]}
        color="var(--polvo-lunar)"
      />
    </>
  ),

  laberinto: () => (
    <>
      <rect width="32" height="18" fill="#1a1433" />
      <rect x="2" y="2" width="28" height="1" fill="#c49bff" />
      <rect x="2" y="15" width="28" height="1" fill="#c49bff" />
      <rect x="2" y="2" width="1" height="14" fill="#c49bff" />
      <rect x="29" y="2" width="1" height="14" fill="#c49bff" />
      <rect x="8" y="2" width="1" height="9" fill="#c49bff" />
      <rect x="15" y="7" width="1" height="9" fill="#c49bff" />
      <rect x="22" y="2" width="1" height="9" fill="#c49bff" />
      <rect x="5" y="12" width="2" height="2" fill="var(--ambar-estelar)" />
    </>
  ),

  // Módulo de lentes.

  pozo: () => (
    <>
      <rect width="32" height="18" fill="#000" />
      <rect x="9" y="1" width="1" height="17" fill="#8a8a8a" />
      <rect x="22" y="1" width="1" height="17" fill="#8a8a8a" />
      <rect x="10" y="14" width="12" height="3" fill={CIAN} />
      <rect x="13" y="12" width="4" height="2" fill={CIAN} />
      <rect x="14" y="3" width="3" height="1" fill={ROJO} />
      <rect x="15" y="4" width="1" height="2" fill={ROJO} />
    </>
  ),

  serpiente: () => (
    <>
      <rect width="32" height="18" fill="#000" />
      <rect x="1" y="1" width="30" height="16" fill="none" stroke="#8a8a8a" strokeWidth="1" />
      <rect x="5" y="12" width="12" height="2" fill={CIAN} />
      <rect x="15" y="6" width="2" height="6" fill={CIAN} />
      <rect x="15" y="6" width="6" height="2" fill={CIAN} />
      <rect x="25" y="6" width="2" height="2" fill={ROJO} />
    </>
  ),

  ave: () => (
    <>
      <rect width="32" height="18" fill="#000" />
      <rect x="18" y="0" width="4" height="6" fill={ROJO} />
      <rect x="18" y="12" width="4" height="6" fill={ROJO} />
      <rect x="28" y="0" width="4" height="3" fill={ROJO} />
      <rect x="28" y="9" width="4" height="9" fill={ROJO} />
      <rect x="8" y="8" width="4" height="3" fill={CIAN} />
      <rect x="11" y="8" width="2" height="1" fill={CIAN} />
    </>
  ),

  sapo: () => (
    <>
      <rect width="32" height="18" fill="#000" />
      <rect y="15" width="32" height="3" fill="#8a8a8a" />
      <rect y="0" width="32" height="2" fill="#8a8a8a" />
      <rect x="3" y="4" width="6" height="3" fill={CIAN} />
      <rect x="20" y="4" width="6" height="3" fill={CIAN} />
      <rect x="10" y="9" width="6" height="3" fill={CIAN} />
      <rect x="25" y="9" width="6" height="3" fill={CIAN} />
      <rect x="15" y="13" width="3" height="2" fill={ROJO} />
    </>
  ),

  mosaicos: () => (
    <>
      <rect width="32" height="18" fill="#000" />
      {[0, 1, 2].map((fila) =>
        [0, 1, 2].map((col) => {
          const x = 8 + col * 6;
          const y = 1 + fila * 6;
          const clave = fila === 2 && col === 2;
          return (
            <g key={`${fila}-${col}`}>
              <rect x={x} y={y} width="4" height="4" fill={clave ? '#8a8a8a' : fila === 2 ? ROJO : CIAN} />
              {!clave && <rect x={x + 1} y={y + 1 + ((fila + col) % 2)} width="3" height="1" fill="#000" />}
            </g>
          );
        }),
      )}
    </>
  ),
};

function ArteDePortal({ juego }: { juego: IdJuego }) {
  const Arte = ARTE[juego];
  return (
    <svg
      viewBox="0 0 32 18"
      width="100%"
      height={100}
      aria-hidden
      shapeRendering="crispEdges"
      preserveAspectRatio="none"
    >
      <Arte />
    </svg>
  );
}
