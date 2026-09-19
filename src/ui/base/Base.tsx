/**
 * Base de la jugadora: avatar, palanca de modo, misión del día, meta de hoy,
 * los cuatro portales y los accesos. Es la pantalla de inicio.
 */
import type { IdJuego, Modo } from '../../config';
import { es } from '../../i18n/es';
import { useEstado } from '../../storage/contexto';
import { lentesCalibrados } from '../../storage/esquema';
import { minutosDelDia, modosDisponibles } from '../../storage/selectores';
import { rachaVigente } from '../../engine/racha';
import { diaISO } from '../../engine/fechas';
import { Portal } from './Portal';
import { Contadores } from './Contadores';
import type { Pantalla } from '../navegacion';

const PORTALES: IdJuego[] = ['minero', 'saboteador', 'torre', 'meteoritos'];

export function Base({
  modo,
  alCambiarModo,
  alIr,
  alEmpezar,
}: {
  modo: Modo;
  alCambiarModo: (modo: Modo) => void;
  alIr: (pantalla: Pantalla) => void;
  alEmpezar: (juego?: IdJuego) => void;
}) {
  const { estado } = useEstado();
  const dia = diaISO();
  const minutos = minutosDelDia(estado, dia);
  const meta = estado.ajustes.metaDiariaMin;
  const disponibles = modosDisponibles(estado);
  const hayLentes = lentesCalibrados(estado.calibracion);
  const palancaBloqueada = estado.ajustes.modoFijo !== null;

  function razonDeBloqueo(m: Modo): string | null {
    if (m === 'lentes' && !hayLentes) return es.modos.bloqueado;
    if (palancaBloqueada && estado.ajustes.modoFijo !== m) return es.modos.fijo;
    if (!disponibles.includes(m)) return es.modos.bloqueado;
    return null;
  }

  return (
    <main style={{ padding: 20, maxWidth: 1100, margin: '0 auto' }}>
      <header
        style={{
          display: 'flex',
          gap: 20,
          alignItems: 'flex-start',
          flexWrap: 'wrap',
          marginBottom: 18,
        }}
      >
        <div style={{ flex: '1 1 260px' }}>
          <h1 style={{ marginBottom: 4 }}>{es.base.saludoCorto(estado.perfil.nombre)}</h1>
          <Contadores
            monedas={estado.economia.monedas}
            cristales={estado.economia.cristales}
            racha={rachaVigente(estado.racha, dia)}
          />
        </div>

        <div role="group" aria-label={es.modos.parche + ' / ' + es.modos.lentes}>
          {(['parche', 'lentes'] as Modo[]).map((m) => {
            const razon = razonDeBloqueo(m);
            return (
              <button
                key={m}
                className={modo === m ? 'pixelado' : 'pixelado secundario'}
                aria-pressed={modo === m}
                disabled={razon !== null}
                title={razon ?? undefined}
                onClick={() => alCambiarModo(m)}
                style={{ marginLeft: 8 }}
              >
                {m === 'parche' ? es.modos.parche : es.modos.lentes}
              </button>
            );
          })}
          {razonDeBloqueo(modo === 'parche' ? 'lentes' : 'parche') && (
            <p style={{ color: 'var(--texto-tenue)', margin: '8px 0 0', fontSize: 15 }}>
              {razonDeBloqueo(modo === 'parche' ? 'lentes' : 'parche')}
            </p>
          )}
        </div>
      </header>

      <section className="panel pixelado" style={{ marginBottom: 18 }}>
        <h2 style={{ marginBottom: 8 }}>{es.base.etiquetaMetaDeHoy}</h2>
        <div
          aria-label={es.base.metaDeHoy(minutos, meta)}
          style={{ background: '#140e38', border: '3px solid var(--borde)', height: 22 }}
        >
          <div
            style={{
              width: `${Math.min(100, (minutos / Math.max(1, meta)) * 100)}%`,
              height: '100%',
              background: 'var(--musgo-pixel)',
            }}
          />
        </div>
        <p className="numero" style={{ margin: '8px 0 0' }}>
          {es.base.metaDeHoy(minutos, meta)}
        </p>
      </section>

      <section
        style={{
          display: 'grid',
          gap: 14,
          gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
          marginBottom: 18,
        }}
      >
        {PORTALES.map((juego) => (
          <Portal key={juego} juego={juego} alEntrar={() => alEmpezar(juego)} />
        ))}
      </section>

      <p>
        <button className="pixelado" onClick={() => alEmpezar()}>
          {es.base.empezarMision}
        </button>
      </p>

      <nav style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
        <button className="pixelado secundario" onClick={() => alIr('tienda')}>
          {es.base.tienda}
        </button>
        <button className="pixelado secundario" onClick={() => alIr('avatar')}>
          {es.base.miAvatar}
        </button>
        <button className="pixelado secundario" onClick={() => alIr('insignias')}>
          {es.base.insignias}
        </button>
        <button className="pixelado secundario" onClick={() => alIr('galeria')}>
          {es.base.galeria}
        </button>
        <button className="pixelado secundario" onClick={() => alIr('records')}>
          {es.base.misRecords}
        </button>
        <button
          className="pixelado secundario"
          onClick={() => alIr('adultos')}
          aria-label={es.base.panelDeAdultos}
          title={es.base.panelDeAdultos}
          style={{ marginLeft: 'auto', padding: '0 14px' }}
        >
          <CandadoPixel />
        </button>
      </nav>
    </main>
  );
}

/** Candado discreto dibujado por código: nada de iconos de terceros. */
function CandadoPixel() {
  return (
    <svg width="20" height="24" viewBox="0 0 10 12" aria-hidden shapeRendering="crispEdges">
      <path d="M3 0h4v1H3zM2 1h1v3H2zM7 1h1v3H7z" fill="currentColor" />
      <path d="M1 4h8v8H1z" fill="currentColor" />
      <path d="M4 7h2v3H4z" fill="var(--superficie-alta)" />
    </svg>
  );
}
