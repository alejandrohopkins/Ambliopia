/**
 * Traduce lo que acaba de pasar en un minijuego a contadores de insignias y
 * a avance de la misión del día. Puro, para poder probarlo sin la interfaz.
 */
import { config, type IdJuego } from '../config';
import type { Contadores, TipoDeMision } from '../storage/esquema';
import type { ResultadoDeEnsayo, ResumenDeNivel } from '../games/tipos';

export interface AportesDelNivel {
  contadores: Partial<Contadores>;
  /** Avances de la misión del día, por tipo. */
  mision: Array<{ tipo: TipoDeMision; cantidad: number }>;
}

/** ¿Hubo tres fallos seguidos en este nivel? Da la insignia Perseverante. */
export function huboTresFallosSeguidos(ensayos: ResultadoDeEnsayo[]): boolean {
  let seguidos = 0;
  for (const ensayo of ensayos) {
    if (ensayo.esEnsayoDeConfianza) continue;
    seguidos = ensayo.acierto ? 0 : seguidos + 1;
    if (seguidos >= config.insignias.fallosSeguidosParaPerseverante) return true;
  }
  return false;
}

function aciertosReales(ensayos: ResultadoDeEnsayo[], filtro?: (e: ResultadoDeEnsayo) => boolean) {
  return ensayos.filter(
    (e) => e.acierto && !e.esEnsayoDeConfianza && (filtro ? filtro(e) : true),
  ).length;
}

export function aportesDelNivel(
  juego: IdJuego,
  ensayos: ResultadoDeEnsayo[],
  resumen: ResumenDeNivel,
): AportesDelNivel {
  const contadores: Partial<Contadores> = {
    nivelesCompletados: 1,
    nivelesTrasTresFallos: huboTresFallosSeguidos(ensayos) ? 1 : 0,
  };
  const mision: AportesDelNivel['mision'] = [
    { tipo: 'estrellasDeNivel', cantidad: resumen.estrellas },
  ];

  if (juego === 'minero') {
    const cristales = aciertosReales(ensayos);
    contadores.cristalesEncontrados = cristales;
    mision.push({ tipo: 'cristales', cantidad: cristales });
  }

  if (juego === 'saboteador') {
    const atrapados = aciertosReales(ensayos);
    contadores.saboteadoresAtrapados = atrapados;
    mision.push({ tipo: 'saboteadores', cantidad: atrapados });
  }

  if (juego === 'meteoritos') {
    // Solo cuentan las estrellas atrapadas, no las rocas esquivadas.
    const estrellas = aciertosReales(ensayos, (e) => e.detalle === 'estrella');
    contadores.estrellasAtrapadas = estrellas;
    mision.push({ tipo: 'estrellasDeEnergia', cantidad: estrellas });
  }

  if (juego === 'torre') {
    mision.push({ tipo: 'figuras', cantidad: 1 });
  }

  return { contadores, mision };
}
