/**
 * Calibración de pantalla: convierte píxeles CSS a milímetros para que las
 * métricas sean comparables entre sesiones y dispositivos.
 */
import { useState } from 'react';
import { config } from '../config';
import { es } from '../i18n/es';
import { useEstado } from '../storage/contexto';
import { diaISO } from '../engine/fechas';
import { Campo } from '../ui/componentes/Campo';

const MINIMO = 2;
const MAXIMO = 14;

export function CalibracionDePantalla({ alTerminar }: { alTerminar: () => void }) {
  const { estado, despachar } = useEstado();
  const [pxPorMm, setPxPorMm] = useState(
    estado.calibracion.pxPorMm ?? config.calibracionPantalla.pxPorMmPorDefecto,
  );
  const [distanciaCm, setDistanciaCm] = useState(estado.ajustes.distanciaCm);

  const anchoTarjeta = config.calibracionPantalla.tarjetaAnchoMm * pxPorMm;
  const altoTarjeta = config.calibracionPantalla.tarjetaAltoMm * pxPorMm;

  function guardar() {
    despachar({ tipo: 'calibracion/pantalla', pxPorMm, dia: diaISO() });
    despachar({ tipo: 'ajustes/actualizar', cambios: { distanciaCm } });
    alTerminar();
  }

  return (
    <main style={{ padding: 24, maxWidth: 860, margin: '0 auto' }}>
      <h1>{es.calibracion.pantalla.titulo}</h1>
      <p>{es.calibracion.pantalla.instruccion}</p>

      <div
        aria-hidden
        className="pixelado"
        style={{
          width: anchoTarjeta,
          height: altoTarjeta,
          background: 'var(--polvo-lunar)',
          border: '3px solid var(--ambar-estelar)',
          margin: '18px 0',
          maxWidth: '100%',
        }}
      />

      <Campo etiqueta={es.calibracion.pantalla.control}>
        <input
          type="range"
          min={MINIMO}
          max={MAXIMO}
          step={0.01}
          value={pxPorMm}
          onChange={(e) => setPxPorMm(Number(e.target.value))}
          style={{ width: '100%', minHeight: 'auto' }}
        />
      </Campo>
      <p className="numero">{es.calibracion.pantalla.medida(pxPorMm)}</p>

      <Campo etiqueta={es.calibracion.pantalla.distancia}>
        <input
          className="pixelado"
          type="number"
          min={20}
          max={120}
          value={distanciaCm}
          onChange={(e) => setDistanciaCm(Number(e.target.value))}
        />
      </Campo>
      <p style={{ color: 'var(--texto-tenue)' }}>{es.calibracion.pantalla.distanciaNota}</p>

      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        <button className="pixelado" onClick={guardar}>
          {es.calibracion.pantalla.guardar}
        </button>
        <button className="pixelado secundario" onClick={alTerminar}>
          {es.comun.despues}
        </button>
      </div>
    </main>
  );
}
