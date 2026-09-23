/**
 * Túnel de escape: la pista, la perspectiva y las reglas de paso.
 */
import { describe, it, expect } from 'vitest';
import { config } from '../src/config';
import {
  aberturaVisible,
  alturaDelSalto,
  altoDeLaCorredora,
  carrilAlLado,
  escalaDeZ,
  pasaElMuro,
  posturaQuePasa,
  segundosDeAviso,
  velocidadDeNivel,
  type Muro,
} from '../src/games/tunel/pista';
import { escalerasDeTunel } from '../src/games/tunel/Tunel';

function muro(parcial: Partial<Muro> = {}): Muro {
  return {
    z: config.tunel.zDeNacimiento,
    carril: 1,
    abertura: 'arriba',
    aberturaPx: config.tunel.aberturaInicialPx,
    esEnsayoDeConfianza: false,
    nacidoMs: 0,
    resuelto: false,
    ...parcial,
  };
}

describe('pasar un muro', () => {
  it('si el hueco está arriba se salta, y si está abajo se rueda', () => {
    expect(posturaQuePasa('arriba')).toBe('saltando');
    expect(posturaQuePasa('abajo')).toBe('deslizando');
  });

  it('hay que estar en el carril de la abertura', () => {
    const pared = muro({ carril: 2, abertura: 'arriba' });
    expect(pasaElMuro(pared, 2, 'saltando')).toBe(true);
    expect(pasaElMuro(pared, 1, 'saltando')).toBe(false);
    expect(pasaElMuro(pared, 0, 'saltando')).toBe(false);
  });

  it('y además en la postura que pide la abertura', () => {
    const arriba = muro({ carril: 0, abertura: 'arriba' });
    expect(pasaElMuro(arriba, 0, 'saltando')).toBe(true);
    expect(pasaElMuro(arriba, 0, 'deslizando')).toBe(false);
    expect(pasaElMuro(arriba, 0, 'corriendo')).toBe(false);

    const abajo = muro({ carril: 0, abertura: 'abajo' });
    expect(pasaElMuro(abajo, 0, 'deslizando')).toBe(true);
    expect(pasaElMuro(abajo, 0, 'saltando')).toBe(false);
    expect(pasaElMuro(abajo, 0, 'corriendo')).toBe(false);
  });

  it('siempre hay una salida: cada muro deja una abertura', () => {
    for (const abertura of ['arriba', 'abajo'] as const) {
      for (let carril = 0; carril < config.tunel.carriles; carril += 1) {
        const pared = muro({ carril, abertura });
        expect(pasaElMuro(pared, carril, posturaQuePasa(abertura))).toBe(true);
      }
    }
  });
});

describe('carriles', () => {
  it('no se sale de la pista por ningún lado', () => {
    const n = config.tunel.carriles;
    expect(carrilAlLado(0, -1, n)).toBe(0);
    expect(carrilAlLado(n - 1, 1, n)).toBe(n - 1);
    expect(carrilAlLado(1, -1, n)).toBe(0);
    expect(carrilAlLado(1, 1, n)).toBe(2);
  });

  it('son impares, así que hay uno en el centro', () => {
    expect(config.tunel.carriles % 2).toBe(1);
  });
});

describe('perspectiva', () => {
  it('lo que está a los pies se ve a tamaño natural', () => {
    expect(escalaDeZ(0)).toBe(1);
  });

  it('cuanto más lejos, más pequeño, pero nunca cero', () => {
    let anterior = escalaDeZ(0);
    for (let z = 1; z <= config.tunel.zDeNacimiento; z += 1) {
      const escala = escalaDeZ(z);
      expect(escala).toBeLessThan(anterior);
      expect(escala).toBeGreaterThan(0);
      anterior = escala;
    }
  });

  it('un muro recién nacido se ve pequeño de verdad: por eso hay que fijarse', () => {
    expect(escalaDeZ(config.tunel.zDeNacimiento)).toBeLessThan(0.4);
  });
});

describe('ritmo de la carrera', () => {
  it('la velocidad sube a lo largo de los veinticinco niveles', () => {
    expect(velocidadDeNivel(1, 1)).toBe(config.tunel.velocidadInicialUnidadesSeg);
    expect(velocidadDeNivel(5, 5)).toBe(config.tunel.velocidadFinalUnidadesSeg);
    expect(velocidadDeNivel(3, 1)).toBeGreaterThan(velocidadDeNivel(1, 1));
  });

  it('da tiempo a leer la abertura y reaccionar, incluso en el último nivel', () => {
    const margen = segundosDeAviso(5, 5);
    const reaccion = (config.tunel.cambioDeCarrilMs + config.tunel.saltoMs) / 1000;
    expect(margen).toBeGreaterThan(reaccion * 2);
  });

  it('nunca hay más de un par de muros en el aire a la vez', () => {
    const enElAire = config.tunel.zDeNacimiento / config.tunel.separacionDeMuros;
    expect(enElAire).toBeGreaterThan(1);
    expect(enElAire).toBeLessThanOrEqual(3);
  });

  it('un nivel deja ensayos de sobra para que la escalera se mueva', () => {
    const porNivel = (mundo: number, nivel: number) =>
      (config.tunel.duracionNivelSeg * velocidadDeNivel(mundo, nivel)) /
      config.tunel.separacionDeMuros;
    expect(porNivel(1, 1)).toBeGreaterThan(20);
    expect(porNivel(5, 5)).toBeGreaterThan(20);
  });

  it('los muros llegan bastante más despacio que tres por segundo', () => {
    const porSegundo = velocidadDeNivel(5, 5) / config.tunel.separacionDeMuros;
    expect(porSegundo).toBeLessThan(config.accesibilidad.maxParpadeosPorSegundo);
  });
});

describe('la abertura que se muestra', () => {
  const altoTunel = 400;

  it('nunca baja del mínimo que se puede dibujar', () => {
    expect(aberturaVisible(0, altoTunel)).toBe(config.tunel.aberturaMinimaPx);
    expect(aberturaVisible(-10, altoTunel)).toBe(config.tunel.aberturaMinimaPx);
  });

  it('nunca se come el muro: sigue siendo una pared con un hueco', () => {
    const grande = aberturaVisible(config.tunel.aberturaMaximaPx * 10, altoTunel);
    expect(grande).toBeLessThanOrEqual(altoTunel * config.tunel.fraccionMaximaDeAbertura);
    expect(grande).toBeLessThan(altoTunel / 2);
  });

  it('en medio deja pasar el valor que pide la escalera', () => {
    expect(aberturaVisible(40, altoTunel)).toBe(40);
  });

  it('el recorrido de la escalera es amplio: de unos pocos píxeles a muchos', () => {
    expect(config.tunel.aberturaMinimaPx).toBeGreaterThanOrEqual(1);
    expect(config.tunel.aberturaMaximaPx / config.tunel.aberturaMinimaPx).toBeGreaterThan(10);
    expect(config.tunel.aberturaInicialPx).toBeGreaterThan(config.tunel.aberturaMinimaPx);
    expect(config.tunel.aberturaInicialPx).toBeLessThan(config.tunel.aberturaMaximaPx);
  });
});

describe('la corredora', () => {
  it('corriendo y rodando va pegada al suelo; saltando sube y baja', () => {
    expect(alturaDelSalto('corriendo', 0.5)).toBe(0);
    expect(alturaDelSalto('deslizando', 0.5)).toBe(0);
    expect(alturaDelSalto('saltando', 0)).toBe(0);
    expect(alturaDelSalto('saltando', 1)).toBe(0);
    expect(alturaDelSalto('saltando', 0.5)).toBeCloseTo(config.tunel.alturaDeSalto, 6);
  });

  it('el salto es un arco: sube hasta la mitad y baja', () => {
    let anterior = 0;
    for (let t = 0.05; t <= 0.5; t += 0.05) {
      const altura = alturaDelSalto('saltando', t);
      expect(altura).toBeGreaterThan(anterior);
      anterior = altura;
    }
    expect(alturaDelSalto('saltando', 0.75)).toBeLessThan(alturaDelSalto('saltando', 0.5));
  });

  it('rodando ocupa menos alto que de pie', () => {
    expect(altoDeLaCorredora('deslizando')).toBeLessThan(altoDeLaCorredora('corriendo'));
    expect(altoDeLaCorredora('saltando')).toBe(altoDeLaCorredora('corriendo'));
  });

  it('saltando cabe por un hueco de arriba y rodando por uno de abajo', () => {
    // El hueco máximo y el alto de la corredora tienen que ser compatibles:
    // si rodando ocupara más que la abertura mayor, no se podría pasar nunca.
    expect(altoDeLaCorredora('deslizando')).toBeLessThan(config.tunel.fraccionMaximaDeAbertura);
  });
});

describe('fallar no rompe nada', () => {
  it('un tropiezo solo quita un poco de energía, que se recarga sola', () => {
    expect(config.tunel.energiaPorTropiezo).toBeGreaterThan(0);
    expect(config.tunel.energiaPorTropiezo).toBeLessThan(config.tunel.energiaMaxima / 4);
    expect(config.tunel.energiaRecargaPorSeg).toBeGreaterThan(0);
  });

  it('las celdas de energía suman, no restan', () => {
    expect(config.tunel.energiaPorCelda).toBeGreaterThan(0);
  });
});

describe('escalera del túnel', () => {
  it('mide la abertura en los dos modos', () => {
    for (const modo of ['parche', 'lentes'] as const) {
      const escaleras = escalerasDeTunel(modo, 1);
      expect(escaleras).toHaveLength(1);
      expect(escaleras[0].clave).toBe(`tunel:${modo}:abertura`);
      expect(escaleras[0].valorInicial).toBe(config.tunel.aberturaInicialPx);
      expect(escaleras[0].minimo).toBe(config.tunel.aberturaMinimaPx);
      expect(escaleras[0].maximo).toBe(config.tunel.aberturaMaximaPx);
    }
  });
});
