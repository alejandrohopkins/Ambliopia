/**
 * Mis récords: lo más pequeño que ha logrado encontrar en cada juego,
 * con una comparación divertida. Las medidas son estimaciones del juego.
 */
import { config, type IdJuego, type Modo } from '../config';
import { es } from '../i18n/es';
import { useEstado } from '../storage/contexto';
import { JUEGOS } from '../storage/esquema';
import { comparacionDeRecord } from '../rewards/economia';
import { mmAArcmin, pxAMm } from '../engine/color';

const MODOS: Modo[] = ['parche', 'lentes'];

export function MisRecords({ alVolver }: { alVolver: () => void }) {
  const { estado } = useEstado();
  const { pxPorMm } = estado.calibracion;
  const calibrado = pxPorMm !== null;
  const escala = pxPorMm ?? config.calibracionPantalla.pxPorMmPorDefecto;

  const filas = JUEGOS.flatMap((juego) =>
    MODOS.map((modo) => ({ juego, modo, record: estado.records[`${juego}:${modo}`] })),
  ).filter((fila) => fila.record !== undefined);

  return (
    <main style={{ padding: 24, maxWidth: 820, margin: '0 auto' }}>
      <h1>{es.records.titulo}</h1>
      <p>{es.records.masPequeno}</p>
      {!calibrado && <p style={{ color: 'var(--texto-tenue)' }}>{es.records.sinCalibrar}</p>}

      {filas.length === 0 && <p>{es.records.vacio}</p>}

      <ul style={{ listStyle: 'none', padding: 0, display: 'grid', gap: 12, marginBottom: 20 }}>
        {filas.map(({ juego, modo, record }) => {
          const mm = record!.mejorMm ?? pxAMm(record!.mejorPx, escala);
          const arcmin = mmAArcmin(mm, estado.ajustes.distanciaCm * 10);
          const clave = comparacionDeRecord(mm);
          return (
            <li key={`${juego}:${modo}`} className="panel pixelado">
              <strong style={{ fontFamily: 'var(--fuente-titulos)' }}>
                {es.juegos[juego as IdJuego]} · {es.nombreDeModo(modo)}
              </strong>
              <p className="numero" style={{ fontSize: 22, margin: '6px 0' }}>
                {es.records.enMm(mm)}
              </p>
              <p style={{ margin: 0, color: 'var(--texto-tenue)', fontSize: 15 }}>
                {es.records.enPx(record!.mejorPx)} · {es.records.enArcmin(arcmin)}
              </p>
              {clave && <p style={{ margin: '8px 0 0' }}>{es.comparacionesDeRecord[clave]}</p>}
            </li>
          );
        })}
      </ul>

      <button className="pixelado" onClick={alVolver}>
        {es.comun.volverALaBase}
      </button>
    </main>
  );
}
