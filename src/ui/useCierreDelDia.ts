/**
 * Ejecuta el cierre del día al abrir la app y cada vez que cambia el día
 * "de hoy" (incluido el salto que provoca el overlay de desarrollo).
 */
import { useEffect } from 'react';
import { cerrarDias, hayCierrePendiente } from '../engine/dayClose';
import { useEstado } from '../storage/contexto';
import { hoyDelJuego } from './reloj';

export function useCierreDelDia(dia: string): void {
  const { estado, despachar } = useEstado();

  useEffect(() => {
    const hoy = dia || hoyDelJuego();
    if (estado.ultimoCierre !== null && !hayCierrePendiente(estado, hoy)) return;
    const { estado: cerrado } = cerrarDias(estado, { hoy });
    if (cerrado !== estado) despachar({ tipo: 'reemplazar', estado: cerrado });
    // El cierre solo depende del día; el estado se lee en el momento de correr.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dia]);
}
