import { useState } from 'react';
import type { IdJuego, Modo } from './config';
import { es } from './i18n/es';
import { ProveedorDeEstado, useEstado } from './storage/contexto';
import { modosDisponibles } from './storage/selectores';
import { AsistenteInicial } from './ui/AsistenteInicial';
import { Base } from './ui/base/Base';
import type { Pantalla } from './ui/navegacion';

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

  if (!estado.asistenteCompletado) return <AsistenteInicial />;

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
