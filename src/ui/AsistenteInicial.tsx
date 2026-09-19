/**
 * Asistente inicial: aviso, PIN de adultos, datos de la jugadora, calibraciones,
 * tiempos de juego y avatar de arranque. Al terminar, se va a la base.
 */
import { useState } from 'react';
import { config, type Ojo } from '../config';
import { es, nombreDeOjo } from '../i18n/es';
import { useEstado } from '../storage/contexto';
import { hashDePin, pinValido } from '../storage/pin';
import { ARTICULOS_GRATIS, equipoInicial } from '../rewards/catalogo';
import { Aviso } from './componentes/Aviso';
import { Campo, Error_ } from './componentes/Campo';

const PASOS = [
  'bienvenida',
  'pin',
  'jugadora',
  'pantalla',
  'lentes',
  'tiempos',
  'avatar',
] as const;
type Paso = (typeof PASOS)[number];

const OJOS: Ojo[] = ['derecho', 'izquierdo'];
const CASCOS = ARTICULOS_GRATIS.filter((a) => a.categoria === 'cascos');
const TRAJES = ARTICULOS_GRATIS.filter((a) => a.categoria === 'trajes');

export function AsistenteInicial({
  alCalibrarPantalla,
  alCalibrarLentes,
}: {
  /** Disponible desde la fase 2; sin él, el paso solo ofrece dejarlo para después. */
  alCalibrarPantalla?: () => void;
  alCalibrarLentes?: () => void;
}) {
  const { estado, despachar } = useEstado();
  const [paso, setPaso] = useState<Paso>(
    estado.ajustes.pinHash ? 'jugadora' : PASOS[0],
  );
  const [pin, setPin] = useState('');
  const [pin2, setPin2] = useState('');
  const [errorPin, setErrorPin] = useState<string | null>(null);
  const [nombre, setNombre] = useState(estado.perfil.nombre);
  const [ojo, setOjo] = useState<Ojo>(estado.perfil.ojoAmbliope);
  const [tieneLentes, setTieneLentes] = useState<boolean | null>(null);
  const [meta, setMeta] = useState(estado.ajustes.metaDiariaMin);
  const [maximo, setMaximo] = useState(estado.ajustes.maxDiarioMin);
  const [errorTiempos, setErrorTiempos] = useState<string | null>(null);
  const [casco, setCasco] = useState(CASCOS[0].id);
  const [traje, setTraje] = useState(TRAJES[0].id);

  const indice = PASOS.indexOf(paso);
  const avanzar = () => setPaso(PASOS[Math.min(PASOS.length - 1, indice + 1)]);

  async function confirmarPin() {
    if (!pinValido(pin)) return setErrorPin(es.asistente.pin.formato);
    if (pin !== pin2) return setErrorPin(es.asistente.pin.noCoincide);
    setErrorPin(null);
    despachar({ tipo: 'ajustes/actualizar', cambios: { pinHash: await hashDePin(pin) } });
    avanzar();
  }

  function confirmarJugadora() {
    despachar({
      tipo: 'perfil/actualizar',
      cambios: { nombre: nombre.trim() || config.perfil.nombrePorDefecto, ojoAmbliope: ojo },
    });
    avanzar();
  }

  function confirmarLentes(tiene: boolean) {
    setTieneLentes(tiene);
    despachar({
      tipo: 'ajustes/actualizar',
      cambios: { modosPermitidos: tiene ? ['parche', 'lentes'] : ['parche'] },
    });
    if (tiene && alCalibrarLentes) alCalibrarLentes();
  }

  function confirmarTiempos() {
    if (maximo < meta) return setErrorTiempos(es.asistente.tiempos.error);
    setErrorTiempos(null);
    despachar({
      tipo: 'ajustes/actualizar',
      cambios: { metaDiariaMin: meta, maxDiarioMin: maximo },
    });
    avanzar();
  }

  function terminar() {
    const gratis = ARTICULOS_GRATIS.map((a) => a.id);
    despachar({
      tipo: 'reemplazar',
      estado: {
        ...estado,
        economia: {
          ...estado.economia,
          inventario: [...new Set([...estado.economia.inventario, ...gratis])],
          equipado: { ...estado.economia.equipado, ...equipoInicial(casco, traje) },
        },
        asistenteCompletado: true,
      },
    });
  }

  return (
    <main style={{ padding: 24, maxWidth: 760, margin: '0 auto' }}>
      <p className="numero" style={{ color: 'var(--texto-tenue)' }}>
        {es.asistente.paso(indice + 1, PASOS.length)}
      </p>

      {paso === 'bienvenida' && (
        <>
          <h1>{es.asistente.bienvenida.titulo}</h1>
          <p>{es.asistente.bienvenida.texto}</p>
          <Aviso />
          <p style={{ marginTop: 18 }}>
            <button className="pixelado" onClick={avanzar}>
              {es.comun.entendido}
            </button>
          </p>
        </>
      )}

      {paso === 'pin' && (
        <>
          <h1>{es.asistente.pin.titulo}</h1>
          <p>{es.asistente.pin.explicacion}</p>
          <Campo etiqueta={es.asistente.pin.escribir}>
            <input
              className="pixelado"
              type="password"
              inputMode="numeric"
              autoComplete="off"
              maxLength={4}
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
            />
          </Campo>
          <Campo etiqueta={es.asistente.pin.repetir}>
            <input
              className="pixelado"
              type="password"
              inputMode="numeric"
              autoComplete="off"
              maxLength={4}
              value={pin2}
              onChange={(e) => setPin2(e.target.value.replace(/\D/g, ''))}
            />
          </Campo>
          {errorPin && <Error_>{errorPin}</Error_>}
          <button className="pixelado" onClick={confirmarPin}>
            {es.comun.continuar}
          </button>
        </>
      )}

      {paso === 'jugadora' && (
        <>
          <h1>{es.asistente.jugadora.titulo}</h1>
          <Campo etiqueta={es.asistente.jugadora.nombre}>
            <input
              className="pixelado"
              value={nombre}
              maxLength={20}
              onChange={(e) => setNombre(e.target.value)}
            />
          </Campo>
          <fieldset
            className="panel pixelado"
            style={{ border: '3px solid var(--borde)', marginBottom: 14 }}
          >
            <legend>{es.asistente.jugadora.ojoAmbliope}</legend>
            {OJOS.map((o) => (
              <label key={o} style={{ display: 'block', marginBottom: 8 }}>
                <input
                  type="radio"
                  name="ojo"
                  checked={ojo === o}
                  onChange={() => setOjo(o)}
                  style={{ minHeight: 'auto', marginRight: 8 }}
                />
                {nombreDeOjo(o)}
              </label>
            ))}
            <p style={{ margin: 0, color: 'var(--texto-tenue)' }}>{es.asistente.jugadora.nota}</p>
          </fieldset>
          <button className="pixelado" onClick={confirmarJugadora}>
            {es.comun.continuar}
          </button>
        </>
      )}

      {paso === 'pantalla' && (
        <>
          <h1>{es.asistente.pantalla.titulo}</h1>
          <p>{es.asistente.pantalla.explicacion}</p>
          <p style={{ color: 'var(--texto-tenue)' }}>{es.asistente.pantalla.recomendado}</p>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            {alCalibrarPantalla && (
              <button className="pixelado" onClick={alCalibrarPantalla}>
                {es.comun.ahora}
              </button>
            )}
            <button className="pixelado secundario" onClick={avanzar}>
              {es.comun.despues}
            </button>
          </div>
        </>
      )}

      {paso === 'lentes' && (
        <>
          <h1>{es.asistente.lentes.titulo}</h1>
          <p>{es.asistente.lentes.pregunta}</p>
          <p style={{ color: 'var(--texto-tenue)' }}>{es.asistente.lentes.nota}</p>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 14 }}>
            <button className="pixelado" onClick={() => confirmarLentes(true)}>
              {es.asistente.lentes.tieneSi}
            </button>
            <button className="pixelado secundario" onClick={() => confirmarLentes(false)}>
              {es.asistente.lentes.tieneNo}
            </button>
          </div>
          {tieneLentes === false && <p>{es.asistente.lentes.sinLentes}</p>}
          {tieneLentes !== null && (
            <button className="pixelado" onClick={avanzar}>
              {es.comun.continuar}
            </button>
          )}
        </>
      )}

      {paso === 'tiempos' && (
        <>
          <h1>{es.asistente.tiempos.titulo}</h1>
          <Campo etiqueta={es.asistente.tiempos.metaDiaria}>
            <input
              className="pixelado"
              type="number"
              min={5}
              max={120}
              value={meta}
              onChange={(e) => setMeta(Number(e.target.value))}
            />
          </Campo>
          <Campo etiqueta={es.asistente.tiempos.maxDiario}>
            <input
              className="pixelado"
              type="number"
              min={5}
              max={180}
              value={maximo}
              onChange={(e) => setMaximo(Number(e.target.value))}
            />
          </Campo>
          <p style={{ color: 'var(--texto-tenue)' }}>{es.asistente.tiempos.nota}</p>
          {errorTiempos && <Error_>{errorTiempos}</Error_>}
          <button className="pixelado" onClick={confirmarTiempos}>
            {es.comun.continuar}
          </button>
        </>
      )}

      {paso === 'avatar' && (
        <>
          <h1>{es.asistente.avatar.titulo}</h1>
          <p>{es.asistente.avatar.explicacion}</p>

          <h2>{es.asistente.avatar.casco}</h2>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 18 }}>
            {CASCOS.map((a) => (
              <button
                key={a.id}
                className={casco === a.id ? 'pixelado' : 'pixelado secundario'}
                onClick={() => setCasco(a.id)}
                aria-pressed={casco === a.id}
              >
                {es.articulos[a.id]}
              </button>
            ))}
          </div>

          <h2>{es.asistente.avatar.traje}</h2>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 18 }}>
            {TRAJES.map((a) => (
              <button
                key={a.id}
                className={traje === a.id ? 'pixelado' : 'pixelado secundario'}
                onClick={() => setTraje(a.id)}
                aria-pressed={traje === a.id}
                style={{ borderColor: a.color }}
              >
                <span
                  aria-hidden
                  style={{
                    display: 'inline-block',
                    width: 18,
                    height: 18,
                    background: a.color,
                    marginRight: 8,
                    verticalAlign: '-2px',
                  }}
                />
                {es.articulos[a.id]}
              </button>
            ))}
          </div>

          <button className="pixelado" onClick={terminar}>
            {es.asistente.terminar}
          </button>
        </>
      )}
    </main>
  );
}
