/**
 * Lienzo 2D falso que anota todos los colores usados.
 * Sirve para comprobar que el renderer en modo lentes nunca produce
 * un color fuera de los cuatro permitidos.
 */
export interface LienzoFalso {
  ctx: CanvasRenderingContext2D;
  /** Colores realmente usados para pintar, en orden. */
  pintados: string[];
  /** Todos los colores asignados a fillStyle/strokeStyle. */
  asignados: string[];
  /** Nombres de los métodos de dibujo usados, en orden. */
  llamadas: string[];
  /** Rectángulos pintados: [x, y, ancho, alto]. */
  rectangulos: Array<[number, number, number, number]>;
}

export function crearLienzoFalso(ancho = 400, alto = 300): LienzoFalso {
  const pintados: string[] = [];
  const asignados: string[] = [];
  const llamadas: string[] = [];
  const rectangulos: Array<[number, number, number, number]> = [];
  let fill = '#000000';
  let stroke = '#000000';

  const lienzo = {
    width: ancho,
    height: alto,
    style: {} as CSSStyleDeclaration,
  };

  const anotar = (nombre: string) => () => {
    pintados.push(fill);
    llamadas.push(nombre);
  };

  const ctx = {
    canvas: lienzo,
    imageSmoothingEnabled: true,
    font: '',
    textAlign: 'left' as CanvasTextAlign,
    textBaseline: 'alphabetic' as CanvasTextBaseline,
    get fillStyle() {
      return fill;
    },
    set fillStyle(valor: string) {
      fill = valor;
      asignados.push(valor);
    },
    get strokeStyle() {
      return stroke;
    },
    set strokeStyle(valor: string) {
      stroke = valor;
      asignados.push(valor);
    },
    setTransform: () => {},
    fillRect: (x: number, y: number, ancho: number, alto: number) => {
      pintados.push(fill);
      llamadas.push('fillRect');
      rectangulos.push([x, y, ancho, alto]);
    },
    strokeRect: anotar('strokeRect'),
    // Una imagen no tiene un color de relleno: se anota solo la llamada.
    drawImage: () => {
      llamadas.push('drawImage');
    },
    fillText: anotar('fillText'),
    beginPath: () => {},
    moveTo: () => {},
    lineTo: () => {},
    closePath: () => {},
    fill: anotar('fill'),
    stroke: anotar('stroke'),
    save: () => {},
    restore: () => {},
  } as unknown as CanvasRenderingContext2D;

  return { ctx, pintados, asignados, llamadas, rectangulos };
}
