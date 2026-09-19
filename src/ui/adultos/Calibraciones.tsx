/** Calibraciones de pantalla y lentes, con su fecha y el patrón de verificación. */
import { es } from '../../i18n/es';
import { useEstado } from '../../storage/contexto';
import { lentesCalibrados } from '../../storage/esquema';
import { PatronDeVerificacion } from '../../calibration/PatronDeVerificacion';

export function Calibraciones({
  alCalibrar,
}: {
  alCalibrar: (cual: 'pantalla' | 'lentes') => void;
}) {
  const { estado } = useEstado();
  const { calibracion } = estado;
  const hayLentes = lentesCalibrados(calibracion);

  return (
    <section style={{ display: 'grid', gap: 18 }}>
      <div className="panel pixelado">
        <h2 style={{ fontSize: 20 }}>{es.adultos.calibraciones.pantalla}</h2>
        <p className="numero">
          {calibracion.fechaPantalla
            ? es.adultos.calibraciones.hecha(calibracion.fechaPantalla)
            : es.adultos.calibraciones.nunca}
        </p>
        {calibracion.pxPorMm !== null && (
          <p style={{ color: 'var(--texto-tenue)' }}>
            {es.calibracion.pantalla.medida(calibracion.pxPorMm)}
          </p>
        )}
        <button className="pixelado" onClick={() => alCalibrar('pantalla')}>
          {es.adultos.calibraciones.calibrarPantalla}
        </button>
      </div>

      <div className="panel pixelado">
        <h2 style={{ fontSize: 20 }}>{es.adultos.calibraciones.lentes}</h2>
        <p className="numero">
          {calibracion.lentes.fecha
            ? es.adultos.calibraciones.hecha(calibracion.lentes.fecha)
            : es.adultos.calibraciones.nunca}
        </p>
        {hayLentes && (
          <p style={{ color: 'var(--texto-tenue)' }}>
            {es.adultos.calibraciones.intensidades(
              calibracion.lentes.intensidadMaxRojo,
              calibracion.lentes.intensidadMaxCian,
            )}
          </p>
        )}
        <button className="pixelado" onClick={() => alCalibrar('lentes')}>
          {es.adultos.calibraciones.calibrarLentes}
        </button>
      </div>

      {hayLentes && (
        <div className="panel pixelado">
          <PatronDeVerificacion />
        </div>
      )}
    </section>
  );
}
