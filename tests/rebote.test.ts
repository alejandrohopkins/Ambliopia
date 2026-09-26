/**
 * Rebote ágil: la física del rebote y partidas simuladas.
 */
import { describe, it, expect } from 'vitest';
import { config } from '../src/config';
import {
  dificultadDeRebote,
  golpeaLaPaleta,
  llegadaALaPaleta,
  llegadasAlcanzables,
  rebotarEnCaja,
  rebotarEnParedes,
  salidaDePaleta,
  type Caja,
  type Llegada,
} from '../src/games/rebote/fisica';
import { montarJuego, type JuegoFalso } from './ayudas/juegoFalso';

interface BolaVista {
  x: number;
  y: number;
  vx: number;
  vy: number;
  acelerada: number;
  vuelveEnMs: number | null;
}

const por = (juego: JuegoFalso) =>
  juego.instancia as unknown as {
    bolas: BolaVista[];
    bloques: Caja[];
    area: Caja;
    paletaX: number;
    paletaY(): number;
    anchoDePaleta(): number;
  };

const enJuego = (juego: JuegoFalso) => por(juego).bolas.filter((b) => b.vuelveEnMs === null);

/** La próxima bola que llegará a la paleta, según el cálculo del propio juego. */
function proximaLlegada(juego: JuegoFalso): Llegada | undefined {
  const estado = por(juego);
  return enJuego(juego)
    .map((b) => llegadaALaPaleta(b, estado.area, estado.bloques, estado.paletaY()))
    .filter((l): l is Llegada => l !== null)
    .sort((a, b) => a.t - b.t)[0];
}

/** Juega con el dedo: la paleta va a donde llegará la próxima bola. */
function jugarConElDedo(mundo: number, nivel: number, semilla: number) {
  const juego = montarJuego('rebote', 'parche', { mundo, nivel, semilla });
  juego.avanzar(16);
  let maximoDeBolas = 0;
  for (let t = 0; t < config.rebote.duracionNivelSeg * 1000 && !juego.fin(); t += 16) {
    maximoDeBolas = Math.max(maximoDeBolas, enJuego(juego).length);
    const llegada = proximaLlegada(juego);
    if (llegada) juego.arrastrar(llegada.x, 500);
    juego.avanzar(16);
  }
  const fin = juego.fin();
  juego.instancia.destruir();
  return { fin, maximoDeBolas };
}

const AREA = { x: 0, y: 0, ancho: 400, alto: 300 };

describe('física del rebote', () => {
  it('rebota en las paredes y en el techo, pero no en el suelo', () => {
    const izquierda = { x: -5, y: 100, vx: -50, vy: 10 };
    rebotarEnParedes(izquierda, AREA);
    expect(izquierda.x).toBe(5);
    expect(izquierda.vx).toBe(50);

    const techo = { x: 100, y: -3, vx: 0, vy: -80 };
    rebotarEnParedes(techo, AREA);
    expect(techo.vy).toBe(80);

    const suelo = { x: 100, y: 320, vx: 0, vy: 80 };
    rebotarEnParedes(suelo, AREA);
    expect(suelo.vy).toBe(80);
  });

  it('el golpe se juzga con el centro: el tamaño de la bola no ayuda', () => {
    const ancho = 100;
    const margen = config.rebote.margenDeGolpePx;
    expect(golpeaLaPaleta(200 + ancho / 2 + margen, 200, ancho)).toBe(true);
    expect(golpeaLaPaleta(200 + ancho / 2 + margen + 1, 200, ancho)).toBe(false);
  });

  it('sale recta desde el centro y más inclinada cuanto más lejos', () => {
    const centro = salidaDePaleta(200, 200, 100, 300);
    expect(centro.vx).toBeCloseTo(0);
    expect(centro.vy).toBeCloseTo(-300);

    const borde = salidaDePaleta(250, 200, 100, 300);
    expect(borde.vx).toBeGreaterThan(0);
    expect(borde.vy).toBeLessThan(0);
    expect(Math.hypot(borde.vx, borde.vy)).toBeCloseTo(300);
    // Nunca sale tumbada: siempre sube.
    const maximo = (config.rebote.anguloMaximoGrados * Math.PI) / 180;
    expect(Math.atan2(borde.vx, -borde.vy)).toBeCloseTo(maximo);
  });

  it('un bloque la devuelve por el lado por el que entró', () => {
    const caja = { x: 100, y: 100, ancho: 60, alto: 20 };
    const desdeAbajo = { x: 130, y: 118, vx: 0, vy: -100 };
    expect(rebotarEnCaja(desdeAbajo, caja)).toBe(true);
    expect(desdeAbajo.vy).toBe(100);

    const lejos = { x: 10, y: 10, vx: 0, vy: 100 };
    expect(rebotarEnCaja(lejos, caja)).toBe(false);
  });

  it('cada nivel superado encoge la paleta en la misma proporción', () => {
    const niveles: number[] = [];
    for (let mundo = 1; mundo <= config.progresion.mundos; mundo += 1) {
      for (let nivel = 1; nivel <= config.progresion.nivelesPorMundo; nivel += 1) {
        niveles.push(dificultadDeRebote(mundo, nivel).paleta);
      }
    }
    expect(niveles[0]).toBeCloseTo(config.rebote.paletaInicial, 9);
    expect(niveles[niveles.length - 1]).toBeCloseTo(config.rebote.paletaFinal, 9);
    for (let i = 1; i < niveles.length; i += 1) {
      const recorte = 1 - niveles[i] / niveles[i - 1];
      // Un poco más del 5 % por nivel: se nota, y es igual al principio y al final.
      expect(recorte).toBeGreaterThan(0.05);
      expect(recorte).toBeLessThan(0.06);
    }
  });

  it('el nivel encoge la paleta y acelera la bola', () => {
    const primero = dificultadDeRebote(1, 1);
    const ultimo = dificultadDeRebote(5, 5);
    expect(ultimo.paleta).toBeLessThan(primero.paleta);
    expect(ultimo.velocidad).toBeGreaterThan(primero.velocidad);
    expect(ultimo.bloques).toBeGreaterThan(primero.bloques);
    expect(ultimo.bolasMax).toBeGreaterThan(primero.bolasMax);
    expect(primero.bolasMax).toBeGreaterThanOrEqual(2);
  });
});

describe('la bola se divide', () => {
  it('la paleta llega si le da tiempo, con su reacción y su velocidad', () => {
    // Dos bolas a 300 px, con la paleta cubriendo 20 px a cada lado.
    const llegadas: Llegada[] = [
      { t: 0.5, x: 100 },
      { t: 2.0, x: 400 },
    ];
    expect(llegadasAlcanzables(llegadas, 100, 20, 300, 0.3)).toBe(true);
    expect(llegadasAlcanzables(llegadas, 100, 20, 150, 0.3)).toBe(false);
    // Dos a la vez en el mismo sitio sí; en sitios distintos, no.
    expect(llegadasAlcanzables([{ t: 1, x: 200 }, { t: 1, x: 210 }], 200, 20, 300, 0.3)).toBe(true);
    expect(llegadasAlcanzables([{ t: 1, x: 200 }, { t: 1, x: 400 }], 200, 20, 300, 0.3)).toBe(false);
  });

  it('el cálculo de la llegada coincide con lo que pasa en la partida', () => {
    const juego = montarJuego('rebote', 'parche', { mundo: 5, nivel: 1, semilla: 3 });
    juego.avanzar(16);
    const estado = por(juego);
    const bola = enJuego(juego)[0];
    const prevista = llegadaALaPaleta(bola, estado.area, estado.bloques, estado.paletaY())!;
    // Se deja pasar la bola sin tocarla y se mira dónde cruza la línea.
    estado.paletaX = estado.area.x + estado.area.ancho * (prevista.x < estado.area.ancho / 2 ? 0.9 : 0.1);
    let cruce: { t: number; x: number } | null = null;
    for (let t = 16; t < 10_000 && !cruce; t += 16) {
      const antes = { x: bola.x, y: bola.y };
      juego.avanzar(16);
      if (bola.vuelveEnMs !== null) cruce = { t: t / 1000, x: antes.x };
    }
    expect(cruce).not.toBeNull();
    expect(Math.abs(cruce!.t - prevista.t)).toBeLessThan(0.05);
    expect(Math.abs(cruce!.x - prevista.x)).toBeLessThan(15);
    juego.instancia.destruir();
  });

  it('tras varias devoluciones seguidas hay más bolas, sin pasar nunca del tope', () => {
    for (const [mundo, nivel] of [[1, 1], [5, 5]]) {
      const tope = dificultadDeRebote(mundo, nivel).bolasMax;
      const { maximoDeBolas } = jugarConElDedo(mundo, nivel, 2);
      expect(maximoDeBolas).toBeGreaterThanOrEqual(2);
      expect(maximoDeBolas).toBeLessThanOrEqual(tope);
    }
  });

  it('la bola que se escapa desaparece si quedan otras, y la última vuelve a salir', () => {
    const juego = montarJuego('rebote', 'parche', { mundo: 1, nivel: 1, semilla: 2 });
    juego.avanzar(16);
    // Se juega bien hasta tener dos bolas.
    for (let t = 0; t < 60_000 && enJuego(juego).length < 2; t += 16) {
      const llegada = proximaLlegada(juego);
      if (llegada) juego.arrastrar(llegada.x, 500);
      juego.avanzar(16);
    }
    expect(enJuego(juego).length).toBe(2);
    // Y luego nadie juega: se van escapando, pero nunca se queda sin bola.
    juego.arrastrar(por(juego).area.x, 500);
    let minimo = Infinity;
    for (let t = 0; t < 10_000; t += 16) {
      juego.avanzar(16);
      minimo = Math.min(minimo, por(juego).bolas.length);
    }
    expect(minimo).toBe(1);
    expect(por(juego).bolas.length).toBe(1);
    juego.instancia.destruir();
  });

  it('con la bola dividida se puede ganar hasta el último nivel', () => {
    for (const semilla of [1, 2, 3]) {
      const { fin, maximoDeBolas } = jugarConElDedo(config.progresion.mundos, config.progresion.nivelesPorMundo, semilla);
      expect(fin).not.toBeNull();
      expect(fin!.precision).toBeGreaterThanOrEqual(config.progresion.precisionParaSubir);
      expect(maximoDeBolas).toBeGreaterThanOrEqual(3);
    }
  });
});

describe('partida de Rebote', () => {
  it('quien sigue las bolas las devuelve casi siempre', () => {
    const { fin } = jugarConElDedo(1, 1, 1);
    expect(fin).not.toBeNull();
    expect(fin!.ensayos).toBeGreaterThan(5);
    expect(fin!.precision).toBe(1);
  });

  it('si nadie juega, la bola se escapa, vuelve a salir y nada se pierde', () => {
    const juego = montarJuego('rebote', 'parche');
    juego.tecla('ArrowLeft');
    juego.avanzar(20_000);
    expect(juego.ensayos.length).toBeGreaterThan(3);
    expect(juego.ensayos.some((e) => !e.acierto)).toBe(true);
    expect(juego.fin()).toBeNull();
  });

  it('termina a su hora y suelta todos sus oyentes', () => {
    const juego = montarJuego('rebote', 'parche', { mundo: 5, nivel: 5 });
    juego.avanzar(config.rebote.duracionNivelSeg * 1000 + 100);
    expect(juego.fin()).not.toBeNull();
    juego.instancia.destruir();
    expect(juego.oyentesVivos()).toBe(0);
  });
});
