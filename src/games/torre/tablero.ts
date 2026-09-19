/**
 * Modelo del tablero, aparte del dibujo para poder probarlo.
 *
 * Como todas las figuras se construyen por gravedad, el tablero queda descrito
 * por la altura de cada columna: lo lleno es siempre continuo desde abajo.
 */
export interface EstadoDeTablero {
  /** Altura objetivo de cada columna (la figura). */
  plano: number[];
  /** Altura construida de cada columna. Puede exceder el plano un instante. */
  alturas: number[];
}

export interface ResultadoDeColocacion {
  alturas: number[];
  /** Todos los bloques cayeron dentro del plano. */
  acierto: boolean;
  /** Bloques que quedaron fuera y se desmoronarán. */
  sobran: number;
  /** Altura desde la que se apilaron los bloques nuevos. */
  desde: number;
}

export function tableroVacio(plano: number[]): EstadoDeTablero {
  return { plano, alturas: plano.map(() => 0) };
}

/** Deja caer una pieza de N bloques en una columna. */
export function colocar(
  estado: EstadoDeTablero,
  columna: number,
  bloques: number,
): ResultadoDeColocacion {
  const desde = estado.alturas[columna];
  const total = desde + bloques;
  const objetivo = estado.plano[columna];
  const sobran = Math.max(0, total - objetivo);
  const alturas = [...estado.alturas];
  alturas[columna] = total;
  return { alturas, acierto: sobran === 0, sobran, desde };
}

/** Los bloques que quedaron fuera del plano se deshacen en polvo. */
export function desmoronar(estado: EstadoDeTablero): number[] {
  return estado.alturas.map((altura, columna) => Math.min(altura, estado.plano[columna]));
}

export function figuraCompleta(estado: EstadoDeTablero): boolean {
  return estado.alturas.every((altura, columna) => altura === estado.plano[columna]);
}

/** Columnas que todavía necesitan bloques. */
export function columnasPendientes(estado: EstadoDeTablero): number[] {
  const pendientes: number[] = [];
  estado.alturas.forEach((altura, columna) => {
    if (altura < estado.plano[columna]) pendientes.push(columna);
  });
  return pendientes;
}

/** Un bloque a esta altura de esta columna, ¿cae dentro del plano? */
export function dentroDelPlano(estado: EstadoDeTablero, columna: number, altura: number): boolean {
  return altura < estado.plano[columna];
}

export function bloquesRestantes(estado: EstadoDeTablero): number {
  return estado.plano.reduce(
    (total, objetivo, columna) => total + Math.max(0, objetivo - estado.alturas[columna]),
    0,
  );
}

/** Tamaños de pieza posibles en un mundo, recortados a lo que aún cabe. */
export function tamanosDePieza(
  posibles: number[],
  estado: EstadoDeTablero,
): number[] {
  const mayorHueco = Math.max(
    0,
    ...estado.plano.map((objetivo, columna) => objetivo - estado.alturas[columna]),
  );
  const caben = posibles.filter((n) => n <= mayorHueco);
  // Si ya no cabe ni la pieza más pequeña, se sigue con la de un bloque.
  return caben.length > 0 ? caben : [Math.min(...posibles)];
}
