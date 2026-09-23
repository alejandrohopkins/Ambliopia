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
import { dibujarCeldaDeEnergia, dibujarCorredora } from './arte';
import {
  aberturaVisible,
  alturaDelSalto,
  altoDeLaCorredora,
  carrilAlLado,
  escalaDeZ,
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

  /** Saltar y rodar no se interrumpen: una vez empezado, el gesto se cumple. */
  private cambiarPostura(postura: Postura, duracionMs: number): void {
    if (this.postura !== 'corriendo') return;
    this.postura = postura;
    this.posturaDesdeMs = this.bucle.tiempoMs;
    this.posturaHastaMs = this.bucle.tiempoMs + duracionMs;
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
    const carril = this.aleatorio.entero(0, config.tunel.carriles - 1);

    this.muros.push({
      z: config.tunel.zDeNacimiento,
      carril,
      abertura: this.aleatorio.probabilidad(0.5) ? 'arriba' : 'abajo',
      // Se guarda la abertura que de verdad se muestra, no la pedida.
      aberturaPx: aberturaVisible(propuesto.valor, altoTunel),
      esEnsayoDeConfianza: propuesto.esEnsayoDeConfianza,
      nacidoMs: tiempoMs,
      resuelto: false,
    });

    // Celdas de energía repartidas por el tramo que viene detrás del muro.
    const hueco = config.tunel.separacionDeMuros / (config.tunel.celdasPorTramo + 1);
    for (let i = 1; i <= config.tunel.celdasPorTramo; i += 1) {
      this.celdas.push({
        z: config.tunel.zDeNacimiento - hueco * i,
        carril: this.aleatorio.entero(0, config.tunel.carriles - 1),
        tomada: false,
      });
    }
  }

  private resolverMuro(muro: Muro, tiempoMs: number): void {
    muro.resuelto = true;
    const acierto = pasaElMuro(muro, this.carril, this.postura);
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
      if (!muro.resuelto && muro.z <= 0) this.resolverMuro(muro, tiempoMs);
    }
    this.muros = this.muros.filter((muro) => muro.z > -1);

    for (const celda of this.celdas) {
      celda.z -= avance;
      if (!celda.tomada && celda.z <= 0 && celda.carril === this.carril) {
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

  /** Franjas del suelo y contorno del túnel: dan la sensación de avanzar. */
  private dibujarTunel(): void {
    const { renderer } = this.ctx;
    const { franjasDelSuelo, zDeNacimiento } = config.tunel;
    const bordes = this.ladosDeCarril(0)[0];
    const separacion = zDeNacimiento / franjasDelSuelo;

    for (let i = 0; i < franjasDelSuelo; i += 1) {
      // Las franjas se desplazan con el recorrido y reaparecen al fondo.
      const z = ((i * separacion - this.recorrido) % zDeNacimiento + zDeNacimiento) % zDeNacimiento;
      const cerca = this.punto(z, 0);
      const izquierda = this.punto(z, bordes);
      const derecha = this.punto(z, -bordes);
      const grosor = Math.max(1, Math.round(4 * cerca.escala));
      renderer.rect(
        'ojoDominante',
        izquierda.x,
        cerca.y - grosor,
        derecha.x - izquierda.x,
        grosor,
        { factor: 0.5 },
      );
    }

    // Paredes del túnel: dos cintas que van del suelo al techo en cada lado.
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
        { factor: 0.28 },
      );
    }
  }

  /**
   * Líneas de los carriles y marca del carril de la corredora.
   * Van en la capa de ambos ojos: son el marco de referencia común, lo único
   * que permite juntar lo que ve cada ojo.
   */
  private dibujarCarriles(): void {
    const { renderer } = this.ctx;
    const { zDeNacimiento, carriles } = config.tunel;
    const lejos = zDeNacimiento;

    for (let i = 0; i <= carriles; i += 1) {
      const u = i - carriles / 2;
      const cerca = this.punto(0, u);
      const fondo = this.punto(lejos, u);
      const grosorCerca = 2;
      const grosorLejos = Math.max(1, grosorCerca * escalaDeZ(lejos));
      renderer.poligono(
        'ambos',
        [
          [cerca.x - grosorCerca, cerca.y],
          [cerca.x + grosorCerca, cerca.y],
          [fondo.x + grosorLejos, fondo.y],
          [fondo.x - grosorLejos, fondo.y],
        ],
        { factor: 0.55 },
      );
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

  /** Un muro con su única abertura: la tarea visual del juego. */
  private dibujarMuro(muro: Muro): void {
    const { renderer } = this.ctx;
    const g = this.geometria();
    const e = escalaDeZ(muro.z);
    const alto = g.altoTunel * e;
    const hueco = aberturaVisible(muro.aberturaPx, g.altoTunel) * e;

    for (let carril = 0; carril < config.tunel.carriles; carril += 1) {
      const [u0, u1] = this.ladosDeCarril(carril);
      const a = this.punto(muro.z, u0);
      const b = this.punto(muro.z, u1);
      const ancho = b.x - a.x;
      const yPie = a.y;
      const yTecho = yPie - alto;

      if (carril !== muro.carril) {
        renderer.rect('ojoAmbliope', a.x, yTecho, ancho, alto);
        continue;
      }
      // Abertura arriba: el muro sube del suelo. Abajo: cuelga del techo.
      const altoMuro = Math.max(1, alto - hueco);
      const y = muro.abertura === 'arriba' ? yPie - altoMuro : yTecho;
      renderer.rect('ojoAmbliope', a.x, y, ancho, altoMuro);
    }
  }

  private dibujarCeldas(tiempoMs: number): void {
    const { renderer } = this.ctx;
    for (const celda of this.celdas) {
      if (celda.tomada || celda.z < 0) continue;
      const [u0, u1] = this.ladosDeCarril(celda.carril);
      const centro = (u0 + u1) / 2;
      const p = this.punto(celda.z, centro, config.tunel.alturaDeSalto * 0.5);
      const lado = Math.max(2, this.geometria().anchoCarril * 0.12 * p.escala);
      dibujarCeldaDeEnergia(renderer, 'ambos', p.x, p.y, lado, (tiempoMs / 900) % 1);
    }
  }

  private dibujarCorredora(tiempoMs: number): void {
    const { renderer } = this.ctx;
    const g = this.geometria();
    const [u0, u1] = this.ladosDeCarril(this.carrilVisual);
    const centro = (u0 + u1) / 2;
    const avanceDeSalto =
      this.postura === 'saltando'
        ? (tiempoMs - this.posturaDesdeMs) / config.tunel.saltoMs
        : 0;
    const altura = alturaDelSalto(this.postura, avanceDeSalto);
    const pies = this.punto(0, centro, altura);
    const alto = altoDeLaCorredora(this.postura) * g.altoTunel;
    const ancho = g.anchoCarril * (this.postura === 'deslizando' ? 0.62 : 0.42);

    // Un tropiezo se marca con la corredora un poco más apagada, sin destellos.
    const tropezando = tiempoMs < this.tropiezoHasta;
    if (tropezando) {
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
