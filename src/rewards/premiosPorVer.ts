/**
 * Al abrir la app se cierran los días pendientes y se pagan solos sus
 * premios: meta, racha, misión, cristales, cofre semanal e insignias nuevas.
 * Aquí se apunta lo ganado para enseñárselo a la jugadora en una tarjeta
 * (ui/componentes/PremiosDelCierre) hasta que la vea.
 */
import { cerrarDias, hayCierrePendiente } from '../engine/dayClose';
import type { Estado, PremiosPorVer } from '../storage/esquema';
import { asegurarMision, cobrarDia, otorgarInsignias, type PremiosDelDia } from './premiosDelDia';

function sinPremiosDelDia(): PremiosDelDia {
  return { monedasPorMeta: 0, monedasPorRacha: 0, monedasPorMision: 0, cofre: null, insignias: [] };
}

export function hayPremios(premios: PremiosPorVer): boolean {
  return (
    premios.monedasPorMeta + premios.monedasPorRacha + premios.monedasPorMision + premios.cristales > 0 ||
    premios.cofres.length > 0 ||
    premios.insignias.length > 0
  );
}

/** Suma lo nuevo a lo que ya esperaba: la racha de antes es la de la primera tanda. */
export function juntarPremios(antes: PremiosPorVer | null, nuevos: PremiosPorVer): PremiosPorVer {
  if (!antes) return nuevos;
  return {
    monedasPorMeta: antes.monedasPorMeta + nuevos.monedasPorMeta,
    monedasPorRacha: antes.monedasPorRacha + nuevos.monedasPorRacha,
    monedasPorMision: antes.monedasPorMision + nuevos.monedasPorMision,
    cristales: antes.cristales + nuevos.cristales,
    cofres: [...antes.cofres, ...nuevos.cofres],
    insignias: [...new Set([...antes.insignias, ...nuevos.insignias])],
    rachaAntes: antes.rachaAntes,
    rachaDespues: nuevos.rachaDespues,
  };
}

/**
 * Cierra los días pendientes (o, si no hay, repasa la misión y las
 * insignias de hoy) y apunta lo ganado. Si no cambia nada, devuelve el mismo
 * estado.
 */
export function cerrarYApuntar(estado: Estado, hoy: string): Estado {
  const delDia = sinPremiosDelDia();
  const cofres: PremiosPorVer['cofres'] = [];
  let cristales = 0;
  let actual: Estado;

  if (estado.ultimoCierre === null || hayCierrePendiente(estado, hoy)) {
    const cierre = cerrarDias(estado, {
      hoy,
      alCerrarDia: (parcial, dia) => {
        const { estado: cobrado, premios } = cobrarDia(parcial, dia);
        delDia.monedasPorMeta += premios.monedasPorMeta;
        delDia.monedasPorRacha += premios.monedasPorRacha;
        delDia.monedasPorMision += premios.monedasPorMision;
        delDia.insignias.push(...premios.insignias);
        if (premios.cofre) cofres.push(premios.cofre);
        return cobrado;
      },
    });
    cristales = cierre.resumen.cristalesGanados;
    actual = asegurarMision(cierre.estado, hoy);
  } else {
    actual = otorgarInsignias(asegurarMision(estado, hoy), hoy, delDia);
  }

  const nuevos: PremiosPorVer = {
    monedasPorMeta: delDia.monedasPorMeta,
    monedasPorRacha: delDia.monedasPorRacha,
    monedasPorMision: delDia.monedasPorMision,
    cristales,
    cofres,
    insignias: delDia.insignias,
    rachaAntes: estado.racha.actual,
    rachaDespues: actual.racha.actual,
  };
  if (!hayPremios(nuevos)) return actual;
  return { ...actual, premiosPorVer: juntarPremios(actual.premiosPorVer, nuevos) };
}
