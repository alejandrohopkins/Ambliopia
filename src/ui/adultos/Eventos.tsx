/** Registro de las veces que la jugadora tocó "Me molesta la vista". */
import { es } from '../../i18n/es';
import { useEstado } from '../../storage/contexto';

export function Eventos() {
  const { estado } = useEstado();
  const eventos = [...estado.eventos].reverse();

  return (
    <section className="panel pixelado">
      <h2 style={{ fontSize: 20 }}>{es.adultos.eventos.titulo}</h2>
      {eventos.length === 0 ? (
        <p>{es.adultos.eventos.vacio}</p>
      ) : (
        <ul style={{ paddingLeft: 20, margin: 0 }}>
          {eventos.map((evento, i) => (
            <li key={`${evento.fecha}-${evento.hora}-${i}`}>
              {es.adultos.eventos.fila(
                evento.fecha,
                evento.hora,
                es.nombreDeModo(evento.modo),
                evento.juego ? es.juegos[evento.juego] : es.adultos.eventos.sinJuego,
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
