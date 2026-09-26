/**
 * Base de la jugadora: avatar, palanca de modo, misión del día, meta de hoy,
 * los portales de los minijuegos y los accesos. Es la pantalla de inicio.
 */
import type { IdJuego, Modo } from '../../config';
import { avisoDeRotacion, rotacionDeLaSemana } from '../../rewards/rotacion';
import { es } from '../../i18n/es';
import { useEstado } from '../../storage/contexto';
import { lentesCalibrados } from '../../storage/esquema';
import { minutosDelDia, modosDisponibles } from '../../storage/selectores';
import { rachaVigente } from '../../engine/racha';
import { hoyDelJuego } from '../reloj';
import { useEffect, useRef, useState } from 'react';
import { Portal } from './Portal';
import { juegosDelModo } from '../../games/registro';
import { useMovimientoReducido } from '../movimiento';
import { Contadores } from './Contadores';
import { AvatarCompuesto } from '../componentes/AvatarCompuesto';
import { Paisaje } from '../../avatar/vector/Fondos';
import { MisionDelDia } from './MisionDelDia';
import { BotonDePremio } from '../componentes/PremioDePantalla';
import { ProgresoDePremioSemanal } from '../componentes/PremioSemanal';
import type { Pantalla } from '../navegacion';
import { useValorAnimado } from '../animacion';


/** El aterrizaje es una sola vez por apertura de la app, no cada visita. */
let yaAterrizo = false;

function usarSoloLaPrimeraVez(): boolean {
  const [primera] = useState(() => !yaAterrizo);
  const marcado = useRef(false);
  useEffect(() => {
    if (!marcado.current) {
      marcado.current = true;
      yaAterrizo = true;
    }
  }, []);
  return primera;
}

/**
 * El avatar grande sobre su paisaje: el elemento memorable de la base.
 * Aterriza una sola vez al abrir la app; después solo respira.
 * Todo lo demás de la pantalla es sobrio a propósito.
 */
function Plataforma({ aterrizar, fondo }: { aterrizar: boolean; fondo: string | undefined }) {
  return (
    <div
      className="pixelado"
      style={{ position: 'relative', overflow: 'hidden', padding: '14px 26px 8px', textAlign: 'center' }}
    >
      {/* El paisaje comprado, detrás del avatar. */}
      <Paisaje id={fondo} />
      <div style={{ position: 'relative' }}>
        <AvatarCompuesto alto={210} conMascota respira vivo aterriza={aterrizar} />
      </div>
    </div>
  );
}

/** Minutos de hoy contra la meta: al volver de jugar, la barra sube desde lo último visto. */
function MetaDeHoy({ dia, minutos, meta }: { dia: string; minutos: number; meta: number }) {
  const hechos = Math.round(useValorAnimado(minutos, `meta:${dia}`).valor);
  return (
    <section className="panel pixelado" style={{ marginBottom: 18 }}>
      <h2 style={{ marginBottom: 8 }}>{es.base.etiquetaMetaDeHoy}</h2>
      <div
        aria-label={es.base.metaDeHoy(minutos, meta)}
        style={{ background: '#140e38', border: '3px solid var(--borde)', height: 22 }}
      >
        <div
          style={{
            width: `${Math.min(100, (hechos / Math.max(1, meta)) * 100)}%`,
            height: '100%',
            background: 'var(--musgo-pixel)',
          }}
        />
      </div>
      <p className="numero" style={{ margin: '8px 0 0' }}>
        {es.base.metaDeHoy(hechos, meta)}
      </p>
    </section>
  );
}

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
  const sinMovimiento = useMovimientoReducido();
  const primeraVez = usarSoloLaPrimeraVez();
  const dia = hoyDelJuego();
  const minutos = Math.floor(minutosDelDia(estado, dia));
  const meta = estado.ajustes.metaDiariaMin;
  const disponibles = modosDisponibles(estado);
  const hayLentes = lentesCalibrados(estado.calibracion);
  const palancaBloqueada = estado.ajustes.modoFijo !== null;
  const juegos = juegosDelModo(modo);
  const rotacion = rotacionDeLaSemana(estado, dia, juegos);
  const { intentos, bloqueados } = rotacion;

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
        <Plataforma
          aterrizar={!sinMovimiento && primeraVez}
          fondo={estado.economia.equipado.fondos}
        />

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

      <MisionDelDia dia={dia} />

      <MetaDeHoy dia={dia} minutos={minutos} meta={meta} />

      <ProgresoDePremioSemanal modo={modo} />

      <p style={{ color: 'var(--texto-tenue)' }}>
        {es.rotacion.aviso(avisoDeRotacion(rotacion), rotacion.pendientes.length)}
      </p>
      <section
        style={{
          display: 'grid',
          gap: 14,
          gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
          marginBottom: 18,
        }}
      >
        {juegos.map((juego) => (
          <Portal
            key={juego}
            juego={juego}
            intentos={intentos[juego] ?? 0}
            bloqueado={bloqueados.includes(juego)}
            alEntrar={() => alEmpezar(juego)}
          />
        ))}
      </section>

      <p style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        <button className="pixelado" onClick={() => alEmpezar()}>
          {es.base.empezarMision}
        </button>
        <BotonDePremio />
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
