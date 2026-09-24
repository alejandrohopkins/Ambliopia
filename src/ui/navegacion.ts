/** Navegación por estado de pantalla: sin router, sin dependencias. */
import { useEffect, useRef } from 'react';

export type Pantalla =
  | 'asistente'
  | 'base'
  | 'chequeo'
  | 'elegirJuego'
  | 'juego'
  | 'finNivel'
  | 'resumenSesion'
  | 'descanso'
  | 'tienda'
  | 'avatar'
  | 'insignias'
  | 'galeria'
  | 'records'
  | 'adultos';

/** El modo de desarrollo se activa con ?debug=1. */
export function modoDesarrollo(): boolean {
  if (typeof window === 'undefined') return false;
  return new URLSearchParams(window.location.search).get('debug') === '1';
}

interface EstadoDeHistorial {
  encima?: boolean;
}

/**
 * Botón atrás del navegador, y el gesto atrás de la tablet. El historial
 * tiene como mucho dos entradas: la base y la pantalla abierta encima. Atrás
 * cierra la de encima (`alAtras`) en vez de salir de la app.
 */
export function useBotonAtras(pantalla: string, enLaBase: boolean, alAtras: () => void): void {
  const alAtrasActual = useRef(alAtras);
  alAtrasActual.current = alAtras;

  useEffect(() => {
    const encima = (window.history.state as EstadoDeHistorial | null)?.encima === true;
    if (enLaBase && encima) window.history.back();
    else if (!enLaBase && !encima) window.history.pushState({ encima: true }, '');
  }, [pantalla, enLaBase]);

  useEffect(() => {
    const alRetroceder = (evento: PopStateEvent) => {
      // «Adelante» hacia una pantalla ya cerrada: no se vuelve a abrir.
      if ((evento.state as EstadoDeHistorial | null)?.encima) {
        window.history.back();
        return;
      }
      alAtrasActual.current();
    };
    window.addEventListener('popstate', alRetroceder);
    return () => window.removeEventListener('popstate', alRetroceder);
  }, []);
}
