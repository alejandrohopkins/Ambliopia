import { describe, it, expect } from 'vitest';
import { config } from '../src/config';
import { COLUMNAS, generarCSV } from '../src/storage/csv';
import {
  serieDeUmbral,
  serieDePrecision,
  medianaMovil,
  mejoraVsPrimeraSemana,
  calendario,
  minutosDelRango,
  balanceEnFecha,
  parametrosConDatos,
  esParametroDeTamano,
  medidasDeUmbral,
} from '../src/storage/analisis';
import { estadoInicial, type Estado, type Sesion } from '../src/storage/esquema';
import { nombreDeArchivo } from '../src/storage/almacen';
import { es } from '../src/i18n/es';

function sesion(parcial: Partial<Sesion>): Sesion {
  return {
    id: Math.random().toString(36).slice(2),
    fecha: '2026-09-19',
    modo: 'parche',
    inicio: '2026-09-19T10:00:00.000Z',
    fin: null,
    minutosActivos: 20,
    porJuego: {},
    ...parcial,
  };
}

function conSesiones(...sesiones: Sesion[]): Estado {
  const estado = estadoInicial();
  estado.sesiones = sesiones;
  return estado;
}

const resumen = (ensayos: number, aciertos: number, umbrales: Record<string, number>) => ({
  niveles: 1,
  ensayos,
  aciertos,
  umbrales,
  tiempoReaccionMedioMs: 900,
});

describe('series del panel', () => {
  it('el umbral se agrupa por día con la mediana', () => {
    const estado = conSesiones(
      sesion({ fecha: '2026-09-18', porJuego: { minero: resumen(15, 10, { tamano: 12 }) } }),
      sesion({ fecha: '2026-09-19', porJuego: { minero: resumen(15, 11, { tamano: 10 }) } }),
      sesion({ fecha: '2026-09-19', porJuego: { minero: resumen(15, 11, { tamano: 14 }) } }),
    );
    expect(serieDeUmbral(estado, 'minero', 'parche', 'tamano')).toEqual([
      { dia: '2026-09-18', valor: 12 },
      { dia: '2026-09-19', valor: 12 },
    ]);
  });

  it('cada modo lleva su propia serie', () => {
    const estado = conSesiones(
      sesion({ modo: 'parche', porJuego: { minero: resumen(15, 10, { tamano: 12 }) } }),
      sesion({ modo: 'lentes', porJuego: { minero: resumen(15, 10, { tamano: 20 }) } }),
    );
    expect(serieDeUmbral(estado, 'minero', 'parche', 'tamano')[0].valor).toBe(12);
    expect(serieDeUmbral(estado, 'minero', 'lentes', 'tamano')[0].valor).toBe(20);
  });

  it('lista los parámetros con datos', () => {
    const estado = conSesiones(
      sesion({ porJuego: { minero: resumen(15, 10, { tamano: 12, contraste: 0.3 }) } }),
    );
    expect(parametrosConDatos(estado, 'minero', 'parche')).toEqual(['contraste', 'tamano']);
    expect(parametrosConDatos(estado, 'torre', 'parche')).toEqual([]);
  });

  it('la precisión junta todos los ensayos del día', () => {
    const estado = conSesiones(
      sesion({ porJuego: { minero: resumen(10, 5, {}) } }),
      sesion({ porJuego: { minero: resumen(10, 9, {}) } }),
    );
    expect(serieDePrecision(estado, 'minero', 'parche')).toEqual([
      { dia: '2026-09-19', valor: 0.7 },
    ]);
  });

  it('la mediana móvil suaviza un día suelto sin dejarse arrastrar', () => {
    const serie = [
      { dia: '2026-09-16', valor: 10 },
      { dia: '2026-09-17', valor: 10 },
      { dia: '2026-09-18', valor: 100 },
      { dia: '2026-09-19', valor: 10 },
      { dia: '2026-09-20', valor: 10 },
    ];
    const suave = medianaMovil(serie, 7);
    expect(suave.every((p) => p.valor === 10)).toBe(true);
  });

  it('la mejora compara la primera semana con los últimos siete días', () => {
    const serie = [
      { dia: '2026-09-01', valor: 20 },
      { dia: '2026-09-02', valor: 20 },
      { dia: '2026-09-20', valor: 10 },
      { dia: '2026-09-21', valor: 10 },
    ];
    expect(mejoraVsPrimeraSemana(serie)).toBeCloseTo(0.5, 6);
  });

  it('sin dos semanas de datos todavía no hay comparación', () => {
    expect(mejoraVsPrimeraSemana([{ dia: '2026-09-19', valor: 10 }])).toBeNull();
    expect(mejoraVsPrimeraSemana([])).toBeNull();
  });

  it('un umbral que empeora da una mejora negativa', () => {
    const serie = [
      { dia: '2026-09-01', valor: 10 },
      { dia: '2026-09-20', valor: 20 },
    ];
    expect(mejoraVsPrimeraSemana(serie)).toBeCloseTo(-1, 6);
  });
});

describe('calendario y minutos', () => {
  it('separa los minutos por modo y marca la meta', () => {
    const estado = conSesiones(
      sesion({ fecha: '2026-09-18', modo: 'parche', minutosActivos: 12 }),
      sesion({ fecha: '2026-09-18', modo: 'lentes', minutosActivos: 9 }),
      sesion({ fecha: '2026-09-19', modo: 'parche', minutosActivos: 5 }),
    );
    const dias = calendario(estado, '2026-09-18', '2026-09-19');
    expect(dias[0]).toMatchObject({ minutosParche: 12, minutosLentes: 9, total: 21 });
    expect(dias[0].metaCumplida).toBe(true);
    expect(dias[1].metaCumplida).toBe(false);
  });

  it('suma los minutos de un rango por modo', () => {
    const estado = conSesiones(
      sesion({ fecha: '2026-09-18', modo: 'parche', minutosActivos: 10 }),
      sesion({ fecha: '2026-09-19', modo: 'lentes', minutosActivos: 15 }),
      sesion({ fecha: '2026-09-25', modo: 'parche', minutosActivos: 30 }),
    );
    expect(minutosDelRango(estado, '2026-09-18', '2026-09-19')).toEqual({
      parche: 10,
      lentes: 15,
      total: 25,
    });
  });

  it('el balance vigente en una fecha sale del historial', () => {
    const estado = estadoInicial();
    estado.balance.historial = [
      { fecha: '2026-09-10', valor: 0.3, motivo: 'subida' },
      { fecha: '2026-09-15', valor: 0.4, motivo: 'subida' },
    ];
    expect(balanceEnFecha(estado, '2026-09-05')).toBe(
      config.balance.contrasteInicialOjoDominante,
    );
    expect(balanceEnFecha(estado, '2026-09-12')).toBe(0.3);
    expect(balanceEnFecha(estado, '2026-09-20')).toBe(0.4);
  });
});

describe('CSV para consulta', () => {
  function estadoCompleto(): Estado {
    const estado = conSesiones(
      sesion({
        fecha: '2026-09-18',
        modo: 'parche',
        minutosActivos: 20,
        porJuego: { minero: resumen(30, 21, { tamano: 9.5, contraste: 0.42 }) },
      }),
      sesion({
        fecha: '2026-09-19',
        modo: 'lentes',
        minutosActivos: 18,
        porJuego: {
          minero: resumen(15, 11, { tamano: 8.25 }),
          torre: resumen(45, 40, {}),
        },
      }),
    );
    estado.calibracion.pxPorMm = 4;
    estado.eventos = [
      { fecha: '2026-09-19', hora: '17:20', modo: 'lentes', juego: 'minero', tipo: 'molestia' },
    ];
    return estado;
  }

  it('empieza con BOM para que Excel reconozca el UTF-8', () => {
    expect(generarCSV(estadoCompleto()).startsWith('﻿')).toBe(true);
  });

  it('usa punto y coma como separador y las columnas de la especificación', () => {
    const lineas = generarCSV(estadoCompleto()).replace('﻿', '').split('\r\n');
    expect(lineas[0].split(';')).toEqual([...COLUMNAS]);
  });

  it('los decimales van con coma, no con punto', () => {
    const csv = generarCSV(estadoCompleto());
    expect(csv).toContain('9,50');
    expect(csv).not.toMatch(/;\d+\.\d+;/);
  });

  it('una fila por sesión, juego y parámetro', () => {
    const lineas = generarCSV(estadoCompleto()).replace('﻿', '').trim().split('\r\n');
    // Cabecera + minero(2 parámetros) + minero(1) + torre(sin parámetros).
    expect(lineas).toHaveLength(1 + 2 + 1 + 1);
  });

  it('reparte los minutos de la sesión entre sus juegos', () => {
    const lineas = generarCSV(estadoCompleto()).replace('﻿', '').trim().split('\r\n');
    const delDia = lineas.slice(1).filter((l) => l.startsWith('2026-09-19'));
    const unicas = new Map<string, number>();
    for (const linea of delDia) {
      const campos = linea.split(';');
      unicas.set(`${campos[2]}`, Number(campos[3].replace(',', '.')));
    }
    const total = [...unicas.values()].reduce((a, b) => a + b, 0);
    expect(total).toBeCloseTo(18, 1);
  });

  it('el contraste no se mide en píxeles: esa columna queda vacía', () => {
    const lineas = generarCSV(estadoCompleto()).replace('﻿', '').trim().split('\r\n');
    const contraste = lineas.find((l) => l.includes(';contraste;'))!.split(';');
    expect(contraste[8]).toBe('');
    expect(contraste[9]).toBe('');
  });

  it('el tamaño sí se convierte a milímetros y minutos de arco', () => {
    const lineas = generarCSV(estadoCompleto()).replace('﻿', '').trim().split('\r\n');
    const tamano = lineas.find((l) => l.includes(';tamano;'))!.split(';');
    expect(tamano[9]).not.toBe('');
    expect(tamano[10]).not.toBe('');
    expect(tamano[12]).toBe('si');
  });

  it('marca las métricas como no calibradas cuando la pantalla no lo está', () => {
    const estado = estadoCompleto();
    estado.calibracion.pxPorMm = null;
    const lineas = generarCSV(estado).replace('﻿', '').trim().split('\r\n');
    expect(lineas[1].split(';')[12]).toBe('no');
  });

  it('anota los eventos de molestia del día', () => {
    const lineas = generarCSV(estadoCompleto()).replace('﻿', '').trim().split('\r\n');
    const del18 = lineas.find((l) => l.startsWith('2026-09-18'))!.split(';');
    const del19 = lineas.find((l) => l.startsWith('2026-09-19'))!.split(';');
    expect(del18[13]).toBe('0');
    expect(del19[13]).toBe('1');
  });

  it('un estado sin sesiones da solo la cabecera', () => {
    const lineas = generarCSV(estadoInicial()).replace('﻿', '').trim().split('\r\n');
    expect(lineas).toHaveLength(1);
  });

  it('el nombre del archivo lleva el nombre y la fecha', () => {
    expect(nombreDeArchivo('Alana', '2026-09-19', 'csv')).toBe(
      'mision-pixel-alana-2026-09-19.csv',
    );
  });
});

describe('conversión de umbrales', () => {
  it('solo los parámetros de tamaño se convierten a milímetros', () => {
    expect(esParametroDeTamano('tamano')).toBe(true);
    expect(esParametroDeTamano('diametro:1.2')).toBe(true);
    expect(esParametroDeTamano('contraste')).toBe(false);
  });

  it('sin calibrar avisa de que la medida es estimada', () => {
    const estado = estadoInicial();
    expect(medidasDeUmbral(estado, 40).calibrado).toBe(false);
    estado.calibracion.pxPorMm = 4;
    const medidas = medidasDeUmbral(estado, 40);
    expect(medidas.calibrado).toBe(true);
    expect(medidas.mm).toBe(10);
  });
});

describe('textos del panel', () => {
  it('los parámetros tienen nombre legible, no la clave interna', () => {
    expect(es.nombreDeParametro('tamano')).toBe('Tamaño del objetivo');
    expect(es.nombreDeParametro('contraste')).toBe('Contraste del objetivo');
    expect(es.nombreDeParametro('diametro:1.2')).toContain('Diámetro del visor');
    expect(es.nombreDeParametro('diametro:1.2')).toContain('1.2');
  });

  it('una clave desconocida no rompe la pantalla', () => {
    expect(es.nombreDeParametro('otra')).toBe('otra');
  });

  it('cada sección del panel tiene su título', () => {
    for (const seccion of [
      'resumen',
      'graficas',
      'configuracion',
      'calibraciones',
      'eventos',
      'notas',
      'datos',
    ]) {
      expect(es.adultos.secciones[seccion], seccion).toBeTruthy();
    }
  });

  it('cada gráfica tiene su frase de cómo leerla', () => {
    for (const clave of ['umbralTamano', 'umbralContraste', 'balance', 'precision', 'tiempo']) {
      expect(es.adultos.comoLeer[clave], clave).toBeTruthy();
    }
  });

  it('la mejora se presenta con signo', () => {
    expect(es.adultos.mejora(0.37)).toContain('+37');
    expect(es.adultos.mejora(-0.2)).toContain('-20');
  });
});
