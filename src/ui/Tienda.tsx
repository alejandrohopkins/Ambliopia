/**
 * Tienda. Cada artículo se ve en su ficha y se puede probar antes de
 * comprarlo: el avatar grande se lo pone —con el fondo, la mascota o el
 * objeto del juego— para que la jugadora vea cómo le queda.
 */
import { useRef, useState } from 'react';
import { es } from '../i18n/es';
import { useEstado } from '../storage/contexto';
import { CATEGORIAS, articulosDe, type Articulo, type Categoria } from '../rewards/catalogo';
import { comprar, equipar, loTiene, puedePagar } from '../rewards/tienda';
import { AvatarCompuesto } from './componentes/AvatarCompuesto';
import { Miniatura } from './componentes/Miniatura';
import { Paisaje } from '../avatar/vector/Fondos';
import { Contadores } from './base/Contadores';
import { audio } from '../engine/audio';
import { useMovimientoReducido } from './movimiento';

/** Lo que sale en los juegos y no en el cuerpo del avatar. */
const DE_JUEGO: Categoria[] = ['naves', 'estelas', 'picos'];

export function Tienda({ alVolver }: { alVolver: () => void }) {
  const { estado, despachar } = useEstado();
  const { economia } = estado;
  const sinMovimiento = useMovimientoReducido();
  const [categoria, setCategoria] = useState<Categoria>('cascos');
  const [probando, setProbando] = useState<Articulo | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const vistaPrevia = useRef<HTMLDivElement>(null);

  function probar(art: Articulo) {
    setProbando(art);
    setAviso(null);
    // En una tablet en vertical la vista previa queda arriba: se lleva a la vista.
    vistaPrevia.current?.scrollIntoView({
      behavior: sinMovimiento ? 'auto' : 'smooth',
      block: 'nearest',
    });
  }

  function comprarArticulo(art: Articulo) {
    const resultado = comprar(economia, art.id);
    if (!resultado.ok) {
      setAviso(resultado.motivo === 'sinCristales' ? es.tienda.sinCristales : es.tienda.sinMonedas);
      return;
    }
    setAviso(null);
    setProbando(null);
    audio().reproducir('compra');
    despachar({
      tipo: 'reemplazar',
      estado: { ...estado, economia: resultado.economia },
    });
  }

  function equiparArticulo(art: Articulo) {
    setProbando(null);
    despachar({
      tipo: 'reemplazar',
      estado: { ...estado, economia: equipar(economia, art.id) },
    });
  }

  const fondo = probando?.categoria === 'fondos' ? probando.id : economia.equipado.fondos;

  return (
    <main style={{ padding: 24, maxWidth: 1100, margin: '0 auto' }}>
      <h1>{es.tienda.titulo}</h1>
      <Contadores
        monedas={economia.monedas}
        cristales={economia.cristales}
        racha={estado.racha.actual}
      />

      <div
        style={{
          display: 'flex',
          gap: 24,
          flexWrap: 'wrap',
          marginTop: 18,
          alignItems: 'flex-start',
        }}
      >
        <div
          ref={vistaPrevia}
          className="panel pixelado"
          style={{
            position: 'relative',
            overflow: 'hidden',
            textAlign: 'center',
            flex: '0 1 300px',
          }}
        >
          <Paisaje id={fondo} />
          <div style={{ position: 'relative' }}>
            <AvatarCompuesto
              alto={240}
              conMascota
              equipoExtra={probando ? { [probando.categoria]: probando.id } : undefined}
            />
            {probando && DE_JUEGO.includes(probando.categoria) && (
              <div
                style={{
                  display: 'grid',
                  placeItems: 'center',
                  minHeight: 100,
                  marginTop: 8,
                }}
              >
                <Miniatura articulo={probando} alto={96} />
              </div>
            )}
            <p className="panel" style={{ margin: '10px 0 0', padding: '6px 10px' }}>
              {probando ? es.tienda.probando(es.articulos[probando.id]) : es.tienda.tuAvatar}
            </p>
            {probando && (
              <button
                className="pixelado secundario"
                onClick={() => setProbando(null)}
                style={{ marginTop: 10 }}
              >
                {es.tienda.quitarPrueba}
              </button>
            )}
          </div>
        </div>

        <div style={{ flex: '1 1 460px' }}>
          <nav
            style={{
              display: 'flex',
              gap: 8,
              flexWrap: 'wrap',
              marginBottom: 14,
            }}
          >
            {CATEGORIAS.map((c) => (
              <button
                key={c}
                className={categoria === c ? 'pixelado' : 'pixelado secundario'}
                aria-pressed={categoria === c}
                onClick={() => {
                  setCategoria(c);
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
              gap: 12,
              gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
            }}
          >
            {articulosDe(categoria).map((art) => (
              <FichaDeArticulo
                key={art.id}
                articulo={art}
                comprado={loTiene(economia, art.id)}
                enUso={economia.equipado[art.categoria] === art.id}
                alcanza={puedePagar(economia, art)}
                probando={probando?.id === art.id}
                alProbar={() => probar(art)}
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
  probando,
  alProbar,
  alComprar,
  alEquipar,
}: {
  articulo: Articulo;
  comprado: boolean;
  enUso: boolean;
  alcanza: boolean;
  probando: boolean;
  alProbar: () => void;
  alComprar: () => void;
  alEquipar: () => void;
}) {
  const nombre = es.articulos[articulo.id];
  const precio = articulo.precioCristales
    ? `${articulo.precioCristales} ${es.comun.cristales}`
    : articulo.precioMonedas
      ? `${articulo.precioMonedas} ${es.comun.monedas}`
      : es.rarezas.gratis;

  return (
    <li
      className="panel pixelado"
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 6,
        padding: 12,
        borderColor: probando ? 'var(--cristal)' : undefined,
      }}
    >
      {/* Tocar el dibujo también lo prueba. */}
      <button
        onClick={alProbar}
        aria-label={es.tienda.probarArticulo(nombre)}
        style={{
          display: 'grid',
          placeItems: 'center',
          minHeight: 120,
          padding: 8,
          background: '#140e38',
          border: 'none',
        }}
      >
        <Miniatura articulo={articulo} alto={104} />
      </button>
      <strong style={{ fontFamily: 'var(--fuente-titulos)' }}>{nombre}</strong>
      <span style={{ color: 'var(--texto-tenue)', fontSize: 15 }}>
        {articulo.rareza === 'gratis' ? precio : `${es.rarezas[articulo.rareza]} · ${precio}`}
      </span>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 'auto' }}>
        {!enUso && (
          <button className="pixelado secundario" onClick={alProbar} aria-pressed={probando}>
            {es.tienda.probar}
          </button>
        )}
        {enUso ? (
          <span className="numero" style={{ alignSelf: 'center' }}>
            {es.tienda.enUso}
          </span>
        ) : comprado ? (
          <button className="pixelado" onClick={alEquipar}>
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
