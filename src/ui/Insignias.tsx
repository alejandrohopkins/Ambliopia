/** Insignias conseguidas y por conseguir, con su criterio a la vista. */
import { es } from '../i18n/es';
import { useEstado } from '../storage/contexto';
import { INSIGNIAS, nivelAlcanzado } from '../rewards/insignias';
import { hoyDelJuego } from './reloj';

export function Insignias({ alVolver }: { alVolver: () => void }) {
  const { estado } = useEstado();
  const dia = hoyDelJuego();
  const conseguidas = INSIGNIAS.filter((i) => (estado.insignias[i.id]?.nivel ?? 0) > 0).length;

  return (
    <main style={{ padding: 24, maxWidth: 900, margin: '0 auto' }}>
      <h1>{es.pantallaDeInsignias.titulo}</h1>
      <p className="numero">
        {es.pantallaDeInsignias.conseguidas(conseguidas, INSIGNIAS.length)}
      </p>

      <ul
        style={{
          listStyle: 'none',
          padding: 0,
          display: 'grid',
          gap: 12,
          gridTemplateColumns: 'repeat(auto-fill, minmax(230px, 1fr))',
          marginBottom: 20,
        }}
      >
        {INSIGNIAS.map((definicion) => {
          const guardado = estado.insignias[definicion.id]?.nivel ?? 0;
          const actual = Math.max(guardado, nivelAlcanzado(definicion, estado, dia));
          const texto = es.insignias[definicion.id];
          return (
            <li key={definicion.id} className="panel pixelado">
              <MedallaPixel nivel={actual} de={definicion.niveles.length} />
              <strong style={{ display: 'block', fontFamily: 'var(--fuente-titulos)' }}>
                {texto.nombre}
              </strong>
              <span style={{ display: 'block', color: 'var(--texto-tenue)', fontSize: 15 }}>
                {texto.criterio}
              </span>
              <span className="numero" style={{ display: 'block', marginTop: 6 }}>
                {actual > 0
                  ? es.pantallaDeInsignias.nivel(actual, definicion.niveles.length)
                  : es.pantallaDeInsignias.bloqueada}
              </span>
            </li>
          );
        })}
      </ul>

      <button className="pixelado" onClick={alVolver}>
        {es.comun.volverALaBase}
      </button>
    </main>
  );
}

/** Medalla dibujada por código: tantas estrellas encendidas como el nivel. */
function MedallaPixel({ nivel, de }: { nivel: number; de: number }) {
  return (
    <p className="numero" style={{ fontSize: 22, margin: '0 0 4px' }} aria-hidden>
      {'★'.repeat(nivel)}
      <span style={{ color: 'var(--borde)' }}>{'★'.repeat(Math.max(0, de - nivel))}</span>
    </p>
  );
}
