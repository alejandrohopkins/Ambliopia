/** Elegir minijuego tras el chequeo previo, cuando no se entró por un portal. */
import type { IdJuego } from '../../config';
import { es } from '../../i18n/es';
import { JUEGOS } from '../../storage/esquema';
import { minijuego } from '../../games/registro';

export function ElegirJuego({
  alElegir,
  alVolver,
}: {
  alElegir: (juego: IdJuego) => void;
  alVolver: () => void;
}) {
  return (
    <main style={{ padding: 24, maxWidth: 720, margin: '0 auto' }}>
      <h1>{es.elegirJuego.titulo}</h1>
      <div style={{ display: 'grid', gap: 12, marginBottom: 18 }}>
        {JUEGOS.map((juego) => (
          <button
            key={juego}
            className="pixelado"
            onClick={() => alElegir(juego)}
            disabled={!minijuego(juego)}
          >
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
