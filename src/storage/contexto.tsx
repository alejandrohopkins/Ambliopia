/**
 * Contexto de estado de la app: React Context + useReducer, sin librerías externas.
 * Guarda en localStorage tras cada cambio y cada 30 s mientras la app está abierta.
 */
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { config } from '../config';
import { cargar, guardar, type ResultadoDeGuardado } from './almacen';
import { reducir, type Accion } from './acciones';
import type { Estado } from './esquema';

interface Contexto {
  estado: Estado;
  despachar: (accion: Accion) => void;
  /** Último problema de guardado, para avisar en el panel de adultos. */
  problemaDeGuardado: ResultadoDeGuardado['motivo'] | null;
}

const ContextoEstado = createContext<Contexto | null>(null);

export function ProveedorDeEstado({
  children,
  estadoInicialDePrueba,
}: {
  children: ReactNode;
  estadoInicialDePrueba?: Estado;
}) {
  const [estado, despachar] = useReducer(reducir, estadoInicialDePrueba ?? null, (inicial) =>
    inicial ? inicial : cargar(),
  );
  const [problemaDeGuardado, setProblema] = useState<ResultadoDeGuardado['motivo'] | null>(null);
  const ultimo = useRef(estado);
  ultimo.current = estado;

  // Guardado tras cada cambio.
  useEffect(() => {
    const resultado = guardar(estado);
    setProblema(resultado.ok ? null : (resultado.motivo ?? 'desconocido'));
  }, [estado]);

  // Guardado periódico de respaldo mientras la app está abierta.
  useEffect(() => {
    const id = setInterval(() => {
      guardar(ultimo.current);
    }, config.almacenamiento.guardadoPeriodicoMs);
    return () => clearInterval(id);
  }, []);

  // Guardar también al esconder la pestaña o cerrar.
  useEffect(() => {
    const alOcultar = () => {
      if (document.visibilityState === 'hidden') guardar(ultimo.current);
    };
    document.addEventListener('visibilitychange', alOcultar);
    window.addEventListener('pagehide', alOcultar);
    return () => {
      document.removeEventListener('visibilitychange', alOcultar);
      window.removeEventListener('pagehide', alOcultar);
    };
  }, []);

  const valor = useMemo(
    () => ({ estado, despachar, problemaDeGuardado }),
    [estado, problemaDeGuardado],
  );

  return <ContextoEstado.Provider value={valor}>{children}</ContextoEstado.Provider>;
}

export function useEstado(): Contexto {
  const contexto = useContext(ContextoEstado);
  if (!contexto) throw new Error('useEstado necesita estar dentro de ProveedorDeEstado');
  return contexto;
}
