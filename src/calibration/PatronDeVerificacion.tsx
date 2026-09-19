/**
 * Herramienta del panel de adultos: tres figuras etiquetadas con los colores
 * calibrados, para comprobar a mano la separación cerrando un ojo y luego el otro.
 */
import { config } from '../config';
import { es, nombreDeOjo } from '../i18n/es';
import { useEstado } from '../storage/contexto';
import { colorDelOjo, intensidadMaxima, ojoDominante } from '../storage/esquema';
import { aCss, gris, rgbDeLente } from '../engine/color';
import { FIGURAS } from './figuras';
import { FiguraPixel } from './FiguraPixel';

export function PatronDeVerificacion() {
  const { estado } = useEstado();
  const ambliope = estado.perfil.ojoAmbliope;
  const dominante = ojoDominante(estado.perfil);
  const lentes = estado.calibracion.lentes;
  const colorAmbliope = colorDelOjo(lentes, ambliope);
  const colorDominante = colorDelOjo(lentes, dominante);

  if (!colorAmbliope || !colorDominante) return null;

  const entradas = [
    {
      etiqueta: es.calibracion.patron.ojoAmbliope(nombreDeOjo(ambliope)),
      figura: FIGURAS[0],
      color: aCss(rgbDeLente(colorAmbliope, intensidadMaxima(lentes, colorAmbliope))),
    },
    {
      etiqueta: es.calibracion.patron.ojoDominante(nombreDeOjo(dominante)),
      figura: FIGURAS[3],
      color: aCss(
        rgbDeLente(
          colorDominante,
          Math.round(
            intensidadMaxima(lentes, colorDominante) * estado.balance.contrasteOjoDominante,
          ),
        ),
      ),
    },
    {
      etiqueta: es.calibracion.patron.ambos,
      figura: FIGURAS[2],
      color: aCss(gris(config.color.grisAmbos)),
    },
  ];

  return (
    <section>
      <h2>{es.calibracion.patron.titulo}</h2>
      <p>{es.calibracion.patron.explicacion}</p>
      <div
        className="pixelado"
        style={{
          background: config.color.fondoLentes,
          padding: 24,
          display: 'flex',
          gap: 36,
          flexWrap: 'wrap',
          justifyContent: 'center',
        }}
      >
        {entradas.map((e) => (
          <figure key={e.etiqueta} style={{ margin: 0, textAlign: 'center' }}>
            <FiguraPixel figura={e.figura} color={e.color} escala={8} etiqueta={e.etiqueta} />
            <figcaption style={{ color: aCss(gris(config.color.grisAmbos)), marginTop: 8 }}>
              {e.etiqueta}
            </figcaption>
          </figure>
        ))}
      </div>
    </section>
  );
}
