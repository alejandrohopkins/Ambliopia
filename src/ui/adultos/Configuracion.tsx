/** Configuración: todo lo que un adulto puede ajustar del tratamiento. */
import type { Modo, Ojo } from '../../config';
import { config } from '../../config';
import { es, nombreDeOjo } from '../../i18n/es';
import { useEstado } from '../../storage/contexto';
import { lentesCalibrados } from '../../storage/esquema';
import { hoyDelJuego } from '../reloj';
import { Campo } from '../componentes/Campo';

const OJOS: Ojo[] = ['derecho', 'izquierdo'];
const MODOS: Modo[] = ['parche', 'lentes'];

export function Configuracion() {
  const { estado, despachar } = useEstado();
  const { ajustes, perfil, balance } = estado;
  const hoy = hoyDelJuego();
  const hayLentes = lentesCalibrados(estado.calibracion);
  const extra = estado.extraDelDia?.fecha === hoy ? estado.extraDelDia.minutos : 0;

  const cambiar = (cambios: Partial<typeof ajustes>) =>
    despachar({ tipo: 'ajustes/actualizar', cambios });

  function alternarModo(modo: Modo) {
    const permitidos = ajustes.modosPermitidos.includes(modo)
      ? ajustes.modosPermitidos.filter((m) => m !== modo)
      : [...ajustes.modosPermitidos, modo];
    // Siempre tiene que quedar al menos un modo disponible.
    cambiar({ modosPermitidos: permitidos.length > 0 ? permitidos : [modo] });
  }

  return (
    <section style={{ display: 'grid', gap: 18 }}>
      <div className="panel pixelado">
        <Campo etiqueta={es.adultos.configuracion.nombre}>
          <input
            className="pixelado"
            value={perfil.nombre}
            maxLength={20}
            onChange={(e) => despachar({ tipo: 'perfil/actualizar', cambios: { nombre: e.target.value } })}
          />
        </Campo>

        <fieldset className="pixelado" style={{ border: '3px solid var(--borde)' }}>
          <legend>{es.adultos.configuracion.ojoAmbliope}</legend>
          {OJOS.map((ojo) => (
            <label key={ojo} style={{ marginRight: 16 }}>
              <input
                type="radio"
                name="ojoAmbliope"
                checked={perfil.ojoAmbliope === ojo}
                onChange={() => despachar({ tipo: 'perfil/actualizar', cambios: { ojoAmbliope: ojo } })}
                style={{ minHeight: 'auto', marginRight: 6 }}
              />
              {nombreDeOjo(ojo)}
            </label>
          ))}
        </fieldset>
      </div>

      <div className="panel pixelado">
        <Numero
          etiqueta={es.adultos.configuracion.metaDiaria}
          valor={ajustes.metaDiariaMin}
          min={5}
          max={120}
          alCambiar={(metaDiariaMin) => cambiar({ metaDiariaMin })}
        />
        <Numero
          etiqueta={es.adultos.configuracion.maxDiario}
          valor={ajustes.maxDiarioMin}
          min={ajustes.metaDiariaMin}
          max={180}
          alCambiar={(maxDiarioMin) => cambiar({ maxDiarioMin })}
        />
        <Numero
          etiqueta={es.adultos.configuracion.descansoCada}
          valor={ajustes.descansoCadaMin}
          min={5}
          max={60}
          alCambiar={(descansoCadaMin) => cambiar({ descansoCadaMin })}
        />
        <Numero
          etiqueta={es.adultos.configuracion.distancia}
          valor={ajustes.distanciaCm}
          min={20}
          max={120}
          alCambiar={(distanciaCm) => cambiar({ distanciaCm })}
        />
        <p>
          <button
            className="pixelado secundario"
            onClick={() =>
              despachar({ tipo: 'extra/conceder', dia: hoy, minutos: config.sesion.extensionMin })
            }
          >
            {es.adultos.configuracion.extender(config.sesion.extensionMin)}
          </button>
          {extra > 0 && (
            <span className="numero" style={{ marginLeft: 10 }}>
              {es.adultos.configuracion.extendido(extra)}
            </span>
          )}
        </p>
      </div>

      <div className="panel pixelado">
        <fieldset className="pixelado" style={{ border: '3px solid var(--borde)' }}>
          <legend>{es.adultos.configuracion.modosPermitidos}</legend>
          {MODOS.map((modo) => (
            <label key={modo} style={{ marginRight: 16 }}>
              <input
                type="checkbox"
                checked={ajustes.modosPermitidos.includes(modo)}
                disabled={modo === 'lentes' && !hayLentes}
                onChange={() => alternarModo(modo)}
                style={{ minHeight: 'auto', marginRight: 6 }}
              />
              {es.nombreDeModo(modo)}
            </label>
          ))}
        </fieldset>

        <Campo etiqueta={es.adultos.configuracion.modoFijo}>
          <select
            className="pixelado"
            value={ajustes.modoFijo ?? ''}
            onChange={(e) => cambiar({ modoFijo: (e.target.value || null) as Modo | null })}
          >
            <option value="">{es.adultos.configuracion.sinModoFijo}</option>
            {MODOS.filter((m) => ajustes.modosPermitidos.includes(m)).map((m) => (
              <option key={m} value={m}>
                {es.nombreDeModo(m)}
              </option>
            ))}
          </select>
        </Campo>
      </div>

      <div className="panel pixelado">
        <label style={{ display: 'block', marginBottom: 10 }}>
          <input
            type="checkbox"
            checked={balance.automatico}
            onChange={(e) => despachar({ tipo: 'balance/automatico', automatico: e.target.checked })}
            style={{ minHeight: 'auto', marginRight: 8 }}
          />
          {es.adultos.configuracion.balanceAutomatico}
        </label>

        <Campo etiqueta={es.adultos.configuracion.balanceManual}>
          <input
            type="range"
            min={config.balance.minimo}
            max={config.balance.maximo}
            step={0.05}
            value={balance.contrasteOjoDominante}
            disabled={balance.automatico}
            onChange={(e) =>
              despachar({
                tipo: 'balance/fijar',
                valor: Number(e.target.value),
                dia: hoy,
                motivo: 'manual',
              })
            }
            style={{ width: '100%', minHeight: 'auto' }}
          />
        </Campo>
        <p className="numero">{balance.contrasteOjoDominante.toFixed(2)}</p>

        {balance.historial.length > 0 && (
          <>
            <h3 style={{ fontSize: 17 }}>{es.adultos.configuracion.historialDeBalance}</h3>
            <ul style={{ margin: 0, paddingLeft: 20, color: 'var(--texto-tenue)', fontSize: 15 }}>
              {[...balance.historial].reverse().slice(0, 12).map((entrada, i) => (
                <li key={`${entrada.fecha}-${i}`}>
                  {entrada.fecha} · {entrada.valor.toFixed(2)} · {entrada.motivo}
                </li>
              ))}
            </ul>
          </>
        )}
      </div>

      <div className="panel pixelado">
        <Interruptor
          etiqueta={es.adultos.configuracion.sonido}
          valor={ajustes.sonido}
          alCambiar={(sonido) => cambiar({ sonido })}
        />
        <Interruptor
          etiqueta={es.adultos.configuracion.musica}
          valor={ajustes.musica}
          alCambiar={(musica) => cambiar({ musica })}
        />
        <Campo etiqueta={es.adultos.configuracion.volumen}>
          <input
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={ajustes.volumen}
            onChange={(e) => cambiar({ volumen: Number(e.target.value) })}
            style={{ width: '100%', minHeight: 'auto' }}
          />
        </Campo>
        <Interruptor
          etiqueta={es.adultos.configuracion.reducirMovimiento}
          valor={ajustes.reducirMovimiento}
          alCambiar={(reducirMovimiento) => cambiar({ reducirMovimiento })}
        />
      </div>
    </section>
  );
}

function Numero({
  etiqueta,
  valor,
  min,
  max,
  alCambiar,
}: {
  etiqueta: string;
  valor: number;
  min: number;
  max: number;
  alCambiar: (valor: number) => void;
}) {
  return (
    <Campo etiqueta={etiqueta}>
      <input
        className="pixelado"
        type="number"
        min={min}
        max={max}
        value={valor}
        onChange={(e) => alCambiar(Math.max(min, Math.min(max, Number(e.target.value))))}
      />
    </Campo>
  );
}

function Interruptor({
  etiqueta,
  valor,
  alCambiar,
}: {
  etiqueta: string;
  valor: boolean;
  alCambiar: (valor: boolean) => void;
}) {
  return (
    <label style={{ display: 'block', marginBottom: 10 }}>
      <input
        type="checkbox"
        checked={valor}
        onChange={(e) => alCambiar(e.target.checked)}
        style={{ minHeight: 'auto', marginRight: 8 }}
      />
      {etiqueta}
    </label>
  );
}
