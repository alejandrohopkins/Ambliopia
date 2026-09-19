/**
 * Datos: exportar para consulta o respaldo, importar un respaldo y borrar todo.
 * Nada sale del dispositivo salvo lo que el adulto descargue a mano.
 */
import { useRef, useState } from 'react';
import { es } from '../../i18n/es';
import { useEstado } from '../../storage/contexto';
import { exportarJSON, importarJSON, nombreDeArchivo } from '../../storage/almacen';
import { generarCSV } from '../../storage/csv';
import { hoyDelJuego } from '../reloj';

export function Datos() {
  const { estado, despachar, problemaDeGuardado } = useEstado();
  const archivo = useRef<HTMLInputElement>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [confirmando, setConfirmando] = useState(0);

  function descargar(contenido: string, nombre: string, tipo: string) {
    const enlace = document.createElement('a');
    const url = URL.createObjectURL(new Blob([contenido], { type: tipo }));
    enlace.href = url;
    enlace.download = nombre;
    enlace.click();
    URL.revokeObjectURL(url);
  }

  const hoy = hoyDelJuego();

  async function importar(entrada: HTMLInputElement) {
    const elegido = entrada.files?.[0];
    if (!elegido) return;
    const resultado = importarJSON(await elegido.text());
    if (!resultado.ok || !resultado.estado) {
      setAviso(es.adultos.datos.errorAlImportar);
      return;
    }
    despachar({ tipo: 'reemplazar', estado: resultado.estado });
    setAviso(es.adultos.datos.importado);
    entrada.value = '';
  }

  return (
    <section className="panel pixelado">
      <h2 style={{ fontSize: 20 }}>{es.adultos.datos.titulo}</h2>
      <p style={{ color: 'var(--texto-tenue)' }}>{es.adultos.datos.privacidad}</p>

      {problemaDeGuardado && (
        <p role="alert" style={{ color: 'var(--ambar-estelar)' }}>
          {es.adultos.datos.problemaDeGuardado}
        </p>
      )}
      {aviso && <p role="status">{aviso}</p>}

      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 18 }}>
        <button
          className="pixelado"
          onClick={() =>
            descargar(
              generarCSV(estado),
              nombreDeArchivo(estado.perfil.nombre, hoy, 'csv'),
              'text/csv;charset=utf-8',
            )
          }
        >
          {es.adultos.datos.exportarCSV}
        </button>
        <button
          className="pixelado secundario"
          onClick={() =>
            descargar(
              exportarJSON(estado),
              nombreDeArchivo(estado.perfil.nombre, hoy, 'json'),
              'application/json',
            )
          }
        >
          {es.adultos.datos.exportarJSON}
        </button>
        <button className="pixelado secundario" onClick={() => archivo.current?.click()}>
          {es.adultos.datos.importarJSON}
        </button>
        <input
          ref={archivo}
          type="file"
          accept="application/json,.json"
          onChange={(e) => importar(e.currentTarget)}
          style={{ display: 'none' }}
        />
      </div>

      <div style={{ borderTop: '3px solid var(--borde)', paddingTop: 14 }}>
        {confirmando === 0 && (
          <button className="pixelado secundario" onClick={() => setConfirmando(1)}>
            {es.adultos.datos.borrarTodo}
          </button>
        )}
        {confirmando === 1 && (
          <>
            <p role="alert">{es.adultos.datos.confirmar1}</p>
            <button className="pixelado secundario" onClick={() => setConfirmando(2)}>
              {es.comun.si}
            </button>{' '}
            <button className="pixelado" onClick={() => setConfirmando(0)}>
              {es.comun.cancelar}
            </button>
          </>
        )}
        {confirmando === 2 && (
          <>
            <p role="alert">{es.adultos.datos.confirmar2}</p>
            <button
              className="pixelado secundario"
              // Al borrarlo todo, la app vuelve al asistente inicial:
              // sin perfil no hay nada que mostrar.
              onClick={() => despachar({ tipo: 'reiniciar' })}
            >
              {es.adultos.datos.borrarTodo}
            </button>{' '}
            <button className="pixelado" onClick={() => setConfirmando(0)}>
              {es.comun.cancelar}
            </button>
          </>
        )}
      </div>
    </section>
  );
}
