/**
 * Overlay de desarrollo (?debug=1): valores de cada escalera, fps, colores de
 * capa y un botón para simular el día siguiente y probar racha, cofre y balance.
 * No forma parte del juego: nunca se ve sin el parámetro en la URL.
 */
import type { Modo } from '../../config';
import { es } from '../../i18n/es';
import { useEstado } from '../../storage/contexto';
import { DichopticRenderer } from '../../engine/DichopticRenderer';
import { Staircase } from '../../engine/Staircase';
import type { MotivoDeParada } from '../../engine/SessionTimer';

export interface DatosDeDesarrollo {
  fps: number;
  minutosActivos: number;
  motivoDeParada: MotivoDeParada | null;
  escaleras: Staircase[];
  renderer: DichopticRenderer | null;
  modo: Modo;
}

export function OverlayDeDesarrollo({
  datos,
  alSimularDiaSiguiente,
}: {
  datos: DatosDeDesarrollo;
  alSimularDiaSiguiente: () => void;
}) {
  const { estado } = useEstado();
  const { renderer } = datos;

  return (
    <aside
      style={{
        position: 'fixed',
        top: 8,
        right: 8,
        zIndex: 50,
        maxWidth: 320,
        padding: 10,
        background: 'rgba(10, 7, 30, 0.92)',
        border: '2px solid #493a8f',
        color: '#EDE9FF',
        font: '13px/1.35 ui-monospace, monospace',
      }}
    >
      <strong>{es.depuracion.titulo}</strong>

      <p style={{ margin: '6px 0' }}>
        {datos.fps.toFixed(0)} {es.depuracion.fps} · {datos.minutosActivos.toFixed(2)}{' '}
        {es.depuracion.minutosActivos} ·{' '}
        {datos.motivoDeParada
          ? es.depuracion.motivos[datos.motivoDeParada]
          : es.depuracion.contando}
      </p>

      <p style={{ margin: '6px 0' }}>
        {es.depuracion.balance}: {estado.balance.contrasteOjoDominante.toFixed(2)}
      </p>

      {datos.escaleras.length > 0 && (
        <>
          <strong>{es.depuracion.escaleras}</strong>
          <ul style={{ padding: 0, margin: '4px 0', listStyle: 'none' }}>
            {datos.escaleras.map((e) => (
              <li key={e.clave}>
                {e.clave}: {es.depuracion.valor} {e.current().toFixed(2)} · {es.depuracion.umbral}{' '}
                {e.threshold().toFixed(2)} · {e.inversiones} {es.depuracion.inversiones} ·{' '}
                {e.numeroDeEnsayos} {es.depuracion.ensayos}
              </li>
            ))}
          </ul>
        </>
      )}

      {renderer && (
        <>
          <strong>{es.depuracion.capas}</strong>
          <ul style={{ padding: 0, margin: '4px 0', listStyle: 'none' }}>
            <Muestra etiqueta={es.depuracion.ojoAmbliope} color={renderer.cssDeCapa('ojoAmbliope')} />
            <Muestra
              etiqueta={es.depuracion.ojoDominante}
              color={renderer.cssDeCapa('ojoDominante')}
            />
            <Muestra etiqueta={es.depuracion.ambos} color={renderer.cssDeCapa('ambos')} />
            <Muestra
              etiqueta={es.depuracion.fondo}
              color={datos.modo === 'lentes' ? '#000000' : renderer.paleta.fondo}
            />
          </ul>
        </>
      )}

      <button
        className="pixelado"
        onClick={alSimularDiaSiguiente}
        style={{ minHeight: 34, fontSize: 13, padding: '0 10px', width: '100%' }}
      >
        {es.depuracion.diaSiguiente}
      </button>
    </aside>
  );
}

function Muestra({ etiqueta, color }: { etiqueta: string; color: string }) {
  return (
    <li style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <span
        aria-hidden
        style={{ width: 14, height: 14, background: color, border: '1px solid #493a8f' }}
      />
      {etiqueta}: {color}
    </li>
  );
}
