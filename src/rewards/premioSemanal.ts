/**
 * Premio de la semana: una bolsa de platanitos. Se gana cuando, en la mitad
 * de los juegos de la semana, termina al menos un nivel sin ningún fallo.
 *
 * Los juegos de la semana son los de los modos que se jugaron (el del día si
 * todavía no se jugó ninguno). Como la dificultad se ajusta sola, un nivel
 * perfecto es más fácil en los juegos cortos, de pocos ensayos por nivel.
 */
import { config, type IdJuego, type Modo } from '../config';
import { diasDeLaSemana, semanaISO } from '../engine/fechas';
import { juegosDelModo } from '../games/registro';
import type { ResumenDeNivel } from '../games/tipos';
import type { Estado } from '../storage/esquema';

/** Un nivel sin ningún fallo, con ensayos de sobra para que valga, y con su objetivo cumplido. */
export function nivelPerfecto(resumen: Pick<ResumenDeNivel, 'ensayos' | 'aciertos' | 'objetivo'>): boolean {
  return (
    resumen.ensayos >= config.premioSemanal.ensayosMinimos &&
    resumen.aciertos === resumen.ensayos &&
    (resumen.objetivo?.cumplido ?? true)
  );
}

export interface PremioSemanal {
  semana: string;
  /** Los juegos que cuentan esta semana. */
  juegos: IdJuego[];
  /** Los que ya tienen un nivel perfecto esta semana. */
  perfectos: IdJuego[];
  /** Cuántos juegos perfectos hacen falta. */
  meta: number;
  ganado: boolean;
}

export function premioDeLaSemana(estado: Estado, dia: string, modoDelDia: Modo): PremioSemanal {
  const semana = new Set(diasDeLaSemana(dia));
  const sesiones = estado.sesiones.filter((s) => semana.has(s.fecha));

  const modos = new Set<Modo>(sesiones.map((s) => s.modo));
  if (modos.size === 0) modos.add(modoDelDia);
  const juegos = [...new Set([...modos].flatMap((modo) => juegosDelModo(modo)))];

  const perfectos = juegos.filter((juego) =>
    sesiones.some((s) => (s.porJuego[juego]?.perfectos ?? 0) > 0),
  );
  const meta = Math.ceil(juegos.length * config.premioSemanal.fraccionDeJuegos);
  return {
    semana: semanaISO(dia),
    juegos,
    perfectos,
    meta,
    ganado: perfectos.length >= meta,
  };
}
