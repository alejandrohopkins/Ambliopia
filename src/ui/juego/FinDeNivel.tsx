/** Fin de nivel: estrellas, monedas, récord si lo hubo y qué hacer ahora. */
import type { IdJuego } from '../../config';
import { es } from '../../i18n/es';
import type { ResumenDeNivel } from '../../games/tipos';
import { Pixelnauta } from '../../avatar/Pixelnauta';
import { PIXELNAUTA } from '../../avatar/sprites';
import { useEffect } from 'react';
import { audio } from '../../engine/audio';

export function FinDeNivel({
  juego,
  resumen,
  monedas,
  huboRecord,
  mundoDesbloqueado,
  hayNivelSiguiente,
  alSiguiente,
  alRepetir,
  alVolver,
}: {
  juego: IdJuego;
  resumen: ResumenDeNivel;
  monedas: number;
  huboRecord: boolean;
  mundoDesbloqueado: string | null;
  hayNivelSiguiente: boolean;
  alSiguiente: () => void;
  alRepetir: () => void;
  alVolver: () => void;
}) {
  // El tintineo de monedas llega justo después de la fanfarria del nivel.
  useEffect(() => {
    const id = setTimeout(() => audio().reproducir('monedas'), 450);
    return () => clearTimeout(id);
  }, []);

  return (
    <main style={{ padding: 24, maxWidth: 620, margin: '0 auto', textAlign: 'center' }}>
      <Pixelnauta mapa={PIXELNAUTA} escala={8} etiqueta={es.juegos[juego]} />
      <h1>{es.finDeNivel.titulo}</h1>

      <p
        className="numero"
        style={{ fontSize: 40, margin: '4px 0' }}
        aria-label={es.finDeNivel.estrellas(resumen.estrellas)}
      >
        {'★'.repeat(resumen.estrellas)}
        <span style={{ color: 'var(--borde)' }}>{'★'.repeat(3 - resumen.estrellas)}</span>
      </p>
      <p>{es.finDeNivel.precision(resumen.precision * 100)}</p>
      <p className="numero" style={{ fontSize: 22 }}>
        {es.finDeNivel.monedasGanadas(monedas)}
      </p>

      {huboRecord && <p role="status">{es.finDeNivel.nuevoRecord}</p>}
      {mundoDesbloqueado && (
        <p role="status">{es.finDeNivel.mundoDesbloqueado(mundoDesbloqueado)}</p>
      )}

      <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
        {hayNivelSiguiente && (
          <button className="pixelado" onClick={alSiguiente}>
            {es.finDeNivel.siguienteNivel}
          </button>
        )}
        <button className="pixelado secundario" onClick={alRepetir}>
          {es.finDeNivel.repetir}
        </button>
        <button className="pixelado secundario" onClick={alVolver}>
          {es.comun.volverALaBase}
        </button>
      </div>
    </main>
  );
}
