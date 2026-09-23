/**
 * Insignias. Cada una mira el estado guardado y dice en qué nivel está.
 * Nivel 0 significa que todavía no se consiguió; nunca bajan.
 */
import { config, type IdJuego } from '../config';
import type { Estado } from '../storage/esquema';
import { juegosDelDia } from '../storage/selectores';

export interface DefinicionDeInsignia {
  id: string;
  /** Umbrales de cada nivel. Una sola entrada = insignia de un solo nivel. */
  niveles: number[];
  /** Valor conseguido. Para los récords, menor es mejor. */
  medir(estado: Estado, dia: string): number;
  /** Los récords se consiguen bajando, no subiendo. */
  menorEsMejor?: boolean;
}

function mejorRecordPx(estado: Estado): number {
  const valores = Object.values(estado.records).map((r) => r.mejorPx);
  return valores.length > 0 ? Math.min(...valores) : Infinity;
}

export const INSIGNIAS: DefinicionDeInsignia[] = [
  {
    id: 'primer_cristal',
    niveles: [1],
    medir: (estado) => estado.contadores.cristalesEncontrados,
  },
  {
    id: 'ojo_de_halcon',
    niveles: config.insignias.ojoDeHalcon,
    menorEsMejor: true,
    medir: mejorRecordPx,
  },
  {
    id: 'detective',
    niveles: [config.insignias.saboteadoresParaDetective],
    medir: (estado) => estado.contadores.saboteadoresAtrapados,
  },
  {
    id: 'arquitecta',
    niveles: [config.insignias.figurasParaArquitecta],
    medir: (estado) => estado.galeria.length,
  },
  {
    id: 'piloto',
    niveles: [config.insignias.estrellasParaPiloto],
    medir: (estado) => estado.contadores.estrellasAtrapadas,
  },
  {
    id: 'corredora',
    niveles: [config.insignias.celdasParaCorredora],
    medir: (estado) => estado.contadores.celdasRecogidas,
  },
  {
    id: 'constancia',
    niveles: config.insignias.rachasParaConstancia,
    medir: (estado) => estado.racha.mejor,
  },
  {
    id: 'dos_ojos',
    niveles: [config.insignias.subidasParaDosOjos],
    medir: (estado) => estado.balance.historial.filter((e) => e.motivo === 'subida').length,
  },
  {
    id: 'balance',
    niveles: [config.balance.maximo],
    medir: (estado) => estado.balance.contrasteOjoDominante,
  },
  {
    id: 'perseverante',
    niveles: [1],
    medir: (estado) => estado.contadores.nivelesTrasTresFallos,
  },
  {
    id: 'coleccionista',
    niveles: [config.insignias.articulosParaColeccionista],
    medir: (estado) => estado.economia.inventario.length,
  },
  {
    id: 'exploradora',
    // Con quince minijuegos repartidos entre dos modos, "todos en un día" ya
    // no es razonable: se pide un número fijo de juegos distintos.
    niveles: [config.insignias.juegosParaExploradora],
    medir: (estado, dia) => juegosDelDia(estado, dia).length,
  },
];

/** Nivel alcanzado ahora mismo: 0 si todavía no se consiguió. */
export function nivelAlcanzado(definicion: DefinicionDeInsignia, estado: Estado, dia: string): number {
  const valor = definicion.medir(estado, dia);
  let nivel = 0;
  definicion.niveles.forEach((umbral, indice) => {
    const conseguido = definicion.menorEsMejor ? valor <= umbral : valor >= umbral;
    if (conseguido) nivel = indice + 1;
  });
  return nivel;
}

export interface InsigniaGanada {
  id: string;
  nivel: number;
}

/**
 * Insignias que suben de nivel con el estado actual. Las ya conseguidas nunca
 * bajan: solo se informa de las que mejoran.
 */
export function insigniasNuevas(estado: Estado, dia: string): InsigniaGanada[] {
  const nuevas: InsigniaGanada[] = [];
  for (const definicion of INSIGNIAS) {
    const nivel = nivelAlcanzado(definicion, estado, dia);
    const actual = estado.insignias[definicion.id]?.nivel ?? 0;
    if (nivel > actual) nuevas.push({ id: definicion.id, nivel });
  }
  return nuevas;
}

/** Juegos que aportan a una insignia, para explicarla en pantalla. */
export const JUEGO_DE_INSIGNIA: Record<string, IdJuego | null> = {
  primer_cristal: 'minero',
  ojo_de_halcon: null,
  detective: 'saboteador',
  arquitecta: 'torre',
  piloto: 'meteoritos',
  corredora: 'tunel',
  constancia: null,
  dos_ojos: null,
  balance: null,
  perseverante: null,
  coleccionista: null,
  exploradora: null,
};
