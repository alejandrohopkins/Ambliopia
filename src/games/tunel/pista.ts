/**
 * Modelo del Túnel de escape, aparte del dibujo para poder probarlo.
 *
 * La pista tiene tres carriles y se mide en "unidades": z es la distancia que
 * falta para llegar a la corredora, así que un muro nace con z alta y llega
 * cuando z baja a cero.
 *
 * Cada muro cruza los tres carriles y solo deja una abertura, arriba o abajo,
 * en uno de ellos. Ver de lejos dónde está esa abertura y de qué lado es la
 * tarea visual del juego: es un hueco que hay que resolver, como en las
 * pruebas de agudeza.
 */
import { config } from '../../config';

export type Postura = 'corriendo' | 'saltando' | 'deslizando';
export type Abertura = 'arriba' | 'abajo';

export interface Muro {
  /** Distancia hasta la corredora, en unidades de pista. */
  z: number;
  /** Carril donde está la abertura. */
  carril: number;
  abertura: Abertura;
  /** Alto de la abertura en píxeles, medido al llegar a la corredora. */
  aberturaPx: number;
  esEnsayoDeConfianza: boolean;
  nacidoMs: number;
  resuelto: boolean;
  /** Se acertó carril y postura en algún momento de la ventana de juicio. */
  logrado: boolean;
}

export interface CeldaDeEnergia {
  z: number;
  carril: number;
  tomada: boolean;
}

/** Por dónde se pasa: si el hueco está arriba se salta, si está abajo se rueda. */
export function posturaQuePasa(abertura: Abertura): Postura {
  return abertura === 'arriba' ? 'saltando' : 'deslizando';
}

/** Un muro se pasa estando en su carril y en la postura que pide la abertura. */
export function pasaElMuro(muro: Muro, carril: number, postura: Postura): boolean {
  return carril === muro.carril && postura === posturaQuePasa(muro.abertura);
}

/**
 * ¿El muro está dentro de la ventana en la que se juzga?
 * Se mira un tramo antes y otro después de llegar, para que saltar un poco
 * antes o un poco después siga contando: lo que se mide es ver la abertura,
 * no clavar el instante exacto.
 */
export function enVentanaDeJuicio(z: number, zDeJuicio = config.tunel.zDeJuicio): boolean {
  return z <= zDeJuicio && z > -zDeJuicio;
}

/** Ya pasó del todo: es el momento de anotar el resultado. */
export function muroResuelto(z: number, zDeJuicio = config.tunel.zDeJuicio): boolean {
  return z <= -zDeJuicio;
}

/** Carril de al lado, sin salirse de la pista. */
export function carrilAlLado(carril: number, direccion: number, carriles: number): number {
  return Math.max(0, Math.min(carriles - 1, carril + direccion));
}

/**
 * Perspectiva del túnel: cuánto encoge lo que está a distancia z.
 * Vale 1 a los pies de la corredora y baja suavemente hacia el fondo.
 */
export function escalaDeZ(z: number, zDeCamara = config.tunel.zDeCamara): number {
  return zDeCamara / (zDeCamara + Math.max(0, z));
}

/** Unidades por segundo a las que avanza la pista: sube a lo largo de los 25 niveles. */
export function velocidadDeNivel(mundo: number, nivel: number): number {
  const niveles = config.progresion.mundos * config.progresion.nivelesPorMundo;
  const indice = (mundo - 1) * config.progresion.nivelesPorMundo + (nivel - 1);
  const avance = niveles > 1 ? Math.max(0, Math.min(1, indice / (niveles - 1))) : 0;
  const { velocidadInicialUnidadesSeg, velocidadFinalUnidadesSeg } = config.tunel;
  return (
    velocidadInicialUnidadesSeg +
    (velocidadFinalUnidadesSeg - velocidadInicialUnidadesSeg) * avance
  );
}

/**
 * Segundos que se ve venir un muro desde que nace. Es el margen para leer la
 * abertura y decidir: si fuera muy corto, el juego mediría reflejos y no vista.
 */
export function segundosDeAviso(mundo: number, nivel: number): number {
  return config.tunel.zDeNacimiento / velocidadDeNivel(mundo, nivel);
}

/**
 * La abertura no puede comerse el muro: se recorta a una fracción del alto del
 * túnel para que siempre siga siendo una pared con un hueco.
 */
export function aberturaVisible(pedidaPx: number, altoDelTunelPx: number): number {
  const techo = altoDelTunelPx * config.tunel.fraccionMaximaDeAbertura;
  return Math.max(config.tunel.aberturaMinimaPx, Math.min(techo, pedidaPx));
}

/**
 * Altura de la corredora sobre el suelo, en fracción del alto del túnel.
 * El salto sube y baja en arco; corriendo y rodando va pegada al suelo.
 */
export function alturaDelSalto(postura: Postura, avance: number): number {
  if (postura !== 'saltando') return 0;
  const t = Math.max(0, Math.min(1, avance));
  return config.tunel.alturaDeSalto * (1 - (2 * t - 1) ** 2);
}

/** Alto que ocupa la corredora según su postura, en fracción del alto del túnel. */
export function altoDeLaCorredora(postura: Postura): number {
  return postura === 'deslizando'
    ? config.tunel.altoRodandoEnTunel
    : config.tunel.altoDePieEnTunel;
}
