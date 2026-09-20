/**
 * Un solo sitio decide si la app se mueve: el interruptor "Reducir movimiento"
 * del panel de adultos o la preferencia del sistema.
 */
import { useEffect, useState } from 'react';
import { useEstado } from '../storage/contexto';

export function prefiereMenosMovimiento(): boolean {
  if (typeof window === 'undefined' || !window.matchMedia) return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export function useMovimientoReducido(): boolean {
  const { estado } = useEstado();
  const [delSistema, setDelSistema] = useState(prefiereMenosMovimiento);

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const consulta = window.matchMedia('(prefers-reduced-motion: reduce)');
    const alCambiar = () => setDelSistema(consulta.matches);
    consulta.addEventListener('change', alCambiar);
    return () => consulta.removeEventListener('change', alCambiar);
  }, []);

  return estado.ajustes.reducirMovimiento || delSistema;
}
