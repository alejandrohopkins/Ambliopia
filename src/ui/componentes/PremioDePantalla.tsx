/**
 * Premio de tiempo de pantalla. Al cumplir la meta de minutos del día con la
 * precisión pedida, una felicitación con los datos del día para que la
 * jugadora haga una captura y reclame sus minutos extra. Sale sola una vez al
 * día, siempre fuera del juego (ver AvisosDePremio); después se puede volver a
 * abrir desde la base.
 */
import { useState } from 'react';
import { es } from '../../i18n/es';
import { useEstado } from '../../storage/contexto';
import { minutosDelDia, precisionDelDia, premioDePantallaGanado } from '../../storage/selectores';
import { hoyDelJuego } from '../reloj';
import { AvatarCompuesto } from './AvatarCompuesto';

export function TarjetaDePremio({ alCerrar }: { alCerrar: () => void }) {
  const { estado } = useEstado();
  const dia = hoyDelJuego();
  const minutos = Math.floor(minutosDelDia(estado, dia));
  const precision = Math.round((precisionDelDia(estado, dia) ?? 0) * 100);

  return (
    <div
      role="dialog"
      aria-modal
      aria-label={es.premioDePantalla.titulo(estado.perfil.nombre)}
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
        style={{
          maxWidth: 520,
          textAlign: 'center',
          borderColor: 'var(--ambar-estelar)',
          borderWidth: 6,
        }}
      >
        <AvatarCompuesto alto={170} conMascota />
        <h1 style={{ color: 'var(--ambar-estelar)' }}>
          {es.premioDePantalla.titulo(estado.perfil.nombre)}
        </h1>
        <p style={{ fontSize: 22 }}>{es.premioDePantalla.logro(minutos, precision)}</p>
        <p style={{ fontSize: 22 }}>{es.premioDePantalla.captura}</p>
        <p className="numero" style={{ color: 'var(--texto-tenue)' }}>
          {es.premioDePantalla.fecha(dia)}
        </p>
        <button className="pixelado" onClick={alCerrar} autoFocus>
          {es.premioDePantalla.listo}
        </button>
      </div>
    </div>
  );
}

/** Botón de la base para volver a ver el premio del día, por si falta la captura. */
export function BotonDePremio() {
  const { estado } = useEstado();
  const [abierto, setAbierto] = useState(false);
  if (!premioDePantallaGanado(estado, hoyDelJuego())) return null;
  return (
    <>
      <button className="pixelado" onClick={() => setAbierto(true)}>
        {es.premioDePantalla.verPremio}
      </button>
      {abierto && <TarjetaDePremio alCerrar={() => setAbierto(false)} />}
    </>
  );
}
