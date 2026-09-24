/**
 * Z y X también pulsan el botón que tiene el foco, igual que Enter y la barra
 * espaciadora: así las teclas gemelas de los juegos sirven entre nivel y nivel.
 */
import { useEffect } from 'react';
import { teclaDe } from '../games/comun';

export function useTeclasGemelas(): void {
  useEffect(() => {
    const alTeclado = (evento: KeyboardEvent) => {
      if (teclaDe(evento) === evento.key) return;
      const enfocado = document.activeElement;
      if (!(enfocado instanceof HTMLButtonElement) || enfocado.disabled) return;
      evento.preventDefault();
      enfocado.click();
    };
    window.addEventListener('keydown', alTeclado);
    return () => window.removeEventListener('keydown', alTeclado);
  }, []);
}
