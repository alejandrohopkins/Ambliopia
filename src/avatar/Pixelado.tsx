/**
 * Muestra un dibujo vectorial en pixel art (ver pixelar.ts). El SVG se monta
 * oculto, se lee, se rasteriza en un lienzo pequeño y el lienzo se amplía sin
 * suavizar. Si cambia lo dibujado (sin cambiar de tamaño), se sigue viendo lo
 * anterior hasta que lo nuevo está listo: no queda un hueco en blanco.
 */
import {
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
  type RefObject,
} from 'react';
import { config } from '../config';
import { useMovimientoReducido } from '../ui/movimiento';
import {
  ajustarAPaleta,
  coloresDelDibujo,
  reducirPorBloques,
  rejillaDeDibujo,
  rgb,
  type Desborde,
} from './pixelar';

/** Lo que va dentro del SVG. Recibe el prefijo para sus identificadores (degradados). */
export type Dibujo = (prefijo: string) => ReactNode;

/** El SVG de origen está para poder leerlo: no ocupa sitio ni se ve. */
const OCULTO: CSSProperties = { position: 'absolute', width: 0, height: 0, overflow: 'hidden' };

const PIXELADO: CSSProperties = { imageRendering: 'pixelated' };

/**
 * Cómo pixelar: `null` deja los colores como salen (fondos); si no, cada
 * píxel toma un color del dibujo, y `contorno` gana aunque ocupe menos.
 */
type Paleta = { contorno?: string } | null;

/** Los últimos dibujos ya pixelados: dos avatares iguales comparten el trabajo. */
const hechos = new Map<string, Promise<HTMLCanvasElement>>();

function pixelArt(svg: string, ancho: number, alto: number, paleta: Paleta) {
  const clave = JSON.stringify(paleta) + svg;
  let hecho = hechos.get(clave);
  if (!hecho) {
    hecho = rasterizar(svg, ancho, alto, paleta);
    hechos.set(clave, hecho);
    hecho.catch(() => hechos.delete(clave));
    if (hechos.size > config.avatar.pixelado.recuerdo) hechos.delete(hechos.keys().next().value!);
  }
  return hecho;
}

async function rasterizar(svg: string, ancho: number, alto: number, paleta: Paleta) {
  const imagen = new Image();
  await new Promise((listo, fallo) => {
    imagen.onload = listo;
    imagen.onerror = fallo;
    imagen.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  });
  const lienzo = document.createElement('canvas');
  lienzo.width = ancho;
  lienzo.height = alto;
  const ctx = lienzo.getContext('2d');
  if (!ctx) return lienzo;
  if (!paleta) {
    ctx.drawImage(imagen, 0, 0, ancho, alto);
    return lienzo;
  }
  const escala = config.avatar.pixelado.superMuestreo;
  const fino = document.createElement('canvas');
  fino.width = ancho * escala;
  fino.height = alto * escala;
  const ctxFino = fino.getContext('2d');
  if (!ctxFino) return lienzo;
  ctxFino.drawImage(imagen, 0, 0, fino.width, fino.height);
  try {
    const puntos = ctxFino.getImageData(0, 0, fino.width, fino.height).data;
    ajustarAPaleta(puntos, coloresDelDibujo(svg));
    const contorno = paleta.contorno ? rgb(paleta.contorno) : undefined;
    const pixeles = ctx.createImageData(ancho, alto);
    pixeles.data.set(reducirPorBloques(puntos, fino.width, escala, contorno));
    ctx.putImageData(pixeles, 0, 0);
  } catch {
    // Si el navegador no deja leer el lienzo, el dibujo se queda con los bordes suaves.
    ctx.drawImage(fino, 0, 0, ancho, alto);
  }
  return lienzo;
}

/**
 * Pinta en `lienzo` el SVG de `fuente` pixelado, cada vez que el SVG cambia.
 * Con `barrido`, un dibujo nuevo sobre uno anterior del mismo tamaño baja a
 * saltos de arriba abajo, como quien se cambia de ropa.
 */
function usarPixelArt(
  fuente: RefObject<SVGSVGElement>,
  lienzo: RefObject<HTMLCanvasElement>,
  prefijo: string,
  paleta: Paleta,
  barrido: boolean,
) {
  const nada = { texto: '', ancho: 0, alto: 0, cancelar: () => {} };
  const actual = useRef(nada);

  useEffect(
    () => () => {
      actual.current.cancelar();
      actual.current = nada;
    },
    // Solo al desmontar.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  useEffect(() => {
    const svg = fuente.current;
    const destino = lienzo.current;
    if (!svg || !destino) return;
    // Sin el identificador de este componente, dos dibujos iguales son el mismo texto.
    const texto = new XMLSerializer().serializeToString(svg).split(prefijo).join('d');
    const { width: ancho, height: alto } = destino;
    const antes = actual.current;
    if (texto === antes.texto && ancho === antes.ancho && alto === antes.alto) return;

    antes.cancelar();
    const conBarrido = barrido && antes.texto !== '' && antes.ancho === ancho && antes.alto === alto;
    let vigente = true;
    let cuadro = 0;
    let pintar: ((filas: number) => void) | null = null;
    actual.current = {
      texto,
      ancho,
      alto,
      // Si llega otro dibujo a mitad del barrido, este se termina de golpe.
      cancelar: () => {
        vigente = false;
        cancelAnimationFrame(cuadro);
        pintar?.(alto);
      },
    };

    pixelArt(texto, ancho, alto, paleta).then(
      (hecho) => {
        const ctx = destino.getContext('2d');
        if (!vigente || !ctx) return;
        pintar = (filas) => {
          if (filas <= 0) return;
          ctx.clearRect(0, 0, ancho, filas);
          ctx.drawImage(hecho, 0, 0, ancho, filas, 0, 0, ancho, filas);
        };
        if (!conBarrido) {
          pintar(alto);
          return;
        }
        const { barridoMs, pasosDeBarrido } = config.animacion;
        const inicio = performance.now();
        const paso = (ahora: number) => {
          const t = Math.min(1, (ahora - inicio) / barridoMs);
          pintar?.(Math.round((Math.floor(t * pasosDeBarrido) / pasosDeBarrido) * alto));
          if (t < 1) cuadro = requestAnimationFrame(paso);
        };
        cuadro = requestAnimationFrame(paso);
      },
      () => {},
    );
  });
}

function usarPrefijo(): string {
  return `pix${useId().replace(/[^a-zA-Z0-9]/g, '')}_`;
}

/** Un segundo cuadro que asoma de vez en cuando: ojos cerrados, mirar al otro lado. */
export interface Alterno {
  dibujo: Dibujo;
  /** Clase de la hoja base que decide cuándo se ve ('parpadea', 'mira'). */
  clase: string;
  cicloMs: number;
}

/**
 * Un dibujo pixelado de `alto` px de alto, con sus colores exactos. Lo que
 * sobresale de su caja (`desborde`) se ve, pero no ocupa sitio en la página.
 */
export function Pixelado({
  dibujo,
  alterno,
  vista,
  desborde,
  alto,
  tamano,
  contorno,
  etiqueta,
  respira = false,
  respiracionMs = config.avatar.respiracionMs,
}: {
  dibujo: Dibujo;
  alterno?: Alterno;
  /** Caja del dibujo, en unidades del SVG (viewBox 0 0 ancho alto). */
  vista: { ancho: number; alto: number };
  desborde: Desborde;
  alto: number;
  /** Px de pantalla por píxel del dibujo, para igualarlo con otro que va al lado. */
  tamano?: number;
  /** Color del contorno (#RRGGBB): no se pierde aunque sea fino. */
  contorno?: string;
  etiqueta: string;
  /** Sube un píxel y baja, despacio: `respiracionMs` cada tramo. */
  respira?: boolean;
  respiracionMs?: number;
}) {
  const sinMovimiento = useMovimientoReducido();
  const prefijo = usarPrefijo();
  const fuente = useRef<SVGSVGElement>(null);
  const lienzo = useRef<HTMLCanvasElement>(null);
  const fuenteAlterna = useRef<SVGSVGElement>(null);
  const lienzoAlterno = useRef<HTMLCanvasElement>(null);
  usarPixelArt(fuente, lienzo, prefijo, { contorno }, !sinMovimiento);
  usarPixelArt(fuenteAlterna, lienzoAlterno, `${prefijo}b`, { contorno }, false);
  const rejilla = rejillaDeDibujo(vista, desborde, alto, tamano);
  const medidas: CSSProperties = {
    width: rejilla.columnas * rejilla.tamano,
    height: rejilla.filas * rejilla.tamano,
  };
  const respiracion = {
    '--pixel': `${rejilla.tamano}px`,
    animationDuration: `${respiracionMs * 2}ms`,
  } as CSSProperties;

  return (
    <>
      <span aria-hidden style={OCULTO}>
        <svg ref={fuente} viewBox={rejilla.caja} width={rejilla.columnas} height={rejilla.filas}>
          {dibujo(prefijo)}
        </svg>
        {alterno && (
          <svg ref={fuenteAlterna} viewBox={rejilla.caja} width={rejilla.columnas} height={rejilla.filas}>
            {alterno.dibujo(`${prefijo}b`)}
          </svg>
        )}
      </span>
      <span
        role="img"
        aria-label={etiqueta}
        className={respira ? 'respira' : undefined}
        style={{
          ...(respira ? respiracion : null),
          position: 'relative',
          display: 'inline-block',
          lineHeight: 0,
          margin: rejilla.margen,
        }}
      >
        <canvas
          ref={lienzo}
          width={rejilla.columnas}
          height={rejilla.filas}
          style={{ ...PIXELADO, ...medidas, display: 'block' }}
        />
        {alterno && (
          <canvas
            ref={lienzoAlterno}
            width={rejilla.columnas}
            height={rejilla.filas}
            className={alterno.clase}
            style={{
              ...PIXELADO,
              ...medidas,
              animationDuration: `${alterno.cicloMs}ms`,
              position: 'absolute',
              left: 0,
              top: 0,
            }}
          />
        )}
      </span>
    </>
  );
}

/**
 * Un dibujo pixelado que llena su contenedor (posicionado) y recorta lo que
 * sobra, como un fondo. Aquí los colores se quedan como salen: los
 * degradados del cielo siguen siendo suaves.
 */
export function FondoPixelado({
  dibujo,
  vista,
}: {
  dibujo: Dibujo;
  vista: { ancho: number; alto: number };
}) {
  const prefijo = usarPrefijo();
  const caja = useRef<HTMLDivElement>(null);
  const fuente = useRef<SVGSVGElement>(null);
  const lienzo = useRef<HTMLCanvasElement>(null);
  const [medida, setMedida] = useState({ ancho: 0, alto: 0 });
  usarPixelArt(fuente, lienzo, prefijo, null, !useMovimientoReducido());

  useLayoutEffect(() => {
    const elemento = caja.current;
    if (!elemento) return;
    const medir = () =>
      setMedida((antes) =>
        antes.ancho === elemento.clientWidth && antes.alto === elemento.clientHeight
          ? antes
          : { ancho: elemento.clientWidth, alto: elemento.clientHeight },
      );
    medir();
    const observador = new ResizeObserver(medir);
    observador.observe(elemento);
    return () => observador.disconnect();
  }, []);

  const tamano = config.avatar.pixelado.tamanoDelFondo;
  const columnas = Math.ceil(medida.ancho / tamano);
  const filas = Math.ceil(medida.alto / tamano);

  return (
    <div ref={caja} aria-hidden style={{ position: 'absolute', inset: 0, overflow: 'hidden' }}>
      {columnas > 0 && filas > 0 && (
        <>
          <span style={OCULTO}>
            <svg
              ref={fuente}
              viewBox={`0 0 ${vista.ancho} ${vista.alto}`}
              preserveAspectRatio="xMidYMid slice"
              width={columnas}
              height={filas}
            >
              {dibujo(prefijo)}
            </svg>
          </span>
          <canvas
            ref={lienzo}
            width={columnas}
            height={filas}
            style={{ ...PIXELADO, display: 'block', width: columnas * tamano, height: filas * tamano }}
          />
        </>
      )}
    </div>
  );
}
