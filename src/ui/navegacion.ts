/** Navegación por estado de pantalla: sin router, sin dependencias. */
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
