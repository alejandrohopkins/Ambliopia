/** El avatar de la jugadora tal como lo lleva equipado, con su mascota al lado. */
import { config, type Ojo } from '../../config';
import { es } from '../../i18n/es';
import { useEstado } from '../../storage/contexto';
import { Figura } from '../../avatar/vector/Figura';
import { Mascota } from '../../avatar/vector/Mascotas';
import { colorDePelo, colorDePiel, type Apariencia } from '../../avatar/vector/apariencia';
import { tamanoDePixel } from '../../avatar/pixelar';
import { Pixelnauta } from '../../avatar/Pixelnauta';
import type { MapaDePixeles } from '../../avatar/sprites';
import { conAnimacion } from '../animacion';
import { useMovimientoReducido } from '../movimiento';

/** Nube de polvo al aterrizar, de dos tonos de polvo lunar. */
const POLVO: MapaDePixeles = [
  '.....dd......dd.....',
  '..ddDDDd..ddDDDdd...',
  '.dDDDDDDddDDDDDDDDd.',
  'dDDDDDDDDDDDDDDDDDDd',
];

export function AvatarCompuesto({
  alto = 200,
  conMascota = false,
  equipoExtra,
  aparienciaExtra,
  respira = false,
  vivo = false,
  dormida = false,
  aterriza = false,
  parche = null,
}: {
  /** Alto de la figura en píxeles. */
  alto?: number;
  conMascota?: boolean;
  /** Vista previa: sustituye lo equipado por el artículo que se está probando. */
  equipoExtra?: Record<string, string>;
  /** Vista previa de un tono de piel o un color de pelo. */
  aparienciaExtra?: Partial<Apariencia>;
  /** Respiración suave. Se apaga con reducir movimiento. */
  respira?: boolean;
  /** Parpadea, y la mascota se balancea y mira a su alrededor. Para los avatares grandes. */
  vivo?: boolean;
  /** Con los ojos cerrados. */
  dormida?: boolean;
  /** Cae del cielo y levanta polvo al llegar al suelo, una sola vez. */
  aterriza?: boolean;
  /** Ojo con parche, para el chequeo del modo parche. */
  parche?: Ojo | null;
}) {
  const { estado } = useEstado();
  const sinMovimiento = useMovimientoReducido();
  const equipo = { ...estado.economia.equipado, ...equipoExtra };
  const apariencia = { ...estado.perfil.apariencia, ...aparienciaExtra };
  const animado = !sinMovimiento;
  const conAterrizaje = aterriza && animado;
  const aterrizaje = conAnimacion(config.animacion.polvoMs);

  return (
    <div
      style={{
        display: 'flex',
        gap: 4,
        alignItems: 'flex-end',
        justifyContent: 'center',
      }}
    >
      <span style={{ position: 'relative', display: 'inline-block', lineHeight: 0 }}>
        <span
          className={conAterrizaje ? 'aterriza' : undefined}
          style={{ ...aterrizaje, display: 'inline-block' }}
        >
          <Figura
            equipo={equipo}
            piel={colorDePiel(apariencia)}
            pelo={colorDePelo(apariencia)}
            parche={parche}
            alto={alto}
            etiqueta={es.avatar.titulo}
            respira={respira && animado}
            parpadea={vivo && animado}
            dormida={dormida}
          />
        </span>
        {conAterrizaje && (
          <span
            aria-hidden
            className="aterriza-polvo"
            style={{
              ...aterrizaje,
              position: 'absolute',
              left: 0,
              right: 0,
              bottom: -tamanoDePixel(alto),
              display: 'flex',
              justifyContent: 'center',
              transformOrigin: 'center bottom',
            }}
          >
            <Pixelnauta
              mapa={POLVO}
              paleta={{ D: '#EDE9FF', d: '#B9B0E4' }}
              escala={tamanoDePixel(alto) * 2}
              etiqueta=""
            />
          </span>
        )}
      </span>
      {conMascota && equipo.mascotas && (
        <span className={conAterrizaje ? 'aterriza' : undefined} style={{ ...aterrizaje, display: 'inline-block' }}>
          <Mascota
            id={equipo.mascotas}
            alto={Math.round(alto * 0.4)}
            tamano={tamanoDePixel(alto)}
            vivo={vivo && animado}
            etiqueta={es.articulos[equipo.mascotas] ?? es.categorias.mascotas}
          />
        </span>
      )}
    </div>
  );
}
