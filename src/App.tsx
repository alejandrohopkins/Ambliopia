import { es } from './i18n/es';
import { config } from './config';

const PALETA = [
  { variable: '--cielo-profundo', nombre: es.paleta.cieloProfundo, hex: '#1B1446' },
  { variable: '--nebulosa', nombre: es.paleta.nebulosa, hex: '#5B3FA0' },
  { variable: '--cristal', nombre: es.paleta.cristal, hex: '#3FD6C6' },
  { variable: '--ambar-estelar', nombre: es.paleta.ambarEstelar, hex: '#FFC23D' },
  { variable: '--musgo-pixel', nombre: es.paleta.musgoPixel, hex: '#7BD65A' },
  { variable: '--polvo-lunar', nombre: es.paleta.polvoLunar, hex: '#EDE9FF' },
];

/** Pantalla provisional de la fase 0: comprueba paleta y fuentes. */
export function App() {
  return (
    <main style={{ padding: 24, maxWidth: 900, margin: '0 auto' }}>
      <h1>{es.app.nombre}</h1>
      <p>{es.base.saludo(config.perfil.nombrePorDefecto)}</p>

      <section className="panel pixelado" style={{ marginBottom: 20 }}>
        <h2>Tipografías</h2>
        <p className="numero" style={{ fontSize: 30 }}>
          Pixelify Sans — 0123456789 ¿Añoño?
        </p>
        <p>Fredoka — Los pingüinos ágiles cruzaron la nébula índigo.</p>
      </section>

      <section className="panel pixelado">
        <h2>Paleta</h2>
        <ul style={{ listStyle: 'none', padding: 0, display: 'grid', gap: 10 }}>
          {PALETA.map((c) => (
            <li key={c.variable} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <span
                className="pixelado"
                style={{
                  width: 48,
                  height: 48,
                  background: `var(${c.variable})`,
                  border: '3px solid var(--borde)',
                  flex: '0 0 auto',
                }}
              />
              <span>
                {c.nombre} <span className="numero">{c.hex}</span>
              </span>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
