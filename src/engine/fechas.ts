/**
 * Fechas en hora local del dispositivo. Un día va de 00:00 a 23:59 local.
 * Formato de día: 'AAAA-MM-DD'. Formato de semana: 'AAAA-Www' (ISO, lunes a domingo).
 */

function dosDigitos(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

/** Día local en formato 'AAAA-MM-DD'. */
export function diaISO(fecha: Date = new Date()): string {
  return `${fecha.getFullYear()}-${dosDigitos(fecha.getMonth() + 1)}-${dosDigitos(fecha.getDate())}`;
}

/** Hora local en formato 'HH:MM'. */
export function horaISO(fecha: Date = new Date()): string {
  return `${dosDigitos(fecha.getHours())}:${dosDigitos(fecha.getMinutes())}`;
}

/** Convierte 'AAAA-MM-DD' en un Date local a medianoche. */
export function desdeDiaISO(dia: string): Date {
  const [a, m, d] = dia.split('-').map(Number);
  return new Date(a, m - 1, d);
}

export function sumarDias(dia: string, dias: number): string {
  const fecha = desdeDiaISO(dia);
  fecha.setDate(fecha.getDate() + dias);
  return diaISO(fecha);
}

/** Días completos entre dos días locales (b − a). Ignora horarios de verano. */
export function diasEntre(a: string, b: string): number {
  const msPorDia = 24 * 60 * 60 * 1000;
  const inicio = desdeDiaISO(a).getTime();
  const fin = desdeDiaISO(b).getTime();
  return Math.round((fin - inicio) / msPorDia);
}

/** Semana ISO 8601 del día: 'AAAA-Www'. La semana empieza el lunes. */
export function semanaISO(dia: string): string {
  const fecha = desdeDiaISO(dia);
  // Jueves de la misma semana: define el año ISO.
  const diaDeSemana = (fecha.getDay() + 6) % 7; // 0 = lunes
  fecha.setDate(fecha.getDate() - diaDeSemana + 3);
  const anioISO = fecha.getFullYear();
  const primerJueves = new Date(anioISO, 0, 4);
  const desplazamiento = (primerJueves.getDay() + 6) % 7;
  primerJueves.setDate(primerJueves.getDate() - desplazamiento + 3);
  const semana = 1 + Math.round((fecha.getTime() - primerJueves.getTime()) / (7 * 24 * 3600 * 1000));
  return `${anioISO}-W${dosDigitos(semana)}`;
}

/** Lunes de la semana a la que pertenece el día. */
export function lunesDeLaSemana(dia: string): string {
  const fecha = desdeDiaISO(dia);
  const diaDeSemana = (fecha.getDay() + 6) % 7;
  fecha.setDate(fecha.getDate() - diaDeSemana);
  return diaISO(fecha);
}

/** Los días de una semana, de lunes a domingo. */
export function diasDeLaSemana(dia: string): string[] {
  const lunes = lunesDeLaSemana(dia);
  return Array.from({ length: 7 }, (_, i) => sumarDias(lunes, i));
}

/** Lista de días desde `desde` hasta `hasta`, ambos incluidos. */
export function rangoDeDias(desde: string, hasta: string): string[] {
  const total = diasEntre(desde, hasta);
  if (total < 0) return [];
  return Array.from({ length: total + 1 }, (_, i) => sumarDias(desde, i));
}
