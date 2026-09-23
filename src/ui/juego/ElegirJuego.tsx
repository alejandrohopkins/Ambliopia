/**
 * Elegir minijuego tras el chequeo previo, cuando no se entró por un portal.
 * Solo se ofrecen los que sirven para el modo de hoy.
 */
import type { IdJuego, Modo } from '../../config';
import { es } from '../../i18n/es';
import { juegosDelModo } from '../../games/registro';

export function ElegirJuego({
  modo,
  alElegir,
  alVolver,
}: {
  modo: Modo;
  alElegir: (juego: IdJuego) => void;
  alVolver: () => void;
}) {
  return (
    <main style={{ padding: 24, maxWidth: 720, margin: '0 auto' }}>
      <h1>{es.elegirJuego.titulo}</h1>
      <div style={{ display: 'grid', gap: 12, marginBottom: 18 }}>
        {juegosDelModo(modo).map((juego) => (
          <button key={juego} className="pixelado" onClick={() => alElegir(juego)}>
            {es.juegos[juego]}
          </button>
        ))}
      </div>
      <button className="pixelado secundario" onClick={alVolver}>
        {es.comun.volverALaBase}
      </button>
    </main>
  );
}
