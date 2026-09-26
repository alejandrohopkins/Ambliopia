/**
 * Fin de nivel: estrellas, precisión, monedas, récord si lo hubo y qué toca
 * ahora. Con la precisión pedida se sube de nivel; si no, se vuelve a
 * intentar el mismo, sin perder nada de lo ganado.
 */
import { config, type IdJuego } from '../../config';
import { es } from '../../i18n/es';
import { AvatarCompuesto } from '../componentes/AvatarCompuesto';
import { useEffect } from 'react';
import { audio } from '../../engine/audio';
import { useTeclasGemelas } from '../useTeclasGemelas';
import { conAnimacion, useCuenta, useSalto } from '../animacion';
import type { FinDeNivelDatos } from './PantallaDeJuego';

/** Retraso de cada sello (100 %, récord, mundo nuevo), uno tras otro. */
function retrasoDeSello(orden: number): number {
  return config.animacion.sellosDesdeMs + orden * config.animacion.entreSellosMs;
}

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
  const { resumen, monedas, huboRecord, superado, siguiente, mundoNuevo, perfecto } = datos;
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

  // Las estrellas salen al compás de la fanfarria del nivel; las monedas
  // cuentan con el tintineo, que llega justo después; al final, los sellos.
  const { monedasDesdeMs, estrellasMs, selloMs, saltoDesdeMs } = config.animacion;
  useEffect(() => {
    const id = setTimeout(() => audio().reproducir('monedas'), monedasDesdeMs);
    return () => clearTimeout(id);
  }, [monedasDesdeMs]);
  const monedasContadas = Math.round(useCuenta(0, monedas, monedasDesdeMs));
  const avatar = useSalto<HTMLDivElement>(superado, saltoDesdeMs);
  const sellos: string[] = [];
  if (perfecto) sellos.push(es.finDeNivel.perfecto);
  if (huboRecord) sellos.push(es.finDeNivel.nuevoRecord);

  return (
    <main style={{ padding: 24, maxWidth: 620, margin: '0 auto', textAlign: 'center' }}>
      <div ref={avatar}>
        <AvatarCompuesto alto={150} conMascota vivo />
      </div>
      <p style={{ color: 'var(--texto-tenue)', margin: '6px auto 0' }}>{es.juegos[juego]}</p>
      <h1>{titulo}</h1>

      <p
        className="numero"
        style={{ fontSize: 40, margin: '4px 0' }}
        aria-label={es.finDeNivel.estrellas(resumen.estrellas)}
      >
        {[0, 1, 2].map((i) =>
          i < resumen.estrellas ? (
            <span
              key={i}
              aria-hidden
              className="sello"
              style={{ ...conAnimacion(selloMs, estrellasMs[i]), display: 'inline-block' }}
            >
              ★
            </span>
          ) : (
            <span key={i} aria-hidden style={{ color: 'var(--borde)' }}>
              ★
            </span>
          ),
        )}
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

      <p className="numero" style={{ fontSize: 22 }} aria-label={es.finDeNivel.monedasGanadas(monedas)}>
        {es.finDeNivel.monedasGanadas(monedasContadas)}
      </p>

      {sellos.map((texto, i) => (
        <p key={texto} role="status" className="sello" style={conAnimacion(selloMs, retrasoDeSello(i))}>
          {texto}
        </p>
      ))}
      {mundoNuevo && (
        <p
          role="status"
          className="panel pixelado sello"
          style={{
            ...conAnimacion(selloMs, retrasoDeSello(sellos.length)),
            display: 'inline-block',
            borderColor: 'var(--ambar-estelar)',
            fontFamily: 'var(--fuente-titulos)',
            fontSize: 22,
          }}
        >
          {es.finDeNivel.mundoDesbloqueado(mundoNuevo)}
        </p>
      )}

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
