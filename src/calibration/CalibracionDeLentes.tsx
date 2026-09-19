/**
 * Calibración de lentes rojo/cian en tres pasos:
 * 1. Identificar qué lente cubre cada ojo.
 * 2. Bajar la intensidad del color del otro ojo hasta que no se vea (fugas).
 * 3. Verificar que con los dos ojos abiertos se ven las dos figuras.
 *
 * Todo se pregunta en términos del ojo ambliope y el dominante, que el juego
 * ya conoce; el dato guardado (qué lente cubre el ojo derecho) se deriva.
 */
import { useState } from 'react';
import { config, type ColorLente } from '../config';
import { es, nombreDeOjo } from '../i18n/es';
import { useEstado } from '../storage/contexto';
import { ojoDominante } from '../storage/esquema';
import { diaISO } from '../engine/fechas';
import { aCss, rgbDeLente } from '../engine/color';
import { FIGURAS } from './figuras';
import { FiguraPixel } from './FiguraPixel';
import { Campo } from '../ui/componentes/Campo';

type Paso = 'identificar' | 'fugaAmbliope' | 'fugaDominante' | 'verificar' | 'listo';

const FONDO = { background: config.color.fondoLentes, padding: 28 } as const;

export function CalibracionDeLentes({ alTerminar }: { alTerminar: () => void }) {
  const { estado, despachar } = useEstado();
  const ambliope = estado.perfil.ojoAmbliope;
  const dominante = ojoDominante(estado.perfil);

  const [paso, setPaso] = useState<Paso>('identificar');
  const [colorAmbliope, setColorAmbliope] = useState<ColorLente | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [maxRojo, setMaxRojo] = useState<number>(config.lentes.intensidadInicialCalibracion);
  const [maxCian, setMaxCian] = useState<number>(config.lentes.intensidadInicialCalibracion);

  const colorDominante: ColorLente | null =
    colorAmbliope === null ? null : colorAmbliope === 'rojo' ? 'cian' : 'rojo';

  const maximoDe = (color: ColorLente) => (color === 'rojo' ? maxRojo : maxCian);
  const fijarMaximo = (color: ColorLente, valor: number) =>
    color === 'rojo' ? setMaxRojo(valor) : setMaxCian(valor);

  function elegirColor(color: ColorLente) {
    setColorAmbliope(color);
    setAviso(null);
    setPaso('fugaAmbliope');
  }

  function guardar() {
    if (!colorAmbliope) return;
    // Dato de hardware: qué lente cubre el ojo derecho.
    const colorOjoDerecho: ColorLente =
      ambliope === 'derecho' ? colorAmbliope : colorAmbliope === 'rojo' ? 'cian' : 'rojo';
    despachar({
      tipo: 'calibracion/lentes',
      lentes: {
        colorOjoDerecho,
        intensidadMaxRojo: maxRojo,
        intensidadMaxCian: maxCian,
        fecha: diaISO(),
      },
    });
    const permitidos = estado.ajustes.modosPermitidos;
    if (!permitidos.includes('lentes')) {
      despachar({
        tipo: 'ajustes/actualizar',
        cambios: { modosPermitidos: [...permitidos, 'lentes'] },
      });
    }
    setPaso('listo');
  }

  const bajaCalidad =
    Math.min(maxRojo, maxCian) < config.lentes.intensidadMinimaAceptable && paso !== 'identificar';

  return (
    <main style={{ padding: 24, maxWidth: 820, margin: '0 auto' }}>
      <h1>{es.calibracion.lentes.titulo}</h1>
      <p>{es.calibracion.lentes.ponerse}</p>

      {paso === 'identificar' && (
        <section>
          <h2>{es.calibracion.lentes.identificar.titulo}</h2>
          <p>{es.calibracion.lentes.identificar.instruccion(nombreDeOjo(dominante))}</p>
          <div className="pixelado" style={{ ...FONDO, display: 'flex', gap: 40 }}>
            <Cuadrado color="rojo" intensidad={config.lentes.intensidadInicialCalibracion} />
            <Cuadrado color="cian" intensidad={config.lentes.intensidadInicialCalibracion} />
          </div>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 16 }}>
            <button className="pixelado" onClick={() => elegirColor('rojo')}>
              {es.calibracion.lentes.identificar.rojo}
            </button>
            <button className="pixelado" onClick={() => elegirColor('cian')}>
              {es.calibracion.lentes.identificar.cian}
            </button>
            <button
              className="pixelado secundario"
              onClick={() => setAviso(es.calibracion.lentes.identificar.revisar)}
            >
              {es.calibracion.lentes.identificar.ambos}
            </button>
          </div>
          {aviso && <p role="alert">{aviso}</p>}
        </section>
      )}

      {(paso === 'fugaAmbliope' || paso === 'fugaDominante') && colorAmbliope && colorDominante && (
        <PasoDeFuga
          // Con el ojo ambliope abierto se ajusta el color del dominante, y al revés.
          ojoAbierto={paso === 'fugaAmbliope' ? ambliope : dominante}
          ojoCerrado={paso === 'fugaAmbliope' ? dominante : ambliope}
          color={paso === 'fugaAmbliope' ? colorDominante : colorAmbliope}
          intensidad={maximoDe(paso === 'fugaAmbliope' ? colorDominante : colorAmbliope)}
          alCambiar={(valor) =>
            fijarMaximo(paso === 'fugaAmbliope' ? colorDominante : colorAmbliope, valor)
          }
          alConfirmar={() => setPaso(paso === 'fugaAmbliope' ? 'fugaDominante' : 'verificar')}
        />
      )}

      {paso === 'verificar' && colorAmbliope && colorDominante && (
        <section>
          <h2>{es.calibracion.lentes.verificar.titulo}</h2>
          <p>{es.calibracion.lentes.verificar.instruccion}</p>
          <div
            className="pixelado"
            style={{ ...FONDO, display: 'flex', gap: 48, justifyContent: 'center' }}
          >
            <FiguraPixel
              figura={FIGURAS[0]}
              color={aCss(rgbDeLente(colorAmbliope, maximoDe(colorAmbliope)))}
              escala={8}
              etiqueta={es.figuras[FIGURAS[0].id]}
            />
            <FiguraPixel
              figura={FIGURAS[3]}
              color={aCss(rgbDeLente(colorDominante, maximoDe(colorDominante)))}
              escala={8}
              etiqueta={es.figuras[FIGURAS[3].id]}
            />
          </div>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 16 }}>
            <button className="pixelado" onClick={guardar}>
              {es.calibracion.lentes.verificar.siVeoLasDos}
            </button>
            <button className="pixelado secundario" onClick={() => setPaso('identificar')}>
              {es.calibracion.lentes.verificar.noVeoUna}
            </button>
          </div>
        </section>
      )}

      {paso === 'listo' && (
        <section>
          <h2>{es.calibracion.lentes.verificar.listo}</h2>
          <p>{es.chequeo.lentesOk}</p>
          <button className="pixelado" onClick={alTerminar}>
            {es.comun.continuar}
          </button>
        </section>
      )}

      {bajaCalidad && (
        <p role="status" style={{ color: 'var(--ambar-estelar)' }}>
          {es.calibracion.lentes.calidad}
        </p>
      )}

      <ul style={{ color: 'var(--texto-tenue)', marginTop: 20 }}>
        {es.chequeo.recomendaciones.map((r) => (
          <li key={r}>{r}</li>
        ))}
      </ul>
    </main>
  );
}

function PasoDeFuga({
  ojoAbierto,
  ojoCerrado,
  color,
  intensidad,
  alCambiar,
  alConfirmar,
}: {
  ojoAbierto: 'derecho' | 'izquierdo';
  ojoCerrado: 'derecho' | 'izquierdo';
  color: ColorLente;
  intensidad: number;
  alCambiar: (valor: number) => void;
  alConfirmar: () => void;
}) {
  return (
    <section>
      <h2>{es.calibracion.lentes.fugas.titulo}</h2>
      <p>
        {es.calibracion.lentes.fugas.instruccion(nombreDeOjo(ojoAbierto), nombreDeOjo(ojoCerrado))}
      </p>
      <div className="pixelado" style={{ ...FONDO, display: 'flex', justifyContent: 'center' }}>
        <Cuadrado color={color} intensidad={intensidad} />
      </div>
      <Campo etiqueta={es.calibracion.lentes.fugas.control}>
        <input
          type="range"
          min={0}
          max={255}
          value={intensidad}
          onChange={(e) => alCambiar(Number(e.target.value))}
          style={{ width: '100%', minHeight: 'auto' }}
        />
      </Campo>
      <p className="numero">{intensidad}</p>
      <button className="pixelado" onClick={alConfirmar}>
        {es.calibracion.lentes.fugas.desaparecio}
      </button>
    </section>
  );
}

/** Cuadrado de color puro sobre negro: rgb(I,0,0) o rgb(0,I,I). */
function Cuadrado({ color, intensidad }: { color: ColorLente; intensidad: number }) {
  return (
    <div
      aria-hidden
      style={{ width: 110, height: 110, background: aCss(rgbDeLente(color, intensidad)) }}
    />
  );
}
