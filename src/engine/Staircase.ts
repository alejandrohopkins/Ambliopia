/**
 * Escalera adaptativa n-abajo / 1-arriba en escala logarítmica: n aciertos
 * seguidos la endurecen y un fallo la facilita. Se asienta donde se acierta
 * 0,5^(1/n) —el 79 % con los tres de la configuración—: la tarea exige de
 * verdad sin desmoralizar.
 *
 * Solo sirve para parámetros donde MENOR = MÁS DIFÍCIL (tamaño y contraste).
 * La velocidad la controlan los niveles, nunca la escalera.
 */
import { config } from '../config';
import { crearAleatorio, type Aleatorio } from './rng';
import type { EstadoEscalera } from '../storage/esquema';

export interface ConfigDeEscalera {
  /** 'juego:modo:parametro' y, en Saboteador, ':espaciado'. */
  clave: string;
  valorInicial: number;
  minimo: number;
  maximo: number;
  aleatorio?: Aleatorio;
}

export interface EnsayoPropuesto {
  valor: number;
  esEnsayoDeConfianza: boolean;
}

export class Staircase {
  readonly clave: string;
  readonly minimo: number;
  readonly maximo: number;

  private valor: number;
  private aciertosSeguidos = 0;
  private ultimaDireccion: -1 | 0 | 1 = 0;
  private historial: number[] = [];
  private ensayos = 0;
  private proximoEnsayoDeConfianza: number;
  private enCursoEsDeConfianza = false;
  private readonly aleatorio: Aleatorio;

  /** Valores en los que la escalera cambió de sentido. */
  reversals: number[] = [];

  constructor(configuracion: ConfigDeEscalera) {
    this.clave = configuracion.clave;
    this.minimo = configuracion.minimo;
    this.maximo = configuracion.maximo;
    this.aleatorio = configuracion.aleatorio ?? crearAleatorio(configuracion.clave);
    this.valor = this.limitar(configuracion.valorInicial);
    this.proximoEnsayoDeConfianza = this.sortearProximaConfianza(0);
  }

  // -------------------------------------------------------------------------
  // Contrato
  // -------------------------------------------------------------------------

  /** Valor actual de la escalera, sin contar los ensayos de confianza. */
  current(): number {
    return this.valor;
  }

  /**
   * Marca el ensayo que va a presentarse y devuelve su valor.
   * Un ensayo de confianza se muestra a 2.5 × el valor actual y no mueve la
   * escalera: está para mantener la motivación, no para medir.
   */
  proximoEnsayo(): EnsayoPropuesto {
    this.enCursoEsDeConfianza = this.ensayos === this.proximoEnsayoDeConfianza;
    const valor = this.enCursoEsDeConfianza
      ? this.limitar(this.valor * config.escalera.factorEnsayoDeConfianza)
      : this.valor;
    return { valor, esEnsayoDeConfianza: this.enCursoEsDeConfianza };
  }

  /**
   * Registra el ensayo en curso. Tiempo agotado cuenta como fallo.
   *
   * `fueDeConfianza` solo hace falta en los juegos donde varios estímulos
   * están en el aire a la vez y no se resuelven en el orden en que nacieron
   * (Meteoritos): ahí cada objeto recuerda su propia condición.
   */
  record(correct: boolean, fueDeConfianza?: boolean): void {
    this.ensayos += 1;
    const deConfianza = fueDeConfianza ?? this.enCursoEsDeConfianza;

    if (deConfianza) {
      this.enCursoEsDeConfianza = false;
      this.proximoEnsayoDeConfianza = this.sortearProximaConfianza(this.ensayos);
      return;
    }

    this.historial.push(this.valor);
    const fino = this.reversals.length >= config.escalera.inversionesParaPasoFino;

    if (correct) {
      this.aciertosSeguidos += 1;
      if (this.aciertosSeguidos < config.escalera.aciertosParaBajar) return;
      this.aciertosSeguidos = 0;
      this.mover(-1, fino ? config.escalera.factorFinoMasDificil : config.escalera.factorMasDificil);
    } else {
      this.aciertosSeguidos = 0;
      this.mover(1, fino ? config.escalera.factorFinoMasFacil : config.escalera.factorMasFacil);
    }
  }

  /**
   * Umbral estimado: media geométrica de las últimas inversiones.
   * Con pocas inversiones todavía, de los últimos valores presentados.
   */
  threshold(): number {
    if (this.reversals.length >= config.escalera.inversionesParaUmbral) {
      return mediaGeometrica(this.reversals.slice(-config.escalera.inversionesParaUmbral));
    }
    if (this.reversals.length > 0) return mediaGeometrica(this.reversals);
    const ultimos = this.historial.slice(-config.escalera.valoresDeRespaldo);
    return ultimos.length > 0 ? mediaGeometrica(ultimos) : this.valor;
  }

  toJSON(): EstadoEscalera {
    return {
      valor: this.valor,
      minimo: this.minimo,
      maximo: this.maximo,
      aciertosSeguidos: this.aciertosSeguidos,
      ultimaDireccion: this.ultimaDireccion,
      inversiones: [...this.reversals],
      historial: [...this.historial],
      ensayos: this.ensayos,
      proximoEnsayoDeConfianza: this.proximoEnsayoDeConfianza,
    };
  }

  static fromJSON(guardado: EstadoEscalera, configuracion: ConfigDeEscalera): Staircase {
    const escalera = new Staircase({ ...configuracion, valorInicial: guardado.valor });
    escalera.aciertosSeguidos = guardado.aciertosSeguidos;
    escalera.ultimaDireccion = guardado.ultimaDireccion;
    escalera.reversals = [...guardado.inversiones];
    escalera.historial = [...guardado.historial];
    escalera.ensayos = guardado.ensayos;
    escalera.proximoEnsayoDeConfianza = guardado.proximoEnsayoDeConfianza;
    return escalera;
  }

  /**
   * Continuidad entre sesiones: la escalera arranca en el umbral guardado
   * multiplicado por el factor de calentamiento, más fácil, para entrar en
   * calor. El historial de inversiones se conserva: así el umbral estimado es
   * útil desde el primer ensayo y se renueva solo a medida que llegan
   * inversiones nuevas.
   */
  static continuar(
    guardado: EstadoEscalera | undefined,
    configuracion: ConfigDeEscalera,
  ): Staircase {
    if (!guardado) return new Staircase(configuracion);
    const previa = Staircase.fromJSON(guardado, configuracion);
    const escalera = new Staircase({
      ...configuracion,
      valorInicial: previa.threshold() * config.escalera.factorCalentamiento,
    });
    escalera.reversals = [...previa.reversals];
    escalera.historial = [...previa.historial];
    return escalera;
  }

  // -------------------------------------------------------------------------

  get numeroDeEnsayos(): number {
    return this.ensayos;
  }

  get inversiones(): number {
    return this.reversals.length;
  }

  private mover(direccion: -1 | 1, factor: number): void {
    if (this.ultimaDireccion !== 0 && direccion !== this.ultimaDireccion) {
      this.reversals.push(this.valor);
    }
    this.ultimaDireccion = direccion;
    this.valor = this.limitar(this.valor * factor);
  }

  private limitar(valor: number): number {
    return Math.max(this.minimo, Math.min(this.maximo, valor));
  }

  private sortearProximaConfianza(desde: number): number {
    return (
      desde + this.aleatorio.entero(config.escalera.confianzaCadaMin, config.escalera.confianzaCadaMax)
    );
  }
}

/** Media geométrica: la que corresponde a una escalera logarítmica. */
export function mediaGeometrica(valores: number[]): number {
  const positivos = valores.filter((v) => v > 0);
  if (positivos.length === 0) return 0;
  const suma = positivos.reduce((total, v) => total + Math.log(v), 0);
  return Math.exp(suma / positivos.length);
}

export function mediana(valores: number[]): number {
  if (valores.length === 0) return 0;
  const orden = [...valores].sort((a, b) => a - b);
  const medio = Math.floor(orden.length / 2);
  return orden.length % 2 === 1 ? orden[medio] : (orden[medio - 1] + orden[medio]) / 2;
}
