/**
 * Mantiene el audio al día con los ajustes del panel y con el interruptor de
 * la base. La música solo arranca tras un gesto de la jugadora.
 */
import { useEffect } from 'react';
import { audio } from '../engine/audio';
import { useEstado } from '../storage/contexto';

export function useAudio(): void {
  const { estado } = useEstado();
  const { sonido, musica, volumen } = estado.ajustes;

  useEffect(() => {
    audio().actualizar({ sonido, musica, volumen });
  }, [sonido, musica, volumen]);

  useEffect(() => {
    if (!musica || !sonido) return;
    const arrancar = () => audio().iniciarMusica();
    window.addEventListener('pointerdown', arrancar, { once: true });
    window.addEventListener('keydown', arrancar, { once: true });
    return () => {
      window.removeEventListener('pointerdown', arrancar);
      window.removeEventListener('keydown', arrancar);
      audio().pararMusica();
    };
  }, [musica, sonido]);
}
