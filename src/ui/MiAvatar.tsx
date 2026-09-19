/** Mi avatar: ver y cambiar lo que lleva puesto, sin comprar nada. */
import { es } from '../i18n/es';
import { useEstado } from '../storage/contexto';
import { CATEGORIAS, articulo, type Categoria } from '../rewards/catalogo';
import { equipar } from '../rewards/tienda';
import { AvatarCompuesto } from './componentes/AvatarCompuesto';

export function MiAvatar({ alVolver }: { alVolver: () => void }) {
  const { estado, despachar } = useEstado();
  const { economia } = estado;

  function equiparArticulo(id: string) {
    despachar({
      tipo: 'reemplazar',
      estado: { ...estado, economia: equipar(economia, id) },
    });
  }

  return (
    <main style={{ padding: 24, maxWidth: 900, margin: '0 auto' }}>
      <h1>{es.avatar.titulo}</h1>
      <p>{es.avatar.explicacion}</p>

      <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', alignItems: 'flex-start' }}>
        <div className="panel pixelado" style={{ textAlign: 'center' }}>
          <AvatarCompuesto escala={10} conMascota />
        </div>

        <div style={{ flex: '1 1 380px' }}>
          {CATEGORIAS.map((categoria) => (
            <Seccion
              key={categoria}
              categoria={categoria}
              inventario={economia.inventario}
              equipado={economia.equipado[categoria]}
              alEquipar={equiparArticulo}
            />
          ))}
        </div>
      </div>

      <button className="pixelado" onClick={alVolver} style={{ marginTop: 18 }}>
        {es.comun.volverALaBase}
      </button>
    </main>
  );
}

function Seccion({
  categoria,
  inventario,
  equipado,
  alEquipar,
}: {
  categoria: Categoria;
  inventario: string[];
  equipado: string | undefined;
  alEquipar: (id: string) => void;
}) {
  const suyos = inventario.filter((id) => articulo(id)?.categoria === categoria);
  if (suyos.length === 0) return null;

  return (
    <section style={{ marginBottom: 16 }}>
      <h2 style={{ fontSize: 20, marginBottom: 6 }}>{es.categorias[categoria]}</h2>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {suyos.map((id) => (
          <button
            key={id}
            className={equipado === id ? 'pixelado' : 'pixelado secundario'}
            aria-pressed={equipado === id}
            onClick={() => alEquipar(id)}
          >
            {articulo(id)?.color && (
              <span
                aria-hidden
                style={{
                  display: 'inline-block',
                  width: 16,
                  height: 16,
                  background: articulo(id)!.color,
                  marginRight: 8,
                  verticalAlign: '-2px',
                }}
              />
            )}
            {es.articulos[id]}
          </button>
        ))}
      </div>
    </section>
  );
}
