/**
 * Tarjeta con lo que se ganó al cerrar el día, que se paga solo al abrir la
 * app: el cofre semanal (se abre al tocarlo y suelta sus monedas), las
 * monedas de la meta, la racha y la misión, los cristales y las insignias
 * nuevas, que se estampan una a una.
 */
import { useEffect, useState, type ReactNode } from 'react';
import { config } from '../../config';
import { audio } from '../../engine/audio';
import { es } from '../../i18n/es';
import { Pixelnauta } from '../../avatar/Pixelnauta';
import type { MapaDePixeles } from '../../avatar/sprites';
import { articulo } from '../../rewards/catalogo';
import type { PremiosPorVer } from '../../storage/esquema';
import { conAnimacion, useCuenta, useSalto } from '../animacion';
import { CristalPixel, LlamaPixel, MonedaPixel } from '../base/Contadores';
import { useMovimientoReducido } from '../movimiento';
import { Miniatura } from './Miniatura';

const COFRE_CERRADO: MapaDePixeles = [
  '..KKKKKKKKKKKK..',
  '.KMMMMMMMMMMMMK.',
  'KMMmMMMMMMMMmMMK',
  'KMMMMMMMMMMMMMMK',
  'KOOOOOOOOOOOOOOK',
  'KOOOOOOYYOOOOOOK',
  'KMMMMMKYYKMMMMMK',
  'KMmMMMMKKMMMMmMK',
  'KMMMMMMMMMMMMMMK',
  'KMMMMMMMMMMMMMMK',
  'KOOOOOOOOOOOOOOK',
  'KmmmmmmmmmmmmmmK',
  '.KKKKKKKKKKKKKK.',
];

const COFRE_ABIERTO: MapaDePixeles = [
  '.KKKKKKKKKKKKKK.',
  'KmmmmmmmmmmmmmmK',
  'KOOOOOOOOOOOOOOK',
  '.KKKKKKKKKKKKKK.',
  'KYOYYOYOYYOYOYYK',
  'KOOOOOOYYOOOOOOK',
  'KMMMMMKYYKMMMMMK',
  'KMmMMMMKKMMMMmMK',
  'KMMMMMMMMMMMMMMK',
  'KMMMMMMMMMMMMMMK',
  'KOOOOOOOOOOOOOOK',
  'KmmmmmmmmmmmmmmK',
  '.KKKKKKKKKKKKKK.',
];

const MEDALLA: MapaDePixeles = [
  'RR.....RR',
  '.RR...RR.',
  '..RR.RR..',
  '...RRR...',
  '..KKKKK..',
  '.KOOOOOK.',
  'KOOOYOOOK',
  'KOOYYYOOK',
  'KOOOYOOOK',
  '.KOOOOOK.',
  '..KKKKK..',
];

const COLORES: Record<string, string> = {
  K: '#1E1638',
  M: '#9A5B2E',
  m: '#6E3F1F',
  O: '#FFC23D',
  Y: '#FFF1B8',
  R: '#E8508A',
};

/** Hacia dónde salta cada moneda del cofre, en px. */
const SALIDA_DE_MONEDAS = [-44, -26, -9, 9, 26, 44];

/** Un número que cuenta desde cero cuando llega su renglón. */
function Cuenta({ hasta, retrasoMs, texto }: { hasta: number; retrasoMs: number; texto: (n: number) => string }) {
  return <>{texto(Math.round(useCuenta(0, hasta, retrasoMs)))}</>;
}

function Renglon({ indice, icono, children }: { indice: number; icono: ReactNode; children: ReactNode }) {
  const { selloMs, entrePremiosMs } = config.animacion;
  return (
    <li
      className="sello"
      style={{
        ...conAnimacion(selloMs, indice * entrePremiosMs),
        display: 'flex',
        gap: 10,
        alignItems: 'center',
        justifyContent: 'center',
        margin: '8px 0',
      }}
    >
      <span aria-hidden>{icono}</span>
      <span>{children}</span>
    </li>
  );
}

export function PremiosDelCierre({ premios, alCerrar }: { premios: PremiosPorVer; alCerrar: () => void }) {
  const sinMovimiento = useMovimientoReducido();
  const hayCofre = premios.cofres.length > 0;
  const [abierto, setAbierto] = useState(!hayCofre);
  const cofre = useSalto<HTMLDivElement>(hayCofre && abierto);
  const { entrePremiosMs } = config.animacion;

  // Los renglones, en el orden en que se estampan.
  const renglones: Array<{ icono: ReactNode; contenido: (retrasoMs: number) => ReactNode; insignia?: boolean }> = [];
  for (const { articulo: id, monedas } of premios.cofres) {
    if (id && articulo(id)) {
      renglones.push({
        icono: <Miniatura articulo={articulo(id)!} alto={64} />,
        contenido: () => es.premiosDelCierre.cofreArticulo(es.articulos[id] ?? id),
      });
    }
    renglones.push({
      icono: <MonedaPixel />,
      contenido: (retraso) => <Cuenta hasta={monedas} retrasoMs={retraso} texto={es.premiosDelCierre.cofreMonedas} />,
    });
  }
  if (premios.monedasPorMeta > 0) {
    renglones.push({
      icono: <MonedaPixel />,
      contenido: (retraso) => (
        <Cuenta hasta={premios.monedasPorMeta} retrasoMs={retraso} texto={es.premiosDelCierre.meta} />
      ),
    });
  }
  if (premios.rachaDespues > premios.rachaAntes) {
    renglones.push({
      icono: <LlamaPixel />,
      contenido: (retraso) => (
        <>
          <RachaQueCrece antes={premios.rachaAntes} despues={premios.rachaDespues} retrasoMs={retraso} />
          {premios.monedasPorRacha > 0 && ` ${es.premiosDelCierre.monedasDeRacha(premios.monedasPorRacha)}`}
        </>
      ),
    });
  }
  if (premios.monedasPorMision > 0) {
    renglones.push({
      icono: <MonedaPixel />,
      contenido: (retraso) => (
        <Cuenta hasta={premios.monedasPorMision} retrasoMs={retraso} texto={es.premiosDelCierre.mision} />
      ),
    });
  }
  if (premios.cristales > 0) {
    renglones.push({
      icono: <CristalPixel />,
      contenido: (retraso) => (
        <Cuenta hasta={premios.cristales} retrasoMs={retraso} texto={es.premiosDelCierre.cristales} />
      ),
    });
  }
  for (const id of premios.insignias) {
    renglones.push({
      icono: <Pixelnauta mapa={MEDALLA} paleta={COLORES} escala={3} etiqueta={es.base.insignias} />,
      contenido: () => es.insigniaNueva(es.insignias[id]?.nombre ?? id),
      insignia: true,
    });
  }

  // Cada renglón suena al estamparse: monedas una vez, y cada insignia la suya.
  useEffect(() => {
    if (!abierto) return;
    const temporizadores: number[] = [];
    const sonar = (efecto: 'monedas' | 'insignia', indice: number) =>
      temporizadores.push(window.setTimeout(() => audio().reproducir(efecto), indice * entrePremiosMs));
    const primeraMoneda = renglones.findIndex((r) => !r.insignia);
    if (primeraMoneda >= 0) sonar('monedas', primeraMoneda);
    renglones.forEach((r, i) => r.insignia && sonar('insignia', i));
    return () => temporizadores.forEach((t) => clearTimeout(t));
    // Suena una vez, al abrirse.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [abierto]);

  function abrir() {
    audio().reproducir('nivel');
    setAbierto(true);
  }

  const titulo = hayCofre ? es.cofre.titulo : es.premiosDelCierre.titulo;
  return (
    <div
      role="dialog"
      aria-modal
      aria-label={titulo}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 10,
        display: 'grid',
        placeItems: 'center',
        padding: 16,
        background: 'rgba(10, 7, 30, 0.92)',
      }}
    >
      <div
        className="panel pixelado aparece"
        style={{
          ...conAnimacion(config.animacion.aparecerMs),
          maxWidth: 560,
          maxHeight: '100%',
          overflowY: 'auto',
          textAlign: 'center',
          borderColor: 'var(--ambar-estelar)',
          borderWidth: 6,
        }}
      >
        {hayCofre && (
          <div ref={cofre} style={{ position: 'relative', display: 'inline-block', marginTop: 8 }}>
            <Pixelnauta
              mapa={abierto ? COFRE_ABIERTO : COFRE_CERRADO}
              paleta={COLORES}
              escala={8}
              etiqueta={es.cofre.titulo}
            />
            {abierto &&
              !sinMovimiento &&
              SALIDA_DE_MONEDAS.map((dx, i) => (
                <span
                  key={dx}
                  aria-hidden
                  className="moneda-sube"
                  style={{
                    ...conAnimacion(config.animacion.cofreMs, i * 40),
                    ['--dx' as string]: `${dx}px`,
                    position: 'absolute',
                    left: '50%',
                    top: 24,
                    marginLeft: -9,
                  }}
                >
                  <MonedaPixel />
                </span>
              ))}
          </div>
        )}
        <h1 style={{ color: 'var(--ambar-estelar)' }}>{titulo}</h1>

        {!abierto ? (
          <>
            <p style={{ fontSize: 22 }}>{es.cofre.texto}</p>
            <button className="pixelado" onClick={abrir} autoFocus>
              {es.cofre.abrir}
            </button>
          </>
        ) : (
          <>
            <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 16px', fontSize: 20 }}>
              {renglones.map((renglon, i) => (
                <Renglon key={i} indice={i} icono={renglon.icono}>
                  {renglon.contenido(i * entrePremiosMs)}
                </Renglon>
              ))}
            </ul>
            <button className="pixelado" onClick={alCerrar} autoFocus>
              {es.premiosDelCierre.listo}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

/** La llama de la racha: el número sube de lo que era a lo que es. */
function RachaQueCrece({ antes, despues, retrasoMs }: { antes: number; despues: number; retrasoMs: number }) {
  return <>{es.premiosDelCierre.racha(Math.round(useCuenta(antes, despues, retrasoMs)))}</>;
}
