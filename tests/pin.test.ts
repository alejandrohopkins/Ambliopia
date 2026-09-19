import { describe, it, expect } from 'vitest';
import { hashDePin, verificarPin, pinValido, nuevaPreguntaDeAdulto } from '../src/storage/pin';

describe('PIN de adultos', () => {
  it('solo acepta 4 dígitos', () => {
    expect(pinValido('1234')).toBe(true);
    expect(pinValido('123')).toBe(false);
    expect(pinValido('12345')).toBe(false);
    expect(pinValido('12a4')).toBe(false);
  });

  it('el hash es estable y no guarda el PIN en claro', async () => {
    const hash = await hashDePin('4821');
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
    expect(hash).toBe(await hashDePin('4821'));
    expect(hash).not.toContain('4821');
  });

  it('PIN distinto, hash distinto', async () => {
    expect(await hashDePin('1111')).not.toBe(await hashDePin('1112'));
  });

  it('verifica el PIN correcto y rechaza el incorrecto', async () => {
    const hash = await hashDePin('7390');
    expect(await verificarPin('7390', hash)).toBe(true);
    expect(await verificarPin('7391', hash)).toBe(false);
    expect(await verificarPin('7390', null)).toBe(false);
  });

  it('la pregunta de adulto multiplica dos cifras', () => {
    const pregunta = nuevaPreguntaDeAdulto(() => 0.5);
    expect(pregunta.a).toBeGreaterThanOrEqual(10);
    expect(pregunta.a).toBeLessThan(100);
    expect(pregunta.b).toBeGreaterThanOrEqual(10);
    expect(pregunta.b).toBeLessThan(100);
    expect(pregunta.respuesta).toBe(pregunta.a * pregunta.b);
  });
});
