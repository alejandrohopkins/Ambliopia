/** Resumen: minutos por modo, calendario de las últimas semanas y constancia. */
import { es } from '../../i18n/es';
import { useEstado } from '../../storage/contexto';
import { calendario, minutosDelRango } from '../../storage/analisis';
import { constanciaReal } from '../../engine/racha';
import { diasConMetaCumplida } from '../../storage/selectores';
import { diasEntre, lunesDeLaSemana, sumarDias } from '../../engine/fechas';
import { rachaVigente } from '../../engine/racha';
import { hoyDelJuego } from '../reloj';
import { Calendario } from './Calendario';

const SEMANAS_DEL_CALENDARIO = 8;

export function Resumen() {
  const { estado } = useEstado();
  const hoy = hoyDelJuego();
  const inicioSemana = lunesDeLaSemana(hoy);
  const inicioMes = `${hoy.slice(0, 7)}-01`;
  const desde = sumarDias(lunesDeLaSemana(hoy), -7 * (SEMANAS_DEL_CALENDARIO - 1));

  const deHoy = minutosDelRango(estado, hoy, hoy);
  const deLaSemana = minutosDelRango(estado, inicioSemana, hoy);
  const delMes = minutosDelRango(estado, inicioMes, hoy);

  const cumplidos = diasConMetaCumplida(estado);
  const dias = diasEntre(desde, hoy) + 1;

  return (
    <section>
      <div
        style={{
          display: 'grid',
          gap: 12,
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          marginBottom: 20,
        }}
      >
        <Tarjeta titulo={es.adultos.minutosHoy} total={deHoy.total} detalle={deHoy} />
        <Tarjeta titulo={es.adultos.minutosSemana} total={deLaSemana.total} detalle={deLaSemana} />
        <Tarjeta titulo={es.adultos.minutosMes} total={delMes.total} detalle={delMes} />
      </div>

      <div className="panel pixelado" style={{ marginBottom: 20, overflowX: 'auto' }}>
        <h2 style={{ fontSize: 20 }}>{es.adultos.calendario}</h2>
        <Calendario
          dias={calendario(estado, desde, hoy)}
          meta={estado.ajustes.metaDiariaMin}
        />
        <p style={{ color: 'var(--texto-tenue)', fontSize: 15, margin: '10px 0 0' }}>
          {es.adultos.leyendaCalendario}
        </p>
      </div>

      <div
        style={{ display: 'grid', gap: 12, gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}
      >
        <Tarjeta
          titulo={es.adultos.constanciaReal}
          texto={es.adultos.constanciaTexto(constanciaReal(cumplidos, desde, hoy), dias)}
        />
        <Tarjeta titulo={es.adultos.rachaActual} texto={`${rachaVigente(estado.racha, hoy)}`} />
        <Tarjeta titulo={es.adultos.mejorRacha} texto={`${estado.racha.mejor}`} />
      </div>
    </section>
  );
}

function Tarjeta({
  titulo,
  total,
  detalle,
  texto,
}: {
  titulo: string;
  total?: number;
  detalle?: { parche: number; lentes: number };
  texto?: string;
}) {
  return (
    <div className="panel pixelado">
      <h3 style={{ fontSize: 17, margin: 0, color: 'var(--texto-tenue)' }}>{titulo}</h3>
      <p className="numero" style={{ fontSize: 28, margin: '4px 0 0' }}>
        {texto ?? `${Math.round(total ?? 0)} ${es.comun.minutos}`}
      </p>
      {detalle && (
        <p style={{ margin: '4px 0 0', color: 'var(--texto-tenue)', fontSize: 15 }}>
          {es.adultos.porModo(detalle.parche, detalle.lentes)}
        </p>
      )}
    </div>
  );
}
