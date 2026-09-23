/**
 * Túnel de escape.
 * Habilidad: resolver un hueco pequeño en movimiento y decidir rápido.
 *
 * La pixelnauta corre por un túnel de tres carriles. Cada cierto trecho llega
 * un muro que cruza los tres y solo deja una abertura, arriba o abajo, en uno
 * de ellos. Hay que verla desde lejos —cuando todavía es diminuta—, cambiar de
 * carril y saltar o rodar. Fallar no destruye nada: solo baja un poco el
 * medidor de energía, que se recarga solo.
 *
 * Capas en modo lentes:
 *   ojo ambliope → los muros y su abertura
 *   ojo dominante → el túnel, las franjas del suelo y la corredora
 *   ambos → líneas de los carriles, marca del carril de la corredora,
 *           celdas de energía, medidor, marco y HUD
 */
import { config, type Modo } from '../../config';
import { crearAleatorio, type Aleatorio } from '../../engine/rng';
import type { ConfigDeEscalera } from '../../engine/Staircase';
import { GameLoop } from '../../engine/GameLoop';
import { ContadorDeNivel, areaDeJuego, dibujarMarcoYHud } from '../comun';
import { claveDeEscalera, type ContextoDeJuego, type InstanciaDeJuego, type Minijuego } from '../tipos';
import { dibujarCeldaDeEnergia, dibujarCorredora, dibujarMarcaDeSuelo } from './arte';
import {
  aberturaVisible,
  alturaDelSalto,
  altoDeLaCorredora,
  carrilAlLado,
  enVentanaDeJuicio,
  escalaDeZ,
  muroResuelto,
  pasaElMuro,
  velocidadDeNivel,
  type CeldaDeEnergia,
  type Muro,
  type Postura,
} from './pista';

const PARAMETRO = 'abertura';

export function escalerasDeTunel(modo: Modo, mundo: number): ConfigDeEscalera[] {
  void mundo;
  return [
    {
      clave: claveDeEscalera('tunel', modo, PARAMETRO),
      valorInicial: config.tunel.aberturaInicialPx,
      minimo: config.tunel.aberturaMinimaPx,
      maximo: config.tunel.aberturaMaximaPx,
    },
  ];
}

/** Zona táctil de los botones en pantalla. */
interface Boton {
  id: 'izquierda' | 'saltar' | 'rodar' | 'derecha';
  x: number;
  y: number;
  lado: number;
}

const ORDEN_DE_BOTONES: Array<Boton['id']> = ['izquierda', 'saltar', 'rodar', 'derecha'];

class InstanciaDeTunel implements InstanciaDeJuego {
  private readonly bucle: GameLoop;
  private readonly contador = new ContadorDeNivel();
  private readonly aleatorio: Aleatorio;
  private readonly clave: string;
  private readonly velocidad: number;

  private muros: Muro[] = [];
  private celdas: CeldaDeEnergia[] = [];
  private carril = Math.floor(config.tunel.carriles / 2);
  /** Carril interpolado: solo para dibujar el cambio de carril. */
  private carrilVisual = this.carril;
  private postura: Postura = 'corriendo';
  private posturaDesdeMs = 0;
  private posturaHastaMs = 0;
  private recorrido = 0;
  private energia = config.tunel.energiaMaxima;
  private celdasRecogidas = 0;
  private tropiezoHasta = 0;
  /** Gesto pulsado mientras saltaba o rodaba: se aplica al aterrizar. */
  private gestoPendiente: { postura: Postura; enMs: number } | null = null;
  private terminado = false;
  private destruido = false;
  private tocandoDesde: { x: number; y: number } | null = null;

  constructor(
    private readonly canvas: HTMLCanvasElement,
    private readonly ctx: ContextoDeJuego,
  ) {
    this.clave = escalerasDeTunel(ctx.modo, ctx.mundo)[0].clave;
    this.velocidad = velocidadDeNivel(ctx.mundo, ctx.nivel);
    this.aleatorio = crearAleatorio(`tunel:${ctx.mundo}:${ctx.nivel}:${Date.now()}`);
    this.bucle = new GameLoop((dt, tiempo) => this.cuadro(dt, tiempo));
  }

  iniciar(): void {
    this.canvas.addEventListener('pointerdown', this.alTocar);
    window.addEventListener('pointerup', this.alSoltar);
    window.addEventListener('keydown', this.alTeclado);
    this.bucle.iniciar();
  }

  pausar(): void {
    this.bucle.pausar();
  }

  reanudar(): void {
    this.bucle.reanudar();
  }

  destruir(): void {
    this.destruido = true;
    this.bucle.detener();
    this.canvas.removeEventListener('pointerdown', this.alTocar);
    window.removeEventListener('pointerup', this.alSoltar);
    window.removeEventListener('keydown', this.alTeclado);
  }

  fps(): number {
    return this.bucle.fps;
  }

  // -------------------------------------------------------------------------
  // Entrada
  // -------------------------------------------------------------------------

  private alTocar = (evento: PointerEvent): void => {
    const caja = this.canvas.getBoundingClientRect();
    const x = evento.clientX - caja.left;
    const y = evento.clientY - caja.top;

    const boton = this.botonEn(x, y);
    if (boton) {
      if (boton === 'izquierda') this.cambiarDeCarril(-1);
      else if (boton === 'derecha') this.cambiarDeCarril(1);
      else if (boton === 'saltar') this.saltar();
      else this.rodar();
      return;
    }
    this.tocandoDesde = { x, y };
  };

  /** Un deslizamiento del dedo: a los lados cambia de carril, arriba salta, abajo rueda. */
  private alSoltar = (evento: PointerEvent): void => {
    const desde = this.tocandoDesde;
    if (!desde) return;
    this.tocandoDesde = null;
    const caja = this.canvas.getBoundingClientRect();
    const dx = evento.clientX - caja.left - desde.x;
    const dy = evento.clientY - caja.top - desde.y;
    const minimo = config.tunel.deslizarMinimoPx;
    if (Math.max(Math.abs(dx), Math.abs(dy)) < minimo) return;

    if (Math.abs(dx) >= Math.abs(dy)) this.cambiarDeCarril(dx > 0 ? 1 : -1);
    else if (dy < 0) this.saltar();
    else this.rodar();
  };

  private alTeclado = (evento: KeyboardEvent): void => {
    switch (evento.key) {
      case 'ArrowLeft':
        this.cambiarDeCarril(-1);
        break;
      case 'ArrowRight':
        this.cambiarDeCarril(1);
        break;
      case 'ArrowUp':
      case ' ':
      case 'Enter':
        this.saltar();
        break;
      case 'ArrowDown':
        this.rodar();
        break;
      default:
        return;
    }
    evento.preventDefault();
  };

  private cambiarDeCarril(direccion: number): void {
    this.carril = carrilAlLado(this.carril, direccion, config.tunel.carriles);
  }

  /**
   * Saltar y rodar no se interrumpen: una vez empezado, el gesto se cumple.
   * Si se pulsa mientras está en el aire, el gesto se guarda y se aplica solo
   * al aterrizar, para que pulsar un pelo antes de tiempo no se pierda.
   */
  private cambiarPostura(postura: Postura, duracionMs: number): void {
    if (this.postura !== 'corriendo') {
      this.gestoPendiente = { postura, enMs: this.bucle.tiempoMs };
      return;
    }
    this.postura = postura;
    this.posturaDesdeMs = this.bucle.tiempoMs;
    this.posturaHastaMs = this.bucle.tiempoMs + duracionMs;
  }

  private duracionDePostura(postura: Postura): number {
    return postura === 'saltando' ? config.tunel.saltoMs : config.tunel.deslizamientoMs;
  }

  private saltar(): void {
    this.cambiarPostura('saltando', config.tunel.saltoMs);
  }

  private rodar(): void {
    this.cambiarPostura('deslizando', config.tunel.deslizamientoMs);
  }

  // -------------------------------------------------------------------------
  // Simulación
  // -------------------------------------------------------------------------

  private nacerMuro(tiempoMs: number): void {
    const propuesto = this.ctx.escaleras[this.clave].proximoEnsayo();
    const { altoTunel } = this.geometria();
    const anterior = this.muros[this.muros.length - 1];

    this.muros.push({
      z: config.tunel.zDeNacimiento,
      carril: this.aleatorio.entero(0, config.tunel.carriles - 1),
      abertura: this.aleatorio.probabilidad(0.5) ? 'arriba' : 'abajo',
      // Se guarda la abertura que de verdad se muestra, no la pedida.
      aberturaPx: aberturaVisible(propuesto.valor, altoTunel),
      esEnsayoDeConfianza: propuesto.esEnsayoDeConfianza,
      nacidoMs: tiempoMs,
      resuelto: false,
      logrado: false,
    });

    // Las celdas llegan antes que este muro, o sea justo después del anterior:
    // van en el carril por el que se sale de aquel, que es donde ya estará.
    // Así se pueden recoger de verdad en vez de quedar en un carril imposible.
    const carrilDeCeldas = anterior ? anterior.carril : this.carril;
    const hueco = config.tunel.separacionDeMuros / (config.tunel.celdasPorTramo + 1);
    for (let i = 1; i <= config.tunel.celdasPorTramo; i += 1) {
      this.celdas.push({
        z: config.tunel.zDeNacimiento - hueco * i,
        carril: carrilDeCeldas,
        tomada: false,
      });
    }
  }

  private resolverMuro(muro: Muro, tiempoMs: number): void {
    muro.resuelto = true;
    const acierto = muro.logrado;
    if (!acierto) {
      // La corredora nunca se destruye: solo pierde un poco de energía.
      this.energia = Math.max(0, this.energia - config.tunel.energiaPorTropiezo);
      this.tropiezoHasta = tiempoMs + config.tunel.avisoTropiezoMs;
    }

    this.ctx.escaleras[this.clave].record(acierto, muro.esEnsayoDeConfianza);
    const tiempoReaccionMs = tiempoMs - muro.nacidoMs;
    this.contador.registrar(acierto, tiempoReaccionMs, muro.esEnsayoDeConfianza);
    this.ctx.onEnsayo({
      juego: 'tunel',
      modo: this.ctx.modo,
      parametro: PARAMETRO,
      valor: muro.aberturaPx,
      acierto,
      tiempoReaccionMs,
      esEnsayoDeConfianza: muro.esEnsayoDeConfianza,
      detalle: muro.abertura,
    });
  }

  private cuadro(dtMs: number, tiempoMs: number): void {
    if (this.destruido || this.terminado) return;
    const dt = dtMs / 1000;
    const avance = this.velocidad * dt;
    this.recorrido += avance;

    if (this.postura !== 'corriendo' && tiempoMs >= this.posturaHastaMs) {
      this.postura = 'corriendo';
    }
    // Al aterrizar se cobra el gesto guardado, si todavía está fresco.
    if (this.postura === 'corriendo' && this.gestoPendiente) {
      const { postura, enMs } = this.gestoPendiente;
      this.gestoPendiente = null;
      if (tiempoMs - enMs <= config.tunel.bufferDeGestoMs) {
        this.cambiarPostura(postura, this.duracionDePostura(postura));
      }
    }

    // El carril se mueve suave solo para el dibujo; la lógica ya está en el nuevo.
    const paso = dt / (config.tunel.cambioDeCarrilMs / 1000);
    const diferencia = this.carril - this.carrilVisual;
    this.carrilVisual += Math.sign(diferencia) * Math.min(Math.abs(diferencia), paso);

    const ultimo = this.muros.length > 0 ? this.muros[this.muros.length - 1] : null;
    if (!ultimo || ultimo.z <= config.tunel.zDeNacimiento - config.tunel.separacionDeMuros) {
      this.nacerMuro(tiempoMs);
    }

    for (const muro of this.muros) {
      muro.z -= avance;
      if (muro.resuelto) continue;
      // Basta con acertar en cualquier instante de la ventana.
      if (enVentanaDeJuicio(muro.z) && pasaElMuro(muro, this.carril, this.postura)) {
        muro.logrado = true;
      }
      if (muroResuelto(muro.z)) this.resolverMuro(muro, tiempoMs);
    }
    this.muros = this.muros.filter((muro) => muro.z > -2);

    for (const celda of this.celdas) {
      celda.z -= avance;
      if (!celda.tomada && celda.z <= config.tunel.zDeRecogida && celda.carril === this.carril) {
        celda.tomada = true;
        this.celdasRecogidas += 1;
        this.energia = Math.min(
          config.tunel.energiaMaxima,
          this.energia + config.tunel.energiaPorCelda,
        );
      }
    }
    this.celdas = this.celdas.filter((celda) => celda.z > -1 && !celda.tomada);

    this.energia = Math.min(
      config.tunel.energiaMaxima,
      this.energia + config.tunel.energiaRecargaPorSeg * dt,
    );

    if (tiempoMs >= config.tunel.duracionNivelSeg * 1000) {
      this.terminarNivel();
      return;
    }
    this.dibujar(tiempoMs);
  }

  private terminarNivel(): void {
    if (this.terminado) return;
    this.terminado = true;
    this.bucle.detener();
    const umbrales: Record<string, number> = {};
    for (const [clave, escalera] of Object.entries(this.ctx.escaleras)) {
      umbrales[clave.split(':').slice(2).join(':')] = escalera.threshold();
    }
    this.ctx.onFinNivel(this.contador.resumen(umbrales));
  }

  // -------------------------------------------------------------------------
  // Perspectiva
  // -------------------------------------------------------------------------

  private geometria() {
    const area = areaDeJuego(this.ctx.renderer);
    const { alturaDelHorizonteEnAlto, alturaDelSueloEnAlto, altoDelTunelEnAlto } = config.tunel;
    return {
      area,
      horizonte: area.y + area.alto * alturaDelHorizonteEnAlto,
      sueloCerca: area.y + area.alto * alturaDelSueloEnAlto,
      altoTunel: area.alto * altoDelTunelEnAlto,
      anchoCarril: area.ancho * config.tunel.anchoDeCarrilEnAncho,
      centro: area.x + area.ancho / 2,
    };
  }

  /**
   * Un punto de la pista en pantalla.
   * `u` es el desplazamiento lateral en carriles (0 es el centro) y `altura`
   * va de 0 (suelo) a 1 (techo del túnel).
   */
  private punto(z: number, u: number, altura = 0) {
    const g = this.geometria();
    const e = escalaDeZ(z);
    const suelo = g.horizonte + (g.sueloCerca - g.horizonte) * e;
    return {
      x: g.centro + u * g.anchoCarril * e,
      y: suelo - altura * g.altoTunel * e,
      suelo,
      escala: e,
    };
  }

  /** Borde izquierdo y derecho de un carril, en unidades laterales. */
  private ladosDeCarril(carril: number): [number, number] {
    const centro = carril - (config.tunel.carriles - 1) / 2;
    return [centro - 0.5, centro + 0.5];
  }

  // -------------------------------------------------------------------------
  // Dibujo
  // -------------------------------------------------------------------------

  private dibujar(tiempoMs: number): void {
    const { renderer } = this.ctx;
    renderer.limpiar();

    this.dibujarTunel();
    this.dibujarCarriles();
    // De lejos a cerca, para que lo cercano tape lo lejano.
    for (const muro of [...this.muros].sort((a, b) => b.z - a.z)) this.dibujarMuro(muro);
    this.dibujarCeldas(tiempoMs);
    this.dibujarCorredora(tiempoMs);
    this.dibujarMedidor();
    this.dibujarBotones();

    const restante = Math.max(0, 1 - tiempoMs / (config.tunel.duracionNivelSeg * 1000));
    dibujarMarcoYHud(
      renderer,
      `${this.celdasRecogidas}`,
      `${Math.ceil(restante * config.tunel.duracionNivelSeg)} s`,
      restante,
    );
  }

  /**
   * El túnel: paredes, franjas del suelo y del techo, y costillas que unen
   * los dos. El techo importa tanto como el suelo, porque sin él "arriba" no
   * significa nada y una abertura alta no se distingue de una baja.
   */
  private dibujarTunel(): void {
    const { renderer } = this.ctx;
    const { franjasDelSuelo, zDeNacimiento } = config.tunel;
    const bordes = this.ladosDeCarril(0)[0];
    const separacion = zDeNacimiento / franjasDelSuelo;

    // Paredes laterales: el fondo sobre el que va todo lo demás.
    for (const lado of [bordes, -bordes]) {
      const cercaSuelo = this.punto(0, lado);
      const cercaTecho = this.punto(0, lado, 1);
      const lejosSuelo = this.punto(zDeNacimiento, lado);
      const lejosTecho = this.punto(zDeNacimiento, lado, 1);
      renderer.poligono(
        'ojoDominante',
        [
          [cercaSuelo.x, cercaSuelo.y],
          [cercaTecho.x, cercaTecho.y],
          [lejosTecho.x, lejosTecho.y],
          [lejosSuelo.x, lejosSuelo.y],
        ],
        { factor: 0.25 },
      );
    }

    for (let i = 0; i < franjasDelSuelo; i += 1) {
      // Las franjas se desplazan con el recorrido y reaparecen al fondo.
      const z = ((i * separacion - this.recorrido) % zDeNacimiento + zDeNacimiento) % zDeNacimiento;
      const izquierdaSuelo = this.punto(z, bordes);
      const derechaSuelo = this.punto(z, -bordes);
      const izquierdaTecho = this.punto(z, bordes, 1);
      const derechaTecho = this.punto(z, -bordes, 1);
      const grosor = Math.max(1, Math.round(4 * izquierdaSuelo.escala));
      const ancho = derechaSuelo.x - izquierdaSuelo.x;

      renderer.rect('ojoDominante', izquierdaSuelo.x, izquierdaSuelo.y - grosor, ancho, grosor, {
        factor: 0.55,
      });
      renderer.rect('ojoDominante', izquierdaTecho.x, izquierdaTecho.y, ancho, grosor, {
        factor: 0.38,
      });

      // Costillas: unen suelo y techo en los dos lados y marcan la distancia.
      for (const [abajo, arriba] of [
        [izquierdaSuelo, izquierdaTecho],
        [derechaSuelo, derechaTecho],
      ] as const) {
        renderer.rect(
          'ojoDominante',
          abajo.x - grosor / 2,
          arriba.y,
          grosor,
          abajo.y - arriba.y,
          { factor: 0.38 },
        );
      }
    }
  }

  /**
   * Líneas de los carriles, arriba y abajo, y marca del carril de la corredora.
   * Van en la capa de ambos ojos: son el marco de referencia común, lo único
   * que permite juntar lo que ve cada ojo.
   */
  private dibujarCarriles(): void {
    const { renderer } = this.ctx;
    const { zDeNacimiento, carriles } = config.tunel;

    for (let i = 0; i <= carriles; i += 1) {
      const u = i - carriles / 2;
      for (const [altura, factor] of [
        [0, 0.6],
        [1, 0.32],
      ] as const) {
        const cerca = this.punto(0, u, altura);
        const fondo = this.punto(zDeNacimiento, u, altura);
        const grosorCerca = 2;
        const grosorLejos = Math.max(1, grosorCerca * escalaDeZ(zDeNacimiento));
        renderer.poligono(
          'ambos',
          [
            [cerca.x - grosorCerca, cerca.y],
            [cerca.x + grosorCerca, cerca.y],
            [fondo.x + grosorLejos, fondo.y],
            [fondo.x - grosorLejos, fondo.y],
          ],
          { factor },
        );
      }
    }

    // Corchete a los pies: dice a los dos ojos en qué carril va la corredora.
    const [izquierda, derecha] = this.ladosDeCarril(this.carrilVisual);
    const a = this.punto(0, izquierda);
    const b = this.punto(0, derecha);
    const alto = Math.max(4, (b.x - a.x) * 0.16);
    renderer.rect('ambos', a.x, a.y, b.x - a.x, 3);
    renderer.rect('ambos', a.x, a.y - alto, 3, alto);
    renderer.rect('ambos', b.x - 3, a.y - alto, 3, alto);
  }

  /**
   * Un muro con su única abertura. Se dibuja con dos caras —la de atrás más
   * apagada— para que tenga cuerpo y la abertura se lea como un hueco por el
   * que se pasa, no como una muesca pintada.
   */
  private dibujarMuro(muro: Muro): void {
    const { altoTunel } = this.geometria();
    // El hueco se mide en píxeles al llegar y se mantiene igual en las dos
    // caras: si la de atrás lo estrechara, la prueba mediría otra cosa.
    const huecoPx = aberturaVisible(muro.aberturaPx, altoTunel) * escalaDeZ(muro.z);
    this.dibujarCaraDeMuro(
      muro,
      muro.z + config.tunel.grosorDeMuro,
      huecoPx,
      config.tunel.factorCaraDeAtras,
    );
    this.dibujarCaraDeMuro(muro, muro.z, huecoPx, 1);
  }

  private dibujarCaraDeMuro(muro: Muro, z: number, huecoPx: number, factor: number): void {
    const { renderer } = this.ctx;
    const alto = this.geometria().altoTunel * escalaDeZ(z);
    if (alto < 2) return;

    for (let carril = 0; carril < config.tunel.carriles; carril += 1) {
      const [u0, u1] = this.ladosDeCarril(carril);
      const a = this.punto(z, u0);
      const b = this.punto(z, u1);
      const ancho = b.x - a.x;
      const yPie = a.y;
      const yTecho = yPie - alto;

      if (carril !== muro.carril) {
        renderer.rect('ojoAmbliope', a.x, yTecho, ancho, alto, { factor });
        continue;
      }
      const altoMuro = alto - huecoPx;
      if (altoMuro < 1) continue;
      // Abertura arriba: el muro sube del suelo. Abajo: cuelga del techo.
      const y = muro.abertura === 'arriba' ? yPie - altoMuro : yTecho;
      renderer.rect('ojoAmbliope', a.x, y, ancho, altoMuro, { factor });
    }
  }

  private dibujarCeldas(tiempoMs: number): void {
    const { renderer } = this.ctx;
    const { anchoCarril } = this.geometria();

    for (const celda of this.celdas) {
      if (celda.tomada || celda.z < 0) continue;
      const [u0, u1] = this.ladosDeCarril(celda.carril);
      const centro = (u0 + u1) / 2;
      const suelo = this.punto(celda.z, centro);
      const p = this.punto(celda.z, centro, config.tunel.alturaDeCelda);
      const lado = Math.max(2, anchoCarril * 0.2 * p.escala);

      // La marca en el suelo dice a qué distancia está: sin ella no hay forma
      // de calcular cuándo llega ni en qué carril cae.
      dibujarMarcaDeSuelo(
        renderer,
        'ambos',
        suelo.x,
        suelo.y,
        lado * 1.7,
        config.tunel.factorDeSombra,
      );
      dibujarCeldaDeEnergia(renderer, 'ambos', p.x, p.y, lado, (tiempoMs / 900) % 1);
    }
  }

  private dibujarCorredora(tiempoMs: number): void {
    const { renderer } = this.ctx;
    const g = this.geometria();
    const [u0, u1] = this.ladosDeCarril(this.carrilVisual);
    const centro = (u0 + u1) / 2;
    const avanceDeSalto =
      this.postura === 'saltando' ? (tiempoMs - this.posturaDesdeMs) / config.tunel.saltoMs : 0;
    const altura = alturaDelSalto(this.postura, avanceDeSalto);
    const enSuelo = this.punto(0, centro);
    const pies = this.punto(0, centro, altura);
    const alto = altoDeLaCorredora(this.postura) * g.altoTunel;
    const ancho = g.anchoCarril * (this.postura === 'deslizando' ? 0.62 : 0.42);

    // La marca se queda en el suelo mientras ella sube: es lo que hace que el
    // salto se lea de un vistazo en vez de parecer que encoge.
    dibujarMarcaDeSuelo(
      renderer,
      'ambos',
      enSuelo.x,
      enSuelo.y,
      ancho * (1 - altura * 0.6),
      config.tunel.factorDeSombra,
    );

    // Un tropiezo se marca con un recuadro alrededor, sin destellos.
    if (tiempoMs < this.tropiezoHasta) {
      renderer.marco('ambos', pies.x - ancho / 2 - 3, pies.y - alto - 3, ancho + 6, alto + 6, 2, {
        factor: 0.7,
      });
    }

    dibujarCorredora(
      renderer,
      'ojoDominante',
      { x: pies.x - ancho / 2, suelo: pies.y, ancho, alto },
      this.postura,
      (this.recorrido * 0.9) % 1,
    );
  }

  /** Medidor de energía, pegado al borde derecho para no chocar con la pausa. */
  private dibujarMedidor(): void {
    const { renderer } = this.ctx;
    const area = areaDeJuego(renderer);
    const ancho = Math.round(area.ancho * 0.25);
    const x = area.x + area.ancho - ancho;
    const y = area.y + area.alto - 12;
    const lleno = Math.round((this.energia / config.tunel.energiaMaxima) * (ancho - 2));
    renderer.marco('ambos', x, y, ancho, 12, 1);
    renderer.rect('ambos', x + 1, y + 1, Math.max(0, lleno), 10);
  }

  private botones(): Boton[] {
    const area = areaDeJuego(this.ctx.renderer);
    const lado = Math.max(config.accesibilidad.botonMinimoPx, 54);
    const y = area.y + area.alto - lado - 18;
    const hueco = lado * 1.15;
    const centro = area.x + area.ancho / 2;
    const inicio = centro - (hueco * (ORDEN_DE_BOTONES.length - 1)) / 2 - lado / 2;
    return ORDEN_DE_BOTONES.map((id, i) => ({ id, x: inicio + hueco * i, y, lado }));
  }

  private botonEn(x: number, y: number): Boton['id'] | null {
    for (const boton of this.botones()) {
      if (x >= boton.x && x <= boton.x + boton.lado && y >= boton.y && y <= boton.y + boton.lado) {
        return boton.id;
      }
    }
    return null;
  }

  /** Botones ◀ ▲ ▼ ▶ en pantalla, de 48 px o más, para jugar en tablet. */
  private dibujarBotones(): void {
    const { renderer } = this.ctx;
    for (const boton of this.botones()) {
      renderer.marco('ambos', boton.x, boton.y, boton.lado, boton.lado, 2, { factor: 0.75 });
      const cx = boton.x + boton.lado / 2;
      const cy = boton.y + boton.lado / 2;
      const r = boton.lado / 5;
      const puntos: Record<Boton['id'], Array<[number, number]>> = {
        izquierda: [
          [cx - r, cy],
          [cx + r, cy - r],
          [cx + r, cy + r],
        ],
        derecha: [
          [cx + r, cy],
          [cx - r, cy - r],
          [cx - r, cy + r],
        ],
        saltar: [
          [cx, cy - r],
          [cx + r, cy + r],
          [cx - r, cy + r],
        ],
        rodar: [
          [cx, cy + r],
          [cx - r, cy - r],
          [cx + r, cy - r],
        ],
      };
      renderer.poligono('ambos', puntos[boton.id], { factor: 0.75 });
    }
  }
}

export const tunel: Minijuego = {
  id: 'tunel',
  escaleras: escalerasDeTunel,
  crear: (canvas, contexto) => new InstanciaDeTunel(canvas, contexto),
};
