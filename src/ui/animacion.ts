/**
 * Piezas de animación de la interfaz: números que cuentan, saltos y sellos.
 * Todo va a saltos de píxel y se queda quieto con «Reducir movimiento».
 */
import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { config } from '../config';
import { useMovimientoReducido } from './movimiento';

/** Duración y retraso de una animación de la hoja base, desde config. */
export function conAnimacion(duracionMs: number, retrasoMs = 0): CSSProperties {
  return { animationDuration: `${duracionMs}ms`, animationDelay: `${retrasoMs}ms` };
}

/**
 * Un número que va a saltos desde `desde` hasta `hasta`, empezando tras
 * `retrasoMs`. Si `hasta` cambia a mitad, sigue desde lo que ya enseña.
 */
export function useCuenta(desde: number, hasta: number, retrasoMs = 0): number {
  const sinMovimiento = useMovimientoReducido();
  const [valor, setValor] = useState(sinMovimiento ? hasta : desde);
  const mostrado = useRef(valor);

  useEffect(() => {
    const origen = mostrado.current;
    if (sinMovimiento || origen === hasta) {
      mostrado.current = hasta;
      setValor(hasta);
      return;
    }
    const { cuentaMs, pasosDeCuenta } = config.animacion;
    const inicio = performance.now() + retrasoMs;
    let id = 0;
    const paso = (ahora: number) => {
      const t = Math.max(0, Math.min(1, (ahora - inicio) / cuentaMs));
      const actual = origen + (hasta - origen) * (Math.floor(t * pasosDeCuenta) / pasosDeCuenta);
      mostrado.current = actual;
      setValor(actual);
      if (t < 1) id = requestAnimationFrame(paso);
    };
    id = requestAnimationFrame(paso);
    return () => cancelAnimationFrame(id);
  }, [hasta, retrasoMs, sinMovimiento]);

  return valor;
}

/** Lo último que se enseñó de cada valor, para contar desde ahí al volver a una pantalla. */
const vistos = new Map<string, number>();

/**
 * Un valor que, al cambiar, cuenta hasta el nuevo. Recuerda lo último
 * enseñado con cada `clave`: al volver a la base, las monedas ganadas suben
 * desde lo que se vio la última vez.
 */
export function useValorAnimado(valor: number, clave: string): { valor: number; antes: number } {
  const [antes] = useState(() => vistos.get(clave) ?? valor);
  useEffect(() => {
    vistos.set(clave, valor);
  }, [clave, valor]);
  return { valor: useCuenta(antes, valor), antes };
}

/** Un salto de píxel: sube y baja a saltos, sin suavizar. */
export function saltar(elemento: HTMLElement | null, retrasoMs = 0): void {
  if (!elemento || typeof elemento.animate !== 'function') return;
  const { saltoMs, pasosDeSalto, alturaDeSaltoPx } = config.animacion;
  elemento.animate(
    [
      { transform: 'translateY(0)' },
      { transform: `translateY(${-alturaDeSaltoPx}px)` },
      { transform: 'translateY(0)' },
    ],
    { duration: saltoMs, delay: retrasoMs, easing: `steps(${pasosDeSalto}, end)` },
  );
}

/**
 * Hace saltar el elemento de la referencia cada vez que cambia `disparador`
 * (si no es 0, false ni null).
 */
export function useSalto<T extends HTMLElement>(disparador: unknown, retrasoMs = 0) {
  const referencia = useRef<T>(null);
  const sinMovimiento = useMovimientoReducido();
  useEffect(() => {
    if (disparador && !sinMovimiento) saltar(referencia.current, retrasoMs);
    // Solo el disparador cuenta: un cambio de ajustes no hace saltar.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [disparador]);
  return referencia;
}
