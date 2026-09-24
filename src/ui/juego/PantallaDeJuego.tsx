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
import type { MotivoDeParada, SessionTimer } from '../../engine/SessionTimer';
import { pxAMm } from '../../engine/color';
import { minijuego } from '../../games/registro';
import { figuraDeNivel } from '../../games/torre/figuras';
import type { InstanciaDeJuego, ResultadoDeEnsayo, ResumenDeNivel } from '../../games/tipos';
import { premioDeNivel } from '../../rewards/economia';
import { nivelSiguiente, nivelSuperado, type Nivel } from '../../rewards/niveles';
import { ojoDominante } from '../../storage/esquema';
import { OverlayDeDesarrollo } from '../componentes/OverlayDeDesarrollo';
import { modoDesarrollo } from '../navegacion';
import { avanzarUnDiaDeDesarrollo } from '../reloj';
import { audio } from '../../engine/audio';
import { MenuDePausa } from './MenuDePausa';
import { FinDeNivel } from './FinDeNivel';
import { ControlesDelJuego } from './ControlesDelJuego';
import { relojDeJuego } from './relojDeJuego';
import { BarraDeTiempo, ESTILO_EN_JUEGO, RelojEnJuego } from '../componentes/RelojDelDia';
import { AvisoDePremio } from '../componentes/PremioDePantalla';

export interface FinDeNivelDatos {
  resumen: ResumenDeNivel;
  monedas: number;
  huboRecord: boolean;
  /** Se logró la precisión pedida: la próxima partida sube de nivel. */
  superado: boolean;
  /** Nivel al que se sube, o null si no se superó o ya era el último. */
  siguiente: Nivel | null;
  /** Nombre del mundo que se acaba de abrir, si lo hubo. */
  mundoNuevo: string | null;
}

export function PantallaDeJuego({
  juego,
  modo,
  alVolver,
  alCancelar,
  alDescanso,
  alMolestia,
}: {
  juego: IdJuego;
  modo: Modo;
  alVolver: () => void;
  /** Salir desde los controles, antes de jugar. */
  alCancelar: () => void;
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
  // Antes de jugar se muestran los controles; el juego se monta al aceptarlos.
  const [listo, setListo] = useState(false);
  const [enPausa, setEnPausa] = useState(false);
  const [fin, setFin] = useState<FinDeNivelDatos | null>(null);
  // Segundos activos que el reloj aún no guardó, para el reloj del día.
  const [sinGuardar, setSinGuardar] = useState(0);
  const [desarrollo, setDesarrollo] = useState({ fps: 0, minutos: 0, parada: null as MotivoDeParada | null });

  const alTerminarNivel = useRef<(resumen: ResumenDeNivel) => void>(() => {});

  /** Para el reloj y guarda todo el tiempo activo, también el trozo de minuto. */
  const guardarTiempo = useCallback(() => {
    const temporizador = reloj.current;
    if (!temporizador) return;
    temporizador.detener();
    const minutos = temporizador.consumirMinutos();
    if (minutos > 0) sumarMinutos(minutos);
    setSinGuardar(0);
  }, [sumarMinutos]);

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

  /** Guarda el nivel terminado: escaleras, estrellas, nivel alcanzado, monedas y récords. */
  const terminarNivel = useCallback(
    (resumen: ResumenDeNivel) => {
      const premio = premioDeNivel(resumen);
      audio().reproducir('nivel');
      // La pantalla de resultados no es juego activo: el reloj se para y se
      // guarda hasta el último segundo.
      guardarTiempo();

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

      const superado = nivelSuperado(resumen);
      const siguiente = superado ? nivelSiguiente(progreso) : null;
      setFin({
        resumen,
        monedas: premio.monedas,
        huboRecord,
        superado,
        siguiente,
        mundoNuevo:
          siguiente && siguiente.mundo !== progreso.mundo ? es.mundos[juego][siguiente.mundo - 1] : null,
      });
    },
    [despachar, escaleras, guardarTiempo, juego, progreso, registrarNivel],
  );

  alTerminarNivel.current = terminarNivel;

  // Montaje del minijuego.
  useEffect(() => {
    if (!listo) return;
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

    const temporizador = relojDeJuego(estado.ajustes.descansoCadaMin);
    reloj.current = temporizador;
    ensayos.current = [];

    const creado = definicion.crear(canvas, {
      modo,
      renderer: dibujante,
      // Lo comprado se ve jugando: casco, traje, pico, nave, estela y mascota.
      equipo: estado.economia.equipado,
      ojoTapado: modo === 'parche' ? ojoDominante(estado.perfil) : null,
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
      // Salir a medias (descanso, pausa, molestia, botón atrás) no pierde ni
      // el tiempo jugado ni el avance de la escalera: se guardan al desmontar.
      guardarTiempo();
      guardarEscaleras(escaleras);
      instancia.current = null;
      renderer.current = null;
      reloj.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [juego, modo, progreso.mundo, progreso.nivel, intento, escaleras, listo]);

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
      setSinGuardar(Math.floor(temporizador.msActivos / 1000));

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
      if (evento.key !== 'Escape' || fin || !listo) return;
      setEnPausa((activa) => !activa);
    };
    window.addEventListener('keydown', alTeclado);
    return () => window.removeEventListener('keydown', alTeclado);
  }, [fin, listo]);

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

  // El tiempo y las escaleras se guardan al desmontar, salga por donde salga.
  const salir = alVolver;

  if (!listo) {
    return (
      <>
        <BarraDeTiempo />
        <ControlesDelJuego
          juego={juego}
          mundo={progreso.mundo}
          nivel={progreso.nivel}
          superado={progreso.superado}
          alEmpezar={() => setListo(true)}
          alVolver={alCancelar}
        />
        <AvisoDePremio />
      </>
    );
  }

  if (fin) {
    return (
      <>
        <BarraDeTiempo />
        <FinDeNivel
          juego={juego}
          datos={fin}
          alSeguir={() => {
            // El nivel alcanzado ya quedó guardado: se juega el que toque ahora.
            setFin(null);
            setIntento((n) => n + 1);
          }}
          alVolver={salir}
        />
        {/* La felicitación del día sale aquí, entre niveles, nunca jugando. */}
        <AvisoDePremio />
      </>
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

      <RelojEnJuego segundosSinGuardar={sinGuardar} />

      {/* Sobre el lienzo solo negro y gris: en lentes no cabe otro color. */}
      <button
        className="pixelado"
        onClick={() => setEnPausa(true)}
        style={{ ...ESTILO_EN_JUEGO, position: 'absolute', left: 8, bottom: 8, minHeight: 44 }}
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

/** Tamaño de un récord en milímetros, si la pantalla está calibrada. */
export function mmDeRecord(px: number, pxPorMm: number | null): number | null {
  return pxPorMm === null ? null : pxAMm(px, pxPorMm);
}
