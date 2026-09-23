/**
 * Contrato común de los minijuegos. La base, las métricas y las recompensas
 * hablan con esta interfaz, nunca con cada juego por separado.
 */
import type { config as Config, IdJuego, Modo, Ojo } from '../config';
import type { EquipoDeJuego } from '../avatar/enJuego';
import type { DichopticRenderer } from '../engine/DichopticRenderer';
import type { Staircase, ConfigDeEscalera } from '../engine/Staircase';

export interface ResultadoDeEnsayo {
  juego: IdJuego;
  modo: Modo;
  /** Clave del parámetro medido: 'tamano', 'contraste', 'diametro:1.2'… */
  parametro: string;
  valor: number;
  acierto: boolean;
  tiempoReaccionMs: number;
  esEnsayoDeConfianza: boolean;
  /**
   * Detalle propio del juego, para los contadores de insignias y misiones.
   * En Meteoritos dice si el objeto era 'estrella' o 'roca'.
   */
  detalle?: string;
}

export interface ResumenDeNivel {
  ensayos: number;
  aciertos: number;
  precision: number;
  estrellas: number;
  /** Umbral estimado por parámetro al terminar el nivel. */
  umbrales: Record<string, number>;
  duracionMs: number;
  /** Mejor racha de aciertos seguidos: da la tercera estrella. */
  mejorRacha: number;
  /**
   * Progreso del objetivo propio del juego, si lo tiene. La Torre lo usa para
   * saber si la figura se terminó —y entra en la galería— o se quedó a medias.
   */
  objetivo?: { hecho: number; total: number; cumplido: boolean };
}

export interface ContextoDeJuego {
  modo: Modo;
  renderer: DichopticRenderer;
  /** Lo que la jugadora lleva puesto: sale en el juego, no solo en su avatar. */
  equipo: EquipoDeJuego;
  /** Ojo que lleva el parche mientras juega, o null si juega con lentes. */
  ojoTapado: Ojo | null;
  escaleras: Record<string, Staircase>;
  config: typeof Config;
  mundo: number;
  nivel: number;
  onEnsayo(resultado: ResultadoDeEnsayo): void;
  onFinNivel(resumen: ResumenDeNivel): void;
}

export interface InstanciaDeJuego {
  iniciar(): void;
  pausar(): void;
  reanudar(): void;
  destruir(): void;
  /** Solo para el overlay de desarrollo. */
  fps?(): number;
}

export interface Minijuego {
  id: IdJuego;
  /** Claves de escalera que este juego necesita en este modo y mundo. */
  escaleras(modo: Modo, mundo: number): ConfigDeEscalera[];
  crear(canvas: HTMLCanvasElement, contexto: ContextoDeJuego): InstanciaDeJuego;
}

/** Clave de una escalera guardada: juego + modo + parámetro. */
export function claveDeEscalera(juego: IdJuego, modo: Modo, parametro: string): string {
  return `${juego}:${modo}:${parametro}`;
}
