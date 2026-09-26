/**
 * Al llegar al máximo diario los juegos se bloquean hasta mañana, con un
 * mensaje positivo y la avatar echándose una siesta. El adulto puede
 * extender desde su panel.
 */
import { config } from '../config';
import { es } from '../i18n/es';
import { Pixelnauta } from '../avatar/Pixelnauta';
import type { MapaDePixeles } from '../avatar/sprites';
import { AvatarCompuesto } from './componentes/AvatarCompuesto';
import { conAnimacion } from './animacion';

const ZETA: MapaDePixeles = ['ZZZZZ', '...Z.', '..Z..', '.Z...', 'ZZZZZ'];

/** Tres zetas que suben despacio, cada una a su tiempo. */
function Zetas() {
  const { zetaMs } = config.animacion;
  return (
    <span aria-hidden style={{ position: 'absolute', right: -24, top: 8 }}>
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="zeta"
          style={{
            ...conAnimacion(zetaMs, (i * zetaMs) / 3),
            position: 'absolute',
            left: i * 10,
            top: -i * 14,
          }}
        >
          <Pixelnauta mapa={ZETA} paleta={{ Z: '#EDE9FF' }} escala={3 + i} etiqueta="" />
        </span>
      ))}
    </span>
  );
}

export function LimiteDiario({ alVolver }: { alVolver: () => void }) {
  return (
    <main style={{ padding: 24, maxWidth: 640, margin: '0 auto', textAlign: 'center' }}>
      <div style={{ position: 'relative', display: 'inline-block', marginBottom: 12 }}>
        <AvatarCompuesto alto={200} dormida />
        <Zetas />
      </div>
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
