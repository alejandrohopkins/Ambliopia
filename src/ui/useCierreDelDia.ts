/**
 * Ejecuta el cierre del día al abrir la app y cada vez que cambia el día
 * "de hoy" (incluido el salto que provoca el overlay de desarrollo). Lo que
 * se gana queda apuntado para la tarjeta de premios.
 */
import { useEffect } from 'react';
import { useEstado } from '../storage/contexto';
import { cerrarYApuntar } from '../rewards/premiosPorVer';
import { hoyDelJuego } from './reloj';

export function useCierreDelDia(dia: string): void {
  const { estado, despachar } = useEstado();

  useEffect(() => {
    const siguiente = cerrarYApuntar(estado, dia || hoyDelJuego());
    if (siguiente !== estado) despachar({ tipo: 'reemplazar', estado: siguiente });
    // El cierre solo depende del día; el estado se lee en el momento de correr.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dia]);
}
