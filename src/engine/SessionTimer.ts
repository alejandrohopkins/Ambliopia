/**
 * Minutos activos. Regla crítica: el tiempo solo cuenta si hay un minijuego en
 * curso (no en pausa), la pestaña está visible y hubo interacción en los
 * últimos 30 segundos. Dejar la app abierta no entrena nada.
 *
 * El reloj se inyecta para poder probarlo sin esperar.
 */
import { config } from '../config';

export interface OpcionesDeSessionTimer {
  /** Milisegundos sin interacción tras los que el tiempo deja de contar. */
  inactividadMs?: number;
  /** Minutos activos entre descansos. */
  descansoCadaMin?: number;
  ahora?: () => number;
}

export type MotivoDeParada = 'enPausa' | 'pestanaOculta' | 'sinInteraccion' | 'sinJuego';

export class SessionTimer {
  private readonly inactividadMs: number;
  private readonly descansoCadaMs: number;
  private readonly reloj: () => number;

  private jugando = false;
  private enPausa = false;
  private visible = true;
  private ultimaInteraccion: number;
  private ultimaMarca: number;
  private msActivosTotales = 0;
  private msDesdeDescanso = 0;

  constructor(opciones: OpcionesDeSessionTimer = {}) {
    this.inactividadMs = opciones.inactividadMs ?? config.sesion.inactividadSeg * 1000;
    this.descansoCadaMs = (opciones.descansoCadaMin ?? config.sesion.descansoCadaMin) * 60_000;
    this.reloj = opciones.ahora ?? (() => Date.now());
    this.ultimaMarca = this.reloj();
    this.ultimaInteraccion = this.ultimaMarca;
  }

  // -------------------------------------------------------------------------
  // Señales
  // -------------------------------------------------------------------------

  /** Empieza un minijuego. También cuenta como interacción. */
  iniciar(): void {
    this.actualizar();
    this.jugando = true;
    this.enPausa = false;
    this.marcarInteraccion();
  }

  pausar(): void {
    this.actualizar();
    this.enPausa = true;
  }

  reanudar(): void {
    this.actualizar();
    this.enPausa = false;
    this.marcarInteraccion();
  }

  /** Termina el minijuego: sin juego en curso no corre el tiempo. */
  detener(): void {
    this.actualizar();
    this.jugando = false;
  }

  marcarInteraccion(): void {
    this.actualizar();
    this.ultimaInteraccion = this.reloj();
  }

  marcarVisibilidad(visible: boolean): void {
    this.actualizar();
    this.visible = visible;
    if (visible) this.ultimaInteraccion = this.reloj();
  }

  // -------------------------------------------------------------------------
  // Tiempo
  // -------------------------------------------------------------------------

  /**
   * Lleva el reloj hasta ahora, sumando solo los tramos activos.
   * Si el tramo cruza el límite de inactividad, se cuenta únicamente la parte
   * anterior a ese límite.
   */
  actualizar(): void {
    const ahora = this.reloj();
    const transcurrido = Math.max(0, ahora - this.ultimaMarca);
    this.ultimaMarca = ahora;
    if (transcurrido === 0) return;

    if (!this.jugando || this.enPausa || !this.visible) return;

    const desdeInteraccionAlInicio = Math.max(0, ahora - transcurrido - this.ultimaInteraccion);
    const restanteAntesDeInactividad = Math.max(0, this.inactividadMs - desdeInteraccionAlInicio);
    const activo = Math.min(transcurrido, restanteAntesDeInactividad);
    if (activo <= 0) return;

    this.msActivosTotales += activo;
    this.msDesdeDescanso += activo;
  }

  get msActivos(): number {
    return this.msActivosTotales;
  }

  get minutosActivos(): number {
    return this.msActivosTotales / 60_000;
  }

  /** Minutos completos, que son los que se guardan y se premian. */
  get minutosEnteros(): number {
    return Math.floor(this.minutosActivos);
  }

  /** Está contando el tiempo ahora mismo. */
  get contando(): boolean {
    if (!this.jugando || this.enPausa || !this.visible) return false;
    return this.reloj() - this.ultimaInteraccion < this.inactividadMs;
  }

  /** Por qué no cuenta, para el overlay de desarrollo. */
  get motivoDeParada(): MotivoDeParada | null {
    if (!this.jugando) return 'sinJuego';
    if (this.enPausa) return 'enPausa';
    if (!this.visible) return 'pestanaOculta';
    if (this.reloj() - this.ultimaInteraccion >= this.inactividadMs) return 'sinInteraccion';
    return null;
  }

  // -------------------------------------------------------------------------
  // Descansos
  // -------------------------------------------------------------------------

  get descansoPendiente(): boolean {
    return this.msDesdeDescanso >= this.descansoCadaMs;
  }

  get minutosDesdeDescanso(): number {
    return this.msDesdeDescanso / 60_000;
  }

  marcarDescansoTomado(): void {
    this.actualizar();
    this.msDesdeDescanso = 0;
    this.marcarInteraccion();
  }

  /** Descuenta los minutos ya guardados para no contarlos dos veces. */
  consumirMinutosEnteros(): number {
    this.actualizar();
    const enteros = this.minutosEnteros;
    if (enteros > 0) this.msActivosTotales -= enteros * 60_000;
    return enteros;
  }

  /** Todo lo que falta guardar, también el trozo de minuto. Se usa al salir. */
  consumirMinutos(): number {
    this.actualizar();
    const minutos = this.minutosActivos;
    this.msActivosTotales = 0;
    return minutos;
  }
}
