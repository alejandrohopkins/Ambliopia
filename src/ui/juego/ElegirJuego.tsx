/**
 * Elegir minijuego tras el chequeo previo, cuando no se entró por un portal.
 * Solo se ofrecen los que sirven para el modo de hoy; los que descansan por
 * la rotación semanal se ven, pero no se pueden elegir.
 */
import type { IdJuego, Modo } from '../../config';
import { es } from '../../i18n/es';
import { juegosDelModo } from '../../games/registro';
import { intentosDeLaSemana, juegosBloqueados } from '../../rewards/rotacion';
import { useEstado } from '../../storage/contexto';
import { hoyDelJuego } from '../reloj';

export function ElegirJuego({
  modo,
  alElegir,
  alVolver,
}: {
  modo: Modo;
  alElegir: (juego: IdJuego) => void;
  alVolver: () => void;
}) {
  const { estado } = useEstado();
  const dia = hoyDelJuego();
  const juegos = juegosDelModo(modo);
  const intentos = intentosDeLaSemana(estado, dia);
  const bloqueados = juegosBloqueados(estado, dia, juegos);

  return (
    <main style={{ padding: 24, maxWidth: 720, margin: '0 auto' }}>
      <h1>{es.elegirJuego.titulo}</h1>
      <p style={{ color: 'var(--texto-tenue)' }}>{es.rotacion.explicacion}</p>
      <div style={{ display: 'grid', gap: 12, marginBottom: 18 }}>
        {juegos.map((juego) => (
          <button
            key={juego}
            className="pixelado"
            disabled={bloqueados.includes(juego)}
            onClick={() => alElegir(juego)}
            style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}
          >
            <span>{es.juegos[juego]}</span>
            <span className="numero" style={{ margin: 0 }}>
              {es.rotacion.intentos(intentos[juego] ?? 0)}
            </span>
          </button>
        ))}
      </div>
      <button className="pixelado secundario" onClick={alVolver}>
        {es.comun.volverALaBase}
      </button>
    </main>
  );
}
