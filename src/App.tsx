import { useState } from 'react';
import type { IdJuego, Modo } from './config';
import { es } from './i18n/es';
import { ProveedorDeEstado, useEstado } from './storage/contexto';
import { limiteAlcanzado, modosDisponibles } from './storage/selectores';
import { AsistenteInicial } from './ui/AsistenteInicial';
import { ChequeoPrevio } from './ui/ChequeoPrevio';
import { Descanso } from './ui/Descanso';
import { LimiteDiario } from './ui/LimiteDiario';
import { Base } from './ui/base/Base';
import { CalibracionDePantalla } from './calibration/CalibracionDePantalla';
import { CalibracionDeLentes } from './calibration/CalibracionDeLentes';
import { OverlayDeDesarrollo } from './ui/componentes/OverlayDeDesarrollo';
import { modoDesarrollo, type Pantalla } from './ui/navegacion';
import { avanzarUnDiaDeDesarrollo, hoyDelJuego } from './ui/reloj';
import { useCierreDelDia } from './ui/useCierreDelDia';

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
  const [dia, setDia] = useState(hoyDelJuego());
  const [pantalla, setPantalla] = useState<Pantalla>('base');
  const [modo, setModo] = useState<Modo>(modosDisponibles(estado)[0] ?? 'parche');
  const [juego, setJuego] = useState<IdJuego | null>(null);
  const [calibrando, setCalibrando] = useState<Calibrando>(null);

  useCierreDelDia(dia);

  const desarrollo = modoDesarrollo();
  const overlay = desarrollo ? (
    <OverlayDeDesarrollo
      datos={{
        fps: 0,
        minutosActivos: 0,
        motivoDeParada: 'sinJuego',
        escaleras: [],
        renderer: null,
        modo,
      }}
      alSimularDiaSiguiente={() => {
        if (avanzarUnDiaDeDesarrollo()) setDia(hoyDelJuego());
      }}
    />
  ) : null;

  return (
    <>
      {overlay}
      <Contenido
        dia={dia}
        pantalla={pantalla}
        setPantalla={setPantalla}
        modo={modo}
        setModo={setModo}
        juego={juego}
        setJuego={setJuego}
        calibrando={calibrando}
        setCalibrando={setCalibrando}
      />
    </>
  );
}

interface PropsDeContenido {
  dia: string;
  pantalla: Pantalla;
  setPantalla: (p: Pantalla) => void;
  modo: Modo;
  setModo: (m: Modo) => void;
  juego: IdJuego | null;
  setJuego: (j: IdJuego | null) => void;
  calibrando: Calibrando;
  setCalibrando: (c: Calibrando) => void;
}

function Contenido(props: PropsDeContenido) {
  const { estado } = useEstado();
  const { dia, pantalla, setPantalla, modo, setModo, juego, setJuego, calibrando, setCalibrando } =
    props;

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
    if (limiteAlcanzado(estado, dia)) return <LimiteDiario alVolver={() => setPantalla('base')} />;
    return (
      <ChequeoPrevio
        modo={modo}
        alAprobar={() => setPantalla(juego ? 'juego' : 'elegirJuego')}
        alRecalibrar={() => setCalibrando('lentes')}
        alCancelar={() => setPantalla('base')}
      />
    );
  }

  if (pantalla === 'descanso') {
    return <Descanso alTerminar={() => setPantalla('base')} />;
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
