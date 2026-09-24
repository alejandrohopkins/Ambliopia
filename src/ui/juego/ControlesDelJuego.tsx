/**
 * Antes de empezar un juego: qué teclas sirven, qué hace cada una y cómo se
 * juega con el dedo. El juego no arranca hasta pulsar «¡A jugar!».
 */
import type { IdJuego } from '../../config';
import { es, type FilaDeTeclas } from '../../i18n/es';
import type { Nivel } from '../../rewards/niveles';
import { useTeclasGemelas } from '../useTeclasGemelas';

export function ControlesDelJuego({
  juego,
  mundo,
  nivel,
  superado,
  alEmpezar,
  alVolver,
}: {
  juego: IdJuego;
  mundo: number;
  nivel: number;
  /** Último nivel superado, que se guarda por juego. */
  superado: Nivel | null;
  alEmpezar: () => void;
  alVolver: () => void;
}) {
  useTeclasGemelas();
  const { teclas, dedo } = es.controles.porJuego[juego];
  const conGemelas = teclas.some((fila) => fila.teclas.includes('Z'));

  return (
    <main style={{ padding: 24, maxWidth: 720, margin: '0 auto' }}>
      <h1 style={{ marginBottom: 4 }}>{es.juegos[juego]}</h1>
      <p style={{ marginBottom: 4 }}>
        {es.base.mundo(mundo)} · {es.mundos[juego][mundo - 1]} · {es.controles.nivel(nivel)}
      </p>
      <p style={{ color: 'var(--texto-tenue)' }}>
        {superado && `${es.controles.superado(superado.mundo, superado.nivel)} `}
        {es.controles.paraSubir}
      </p>

      <section className="panel pixelado" style={{ marginBottom: 18 }}>
        <h2>{es.controles.titulo}</h2>
        <h3 style={{ fontSize: 20 }}>{es.controles.conTeclado}</h3>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'auto 1fr',
            gap: '10px 16px',
            alignItems: 'center',
            marginBottom: 12,
          }}
        >
          {[...teclas, es.controles.pausa].map((fila) => (
            <Fila key={fila.accion} fila={fila} />
          ))}
        </div>
        {conGemelas && <p style={{ color: 'var(--texto-tenue)' }}>{es.controles.gemelas}</p>}
        <h3 style={{ fontSize: 20 }}>{es.controles.conElDedo}</h3>
        <p style={{ marginBottom: 0 }}>{dedo}</p>
      </section>

      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        <button className="pixelado" onClick={alEmpezar} autoFocus>
          {es.controles.empezar}
        </button>
        <button className="pixelado secundario" onClick={alVolver}>
          {es.comun.volverALaBase}
        </button>
      </div>
      <p style={{ color: 'var(--texto-tenue)', marginTop: 12 }}>{es.controles.atajo}</p>
    </main>
  );
}

function Fila({ fila }: { fila: FilaDeTeclas }) {
  return (
    <>
      <span style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {fila.teclas.map((tecla) => (
          <kbd
            key={tecla}
            className="numero"
            style={{
              display: 'inline-block',
              minWidth: 36,
              margin: 0,
              padding: '2px 10px',
              textAlign: 'center',
              background: 'var(--superficie-alta)',
              border: '2px solid var(--borde)',
              borderBottomWidth: 4,
            }}
          >
            {tecla}
          </kbd>
        ))}
      </span>
      <span>{fila.accion}</span>
    </>
  );
}
