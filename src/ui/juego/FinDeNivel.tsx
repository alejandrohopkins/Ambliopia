/**
 * Fin de nivel: estrellas, precisión, monedas, récord si lo hubo y qué toca
 * ahora. Con la precisión pedida se sube de nivel; si no, se vuelve a
 * intentar el mismo, sin perder nada de lo ganado.
 */
import type { IdJuego } from '../../config';
import { es } from '../../i18n/es';
import { Pixelnauta } from '../../avatar/Pixelnauta';
import { PIXELNAUTA } from '../../avatar/sprites';
import { useEffect } from 'react';
import { audio } from '../../engine/audio';
import { useTeclasGemelas } from '../useTeclasGemelas';
import type { FinDeNivelDatos } from './PantallaDeJuego';

export function FinDeNivel({
  juego,
  datos,
  descansa,
  alSeguir,
  alElegirOtro,
  alVolver,
}: {
  juego: IdJuego;
  datos: FinDeNivelDatos;
  /** Con este nivel completó sus intentos de la semana: toca otro juego. */
  descansa: boolean;
  alElegirOtro: () => void;
  /** Jugar el nivel que toca: el siguiente si se superó, el mismo si no. */
  alSeguir: () => void;
  alVolver: () => void;
}) {
  useTeclasGemelas();
  const { resumen, monedas, huboRecord, superado, siguiente, mundoNuevo } = datos;
  // En la Torre, una figura a medias no deja subir: cada nivel es una figura
  // de la galería y saltársela la dejaría fuera para siempre.
  const aMedias = resumen.objetivo !== undefined && !resumen.objetivo.cumplido;

  let titulo: string = es.finDeNivel.titulo;
  let boton: string = es.finDeNivel.intentarOtraVez;
  if (superado) {
    titulo = es.finDeNivel.superado;
    boton = siguiente ? es.finDeNivel.siguienteNivel : es.finDeNivel.seguir;
  } else if (aMedias) {
    titulo = es.finDeNivel.tituloAMedias;
    boton = es.finDeNivel.intentarla;
  }

  // El tintineo de monedas llega justo después de la fanfarria del nivel.
  useEffect(() => {
    const id = setTimeout(() => audio().reproducir('monedas'), 450);
    return () => clearTimeout(id);
  }, []);

  return (
    <main style={{ padding: 24, maxWidth: 620, margin: '0 auto', textAlign: 'center' }}>
      <Pixelnauta mapa={PIXELNAUTA} escala={8} etiqueta={es.juegos[juego]} />
      <h1>{titulo}</h1>

      <p
        className="numero"
        style={{ fontSize: 40, margin: '4px 0' }}
        aria-label={es.finDeNivel.estrellas(resumen.estrellas)}
      >
        {'★'.repeat(resumen.estrellas)}
        <span style={{ color: 'var(--borde)' }}>{'★'.repeat(3 - resumen.estrellas)}</span>
      </p>
      {resumen.objetivo && (
        <p>{es.finDeNivel.objetivo(resumen.objetivo.hecho, resumen.objetivo.total)}</p>
      )}
      <p>{es.finDeNivel.precision(resumen.precision * 100)}</p>

      {superado && siguiente && (
        <p role="status">{es.finDeNivel.proximo(siguiente.mundo, siguiente.nivel)}</p>
      )}
      {superado && !siguiente && <p role="status">{es.finDeNivel.ultimoNivel}</p>}
      {!superado && aMedias && (
        <p style={{ color: 'var(--texto-tenue)' }}>{es.finDeNivel.figuraAMedias}</p>
      )}
      {!superado && !aMedias && (
        <p style={{ color: 'var(--texto-tenue)' }}>{es.finDeNivel.paraSubir}</p>
      )}

      <p className="numero" style={{ fontSize: 22 }}>
        {es.finDeNivel.monedasGanadas(monedas)}
      </p>

      {huboRecord && <p role="status">{es.finDeNivel.nuevoRecord}</p>}
      {mundoNuevo && <p role="status">{es.finDeNivel.mundoDesbloqueado(mundoNuevo)}</p>}

      {descansa && <p role="status">{es.rotacion.completado}</p>}

      <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
        {descansa ? (
          <button className="pixelado" onClick={alElegirOtro} autoFocus>
            {es.rotacion.elegirOtro}
          </button>
        ) : (
          <button className="pixelado" onClick={alSeguir} autoFocus>
            {boton}
          </button>
        )}
        <button className="pixelado secundario" onClick={alVolver}>
          {es.comun.volverALaBase}
        </button>
      </div>
    </main>
  );
}
