/**
 * Premio de la semana: la bolsa de platanitos. Una felicitación para hacer la
 * captura y reclamarla, que sale sola una vez por semana y siempre fuera del
 * juego; en la base, lo que falta para ganarla y el botón para volver a verla.
 */
import { useState } from 'react';
import type { Modo } from '../../config';
import { diasDeLaSemana } from '../../engine/fechas';
import { es } from '../../i18n/es';
import { premioDeLaSemana } from '../../rewards/premioSemanal';
import { useEstado } from '../../storage/contexto';
import { premioDePantallaGanado } from '../../storage/selectores';
import { hoyDelJuego } from '../reloj';
import { BolsaDePlatanitos } from './BolsaDePlatanitos';
import { TarjetaDePremio } from './PremioDePantalla';

export function TarjetaDePremioSemanal({ modo, alCerrar }: { modo: Modo; alCerrar: () => void }) {
  const { estado } = useEstado();
  const dia = hoyDelJuego();
  const premio = premioDeLaSemana(estado, dia, modo);
  const semana = diasDeLaSemana(dia);

  return (
    <div
      role="dialog"
      aria-modal
      aria-label={es.premioSemanal.titulo}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 10,
        display: 'grid',
        placeItems: 'center',
        padding: 16,
        background: 'rgba(10, 7, 30, 0.92)',
      }}
    >
      <div
        className="panel pixelado"
        style={{ maxWidth: 520, textAlign: 'center', borderColor: 'var(--musgo-pixel)', borderWidth: 6 }}
      >
        <BolsaDePlatanitos escala={9} etiqueta={es.premioSemanal.bolsa} />
        <h1 style={{ color: 'var(--musgo-pixel)' }}>{es.premioSemanal.titulo}</h1>
        <p style={{ fontSize: 22 }}>
          {es.premioSemanal.logro(premio.perfectos.length, premio.juegos.length)}
        </p>
        <p style={{ fontSize: 22 }}>{es.premioSemanal.captura}</p>
        <p className="numero" style={{ color: 'var(--texto-tenue)' }}>
          {es.premioSemanal.semana(semana[0], semana[6])}
        </p>
        <button className="pixelado" onClick={alCerrar} autoFocus>
          {es.premioSemanal.listo}
        </button>
      </div>
    </div>
  );
}

/**
 * Las felicitaciones que salen solas: primero la del día y, al cerrarla, la
 * de la semana. Nunca las dos a la vez.
 */
export function AvisosDePremio({ modo }: { modo: Modo }) {
  const { estado, despachar } = useEstado();
  const dia = hoyDelJuego();
  if (premioDePantallaGanado(estado, dia) && !estado.premiosDePantalla.includes(dia)) {
    return <TarjetaDePremio alCerrar={() => despachar({ tipo: 'premio/visto', dia })} />;
  }
  const premio = premioDeLaSemana(estado, dia, modo);
  if (!premio.ganado || estado.premiosSemanales.includes(premio.semana)) return null;
  return (
    <TarjetaDePremioSemanal
      modo={modo}
      alCerrar={() => despachar({ tipo: 'premioSemanal/visto', semana: premio.semana })}
    />
  );
}

/** En la base: cuántos juegos con 100 % lleva la semana y, si ya ganó, el botón para verlo. */
export function ProgresoDePremioSemanal({ modo }: { modo: Modo }) {
  const { estado } = useEstado();
  const [abierto, setAbierto] = useState(false);
  const premio = premioDeLaSemana(estado, hoyDelJuego(), modo);
  const hechos = Math.min(premio.perfectos.length, premio.meta);

  // La tarjeta va fuera del panel: su recorte de esquinas la taparía.
  return (
    <>
      <section
        className="panel pixelado"
        style={{ display: 'flex', gap: 16, alignItems: 'center', marginBottom: 18 }}
      >
        <BolsaDePlatanitos escala={4} etiqueta={es.premioSemanal.bolsa} />
        <div style={{ flex: 1 }}>
          <h2 style={{ marginBottom: 6 }}>{es.premioSemanal.etiqueta}</h2>
          <p style={{ margin: '0 0 8px' }}>
            {premio.ganado ? es.premioSemanal.ganado : es.premioSemanal.explicacion}
          </p>
          <div
            aria-label={es.premioSemanal.progreso(hechos, premio.meta)}
            style={{ background: '#140e38', border: '3px solid var(--borde)', height: 18 }}
          >
            <div
              style={{
                width: `${(hechos / Math.max(1, premio.meta)) * 100}%`,
                height: '100%',
                background: 'var(--musgo-pixel)',
              }}
            />
          </div>
          <p className="numero" style={{ margin: '6px 0 0' }}>
            {es.premioSemanal.progreso(hechos, premio.meta)}
          </p>
          {premio.ganado && (
            <button className="pixelado" onClick={() => setAbierto(true)} style={{ marginTop: 10 }}>
              {es.premioSemanal.ver}
            </button>
          )}
        </div>
      </section>
      {abierto && <TarjetaDePremioSemanal modo={modo} alCerrar={() => setAbierto(false)} />}
    </>
  );
}
