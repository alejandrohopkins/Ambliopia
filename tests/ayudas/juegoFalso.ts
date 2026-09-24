/**
 * Monta un minijuego sin navegador: lienzo falso, bucle a mano y eventos de
 * puntero y teclado simulados. Sirve para jugar partidas enteras en las
 * pruebas y para revisar cada color que pinta un juego en modo lentes.
 */
import { config, type IdJuego, type Modo } from '../../src/config';
import { DichopticRenderer } from '../../src/engine/DichopticRenderer';
import { Staircase } from '../../src/engine/Staircase';
import { paletaDe } from '../../src/engine/mundos';
import { minijuego } from '../../src/games/registro';
import type { InstanciaDeJuego, ResultadoDeEnsayo, ResumenDeNivel } from '../../src/games/tipos';
import type { CalibracionLentes } from '../../src/storage/esquema';
import { ojoContrario } from '../../src/i18n/es';
import { crearLienzoFalso, type LienzoFalso } from './lienzoFalso';

export const LENTES_DE_PRUEBA: CalibracionLentes = {
  colorOjoDerecho: 'rojo',
  intensidadMaxRojo: 210,
  intensidadMaxCian: 185,
  fecha: '2026-09-19',
};

type Oyente = (evento: Event) => void;

/** Un objetivo de eventos mínimo: guarda los oyentes para poder disparar. */
function objetivoFalso() {
  const oyentes = new Map<string, Set<Oyente>>();
  return {
    oyentes,
    addEventListener(tipo: string, oyente: Oyente) {
      if (!oyentes.has(tipo)) oyentes.set(tipo, new Set());
      oyentes.get(tipo)!.add(oyente);
    },
    removeEventListener(tipo: string, oyente: Oyente) {
      oyentes.get(tipo)?.delete(oyente);
    },
    disparar(tipo: string, evento: Record<string, unknown>) {
      const completo = { preventDefault: () => {}, pointerType: 'mouse', pointerId: 1, ...evento };
      for (const oyente of oyentes.get(tipo) ?? []) oyente(completo as unknown as Event);
    },
  };
}

export interface JuegoFalso {
  instancia: InstanciaDeJuego;
  lienzo: LienzoFalso;
  renderer: DichopticRenderer;
  escaleras: Record<string, Staircase>;
  ensayos: ResultadoDeEnsayo[];
  fin: () => ResumenDeNivel | null;
  /** Avanza el bucle, en pasos de ~60 fps. */
  avanzar(ms: number, pasoMs?: number): void;
  tiempoMs(): number;
  tocar(x: number, y: number): void;
  arrastrar(x: number, y: number): void;
  soltar(x: number, y: number): void;
  tecla(tecla: string, abajo?: boolean): void;
  /** Oyentes que siguen puestos, en el lienzo y en la ventana. */
  oyentesVivos(): number;
}

export function montarJuego(
  id: IdJuego,
  modo: Modo,
  opciones: {
    mundo?: number;
    nivel?: number;
    ancho?: number;
    alto?: number;
    semilla?: number;
    /** Lo que lleva equipado la jugadora: sale en algunos juegos. */
    equipo?: Record<string, string>;
  } = {},
): JuegoFalso {
  const { mundo = 1, nivel = 1, ancho = 1024, alto = 700, semilla = 1, equipo = {} } = opciones;

  const ventana = objetivoFalso();
  const global = globalThis as unknown as Record<string, unknown>;
  global.window = ventana;
  global.requestAnimationFrame = () => 1;
  global.cancelAnimationFrame = () => {};

  const lienzo = crearLienzoFalso(ancho, alto);
  const renderer = new DichopticRenderer(lienzo.ctx, {
    modo,
    ojoAmbliope: config.ojoAmbliope,
    lentes: LENTES_DE_PRUEBA,
    contrasteOjoDominante: config.balance.contrasteInicialOjoDominante,
    paleta: paletaDe(id, mundo),
  });
  renderer.redimensionar(ancho, alto, 1);

  const definicion = minijuego(id);
  if (!definicion) throw new Error(`El juego ${id} no está registrado`);
  const escaleras: Record<string, Staircase> = {};
  for (const configuracion of definicion.escaleras(modo, mundo)) {
    escaleras[configuracion.clave] = new Staircase(configuracion);
  }

  const canvas = {
    ...objetivoFalso(),
    getBoundingClientRect: () => ({ left: 0, top: 0, width: ancho, height: alto }),
  };
  const ensayos: ResultadoDeEnsayo[] = [];
  let resumen: ResumenDeNivel | null = null;

  // Cada juego siembra su azar con la hora: se fija para que la partida
  // simulada sea siempre la misma y la prueba no dependa de la suerte.
  const ahora = Date.now;
  Date.now = () => semilla;
  const instancia = definicion.crear(canvas as unknown as HTMLCanvasElement, {
    modo,
    renderer,
    equipo,
    ojoTapado: modo === 'parche' ? ojoContrario(config.ojoAmbliope) : null,
    escaleras,
    config,
    mundo,
    nivel,
    onEnsayo: (ensayo) => ensayos.push(ensayo),
    onFinNivel: (fin) => {
      resumen = fin;
    },
  });
  Date.now = ahora;
  instancia.iniciar();

  // El paso del bucle, tal como lo llamaría requestAnimationFrame.
  const bucle = (instancia as unknown as { bucle: { paso: (dt: number, t: number) => void } }).bucle;
  let tiempo = 0;

  const puntero = (tipo: string, x: number, y: number) => {
    canvas.disparar(tipo, { clientX: x, clientY: y });
    ventana.disparar(tipo, { clientX: x, clientY: y });
  };

  return {
    instancia,
    lienzo,
    renderer,
    escaleras,
    ensayos,
    fin: () => resumen,
    avanzar(ms, pasoMs = 16) {
      for (let hecho = 0; hecho < ms; hecho += pasoMs) {
        tiempo += pasoMs;
        bucle.paso(pasoMs, tiempo);
      }
    },
    tiempoMs: () => tiempo,
    tocar: (x, y) => canvas.disparar('pointerdown', { clientX: x, clientY: y }),
    arrastrar: (x, y) => canvas.disparar('pointermove', { clientX: x, clientY: y }),
    soltar: (x, y) => puntero('pointerup', x, y),
    tecla(tecla, abajo = true) {
      ventana.disparar(abajo ? 'keydown' : 'keyup', { key: tecla });
    },
    oyentesVivos() {
      let total = 0;
      for (const lista of [...canvas.oyentes.values(), ...ventana.oyentes.values()]) total += lista.size;
      return total;
    },
  };
}
