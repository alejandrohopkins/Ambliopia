/**
 * Anfitrión de los minijuegos: lienzo, renderer, escaleras, reloj de sesión y
 * menú de pausa. Cada minijuego solo se ocupa de su tarea; todo lo que tiene
 * que ver con métricas, tiempo y guardado vive aquí.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { config, type IdJuego, type Modo } from '../../config';
import { es } from '../../i18n/es';
import { useEstado } from '../../storage/contexto';
import { useEstadoDeSesion } from './useEstadoDeSesion';
import { DichopticRenderer } from '../../engine/DichopticRenderer';
import { paletaDe } from '../../engine/mundos';
import { Staircase } from '../../engine/Staircase';
import { SessionTimer, type MotivoDeParada } from '../../engine/SessionTimer';
import { pxAMm } from '../../engine/color';
import { minijuego } from '../../games/registro';
import { figuraDeNivel } from '../../games/torre/figuras';
import type { InstanciaDeJuego, ResultadoDeEnsayo, ResumenDeNivel } from '../../games/tipos';
import { premioDeNivel } from '../../rewards/economia';
import { estrellasDeMundo, mundoDesbloqueado } from '../../storage/selectores';
import { OverlayDeDesarrollo } from '../componentes/OverlayDeDesarrollo';
import { modoDesarrollo } from '../navegacion';
import { avanzarUnDiaDeDesarrollo } from '../reloj';
import { audio } from '../../engine/audio';
import { MenuDePausa } from './MenuDePausa';
import { FinDeNivel } from './FinDeNivel';

export interface FinDeNivelDatos {
  resumen: ResumenDeNivel;
  monedas: number;
  huboRecord: boolean;
  mundoNuevo: string | null;
}

export function PantallaDeJuego({
  juego,
  modo,
  alVolver,
  alDescanso,
  alMolestia,
}: {
  juego: IdJuego;
  modo: Modo;
  alVolver: () => void;
  alDescanso: () => void;
  alMolestia: () => void;
}) {
  const { estado, despachar } = useEstado();
  const { registrarNivel, sumarMinutos, guardarEscaleras } = useEstadoDeSesion(juego, modo);

  const contenedor = useRef<HTMLDivElement>(null);
  const lienzo = useRef<HTMLCanvasElement>(null);
  const instancia = useRef<InstanciaDeJuego | null>(null);
  const renderer = useRef<DichopticRenderer | null>(null);
  const reloj = useRef<SessionTimer | null>(null);
  const ensayos = useRef<ResultadoDeEnsayo[]>([]);

  const progreso = estado.progreso[juego];
  const [intento, setIntento] = useState(0);
  const [enPausa, setEnPausa] = useState(false);
  const [fin, setFin] = useState<FinDeNivelDatos | null>(null);
  const [desarrollo, setDesarrollo] = useState({ fps: 0, minutos: 0, parada: null as MotivoDeParada | null });

  const alTerminarNivel = useRef<(resumen: ResumenDeNivel) => void>(() => {});

  const escaleras = useMemo(() => {
    const definicion = minijuego(juego)?.escaleras(modo, progreso.mundo) ?? [];
    const mapa: Record<string, Staircase> = {};
    for (const config_ of definicion) {
      mapa[config_.clave] = Staircase.continuar(estado.escaleras[config_.clave], config_);
    }
    return mapa;
    // Una escalera nueva por intento de nivel; el estado guardado se lee al crearla.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [juego, modo, progreso.mundo, intento]);

  /** Guarda el nivel terminado: escaleras, estrellas, monedas y récords. */
  const terminarNivel = useCallback(
    (resumen: ResumenDeNivel) => {
      const premio = premioDeNivel(resumen);
      audio().reproducir('nivel');

      // En la Torre cada nivel es una figura: solo entra en la galería si se
      // terminó. Una figura a medias no se guarda, pero tampoco quita nada.
      if (juego === 'torre' && resumen.objetivo?.cumplido) {
        despachar({
          tipo: 'galeria/agregar',
          figura: figuraDeNivel(progreso.mundo, progreso.nivel).id,
        });
      }

      const huboRecord = registrarNivel({
        resumen,
        escaleras,
        ensayos: ensayos.current,
        mundo: progreso.mundo,
        nivel: progreso.nivel,
        monedas: premio.monedas,
      });

      setFin({
        resumen,
        monedas: premio.monedas,
        huboRecord,
        mundoNuevo: mundoReciennDesbloqueado(estado, juego, progreso, resumen.estrellas),
      });
    },
    [despachar, escaleras, estado, juego, progreso.mundo, progreso.nivel, registrarNivel],
  );

  alTerminarNivel.current = terminarNivel;

  // Montaje del minijuego.
  useEffect(() => {
    const definicion = minijuego(juego);
    const canvas = lienzo.current;
    const caja = contenedor.current;
    if (!definicion || !canvas || !caja) return;

    const ctx2d = canvas.getContext('2d');
    if (!ctx2d) return;

    const dibujante = new DichopticRenderer(ctx2d, {
      modo,
      ojoAmbliope: estado.perfil.ojoAmbliope,
      lentes: estado.calibracion.lentes,
      contrasteOjoDominante: estado.balance.contrasteOjoDominante,
      paleta: paletaDe(juego, progreso.mundo),
    });
    renderer.current = dibujante;

    const ajustar = () => {
      const { width, height } = caja.getBoundingClientRect();
      dibujante.redimensionar(width, height);
    };
    ajustar();
    const observador = new ResizeObserver(ajustar);
    observador.observe(caja);

    const temporizador = new SessionTimer({ descansoCadaMin: estado.ajustes.descansoCadaMin });
    reloj.current = temporizador;
    ensayos.current = [];

    const creado = definicion.crear(canvas, {
      modo,
      renderer: dibujante,
      escaleras,
      config,
      mundo: progreso.mundo,
      nivel: progreso.nivel,
      onEnsayo: (resultado) => {
        ensayos.current.push(resultado);
        temporizador.marcarInteraccion();
        audio().reproducir(resultado.acierto ? 'acierto' : 'fallo');
      },
      // Por referencia: el cierre del nivel debe leer el estado más reciente,
      // no el que había cuando se montó el minijuego.
      onFinNivel: (resumen) => alTerminarNivel.current(resumen),
    });
    instancia.current = creado;
    creado.iniciar();
    temporizador.iniciar();

    return () => {
      observador.disconnect();
      creado.destruir();
      temporizador.detener();
      // Salir a medias (descanso, pausa, molestia) no debe perder el avance
      // de la escalera: se guarda siempre al desmontar.
      guardarEscaleras(escaleras);
      instancia.current = null;
      renderer.current = null;
      reloj.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [juego, modo, progreso.mundo, progreso.nivel, intento, escaleras]);

  // Reloj de sesión: minutos activos, visibilidad, interacción y descansos.
  useEffect(() => {
    const marcar = () => reloj.current?.marcarInteraccion();
    const visibilidad = () =>
      reloj.current?.marcarVisibilidad(document.visibilityState === 'visible');

    window.addEventListener('pointerdown', marcar);
    window.addEventListener('keydown', marcar);
    document.addEventListener('visibilitychange', visibilidad);

    const id = setInterval(() => {
      const temporizador = reloj.current;
      if (!temporizador) return;
      temporizador.actualizar();

      const minutos = temporizador.consumirMinutosEnteros();
      if (minutos > 0) sumarMinutos(minutos);

      if (temporizador.descansoPendiente) {
        temporizador.marcarDescansoTomado();
        alDescanso();
      }

      if (modoDesarrollo()) {
        setDesarrollo({
          fps: instancia.current?.fps?.() ?? 0,
          minutos: temporizador.minutosActivos,
          parada: temporizador.motivoDeParada,
        });
      }
    }, 1000);

    return () => {
      window.removeEventListener('pointerdown', marcar);
      window.removeEventListener('keydown', marcar);
      document.removeEventListener('visibilitychange', visibilidad);
      clearInterval(id);
    };
  }, [alDescanso, sumarMinutos]);

  // Esc abre y cierra la pausa.
  useEffect(() => {
    const alTeclado = (evento: KeyboardEvent) => {
      if (evento.key !== 'Escape' || fin) return;
      setEnPausa((activa) => !activa);
    };
    window.addEventListener('keydown', alTeclado);
    return () => window.removeEventListener('keydown', alTeclado);
  }, [fin]);

  useEffect(() => {
    if (!instancia.current) return;
    if (enPausa) {
      instancia.current.pausar();
      reloj.current?.pausar();
    } else {
      instancia.current.reanudar();
      reloj.current?.reanudar();
    }
  }, [enPausa]);

  function salir() {
    reloj.current?.detener();
    const minutos = reloj.current?.consumirMinutosEnteros() ?? 0;
    if (minutos > 0) sumarMinutos(minutos);
    alVolver();
  }

  if (fin) {
    const hayNivelSiguiente =
      progreso.nivel < config.progresion.nivelesPorMundo ||
      mundoDesbloqueado(estado, juego, progreso.mundo + 1);

    return (
      <FinDeNivel
        juego={juego}
        resumen={fin.resumen}
        monedas={fin.monedas}
        huboRecord={fin.huboRecord}
        mundoDesbloqueado={fin.mundoNuevo}
        hayNivelSiguiente={hayNivelSiguiente}
        alSiguiente={() => {
          avanzarNivel(juego, progreso.mundo, progreso.nivel, despachar);
          setFin(null);
          setIntento((n) => n + 1);
        }}
        alRepetir={() => {
          setFin(null);
          setIntento((n) => n + 1);
        }}
        alVolver={salir}
      />
    );
  }

  return (
    <div style={{ position: 'relative', height: '100dvh', display: 'flex', flexDirection: 'column' }}>
      {modoDesarrollo() && (
        <OverlayDeDesarrollo
          datos={{
            fps: desarrollo.fps,
            minutosActivos: desarrollo.minutos,
            motivoDeParada: desarrollo.parada,
            escaleras: Object.values(escaleras),
            renderer: renderer.current,
            modo,
          }}
          alSimularDiaSiguiente={() => avanzarUnDiaDeDesarrollo()}
        />
      )}

      <div ref={contenedor} style={{ flex: 1, minHeight: 0 }}>
        <canvas ref={lienzo} aria-label={es.juegos[juego]} />
      </div>

      <button
        className="pixelado secundario"
        onClick={() => setEnPausa(true)}
        style={{ position: 'absolute', left: 8, bottom: 8, minHeight: 44 }}
      >
        {es.pausa.titulo}
      </button>

      {enPausa && (
        <MenuDePausa
          alSeguir={() => setEnPausa(false)}
          alMolestia={() => {
            despachar({ tipo: 'evento/molestia', modo, juego });
            reloj.current?.detener();
            alMolestia();
          }}
          alSalir={salir}
        />
      )}
    </div>
  );
}

/** Avanza al nivel siguiente, o al mundo siguiente si ya se abrió. */
function avanzarNivel(
  juego: IdJuego,
  mundo: number,
  nivel: number,
  despachar: ReturnType<typeof useEstado>['despachar'],
): void {
  if (nivel < config.progresion.nivelesPorMundo) {
    despachar({ tipo: 'progreso/avanzar', juego, mundo, nivel: nivel + 1 });
    return;
  }
  despachar({
    tipo: 'progreso/avanzar',
    juego,
    mundo: Math.min(config.progresion.mundos, mundo + 1),
    nivel: 1,
  });
}

/**
 * ¿Este nivel acaba de abrir el mundo siguiente? Se calcula con las estrellas
 * que el nivel acaba de dar, porque el estado guardado aún no las refleja.
 */
function mundoReciennDesbloqueado(
  estado: ReturnType<typeof useEstado>['estado'],
  juego: IdJuego,
  progreso: { mundo: number; nivel: number },
  estrellasDelNivel: number,
): string | null {
  if (progreso.mundo >= config.progresion.mundos) return null;
  if (mundoDesbloqueado(estado, juego, progreso.mundo + 1)) return null;

  const clave = `${progreso.mundo}:${progreso.nivel}`;
  const previas = estado.progreso[juego].estrellasPorNivel[clave] ?? 0;
  const ganadas = Math.max(0, estrellasDelNivel - previas);
  const total = estrellasDeMundo(estado, juego, progreso.mundo) + ganadas;

  if (total < config.progresion.estrellasParaDesbloquearMundo) return null;
  return es.mundos[juego][progreso.mundo];
}

/** Tamaño de un récord en milímetros, si la pantalla está calibrada. */
export function mmDeRecord(px: number, pxPorMm: number | null): number | null {
  return pxPorMm === null ? null : pxAMm(px, pxPorMm);
}
