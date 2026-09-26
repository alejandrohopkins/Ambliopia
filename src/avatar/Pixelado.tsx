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

/** Pinta en `lienzo` el SVG de `fuente` pixelado, cada vez que el SVG cambia. */
function usarPixelArt(
  fuente: RefObject<SVGSVGElement>,
  lienzo: RefObject<HTMLCanvasElement>,
  prefijo: string,
  paleta: Paleta,
) {
  const pintado = useRef('');
  useEffect(() => {
    const svg = fuente.current;
    const destino = lienzo.current;
    if (!svg || !destino) return;
    // Sin el identificador de este componente, dos dibujos iguales son el mismo texto.
    const texto = new XMLSerializer().serializeToString(svg).split(prefijo).join('d');
    if (texto === pintado.current) return;
    let vigente = true;
    pixelArt(texto, destino.width, destino.height, paleta).then(
      (hecho) => {
        const ctx = destino.getContext('2d');
        if (!vigente || !ctx) return;
        ctx.clearRect(0, 0, destino.width, destino.height);
        ctx.drawImage(hecho, 0, 0);
        pintado.current = texto;
      },
      () => {},
    );
    return () => {
      vigente = false;
    };
  });
}

function usarPrefijo(): string {
  return `pix${useId().replace(/[^a-zA-Z0-9]/g, '')}_`;
}

/**
 * Un dibujo pixelado de `alto` px de alto, con sus colores exactos. Lo que
 * sobresale de su caja (`desborde`) se ve, pero no ocupa sitio en la página.
 */
export function Pixelado({
  dibujo,
  vista,
  desborde,
  alto,
  tamano,
  contorno,
  etiqueta,
  respira = false,
}: {
  dibujo: Dibujo;
  /** Caja del dibujo, en unidades del SVG (viewBox 0 0 ancho alto). */
  vista: { ancho: number; alto: number };
  desborde: Desborde;
  alto: number;
  /** Px de pantalla por píxel del dibujo, para igualarlo con otro que va al lado. */
  tamano?: number;
  /** Color del contorno (#RRGGBB): no se pierde aunque sea fino. */
  contorno?: string;
  etiqueta: string;
  /** Sube un píxel y baja, despacio. */
  respira?: boolean;
}) {
  const prefijo = usarPrefijo();
  const fuente = useRef<SVGSVGElement>(null);
  const lienzo = useRef<HTMLCanvasElement>(null);
  usarPixelArt(fuente, lienzo, prefijo, { contorno });
  const rejilla = rejillaDeDibujo(vista, desborde, alto, tamano);
  const respiracion = {
    '--pixel': `${rejilla.tamano}px`,
    animationDuration: `${config.avatar.respiracionMs * 2}ms`,
  } as CSSProperties;

  return (
    <>
      <span aria-hidden style={OCULTO}>
        <svg ref={fuente} viewBox={rejilla.caja} width={rejilla.columnas} height={rejilla.filas}>
          {dibujo(prefijo)}
        </svg>
      </span>
      <canvas
        ref={lienzo}
        width={rejilla.columnas}
        height={rejilla.filas}
        role="img"
        aria-label={etiqueta}
        className={respira ? 'respira' : undefined}
        style={{
          ...PIXELADO,
          ...(respira ? respiracion : null),
          width: rejilla.columnas * rejilla.tamano,
          height: rejilla.filas * rejilla.tamano,
          margin: rejilla.margen,
        }}
      />
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
  usarPixelArt(fuente, lienzo, prefijo, null);

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
