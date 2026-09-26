/** Misión del día con su progreso. Una por día, siempre la misma. */
import { config } from '../../config';
import { es } from '../../i18n/es';
import { useEstado } from '../../storage/contexto';
import type { Mision } from '../../storage/esquema';
import { conAnimacion, useValorAnimado } from '../animacion';

export function MisionDelDia({ dia }: { dia: string }) {
  const { estado } = useEstado();
  const mision = estado.misiones[dia];
  if (!mision) return null;
  return <TarjetaDeMision dia={dia} mision={mision} />;
}

function TarjetaDeMision({ dia, mision }: { dia: string; mision: Mision }) {
  const texto = es.misiones[mision.tipo]?.(mision.objetivo) ?? '';
  // La barra sube desde lo que se vio la última vez; si con eso se cumple, sello.
  const { valor: progreso, antes } = useValorAnimado(mision.progreso, `mision:${dia}`);
  const fraccion = mision.objetivo > 0 ? progreso / mision.objetivo : 0;
  const recienCumplida = mision.completada && antes < mision.objetivo;

  return (
    <section className="panel pixelado" style={{ marginBottom: 18 }}>
      <h2 style={{ marginBottom: 8 }}>
        {es.base.misionDelDia}
        {recienCumplida && (
          <span
            role="status"
            className="sello"
            style={{
              ...conAnimacion(config.animacion.selloMs, config.animacion.cuentaMs),
              display: 'inline-block',
              marginLeft: 12,
              color: 'var(--musgo-pixel)',
            }}
          >
            {es.base.misionHecha}
          </span>
        )}
      </h2>
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
        {Math.round(progreso)} / {mision.objetivo}
        {mision.completada ? ` · +${es.comun.monedas}` : ''}
      </p>
    </section>
  );
}
