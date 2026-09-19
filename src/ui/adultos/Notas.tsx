/** Notas con fecha. Aparecen como marcas en las gráficas. */
import { useState } from 'react';
import { es } from '../../i18n/es';
import { useEstado } from '../../storage/contexto';
import { hoyDelJuego } from '../reloj';
import { Campo } from '../componentes/Campo';

export function Notas() {
  const { estado, despachar } = useEstado();
  const [texto, setTexto] = useState('');

  function agregar() {
    const limpio = texto.trim();
    if (!limpio) return;
    despachar({ tipo: 'nota/agregar', texto: limpio, dia: hoyDelJuego() });
    setTexto('');
  }

  return (
    <section className="panel pixelado">
      <h2 style={{ fontSize: 20 }}>{es.adultos.notas.titulo}</h2>
      <p style={{ color: 'var(--texto-tenue)' }}>{es.adultos.notas.explicacion}</p>

      <Campo etiqueta={es.adultos.notas.nueva}>
        <textarea
          className="pixelado"
          rows={2}
          value={texto}
          maxLength={200}
          onChange={(e) => setTexto(e.target.value)}
          style={{ resize: 'vertical' }}
        />
      </Campo>
      <button className="pixelado" onClick={agregar} disabled={texto.trim().length === 0}>
        {es.adultos.notas.agregar}
      </button>

      {estado.notas.length === 0 ? (
        <p style={{ marginTop: 14 }}>{es.adultos.notas.vacio}</p>
      ) : (
        <ul style={{ listStyle: 'none', padding: 0, marginTop: 14 }}>
          {estado.notas.map((nota, indice) => (
            <li
              key={`${nota.fecha}-${indice}`}
              style={{
                display: 'flex',
                gap: 12,
                alignItems: 'flex-start',
                padding: '8px 0',
                borderTop: '1px solid var(--borde)',
              }}
            >
              <span className="numero" style={{ minWidth: 100 }}>
                {nota.fecha}
              </span>
              <span style={{ flex: 1 }}>{nota.texto}</span>
              <button
                className="pixelado secundario"
                onClick={() => despachar({ tipo: 'nota/borrar', indice })}
                style={{ minHeight: 36, padding: '0 12px' }}
              >
                {es.adultos.notas.borrar}
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
