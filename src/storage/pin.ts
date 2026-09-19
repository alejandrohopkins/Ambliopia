/**
 * PIN de adultos. Es un candado para niños, no seguridad real:
 * se guarda el hash SHA-256 del PIN para no dejarlo en claro.
 */

const PREFIJO = 'misionPixel:pin:';

function aHex(buffer: ArrayBuffer): string {
  return [...new Uint8Array(buffer)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

export async function hashDePin(pin: string): Promise<string> {
  const datos = new TextEncoder().encode(PREFIJO + pin);
  const digest = await crypto.subtle.digest('SHA-256', datos);
  return aHex(digest);
}

export async function verificarPin(pin: string, hash: string | null): Promise<boolean> {
  if (!hash) return false;
  return (await hashDePin(pin)) === hash;
}

export function pinValido(pin: string): boolean {
  return /^\d{4}$/.test(pin);
}

/** Pregunta de adulto para recuperar el PIN: multiplicación de dos cifras. */
export interface PreguntaDeAdulto {
  a: number;
  b: number;
  respuesta: number;
}

export function nuevaPreguntaDeAdulto(aleatorio: () => number = Math.random): PreguntaDeAdulto {
  const a = 12 + Math.floor(aleatorio() * 87); // 12–98
  const b = 12 + Math.floor(aleatorio() * 87);
  return { a, b, respuesta: a * b };
}
