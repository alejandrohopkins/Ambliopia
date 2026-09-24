import { useRef, useState } from 'react';
import type { IdJuego, Modo } from './config';
import { es } from './i18n/es';
import { ProveedorDeEstado, useEstado } from './storage/contexto';
import {
  diferenciaDeMarcador,
  limiteAlcanzado,
  marcador,
  modosDisponibles,
  type Marcador,
} from './storage/selectores';
import { AsistenteInicial } from './ui/AsistenteInicial';
import { ChequeoPrevio } from './ui/ChequeoPrevio';
import { Descanso } from './ui/Descanso';
import { LimiteDiario } from './ui/LimiteDiario';
import { Base } from './ui/base/Base';
import { Galeria } from './ui/Galeria';
import { Tienda } from './ui/Tienda';
import { MiAvatar } from './ui/MiAvatar';
import { Insignias } from './ui/Insignias';
import { MisRecords } from './ui/MisRecords';
import { PanelDeAdultos } from './ui/adultos/PanelDeAdultos';
import { ElegirJuego } from './ui/juego/ElegirJuego';
import { PantallaDeJuego } from './ui/juego/PantallaDeJuego';
import { ResumenDeSesion } from './ui/juego/ResumenDeSesion';
import { CalibracionDePantalla } from './calibration/CalibracionDePantalla';
import { CalibracionDeLentes } from './calibration/CalibracionDeLentes';
import { OverlayDeDesarrollo } from './ui/componentes/OverlayDeDesarrollo';
import { BarraDeTiempo } from './ui/componentes/RelojDelDia';
import { AvisoDePremio } from './ui/componentes/PremioDePantalla';
import { modoDesarrollo, useBotonAtras, type Pantalla } from './ui/navegacion';
import { avanzarUnDiaDeDesarrollo, hoyDelJuego } from './ui/reloj';
import { useCierreDelDia } from './ui/useCierreDelDia';
import { useAudio } from './ui/useAudio';
import { useMovimientoReducido } from './ui/movimiento';

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
  useAudio();

  // Atrás cierra lo que esté encima de la base: una calibración, el juego
  // (que pasa por su resumen) o cualquier otra pantalla.
  useBotonAtras(calibrando ?? pantalla, calibrando === null && pantalla === 'base', () => {
    if (calibrando !== null) setCalibrando(null);
    else if (pantalla === 'juego') setPantalla('resumenSesion');
    else setPantalla('base');
  });

  const sinMovimiento = useMovimientoReducido();
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

  // El reloj del día va arriba en las pantallas de la jugadora. El juego pone
  // el suyo; el asistente, las calibraciones y el panel de adultos, ninguno.
  const conReloj =
    estado.asistenteCompletado &&
    calibrando === null &&
    pantalla !== 'juego' &&
    pantalla !== 'adultos';

  return (
    <div className={sinMovimiento ? 'sin-movimiento' : undefined}>
      {overlay}
      {conReloj && <BarraDeTiempo />}
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
      {conReloj && <AvisoDePremio />}
    </div>
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
  // Instantánea de antes de jugar, para el resumen de la sesión.
  const antesDeJugar = useRef<Marcador>(marcador(estado, dia));

  // Durante el asistente, las calibraciones se abren ENCIMA: el asistente
  // sigue montado y no pierde el paso en el que iba.
  if (!estado.asistenteCompletado) {
    return (
      <>
        <div hidden={calibrando !== null}>
          <AsistenteInicial
            alCalibrarPantalla={() => setCalibrando('pantalla')}
            alCalibrarLentes={() => setCalibrando('lentes')}
          />
        </div>
        <Calibracion cual={calibrando} alTerminar={() => setCalibrando(null)} />
      </>
    );
  }

  if (calibrando !== null) {
    return <Calibracion cual={calibrando} alTerminar={() => setCalibrando(null)} />;
  }

  if (pantalla === 'base') {
    return (
      <Base
        modo={modo}
        alCambiarModo={setModo}
        alIr={setPantalla}
        alEmpezar={(elegido) => {
          antesDeJugar.current = marcador(estado, dia);
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

  if (pantalla === 'elegirJuego') {
    return (
      <ElegirJuego
        modo={modo}
        alElegir={(elegido) => {
          setJuego(elegido);
          setPantalla('juego');
        }}
        alVolver={() => setPantalla('base')}
      />
    );
  }

  if (pantalla === 'juego' && juego) {
    return (
      <PantallaDeJuego
        juego={juego}
        modo={modo}
        alVolver={() => setPantalla('resumenSesion')}
        alCancelar={() => setPantalla('base')}
        alElegirOtro={() => setPantalla('elegirJuego')}
        alDescanso={() => setPantalla('descanso')}
        alMolestia={() => setPantalla('base')}
      />
    );
  }

  if (pantalla === 'galeria') return <Galeria alVolver={() => setPantalla('base')} />;
  if (pantalla === 'tienda') return <Tienda alVolver={() => setPantalla('base')} />;
  if (pantalla === 'avatar') return <MiAvatar alVolver={() => setPantalla('base')} />;
  if (pantalla === 'insignias') return <Insignias alVolver={() => setPantalla('base')} />;
  if (pantalla === 'records') return <MisRecords alVolver={() => setPantalla('base')} />;
  if (pantalla === 'adultos') {
    return (
      <PanelDeAdultos alVolver={() => setPantalla('base')} alCalibrar={setCalibrando} />
    );
  }

  if (pantalla === 'descanso') {
    return <Descanso alTerminar={() => setPantalla(juego ? 'juego' : 'base')} />;
  }

  if (pantalla === 'resumenSesion') {
    return (
      <ResumenDeSesion
        datos={diferenciaDeMarcador(antesDeJugar.current, marcador(estado, dia))}
        alVolver={() => setPantalla('base')}
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

/** Las dos pantallas de calibración, compartidas por el asistente y el panel. */
function Calibracion({ cual, alTerminar }: { cual: Calibrando; alTerminar: () => void }) {
  if (cual === 'pantalla') return <CalibracionDePantalla alTerminar={alTerminar} />;
  if (cual === 'lentes') return <CalibracionDeLentes alTerminar={alTerminar} />;
  return null;
}
