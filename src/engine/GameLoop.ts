/**
 * Bucle de juego con requestAnimationFrame, pausa y reanudación.
 * Al reanudar (o al volver de segundo plano) el salto de tiempo se recorta:
 * nada debe moverse de golpe porque la pestaña estuvo escondida.
 */
const SALTO_MAXIMO_MS = 100;

export type PasoDeBucle = (dtMs: number, tiempoTotalMs: number) => void;

export class GameLoop {
  private id: number | null = null;
  private ultimo = 0;
  private acumulado = 0;
  private pausado = false;
  private muestrasDeFps: number[] = [];

  constructor(private readonly paso: PasoDeBucle) {}

  get corriendo(): boolean {
    return this.id !== null;
  }

  get enPausa(): boolean {
    return this.pausado;
  }

  get tiempoMs(): number {
    return this.acumulado;
  }

  /** Media de los últimos cuadros, para el overlay de desarrollo. */
  get fps(): number {
    if (this.muestrasDeFps.length === 0) return 0;
    const media = this.muestrasDeFps.reduce((a, b) => a + b, 0) / this.muestrasDeFps.length;
    return media > 0 ? 1000 / media : 0;
  }

  iniciar(): void {
    if (this.id !== null) return;
    this.pausado = false;
    this.ultimo = performance.now();
    this.id = requestAnimationFrame(this.cuadro);
  }

  pausar(): void {
    this.pausado = true;
  }

  reanudar(): void {
    if (!this.pausado) return;
    this.pausado = false;
    this.ultimo = performance.now();
  }

  detener(): void {
    if (this.id !== null) cancelAnimationFrame(this.id);
    this.id = null;
    this.pausado = false;
    this.muestrasDeFps = [];
  }

  private cuadro = (ahora: number): void => {
    this.id = requestAnimationFrame(this.cuadro);
    const bruto = ahora - this.ultimo;
    this.ultimo = ahora;
    if (this.pausado) return;

    const dt = Math.min(bruto, SALTO_MAXIMO_MS);
    this.acumulado += dt;

    this.muestrasDeFps.push(bruto);
    if (this.muestrasDeFps.length > 30) this.muestrasDeFps.shift();

    this.paso(dt, this.acumulado);
  };
}
