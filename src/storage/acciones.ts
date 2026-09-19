/**
 * Reductor del estado guardado. Todas las mutaciones pasan por aquí,
 * de modo que guardar sea siempre "escribir el estado actual".
 */
import { config, type IdJuego, type Modo } from '../config';
import { estadoInicial, type Ajustes, type Estado, type Perfil } from './esquema';
import { diaISO, horaISO } from '../engine/fechas';

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
  | { tipo: 'extra/conceder'; dia: string; minutos: number };

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

    default:
      return estado;
  }
}
