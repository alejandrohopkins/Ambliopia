/**
 * Puente entre un minijuego y el estado guardado: abre la sesión del día,
 * acumula minutos y, al terminar un nivel, guarda escaleras, estrellas,
 * monedas y récords.
 */
import { useCallback, useEffect, useRef } from 'react';
import type { IdJuego, Modo } from '../../config';
import { useEstado } from '../../storage/contexto';
import type { EstadoEscalera, ResumenDeJuegoEnSesion } from '../../storage/esquema';
import type { Staircase } from '../../engine/Staircase';
import type { ResultadoDeEnsayo, ResumenDeNivel } from '../../games/tipos';
import { monedasPorMinutos } from '../../rewards/economia';
import { aportesDelNivel } from '../../rewards/progresoDeJuego';
import { juegosDelDia, minutosDelDia } from '../../storage/selectores';
import { pxAMm } from '../../engine/color';
import { hoyDelJuego } from '../reloj';

/** Parámetros cuyo valor es un tamaño en píxeles: de ahí salen los récords. */
const PARAMETROS_DE_TAMANO = new Set(['tamano', 'diametro', 'abertura']);

export interface NivelTerminado {
  resumen: ResumenDeNivel;
  escaleras: Record<string, Staircase>;
  ensayos: ResultadoDeEnsayo[];
  mundo: number;
  nivel: number;
  monedas: number;
}

export function useEstadoDeSesion(juego: IdJuego, modo: Modo) {
  const { estado, despachar } = useEstado();

  // El cierre de un nivel compara contra el estado más reciente, no contra el
  // que había cuando se creó la función.
  const ultimoEstado = useRef(estado);
  ultimoEstado.current = estado;

  // Una sesión por entrada al juego; se cierra al salir de la pantalla.
  useEffect(() => {
    const id = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
    despachar({ tipo: 'sesion/iniciar', id, dia: hoyDelJuego(), modo });
    return () => despachar({ tipo: 'sesion/terminar' });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modo]);

  const sumarMinutos = useCallback(
    (minutos: number) => {
      if (minutos <= 0) return;
      const dia = hoyDelJuego();
      despachar({ tipo: 'sesion/sumarMinutos', minutos });
      despachar({ tipo: 'economia/sumar', monedas: monedasPorMinutos(minutos) });
      // Los minutos de la misión se fijan como total del día, no se acumulan.
      despachar({
        tipo: 'mision/fijar',
        dia,
        tipoDeMision: 'minutos',
        total: minutosDelDia(ultimoEstado.current, dia) + minutos,
      });
    },
    [despachar],
  );

  /**
   * Guarda el estado de las escaleras. Se llama al terminar un nivel y también
   * al salir a medias (descanso, pausa, molestia): el avance de la escalera
   * nunca se pierde por interrumpir un nivel.
   */
  const guardarEscaleras = useCallback(
    (escaleras: Record<string, Staircase>) => {
      const guardadas: Record<string, EstadoEscalera> = {};
      for (const [clave, escalera] of Object.entries(escaleras)) {
        guardadas[clave] = escalera.toJSON();
      }
      if (Object.keys(guardadas).length > 0) {
        despachar({ tipo: 'escaleras/guardar', escaleras: guardadas });
      }
    },
    [despachar],
  );

  /** El récord es el objeto más pequeño acertado, por juego y modo. */
  const registrarRecord = useCallback(
    (ensayos: ResultadoDeEnsayo[], dia: string): boolean => {
      const actual = ultimoEstado.current;
      const clave = `${juego}:${modo}`;
      const previo = actual.records[clave]?.mejorPx ?? Infinity;

      let menor = Infinity;
      for (const ensayo of ensayos) {
        if (!ensayo.acierto || ensayo.esEnsayoDeConfianza) continue;
        if (!PARAMETROS_DE_TAMANO.has(ensayo.parametro.split(':')[0])) continue;
        menor = Math.min(menor, ensayo.valor);
      }
      if (!Number.isFinite(menor) || menor >= previo) return false;

      const pxPorMm = actual.calibracion.pxPorMm;
      despachar({
        tipo: 'records/registrar',
        clave,
        px: menor,
        mm: pxPorMm === null ? null : pxAMm(menor, pxPorMm),
        dia,
      });
      return true;
    },
    [despachar, juego, modo],
  );

  const registrarNivel = useCallback(
    ({ resumen, escaleras, ensayos, mundo, nivel, monedas }: NivelTerminado): boolean => {
      guardarEscaleras(escaleras);

      const porJuego: ResumenDeJuegoEnSesion = {
        ensayos: resumen.ensayos,
        aciertos: resumen.aciertos,
        umbrales: resumen.umbrales,
        tiempoReaccionMedioMs: tiempoMedio(ensayos),
      };
      despachar({ tipo: 'sesion/registrarJuego', juego, resumen: porJuego });
      despachar({ tipo: 'progreso/estrellas', juego, mundo, nivel, estrellas: resumen.estrellas });
      despachar({ tipo: 'economia/sumar', monedas });

      // Contadores de insignias y avance de la misión del día.
      const dia = hoyDelJuego();
      const aportes = aportesDelNivel(juego, ensayos, resumen);
      despachar({ tipo: 'contadores/sumar', cambios: aportes.contadores });
      for (const { tipo, cantidad } of aportes.mision) {
        despachar({ tipo: 'mision/avanzar', dia, tipoDeMision: tipo, cantidad });
      }
      despachar({
        tipo: 'mision/fijar',
        dia,
        tipoDeMision: 'juegosDistintos',
        total: new Set([...juegosDelDia(ultimoEstado.current, dia), juego]).size,
      });

      return registrarRecord(ensayos, dia);
    },
    [despachar, guardarEscaleras, juego, registrarRecord],
  );

  return { sumarMinutos, registrarNivel, guardarEscaleras };
}

function tiempoMedio(ensayos: ResultadoDeEnsayo[]): number {
  const validos = ensayos.filter((e) => e.acierto && !e.esEnsayoDeConfianza);
  if (validos.length === 0) return 0;
  return validos.reduce((total, e) => total + e.tiempoReaccionMs, 0) / validos.length;
}
