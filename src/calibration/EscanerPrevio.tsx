/**
 * Escáner previo: antes de cada sesión en modo lentes, diez segundos para
 * confirmar que los lentes están puestos y bien orientados.
 */
import { useMemo, useState } from 'react';
import { config } from '../config';
import { es, nombreDeOjo } from '../i18n/es';
import { useEstado } from '../storage/contexto';
import { colorDelOjo, intensidadMaxima, ojoDominante } from '../storage/esquema';
import { aCss, rgbDeLente } from '../engine/color';
import { crearAleatorio } from '../engine/rng';
import { FiguraPixel } from './FiguraPixel';
import { evaluar, generarPrueba, type RespuestaDeEscaner } from './escaner';
import type { Figura } from './figuras';

export function EscanerPrevio({
  alAprobar,
  alRecalibrar,
  alCancelar,
}: {
  alAprobar: () => void;
  alRecalibrar: () => void;
  alCancelar: () => void;
}) {
  const { estado } = useEstado();
  const ambliope = estado.perfil.ojoAmbliope;
  const dominante = ojoDominante(estado.perfil);
  const [intento, setIntento] = useState(0);
  const [resultado, setResultado] = useState<ReturnType<typeof evaluar> | null>(null);

  const prueba = useMemo(
    () => generarPrueba(crearAleatorio(`${Date.now()}:${intento}`)),
    [intento],
  );

  const colorAmbliope = colorDelOjo(estado.calibracion.lentes, ambliope);
  const colorDominante = colorDelOjo(estado.calibracion.lentes, dominante);
  if (!colorAmbliope || !colorDominante) return null;

  const css = (color: typeof colorAmbliope) =>
    aCss(rgbDeLente(color, intensidadMaxima(estado.calibracion.lentes, color)));

  function responder(figura: Figura) {
    const cual: RespuestaDeEscaner =
      figura.id === prueba.figuraAmbliope.id ? 'ambliope' : 'dominante';
    setResultado(evaluar(cual));
  }

  return (
    <main style={{ padding: 20, maxWidth: 820, margin: '0 auto' }}>
      <h1>{es.calibracion.escaner.titulo}</h1>
      <p>{es.calibracion.escaner.instruccion(nombreDeOjo(dominante))}</p>

      <div
        className="pixelado"
        style={{
          position: 'relative',
          background: config.color.fondoLentes,
          height: 260,
          marginBottom: 16,
        }}
      >
        <EnPosicion posicion={prueba.posicionAmbliope}>
          <FiguraPixel
            figura={prueba.figuraAmbliope}
            color={css(colorAmbliope)}
            escala={7}
            etiqueta={es.figuras[prueba.figuraAmbliope.id]}
          />
        </EnPosicion>
        <EnPosicion posicion={prueba.posicionDominante}>
          <FiguraPixel
            figura={prueba.figuraDominante}
            color={css(colorDominante)}
            escala={7}
            etiqueta={es.figuras[prueba.figuraDominante.id]}
          />
        </EnPosicion>
      </div>

      {resultado === null && (
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          {prueba.opciones.map((figura) => (
            <button key={figura.id} className="pixelado" onClick={() => responder(figura)}>
              {es.figuras[figura.id]}
            </button>
          ))}
          <button
            className="pixelado secundario"
            onClick={() => setResultado(evaluar('ambas'))}
          >
            {es.calibracion.escaner.lasDos}
          </button>
        </div>
      )}

      {resultado === 'correcto' && (
        <>
          <p role="status">{es.calibracion.escaner.correcto}</p>
          <button className="pixelado" onClick={alAprobar}>
            {es.comun.continuar}
          </button>
        </>
      )}

      {resultado !== null && resultado !== 'correcto' && (
        <>
          <p role="alert">
            {resultado === 'alReves'
              ? es.calibracion.escaner.alReves
              : es.calibracion.escaner.revisar}
          </p>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <button
              className="pixelado"
              onClick={() => {
                setResultado(null);
                setIntento((n) => n + 1);
              }}
            >
              {es.calibracion.escaner.reintentar}
            </button>
            <button className="pixelado secundario" onClick={alRecalibrar}>
              {es.calibracion.lentes.recalibrar}
            </button>
            <button className="pixelado secundario" onClick={alCancelar}>
              {es.comun.volverALaBase}
            </button>
          </div>
        </>
      )}
    </main>
  );
}

function EnPosicion({
  posicion,
  children,
}: {
  posicion: { x: number; y: number };
  children: React.ReactNode;
}) {
  return (
    <div
      style={{
        position: 'absolute',
        left: `${posicion.x * 100}%`,
        top: `${posicion.y * 100}%`,
        transform: 'translate(-50%, -50%)',
      }}
    >
      {children}
    </div>
  );
}
