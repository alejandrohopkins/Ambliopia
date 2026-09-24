/**
 * El avatar dibujado con vectores: sin píxeles, con volumen y detalle. Se ve
 * la cara a través del visor, el traje tiene luces y sombras, guantes, botas,
 * cinturón y un panel en el pecho. Cada casco y cada accesorio aporta lo que
 * va detrás del cuerpo y lo que va delante.
 *
 * Es el avatar de la base, la tienda, «Mi avatar», el fin de nivel, el
 * chequeo y el premio. Dentro de los juegos sigue saliendo el sprite de
 * bloques (avatar/enJuego), que respeta los cuatro colores del modo lentes.
 *
 * Diseño propio: una exploradora espacial genérica, sin nada de ningún juego.
 */
import { useId, type ReactNode } from 'react';
import { config, type Ojo } from '../../config';
import { articulo } from '../../rewards/catalogo';
import { PALETA_POR_DEFECTO, ladoEnLaImagen } from '../sprites';
import { aclarar, oscurecer } from './color';

const TINTA = '#1E1638';
const CASCO = '#EEEAFF';
const CASCO_SOMBRA = '#C3BAEE';
const GUANTE = '#F6F3FF';
const BOTA = '#3A2F6B';
const ORO = '#FFC23D';

/** Colores y nombres de degradado de una figura concreta. */
interface Estilo {
  traje: string;
  traje2: string | null;
  visor: string;
  visor2: string | null;
  espejo: boolean;
  piel: string;
  pelo: string;
  /** Cada figura lleva sus propios degradados: puede haber varias en pantalla. */
  url: (nombre: string) => string;
  id: (nombre: string) => string;
}

export interface PropsDeFigura {
  /** Lo equipado: categoría → identificador del catálogo. */
  equipo: Record<string, string | undefined>;
  piel: string;
  pelo: string;
  /** Ojo con parche, como la jugadora en modo parche. */
  parche?: Ojo | null;
  /** Alto en píxeles; el ancho sale solo. */
  alto: number;
  etiqueta: string;
  /** Respiración suave, que se apaga con reducir movimiento. */
  respira?: boolean;
}

export function Figura({
  equipo,
  piel,
  pelo,
  parche = null,
  alto,
  etiqueta,
  respira,
}: PropsDeFigura) {
  const prefijo = useId().replace(/[^a-zA-Z0-9]/g, '');
  const traje = articulo(equipo.trajes ?? '');
  const visor = articulo(equipo.visores ?? '');
  const estilo: Estilo = {
    traje: traje?.color ?? PALETA_POR_DEFECTO.B,
    traje2: traje?.color2 ?? null,
    visor: visor?.color ?? PALETA_POR_DEFECTO.V,
    visor2: visor?.color2 ?? null,
    espejo: equipo.visores === 'visor-espejo',
    piel,
    pelo,
    url: (nombre) => `url(#${prefijo}${nombre})`,
    id: (nombre) => `${prefijo}${nombre}`,
  };
  const casco = equipo.cascos ?? 'casco-clasico';
  const accesorio = equipo.accesorios;

  return (
    <svg
      viewBox="0 0 200 280"
      height={alto}
      width={(alto * 200) / 280}
      role="img"
      aria-label={etiqueta}
      style={{ overflow: 'visible' }}
    >
      <Degradados e={estilo} />
      <g transform="translate(0 20)">
        <g
          className={respira ? 'respira' : undefined}
          style={
            respira ? { animationDuration: `${config.avatar.respiracionMs * 2}ms` } : undefined
          }
        >
          {accesorio && ACCESORIOS[accesorio]?.detras?.(estilo)}
          <Piernas e={estilo} />
          <Brazos e={estilo} />
          <Torso e={estilo} />
          {accesorio && ACCESORIOS[accesorio]?.delante?.(estilo)}
          {CASCOS[casco]?.detras?.(estilo)}
          {casco === 'casco-burbuja' ? (
            <CabezaEnBurbuja e={estilo} parche={parche} />
          ) : (
            <Cabeza e={estilo} parche={parche} conAuriculares={casco === 'casco-auriculares'} />
          )}
          {CASCOS[casco]?.delante?.(estilo)}
          {accesorio && ACCESORIOS[accesorio]?.arriba?.(estilo)}
        </g>
      </g>
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Degradados
// ---------------------------------------------------------------------------

function Degradados({ e }: { e: Estilo }) {
  const trajeParadas = e.traje2
    ? [e.traje, e.traje2]
    : [aclarar(e.traje, 0.3), e.traje, oscurecer(e.traje, 0.2)];
  const visorParadas = e.espejo
    ? [aclarar(e.visor, 0.7), e.visor, oscurecer(e.visor, 0.35)]
    : [e.visor, e.visor2 ?? e.visor];
  return (
    <defs>
      <linearGradient id={e.id('traje')} x1="0" y1="0" x2="1" y2="1">
        {trajeParadas.map((color, i) => (
          <stop key={i} offset={i / (trajeParadas.length - 1)} stopColor={color} />
        ))}
      </linearGradient>
      <radialGradient id={e.id('casco')} cx="0.36" cy="0.3" r="0.8">
        <stop offset="0" stopColor="#FFFFFF" />
        <stop offset="0.45" stopColor={CASCO} />
        <stop offset="1" stopColor={CASCO_SOMBRA} />
      </radialGradient>
      <linearGradient id={e.id('visor')} x1="0" y1="0" x2="0.4" y2="1">
        {visorParadas.map((color, i) => (
          <stop key={i} offset={i / (visorParadas.length - 1)} stopColor={color} />
        ))}
      </linearGradient>
      {/* Cristal del visor: limpio en el centro para que la cara se vea con su
          color, y teñido hacia el borde con el color del visor. */}
      <radialGradient id={e.id('vidrio')} cx="0.5" cy="0.55" r="0.62">
        <stop offset="0.5" stopColor={e.visor} stopOpacity="0.04" />
        <stop offset="1" stopColor={e.visor2 ?? e.visor} stopOpacity="0.6" />
      </radialGradient>
      <linearGradient id={e.id('oro')} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#FFE9A3" />
        <stop offset="0.5" stopColor={ORO} />
        <stop offset="1" stopColor="#D98E1A" />
      </linearGradient>
      <linearGradient id={e.id('metal')} x1="0" y1="0" x2="1" y2="0">
        <stop offset="0" stopColor="#8C86A8" />
        <stop offset="0.45" stopColor="#ECE9F7" />
        <stop offset="1" stopColor="#8C86A8" />
      </linearGradient>
      <linearGradient id={e.id('capa')} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#E8508A" />
        <stop offset="1" stopColor="#8E1F52" />
      </linearGradient>
      <linearGradient id={e.id('alas')} x1="1" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#FFFFFF" />
        <stop offset="1" stopColor="#FFE3A0" />
      </linearGradient>
      <clipPath id={e.id('recorteVisor')}>
        <rect x="56" y="50" width="88" height="72" rx="34" />
      </clipPath>
      <clipPath id={e.id('recorteTorso')}>
        <path d={TORSO} />
      </clipPath>
    </defs>
  );
}

// ---------------------------------------------------------------------------
// Cuerpo
// ---------------------------------------------------------------------------

const TORSO =
  'M64 158 Q64 146 76 146 H124 Q136 146 136 158 V204 Q136 216 124 216 H76 Q64 216 64 204 Z';

function Piernas({ e }: { e: Estilo }) {
  const pierna = e.traje2 ?? oscurecer(e.traje, 0.12);
  return (
    <g stroke={TINTA} strokeWidth="4" strokeLinejoin="round">
      {[74, 104].map((x) => (
        <g key={x}>
          <rect x={x} y="206" width="22" height="34" rx="9" fill={pierna} />
          <rect x={x - 6} y="232" width="34" height="22" rx="10" fill={BOTA} />
          <path d={`M${x - 2} 240 h26`} stroke={aclarar(BOTA, 0.35)} strokeWidth="3" />
        </g>
      ))}
    </g>
  );
}

function Brazos({ e }: { e: Estilo }) {
  const brazos = ['M70 158 C54 166 46 184 46 202', 'M130 158 C146 166 154 184 154 202'];
  return (
    <g fill="none" strokeLinecap="round">
      {brazos.map((d) => (
        <g key={d}>
          <path d={d} stroke={TINTA} strokeWidth="26" />
          <path d={d} stroke={e.traje} strokeWidth="18" />
        </g>
      ))}
      {[46, 154].map((x) => (
        <g key={x} stroke={TINTA} strokeWidth="4">
          <ellipse cx={x} cy="196" rx="12" ry="5" fill={aclarar(e.traje, 0.35)} />
          <circle cx={x} cy="209" r="12" fill={GUANTE} />
        </g>
      ))}
    </g>
  );
}

function Torso({ e }: { e: Estilo }) {
  return (
    <g>
      <path d={TORSO} fill={e.url('traje')} stroke={TINTA} strokeWidth="4" />
      <g clipPath={e.url('recorteTorso')}>
        {e.traje2 && (
          <path
            d="M60 168 L100 190 L140 168"
            stroke={aclarar(e.traje2, 0.25)}
            strokeWidth="8"
            fill="none"
          />
        )}
        <rect x="60" y="198" width="80" height="10" fill="#2A2150" />
        <path
          d="M73 154 Q70 176 74 194"
          stroke="#FFFFFF"
          strokeOpacity="0.28"
          strokeWidth="5"
          strokeLinecap="round"
          fill="none"
        />
      </g>
      <rect
        x="93"
        y="196"
        width="14"
        height="14"
        rx="3"
        fill={ORO}
        stroke={TINTA}
        strokeWidth="2.5"
      />
      <rect
        x="84"
        y="162"
        width="32"
        height="18"
        rx="5"
        fill="#2A2150"
        stroke={TINTA}
        strokeWidth="2.5"
      />
      {[
        [92, '#3FD6C6'],
        [100, ORO],
        [108, '#FF7A6B'],
      ].map(([x, color]) => (
        <circle key={x} cx={x} cy="171" r="3.2" fill={color as string} />
      ))}
      <ellipse
        cx="100"
        cy="146"
        rx="36"
        ry="9"
        fill={oscurecer(e.traje, 0.3)}
        stroke={TINTA}
        strokeWidth="4"
      />
    </g>
  );
}

// ---------------------------------------------------------------------------
// Cabeza
// ---------------------------------------------------------------------------

/** La cara que se ve a través del visor. */
function Cara({ e, parche }: { e: Estilo; parche: Ojo | null }) {
  const tapado = parche ? (ladoEnLaImagen(parche) === 'izquierda' ? 85 : 115) : null;
  return (
    <g>
      <ellipse cx="100" cy="94" rx="40" ry="38" fill={e.piel} />
      {/* Flequillo de lado: corto a un lado y largo hacia el otro. */}
      <path
        d="M52 88 C50 58 72 42 100 42 C128 42 150 58 148 90 C140 84 128 80 114 76 C100 72 86 66 74 60 C64 66 56 74 52 88 Z"
        fill={e.pelo}
      />
      <path
        d="M84 50 Q104 56 122 70"
        stroke={oscurecer(e.pelo, 0.25)}
        strokeWidth="2.5"
        strokeLinecap="round"
        fill="none"
      />
      <path
        d="M74 56 Q90 48 108 50"
        stroke="#FFFFFF"
        strokeOpacity="0.3"
        strokeWidth="3"
        strokeLinecap="round"
        fill="none"
      />
      {[85, 115].map((x) => (
        <g key={x}>
          <ellipse cx={x} cy="98" rx="5.5" ry="7" fill={TINTA} />
          <circle cx={x + 2} cy="95" r="2" fill="#FFFFFF" />
        </g>
      ))}
      <ellipse cx="73" cy="109" rx="7" ry="4.5" fill="#FF8FA3" opacity="0.55" />
      <ellipse cx="127" cy="109" rx="7" ry="4.5" fill="#FF8FA3" opacity="0.55" />
      <path
        d="M92 111 Q100 119 108 111"
        stroke={TINTA}
        strokeWidth="3"
        strokeLinecap="round"
        fill="none"
      />
      {tapado !== null && (
        <g>
          <path d="M52 90 L148 102" stroke="#191233" strokeWidth="4" />
          <ellipse cx={tapado} cy="98" rx="11" ry="10" fill="#191233" />
        </g>
      )}
    </g>
  );
}

function Cabeza({
  e,
  parche,
  conAuriculares,
}: {
  e: Estilo;
  parche: Ojo | null;
  conAuriculares: boolean;
}) {
  return (
    <g>
      <circle cx="100" cy="82" r="60" fill={e.url('casco')} stroke={TINTA} strokeWidth="4.5" />
      {!conAuriculares &&
        [41, 159].map((x) => (
          <circle key={x} cx={x} cy="88" r="8" fill="#B9B0E4" stroke={TINTA} strokeWidth="3" />
        ))}
      <g clipPath={e.url('recorteVisor')}>
        <rect x="56" y="50" width="88" height="72" fill="#2A2150" />
        {!e.espejo && <Cara e={e} parche={parche} />}
        <rect
          x="56"
          y="50"
          width="88"
          height="72"
          fill={e.espejo ? e.url('visor') : e.url('vidrio')}
        />
        <path
          d="M66 72 Q70 58 88 54"
          stroke="#FFFFFF"
          strokeOpacity="0.75"
          strokeWidth="6"
          strokeLinecap="round"
          fill="none"
        />
        <circle cx="96" cy="54" r="3" fill="#FFFFFF" opacity="0.75" />
      </g>
      <rect
        x="56"
        y="50"
        width="88"
        height="72"
        rx="34"
        fill="none"
        stroke={TINTA}
        strokeWidth="4.5"
      />
      <path
        d="M40 70 Q44 44 70 30"
        stroke="#FFFFFF"
        strokeOpacity="0.8"
        strokeWidth="4"
        strokeLinecap="round"
        fill="none"
      />
    </g>
  );
}

/** Casco burbuja: una cúpula de cristal que deja ver toda la cabeza. */
function CabezaEnBurbuja({ e, parche }: { e: Estilo; parche: Ojo | null }) {
  return (
    <g>
      <path
        d="M46 96 C44 50 70 30 100 30 C130 30 156 50 154 96 C150 124 136 132 128 128 L72 128 C64 132 50 124 46 96 Z"
        fill={e.pelo}
      />
      <Cara e={e} parche={parche} />
      <circle
        cx="100"
        cy="82"
        r="64"
        fill={e.visor}
        fillOpacity="0.16"
        stroke="#C9F2FF"
        strokeWidth="4"
      />
      <circle cx="100" cy="82" r="64" fill="none" stroke={TINTA} strokeWidth="2" opacity="0.6" />
      <path
        d="M50 64 Q58 36 86 26"
        stroke="#FFFFFF"
        strokeOpacity="0.85"
        strokeWidth="6"
        strokeLinecap="round"
        fill="none"
      />
      <circle cx="98" cy="24" r="3.5" fill="#FFFFFF" opacity="0.85" />
    </g>
  );
}

// ---------------------------------------------------------------------------
// Cascos: lo que asoma detrás del casco y lo que va encima
// ---------------------------------------------------------------------------

interface Partes {
  detras?: (e: Estilo) => ReactNode;
  delante?: (e: Estilo) => ReactNode;
  /** Solo accesorios: lo que va sobre el casco. */
  arriba?: (e: Estilo) => ReactNode;
}

/** Estrella de cinco puntas centrada en (cx, cy). */
function puntosDeEstrella(cx: number, cy: number, radio: number): string {
  return Array.from({ length: 10 }, (_, i) => {
    const r = i % 2 === 0 ? radio : radio * 0.45;
    const angulo = -Math.PI / 2 + (i * Math.PI) / 5;
    return `${(cx + Math.cos(angulo) * r).toFixed(1)},${(cy + Math.sin(angulo) * r).toFixed(1)}`;
  }).join(' ');
}

/** Refleja un dibujo de izquierda a derecha sobre el eje del avatar. */
function espejo(contenido: ReactNode): ReactNode {
  return (
    <>
      {contenido}
      <g transform="translate(200 0) scale(-1 1)">{contenido}</g>
    </>
  );
}

function Flor({ x, y, color }: { x: number; y: number; color: string }) {
  return (
    <g stroke={TINTA} strokeWidth="1.5">
      {[0, 72, 144, 216, 288].map((a) => (
        <circle
          key={a}
          cx={x + Math.cos((a * Math.PI) / 180) * 6}
          cy={y + Math.sin((a * Math.PI) / 180) * 6}
          r="5"
          fill={color}
        />
      ))}
      <circle cx={x} cy={y} r="4" fill={ORO} />
    </g>
  );
}

const CASCOS: Record<string, Partes> = {
  'casco-clasico': {},
  'casco-antena': {
    detras: () => (
      <g stroke={TINTA} strokeWidth="4">
        <line x1="100" y1="24" x2="100" y2="2" />
        <circle cx="100" cy="0" r="7" fill={ORO} strokeWidth="3" />
      </g>
    ),
  },
  'casco-gato': {
    detras: () =>
      espejo(
        <g strokeLinejoin="round">
          <path d="M50 54 L56 14 L86 32 Z" fill={CASCO} stroke={TINTA} strokeWidth="4" />
          <path d="M58 44 L61 25 L76 34 Z" fill="#FF9CC8" />
        </g>,
      ),
  },
  'casco-conejo': {
    detras: () =>
      espejo(
        <g transform="rotate(-14 80 20)">
          <ellipse cx="80" cy="8" rx="12" ry="28" fill={CASCO} stroke={TINTA} strokeWidth="4" />
          <ellipse cx="80" cy="10" rx="5.5" ry="20" fill="#FF9CC8" />
        </g>,
      ),
  },
  'casco-dragon': {
    detras: () => (
      <g stroke={TINTA} strokeWidth="3.5" strokeLinejoin="round">
        <path d="M84 28 L90 6 L98 24 L104 4 L112 24 L118 8 L120 30 Z" fill="#7BD65A" />
        {espejo(<path d="M58 44 C44 30 42 12 50 0 C54 16 62 26 76 30 Z" fill="#FFE3A0" />)}
      </g>
    ),
  },
  'casco-unicornio': {
    delante: (e) => (
      <g stroke={TINTA} strokeLinejoin="round">
        <path d="M91 44 L100 0 L109 44 Z" fill={e.url('oro')} strokeWidth="3.5" />
        <path d="M94 34 L106 30 M96 24 L104 21 M97 14 L103 12" strokeWidth="2" />
      </g>
    ),
  },
  'casco-aletas': {
    detras: () =>
      espejo(
        <g stroke={TINTA} strokeWidth="3.5" strokeLinejoin="round">
          <path d="M46 70 C24 60 14 40 20 24 C32 36 44 44 56 50 Z" fill="#3FD6C6" />
          <path d="M28 36 L44 54 M24 46 L42 60" strokeWidth="2" />
        </g>,
      ),
  },
  'casco-estrella': {
    delante: () => (
      <polygon
        points={puntosDeEstrella(100, 18, 17)}
        fill={ORO}
        stroke={TINTA}
        strokeWidth="3.5"
        strokeLinejoin="round"
      />
    ),
  },
  'casco-corona': {
    delante: (e) => (
      <g stroke={TINTA} strokeWidth="3.5" strokeLinejoin="round">
        <path d="M68 32 L72 4 L87 20 L100 0 L113 20 L128 4 L132 32 Z" fill={e.url('oro')} />
        <circle cx="100" cy="22" r="4" fill="#FF5FA2" strokeWidth="2" />
        <circle cx="82" cy="26" r="3" fill="#3FD6C6" strokeWidth="2" />
        <circle cx="118" cy="26" r="3" fill="#3FD6C6" strokeWidth="2" />
      </g>
    ),
  },
  'casco-visera': {
    delante: () => (
      <path
        d="M48 58 Q100 28 152 58 L160 68 Q100 40 40 68 Z"
        fill={ORO}
        stroke={TINTA}
        strokeWidth="4"
        strokeLinejoin="round"
      />
    ),
  },
  'casco-burbuja': {},
  'casco-auriculares': {
    delante: () => (
      <g stroke={TINTA} strokeWidth="4">
        <path d="M42 86 C40 26 160 26 158 86" fill="none" strokeWidth="14" strokeLinecap="round" />
        <path
          d="M42 86 C40 26 160 26 158 86"
          fill="none"
          stroke="#FF5FA2"
          strokeWidth="7"
          strokeLinecap="round"
        />
        {[26, 150].map((x) => (
          <rect key={x} x={x} y="68" width="24" height="38" rx="11" fill="#FF5FA2" />
        ))}
        {[38, 162].map((x) => (
          <ellipse
            key={x}
            cx={x}
            cy="87"
            rx="5"
            ry="11"
            fill={aclarar('#FF5FA2', 0.45)}
            strokeWidth="2"
          />
        ))}
      </g>
    ),
  },
  'casco-flores': {
    delante: () => (
      <g>
        {[
          [60, 42, '#FF9CC8'],
          [78, 28, '#FFE066'],
          [100, 22, '#9CC8FF'],
          [122, 28, '#FF9CC8'],
          [140, 42, '#C49BFF'],
        ].map(([x, y, color]) => (
          <Flor key={x as number} x={x as number} y={y as number} color={color as string} />
        ))}
      </g>
    ),
  },
};

// ---------------------------------------------------------------------------
// Accesorios
// ---------------------------------------------------------------------------

function Bufanda({ color, larga }: { color: string; larga: boolean }) {
  const raya = aclarar(color, 0.5);
  return (
    <g stroke={TINTA} strokeWidth="3.5" strokeLinejoin="round">
      {larga ? (
        <path d="M76 154 C58 170 40 176 18 170 L20 186 C44 192 64 182 84 162 Z" fill={color} />
      ) : (
        <path d="M116 154 L126 194 L110 196 L104 158 Z" fill={color} />
      )}
      <path d="M62 144 Q100 162 138 144 L138 157 Q100 175 62 157 Z" fill={color} />
      <path
        d="M72 150 L72 162 M88 154 L88 167 M112 154 L112 167 M128 150 L128 162"
        stroke={raya}
        strokeWidth="4"
      />
    </g>
  );
}

const ACCESORIOS: Record<string, Partes> = {
  'accesorio-mochila': {
    detras: () => (
      <g stroke={TINTA} strokeWidth="4" strokeLinejoin="round">
        {/* Aletas de cohete a los lados: es una mochila cohete. */}
        {espejo(<path d="M50 190 L32 218 L56 210 Z" fill="#FF7A6B" />)}
        <rect x="48" y="150" width="104" height="62" rx="16" fill="#A06A38" />
        <path d="M52 188 H148" stroke="#7A4E27" strokeWidth="3" />
      </g>
    ),
    delante: () => (
      <g stroke="#7A4E27" strokeWidth="7" strokeLinecap="round">
        <path d="M78 150 L80 198" />
        <path d="M122 150 L120 198" />
      </g>
    ),
  },
  'accesorio-bufanda': {
    delante: () => <Bufanda color="#FF7A6B" larga={false} />,
  },
  'accesorio-bufanda-larga': {
    delante: () => <Bufanda color="#7BD65A" larga />,
  },
  'accesorio-antenas': {
    arriba: () =>
      espejo(
        <g stroke={TINTA} strokeWidth="4" fill="none">
          <path d="M82 26 Q76 8 60 2" />
          <circle cx="58" cy="2" r="7" fill="#C49BFF" strokeWidth="3" />
        </g>,
      ),
  },
  'accesorio-capa': {
    detras: (e) => (
      <path
        d="M66 150 L134 150 L162 244 Q100 258 38 244 Z"
        fill={e.url('capa')}
        stroke={TINTA}
        strokeWidth="4"
        strokeLinejoin="round"
      />
    ),
    delante: () => (
      <g stroke={TINTA} strokeWidth="2.5" fill={ORO}>
        <circle cx="72" cy="152" r="6" />
        <circle cx="128" cy="152" r="6" />
      </g>
    ),
  },
  'accesorio-jetpack': {
    detras: (e) => (
      <g stroke={TINTA} strokeWidth="4" strokeLinejoin="round">
        {[38, 136].map((x) => (
          <g key={x}>
            <path d={`M${x + 4} 204 Q${x + 13} 236 ${x + 22} 204 Z`} fill="#FFA23C" />
            <path
              d={`M${x + 8} 204 Q${x + 13} 222 ${x + 18} 204 Z`}
              fill="#FFE066"
              strokeWidth="0"
            />
            <rect x={x} y="146" width="26" height="60" rx="12" fill={e.url('metal')} />
            <rect x={x} y="164" width="26" height="8" fill="#FF7A6B" strokeWidth="2.5" />
          </g>
        ))}
      </g>
    ),
  },
  'accesorio-alas': {
    detras: (e) =>
      espejo(
        <g stroke={TINTA} strokeWidth="3.5" strokeLinejoin="round">
          <path
            d="M72 162 C44 128 12 126 2 146 C14 150 18 156 12 166 C26 166 30 174 24 184 C38 182 44 190 40 202 C56 194 68 180 72 170 Z"
            fill={e.url('alas')}
          />
          <path
            d="M60 158 C44 146 28 142 16 146 M58 170 C44 162 32 162 22 166 M56 182 C46 178 38 180 30 184"
            strokeWidth="2"
            fill="none"
          />
        </g>,
      ),
  },
  'accesorio-medalla': {
    delante: (e) => (
      <g stroke={TINTA} strokeWidth="3" strokeLinejoin="round">
        <path d="M84 150 L100 176 L116 150" stroke="#6FB3FF" strokeWidth="8" fill="none" />
        <circle cx="100" cy="184" r="12" fill={e.url('oro')} />
        <polygon points={puntosDeEstrella(100, 184, 7)} fill="#FFF3C4" strokeWidth="1.5" />
      </g>
    ),
  },
  'accesorio-lazo': {
    arriba: () => (
      <g stroke={TINTA} strokeWidth="3.5" strokeLinejoin="round">
        <path d="M140 36 L118 22 L120 50 Z" fill="#FF5FA2" />
        <path d="M140 36 L162 22 L160 50 Z" fill="#FF5FA2" />
        <circle cx="140" cy="36" r="6" fill={aclarar('#FF5FA2', 0.35)} />
      </g>
    ),
  },
};

/** Para las pruebas: qué cascos y accesorios tienen dibujo vectorial. */
export const CASCOS_VECTORIALES = Object.keys(CASCOS);
export const ACCESORIOS_VECTORIALES = Object.keys(ACCESORIOS);
