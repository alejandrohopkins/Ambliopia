/**
 * Reloj del día: cuánto tiempo activo lleva hoy la jugadora, contra la meta.
 * Está siempre a la vista: arriba en las pantallas de la base y sobre el
 * lienzo mientras se juega. Solo cuenta el juego activo, como los minutos.
 */
import { config } from '../../config';
import { aCss, gris } from '../../engine/color';
import { es } from '../../i18n/es';
import { useEstado } from '../../storage/contexto';
import { minutosDelDia } from '../../storage/selectores';
import { hoyDelJuego } from '../reloj';

/** Segundos como 'm:ss'. */
export function mmss(segundos: number): string {
  const total = Math.max(0, Math.floor(segundos));
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
}

/** Lo ya guardado hoy más lo que el reloj del juego aún no guardó. */
function useTiempoDeHoy(segundosSinGuardar: number) {
  const { estado } = useEstado();
  const segundos = Math.round(minutosDelDia(estado, hoyDelJuego()) * 60) + segundosSinGuardar;
  const meta = estado.ajustes.metaDiariaMin * 60;
  return { segundos, meta, cumplida: segundos >= meta };
}

/** Franja de arriba en las pantallas fuera del juego. */
export function BarraDeTiempo() {
  const { segundos, meta, cumplida } = useTiempoDeHoy(0);
  return (
    <div
      role="timer"
      aria-label={es.reloj.etiqueta(mmss(segundos), mmss(meta))}
      style={{
        display: 'flex',
        justifyContent: 'flex-end',
        alignItems: 'center',
        gap: 10,
        padding: '6px 16px',
        background: 'var(--superficie)',
        borderBottom: '3px solid var(--borde)',
      }}
    >
      {cumplida && <span style={{ color: 'var(--musgo-pixel)' }}>{es.reloj.metaCumplida}</span>}
      <span style={{ color: 'var(--texto-tenue)' }}>{es.reloj.hoy}</span>
      <span className="numero" style={{ margin: 0, fontSize: 20 }}>
        {mmss(segundos)} / {mmss(meta)}
      </span>
      <span
        aria-hidden
        style={{ width: 90, height: 12, background: '#140e38', border: '2px solid var(--borde)' }}
      >
        <span
          style={{
            display: 'block',
            width: `${Math.min(100, (segundos / Math.max(1, meta)) * 100)}%`,
            height: '100%',
            background: 'var(--musgo-pixel)',
          }}
        />
      </span>
    </div>
  );
}

/**
 * El mismo reloj sobre el lienzo. Solo gris neutro sobre negro: en modo
 * lentes no puede aparecer ningún otro color mientras se juega.
 */
export const ESTILO_EN_JUEGO = {
  background: config.color.fondoLentes,
  color: aCss(gris(config.color.grisAmbos)),
  borderColor: aCss(gris(config.color.grisAmbos)),
  outlineColor: aCss(gris(config.color.grisAmbos)),
} as const;

export function RelojEnJuego({ segundosSinGuardar }: { segundosSinGuardar: number }) {
  const { segundos, meta } = useTiempoDeHoy(segundosSinGuardar);
  return (
    <div
      role="timer"
      aria-label={es.reloj.etiqueta(mmss(segundos), mmss(meta))}
      className="numero"
      style={{
        ...ESTILO_EN_JUEGO,
        position: 'absolute',
        top: 4,
        left: '50%',
        transform: 'translateX(-50%)',
        margin: 0,
        padding: '0 10px',
        border: '2px solid',
        fontSize: 16,
        lineHeight: '22px',
        whiteSpace: 'nowrap',
        // Que no robe los toques al lienzo.
        pointerEvents: 'none',
      }}
    >
      {mmss(segundos)} / {mmss(meta)}
    </div>
  );
}
