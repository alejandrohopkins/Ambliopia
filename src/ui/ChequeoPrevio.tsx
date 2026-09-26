/**
 * Chequeo previo: sin confirmarlo no empieza ninguna sesión.
 * En parche, confirmar el parche y los lentes de graduación.
 * En lentes, el escáner previo.
 * Después, el recordatorio de distancia.
 */
import { useState } from 'react';
import type { Modo } from '../config';
import { es, ojoContrario } from '../i18n/es';
import { useEstado } from '../storage/contexto';
import { AvatarCompuesto } from './componentes/AvatarCompuesto';
import { EscanerPrevio } from '../calibration/EscanerPrevio';

export function ChequeoPrevio({
  modo,
  alAprobar,
  alRecalibrar,
  alCancelar,
}: {
  modo: Modo;
  alAprobar: () => void;
  alRecalibrar: () => void;
  alCancelar: () => void;
}) {
  const { estado } = useEstado();
  const [confirmado, setConfirmado] = useState(false);
  const ojoTapado = ojoContrario(estado.perfil.ojoAmbliope);

  if (confirmado) {
    return (
      <main style={{ padding: 24, maxWidth: 700, margin: '0 auto' }}>
        <h1>{es.chequeo.distancia}</h1>
        <p className="numero" style={{ fontSize: 24 }}>
          {estado.ajustes.distanciaCm} cm
        </p>
        <button className="pixelado" onClick={alAprobar}>
          {es.comun.continuar}
        </button>
      </main>
    );
  }

  if (modo === 'lentes') {
    return (
      <EscanerPrevio
        alAprobar={() => setConfirmado(true)}
        alRecalibrar={alRecalibrar}
        alCancelar={alCancelar}
      />
    );
  }

  return (
    <main style={{ padding: 24, maxWidth: 700, margin: '0 auto', textAlign: 'center' }}>
      <AvatarCompuesto alto={200} parche={ojoTapado} vivo />
      <h1>{es.chequeo.parche(ojoTapado)}</h1>
      <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
        <button className="pixelado" onClick={() => setConfirmado(true)}>
          {es.chequeo.parcheListo}
        </button>
        <button className="pixelado secundario" onClick={alCancelar}>
          {es.comun.volverALaBase}
        </button>
      </div>
    </main>
  );
}
