import { es } from '../../i18n/es';

/** Aviso legal. Va en el asistente inicial y fijo al pie del panel de adultos. */
export function Aviso({ compacto = false }: { compacto?: boolean }) {
  return (
    <aside
      className="panel pixelado"
      style={{
        background: 'var(--superficie-alta)',
        fontSize: compacto ? 15 : 'var(--texto-minimo)',
      }}
    >
      {!compacto && <h2>{es.aviso.titulo}</h2>}
      <p style={{ margin: 0, maxWidth: '72ch' }}>{es.aviso.texto}</p>
    </aside>
  );
}
