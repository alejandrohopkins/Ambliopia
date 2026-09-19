/**
 * Ejecuta el cierre del día al abrir la app y cada vez que cambia el día
 * "de hoy" (incluido el salto que provoca el overlay de desarrollo).
 */
import { useEffect } from 'react';
import { cerrarDias, hayCierrePendiente } from '../engine/dayClose';
import { useEstado } from '../storage/contexto';
import { asegurarMision, cobrarDia, otorgarInsignias } from '../rewards/premiosDelDia';
import { hoyDelJuego } from './reloj';

export function useCierreDelDia(dia: string): void {
  const { estado, despachar } = useEstado();

  useEffect(() => {
    const hoy = dia || hoyDelJuego();
    const pendiente = estado.ultimoCierre === null || hayCierrePendiente(estado, hoy);

    // Aunque no haya día que cerrar, la misión de hoy tiene que existir.
    if (!pendiente) {
      const conMision = otorgarInsignias(asegurarMision(estado, hoy), hoy);
      if (conMision !== estado) despachar({ tipo: 'reemplazar', estado: conMision });
      return;
    }

    const { estado: cerrado } = cerrarDias(estado, {
      hoy,
      alCerrarDia: (parcial, diaCerrado) => cobrarDia(parcial, diaCerrado).estado,
    });
    const conMision = asegurarMision(cerrado, hoy);
    if (conMision !== estado) despachar({ tipo: 'reemplazar', estado: conMision });
    // El cierre solo depende del día; el estado se lee en el momento de correr.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dia]);
}
