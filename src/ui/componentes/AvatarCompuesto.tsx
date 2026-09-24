/** El avatar de la jugadora tal como lo lleva equipado, con su mascota al lado. */
import type { Ojo } from '../../config';
import { es } from '../../i18n/es';
import { useEstado } from '../../storage/contexto';
import { Figura } from '../../avatar/vector/Figura';
import { Mascota } from '../../avatar/vector/Mascotas';
import { colorDePelo, colorDePiel, type Apariencia } from '../../avatar/vector/apariencia';
import { useMovimientoReducido } from '../movimiento';

export function AvatarCompuesto({
  alto = 200,
  conMascota = false,
  equipoExtra,
  aparienciaExtra,
  respira = false,
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
  /** Ojo con parche, para el chequeo del modo parche. */
  parche?: Ojo | null;
}) {
  const { estado } = useEstado();
  const sinMovimiento = useMovimientoReducido();
  const equipo = { ...estado.economia.equipado, ...equipoExtra };
  const apariencia = { ...estado.perfil.apariencia, ...aparienciaExtra };

  return (
    <div
      style={{
        display: 'flex',
        gap: 4,
        alignItems: 'flex-end',
        justifyContent: 'center',
      }}
    >
      <Figura
        equipo={equipo}
        piel={colorDePiel(apariencia)}
        pelo={colorDePelo(apariencia)}
        parche={parche}
        alto={alto}
        etiqueta={es.avatar.titulo}
        respira={respira && !sinMovimiento}
      />
      {conMascota && equipo.mascotas && (
        <Mascota
          id={equipo.mascotas}
          alto={Math.round(alto * 0.38)}
          etiqueta={es.articulos[equipo.mascotas] ?? es.categorias.mascotas}
        />
      )}
    </div>
  );
}
