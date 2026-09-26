/**
 * Lluvia de meteoritos.
 * Habilidad: seguimiento visual, coordinación ojo-mano y distinguir formas
 * pequeñas con rapidez.
 *
 * Caen oleadas —varios objetos a la vez, en la misma fila— de estrellas de
 * energía (atraparlas) y rocas (romperlas de un disparo o esquivarlas), del
 * mismo tamaño y brillo: solo la forma las distingue. La nave nunca se
 * destruye; chocar resta un poco de un medidor que se recarga solo.
 *
 * Un objeto es un ensayo cuando se decide algo sobre él. Atrapar una estrella,
 * romper una roca o dejar que una roca pase cerca sin tocarla son aciertos;
 * disparar a una estrella o chocar con una roca, fallos. De cada oleada basta
 * con atrapar una estrella: solo si no se atrapa ninguna, la más cercana que
 * pasó junto a la nave cuenta como fallo. Lo que cae lejos sin que se le
 * dispare no mide nada.
 *
 * Capas en modo lentes:
 *   ojo ambliope → estrellas y rocas que caen
 *   ojo dominante → nave, estela, disparos y estrellas del fondo
 *   ambos → bordes laterales, medidor de energía, botón de disparo, HUD y las
 *           chispas de los estallidos
 */
import { config, type Modo } from '../../config';
import { crearAleatorio, type Aleatorio } from '../../engine/rng';
import type { ConfigDeEscalera } from '../../engine/Staircase';
import { GameLoop } from '../../engine/GameLoop';
import { ContadorDeNivel, areaDeJuego, dibujarMarcoYHud } from '../comun';
import { enteroSegunNivel, segunNivel } from '../base';
import { dibujarBotonera, ladoDeBoton, type Boton } from '../botonera';
import {
  escalaPara,
  estelaDeJuego,
  medida,
  naveDeJuego,
  spriteDeEquipo,
} from '../../avatar/enJuego';
import { claveDeEscalera, type ContextoDeJuego, type InstanciaDeJuego, type Minijuego } from '../tipos';

const PARAMETRO = 'tamano';

export function escalerasDeMeteoritos(modo: Modo, mundo: number): ConfigDeEscalera[] {
  void mundo;
  return [
    {
      clave: claveDeEscalera('meteoritos', modo, PARAMETRO),
      valorInicial: config.meteoritos.tamanoInicialPx,
      minimo: config.meteoritos.tamanoMinimoPx,
      maximo: config.meteoritos.tamanoMaximoPx,
    },
  ];
}

/**
 * Lo que manda el nivel: velocidad de caída, objetos por oleada, segundos
 * entre oleadas y tope de objetos en el aire. La escalera solo controla el
 * tamaño.
 */
export function dificultad(mundo: number, nivel: number) {
  const m = config.meteoritos;
  return {
    velocidad: segunNivel(mundo, nivel, m.velocidadCaidaInicialPxSeg, m.velocidadCaidaFinalPxSeg),
    oleada: enteroSegunNivel(mundo, nivel, m.oleadaMin, m.oleadaMax),
    intervaloSeg: segunNivel(mundo, nivel, m.intervaloDeOleadaInicialSeg, m.intervaloDeOleadaFinalSeg),
    enElAire: enteroSegunNivel(mundo, nivel, m.enElAireMin, m.enElAireMax),
  };
}

/**
 * Velocidad de la nave con el teclado, en píxeles por segundo.
 *
 * Arranca lenta para poder colocarla con precisión —un toque corto la mueve
 * unos pocos píxeles— y acelera si se mantiene la flecha, para no obligar a
 * teclear veinte veces al cruzar la pantalla.
 */
export function velocidadDeTeclado(segundosPulsada: number, anchoDelArea: number): number {
  const { tecladoVelocidadInicial, tecladoVelocidadMaxima, tecladoSegundosHastaMaxima } =
    config.meteoritos;
  const avance = Math.max(
    0,
    Math.min(1, segundosPulsada / Math.max(0.001, tecladoSegundosHastaMaxima)),
  );
  const fraccion =
    tecladoVelocidadInicial + (tecladoVelocidadMaxima - tecladoVelocidadInicial) * avance;
  return fraccion * anchoDelArea;
}

/**
 * ¿Este objeto pasó lo bastante cerca de la nave como para contar?
 * Todas las distancias en píxeles CSS.
 */
export function cuentaComoEnsayo(
  distanciaHorizontal: number,
  anchoDeNave: number,
  anchosDeNave = config.meteoritos.anchosDeNaveParaEnsayo,
): boolean {
  return Math.abs(distanciaHorizontal) <= anchoDeNave * anchosDeNave;
}

/** Choque entre la nave y un objeto, por solape de sus cajas. */
export function hayChoque(
  distanciaHorizontal: number,
  anchoDeNave: number,
  tamanoDelObjeto: number,
): boolean {
  return Math.abs(distanciaHorizontal) <= (anchoDeNave + tamanoDelObjeto) / 2;
}

/**
 * Columnas de una oleada. Van separadas lo bastante para atrapar un objeto
 * sin chocar con el de al lado. La primera es la más cercana a la nave, para
 * que siempre haya algo que decidir sin moverse mucho; las demás se reparten
 * al azar por el ancho.
 */
export function columnasDeOleada(
  cuantos: number,
  area: { x: number; ancho: number },
  separacion: number,
  naveX: number,
  aleatorio: Aleatorio,
): number[] {
  const margen = separacion / 2;
  const util = Math.max(0, area.ancho - 2 * margen);
  const huecos = Math.floor(util / separacion) + 1;
  const sobrante = util - (huecos - 1) * separacion;
  const inicio = area.x + margen + aleatorio.siguiente() * sobrante;
  const columnas = Array.from({ length: huecos }, (_, i) => inicio + i * separacion);

  let cercana = 0;
  columnas.forEach((x, i) => {
    if (Math.abs(x - naveX) < Math.abs(columnas[cercana] - naveX)) cercana = i;
  });
  const resto = aleatorio.barajar(columnas.filter((_, i) => i !== cercana));
  return [columnas[cercana], ...resto].slice(0, Math.max(1, Math.min(cuantos, huecos)));
}

/**
 * ¿El disparo toca el objeto? El disparo se mira en todo el tramo que recorrió
 * desde el cuadro anterior, para que un objeto pequeño no se quede entre dos
 * cuadros sin tocar.
 */
export function disparoAlcanza(
  xDisparo: number,
  arriba: number,
  abajo: number,
  objeto: { x: number; y: number; tamano: number },
): boolean {
  const alcance = Math.max(objeto.tamano / 2, config.meteoritos.disparoToleranciaPx);
  if (Math.abs(xDisparo - objeto.x) > alcance) return false;
  return arriba <= objeto.y + objeto.tamano / 2 && abajo >= objeto.y - objeto.tamano / 2;
}

type Tipo = 'estrella' | 'roca';

/** Chispa de un estallido: al atrapar una estrella o romper una roca. */
interface Chispa {
  x: number;
  y: number;
  /** Dirección de salida, en radianes. */
  angulo: number;
  radioFinal: number;
  nacidaMs: number;
}

interface Objeto {
  tipo: Tipo;
  /** Oleada a la que pertenece: los de una oleada caen juntos. */
  oleada: number;
  x: number;
  y: number;
  tamano: number;
  esEnsayoDeConfianza: boolean;
  /** Semilla de la forma de la roca, para que no cambie mientras cae. */
  semilla: number;
  resuelto: boolean;
  /** Roto por un disparo: deja de dibujarse. */
  roto: boolean;
  nacidoMs: number;
}

interface Disparo {
  x: number;
  /** Punta de arriba. */
  y: number;
}

/** Salto grande con Z o X: la nave se desliza deprisa hasta su destino. */
interface Salto {
  desde: number;
  hasta: number;
  inicioMs: number;
}

class InstanciaDeMeteoritos implements InstanciaDeJuego {
  private readonly bucle: GameLoop;
  private readonly contador = new ContadorDeNivel();
  private readonly aleatorio: Aleatorio;
  private readonly clave: string;
  private readonly nivel: ReturnType<typeof dificultad>;

  private objetos: Objeto[] = [];
  private disparos: Disparo[] = [];
  private naveX = 0;
  private energia = config.meteoritos.energiaMaxima;
  private estrellasAtrapadas = 0;
  private terminado = false;
  private destruido = false;
  private tiempoMs = 0;
  private proximaOleadaMs = 0;
  private oleadas = 0;
  private ultimoDisparoMs = -Infinity;
  private salto: Salto | null = null;
  /** El dedo o el ratón que mueve la nave; los demás toques no la mueven. */
  private punteroQueArrastra: number | null = null;
  private teclaIzquierda = false;
  private teclaDerecha = false;
  /** Segundos que lleva pulsada la flecha actual, para la aceleración. */
  private segundosPulsada = 0;
  private chispas: Chispa[] = [];
  private fondo: Array<{ x: number; y: number }> = [];

  constructor(
    private readonly canvas: HTMLCanvasElement,
    private readonly ctx: ContextoDeJuego,
  ) {
    this.clave = escalerasDeMeteoritos(ctx.modo, ctx.mundo)[0].clave;
    this.nivel = dificultad(ctx.mundo, ctx.nivel);
    this.aleatorio = crearAleatorio(`meteoritos:${ctx.mundo}:${ctx.nivel}:${Date.now()}`);
    this.bucle = new GameLoop((dt, tiempo) => this.cuadro(dt, tiempo));
  }

  iniciar(): void {
    const area = areaDeJuego(this.ctx.renderer);
    this.naveX = area.x + area.ancho / 2;
    this.fondo = Array.from({ length: 40 }, () => ({
      x: area.x + this.aleatorio.siguiente() * area.ancho,
      y: area.y + this.aleatorio.siguiente() * area.alto,
    }));

    this.canvas.addEventListener('pointerdown', this.alTocar);
    this.canvas.addEventListener('pointermove', this.alMover);
    window.addEventListener('pointerup', this.alSoltar);
    window.addEventListener('keydown', this.alBajarTecla);
    window.addEventListener('keyup', this.alSubirTecla);
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
    this.canvas.removeEventListener('pointermove', this.alMover);
    window.removeEventListener('pointerup', this.alSoltar);
    window.removeEventListener('keydown', this.alBajarTecla);
    window.removeEventListener('keyup', this.alSubirTecla);
  }

  fps(): number {
    return this.bucle.fps;
  }

  // -------------------------------------------------------------------------
  // Entrada
  // -------------------------------------------------------------------------

  private puntoDe(evento: PointerEvent): { x: number; y: number } {
    const caja = this.canvas.getBoundingClientRect();
    return { x: evento.clientX - caja.left, y: evento.clientY - caja.top };
  }

  private alTocar = (evento: PointerEvent) => {
    const { x, y } = this.puntoDe(evento);
    const boton = this.botonDeDisparo();
    if (x >= boton.x && x <= boton.x + boton.lado && y >= boton.y && y <= boton.y + boton.lado) {
      this.disparar();
      return;
    }
    this.punteroQueArrastra = evento.pointerId;
    this.llevarNaveA(x);
  };

  private alMover = (evento: PointerEvent) => {
    if (evento.pointerId === this.punteroQueArrastra) this.llevarNaveA(this.puntoDe(evento).x);
  };

  private alSoltar = (evento: PointerEvent) => {
    if (evento.pointerId === this.punteroQueArrastra) this.punteroQueArrastra = null;
  };

  private llevarNaveA(x: number) {
    this.salto = null;
    this.naveX = x;
    this.limitarNave();
  }

  /**
   * Flechas para moverse, Z y X para el salto grande y la barra espaciadora
   * para disparar. Aquí Z y X tienen su propio papel: no hacen de Enter ni de
   * barra espaciadora como en los demás juegos.
   */
  private alBajarTecla = (evento: KeyboardEvent) => {
    const tecla = evento.key.length === 1 ? evento.key.toLowerCase() : evento.key;
    if (tecla === 'ArrowLeft') this.teclaIzquierda = true;
    else if (tecla === 'ArrowRight') this.teclaDerecha = true;
    else if (tecla === ' ') this.disparar();
    else if (tecla === 'z' || tecla === 'x') {
      // Un salto por pulsación: mantener la tecla no cruza la pantalla sola.
      if (!evento.repeat) this.saltar(tecla === 'z' ? -1 : 1);
    } else return;
    evento.preventDefault();
  };

  private alSubirTecla = (evento: KeyboardEvent) => {
    if (evento.key === 'ArrowLeft') this.teclaIzquierda = false;
    if (evento.key === 'ArrowRight') this.teclaDerecha = false;
    // Al soltar, la próxima pulsación vuelve a empezar despacio.
    if (!this.teclaIzquierda && !this.teclaDerecha) this.segundosPulsada = 0;
  };

  private saltar(direccion: -1 | 1) {
    const area = areaDeJuego(this.ctx.renderer);
    // Dos saltos seguidos se suman: el segundo sale de donde iba a llegar el primero.
    const base = this.salto ? this.salto.hasta : this.naveX;
    this.salto = {
      desde: this.naveX,
      hasta: this.limitar(base + direccion * config.meteoritos.saltoLateral * area.ancho),
      inicioMs: this.tiempoMs,
    };
  }

  private disparar() {
    const m = config.meteoritos;
    if (this.terminado || this.tiempoMs - this.ultimoDisparoMs < m.disparoCadenciaMs) return;
    if (this.disparos.length >= m.disparosEnElAireMax) return;
    this.ultimoDisparoMs = this.tiempoMs;
    this.disparos.push({ x: this.naveX, y: this.naveY() - this.anchoDeNave() / 2 - m.disparoLargoPx });
  }

  private limitar(x: number): number {
    const area = areaDeJuego(this.ctx.renderer);
    const mitad = this.anchoDeNave() / 2;
    return Math.max(area.x + mitad, Math.min(area.x + area.ancho - mitad, x));
  }

  private limitarNave() {
    this.naveX = this.limitar(this.naveX);
  }

  // -------------------------------------------------------------------------
  // Geometría
  // -------------------------------------------------------------------------

  private anchoDeNave(): number {
    const area = areaDeJuego(this.ctx.renderer);
    return Math.max(28, Math.round(area.ancho / 14));
  }

  private naveY(): number {
    const area = areaDeJuego(this.ctx.renderer);
    return area.y + area.alto - this.anchoDeNave() * 0.8;
  }

  /** Botón de disparo para el dedo: a la derecha, justo por encima del carril de la nave. */
  private botonDeDisparo(): Boton<'disparar'> {
    const area = areaDeJuego(this.ctx.renderer);
    const lado = ladoDeBoton();
    return {
      id: 'disparar',
      icono: 'arriba',
      x: area.x + area.ancho - lado - 8,
      y: this.naveY() - this.anchoDeNave() / 2 - lado - 12,
      lado,
    };
  }

  // -------------------------------------------------------------------------
  // Simulación
  // -------------------------------------------------------------------------

  /** Una fila de objetos a la vez, con al menos una estrella y una roca. */
  private nacerOleada(tiempoMs: number): void {
    const area = areaDeJuego(this.ctx.renderer);
    const escalera = this.ctx.escaleras[this.clave];
    const propuesto = escalera.proximoEnsayo();
    // Como mucho un ensayo de confianza en el aire, y siempre en la columna
    // de la nave: si cayera lejos, nunca se registraría.
    const hayConfianza = this.objetos.some((o) => !o.resuelto && o.esEnsayoDeConfianza);
    const conConfianza = propuesto.esEnsayoDeConfianza && !hayConfianza;
    const tamanoNormal = escalera.current();
    const tamanoMayor = conConfianza ? propuesto.valor : tamanoNormal;

    const separacion =
      this.anchoDeNave() + tamanoMayor + config.meteoritos.margenEntreObjetosPx;
    const columnas = columnasDeOleada(this.nivel.oleada, area, separacion, this.naveX, this.aleatorio);
    const tipos: Tipo[] = columnas.map(() =>
      this.aleatorio.probabilidad(config.meteoritos.probabilidadEstrella) ? 'estrella' : 'roca',
    );
    if (tipos.length >= 2 && tipos.every((t) => t === tipos[0])) {
      tipos[this.aleatorio.entero(0, tipos.length - 1)] = tipos[0] === 'estrella' ? 'roca' : 'estrella';
    }

    this.oleadas += 1;
    columnas.forEach((x, i) => {
      const deConfianza = conConfianza && i === 0;
      const tamano = deConfianza ? propuesto.valor : tamanoNormal;
      this.objetos.push({
        tipo: tipos[i],
        oleada: this.oleadas,
        x,
        y: area.y - tamanoMayor / 2,
        tamano,
        esEnsayoDeConfianza: deConfianza,
        semilla: this.aleatorio.entero(1, 100000),
        resuelto: false,
        roto: false,
        nacidoMs: tiempoMs,
      });
    });
  }

  /** Cierra el ensayo de un objeto: escalera, contador y aviso a la pantalla. */
  private resolver(objeto: Objeto, acierto: boolean, tiempoMs: number): void {
    objeto.resuelto = true;
    // Cada objeto recuerda si nació como ensayo de confianza: aquí se
    // resuelven en el orden en que llegan, no en el que nacieron.
    this.ctx.escaleras[this.clave].record(acierto, objeto.esEnsayoDeConfianza);
    this.contador.registrar(acierto, tiempoMs - objeto.nacidoMs, objeto.esEnsayoDeConfianza);
    this.ctx.onEnsayo({
      juego: 'meteoritos',
      modo: this.ctx.modo,
      parametro: PARAMETRO,
      valor: objeto.tamano,
      acierto,
      tiempoReaccionMs: tiempoMs - objeto.nacidoMs,
      esEnsayoDeConfianza: objeto.esEnsayoDeConfianza,
      detalle: objeto.tipo,
    });
  }

  /**
   * Una oleada llega a la altura de la nave. Las rocas cercanas son un
   * acierto si no la tocan y un fallo si chocan. De las estrellas basta con
   * atrapar una —solo se puede estar en un sitio—: si no se atrapa ninguna,
   * cuenta como fallo la más cercana que pasó junto a la nave.
   */
  private llegaALaNave(oleada: Objeto[], tiempoMs: number): void {
    const anchoNave = this.anchoDeNave();
    const distancia = (o: Objeto) => o.x - this.naveX;
    const cerca = (o: Objeto) => cuentaComoEnsayo(distancia(o), anchoNave);
    const choca = (o: Objeto) => hayChoque(distancia(o), anchoNave, o.tamano);

    const atrapadas = oleada.filter((o) => o.tipo === 'estrella' && choca(o));
    const perdida = atrapadas.length
      ? undefined
      : oleada
          .filter((o) => o.tipo === 'estrella' && cerca(o))
          .sort((a, b) => Math.abs(distancia(a)) - Math.abs(distancia(b)))[0];

    for (const objeto of oleada) {
      if (objeto.tipo === 'estrella') {
        if (atrapadas.includes(objeto)) {
          this.estrellasAtrapadas += 1;
          this.estallar(objeto, tiempoMs);
          this.resolver(objeto, true, tiempoMs);
        } else if (objeto === perdida) {
          this.resolver(objeto, false, tiempoMs);
        } else {
          objeto.resuelto = true;
        }
        continue;
      }
      // Solo las rocas que pasan cerca miden algo.
      if (!cerca(objeto)) {
        objeto.resuelto = true;
        continue;
      }
      const choque = choca(objeto);
      // La nave nunca se destruye: solo baja la energía, que se recarga sola.
      if (choque) this.energia = Math.max(0, this.energia - config.meteoritos.energiaPorChoque);
      this.resolver(objeto, !choque, tiempoMs);
    }
  }

  private moverNave(dt: number, tiempoMs: number, area: ReturnType<typeof areaDeJuego>): void {
    if (this.salto) {
      const avance = Math.min(1, (tiempoMs - this.salto.inicioMs) / config.meteoritos.saltoDuracionMs);
      // Sale rápido y frena al llegar.
      const suave = 1 - (1 - avance) ** 2;
      this.naveX = this.salto.desde + (this.salto.hasta - this.salto.desde) * suave;
      if (avance >= 1) this.salto = null;
      return;
    }
    // Teclado: empieza fino para apuntar y acelera si se mantiene la flecha.
    if (this.teclaIzquierda !== this.teclaDerecha) {
      this.segundosPulsada += dt;
      const paso = velocidadDeTeclado(this.segundosPulsada, area.ancho) * dt;
      this.naveX += this.teclaDerecha ? paso : -paso;
      this.limitarNave();
    } else {
      this.segundosPulsada = 0;
    }
  }

  /** Los disparos suben; el primero que toca un objeto lo rompe. */
  private moverDisparos(dt: number, tiempoMs: number, area: ReturnType<typeof areaDeJuego>): void {
    const m = config.meteoritos;
    const paso = m.disparoVelocidad * area.alto * dt;
    const quedan: Disparo[] = [];
    for (const disparo of this.disparos) {
      const abajoAntes = disparo.y + m.disparoLargoPx;
      disparo.y -= paso;
      const blanco = this.objetos.find(
        (o) => !o.resuelto && disparoAlcanza(disparo.x, disparo.y, abajoAntes, o),
      );
      if (blanco) {
        blanco.roto = true;
        // Romper una roca es acertar; romper una estrella, confundirla.
        this.resolver(blanco, blanco.tipo === 'roca', tiempoMs);
        if (blanco.tipo === 'roca') this.estallar(blanco, tiempoMs);
        continue;
      }
      if (disparo.y + m.disparoLargoPx > area.y) quedan.push(disparo);
    }
    this.disparos = quedan;
  }

  private cuadro(dtMs: number, tiempoMs: number): void {
    if (this.destruido || this.terminado) return;
    this.tiempoMs = tiempoMs;
    const dt = dtMs / 1000;
    const area = areaDeJuego(this.ctx.renderer);

    this.moverNave(dt, tiempoMs, area);

    // Oleadas a su ritmo, sin pasar del tope de objetos en el aire.
    const enElAire = this.objetos.filter((o) => !o.resuelto).length;
    if (tiempoMs >= this.proximaOleadaMs && enElAire + this.nivel.oleada <= this.nivel.enElAire) {
      this.nacerOleada(tiempoMs);
      this.proximaOleadaMs = tiempoMs + this.nivel.intervaloSeg * 1000;
    }

    const naveY = this.naveY();
    const llegan: Objeto[] = [];
    for (const objeto of this.objetos) {
      objeto.y += this.nivel.velocidad * dt;
      if (!objeto.resuelto && objeto.y >= naveY) llegan.push(objeto);
    }
    for (const oleada of new Set(llegan.map((o) => o.oleada))) {
      this.llegaALaNave(llegan.filter((o) => o.oleada === oleada), tiempoMs);
    }

    this.moverDisparos(dt, tiempoMs, area);

    this.objetos = this.objetos.filter((o) => !o.roto && o.y < area.y + area.alto + o.tamano);
    this.energia = Math.min(
      config.meteoritos.energiaMaxima,
      this.energia + config.meteoritos.energiaRecargaPorSeg * dt,
    );

    if (tiempoMs >= config.meteoritos.duracionNivelSeg * 1000) {
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
  // Dibujo
  // -------------------------------------------------------------------------

  private dibujar(tiempoMs: number): void {
    const { renderer } = this.ctx;
    const area = areaDeJuego(renderer);
    renderer.limpiar();

    // Estrellas del fondo, nave y disparos: capa del ojo dominante.
    for (const punto of this.fondo) {
      renderer.rect('ojoDominante', punto.x, punto.y, 1, 1, { tono: renderer.paleta.secundario });
    }
    this.dibujarNave(tiempoMs);
    const { disparoAnchoPx, disparoLargoPx } = config.meteoritos;
    for (const disparo of this.disparos) {
      renderer.rect(
        'ojoDominante',
        disparo.x - disparoAnchoPx / 2,
        disparo.y,
        disparoAnchoPx,
        disparoLargoPx,
        { tono: renderer.paleta.hud },
      );
    }

    // Estrellas de energía y rocas: capa del ojo ambliope, mismo color y tamaño.
    for (const objeto of this.objetos) {
      if (objeto.tipo === 'estrella') this.dibujarEstrella(objeto);
      else this.dibujarRoca(objeto);
    }

    this.dibujarChispas(tiempoMs);

    // Medidor de energía, botón de disparo y HUD: capa de ambos ojos.
    // El medidor va pegado al borde derecho para no chocar con el botón de pausa.
    const anchoMedidor = Math.round(area.ancho * 0.25);
    const xMedidor = area.x + area.ancho - anchoMedidor;
    const yMedidor = area.y + area.alto - 12;
    const lleno = Math.round((this.energia / config.meteoritos.energiaMaxima) * (anchoMedidor - 2));
    renderer.marco('ambos', xMedidor, yMedidor, anchoMedidor, 12, 1);
    renderer.rect('ambos', xMedidor + 1, yMedidor + 1, Math.max(0, lleno), 10);
    dibujarBotonera(renderer, [this.botonDeDisparo()]);

    const restante = Math.max(0, 1 - tiempoMs / (config.meteoritos.duracionNivelSeg * 1000));
    dibujarMarcoYHud(renderer, `${this.estrellasAtrapadas}`, `${Math.ceil(restante * config.meteoritos.duracionNivelSeg)} s`, restante);
  }

  /**
   * Estallido al atrapar una estrella o romper una roca: un anillo de chispas
   * que se abre desde donde estaba el objeto. Va en la capa de ambos ojos,
   * porque es la respuesta al acierto y conviene que la vean los dos; además
   * ocurre cuando el ensayo ya está resuelto, así que no interfiere con la
   * medida.
   */
  private estallar(objeto: Objeto, tiempoMs: number): void {
    const cuantas = config.meteoritos.chispasPorEstrella;
    // Un radio mínimo para que el premio se vea igual de bien cuando la
    // escalera ya bajó a objetos diminutos.
    const radioFinal = Math.max(
      config.meteoritos.chispasRadioMinimoPx,
      objeto.tamano * config.meteoritos.chispasRadioFactor,
    );
    for (let i = 0; i < cuantas; i += 1) {
      this.chispas.push({
        x: objeto.x,
        y: objeto.y,
        angulo: (i / cuantas) * Math.PI * 2,
        radioFinal,
        nacidaMs: tiempoMs,
      });
    }
  }

  /**
   * Las chispas salen hacia fuera y se encogen hasta desaparecer.
   * Se apagan menguando, no atenuando el color: el gris de "ambos ojos" vive
   * dentro de su banda neutra y no se puede oscurecer sin romper la regla.
   */
  private dibujarChispas(tiempoMs: number): void {
    const duracion = config.meteoritos.chispasDuracionMs;
    this.chispas = this.chispas.filter((c) => tiempoMs - c.nacidaMs < duracion);

    for (const chispa of this.chispas) {
      const avance = (tiempoMs - chispa.nacidaMs) / duracion;
      // Sale rápido y frena al final, como una chispa de verdad.
      const radio = chispa.radioFinal * (1 - (1 - avance) ** 2);
      const lado = Math.max(1, Math.round(config.meteoritos.chispasLadoPx * (1 - avance)));
      this.ctx.renderer.rect(
        'ambos',
        chispa.x + Math.cos(chispa.angulo) * radio - lado / 2,
        chispa.y + Math.sin(chispa.angulo) * radio - lado / 2,
        lado,
        lado,
      );
    }
  }

  /**
   * La nave que lleva equipada, con su estela detrás. Capa del ojo dominante.
   * Comprar una nave o una estela se nota aquí: es la mitad del sentido de
   * juntar monedas.
   */
  private dibujarNave(tiempoMs: number): void {
    const { renderer } = this.ctx;
    const { equipo } = this.ctx;
    const ancho = this.anchoDeNave();
    const nave = naveDeJuego(equipo);
    const escala = escalaPara(nave, ancho);
    const suya = medida(nave, escala);
    const x0 = this.naveX - suya.ancho / 2;
    const y0 = this.naveY() - suya.alto / 2;

    // Estela: la forma equipada, repetida hacia atrás y cada vez más pequeña,
    // desplazándose para que parezca que sale de los motores.
    const estela = estelaDeJuego(equipo);
    const spriteDeEstela = spriteDeEquipo(estela, renderer, equipo);
    const paso = Math.max(2, escala * 2);
    const desfase = (tiempoMs / config.meteoritos.estelaMsPorPaso) % 1;

    for (let i = 0; i < config.meteoritos.pasosDeEstela; i += 1) {
      const escalaEstela = Math.max(1, escala - i);
      const suyaEstela = medida(estela, escalaEstela);
      renderer.sprite(
        'ojoDominante',
        spriteDeEstela,
        this.naveX - suyaEstela.ancho / 2,
        y0 + suya.alto + (i + desfase) * paso,
        escalaEstela,
      );
    }

    renderer.sprite('ojoDominante', spriteDeEquipo(nave, renderer, equipo), x0, y0, escala);
  }

  /** Estrella de cuatro puntas. */
  private dibujarEstrella(objeto: Objeto): void {
    const r = objeto.tamano / 2;
    const interno = r * 0.34;
    const puntos: Array<[number, number]> = [];
    for (let i = 0; i < 8; i += 1) {
      const angulo = (i / 8) * Math.PI * 2 - Math.PI / 2;
      const radio = i % 2 === 0 ? r : interno;
      puntos.push([objeto.x + Math.cos(angulo) * radio, objeto.y + Math.sin(angulo) * radio]);
    }
    this.ctx.renderer.poligono('ojoAmbliope', puntos, {
      tono: this.ctx.renderer.paleta.acento,
    });
  }

  /** Roca: polígono irregular con un cráter. Mismo tamaño y brillo que la estrella. */
  private dibujarRoca(objeto: Objeto): void {
    const forma = crearAleatorio(objeto.semilla);
    const r = objeto.tamano / 2;
    const lados = 7;
    const puntos: Array<[number, number]> = [];
    for (let i = 0; i < lados; i += 1) {
      const angulo = (i / lados) * Math.PI * 2;
      const radio = r * (0.75 + forma.siguiente() * 0.25);
      puntos.push([objeto.x + Math.cos(angulo) * radio, objeto.y + Math.sin(angulo) * radio]);
    }
    this.ctx.renderer.poligono('ojoAmbliope', puntos, { tono: this.ctx.renderer.paleta.acento });

    // El cráter se vacía al color del fondo para que se lea como hueco.
    const crater = Math.max(1, Math.round(objeto.tamano * 0.22));
    this.ctx.renderer.borrar(objeto.x - crater / 2, objeto.y - crater / 2, crater, crater);
  }
}

export const meteoritos: Minijuego = {
  id: 'meteoritos',
  modulo: 'ambos',
  escaleras: escalerasDeMeteoritos,
  crear: (canvas, contexto) => new InstanciaDeMeteoritos(canvas, contexto),
};
