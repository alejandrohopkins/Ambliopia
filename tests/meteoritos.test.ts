import { describe, expect, it } from 'vitest';
import { config } from '../src/config';
import { crearAleatorio } from '../src/engine/rng';
import { areaDeJuego } from '../src/games/comun';
import { columnasDeOleada, disparoAlcanza, hayChoque } from '../src/games/meteoritos/Meteoritos';
import { montarJuego, type JuegoFalso } from './ayudas/juegoFalso';
import { coloresProhibidos } from './ayudas/cuatroColores';

interface ObjetoVisto {
  tipo: 'estrella' | 'roca';
  x: number;
  y: number;
  tamano: number;
  resuelto: boolean;
}

const por = (juego: JuegoFalso) =>
  juego.instancia as unknown as {
    objetos: ObjetoVisto[];
    disparos: Array<{ x: number; y: number }>;
    naveX: number;
    anchoDeNave(): number;
    naveY(): number;
  };

describe('oleadas de meteoritos', () => {
  const area = { x: 16, ancho: 990 };

  it('las columnas de una oleada quedan separadas y dentro del área', () => {
    for (let semilla = 1; semilla <= 50; semilla += 1) {
      const columnas = columnasDeOleada(5, area, 140, 500, crearAleatorio(semilla));
      expect(columnas).toHaveLength(5);
      const orden = [...columnas].sort((a, b) => a - b);
      for (let i = 1; i < orden.length; i += 1) {
        expect(orden[i] - orden[i - 1]).toBeGreaterThanOrEqual(140 - 1e-9);
      }
      for (const x of columnas) {
        expect(x).toBeGreaterThanOrEqual(area.x + 70 - 1e-9);
        expect(x).toBeLessThanOrEqual(area.x + area.ancho - 70 + 1e-9);
      }
    }
  });

  it('la primera columna cae junto a la nave', () => {
    const columnas = columnasDeOleada(3, area, 140, 300, crearAleatorio(7));
    expect(Math.abs(columnas[0] - 300)).toBeLessThanOrEqual(70);
  });

  it('en una pantalla estrecha caben menos, pero nunca se amontonan', () => {
    const columnas = columnasDeOleada(5, { x: 16, ancho: 300 }, 140, 150, crearAleatorio(3));
    expect(columnas.length).toBe(2);
  });

  it('con la nave centrada bajo un objeto de la oleada, no choca con el de al lado', () => {
    const ancho = 73;
    const tamano = config.meteoritos.tamanoMaximoPx;
    const separacion = ancho + tamano + config.meteoritos.margenEntreObjetosPx;
    expect(hayChoque(separacion, ancho, tamano)).toBe(false);
  });

  it('en la partida caen varios a la vez, en la misma fila y con estrellas y rocas', () => {
    const juego = montarJuego('meteoritos', 'parche');
    juego.avanzar(50);
    const objetos = por(juego).objetos;
    expect(objetos.length).toBe(config.meteoritos.oleadaMin);
    expect(new Set(objetos.map((o) => o.y)).size).toBe(1);
    expect(new Set(objetos.map((o) => o.tipo)).size).toBe(2);
    juego.instancia.destruir();
  });
});

describe('disparos', () => {
  it('un disparo toca lo que cruza, aunque sea diminuto y vaya muy rápido', () => {
    const objeto = { x: 100, y: 200, tamano: 6 };
    // En un cuadro la punta pasó de 230 a 190: atravesó el objeto.
    expect(disparoAlcanza(100, 190, 230, objeto)).toBe(true);
    expect(disparoAlcanza(100 + config.meteoritos.disparoToleranciaPx + 1, 190, 230, objeto)).toBe(false);
    expect(disparoAlcanza(100, 240, 260, objeto)).toBe(false);
  });

  /** Pone un objeto justo encima de la nave y dispara. */
  function dispararA(tipo: 'estrella' | 'roca') {
    const juego = montarJuego('meteoritos', 'parche');
    juego.avanzar(16);
    const estado = por(juego);
    estado.objetos.length = 0;
    estado.objetos.push({
      tipo,
      x: estado.naveX,
      y: estado.naveY() - 200,
      tamano: 40,
      resuelto: false,
      esEnsayoDeConfianza: false,
      oleada: 99,
      semilla: 1,
      roto: false,
      nacidoMs: 0,
    } as ObjetoVisto);
    juego.tecla(' ');
    expect(estado.disparos).toHaveLength(1);
    juego.avanzar(400);
    const resultado = juego.ensayos.at(-1);
    juego.instancia.destruir();
    return { juego, resultado };
  }

  it('romper una roca es un acierto', () => {
    const { resultado } = dispararA('roca');
    expect(resultado).toMatchObject({ acierto: true, detalle: 'roca' });
  });

  it('disparar a una estrella es un fallo', () => {
    const { resultado } = dispararA('estrella');
    expect(resultado).toMatchObject({ acierto: false, detalle: 'estrella' });
  });

  it('no se puede disparar más deprisa que la cadencia', () => {
    const juego = montarJuego('meteoritos', 'parche');
    juego.avanzar(16);
    for (let i = 0; i < 5; i += 1) juego.tecla(' ');
    expect(por(juego).disparos).toHaveLength(1);
    juego.avanzar(config.meteoritos.disparoCadenciaMs + 20);
    juego.tecla(' ');
    expect(por(juego).disparos.length).toBeLessThanOrEqual(2);
    juego.instancia.destruir();
  });

  it('el botón de la pantalla también dispara', () => {
    const juego = montarJuego('meteoritos', 'parche');
    juego.avanzar(16);
    const boton = (juego.instancia as unknown as { botonDeDisparo(): { x: number; y: number; lado: number } }).botonDeDisparo();
    const antes = por(juego).naveX;
    juego.tocar(boton.x + boton.lado / 2, boton.y + boton.lado / 2);
    expect(por(juego).disparos).toHaveLength(1);
    // Tocar el botón no mueve la nave.
    expect(por(juego).naveX).toBe(antes);
    juego.instancia.destruir();
  });
});

describe('salto grande con Z y X', () => {
  it('Z salta a la izquierda y X a la derecha, un cuarto del ancho', () => {
    const juego = montarJuego('meteoritos', 'parche');
    juego.avanzar(16);
    const area = areaDeJuego(juego.renderer);
    const salto = config.meteoritos.saltoLateral * area.ancho;
    const inicio = por(juego).naveX;

    juego.tecla('z');
    juego.avanzar(config.meteoritos.saltoDuracionMs + 40);
    expect(por(juego).naveX).toBeCloseTo(inicio - salto, 5);

    juego.tecla('X');
    juego.avanzar(config.meteoritos.saltoDuracionMs + 40);
    expect(por(juego).naveX).toBeCloseTo(inicio, 5);
    juego.instancia.destruir();
  });

  it('el salto no se sale del área', () => {
    const juego = montarJuego('meteoritos', 'parche');
    juego.avanzar(16);
    for (let i = 0; i < 6; i += 1) {
      juego.tecla('z');
      juego.tecla('z', false);
    }
    juego.avanzar(400);
    const area = areaDeJuego(juego.renderer);
    expect(por(juego).naveX).toBeCloseTo(area.x + por(juego).anchoDeNave() / 2, 5);
    juego.instancia.destruir();
  });
});

describe('partida de meteoritos', () => {
  /**
   * Una jugadora atenta: persigue la estrella más baja y dispara a la roca
   * que tenga encima. Sirve para comprobar que el último nivel se puede
   * superar con el 85 % pese a las oleadas.
   */
  function jugarBien(mundo: number, nivel: number, semilla: number) {
    const juego = montarJuego('meteoritos', 'parche', { mundo, nivel, semilla });
    const estado = por(juego);
    juego.tocar(estado.naveX, 600);
    for (let t = 0; t < config.meteoritos.duracionNivelSeg * 1000 && !juego.fin(); t += 16) {
      const enJuego = estado.objetos.filter((o) => !o.resuelto);
      const estrella = enJuego
        .filter((o) => o.tipo === 'estrella')
        .sort((a, b) => b.y - a.y)[0];
      if (estrella) juego.arrastrar(estrella.x, 600);
      const rocaEncima = enJuego.find(
        (o) => o.tipo === 'roca' && Math.abs(o.x - estado.naveX) < o.tamano / 2 && o.y < estado.naveY() - 60,
      );
      if (rocaEncima) juego.tecla(' ');
      juego.avanzar(16);
    }
    const fin = juego.fin();
    juego.instancia.destruir();
    return fin;
  }

  it('una jugadora atenta supera el último nivel', () => {
    for (const semilla of [1, 2, 3]) {
      const fin = jugarBien(config.progresion.mundos, config.progresion.nivelesPorMundo, semilla);
      expect(fin).not.toBeNull();
      expect(fin!.ensayos).toBeGreaterThan(20);
      expect(fin!.precision).toBeGreaterThanOrEqual(config.progresion.precisionParaSubir);
    }
  });

  it('termina a su hora y suelta todos sus oyentes', () => {
    const juego = montarJuego('meteoritos', 'parche');
    juego.avanzar(config.meteoritos.duracionNivelSeg * 1000 + 100);
    expect(juego.fin()).not.toBeNull();
    juego.instancia.destruir();
    expect(juego.oyentesVivos()).toBe(0);
  });

  it('en lentes, con disparos y oleadas, solo salen los cuatro colores', () => {
    const juego = montarJuego('meteoritos', 'lentes');
    juego.avanzar(3000);
    juego.tecla(' ');
    juego.tecla('x');
    juego.avanzar(200);
    expect(por(juego).disparos.length + juego.ensayos.length).toBeGreaterThan(0);
    expect(coloresProhibidos(juego.lienzo)).toEqual([]);
    juego.instancia.destruir();
  });
});
