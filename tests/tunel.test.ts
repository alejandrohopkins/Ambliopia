/**
 * Túnel de escape: la pista, la perspectiva y las reglas de paso.
 */
import { describe, it, expect } from 'vitest';
import { config } from '../src/config';
import {
  aberturaIdentificada,
  aberturaVisible,
  enVentanaDeJuicio,
  muroResuelto,
  alturaDelSalto,
  altoDeLaCorredora,
  carrilAlLado,
  escalaAlDecidir,
  escalaDeZ,
  pasaElMuro,
  posturaQuePasa,
  segundosDeAviso,
  velocidadDeNivel,
  zDeDecision,
  type Muro,
} from '../src/games/tunel/pista';
import { escalerasDeTunel } from '../src/games/tunel/Tunel';
import { montarJuego } from './ayudas/juegoFalso';

function muro(parcial: Partial<Muro> = {}): Muro {
  return {
    z: config.tunel.zDeNacimiento,
    carril: 1,
    abertura: 'arriba',
    aberturaPx: 44,
    vistaPx: 30,
    esEnsayoDeConfianza: false,
    nacidoMs: 0,
    resuelto: false,
    logrado: false,
    carrilAcertado: false,
    intencion: null,
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

describe('ventana de juicio', () => {
  it('cuenta un poco antes y un poco después de llegar el muro', () => {
    const z = config.tunel.zDeJuicio;
    expect(enVentanaDeJuicio(z * 0.9)).toBe(true);
    expect(enVentanaDeJuicio(0)).toBe(true);
    expect(enVentanaDeJuicio(-z * 0.9)).toBe(true);
  });

  it('fuera de ella no cuenta', () => {
    const z = config.tunel.zDeJuicio;
    expect(enVentanaDeJuicio(z * 1.1)).toBe(false);
    expect(enVentanaDeJuicio(-z * 1.1)).toBe(false);
  });

  it('el muro se anota cuando ya pasó del todo', () => {
    const z = config.tunel.zDeJuicio;
    expect(muroResuelto(0)).toBe(false);
    expect(muroResuelto(-z * 0.9)).toBe(false);
    expect(muroResuelto(-z)).toBe(true);
  });

  it('la ventana dura lo bastante para no pedir precisión de milésimas', () => {
    // Un salto entero cabe de sobra dentro de la ventana en el nivel más rápido.
    const segundos = (2 * config.tunel.zDeJuicio) / velocidadDeNivel(5, 5);
    expect(segundos).toBeGreaterThan(0.2);
    // Pero tampoco es tan larga como para que valga saltar en cualquier momento.
    const entreMuros = config.tunel.separacionDeMuros / velocidadDeNivel(1, 1);
    expect(segundos).toBeLessThan(entreMuros / 2);
  });

  it('el gesto guardado no caduca antes de un salto normal', () => {
    expect(config.tunel.bufferDeGestoMs).toBeGreaterThan(150);
    expect(config.tunel.bufferDeGestoMs).toBeLessThan(config.tunel.saltoMs);
  });
});

describe('profundidad y celdas', () => {
  it('las celdas se recogen con margen, no solo al pasar justo por encima', () => {
    expect(config.tunel.zDeRecogida).toBeGreaterThan(0);
    expect(config.tunel.zDeRecogida).toBeLessThan(config.tunel.separacionDeMuros / 4);
  });

  it('las celdas van a media altura, alcanzables sin saltar', () => {
    expect(config.tunel.alturaDeCelda).toBeGreaterThan(0);
    expect(config.tunel.alturaDeCelda).toBeLessThan(altoDeLaCorredora('corriendo'));
  });

  it('el muro tiene grosor, pero menos que la separación entre muros', () => {
    expect(config.tunel.grosorDeMuro).toBeGreaterThan(0);
    expect(config.tunel.grosorDeMuro).toBeLessThan(config.tunel.separacionDeMuros / 4);
  });

  it('la cara de atrás del muro se ve más apagada que la de delante', () => {
    expect(config.tunel.factorCaraDeAtras).toBeGreaterThan(0);
    expect(config.tunel.factorCaraDeAtras).toBeLessThan(1);
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
    const grande = aberturaVisible(10_000, altoTunel);
    expect(grande).toBeLessThanOrEqual(altoTunel * config.tunel.fraccionMaximaDeAbertura);
    expect(grande).toBeLessThan(altoTunel / 2);
  });

  it('en medio deja pasar el valor que pide la escalera', () => {
    expect(aberturaVisible(40, altoTunel)).toBe(40);
  });

  it('el recorrido de la escalera es amplio: de unos pocos píxeles a muchos', () => {
    const { aberturaVistaMinimaPx, aberturaVistaMaximaPx, aberturaVistaInicialPx } = config.tunel;
    expect(aberturaVistaMinimaPx).toBeGreaterThanOrEqual(1);
    expect(aberturaVistaMaximaPx / aberturaVistaMinimaPx).toBeGreaterThan(10);
    expect(aberturaVistaInicialPx).toBeGreaterThan(aberturaVistaMinimaPx);
    expect(aberturaVistaInicialPx).toBeLessThan(aberturaVistaMaximaPx);
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
  it('mide la abertura vista al decidir, en los dos modos', () => {
    for (const modo of ['parche', 'lentes'] as const) {
      const escaleras = escalerasDeTunel(modo, 1);
      expect(escaleras).toHaveLength(1);
      expect(escaleras[0].clave).toBe(`tunel:${modo}:aberturaVista`);
      expect(escaleras[0].valorInicial).toBe(config.tunel.aberturaVistaInicialPx);
      expect(escaleras[0].minimo).toBe(config.tunel.aberturaVistaMinimaPx);
      expect(escaleras[0].maximo).toBe(config.tunel.aberturaVistaMaximaPx);
    }
  });
});

describe('lo que se mide es la vista, no el instante', () => {
  it('se mide cuando todavía hay tiempo de decidir, no al llegar', () => {
    const lento = velocidadDeNivel(1, 1);
    const rapido = velocidadDeNivel(5, 5);
    // Cuanto más rápido, antes hay que decidir: más lejos y más pequeña.
    expect(zDeDecision(rapido)).toBeGreaterThan(zDeDecision(lento));
    expect(escalaAlDecidir(rapido)).toBeLessThan(escalaAlDecidir(lento));
    // Medirla al llegar la inflaba entre un 40 y un 75 %.
    expect(1 / escalaAlDecidir(lento)).toBeGreaterThan(1.3);
    expect(escalaAlDecidir(lento)).toBeLessThan(1);
  });

  it('acierta quien elige carril y postura, aunque el salto salga a destiempo', () => {
    expect(aberturaIdentificada(muro({ carrilAcertado: true, intencion: 'saltando' }))).toBe(true);
    expect(aberturaIdentificada(muro({ carrilAcertado: true, intencion: 'deslizando' }))).toBe(false);
    expect(aberturaIdentificada(muro({ carrilAcertado: false, intencion: 'saltando' }))).toBe(false);
    expect(aberturaIdentificada(muro({ carrilAcertado: true, intencion: null }))).toBe(false);
    expect(
      aberturaIdentificada(muro({ abertura: 'abajo', carrilAcertado: true, intencion: 'deslizando' })),
    ).toBe(true);
  });

  it('en partida: saltar demasiado pronto tropieza, pero cuenta como vista', () => {
    const juego = montarJuego('tunel', 'parche');
    const dentro = juego.instancia as unknown as {
      muros: Muro[];
      carril: number;
      energia: number;
    };
    // Se espera al primer muro y se va a su carril.
    juego.avanzar(100);
    const primero = dentro.muros[0];
    while (dentro.carril < primero.carril) juego.tecla('ArrowRight');
    while (dentro.carril > primero.carril) juego.tecla('ArrowLeft');
    // Se pide la postura correcta enseguida, cuando el muro está todavía lejos.
    juego.tecla(primero.abertura === 'arriba' ? 'ArrowUp' : 'ArrowDown');
    juego.avanzar(8000);
    const [ensayo] = juego.ensayos;
    expect(primero.logrado).toBe(false);
    expect(ensayo.acierto).toBe(true);
    expect(ensayo.parametro).toBe('aberturaVista');
    // Se anota lo que se vio al decidir, más pequeño que lo que llega.
    expect(ensayo.valor).toBeCloseTo(primero.vistaPx, 6);
    expect(ensayo.valor).toBeLessThan(primero.aberturaPx);
  });
});
