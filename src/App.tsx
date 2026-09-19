import { useState } from 'react';
import type { IdJuego, Modo } from './config';
import { es } from './i18n/es';
import { ProveedorDeEstado, useEstado } from './storage/contexto';
import { modosDisponibles } from './storage/selectores';
import { AsistenteInicial } from './ui/AsistenteInicial';
import { ChequeoPrevio } from './ui/ChequeoPrevio';
import { Base } from './ui/base/Base';
import { CalibracionDePantalla } from './calibration/CalibracionDePantalla';
import { CalibracionDeLentes } from './calibration/CalibracionDeLentes';
import type { Pantalla } from './ui/navegacion';

/** Pantallas de calibración: se pueden abrir desde el asistente o desde el panel. */
type Calibrando = 'pantalla' | 'lentes' | null;

export function App() {
  return (
    <ProveedorDeEstado>
      <Rutas />
    </ProveedorDeEstado>
  );
}

function Rutas() {
  const { estado } = useEstado();
  const [pantalla, setPantalla] = useState<Pantalla>('base');
  const [modo, setModo] = useState<Modo>(modosDisponibles(estado)[0] ?? 'parche');
  const [juego, setJuego] = useState<IdJuego | null>(null);
  const [calibrando, setCalibrando] = useState<Calibrando>(null);

  if (calibrando === 'pantalla') {
    return <CalibracionDePantalla alTerminar={() => setCalibrando(null)} />;
  }
  if (calibrando === 'lentes') {
    return <CalibracionDeLentes alTerminar={() => setCalibrando(null)} />;
  }

  if (!estado.asistenteCompletado) {
    return (
      <AsistenteInicial
        alCalibrarPantalla={() => setCalibrando('pantalla')}
        alCalibrarLentes={() => setCalibrando('lentes')}
      />
    );
  }

  if (pantalla === 'base') {
    return (
      <Base
        modo={modo}
        alCambiarModo={setModo}
        alIr={setPantalla}
        alEmpezar={(elegido) => {
          setJuego(elegido ?? null);
          setPantalla('chequeo');
        }}
      />
    );
  }

  if (pantalla === 'chequeo') {
    return (
      <ChequeoPrevio
        modo={modo}
        alAprobar={() => setPantalla(juego ? 'juego' : 'elegirJuego')}
        alRecalibrar={() => setCalibrando('lentes')}
        alCancelar={() => setPantalla('base')}
      />
    );
  }

  // Las demás pantallas llegan en fases posteriores.
  return (
    <main style={{ padding: 24 }}>
      <h1>{pantalla}</h1>
      {juego && <p>{es.juegos[juego]}</p>}
      <button className="pixelado" onClick={() => setPantalla('base')}>
        {es.comun.volverALaBase}
      </button>
    </main>
  );
}
