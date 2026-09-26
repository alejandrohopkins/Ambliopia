/**
 * Mascotas dibujadas con vectores, cada una en una rejilla de 100 × 100, y
 * mostradas en pixel art (avatar/Pixelado).
 * Diseño propio y genérico: animales y criaturas de peluche espacial.
 */
import type { ReactNode } from 'react';
import { Pixelado } from '../Pixelado';
import type { Desborde } from '../pixelar';

const TINTA = '#1E1638';
const ROSA = '#FF9CC8';

/** Dos ojos grandes con brillo, el sello de todas las mascotas. */
function Ojos({
  y,
  separacion = 11,
  x = 50,
  r = 5,
}: {
  y: number;
  separacion?: number;
  x?: number;
  r?: number;
}) {
  return (
    <g>
      {[x - separacion, x + separacion].map((cx) => (
        <g key={cx}>
          <ellipse cx={cx} cy={y} rx={r} ry={r * 1.2} fill={TINTA} />
          <circle cx={cx + r * 0.35} cy={y - r * 0.45} r={r * 0.38} fill="#FFFFFF" />
        </g>
      ))}
    </g>
  );
}

function Mejillas({ y, separacion = 19, x = 50 }: { y: number; separacion?: number; x?: number }) {
  return (
    <g fill="#FF8FA3" opacity="0.55">
      <ellipse cx={x - separacion} cy={y} rx="5" ry="3" />
      <ellipse cx={x + separacion} cy={y} rx="5" ry="3" />
    </g>
  );
}

function Sonrisa({ x = 50, y, ancho = 6 }: { x?: number; y: number; ancho?: number }) {
  return (
    <path
      d={`M${x - ancho} ${y} Q${x} ${y + ancho} ${x + ancho} ${y}`}
      stroke={TINTA}
      strokeWidth="2.5"
      strokeLinecap="round"
      fill="none"
    />
  );
}

const trazo = {
  stroke: TINTA,
  strokeWidth: 3,
  strokeLinejoin: 'round' as const,
};

export const MASCOTAS_VECTORIALES: Record<string, () => ReactNode> = {
  'mascota-gato': () => (
    <g {...trazo}>
      <path
        d="M72 82 C92 80 94 58 82 52"
        fill="none"
        stroke="#E0893A"
        strokeWidth="8"
        strokeLinecap="round"
      />
      <ellipse cx="50" cy="74" rx="24" ry="19" fill="#F2A65A" />
      <path d="M28 34 L30 8 L48 22 Z M72 34 L70 8 L52 22 Z" fill="#F2A65A" />
      <path d="M33 26 L34 15 L42 22 Z M67 26 L66 15 L58 22 Z" fill={ROSA} strokeWidth="0" />
      <circle cx="50" cy="42" r="24" fill="#F2A65A" />
      <path d="M44 22 L46 30 M50 20 L50 29 M56 22 L54 30" stroke="#C96A1E" strokeWidth="2.5" />
      <Ojos y={42} />
      <path d="M47 50 L53 50 L50 54 Z" fill={ROSA} strokeWidth="1.5" />
      <path d="M50 54 Q46 58 42 56 M50 54 Q54 58 58 56" fill="none" strokeWidth="2" />
      <path d="M22 48 L34 50 M22 54 L34 53 M78 48 L66 50 M78 54 L66 53" strokeWidth="1.5" />
      <ellipse cx="40" cy="91" rx="7" ry="5" fill="#F7C08A" />
      <ellipse cx="60" cy="91" rx="7" ry="5" fill="#F7C08A" />
    </g>
  ),

  'mascota-zorro': () => (
    <g {...trazo}>
      <path d="M70 84 C96 84 98 56 84 46 C84 62 78 72 68 74 Z" fill="#E8743B" />
      <path d="M84 46 C92 52 94 60 92 66 C88 60 86 54 84 46 Z" fill="#FFFFFF" />
      <ellipse cx="50" cy="74" rx="22" ry="18" fill="#E8743B" />
      <ellipse cx="50" cy="78" rx="11" ry="12" fill="#FFF3E6" strokeWidth="0" />
      <path d="M26 36 L28 6 L46 22 Z M74 36 L72 6 L54 22 Z" fill="#E8743B" />
      <path d="M28 14 L28 6 L34 11 Z M72 14 L72 6 L66 11 Z" fill={TINTA} strokeWidth="0" />
      <path
        d="M26 38 C26 22 38 16 50 16 C62 16 74 22 74 38 C74 52 62 60 50 64 C38 60 26 52 26 38 Z"
        fill="#E8743B"
      />
      <path
        d="M32 44 C38 52 44 56 50 64 C56 56 62 52 68 44 C62 48 56 48 50 50 C44 48 38 48 32 44 Z"
        fill="#FFF3E6"
        strokeWidth="0"
      />
      <Ojos y={38} separacion={12} r={4.5} />
      <ellipse cx="50" cy="56" rx="4" ry="3" fill={TINTA} />
    </g>
  ),

  'mascota-robotito': () => (
    <g {...trazo}>
      <line x1="50" y1="16" x2="50" y2="6" />
      <circle cx="50" cy="5" r="5" fill="#FF7A6B" />
      <rect x="30" y="58" width="40" height="30" rx="8" fill="#B9B0E4" />
      <circle cx="42" cy="72" r="3.5" fill="#3FD6C6" />
      <circle cx="58" cy="72" r="3.5" fill="#FFC23D" />
      <path d="M30 66 L18 76 M70 66 L82 76" strokeWidth="6" strokeLinecap="round" />
      <circle cx="17" cy="78" r="5" fill="#8C86A8" />
      <circle cx="83" cy="78" r="5" fill="#8C86A8" />
      <rect x="22" y="16" width="56" height="42" rx="12" fill="#D8D2F5" />
      <rect x="30" y="24" width="40" height="26" rx="8" fill="#241A58" />
      <rect x="37" y="31" width="8" height="10" rx="3" fill="#3FD6C6" strokeWidth="0" />
      <rect x="55" y="31" width="8" height="10" rx="3" fill="#3FD6C6" strokeWidth="0" />
      <path
        d="M43 45 Q50 49 57 45"
        stroke="#3FD6C6"
        strokeWidth="2.5"
        fill="none"
        strokeLinecap="round"
      />
      <rect x="36" y="88" width="10" height="6" rx="2" fill="#8C86A8" />
      <rect x="54" y="88" width="10" height="6" rx="2" fill="#8C86A8" />
    </g>
  ),

  'mascota-pulpo': () => (
    <g {...trazo}>
      {[
        'M30 60 C18 70 16 84 26 90 C30 84 30 76 38 70',
        'M40 66 C34 78 36 92 44 94 C46 86 44 78 48 70',
        'M52 70 C56 80 54 92 62 94 C66 86 62 76 58 68',
        'M62 66 C72 72 76 86 72 92 C82 88 80 72 70 60',
      ].map((d) => (
        <path key={d} d={d} fill="#B070E0" />
      ))}
      <path
        d="M20 50 C20 22 36 10 50 10 C64 10 80 22 80 50 C80 64 68 70 50 70 C32 70 20 64 20 50 Z"
        fill="#B070E0"
      />
      <circle cx="34" cy="26" r="4" fill="#D6A8FF" strokeWidth="0" />
      <circle cx="64" cy="22" r="3" fill="#D6A8FF" strokeWidth="0" />
      <Ojos y={46} separacion={12} />
      <Mejillas y={56} separacion={20} />
      <Sonrisa y={57} ancho={5} />
    </g>
  ),

  'mascota-ajolote': () => (
    <g {...trazo}>
      <path d="M70 80 C86 82 94 74 94 66 C86 70 78 70 70 70 Z" fill="#FFB3C8" />
      <ellipse cx="52" cy="76" rx="24" ry="14" fill="#FFB3C8" />
      {espejoMascota(
        <g fill="#FF6F9E">
          <path d="M26 34 C14 26 8 30 10 36 C16 36 20 38 24 40 Z" />
          <path d="M24 44 C10 42 6 48 10 52 C14 50 20 50 24 50 Z" />
          <path d="M26 54 C14 58 12 64 18 66 C20 62 24 60 28 58 Z" />
        </g>,
      )}
      <ellipse cx="50" cy="46" rx="26" ry="22" fill="#FFC6D6" />
      <Ojos y={44} separacion={14} r={4} />
      <Mejillas y={52} separacion={18} />
      <path
        d="M40 56 Q50 62 60 56"
        stroke={TINTA}
        strokeWidth="2.5"
        fill="none"
        strokeLinecap="round"
      />
      <ellipse cx="38" cy="88" rx="6" ry="4" fill="#FFB3C8" />
      <ellipse cx="62" cy="88" rx="6" ry="4" fill="#FFB3C8" />
    </g>
  ),

  'mascota-buho': () => (
    <g {...trazo}>
      <path d="M26 30 L22 8 L40 22 Z M74 30 L78 8 L60 22 Z" fill="#9C6B3E" />
      <ellipse cx="50" cy="56" rx="30" ry="36" fill="#9C6B3E" />
      <ellipse cx="50" cy="66" rx="18" ry="22" fill="#F3DDB7" strokeWidth="0" />
      <path
        d="M42 62 l4 4 l4 -4 M50 70 l4 4 l4 -4 M40 74 l4 4 l4 -4"
        stroke="#C9A06C"
        strokeWidth="2"
        fill="none"
      />
      {[37, 63].map((x) => (
        <g key={x}>
          <circle cx={x} cy="38" r="12" fill="#F3DDB7" />
          <circle cx={x} cy="38" r="7" fill="#FFC23D" strokeWidth="2" />
          <circle cx={x} cy="38" r="4" fill={TINTA} strokeWidth="0" />
          <circle cx={x + 1.5} cy="36" r="1.6" fill="#FFFFFF" strokeWidth="0" />
        </g>
      ))}
      <path d="M46 48 L54 48 L50 56 Z" fill="#FFA23C" />
      <path d="M20 58 C14 70 18 80 26 82 M80 58 C86 70 82 80 74 82" fill="none" strokeWidth="3" />
      <path
        d="M40 92 l-3 5 M44 92 l0 5 M56 92 l0 5 M60 92 l3 5"
        stroke="#FFA23C"
        strokeWidth="3"
        strokeLinecap="round"
      />
    </g>
  ),

  'mascota-tortuga': () => (
    <g {...trazo}>
      <ellipse cx="18" cy="62" rx="12" ry="10" fill="#8FD17A" />
      <circle cx="16" cy="60" r="2.5" fill={TINTA} strokeWidth="0" />
      <path d="M12 66 Q16 69 20 66" fill="none" strokeWidth="2" />
      {[30, 70].map((x) => (
        <ellipse key={x} cx={x} cy="82" rx="8" ry="6" fill="#8FD17A" />
      ))}
      <path d="M24 74 C24 46 38 34 56 34 C74 34 88 46 88 74 Z" fill="#4F9B3A" />
      <path
        d="M56 38 L56 74 M40 42 L34 74 M72 42 L78 74 M28 58 L84 58"
        stroke="#2E6B33"
        strokeWidth="2.5"
        fill="none"
      />
      <path d="M22 74 H90" strokeWidth="4" />
      <path
        d="M40 42 Q46 36 56 36"
        stroke="#FFFFFF"
        strokeOpacity="0.35"
        strokeWidth="3"
        fill="none"
        strokeLinecap="round"
      />
    </g>
  ),

  'mascota-conejo': () => (
    <g {...trazo}>
      {[38, 62].map((x, i) => (
        <g key={x} transform={`rotate(${i === 0 ? -8 : 8} ${x} 30)`}>
          <ellipse cx={x} cy="18" rx="8" ry="20" fill="#F6F3FF" />
          <ellipse cx={x} cy="20" rx="3.5" ry="13" fill={ROSA} strokeWidth="0" />
        </g>
      ))}
      <circle cx="80" cy="78" r="7" fill="#FFFFFF" />
      <ellipse cx="50" cy="76" rx="24" ry="18" fill="#F6F3FF" />
      <circle cx="50" cy="48" r="22" fill="#F6F3FF" />
      <Ojos y={46} separacion={10} r={4} />
      <Mejillas y={54} separacion={16} />
      <path d="M47 53 L53 53 L50 57 Z" fill={ROSA} strokeWidth="1.5" />
      <ellipse cx="40" cy="92" rx="7" ry="4" fill="#F6F3FF" />
      <ellipse cx="60" cy="92" rx="7" ry="4" fill="#F6F3FF" />
    </g>
  ),

  'mascota-medusa': () => (
    <g {...trazo}>
      {[32, 42, 52, 62, 70].map((x, i) => (
        <path
          key={x}
          d={`M${x} 56 C${x - 6} 66 ${x + 6} 74 ${x} ${84 + (i % 2) * 6}`}
          fill="none"
          stroke="#FF9CC8"
          strokeWidth="4"
          strokeLinecap="round"
        />
      ))}
      <path
        d="M20 56 C20 26 36 14 50 14 C64 14 80 26 80 56 C72 60 64 56 58 60 C52 56 46 60 40 56 C34 60 26 60 20 56 Z"
        fill="#FFC6E0"
        fillOpacity="0.9"
      />
      <path
        d="M30 32 Q38 22 50 20"
        stroke="#FFFFFF"
        strokeWidth="3"
        fill="none"
        strokeLinecap="round"
      />
      <Ojos y={42} separacion={10} r={4} />
      <Sonrisa y={49} ancho={4} />
    </g>
  ),

  'mascota-dragon': () => (
    <g {...trazo}>
      <path d="M68 78 C88 84 96 70 92 60 L98 58 L90 52 C92 64 80 72 66 70 Z" fill="#5CBF4A" />
      {espejoMascota(<path d="M26 60 C8 50 4 34 10 26 C16 36 24 40 32 42 Z" fill="#A7E08F" />)}
      <ellipse cx="50" cy="72" rx="22" ry="18" fill="#7BD65A" />
      <ellipse cx="50" cy="76" rx="12" ry="12" fill="#FFE3A0" strokeWidth="0" />
      <path d="M36 22 L32 8 L44 18 Z M64 22 L68 8 L56 18 Z" fill="#FFE3A0" />
      <circle cx="50" cy="40" r="22" fill="#7BD65A" />
      <Ojos y={38} separacion={10} r={4.5} />
      <path
        d="M44 50 Q50 54 56 50"
        stroke={TINTA}
        strokeWidth="2.5"
        fill="none"
        strokeLinecap="round"
      />
      <circle cx="45" cy="47" r="1.5" fill={TINTA} strokeWidth="0" />
      <circle cx="55" cy="47" r="1.5" fill={TINTA} strokeWidth="0" />
      <ellipse cx="40" cy="90" rx="7" ry="4" fill="#5CBF4A" />
      <ellipse cx="60" cy="90" rx="7" ry="4" fill="#5CBF4A" />
    </g>
  ),

  'mascota-fenix': () => (
    <g {...trazo}>
      <path d="M50 70 C40 86 30 94 20 96 C30 88 34 80 36 72 Z" fill="#FF5A36" />
      <path d="M50 70 C50 88 50 94 50 98 C54 90 58 82 60 72 Z" fill="#FFA23C" />
      <path d="M50 70 C62 86 72 94 82 96 C72 88 68 80 66 72 Z" fill="#FF5A36" />
      {espejoMascota(
        <path d="M34 50 C18 40 6 42 2 50 C12 52 16 58 14 64 C22 62 28 64 32 68 Z" fill="#FF7A3C" />,
      )}
      <ellipse cx="50" cy="56" rx="18" ry="20" fill="#FF8A3C" />
      <ellipse cx="50" cy="62" rx="10" ry="12" fill="#FFD27A" strokeWidth="0" />
      <path d="M44 20 C42 10 48 4 50 2 C52 8 56 12 54 20 Z" fill="#FFC23D" />
      <circle cx="50" cy="32" r="16" fill="#FF8A3C" />
      <Ojos y={30} separacion={7} r={3.5} />
      <path d="M46 37 L54 37 L50 43 Z" fill="#FFC23D" />
    </g>
  ),

  'mascota-pinguino': () => (
    <g {...trazo}>
      <ellipse cx="50" cy="58" rx="28" ry="34" fill="#2B2F4A" />
      <ellipse cx="50" cy="64" rx="18" ry="24" fill="#F6F3FF" strokeWidth="0" />
      <path
        d="M22 54 C14 64 16 74 22 78 M78 54 C86 64 84 74 78 78"
        fill="none"
        strokeWidth="6"
        stroke="#2B2F4A"
        strokeLinecap="round"
      />
      <path d="M34 34 C38 26 62 26 66 34 C62 40 38 40 34 34 Z" fill="#F6F3FF" strokeWidth="0" />
      <Ojos y={36} separacion={9} r={4} />
      <Mejillas y={44} separacion={16} />
      <path d="M44 42 L56 42 L50 50 Z" fill="#FFA23C" />
      <ellipse cx="40" cy="92" rx="8" ry="4" fill="#FFA23C" />
      <ellipse cx="60" cy="92" rx="8" ry="4" fill="#FFA23C" />
    </g>
  ),

  'mascota-panda': () => (
    <g {...trazo}>
      <circle cx="28" cy="22" r="10" fill="#2B2B35" />
      <circle cx="72" cy="22" r="10" fill="#2B2B35" />
      <ellipse cx="50" cy="76" rx="26" ry="18" fill="#FFFFFF" />
      <path
        d="M26 70 C20 78 22 88 30 90 M74 70 C80 78 78 88 70 90"
        fill="none"
        stroke="#2B2B35"
        strokeWidth="10"
        strokeLinecap="round"
      />
      <circle cx="50" cy="44" r="26" fill="#FFFFFF" />
      <ellipse
        cx="39"
        cy="44"
        rx="8"
        ry="10"
        fill="#2B2B35"
        transform="rotate(20 39 44)"
        strokeWidth="0"
      />
      <ellipse
        cx="61"
        cy="44"
        rx="8"
        ry="10"
        fill="#2B2B35"
        transform="rotate(-20 61 44)"
        strokeWidth="0"
      />
      <circle cx="40" cy="43" r="3.5" fill="#FFFFFF" strokeWidth="0" />
      <circle cx="60" cy="43" r="3.5" fill="#FFFFFF" strokeWidth="0" />
      <ellipse cx="50" cy="55" rx="4" ry="3" fill="#2B2B35" />
      <Sonrisa y={59} ancho={4} />
      <Mejillas y={56} separacion={18} />
    </g>
  ),

  'mascota-perrito': () => (
    <g {...trazo}>
      <path
        d="M72 76 C86 72 90 60 86 54"
        fill="none"
        stroke="#C98B55"
        strokeWidth="7"
        strokeLinecap="round"
      />
      <ellipse cx="50" cy="76" rx="24" ry="17" fill="#C98B55" />
      <ellipse cx="50" cy="80" rx="12" ry="10" fill="#F3DDB7" strokeWidth="0" />
      <circle cx="50" cy="44" r="24" fill="#E0A96D" />
      {espejoMascota(<path d="M30 28 C18 28 14 44 20 56 C26 54 30 46 32 36 Z" fill="#8A5A36" />)}
      <ellipse cx="50" cy="54" rx="12" ry="9" fill="#F3DDB7" />
      <Ojos y={42} separacion={10} r={4.5} />
      <ellipse cx="50" cy="51" rx="4.5" ry="3.5" fill={TINTA} />
      <path d="M50 55 Q46 60 42 58 M50 55 Q54 60 58 58" fill="none" strokeWidth="2" />
      <path d="M48 60 Q50 66 52 60 Z" fill="#FF7A8A" strokeWidth="1.5" />
      <ellipse cx="40" cy="92" rx="7" ry="4" fill="#E0A96D" />
      <ellipse cx="60" cy="92" rx="7" ry="4" fill="#E0A96D" />
    </g>
  ),
};

/** Refleja un dibujo de izquierda a derecha sobre el eje de la mascota. */
function espejoMascota(contenido: ReactNode): ReactNode {
  return (
    <>
      {contenido}
      <g transform="translate(100 0) scale(-1 1)">{contenido}</g>
    </>
  );
}

/** Caja de la mascota y lo que pueden sobresalir orejas y llamas, en unidades del SVG. */
const VISTA = { ancho: 100, alto: 100 };
const DESBORDE: Desborde = { lados: 3, arriba: 6, abajo: 2 };

export function Mascota({
  id,
  alto,
  tamano,
  etiqueta,
}: {
  id: string;
  alto: number;
  /** Px de pantalla por píxel del dibujo: el mismo que el avatar al que acompaña. */
  tamano?: number;
  etiqueta: string;
}) {
  const dibujo = MASCOTAS_VECTORIALES[id];
  if (!dibujo) return null;
  return (
    <Pixelado
      vista={VISTA}
      desborde={DESBORDE}
      contorno={TINTA}
      alto={alto}
      tamano={tamano}
      etiqueta={etiqueta}
      dibujo={() => dibujo()}
    />
  );
}
