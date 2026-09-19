import { es } from '../../i18n/es';

/** Monedas, cristales y racha. Los iconos se dibujan por código. */
export function Contadores({
  monedas,
  cristales,
  racha,
}: {
  monedas: number;
  cristales: number;
  racha: number;
}) {
  return (
    <ul
      style={{
        listStyle: 'none',
        display: 'flex',
        gap: 18,
        padding: 0,
        margin: 0,
        flexWrap: 'wrap',
      }}
    >
      <Contador icono={<MonedaPixel />} valor={monedas} etiqueta={es.comun.monedas} />
      <Contador icono={<CristalPixel />} valor={cristales} etiqueta={es.comun.cristales} />
      <Contador icono={<LlamaPixel />} valor={racha} etiqueta={es.comun.racha} />
    </ul>
  );
}

function Contador({
  icono,
  valor,
  etiqueta,
}: {
  icono: React.ReactNode;
  valor: number;
  etiqueta: string;
}) {
  return (
    <li style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      {icono}
      <span className="numero">{valor}</span>
      <span style={{ color: 'var(--texto-tenue)', fontSize: 15 }}>{etiqueta}</span>
    </li>
  );
}

function MonedaPixel() {
  return (
    <svg width="18" height="18" viewBox="0 0 9 9" aria-hidden shapeRendering="crispEdges">
      <path d="M3 0h3v1H3zM2 1h1v1H2zM6 1h1v1H6zM1 2h1v5H1zM7 2h1v5H7zM2 7h1v1H2zM6 7h1v1H6zM3 8h3v1H3z" fill="#8a6412" />
      <path d="M2 2h5v5H2z" fill="var(--ambar-estelar)" />
      <path d="M4 3h1v3H4z" fill="#8a6412" />
    </svg>
  );
}

function CristalPixel() {
  return (
    <svg width="18" height="18" viewBox="0 0 9 9" aria-hidden shapeRendering="crispEdges">
      <path d="M4 0h1v1H4zM3 1h3v1H3zM2 2h5v1H2zM1 3h7v2H1zM2 5h5v1H2zM3 6h3v1H3zM4 7h1v1H4z" fill="var(--cristal)" />
      <path d="M4 2h1v5H4z" fill="#0d5f57" />
    </svg>
  );
}

function LlamaPixel() {
  return (
    <svg width="18" height="18" viewBox="0 0 9 9" aria-hidden shapeRendering="crispEdges">
      <path d="M4 0h1v2H4zM3 2h3v1H3zM2 3h5v4H2zM3 7h3v1H3z" fill="var(--ambar-estelar)" />
      <path d="M4 4h1v3H4z" fill="var(--nebulosa)" />
    </svg>
  );
}
