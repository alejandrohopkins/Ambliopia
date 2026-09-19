/** El avatar de la jugadora tal como lo lleva equipado, con su mascota al lado. */
import { es } from '../../i18n/es';
import { useEstado } from '../../storage/contexto';
import { componerAvatar, paletaCompleta } from '../../avatar/compositor';
import { MASCOTAS } from '../../avatar/piezas';
import { Pixelnauta } from '../../avatar/Pixelnauta';

export function AvatarCompuesto({
  escala = 8,
  conMascota = false,
  equipoExtra,
}: {
  escala?: number;
  conMascota?: boolean;
  /** Vista previa: sustituye lo equipado por el artículo que se está mirando. */
  equipoExtra?: Record<string, string>;
}) {
  const { estado } = useEstado();
  const equipo = { ...estado.economia.equipado, ...equipoExtra };
  const mapa = componerAvatar(equipo);
  const paleta = paletaCompleta(equipo);
  const mascota = equipo.mascotas ? MASCOTAS[equipo.mascotas] : undefined;

  return (
    <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end', justifyContent: 'center' }}>
      <Pixelnauta mapa={mapa} paleta={paleta} escala={escala} etiqueta={es.avatar.titulo} />
      {conMascota && mascota && (
        <Pixelnauta
          mapa={mascota}
          paleta={paleta}
          escala={Math.max(3, Math.round(escala * 0.7))}
          etiqueta={es.articulos[equipo.mascotas!] ?? es.categorias.mascotas}
        />
      )}
    </div>
  );
}
