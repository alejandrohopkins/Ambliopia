/**
 * Al llegar al máximo diario los juegos se bloquean hasta mañana, con un
 * mensaje positivo. El adulto puede extender desde su panel.
 */
import { config } from '../config';
import { es } from '../i18n/es';

export function LimiteDiario({ alVolver }: { alVolver: () => void }) {
  return (
    <main style={{ padding: 24, maxWidth: 640, margin: '0 auto', textAlign: 'center' }}>
      <h1>{es.sesion.limiteAlcanzado}</h1>
      <p style={{ margin: '0 auto 18px' }}>
        {es.sesion.extenderTitulo}: {es.base.panelDeAdultos} ·{' '}
        {es.sesion.extender(config.sesion.extensionMin)}
      </p>
      <button className="pixelado" onClick={alVolver}>
        {es.comun.volverALaBase}
      </button>
    </main>
  );
}
