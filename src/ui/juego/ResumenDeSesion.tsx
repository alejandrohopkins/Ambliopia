/** Resumen al volver a la base: minutos, monedas, estrellas y récords. */
import { es } from '../../i18n/es';

export interface DatosDeResumen {
  minutos: number;
  monedas: number;
  estrellas: number;
  records: number;
}

export function ResumenDeSesion({
  datos,
  alVolver,
}: {
  datos: DatosDeResumen;
  alVolver: () => void;
}) {
  const filas = [
    [es.sesion.resumen.minutos, Math.round(datos.minutos)],
    [es.sesion.resumen.monedas, datos.monedas],
    [es.sesion.resumen.estrellas, datos.estrellas],
    [es.sesion.resumen.records, datos.records],
  ] as const;

  return (
    <main style={{ padding: 24, maxWidth: 520, margin: '0 auto' }}>
      <h1>{es.sesion.resumen.titulo}</h1>
      <ul className="panel pixelado" style={{ listStyle: 'none', padding: 18, margin: '0 0 18px' }}>
        {filas.map(([etiqueta, valor]) => (
          <li
            key={etiqueta}
            style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0' }}
          >
            <span>{etiqueta}</span>
            <span className="numero">{valor}</span>
          </li>
        ))}
      </ul>
      <button className="pixelado" onClick={alVolver}>
        {es.comun.volverALaBase}
      </button>
    </main>
  );
}
