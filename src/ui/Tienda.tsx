/** Tienda: vista previa del avatar con el artículo antes de comprarlo. */
import { useState } from 'react';
import { es } from '../i18n/es';
import { useEstado } from '../storage/contexto';
import {
  CATEGORIAS,
  articulosDe,
  type Articulo,
  type Categoria,
} from '../rewards/catalogo';
import { comprar, equipar, loTiene, puedePagar } from '../rewards/tienda';
import { AvatarCompuesto } from './componentes/AvatarCompuesto';
import { Contadores } from './base/Contadores';

export function Tienda({ alVolver }: { alVolver: () => void }) {
  const { estado, despachar } = useEstado();
  const { economia } = estado;
  const [categoria, setCategoria] = useState<Categoria>('cascos');
  const [mirando, setMirando] = useState<Articulo | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);

  function comprarArticulo(art: Articulo) {
    const resultado = comprar(economia, art.id);
    if (!resultado.ok) {
      setAviso(resultado.motivo === 'sinCristales' ? es.tienda.sinCristales : es.tienda.sinMonedas);
      return;
    }
    setAviso(null);
    despachar({ tipo: 'reemplazar', estado: { ...estado, economia: resultado.economia } });
  }

  function equiparArticulo(art: Articulo) {
    despachar({ tipo: 'reemplazar', estado: { ...estado, economia: equipar(economia, art.id) } });
  }

  return (
    <main style={{ padding: 24, maxWidth: 1000, margin: '0 auto' }}>
      <h1>{es.tienda.titulo}</h1>
      <Contadores
        monedas={economia.monedas}
        cristales={economia.cristales}
        racha={estado.racha.actual}
      />

      <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', marginTop: 18 }}>
        <div className="panel pixelado" style={{ textAlign: 'center', minWidth: 190 }}>
          <AvatarCompuesto
            escala={9}
            conMascota
            equipoExtra={mirando ? { [mirando.categoria]: mirando.id } : undefined}
          />
          {mirando && <p style={{ margin: '10px 0 0' }}>{es.tienda.vistaPrevia}</p>}
        </div>

        <div style={{ flex: '1 1 460px' }}>
          <nav style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 14 }}>
            {CATEGORIAS.map((c) => (
              <button
                key={c}
                className={categoria === c ? 'pixelado' : 'pixelado secundario'}
                aria-pressed={categoria === c}
                onClick={() => {
                  setCategoria(c);
                  setMirando(null);
                  setAviso(null);
                }}
              >
                {es.categorias[c]}
              </button>
            ))}
          </nav>

          {aviso && (
            <p role="alert" style={{ color: 'var(--ambar-estelar)' }}>
              {aviso}
            </p>
          )}

          <ul
            style={{
              listStyle: 'none',
              padding: 0,
              display: 'grid',
              gap: 10,
              gridTemplateColumns: 'repeat(auto-fill, minmax(210px, 1fr))',
            }}
          >
            {articulosDe(categoria).map((art) => (
              <FichaDeArticulo
                key={art.id}
                articulo={art}
                comprado={loTiene(economia, art.id)}
                enUso={economia.equipado[art.categoria] === art.id}
                alcanza={puedePagar(economia, art)}
                alMirar={() => setMirando(art)}
                alComprar={() => comprarArticulo(art)}
                alEquipar={() => equiparArticulo(art)}
              />
            ))}
          </ul>
        </div>
      </div>

      <button className="pixelado" onClick={alVolver} style={{ marginTop: 18 }}>
        {es.comun.volverALaBase}
      </button>
    </main>
  );
}

function FichaDeArticulo({
  articulo,
  comprado,
  enUso,
  alcanza,
  alMirar,
  alComprar,
  alEquipar,
}: {
  articulo: Articulo;
  comprado: boolean;
  enUso: boolean;
  alcanza: boolean;
  alMirar: () => void;
  alComprar: () => void;
  alEquipar: () => void;
}) {
  const precio = articulo.precioCristales
    ? `${articulo.precioCristales} ${es.comun.cristales}`
    : articulo.precioMonedas
      ? `${articulo.precioMonedas} ${es.comun.monedas}`
      : es.rarezas.gratis;

  return (
    <li className="panel pixelado" onPointerEnter={alMirar} onFocus={alMirar}>
      <strong style={{ display: 'block', fontFamily: 'var(--fuente-titulos)' }}>
        {es.articulos[articulo.id]}
      </strong>
      <span style={{ display: 'block', color: 'var(--texto-tenue)', fontSize: 15 }}>
        {es.rarezas[articulo.rareza]} · {precio}
      </span>
      {articulo.color && (
        <span
          aria-hidden
          className="pixelado"
          style={{
            display: 'block',
            height: 14,
            background: articulo.color,
            margin: '8px 0',
          }}
        />
      )}
      <div style={{ marginTop: 8 }}>
        {enUso ? (
          <span className="numero">{es.tienda.enUso}</span>
        ) : comprado ? (
          <button className="pixelado secundario" onClick={alEquipar}>
            {es.tienda.equipar}
          </button>
        ) : (
          <button className="pixelado" onClick={alComprar} disabled={!alcanza}>
            {es.tienda.comprar}
          </button>
        )}
      </div>
    </li>
  );
}
