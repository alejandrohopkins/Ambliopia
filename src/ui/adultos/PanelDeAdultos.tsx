/**
 * Panel de adultos. Entra con PIN de cuatro dígitos; si se olvidó, con una
 * pregunta de adulto se crea uno nuevo sin borrar nada.
 */
import { useState } from 'react';
import { es } from '../../i18n/es';
import { useEstado } from '../../storage/contexto';
import { hashDePin, nuevaPreguntaDeAdulto, pinValido, verificarPin } from '../../storage/pin';
import { Aviso } from '../componentes/Aviso';
import { Campo, Error_ } from '../componentes/Campo';
import { Resumen } from './Resumen';
import { Graficas } from './Graficas';
import { Configuracion } from './Configuracion';
import { Calibraciones } from './Calibraciones';
import { Eventos } from './Eventos';
import { Notas } from './Notas';
import { Datos } from './Datos';

type Seccion = 'resumen' | 'graficas' | 'configuracion' | 'calibraciones' | 'eventos' | 'notas' | 'datos';
const SECCIONES: Seccion[] = [
  'resumen',
  'graficas',
  'configuracion',
  'calibraciones',
  'eventos',
  'notas',
  'datos',
];

export function PanelDeAdultos({
  alVolver,
  alCalibrar,
}: {
  alVolver: () => void;
  alCalibrar: (cual: 'pantalla' | 'lentes') => void;
}) {
  const { estado } = useEstado();
  const [dentro, setDentro] = useState(estado.ajustes.pinHash === null);
  const [seccion, setSeccion] = useState<Seccion>('resumen');

  if (!dentro) return <Entrada alEntrar={() => setDentro(true)} alVolver={alVolver} />;

  return (
    <main style={{ padding: 20, maxWidth: 1000, margin: '0 auto' }}>
      <header style={{ display: 'flex', alignItems: 'baseline', gap: 16, flexWrap: 'wrap' }}>
        <h1 style={{ marginBottom: 8 }}>{es.adultos.titulo}</h1>
        <button className="pixelado secundario" onClick={alVolver} style={{ marginLeft: 'auto' }}>
          {es.adultos.salir}
        </button>
      </header>

      <nav style={{ display: 'flex', gap: 8, flexWrap: 'wrap', margin: '10px 0 18px' }}>
        {SECCIONES.map((s) => (
          <button
            key={s}
            className={seccion === s ? 'pixelado' : 'pixelado secundario'}
            aria-pressed={seccion === s}
            onClick={() => setSeccion(s)}
          >
            {es.adultos.secciones[s]}
          </button>
        ))}
      </nav>

      {seccion === 'resumen' && <Resumen />}
      {seccion === 'graficas' && <Graficas />}
      {seccion === 'configuracion' && <Configuracion />}
      {seccion === 'calibraciones' && <Calibraciones alCalibrar={alCalibrar} />}
      {seccion === 'eventos' && <Eventos />}
      {seccion === 'notas' && <Notas />}
      {seccion === 'datos' && <Datos />}

      <div style={{ marginTop: 28 }}>
        <Aviso compacto />
      </div>
    </main>
  );
}

function Entrada({ alEntrar, alVolver }: { alEntrar: () => void; alVolver: () => void }) {
  const { estado, despachar } = useEstado();
  const [pin, setPin] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pregunta, setPregunta] = useState<ReturnType<typeof nuevaPreguntaDeAdulto> | null>(null);
  const [respuesta, setRespuesta] = useState('');
  const [pinNuevo, setPinNuevo] = useState('');

  async function entrar() {
    if (await verificarPin(pin, estado.ajustes.pinHash)) {
      setError(null);
      alEntrar();
    } else {
      setError(es.adultos.pinIncorrecto);
    }
  }

  async function recuperar() {
    if (!pregunta) return;
    if (Number(respuesta) !== pregunta.respuesta) {
      setError(es.adultos.respuestaIncorrecta);
      return;
    }
    if (!pinValido(pinNuevo)) {
      setError(es.asistente.pin.formato);
      return;
    }
    // Se cambia el PIN sin tocar ningún otro dato.
    despachar({ tipo: 'ajustes/actualizar', cambios: { pinHash: await hashDePin(pinNuevo) } });
    setError(null);
    alEntrar();
  }

  return (
    <main style={{ padding: 24, maxWidth: 460, margin: '0 auto' }}>
      <h1>{es.adultos.titulo}</h1>

      {!pregunta ? (
        <>
          <Campo etiqueta={es.adultos.pin}>
            <input
              className="pixelado"
              type="password"
              inputMode="numeric"
              maxLength={4}
              autoComplete="off"
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
              onKeyDown={(e) => e.key === 'Enter' && entrar()}
            />
          </Campo>
          {error && <Error_>{error}</Error_>}
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <button className="pixelado" onClick={entrar}>
              {es.adultos.entrar}
            </button>
            <button
              className="pixelado secundario"
              onClick={() => {
                setPregunta(nuevaPreguntaDeAdulto());
                setError(null);
              }}
            >
              {es.adultos.olvide}
            </button>
            <button className="pixelado secundario" onClick={alVolver}>
              {es.comun.volver}
            </button>
          </div>
        </>
      ) : (
        <>
          <p>{es.adultos.preguntaDeAdulto(pregunta.a, pregunta.b)}</p>
          <Campo etiqueta={es.adultos.respuesta}>
            <input
              className="pixelado"
              inputMode="numeric"
              value={respuesta}
              onChange={(e) => setRespuesta(e.target.value.replace(/\D/g, ''))}
            />
          </Campo>
          <Campo etiqueta={es.adultos.nuevoPin}>
            <input
              className="pixelado"
              type="password"
              inputMode="numeric"
              maxLength={4}
              value={pinNuevo}
              onChange={(e) => setPinNuevo(e.target.value.replace(/\D/g, ''))}
            />
          </Campo>
          {error && <Error_>{error}</Error_>}
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <button className="pixelado" onClick={recuperar}>
              {es.comun.guardar}
            </button>
            <button className="pixelado secundario" onClick={() => setPregunta(null)}>
              {es.comun.cancelar}
            </button>
          </div>
        </>
      )}
    </main>
  );
}
