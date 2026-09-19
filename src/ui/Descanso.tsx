/**
 * Pantalla de descanso: cada 20 minutos activos, un minuto mirando lejos.
 * Se puede saltar tras 30 segundos, para no volverla una cárcel.
 */
import { useEffect, useState } from 'react';
import { config } from '../config';
import { es } from '../i18n/es';

export function Descanso({ alTerminar }: { alTerminar: () => void }) {
  const [restantes, setRestantes] = useState(config.sesion.descansoSegundos);

  useEffect(() => {
    const id = setInterval(() => {
      setRestantes((s) => {
        if (s <= 1) {
          clearInterval(id);
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (restantes === 0) alTerminar();
  }, [restantes, alTerminar]);

  const transcurridos = config.sesion.descansoSegundos - restantes;
  const puedeSaltar = transcurridos >= config.sesion.descansoSaltableDespuesDeSeg;

  return (
    <main style={{ padding: 24, maxWidth: 640, margin: '0 auto', textAlign: 'center' }}>
      <h1>{es.descanso.titulo}</h1>
      <p>{es.descanso.texto}</p>
      <p className="numero" style={{ fontSize: 56 }} aria-live="polite">
        {es.descanso.segundos(restantes)}
      </p>
      <button className="pixelado" onClick={alTerminar} disabled={!puedeSaltar}>
        {es.descanso.saltar}
      </button>
    </main>
  );
}
