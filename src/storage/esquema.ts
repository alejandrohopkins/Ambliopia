/**
 * Modelo de datos persistido. Todo vive en el dispositivo (localStorage).
 * Cualquier cambio de forma exige subir `config.almacenamiento.version`
 * y añadir su paso en `migraciones.ts`.
 */
import { config, type ColorLente, type IdJuego, type Modo, type Ojo } from '../config';

export interface Perfil {
  nombre: string;
  edad: number;
  ojoAmbliope: Ojo;
}

export interface Ajustes {
  metaDiariaMin: number;
  maxDiarioMin: number;
  descansoCadaMin: number;
  modosPermitidos: Modo[];
  /** Si el adulto fija el modo del día, la palanca de la base queda bloqueada. */
  modoFijo: Modo | null;
  distanciaCm: number;
  sonido: boolean;
  musica: boolean;
  volumen: number;
  reducirMovimiento: boolean;
  pinHash: string | null;
}

export interface CalibracionLentes {
  /**
   * Color del lente que cubre el ojo derecho. Es un dato del hardware
   * (cómo están montados los lentes), independiente de cuál ojo es el ambliope.
   */
  colorOjoDerecho: ColorLente | null;
  intensidadMaxRojo: number;
  intensidadMaxCian: number;
  fecha: string | null;
}

export interface Calibracion {
  pxPorMm: number | null;
  fechaPantalla: string | null;
  lentes: CalibracionLentes;
}

export type MotivoDeBalance = 'inicial' | 'subida' | 'bajada' | 'mantiene' | 'manual';

export interface EntradaDeBalance {
  fecha: string;
  valor: number;
  motivo: MotivoDeBalance;
}

export interface Balance {
  contrasteOjoDominante: number;
  automatico: boolean;
  historial: EntradaDeBalance[];
}

/** Estado serializable de una escalera adaptativa (ver engine/Staircase.ts). */
export interface EstadoEscalera {
  valor: number;
  minimo: number;
  maximo: number;
  aciertosSeguidos: number;
  /** -1 bajando (más difícil), +1 subiendo (más fácil), 0 sin dirección aún. */
  ultimaDireccion: -1 | 0 | 1;
  inversiones: number[];
  historial: number[];
  ensayos: number;
  proximoEnsayoDeConfianza: number;
}

export interface ResumenDeJuegoEnSesion {
  ensayos: number;
  aciertos: number;
  /** Umbral estimado al cerrar la sesión, por parámetro. */
  umbrales: Record<string, number>;
  tiempoReaccionMedioMs: number;
}

export interface Sesion {
  id: string;
  fecha: string;
  modo: Modo;
  inicio: string;
  fin: string | null;
  minutosActivos: number;
  porJuego: Partial<Record<IdJuego, ResumenDeJuegoEnSesion>>;
}

export interface ProgresoDeJuego {
  mundo: number;
  nivel: number;
  /** Clave 'mundo:nivel' → estrellas (0–3). */
  estrellasPorNivel: Record<string, number>;
}

export interface Economia {
  monedas: number;
  cristales: number;
  inventario: string[];
  equipado: Record<string, string>;
}

export interface Insignia {
  nivel: number;
  fecha: string;
}

export interface Racha {
  actual: number;
  mejor: number;
  protectoresDisponibles: number;
  ultimoDiaCumplido: string | null;
  /** Semana ISO en que se repusieron los protectores. */
  semanaDeProtectores: string | null;
}

export type TipoDeMision =
  | 'minutos'
  | 'cristales'
  | 'saboteadores'
  | 'figuras'
  | 'estrellasDeEnergia'
  | 'estrellasDeNivel'
  | 'juegosDistintos';

export interface Mision {
  tipo: TipoDeMision;
  objetivo: number;
  progreso: number;
  completada: boolean;
  /** Marca si ya se pagó el premio, para no pagarlo dos veces. */
  cobrada: boolean;
}

export interface Cofre {
  abierto: boolean;
}

export interface Record_ {
  mejorPx: number;
  mejorMm: number | null;
  fecha: string;
}

export interface EventoDeMolestia {
  fecha: string;
  hora: string;
  modo: Modo;
  juego: IdJuego | null;
  tipo: 'molestia';
}

export interface Nota {
  fecha: string;
  texto: string;
}

export interface Estado {
  version: number;
  perfil: Perfil;
  ajustes: Ajustes;
  calibracion: Calibracion;
  balance: Balance;
  escaleras: Record<string, EstadoEscalera>;
  sesiones: Sesion[];
  progreso: Record<IdJuego, ProgresoDeJuego>;
  economia: Economia;
  insignias: Record<string, Insignia>;
  racha: Racha;
  misiones: Record<string, Mision>;
  cofres: Record<string, Cofre>;
  galeria: string[];
  records: Record<string, Record_>;
  eventos: EventoDeMolestia[];
  notas: Nota[];
  /** Último día cuyo cierre ya se aplicó. */
  ultimoCierre: string | null;
  /** Minutos extra concedidos por el adulto, válidos solo para esa fecha. */
  extraDelDia: { fecha: string; minutos: number } | null;
  /** El asistente inicial se completó. */
  asistenteCompletado: boolean;
}

export const JUEGOS: IdJuego[] = ['minero', 'saboteador', 'torre', 'meteoritos'];

function progresoInicial(): Record<IdJuego, ProgresoDeJuego> {
  const base = {} as Record<IdJuego, ProgresoDeJuego>;
  for (const juego of JUEGOS) base[juego] = { mundo: 1, nivel: 1, estrellasPorNivel: {} };
  return base;
}

export function estadoInicial(): Estado {
  return {
    version: config.almacenamiento.version,
    perfil: {
      nombre: config.perfil.nombrePorDefecto,
      edad: config.perfil.edadPorDefecto,
      ojoAmbliope: config.ojoAmbliope,
    },
    ajustes: {
      metaDiariaMin: config.sesion.metaDiariaMin,
      maxDiarioMin: config.sesion.maxDiarioMin,
      descansoCadaMin: config.sesion.descansoCadaMin,
      modosPermitidos: ['parche'],
      modoFijo: null,
      distanciaCm: config.sesion.distanciaCmPorDefecto,
      sonido: config.audio.sonidoPorDefecto,
      musica: config.audio.musicaPorDefecto,
      volumen: config.audio.volumenPorDefecto,
      reducirMovimiento: false,
      pinHash: null,
    },
    calibracion: {
      pxPorMm: null,
      fechaPantalla: null,
      lentes: {
        colorOjoDerecho: null,
        intensidadMaxRojo: config.lentes.intensidadInicialCalibracion,
        intensidadMaxCian: config.lentes.intensidadInicialCalibracion,
        fecha: null,
      },
    },
    balance: {
      contrasteOjoDominante: config.balance.contrasteInicialOjoDominante,
      automatico: true,
      historial: [],
    },
    escaleras: {},
    sesiones: [],
    progreso: progresoInicial(),
    economia: { monedas: 0, cristales: 0, inventario: [], equipado: {} },
    insignias: {},
    racha: {
      actual: 0,
      mejor: 0,
      protectoresDisponibles: config.racha.protectoresPorSemana,
      ultimoDiaCumplido: null,
      semanaDeProtectores: null,
    },
    misiones: {},
    cofres: {},
    galeria: [],
    records: {},
    eventos: [],
    notas: [],
    ultimoCierre: null,
    extraDelDia: null,
    asistenteCompletado: false,
  };
}

/** El ojo dominante es siempre el contrario al ambliope. */
export function ojoDominante(perfil: Perfil): Ojo {
  return perfil.ojoAmbliope === 'derecho' ? 'izquierdo' : 'derecho';
}

/** Color del lente que cubre un ojo, derivado del dato de hardware calibrado. */
export function colorDelOjo(lentes: CalibracionLentes, ojo: Ojo): ColorLente | null {
  if (!lentes.colorOjoDerecho) return null;
  if (ojo === 'derecho') return lentes.colorOjoDerecho;
  return lentes.colorOjoDerecho === 'rojo' ? 'cian' : 'rojo';
}

export function intensidadMaxima(lentes: CalibracionLentes, color: ColorLente): number {
  return color === 'rojo' ? lentes.intensidadMaxRojo : lentes.intensidadMaxCian;
}

export function lentesCalibrados(calibracion: Calibracion): boolean {
  return calibracion.lentes.colorOjoDerecho !== null && calibracion.lentes.fecha !== null;
}
