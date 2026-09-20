/**
 * Sonidos sintetizados con Web Audio API. Sin archivos de audio: todo se
 * genera por código, igual que el arte.
 *
 * El contexto se crea en la primera interacción, que es cuando los navegadores
 * permiten sonar. Si el navegador no trae Web Audio, la app funciona igual y
 * simplemente no suena.
 */
import { config } from '../config';

export type Efecto = 'acierto' | 'fallo' | 'monedas' | 'nivel' | 'compra' | 'insignia';

interface Nota {
  /** Frecuencia en hercios. */
  hz: number;
  /** Cuándo empieza, en segundos desde el disparo. */
  desde: number;
  /** Cuánto dura, en segundos. */
  dura: number;
  tipo?: OscillatorType;
  /** Volumen relativo dentro del efecto. */
  ganancia?: number;
}

/** Notas de cada efecto. Arriba suena a logro; abajo, a "casi". */
const EFECTOS: Record<Efecto, Nota[]> = {
  // Arpegio corto ascendente.
  acierto: [
    { hz: 523.25, desde: 0, dura: 0.08 },
    { hz: 659.25, desde: 0.07, dura: 0.08 },
    { hz: 783.99, desde: 0.14, dura: 0.12 },
  ],
  // Tono suave descendente: nunca un zumbido de error.
  fallo: [
    { hz: 392.0, desde: 0, dura: 0.12, tipo: 'sine' },
    { hz: 329.63, desde: 0.1, dura: 0.18, tipo: 'sine' },
  ],
  // Tintineo de monedas.
  monedas: [
    { hz: 1046.5, desde: 0, dura: 0.05, ganancia: 0.6 },
    { hz: 1318.51, desde: 0.05, dura: 0.05, ganancia: 0.5 },
    { hz: 1567.98, desde: 0.1, dura: 0.09, ganancia: 0.45 },
  ],
  // Fanfarria corta de 8 bits.
  nivel: [
    { hz: 523.25, desde: 0, dura: 0.1 },
    { hz: 659.25, desde: 0.1, dura: 0.1 },
    { hz: 783.99, desde: 0.2, dura: 0.1 },
    { hz: 1046.5, desde: 0.3, dura: 0.26 },
    { hz: 783.99, desde: 0.3, dura: 0.26, ganancia: 0.4 },
  ],
  // Caja registradora pixel.
  compra: [
    { hz: 880.0, desde: 0, dura: 0.06 },
    { hz: 1174.66, desde: 0.06, dura: 0.14 },
    { hz: 587.33, desde: 0.06, dura: 0.14, ganancia: 0.35 },
  ],
  insignia: [
    { hz: 659.25, desde: 0, dura: 0.09 },
    { hz: 987.77, desde: 0.09, dura: 0.09 },
    { hz: 1318.51, desde: 0.18, dura: 0.22 },
  ],
};

export interface OpcionesDeAudio {
  sonido: boolean;
  musica: boolean;
  volumen: number;
}

/** Duración total de un efecto, en segundos. */
export function duracionDeEfecto(efecto: Efecto): number {
  return Math.max(...EFECTOS[efecto].map((n) => n.desde + n.dura));
}

export function notasDeEfecto(efecto: Efecto): Nota[] {
  return EFECTOS[efecto];
}

/** El arpegio de acierto sube y el de fallo baja: se oye sin pensarlo. */
export function subeDeTono(efecto: Efecto): boolean {
  const notas = EFECTOS[efecto];
  return notas[notas.length - 1].hz > notas[0].hz;
}

type ConstructorDeContexto = new () => AudioContext;

export class Audio {
  private contexto: AudioContext | null = null;
  private maestro: GainNode | null = null;
  private musicaActiva: { parar: () => void } | null = null;
  private opciones: OpcionesDeAudio;

  constructor(opciones: OpcionesDeAudio) {
    this.opciones = opciones;
  }

  actualizar(opciones: Partial<OpcionesDeAudio>): void {
    this.opciones = { ...this.opciones, ...opciones };
    if (this.maestro && this.contexto) {
      this.maestro.gain.setValueAtTime(this.volumen, this.contexto.currentTime);
    }
    if (!this.opciones.musica) this.pararMusica();
  }

  private get volumen(): number {
    return this.opciones.sonido ? Math.max(0, Math.min(1, this.opciones.volumen)) : 0;
  }

  /** Crea el contexto la primera vez. Debe llamarse desde un gesto del usuario. */
  private asegurarContexto(): AudioContext | null {
    if (this.contexto) return this.contexto;
    const Constructor = (globalThis as { AudioContext?: ConstructorDeContexto }).AudioContext;
    if (!Constructor) return null;
    try {
      this.contexto = new Constructor();
      this.maestro = this.contexto.createGain();
      this.maestro.gain.value = this.volumen;
      this.maestro.connect(this.contexto.destination);
      return this.contexto;
    } catch {
      return null;
    }
  }

  reproducir(efecto: Efecto): void {
    if (!this.opciones.sonido) return;
    const contexto = this.asegurarContexto();
    if (!contexto || !this.maestro) return;
    if (contexto.state === 'suspended') void contexto.resume();

    const ahora = contexto.currentTime;
    for (const nota of EFECTOS[efecto]) {
      this.sonarNota(contexto, this.maestro, nota, ahora);
    }
  }

  private sonarNota(contexto: AudioContext, salida: GainNode, nota: Nota, ahora: number): void {
    const oscilador = contexto.createOscillator();
    const ganancia = contexto.createGain();
    oscilador.type = nota.tipo ?? 'square';
    oscilador.frequency.setValueAtTime(nota.hz, ahora + nota.desde);

    // Envolvente suave: sin clics ni saltos bruscos de volumen.
    const pico = (nota.ganancia ?? 0.5) * 0.35;
    ganancia.gain.setValueAtTime(0.0001, ahora + nota.desde);
    ganancia.gain.exponentialRampToValueAtTime(pico, ahora + nota.desde + 0.012);
    ganancia.gain.exponentialRampToValueAtTime(0.0001, ahora + nota.desde + nota.dura);

    oscilador.connect(ganancia);
    ganancia.connect(salida);
    oscilador.start(ahora + nota.desde);
    oscilador.stop(ahora + nota.desde + nota.dura + 0.02);
  }

  /** Bucle chiptune tranquilo. Apagado por defecto. */
  iniciarMusica(): void {
    if (!this.opciones.musica || !this.opciones.sonido || this.musicaActiva) return;
    const contexto = this.asegurarContexto();
    if (!contexto || !this.maestro) return;

    const notas = [261.63, 329.63, 392.0, 329.63, 293.66, 349.23, 440.0, 349.23];
    const duracion = 0.55;
    let indice = 0;
    let vivo = true;

    const siguiente = () => {
      if (!vivo || !this.maestro) return;
      this.sonarNota(
        contexto,
        this.maestro,
        { hz: notas[indice % notas.length], desde: 0, dura: duracion * 0.8, tipo: 'triangle', ganancia: 0.22 },
        contexto.currentTime,
      );
      indice += 1;
      temporizador = setTimeout(siguiente, duracion * 1000);
    };

    let temporizador = setTimeout(siguiente, 0);
    this.musicaActiva = {
      parar: () => {
        vivo = false;
        clearTimeout(temporizador);
      },
    };
  }

  pararMusica(): void {
    this.musicaActiva?.parar();
    this.musicaActiva = null;
  }

  destruir(): void {
    this.pararMusica();
    void this.contexto?.close();
    this.contexto = null;
    this.maestro = null;
  }
}

/** Instancia única de la app. */
let instancia: Audio | null = null;

export function audio(): Audio {
  if (!instancia) {
    instancia = new Audio({
      sonido: config.audio.sonidoPorDefecto,
      musica: config.audio.musicaPorDefecto,
      volumen: config.audio.volumenPorDefecto,
    });
  }
  return instancia;
}
