/**
 * Menú de pausa. "Me molesta la vista" termina la sesión sin penalización y
 * deja constancia para el panel de adultos.
 */
import { es } from '../../i18n/es';

export function MenuDePausa({
  alSeguir,
  alMolestia,
  alSalir,
}: {
  alSeguir: () => void;
  alMolestia: () => void;
  alSalir: () => void;
}) {
  return (
    <div
      role="dialog"
      aria-label={es.pausa.titulo}
      style={{
        position: 'absolute',
        inset: 0,
        display: 'grid',
        placeItems: 'center',
        background: 'rgba(10, 7, 30, 0.9)',
      }}
    >
      <div className="panel pixelado" style={{ textAlign: 'center', minWidth: 280 }}>
        <h2>{es.pausa.titulo}</h2>
        <div style={{ display: 'grid', gap: 10 }}>
          <button className="pixelado" onClick={alSeguir} autoFocus>
            {es.pausa.seguir}
          </button>
          <button className="pixelado secundario" onClick={alMolestia}>
            {es.pausa.molestia}
          </button>
          <button className="pixelado secundario" onClick={alSalir}>
            {es.pausa.salir}
          </button>
        </div>
      </div>
    </div>
  );
}
