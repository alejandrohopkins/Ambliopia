/** Mi avatar: cambiar lo que lleva puesto y su apariencia, sin comprar nada. */
import { es } from '../i18n/es';
import { useEstado } from '../storage/contexto';
import { CATEGORIAS, articulo, type Categoria } from '../rewards/catalogo';
import { equipar } from '../rewards/tienda';
import { PELOS, PIELES, type Apariencia } from '../avatar/vector/apariencia';
import { AvatarCompuesto } from './componentes/AvatarCompuesto';
import { Paisaje } from '../avatar/vector/Fondos';

export function MiAvatar({ alVolver }: { alVolver: () => void }) {
  const { estado, despachar } = useEstado();
  const { economia } = estado;
  const apariencia = estado.perfil.apariencia;

  function equiparArticulo(id: string) {
    despachar({
      tipo: 'reemplazar',
      estado: { ...estado, economia: equipar(economia, id) },
    });
  }

  function cambiarApariencia(cambio: Partial<Apariencia>) {
    despachar({
      tipo: 'perfil/actualizar',
      cambios: { apariencia: { ...apariencia, ...cambio } },
    });
  }

  return (
    <main style={{ padding: 24, maxWidth: 1000, margin: '0 auto' }}>
      <h1>{es.avatar.titulo}</h1>
      <p>{es.avatar.explicacion}</p>

      <div
        style={{
          display: 'flex',
          gap: 24,
          flexWrap: 'wrap',
          alignItems: 'flex-start',
        }}
      >
        <div
          className="panel pixelado"
          style={{
            position: 'relative',
            overflow: 'hidden',
            textAlign: 'center',
            flex: '0 1 300px',
          }}
        >
          <Paisaje id={economia.equipado.fondos} />
          <div style={{ position: 'relative' }}>
            <AvatarCompuesto alto={260} conMascota respira />
          </div>
        </div>

        <div style={{ flex: '1 1 380px' }}>
          <section style={{ marginBottom: 16 }}>
            <h2 style={{ fontSize: 22, marginBottom: 6 }}>{es.avatar.apariencia}</h2>
            <Muestras
              titulo={es.avatar.piel}
              colores={PIELES}
              nombres={es.avatar.pieles}
              elegido={apariencia.piel}
              alElegir={(piel) => cambiarApariencia({ piel })}
            />
            <Muestras
              titulo={es.avatar.pelo}
              colores={PELOS}
              nombres={es.avatar.pelos}
              elegido={apariencia.pelo}
              alElegir={(pelo) => cambiarApariencia({ pelo })}
            />
          </section>

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

/** Una fila de colores para elegir: piel o pelo. */
function Muestras({
  titulo,
  colores,
  nombres,
  elegido,
  alElegir,
}: {
  titulo: string;
  colores: Record<string, string>;
  nombres: Record<string, string>;
  elegido: string;
  alElegir: (id: string) => void;
}) {
  return (
    <div style={{ marginBottom: 12 }}>
      <h3 style={{ fontSize: 18, marginBottom: 6 }}>{titulo}</h3>
      <div role="group" aria-label={titulo} style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {Object.entries(colores).map(([id, color]) => (
          <button
            key={id}
            className={elegido === id ? 'pixelado' : 'pixelado secundario'}
            aria-pressed={elegido === id}
            onClick={() => alElegir(id)}
            style={{ padding: '0 14px' }}
          >
            <span
              aria-hidden
              style={{
                display: 'inline-block',
                width: 22,
                height: 22,
                background: color,
                border: '2px solid #0F0A2C',
                marginRight: 8,
                verticalAlign: '-5px',
              }}
            />
            {nombres[id]}
          </button>
        ))}
      </div>
    </div>
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
