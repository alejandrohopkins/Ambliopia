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
}

export function crearLienzoFalso(ancho = 400, alto = 300): LienzoFalso {
  const pintados: string[] = [];
  const asignados: string[] = [];
  let fill = '#000000';
  let stroke = '#000000';

  const lienzo = {
    width: ancho,
    height: alto,
    style: {} as CSSStyleDeclaration,
  };

  const anotar = () => {
    pintados.push(fill);
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
    fillRect: anotar,
    strokeRect: anotar,
    fillText: anotar,
    beginPath: () => {},
    moveTo: () => {},
    lineTo: () => {},
    closePath: () => {},
    fill: anotar,
    stroke: anotar,
    save: () => {},
    restore: () => {},
  } as unknown as CanvasRenderingContext2D;

  return { ctx, pintados, asignados };
}
