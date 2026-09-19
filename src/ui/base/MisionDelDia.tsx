/** Misión del día con su progreso. Una por día, siempre la misma. */
import { es } from '../../i18n/es';
import { useEstado } from '../../storage/contexto';

export function MisionDelDia({ dia }: { dia: string }) {
  const { estado } = useEstado();
  const mision = estado.misiones[dia];
  if (!mision) return null;

  const texto = es.misiones[mision.tipo]?.(mision.objetivo) ?? '';
  const fraccion = mision.objetivo > 0 ? mision.progreso / mision.objetivo : 0;

  return (
    <section className="panel pixelado" style={{ marginBottom: 18 }}>
      <h2 style={{ marginBottom: 8 }}>{es.base.misionDelDia}</h2>
      <p style={{ margin: '0 0 8px' }}>{texto}</p>
      <div
        aria-label={`${mision.progreso} / ${mision.objetivo}`}
        style={{ background: '#140e38', border: '3px solid var(--borde)', height: 18 }}
      >
        <div
          style={{
            width: `${Math.min(100, fraccion * 100)}%`,
            height: '100%',
            background: mision.completada ? 'var(--musgo-pixel)' : 'var(--cristal)',
          }}
        />
      </div>
      <p className="numero" style={{ margin: '6px 0 0' }}>
        {mision.progreso} / {mision.objetivo}
        {mision.completada ? ` · +${es.comun.monedas}` : ''}
      </p>
    </section>
  );
}
