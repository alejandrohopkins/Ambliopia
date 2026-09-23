/**
 * Los carriles del sapo cruzador, aparte del dibujo para poder probarlos.
 * Posiciones en celdas; la fila 0 es la salida, abajo.
 */
import { config } from '../../config';
import type { Aleatorio } from '../../engine/rng';
import { delMundo, segunNivel } from '../base';

export type TipoDeFila = 'salida' | 'calle' | 'medio' | 'rio' | 'meta';

export interface Objeto {
  /** Borde izquierdo, en celdas. */
  x: number;
  largo: number;
  /** Solo troncos: si se hunde a ratos, en qué momento de su ciclo empieza. */
  faseDeHundirse: number | null;
}

export interface Fila {
  tipo: TipoDeFila;
  /** 1 hacia la derecha, −1 hacia la izquierda. */
  direccion: number;
  velocidad: number;
  objetos: Objeto[];
  /** Vuelta completa del carril, en celdas: al salir por un lado entra por el otro. */
  vuelta: number;
}

/**
 * Celdas que un carril se extiende fuera de la pantalla por cada lado: más
 * que el objeto más largo, para que nada aparezca ni desaparezca a la vista.
 */
const FUERA = 6;

/** Lo que manda el nivel: carriles, velocidad, huecos, troncos, hundirse y corrientes. */
export function dificultadDeSapo(mundo: number, nivel: number) {
  const s = config.sapo;
  return {
    calles: delMundo(s.carrilesDeCallePorMundo, mundo),
    rios: delMundo(s.carrilesDeRioPorMundo, mundo),
    velocidad: segunNivel(mundo, nivel, s.velocidadInicialCeldasSeg, s.velocidadFinalCeldasSeg),
    hueco: segunNivel(mundo, nivel, s.huecoInicialCeldas, s.huecoFinalCeldas),
    tronco: Math.round(segunNivel(mundo, nivel, s.largoDeTroncoInicial, s.largoDeTroncoFinal)),
    seHunden: mundo >= s.hundirseDesdeMundo,
    corrientes: mundo >= s.corrienteDesdeMundo,
    /** En el último mundo el tráfico va en cualquier sentido y a ritmos distintos. */
    desordenado: mundo >= config.progresion.mundos,
  };
}

function carril(
  tipo: 'calle' | 'rio',
  direccion: number,
  velocidad: number,
  largo: number,
  hueco: number,
  cols: number,
  aleatorio: Aleatorio,
  seHunde: boolean,
): Fila {
  const paso = largo + hueco;
  const cuantos = Math.ceil((cols + FUERA * 2) / paso);
  const desfase = aleatorio.siguiente() * paso;
  return {
    tipo,
    direccion,
    velocidad,
    vuelta: cuantos * paso,
    objetos: Array.from({ length: cuantos }, (_, i) => ({
      x: -FUERA + desfase + i * paso,
      largo,
      faseDeHundirse: seHunde && i % 2 === 0 ? aleatorio.siguiente() : null,
    })),
  };
}

/** Todas las filas, de abajo arriba: salida, calles, medio, ríos y meta. */
export function crearFilas(
  dificultad: ReturnType<typeof dificultadDeSapo>,
  cols: number,
  aleatorio: Aleatorio,
): Fila[] {
  const quieta = (tipo: TipoDeFila): Fila => ({ tipo, direccion: 1, velocidad: 0, objetos: [], vuelta: cols });
  const sentido = (i: number) =>
    dificultad.desordenado ? (aleatorio.probabilidad(0.5) ? 1 : -1) : i % 2 === 0 ? -1 : 1;
  const variacion = dificultad.desordenado ? config.sapo.variacionDesordenada : config.sapo.variacionDeVelocidad;
  const ritmo = () => dificultad.velocidad * (1 + variacion * (aleatorio.siguiente() * 2 - 1));

  const filas: Fila[] = [quieta('salida')];
  for (let i = 0; i < dificultad.calles; i += 1) {
    const largo = aleatorio.probabilidad(0.3) ? 2 : 1;
    filas.push(carril('calle', sentido(i), ritmo(), largo, dificultad.hueco + largo, cols, aleatorio, false));
  }
  if (dificultad.rios > 0) {
    filas.push(quieta('medio'));
    for (let i = 0; i < dificultad.rios; i += 1) {
      filas.push(
        carril(
          'rio',
          sentido(i + 1),
          ritmo() * 0.8,
          dificultad.tronco,
          config.sapo.aguaEntreTroncos,
          cols,
          aleatorio,
          dificultad.seHunden,
        ),
      );
    }
  }
  filas.push(quieta('meta'));
  return filas;
}

/** Avanza los objetos de cada carril; al salir por un lado entran por el otro. */
export function moverFilas(filas: Fila[], dt: number): void {
  for (const fila of filas) {
    for (const objeto of fila.objetos) {
      const x = objeto.x + fila.direccion * fila.velocidad * dt + FUERA;
      objeto.x = (((x % fila.vuelta) + fila.vuelta) % fila.vuelta) - FUERA;
    }
  }
}

/** ¿Este tronco está hundido ahora? Pasa un rato a flote y otro bajo el agua. */
export function hundido(objeto: Objeto, segundos: number): boolean {
  if (objeto.faseDeHundirse === null) return false;
  const ciclo = config.sapo.flotandoSeg + config.sapo.hundidoSeg;
  const t = (segundos / ciclo + objeto.faseDeHundirse) % 1;
  return t * ciclo >= config.sapo.flotandoSeg;
}

/** ¿Está a punto de hundirse? Es el aviso para saltar a tiempo. */
export function porHundirse(objeto: Objeto, segundos: number): boolean {
  if (objeto.faseDeHundirse === null || hundido(objeto, segundos)) return false;
  return hundido(objeto, segundos + config.sapo.avisoHundirseSeg);
}

/** ¿Algún coche toca la franja [desde, hasta]? */
export function atropella(fila: Fila, desde: number, hasta: number): boolean {
  return fila.objetos.some((coche) => coche.x < hasta && coche.x + coche.largo > desde);
}

/** El tronco a flote que hay bajo este punto del río, si hay alguno. */
export function troncoBajo(fila: Fila, x: number, segundos: number): Objeto | null {
  return (
    fila.objetos.find((tronco) => x >= tronco.x && x <= tronco.x + tronco.largo && !hundido(tronco, segundos)) ??
    null
  );
}

/** Hasta dónde se vuelve tras un tropiezo: la salida o la franja del medio. */
export function filaDeRegreso(filas: Fila[], desde: number): number {
  for (let f = desde; f >= 0; f -= 1) {
    if (filas[f].tipo === 'salida' || filas[f].tipo === 'medio') return f;
  }
  return 0;
}
