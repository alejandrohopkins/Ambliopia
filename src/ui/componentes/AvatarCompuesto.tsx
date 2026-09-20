/** El avatar de la jugadora tal como lo lleva equipado, con su mascota al lado. */
import { useEffect, useState } from 'react';
import { config } from '../../config';
import { es } from '../../i18n/es';
import { useEstado } from '../../storage/contexto';
import { componerAvatar, paletaCompleta, respirar } from '../../avatar/compositor';
import { MASCOTAS } from '../../avatar/piezas';
import { Pixelnauta } from '../../avatar/Pixelnauta';
import { useMovimientoReducido } from '../movimiento';

export function AvatarCompuesto({
  escala = 8,
  conMascota = false,
  equipoExtra,
  respira = false,
}: {
  escala?: number;
  conMascota?: boolean;
  /** Vista previa: sustituye lo equipado por el artículo que se está mirando. */
  equipoExtra?: Record<string, string>;
  /** Respiración suave: un píxel arriba y abajo. Se apaga con reducir movimiento. */
  respira?: boolean;
}) {
  const { estado } = useEstado();
  const sinMovimiento = useMovimientoReducido();
  const [arriba, setArriba] = useState(false);

  useEffect(() => {
    if (!respira || sinMovimiento) return;
    const id = setInterval(() => setArriba((a) => !a), config.avatar.respiracionMs / 2);
    return () => clearInterval(id);
  }, [respira, sinMovimiento]);

  const equipo = { ...estado.economia.equipado, ...equipoExtra };
  const mapa = respirar(componerAvatar(equipo), respira && !sinMovimiento && arriba);
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
