/**
 * Gráficas por juego y modo. Cada una lleva debajo una frase corta de cómo
 * leerla: las métricas son estimaciones del juego, no medidas clínicas.
 */
import { useState } from 'react';
import type { IdJuego, Modo } from '../../config';
import { es } from '../../i18n/es';
import { useEstado } from '../../storage/contexto';
import { JUEGOS } from '../../storage/esquema';
import {
  esParametroDeTamano,
  medianaMovil,
  medidasDeUmbral,
  mejoraVsPrimeraSemana,
  parametrosConDatos,
  serieDeBalance,
  serieDePrecision,
  serieDeTiempoDeReaccion,
  serieDeUmbral,
} from '../../storage/analisis';
import { GraficaDeLinea, type Marca } from './GraficaDeLinea';

const MODOS: Modo[] = ['parche', 'lentes'];

export function Graficas() {
  const { estado } = useEstado();
  const [modo, setModo] = useState<Modo>('parche');

  // Marcas del eje X: cambios de contraste y notas del adulto.
  const marcas: Marca[] = [
    ...estado.balance.historial.map((e) => ({
      dia: e.fecha,
      etiqueta: `${es.adultos.configuracion.balanceManual}: ${e.valor.toFixed(2)}`,
    })),
    ...estado.notas.map((n) => ({ dia: n.fecha, etiqueta: n.texto })),
  ];

  const balance = serieDeBalance(estado);

  return (
    <section>
      <nav style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        {MODOS.map((m) => (
          <button
            key={m}
            className={modo === m ? 'pixelado' : 'pixelado secundario'}
            aria-pressed={modo === m}
            onClick={() => setModo(m)}
          >
            {es.nombreDeModo(m)}
          </button>
        ))}
      </nav>

      {modo === 'lentes' && balance.length > 1 && (
        <Bloque titulo={es.adultos.configuracion.balanceManual} comoLeer={es.adultos.comoLeer.balance}>
          <GraficaDeLinea
            serie={balance}
            etiqueta={es.adultos.configuracion.balanceManual}
            formatoY={(v) => v.toFixed(2)}
          />
        </Bloque>
      )}

      {JUEGOS.map((juego) => (
        <GraficasDeJuego key={juego} juego={juego} modo={modo} marcas={marcas} />
      ))}
    </section>
  );
}

function GraficasDeJuego({
  juego,
  modo,
  marcas,
}: {
  juego: IdJuego;
  modo: Modo;
  marcas: Marca[];
}) {
  const { estado } = useEstado();
  const parametros = parametrosConDatos(estado, juego, modo);
  const precision = serieDePrecision(estado, juego, modo);
  const tiempo = serieDeTiempoDeReaccion(estado, juego, modo);

  if (parametros.length === 0 && precision.length === 0) return null;

  return (
    <>
      {parametros.map((parametro) => {
        const serie = serieDeUmbral(estado, juego, modo, parametro);
        if (serie.length < 2) return null;
        const deTamano = esParametroDeTamano(parametro);
        const mejora = mejoraVsPrimeraSemana(serie);

        return (
          <Bloque
            key={parametro}
            titulo={es.adultos.graficaDe(es.juegos[juego], es.nombreDeParametro(parametro))}
            comoLeer={deTamano ? es.adultos.comoLeer.umbralTamano : es.adultos.comoLeer.umbralContraste}
            mejora={mejora}
          >
            <GraficaDeLinea
              serie={serie}
              suavizada={medianaMovil(serie, 7)}
              marcas={marcas}
              logaritmica
              etiqueta={es.adultos.graficaDe(es.juegos[juego], es.nombreDeParametro(parametro))}
              formatoY={(v) =>
                deTamano ? `${medidasDeUmbral(estado, v).mm.toFixed(2)} mm` : v.toFixed(2)
              }
            />
          </Bloque>
        );
      })}

      {precision.length >= 2 && (
        <Bloque
          titulo={`${es.juegos[juego]} · ${es.adultos.comoLeer.precision.split(':')[0]}`}
          comoLeer={es.adultos.comoLeer.precision}
        >
          <GraficaDeLinea
            serie={precision}
            suavizada={medianaMovil(precision, 7)}
            etiqueta={es.juegos[juego]}
            formatoY={(v) => `${Math.round(v * 100)} %`}
          />
        </Bloque>
      )}

      {tiempo.length >= 2 && (
        <Bloque
          titulo={`${es.juegos[juego]} · ${es.adultos.comoLeer.tiempo.split(':')[0]}`}
          comoLeer={es.adultos.comoLeer.tiempo}
        >
          <GraficaDeLinea
            serie={tiempo}
            suavizada={medianaMovil(tiempo, 7)}
            etiqueta={es.juegos[juego]}
            formatoY={(v) => `${Math.round(v)} ms`}
          />
        </Bloque>
      )}
    </>
  );
}

function Bloque({
  titulo,
  comoLeer,
  mejora,
  children,
}: {
  titulo: string;
  comoLeer: string;
  mejora?: number | null;
  children: React.ReactNode;
}) {
  return (
    <div className="panel pixelado" style={{ marginBottom: 18, overflowX: 'auto' }}>
      <h2 style={{ fontSize: 20 }}>{titulo}</h2>
      {mejora !== null && mejora !== undefined && (
        <p className="numero" style={{ margin: '0 0 6px' }}>
          {es.adultos.mejora(mejora)}
        </p>
      )}
      {children}
      <p style={{ color: 'var(--texto-tenue)', fontSize: 15, margin: '8px 0 0' }}>{comoLeer}</p>
      <p style={{ color: 'var(--texto-tenue)', fontSize: 14, margin: 0 }}>
        {es.adultos.medianaMovil}
      </p>
    </div>
  );
}
