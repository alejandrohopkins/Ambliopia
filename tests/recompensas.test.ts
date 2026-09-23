import { describe, it, expect } from 'vitest';
import { config } from '../src/config';
import { CATALOGO, CATEGORIAS, articulo, articulosDe, rangoDePrecio } from '../src/rewards/catalogo';
import { comprar, equipar, regalar, faltantesPorRareza, puedePagar } from '../src/rewards/tienda';
import { misionDelDia, avanzar, fijarProgreso, cobrar, TIPOS } from '../src/rewards/mision';
import { cofreGanado, abrirCofre, claveDeCofre } from '../src/rewards/cofre';
import { INSIGNIAS, nivelAlcanzado, insigniasNuevas } from '../src/rewards/insignias';
import { cobrarDia, asegurarMision } from '../src/rewards/premiosDelDia';
import { premioDeNivel, monedasPorMinutos, bonoDeRacha } from '../src/rewards/economia';
import {
  JUEGOS,
  estadoInicial,
  type Economia,
  type Estado,
  type Mision,
  type Sesion,
} from '../src/storage/esquema';
import { es } from '../src/i18n/es';
import { aportesDelNivel, huboTresFallosSeguidos } from '../src/rewards/progresoDeJuego';
import { componerAvatar, paletaDeAvatar } from '../src/avatar/compositor';
import { ACCESORIOS, CASCOS, ESTELAS, MASCOTAS, NAVES, PICOS } from '../src/avatar/piezas';

function economia(parcial: Partial<Economia> = {}): Economia {
  return { monedas: 0, cristales: 0, inventario: [], equipado: {}, ...parcial };
}

function sesion(fecha: string, minutos: number): Sesion {
  return {
    id: `${fecha}-${minutos}`,
    fecha,
    modo: 'parche',
    inicio: `${fecha}T10:00:00.000Z`,
    fin: null,
    minutosActivos: minutos,
    porJuego: {},
  };
}

describe('catálogo', () => {
  it('cubre las nueve categorías de la especificación', () => {
    for (const categoria of CATEGORIAS) {
      expect(articulosDe(categoria).length, categoria).toBeGreaterThan(0);
    }
  });

  it('los identificadores no se repiten', () => {
    expect(new Set(CATALOGO.map((a) => a.id)).size).toBe(CATALOGO.length);
  });

  it('cada artículo tiene nombre visible en español', () => {
    for (const art of CATALOGO) {
      expect(es.articulos[art.id], art.id).toBeTruthy();
    }
  });

  it('los precios caen dentro del rango de su rareza', () => {
    for (const art of CATALOGO) {
      const rango = rangoDePrecio(art.rareza);
      if (!rango) {
        expect(art.precioMonedas, art.id).toBeUndefined();
        expect(art.precioCristales, art.id).toBeUndefined();
        continue;
      }
      const precio = art.rareza === 'legendario' ? art.precioCristales : art.precioMonedas;
      expect(precio, art.id).toBeGreaterThanOrEqual(rango.min);
      expect(precio, art.id).toBeLessThanOrEqual(rango.max);
    }
  });

  it('los legendarios se pagan con cristales y el resto con monedas', () => {
    for (const art of CATALOGO) {
      if (art.rareza === 'legendario') {
        expect(art.precioCristales, art.id).toBeGreaterThan(0);
        expect(art.precioMonedas).toBeUndefined();
      } else if (art.rareza !== 'gratis') {
        expect(art.precioMonedas, art.id).toBeGreaterThan(0);
        expect(art.precioCristales).toBeUndefined();
      }
    }
  });

  it('hay ocho colores de traje, dos de ellos gratis', () => {
    const trajes = articulosDe('trajes').filter((a) => a.color);
    expect(trajes).toHaveLength(8);
    expect(trajes.filter((a) => a.rareza === 'gratis')).toHaveLength(2);
  });
});

describe('tienda', () => {
  it('comprar descuenta, añade al inventario y equipa', () => {
    const resultado = comprar(economia({ monedas: 500 }), 'casco-gato');
    expect(resultado.ok).toBe(true);
    expect(resultado.economia.monedas).toBe(500 - articulo('casco-gato')!.precioMonedas!);
    expect(resultado.economia.inventario).toContain('casco-gato');
    expect(resultado.economia.equipado.cascos).toBe('casco-gato');
  });

  it('sin monedas no compra y no toca nada', () => {
    const antes = economia({ monedas: 10 });
    const resultado = comprar(antes, 'casco-gato');
    expect(resultado.ok).toBe(false);
    expect(resultado.motivo).toBe('sinMonedas');
    expect(resultado.economia).toBe(antes);
  });

  it('los legendarios cuestan cristales, no monedas', () => {
    const conMonedas = comprar(economia({ monedas: 100000 }), 'casco-corona');
    expect(conMonedas.ok).toBe(false);
    expect(conMonedas.motivo).toBe('sinCristales');

    const conCristales = comprar(economia({ cristales: 20 }), 'casco-corona');
    expect(conCristales.ok).toBe(true);
    expect(conCristales.economia.cristales).toBe(20 - articulo('casco-corona')!.precioCristales!);
    expect(conCristales.economia.monedas).toBe(0);
  });

  it('no se compra dos veces lo mismo', () => {
    const resultado = comprar(economia({ monedas: 999, inventario: ['casco-gato'] }), 'casco-gato');
    expect(resultado.ok).toBe(false);
    expect(resultado.motivo).toBe('yaLoTiene');
  });

  it('solo se equipa lo que ya se tiene', () => {
    const sinEl = economia();
    expect(equipar(sinEl, 'casco-gato')).toBe(sinEl);
    const conEl = economia({ inventario: ['casco-gato'] });
    expect(equipar(conEl, 'casco-gato').equipado.cascos).toBe('casco-gato');
  });

  it('un regalo entra sin cobrar', () => {
    const despues = regalar(economia({ monedas: 100 }), 'casco-gato');
    expect(despues.monedas).toBe(100);
    expect(despues.inventario).toContain('casco-gato');
  });

  it('sabe qué artículos faltan por rareza, en el orden del catálogo', () => {
    const faltan = faltantesPorRareza(economia({ inventario: ['casco-gato'] }), ['comun']);
    expect(faltan).not.toContain('casco-gato');
    expect(faltan).toContain('traje-musgo');
    expect(faltan.every((id) => articulo(id)!.rareza === 'comun')).toBe(true);
  });

  it('puedePagar mira las dos monedas', () => {
    expect(puedePagar(economia({ monedas: 200 }), articulo('casco-gato')!)).toBe(true);
    expect(puedePagar(economia({ cristales: 5 }), articulo('casco-corona')!)).toBe(false);
  });
});

describe('misión del día', () => {
  it('la misma fecha da siempre la misma misión', () => {
    expect(misionDelDia('2026-09-19')).toEqual(misionDelDia('2026-09-19'));
  });

  it('fechas distintas dan misiones distintas a lo largo del mes', () => {
    const vistas = new Set(
      Array.from({ length: 30 }, (_, i) => {
        const dia = `2026-09-${String(i + 1).padStart(2, '0')}`;
        return `${misionDelDia(dia).tipo}:${misionDelDia(dia).objetivo}`;
      }),
    );
    expect(vistas.size).toBeGreaterThan(5);
  });

  it('el objetivo cabe dentro de la meta diaria', () => {
    for (let i = 1; i <= 60; i += 1) {
      const dia = `2026-0${i < 32 ? '9' : '8'}-${String((i % 28) + 1).padStart(2, '0')}`;
      const mision = misionDelDia(dia);
      const [minimo, maximo] = config.misiones.rangos[mision.tipo];
      expect(mision.objetivo).toBeGreaterThanOrEqual(minimo);
      expect(mision.objetivo).toBeLessThanOrEqual(maximo);
      if (mision.tipo === 'minutos') {
        expect(mision.objetivo).toBeLessThanOrEqual(config.sesion.metaDiariaMin + 5);
      }
    }
  });

  it('usa todos sus tipos, uno por cada cosa que se puede pedir', () => {
    // Un tipo por minijuego (cristales, saboteadores, figuras, estrellas de
    // energía, celdas) más minutos, estrellas de nivel y juegos distintos.
    expect(TIPOS).toHaveLength(JUEGOS.length + 3);
    const vistos = new Set<string>();
    for (let i = 0; i < 400; i += 1) {
      vistos.add(misionDelDia(`2026-01-${String((i % 28) + 1).padStart(2, '0')}-${i}`).tipo);
    }
    expect(vistos.size).toBe(TIPOS.length);
  });

  it('cada tipo tiene su rango y su texto', () => {
    for (const tipo of TIPOS) {
      expect(config.misiones.rangos[tipo], tipo).toBeTruthy();
      expect(es.misiones[tipo], tipo).toBeTruthy();
    }
  });

  it('el progreso avanza y no se pasa del objetivo', () => {
    let mision: Mision = {
      tipo: 'cristales',
      objetivo: 10,
      progreso: 0,
      completada: false,
      cobrada: false,
    };
    mision = avanzar(mision, 'cristales', 4);
    expect(mision.progreso).toBe(4);
    expect(mision.completada).toBe(false);
    mision = avanzar(mision, 'saboteadores', 50);
    expect(mision.progreso).toBe(4);
    mision = avanzar(mision, 'cristales', 20);
    expect(mision.progreso).toBe(10);
    expect(mision.completada).toBe(true);
  });

  it('los totales del día no hacen retroceder el progreso', () => {
    const base: Mision = {
      tipo: 'minutos',
      objetivo: 20,
      progreso: 12,
      completada: false,
      cobrada: false,
    };
    expect(fijarProgreso(base, 'minutos', 5).progreso).toBe(12);
    expect(fijarProgreso(base, 'minutos', 18).progreso).toBe(18);
  });

  it('el premio se cobra una sola vez', () => {
    const completada: Mision = {
      tipo: 'minutos',
      objetivo: 1,
      progreso: 1,
      completada: true,
      cobrada: false,
    };
    const primera = cobrar(completada);
    expect(primera.monedas).toBe(config.economia.monedasMisionDelDia);
    expect(cobrar(primera.mision).monedas).toBe(0);
  });

  it('una misión sin completar no paga', () => {
    expect(cobrar({ tipo: 'minutos', objetivo: 10, progreso: 3, completada: false, cobrada: false }).monedas).toBe(0);
  });
});

describe('cofre semanal', () => {
  const semana = ['2026-09-14', '2026-09-15', '2026-09-16', '2026-09-17', '2026-09-18'];

  it('se gana con cinco días cumplidos en la misma semana', () => {
    expect(cofreGanado(semana, '2026-09-19')).toBe(true);
    expect(cofreGanado(semana.slice(0, 4), '2026-09-19')).toBe(false);
  });

  it('los días de otra semana no cuentan', () => {
    const repartidos = ['2026-09-14', '2026-09-15', '2026-09-21', '2026-09-22', '2026-09-23'];
    expect(cofreGanado(repartidos, '2026-09-16')).toBe(false);
  });

  it('da monedas y un artículo que no tenga', () => {
    const { economia: despues, premio } = abrirCofre(economia({ monedas: 10 }), '2026-09-19');
    expect(premio.monedas).toBe(config.economia.cofreSemanalMonedas);
    expect(despues.monedas).toBe(10 + config.economia.cofreSemanalMonedas);
    expect(premio.articulo).not.toBeNull();
    expect(despues.inventario).toContain(premio.articulo!);
    expect(['comun', 'raro']).toContain(articulo(premio.articulo!)!.rareza);
  });

  it('con todo comprado sigue dando monedas', () => {
    const todo = CATALOGO.map((a) => a.id);
    const { premio, economia: despues } = abrirCofre(economia({ inventario: todo }), '2026-09-19');
    expect(premio.articulo).toBeNull();
    expect(despues.monedas).toBe(config.economia.cofreSemanalMonedas);
  });

  it('la clave del cofre es la semana ISO', () => {
    expect(claveDeCofre('2026-09-19')).toBe(claveDeCofre('2026-09-14'));
    expect(claveDeCofre('2026-09-21')).not.toBe(claveDeCofre('2026-09-19'));
  });
});

describe('insignias', () => {
  it('cada insignia tiene nombre y criterio, y no se repiten', () => {
    expect(new Set(INSIGNIAS.map((i) => i.id)).size).toBe(INSIGNIAS.length);
    for (const insignia of INSIGNIAS) {
      expect(es.insignias[insignia.id]?.nombre, insignia.id).toBeTruthy();
      expect(es.insignias[insignia.id]?.criterio, insignia.id).toBeTruthy();
    }
  });

  it('el primer cristal se gana con un acierto en Minero', () => {
    const definicion = INSIGNIAS.find((i) => i.id === 'primer_cristal')!;
    const estado = estadoInicial();
    expect(nivelAlcanzado(definicion, estado, '2026-09-19')).toBe(0);
    estado.contadores.cristalesEncontrados = 1;
    expect(nivelAlcanzado(definicion, estado, '2026-09-19')).toBe(1);
  });

  it('ojo de halcón sube al bajar el récord: menor es mejor', () => {
    const definicion = INSIGNIAS.find((i) => i.id === 'ojo_de_halcon')!;
    const estado = estadoInicial();
    expect(nivelAlcanzado(definicion, estado, '2026-09-19')).toBe(0);
    estado.records['minero:parche'] = { mejorPx: 24, mejorMm: null, fecha: '2026-09-19' };
    expect(nivelAlcanzado(definicion, estado, '2026-09-19')).toBe(1);
    estado.records['minero:parche'] = { mejorPx: 9, mejorMm: null, fecha: '2026-09-19' };
    expect(nivelAlcanzado(definicion, estado, '2026-09-19')).toBe(2);
    estado.records['minero:parche'] = { mejorPx: 3, mejorMm: null, fecha: '2026-09-19' };
    expect(nivelAlcanzado(definicion, estado, '2026-09-19')).toBe(3);
  });

  it('constancia tiene cuatro niveles de racha', () => {
    const definicion = INSIGNIAS.find((i) => i.id === 'constancia')!;
    const estado = estadoInicial();
    for (const [indice, dias] of config.insignias.rachasParaConstancia.entries()) {
      estado.racha.mejor = dias;
      expect(nivelAlcanzado(definicion, estado, '2026-09-19')).toBe(indice + 1);
    }
  });

  it('equipo de dos ojos cuenta las subidas del contraste', () => {
    const definicion = INSIGNIAS.find((i) => i.id === 'dos_ojos')!;
    const estado = estadoInicial();
    estado.balance.historial = [
      { fecha: '2026-09-16', valor: 0.3, motivo: 'subida' },
      { fecha: '2026-09-17', valor: 0.25, motivo: 'bajada' },
      { fecha: '2026-09-18', valor: 0.35, motivo: 'subida' },
    ];
    expect(nivelAlcanzado(definicion, estado, '2026-09-19')).toBe(0);
    estado.balance.historial.push({ fecha: '2026-09-19', valor: 0.45, motivo: 'subida' });
    expect(nivelAlcanzado(definicion, estado, '2026-09-19')).toBe(1);
  });

  it('balance perfecto llega con el contraste en uno', () => {
    const definicion = INSIGNIAS.find((i) => i.id === 'balance')!;
    const estado = estadoInicial();
    estado.balance.contrasteOjoDominante = config.balance.maximo;
    expect(nivelAlcanzado(definicion, estado, '2026-09-19')).toBe(1);
  });

  it('exploradora pide todos los minijuegos el mismo día', () => {
    const definicion = INSIGNIAS.find((i) => i.id === 'exploradora')!;
    const estado = estadoInicial();
    const resumen = { ensayos: 1, aciertos: 1, umbrales: {}, tiempoReaccionMedioMs: 0 };
    // Todos menos el último: todavía no cuenta.
    estado.sesiones = JUEGOS.slice(0, -1).map((juego) => ({
      ...sesion('2026-09-19', 5),
      porJuego: { [juego]: resumen },
    }));
    expect(nivelAlcanzado(definicion, estado, '2026-09-19')).toBe(0);
    estado.sesiones.push({
      ...sesion('2026-09-19', 5),
      porJuego: { [JUEGOS[JUEGOS.length - 1]]: resumen },
    });
    expect(nivelAlcanzado(definicion, estado, '2026-09-19')).toBe(1);
  });

  it('solo informa de las insignias que mejoran', () => {
    const estado = estadoInicial();
    estado.contadores.cristalesEncontrados = 1;
    expect(insigniasNuevas(estado, '2026-09-19').map((i) => i.id)).toContain('primer_cristal');

    estado.insignias.primer_cristal = { nivel: 1, fecha: '2026-09-18' };
    expect(insigniasNuevas(estado, '2026-09-19').map((i) => i.id)).not.toContain('primer_cristal');
  });
});

describe('premios del día', () => {
  function conMeta(dia: string, minutos = config.sesion.metaDiariaMin): Estado {
    const estado = estadoInicial();
    estado.sesiones = [sesion(dia, minutos)];
    return estado;
  }

  it('cumplir la meta paga su premio', () => {
    const { estado, premios } = cobrarDia(conMeta('2026-09-19'), '2026-09-19');
    expect(premios.monedasPorMeta).toBe(config.economia.monedasMetaDiaria);
    expect(estado.economia.monedas).toBeGreaterThanOrEqual(config.economia.monedasMetaDiaria);
  });

  it('sin la meta no paga nada', () => {
    const { premios } = cobrarDia(conMeta('2026-09-19', 3), '2026-09-19');
    expect(premios.monedasPorMeta).toBe(0);
    expect(premios.monedasPorRacha).toBe(0);
  });

  it('el bono de racha crece con los días y tiene tope', () => {
    const estado = conMeta('2026-09-19');
    estado.racha = {
      actual: 4,
      mejor: 4,
      protectoresDisponibles: 1,
      ultimoDiaCumplido: '2026-09-19',
      semanaDeProtectores: '2026-W38',
    };
    const { premios } = cobrarDia(estado, '2026-09-19');
    expect(premios.monedasPorRacha).toBe(4 * config.economia.bonoRachaPorDia);
    expect(bonoDeRacha(1000)).toBe(config.economia.bonoRachaMaximo);
  });

  it('la misión completada se cobra una vez', () => {
    let estado = asegurarMision(conMeta('2026-09-19'), '2026-09-19');
    estado = {
      ...estado,
      misiones: {
        ...estado.misiones,
        '2026-09-19': { ...estado.misiones['2026-09-19'], progreso: 999, completada: true },
      },
    };
    const primera = cobrarDia(estado, '2026-09-19');
    expect(primera.premios.monedasPorMision).toBe(config.economia.monedasMisionDelDia);
    const segunda = cobrarDia(primera.estado, '2026-09-19');
    expect(segunda.premios.monedasPorMision).toBe(0);
  });

  it('el cofre se abre una vez por semana', () => {
    const estado = estadoInicial();
    estado.sesiones = ['2026-09-14', '2026-09-15', '2026-09-16', '2026-09-17', '2026-09-18'].map(
      (d) => sesion(d, config.sesion.metaDiariaMin),
    );
    const primera = cobrarDia(estado, '2026-09-18');
    expect(primera.premios.cofre).not.toBeNull();
    const segunda = cobrarDia(primera.estado, '2026-09-18');
    expect(segunda.premios.cofre).toBeNull();
  });

  it('deja lista la misión del día', () => {
    const { estado } = cobrarDia(conMeta('2026-09-19'), '2026-09-19');
    expect(estado.misiones['2026-09-19']).toBeDefined();
  });

  it('otorga las insignias conseguidas', () => {
    const estado = conMeta('2026-09-19');
    estado.contadores.cristalesEncontrados = 1;
    const { estado: despues, premios } = cobrarDia(estado, '2026-09-19');
    expect(premios.insignias).toContain('primer_cristal');
    expect(despues.insignias.primer_cristal.nivel).toBe(1);
  });
});

describe('calibración de la economía', () => {
  /**
   * Con la meta diaria de 20 minutos, un día típico son unos tres niveles.
   * Debe alcanzar para un artículo común al día y un legendario cada una o
   * dos semanas.
   */
  const resumenTipico = {
    ensayos: 15,
    aciertos: 11,
    precision: 11 / 15,
    estrellas: 2,
    umbrales: {},
    duracionMs: 180_000,
    mejorRacha: 4,
  };

  function monedasDeUnDia(diasDeRacha: number): number {
    return (
      monedasPorMinutos(config.sesion.metaDiariaMin) +
      3 * premioDeNivel(resumenTipico).monedas +
      config.economia.monedasMetaDiaria +
      config.economia.monedasMisionDelDia +
      bonoDeRacha(diasDeRacha)
    );
  }

  it('un día de 20 minutos paga al menos un artículo común', () => {
    expect(monedasDeUnDia(0)).toBeGreaterThanOrEqual(config.economia.precios.comunMin);
  });

  it('pero no tanto como para comprarlo todo de golpe', () => {
    expect(monedasDeUnDia(10)).toBeLessThan(config.economia.precios.raroMax);
  });

  it('una semana constante alcanza para un artículo raro', () => {
    const semana = Array.from({ length: 7 }, (_, i) => monedasDeUnDia(i)).reduce((a, b) => a + b, 0);
    expect(semana).toBeGreaterThanOrEqual(config.economia.precios.raroMax);
  });

  it('un legendario cae cada una o dos semanas', () => {
    const cristalesPorSemana = 7 * config.economia.cristalesPorDiaConMeta;
    const masBarato = Math.min(
      ...CATALOGO.filter((a) => a.rareza === 'legendario').map((a) => a.precioCristales!),
    );
    const masCaro = Math.max(
      ...CATALOGO.filter((a) => a.rareza === 'legendario').map((a) => a.precioCristales!),
    );
    // Ninguno se consigue en menos de una semana: si no, no sería legendario.
    expect(masBarato).toBeGreaterThan(cristalesPorSemana);
    // Y ninguno tarda más de dos: dos semanas constantes alcanzan para cualquiera.
    expect(masCaro).toBeLessThanOrEqual(2 * cristalesPorSemana);
  });
});

describe('aportes de un nivel a insignias y misión', () => {
  function ensayo(parcial: Partial<import('../src/games/tipos').ResultadoDeEnsayo> = {}) {
    return {
      juego: 'minero' as const,
      modo: 'parche' as const,
      parametro: 'tamano',
      valor: 20,
      acierto: true,
      tiempoReaccionMs: 800,
      esEnsayoDeConfianza: false,
      ...parcial,
    };
  }
  const resumenNivel = {
    ensayos: 15,
    aciertos: 10,
    precision: 10 / 15,
    estrellas: 2,
    umbrales: {},
    duracionMs: 1000,
    mejorRacha: 3,
  };

  it('Minero cuenta cristales encontrados', () => {
    const ensayos = [ensayo(), ensayo(), ensayo({ acierto: false })];
    const aportes = aportesDelNivel('minero', ensayos, resumenNivel);
    expect(aportes.contadores.cristalesEncontrados).toBe(2);
    expect(aportes.mision).toContainEqual({ tipo: 'cristales', cantidad: 2 });
  });

  it('los ensayos de confianza no cuentan para nada', () => {
    const ensayos = [ensayo(), ensayo({ esEnsayoDeConfianza: true })];
    expect(aportesDelNivel('minero', ensayos, resumenNivel).contadores.cristalesEncontrados).toBe(1);
  });

  it('en Meteoritos solo cuentan las estrellas, no las rocas esquivadas', () => {
    const ensayos = [
      ensayo({ juego: 'meteoritos', detalle: 'estrella' }),
      ensayo({ juego: 'meteoritos', detalle: 'estrella' }),
      ensayo({ juego: 'meteoritos', detalle: 'roca' }),
    ];
    const aportes = aportesDelNivel('meteoritos', ensayos, resumenNivel);
    expect(aportes.contadores.estrellasAtrapadas).toBe(2);
    expect(aportes.mision).toContainEqual({ tipo: 'estrellasDeEnergia', cantidad: 2 });
  });

  it('la Torre aporta una figura', () => {
    expect(aportesDelNivel('torre', [ensayo({ juego: 'torre' })], resumenNivel).mision).toContainEqual(
      { tipo: 'figuras', cantidad: 1 },
    );
  });

  it('todo nivel aporta sus estrellas a la misión', () => {
    expect(aportesDelNivel('saboteador', [], resumenNivel).mision).toContainEqual({
      tipo: 'estrellasDeNivel',
      cantidad: 2,
    });
  });

  it('detecta tres fallos seguidos para la insignia Perseverante', () => {
    const fallo = ensayo({ acierto: false });
    expect(huboTresFallosSeguidos([fallo, fallo, fallo])).toBe(true);
    expect(huboTresFallosSeguidos([fallo, fallo, ensayo(), fallo])).toBe(false);
    // Un ensayo de confianza en medio no corta la racha de fallos.
    expect(
      huboTresFallosSeguidos([fallo, fallo, ensayo({ esEnsayoDeConfianza: true }), fallo]),
    ).toBe(true);
  });
});

describe('avatar', () => {
  it('compone el avatar con el casco equipado', () => {
    const clasico = componerAvatar({ cascos: 'casco-clasico' }).join('\n');
    const gato = componerAvatar({ cascos: 'casco-gato' }).join('\n');
    expect(clasico).not.toBe(gato);
    // El cuerpo es el mismo en los dos.
    expect(componerAvatar({ cascos: 'casco-clasico' })[8]).toBe(
      componerAvatar({ cascos: 'casco-gato' })[8],
    );
  });

  it('un casco desconocido cae al clásico en vez de romperse', () => {
    expect(componerAvatar({ cascos: 'no-existe' })).toEqual(
      componerAvatar({ cascos: 'casco-clasico' }),
    );
  });

  it('el accesorio se ve detrás del cuerpo', () => {
    const conCapa = componerAvatar({ accesorios: 'accesorio-capa' });
    const sinCapa = componerAvatar({});
    expect(conCapa.join('')).toContain('A');
    expect(sinCapa.join('')).not.toContain('A');
  });

  it('el traje y el visor equipados fijan la paleta', () => {
    const paleta = paletaDeAvatar({ trajes: 'traje-musgo', visores: 'visor-coral' });
    expect(paleta.B).toBe(articulo('traje-musgo')!.color);
    expect(paleta.V).toBe(articulo('visor-coral')!.color);
  });

  it('todos los mapas del avatar son rectangulares', () => {
    for (const casco of Object.keys(CASCOS)) {
      const mapa = componerAvatar({ cascos: casco });
      const ancho = mapa[0].length;
      for (const fila of mapa) expect(fila, casco).toHaveLength(ancho);
    }
  });

  it('cada artículo con sprite tiene el suyo', () => {
    for (const art of CATALOGO) {
      if (art.categoria === 'cascos') expect(CASCOS[art.id], art.id).toBeDefined();
      if (art.categoria === 'mascotas') expect(MASCOTAS[art.id], art.id).toBeDefined();
      if (art.categoria === 'naves') expect(NAVES[art.id], art.id).toBeDefined();
      if (art.categoria === 'picos') expect(PICOS[art.id], art.id).toBeDefined();
      if (art.categoria === 'accesorios') expect(ACCESORIOS[art.id], art.id).toBeDefined();
      if (art.categoria === 'estelas') expect(ESTELAS[art.id], art.id).toBeDefined();
    }
  });
});
