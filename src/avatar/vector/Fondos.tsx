/**
 * Fondos de la base, dibujados con vectores y mostrados en pixel art
 * (avatar/Pixelado): el paisaje detrás del avatar. Cada uno trae su cielo,
 * su suelo y sus adornos en una rejilla de 320 × 200.
 */
import type { ReactNode } from 'react';
import { FondoPixelado } from '../Pixelado';

/** Estrellas repartidas sin simetría, siempre las mismas. */
function estrellas(
  semilla: number,
  cuantas: number,
  altoMaximo: number,
): Array<[number, number, number]> {
  const lista: Array<[number, number, number]> = [];
  let valor = semilla;
  // Los bits altos del generador son los que reparten bien; los bajos se repiten.
  const siguiente = () => {
    valor = (valor * 1103515245 + 12345) % 2147483648;
    return valor / 2147483648;
  };
  for (let i = 0; i < cuantas; i += 1) {
    const x = Math.floor(siguiente() * 320);
    const y = Math.floor(siguiente() * altoMaximo);
    lista.push([x, y, 0.8 + Math.floor(siguiente() * 3) * 0.5]);
  }
  return lista;
}

function Estrellas({
  semilla,
  cuantas,
  alto,
  color,
}: {
  semilla: number;
  cuantas: number;
  alto: number;
  color: string;
}) {
  return (
    <g fill={color}>
      {estrellas(semilla, cuantas, alto).map(([x, y, r], i) => (
        <circle key={i} cx={x} cy={y} r={r} />
      ))}
    </g>
  );
}

/** Cielo en degradado vertical. */
function Cielo({ id, arriba, abajo }: { id: string; arriba: string; abajo: string }) {
  return (
    <>
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={arriba} />
          <stop offset="1" stopColor={abajo} />
        </linearGradient>
      </defs>
      <rect width="320" height="200" fill={`url(#${id})`} />
    </>
  );
}

const FONDOS: Record<string, (id: string) => ReactNode> = {
  'fondo-base-lunar': (id) => (
    <>
      <Cielo id={id} arriba="#120E2A" abajo="#2E2360" />
      <Estrellas semilla={7} cuantas={40} alto={130} color="#EDE9FF" />
      <circle cx="262" cy="46" r="18" fill="#8F6FE8" />
      <ellipse
        cx="262"
        cy="46"
        rx="32"
        ry="8"
        fill="none"
        stroke="#D6A8FF"
        strokeWidth="3"
        transform="rotate(-18 262 46)"
      />
      <path d="M0 156 C60 140 110 150 160 146 C220 140 270 150 320 142 V200 H0 Z" fill="#4B3690" />
      <path d="M0 176 C80 168 160 178 320 166 V200 H0 Z" fill="#3A2A75" />
      {[
        [48, 168, 16],
        [150, 160, 10],
        [240, 172, 20],
      ].map(([x, y, r]) => (
        <g key={x}>
          <ellipse cx={x} cy={y} rx={r} ry={r * 0.35} fill="#2B1F5C" />
          <path
            d={`M${x - r} ${y} Q${x} ${y - r * 0.5} ${x + r} ${y}`}
            stroke="#6F55C0"
            strokeWidth="2"
            fill="none"
          />
        </g>
      ))}
    </>
  ),

  'fondo-jardin': (id) => (
    <>
      <Cielo id={id} arriba="#0E2418" abajo="#24543A" />
      <Estrellas semilla={19} cuantas={18} alto={80} color="#E8F5D0" />
      <circle cx="58" cy="44" r="16" fill="#F6F3C8" />
      <circle cx="64" cy="40" r="15" fill="#123320" />
      <path d="M0 150 C50 124 110 132 170 142 C230 130 280 124 320 136 V200 H0 Z" fill="#2E6B33" />
      <path d="M0 170 C90 160 200 172 320 160 V200 H0 Z" fill="#4F9B3A" />
      {[
        [30, '#FF9CC8'],
        [84, '#FFE066'],
        [132, '#C49BFF'],
        [196, '#FF9CC8'],
        [250, '#FFE066'],
        [296, '#9CC8FF'],
      ].map(([x, color]) => (
        <g key={x as number}>
          <path
            d={`M${x} 178 Q${(x as number) - 3} 166 ${x} 156`}
            stroke="#2E6B33"
            strokeWidth="3"
            fill="none"
          />
          <circle cx={x as number} cy="154" r="6" fill={color as string} />
          <circle cx={x as number} cy="154" r="2.5" fill="#FFC23D" />
        </g>
      ))}
    </>
  ),

  'fondo-nebulosa': (id) => (
    <>
      <Cielo id={id} arriba="#140F3A" abajo="#2A1760" />
      <defs>
        <radialGradient id={`${id}n`}>
          <stop offset="0" stopColor="#FF7AC8" stopOpacity="0.55" />
          <stop offset="1" stopColor="#FF7AC8" stopOpacity="0" />
        </radialGradient>
        <radialGradient id={`${id}m`}>
          <stop offset="0" stopColor="#5BC8FF" stopOpacity="0.45" />
          <stop offset="1" stopColor="#5BC8FF" stopOpacity="0" />
        </radialGradient>
      </defs>
      <ellipse cx="90" cy="60" rx="110" ry="54" fill={`url(#${id}n)`} />
      <ellipse cx="240" cy="90" rx="100" ry="50" fill={`url(#${id}m)`} />
      <Estrellas semilla={31} cuantas={50} alto={150} color="#FFFFFF" />
      <path d="M0 164 C80 150 160 160 320 150 V200 H0 Z" fill="#5B3FA0" />
      {[
        [60, 158],
        [180, 154],
        [270, 152],
      ].map(([x, y]) => (
        <path
          key={x}
          d={`M${x} ${y} L${x + 6} ${y - 18} L${x + 12} ${y}`}
          fill="#D6A8FF"
          stroke="#8F6FE8"
          strokeWidth="2"
        />
      ))}
    </>
  ),

  'fondo-taller': (id) => (
    <>
      <Cielo id={id} arriba="#2B2016" abajo="#3E2E1E" />
      {[40, 100].map((y) => (
        <g key={y}>
          <rect x="0" y={y} width="90" height="6" fill="#8A5A2B" />
          <rect x="230" y={y} width="90" height="6" fill="#8A5A2B" />
        </g>
      ))}
      <rect x="12" y="22" width="22" height="18" fill="#C98B55" stroke="#5A3A1C" strokeWidth="2" />
      <rect x="40" y="28" width="16" height="12" fill="#6FB3FF" stroke="#2B4A6B" strokeWidth="2" />
      <rect x="250" y="84" width="26" height="16" fill="#7BD65A" stroke="#2E6B33" strokeWidth="2" />
      <rect x="284" y="78" width="18" height="22" fill="#C98B55" stroke="#5A3A1C" strokeWidth="2" />
      <g transform="translate(160 56)" fill="#8C86A8" stroke="#4A4560" strokeWidth="2">
        {Array.from({ length: 8 }, (_, i) => (
          <rect key={i} x="-4" y="-26" width="8" height="10" transform={`rotate(${i * 45})`} />
        ))}
        <circle r="20" />
        <circle r="7" fill="#3E2E1E" />
      </g>
      <rect x="0" y="160" width="320" height="40" fill="#6B4A2B" />
      {[0, 64, 128, 192, 256].map((x) => (
        <path key={x} d={`M${x} 160 V200`} stroke="#4A3220" strokeWidth="2" />
      ))}
    </>
  ),

  'fondo-hielo': (id) => (
    <>
      <Cielo id={id} arriba="#0B1A22" abajo="#1B4250" />
      {[20, 60, 110, 170, 220, 280].map((x, i) => (
        <path
          key={x}
          d={`M${x - 10} 0 L${x} ${26 + (i % 3) * 12} L${x + 10} 0 Z`}
          fill="#9FE3EE"
          stroke="#5FB8C6"
          strokeWidth="2"
        />
      ))}
      <Estrellas semilla={43} cuantas={14} alto={110} color="#CFF6FF" />
      <path d="M0 160 C80 150 170 162 320 150 V200 H0 Z" fill="#4FB8C6" />
      {[30, 96, 206, 276].map((x, i) => (
        <path
          key={x}
          d={`M${x - 12} 162 L${x} ${130 - (i % 2) * 14} L${x + 12} 162 Z`}
          fill="#C9F2FF"
          stroke="#5FB8C6"
          strokeWidth="2"
        />
      ))}
      <path d="M0 184 C100 176 220 188 320 176 V200 H0 Z" fill="#7FD3DE" />
    </>
  ),
};

export const FONDOS_VECTORIALES = Object.keys(FONDOS);

export const FONDO_POR_DEFECTO = 'fondo-base-lunar';

/** El paisaje, a sangre: llena su contenedor y recorta lo que sobra. */
export function Paisaje({ id }: { id: string | undefined }) {
  const dibujo = (id && FONDOS[id]) || FONDOS[FONDO_POR_DEFECTO];
  return (
    <FondoPixelado vista={{ ancho: 320, alto: 200 }} dibujo={(prefijo) => dibujo(`${prefijo}cielo`)} />
  );
}
