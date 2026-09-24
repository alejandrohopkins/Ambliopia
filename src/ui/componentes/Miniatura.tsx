/**
 * Cómo se ve un artículo, en pequeño: el avatar con la pieza puesta, la
 * mascota, el paisaje de la base o, para lo que sale en los juegos (naves,
 * estelas y picos), su sprite tal como aparece jugando.
 */
import { es } from '../../i18n/es';
import { useEstado } from '../../storage/contexto';
import type { Articulo } from '../../rewards/catalogo';
import { Mascota } from '../../avatar/vector/Mascotas';
import { Paisaje } from '../../avatar/vector/Fondos';
import { ESTELAS, NAVES, PICOS } from '../../avatar/piezas';
import { paletaCompleta } from '../../avatar/compositor';
import { Pixelnauta } from '../../avatar/Pixelnauta';
import { AvatarCompuesto } from './AvatarCompuesto';

const SPRITES_DE_JUEGO: Partial<Record<Articulo['categoria'], Record<string, string[]>>> = {
  naves: NAVES,
  estelas: ESTELAS,
  picos: PICOS,
};

export function Miniatura({ articulo, alto = 100 }: { articulo: Articulo; alto?: number }) {
  const { estado } = useEstado();
  const { categoria, id } = articulo;
  const nombre = es.articulos[id] ?? id;

  if (categoria === 'mascotas') return <Mascota id={id} alto={alto} etiqueta={nombre} />;

  if (categoria === 'fondos') {
    return (
      <div
        role="img"
        aria-label={nombre}
        style={{
          position: 'relative',
          width: Math.round(alto * 1.6),
          height: alto,
          overflow: 'hidden',
        }}
      >
        <Paisaje id={id} />
      </div>
    );
  }

  const mapa = SPRITES_DE_JUEGO[categoria]?.[id];
  if (mapa) {
    const lado = Math.max(mapa.length, ...mapa.map((fila) => fila.length));
    return (
      <Pixelnauta
        mapa={mapa}
        paleta={paletaCompleta({
          ...estado.economia.equipado,
          [categoria]: id,
        })}
        escala={Math.max(2, Math.floor((alto * 0.8) / lado))}
        etiqueta={nombre}
      />
    );
  }

  // Cascos, trajes, visores y accesorios: el avatar con la pieza puesta.
  return <AvatarCompuesto alto={alto} equipoExtra={{ [categoria]: id }} />;
}
