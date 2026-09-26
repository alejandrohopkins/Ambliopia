/**
 * Reductor del estado guardado. Todas las mutaciones pasan por aquí,
 * de modo que guardar sea siempre "escribir el estado actual".
 */
import { config, type IdJuego, type Modo } from '../config';
import {
  estadoInicial,
  type Ajustes,
  type Estado,
  type EstadoEscalera,
  type Perfil,
  type Contadores,
  type ResumenDeJuegoEnSesion,
  type Sesion,
  type TipoDeMision,
} from './esquema';
import { diaISO, horaISO } from '../engine/fechas';
import {
  avanzar as avanzarMision,
  fijarProgreso as fijarProgresoDeMision,
} from '../rewards/mision';
import { nivelSiguiente, ordenDeNivel, type Nivel } from '../rewards/niveles';
import { redondearASegundos } from './selectores';

export type Accion =
  | { tipo: 'reemplazar'; estado: Estado }
  | { tipo: 'reiniciar' }
  | { tipo: 'perfil/actualizar'; cambios: Partial<Perfil> }
  | { tipo: 'ajustes/actualizar'; cambios: Partial<Ajustes> }
  | { tipo: 'asistente/completar' }
  | { tipo: 'calibracion/pantalla'; pxPorMm: number | null; dia: string }
  | { tipo: 'calibracion/lentes'; lentes: Estado['calibracion']['lentes'] }
  | { tipo: 'balance/fijar'; valor: number; dia: string; motivo: 'manual' }
  | { tipo: 'balance/automatico'; automatico: boolean }
  | { tipo: 'evento/molestia'; modo: Modo; juego: IdJuego | null }
  | { tipo: 'nota/agregar'; texto: string; dia?: string }
  | { tipo: 'nota/borrar'; indice: number }
  | { tipo: 'extra/conceder'; dia: string; minutos: number }
  | { tipo: 'sesion/iniciar'; id: string; dia: string; modo: Modo }
  /** Con `id`, a esa sesión aunque ya se haya cerrado: el último trozo llega al salir. */
  | { tipo: 'sesion/sumarMinutos'; minutos: number; id?: string }
  | { tipo: 'sesion/registrarJuego'; juego: IdJuego; resumen: ResumenDeJuegoEnSesion }
  | { tipo: 'sesion/terminar' }
  | { tipo: 'premio/visto'; dia: string }
  | { tipo: 'premioSemanal/visto'; semana: string }
  | { tipo: 'escaleras/guardar'; escaleras: Record<string, EstadoEscalera> }
  | { tipo: 'progreso/estrellas'; juego: IdJuego; mundo: number; nivel: number; estrellas: number }
  | { tipo: 'progreso/superar'; juego: IdJuego; mundo: number; nivel: number }
  | { tipo: 'economia/sumar'; monedas?: number; cristales?: number }
  | { tipo: 'records/registrar'; clave: string; px: number; mm: number | null; dia: string }
  | { tipo: 'galeria/agregar'; figura: string }
  | { tipo: 'contadores/sumar'; cambios: Partial<Contadores> }
  | { tipo: 'mision/avanzar'; dia: string; tipoDeMision: TipoDeMision; cantidad: number }
  | { tipo: 'mision/fijar'; dia: string; tipoDeMision: TipoDeMision; total: number };

export function reducir(estado: Estado, accion: Accion): Estado {
  switch (accion.tipo) {
    case 'reemplazar':
      return accion.estado;

    case 'reiniciar':
      return estadoInicial();

    case 'perfil/actualizar':
      return { ...estado, perfil: { ...estado.perfil, ...accion.cambios } };

    case 'ajustes/actualizar':
      return { ...estado, ajustes: { ...estado.ajustes, ...accion.cambios } };

    case 'asistente/completar':
      return { ...estado, asistenteCompletado: true };

    case 'calibracion/pantalla':
      return {
        ...estado,
        calibracion: {
          ...estado.calibracion,
          pxPorMm: accion.pxPorMm,
          fechaPantalla: accion.pxPorMm === null ? null : accion.dia,
        },
      };

    case 'calibracion/lentes':
      return {
        ...estado,
        calibracion: { ...estado.calibracion, lentes: accion.lentes },
      };

    case 'balance/fijar': {
      const valor = Math.min(config.balance.maximo, Math.max(config.balance.minimo, accion.valor));
      return {
        ...estado,
        balance: {
          ...estado.balance,
          contrasteOjoDominante: valor,
          historial: [...estado.balance.historial, { fecha: accion.dia, valor, motivo: 'manual' }],
        },
      };
    }

    case 'balance/automatico':
      return { ...estado, balance: { ...estado.balance, automatico: accion.automatico } };

    case 'evento/molestia':
      return {
        ...estado,
        eventos: [
          ...estado.eventos,
          {
            fecha: diaISO(),
            hora: horaISO(),
            modo: accion.modo,
            juego: accion.juego,
            tipo: 'molestia',
          },
        ],
      };

    case 'nota/agregar':
      return {
        ...estado,
        notas: [...estado.notas, { fecha: accion.dia ?? diaISO(), texto: accion.texto }],
      };

    case 'nota/borrar':
      return { ...estado, notas: estado.notas.filter((_, i) => i !== accion.indice) };

    case 'extra/conceder':
      return {
        ...estado,
        extraDelDia: {
          fecha: accion.dia,
          minutos:
            (estado.extraDelDia?.fecha === accion.dia ? estado.extraDelDia.minutos : 0) +
            accion.minutos,
        },
      };

    case 'sesion/iniciar':
      return {
        ...estado,
        sesiones: [
          ...estado.sesiones,
          {
            id: accion.id,
            fecha: accion.dia,
            modo: accion.modo,
            inicio: new Date().toISOString(),
            fin: null,
            minutosActivos: 0,
            porJuego: {},
          },
        ],
      };

    case 'sesion/sumarMinutos': {
      const sumar = (sesion: Sesion): Sesion => ({
        ...sesion,
        minutosActivos: redondearASegundos(sesion.minutosActivos + accion.minutos),
      });
      if (accion.id === undefined) return conSesionAbierta(estado, sumar);
      return {
        ...estado,
        sesiones: estado.sesiones.map((s) => (s.id === accion.id ? sumar(s) : s)),
      };
    }

    case 'premio/visto':
      if (estado.premiosDePantalla.includes(accion.dia)) return estado;
      return { ...estado, premiosDePantalla: [...estado.premiosDePantalla, accion.dia] };

    case 'premioSemanal/visto':
      if (estado.premiosSemanales.includes(accion.semana)) return estado;
      return { ...estado, premiosSemanales: [...estado.premiosSemanales, accion.semana] };

    case 'sesion/registrarJuego':
      return conSesionAbierta(estado, (sesion) => {
        const previo = sesion.porJuego[accion.juego];
        return {
          ...sesion,
          porJuego: {
            ...sesion.porJuego,
            [accion.juego]: previo ? combinarResumen(previo, accion.resumen) : accion.resumen,
          },
        };
      });

    case 'sesion/terminar':
      return conSesionAbierta(estado, (sesion) => ({ ...sesion, fin: new Date().toISOString() }));

    case 'escaleras/guardar':
      return { ...estado, escaleras: { ...estado.escaleras, ...accion.escaleras } };

    case 'progreso/estrellas': {
      const clave = `${accion.mundo}:${accion.nivel}`;
      const progreso = estado.progreso[accion.juego];
      // Las estrellas nunca bajan: repetir un nivel solo puede mejorarlas.
      const mejor = Math.max(progreso.estrellasPorNivel[clave] ?? 0, accion.estrellas);
      return {
        ...estado,
        progreso: {
          ...estado.progreso,
          [accion.juego]: {
            ...progreso,
            estrellasPorNivel: { ...progreso.estrellasPorNivel, [clave]: mejor },
          },
        },
      };
    }

    case 'progreso/superar': {
      // Superar un nivel deja el juego en el siguiente; el último nivel del
      // último mundo se sigue jugando. El progreso nunca retrocede.
      const progreso = estado.progreso[accion.juego];
      const superado = { mundo: accion.mundo, nivel: accion.nivel };
      const siguiente = nivelSiguiente(superado) ?? superado;
      const masAlto = (a: Nivel, b: Nivel | null) =>
        b && ordenDeNivel(b) > ordenDeNivel(a) ? b : a;
      const destino = masAlto(siguiente, progreso);
      return {
        ...estado,
        progreso: {
          ...estado.progreso,
          [accion.juego]: {
            ...progreso,
            mundo: destino.mundo,
            nivel: destino.nivel,
            superado: masAlto(superado, progreso.superado),
          },
        },
      };
    }

    case 'economia/sumar':
      return {
        ...estado,
        economia: {
          ...estado.economia,
          monedas: estado.economia.monedas + (accion.monedas ?? 0),
          cristales: estado.economia.cristales + (accion.cristales ?? 0),
        },
      };

    case 'records/registrar': {
      const previo = estado.records[accion.clave];
      // El récord es el objeto MÁS PEQUEÑO encontrado: menor es mejor.
      if (previo && previo.mejorPx <= accion.px) return estado;
      return {
        ...estado,
        records: {
          ...estado.records,
          [accion.clave]: { mejorPx: accion.px, mejorMm: accion.mm, fecha: accion.dia },
        },
      };
    }

    case 'galeria/agregar':
      if (estado.galeria.includes(accion.figura)) return estado;
      return { ...estado, galeria: [...estado.galeria, accion.figura] };

    case 'contadores/sumar': {
      const contadores = { ...estado.contadores };
      for (const [clave, cantidad] of Object.entries(accion.cambios)) {
        const nombre = clave as keyof Contadores;
        contadores[nombre] = contadores[nombre] + (cantidad ?? 0);
      }
      return { ...estado, contadores };
    }

    case 'mision/avanzar': {
      const mision = estado.misiones[accion.dia];
      if (!mision) return estado;
      const actualizada = avanzarMision(mision, accion.tipoDeMision, accion.cantidad);
      if (actualizada === mision) return estado;
      return { ...estado, misiones: { ...estado.misiones, [accion.dia]: actualizada } };
    }

    case 'mision/fijar': {
      const mision = estado.misiones[accion.dia];
      if (!mision) return estado;
      const actualizada = fijarProgresoDeMision(mision, accion.tipoDeMision, accion.total);
      if (actualizada === mision) return estado;
      return { ...estado, misiones: { ...estado.misiones, [accion.dia]: actualizada } };
    }

    default:
      return estado;
  }
}

/** Aplica un cambio a la sesión abierta (la última sin fin). */
function conSesionAbierta(estado: Estado, cambio: (s: Estado['sesiones'][number]) => Estado['sesiones'][number]): Estado {
  let indice = -1;
  for (let i = estado.sesiones.length - 1; i >= 0; i -= 1) {
    if (estado.sesiones[i].fin === null) {
      indice = i;
      break;
    }
  }
  if (indice < 0) return estado;
  const sesiones = [...estado.sesiones];
  sesiones[indice] = cambio(sesiones[indice]);
  return { ...estado, sesiones };
}

/** Varios niveles del mismo juego en una sesión se acumulan. */
function combinarResumen(
  previo: ResumenDeJuegoEnSesion,
  nuevo: ResumenDeJuegoEnSesion,
): ResumenDeJuegoEnSesion {
  const ensayos = previo.ensayos + nuevo.ensayos;
  const tiempo =
    ensayos > 0
      ? (previo.tiempoReaccionMedioMs * previo.ensayos + nuevo.tiempoReaccionMedioMs * nuevo.ensayos) /
        ensayos
      : 0;
  return {
    niveles: previo.niveles + nuevo.niveles,
    perfectos: previo.perfectos + nuevo.perfectos,
    ensayos,
    aciertos: previo.aciertos + nuevo.aciertos,
    // El último umbral es el más informado: la escalera ya convergió más.
    umbrales: { ...previo.umbrales, ...nuevo.umbrales },
    tiempoReaccionMedioMs: tiempo,
  };
}
