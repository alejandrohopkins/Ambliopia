import { describe, it, expect } from 'vitest';
import { config } from '../src/config';
import { estadoInicial } from '../src/storage/esquema';
import {
  registrarMetaCumplida,
  rachaVigente,
  cerrarRacha,
  reponerProtectores,
  constanciaReal,
} from '../src/engine/racha';

const inicial = () => estadoInicial().racha;

describe('racha', () => {
  it('el primer día cumplido deja la racha en 1', () => {
    const { racha, subio } = registrarMetaCumplida(inicial(), '2026-09-19');
    expect(racha.actual).toBe(1);
    expect(racha.mejor).toBe(1);
    expect(subio).toBe(true);
  });

  it('no cuenta dos veces el mismo día', () => {
    let r = registrarMetaCumplida(inicial(), '2026-09-19').racha;
    const repetido = registrarMetaCumplida(r, '2026-09-19');
    expect(repetido.racha.actual).toBe(1);
    expect(repetido.subio).toBe(false);
    r = repetido.racha;
    expect(r.actual).toBe(1);
  });

  it('sube día tras día seguido', () => {
    let r = inicial();
    for (const dia of ['2026-09-19', '2026-09-20', '2026-09-21', '2026-09-22']) {
      r = registrarMetaCumplida(r, dia).racha;
    }
    expect(r.actual).toBe(4);
    expect(r.mejor).toBe(4);
  });

  it('un día faltante consume el protector y no rompe la racha', () => {
    let r = inicial();
    // Lunes y martes de la misma semana ISO.
    r = registrarMetaCumplida(r, '2026-09-14').racha;
    r = registrarMetaCumplida(r, '2026-09-15').racha;
    expect(r.protectoresDisponibles).toBe(config.racha.protectoresPorSemana);

    // Falta el miércoles y vuelve el jueves.
    const conProtector = registrarMetaCumplida(r, '2026-09-17');
    expect(conProtector.usoProtector).toBe(true);
    expect(conProtector.racha.actual).toBe(3);
    expect(conProtector.racha.protectoresDisponibles).toBe(0);
  });

  it('sin protector disponible, un día faltante reinicia la racha', () => {
    let r = inicial();
    r = registrarMetaCumplida(r, '2026-09-14').racha;
    r = registrarMetaCumplida(r, '2026-09-15').racha;
    r = registrarMetaCumplida(r, '2026-09-17').racha; // gasta el protector
    expect(r.protectoresDisponibles).toBe(0);

    // Falta el viernes y vuelve el sábado, ya sin protector.
    const reinicio = registrarMetaCumplida(r, '2026-09-19');
    expect(reinicio.usoProtector).toBe(false);
    expect(reinicio.racha.actual).toBe(1);
    expect(reinicio.racha.mejor).toBe(3);
  });

  it('dos días faltantes rompen la racha aunque haya protector', () => {
    let r = inicial();
    r = registrarMetaCumplida(r, '2026-09-14').racha;
    r = registrarMetaCumplida(r, '2026-09-15').racha;
    const tras3 = registrarMetaCumplida(r, '2026-09-18');
    expect(tras3.usoProtector).toBe(false);
    expect(tras3.racha.actual).toBe(1);
  });

  it('el protector se repone al cambiar de semana ISO', () => {
    let r = inicial();
    r = registrarMetaCumplida(r, '2026-09-14').racha;
    r = registrarMetaCumplida(r, '2026-09-15').racha;
    r = registrarMetaCumplida(r, '2026-09-17').racha;
    expect(r.protectoresDisponibles).toBe(0);

    // Lunes de la semana siguiente.
    const repuesta = reponerProtectores(r, '2026-09-21');
    expect(repuesta.protectoresDisponibles).toBe(config.racha.protectoresPorSemana);
  });

  it('la racha vigente caduca cuando pasan los días', () => {
    let r = inicial();
    r = registrarMetaCumplida(r, '2026-09-14').racha;
    r = registrarMetaCumplida(r, '2026-09-15').racha;
    expect(rachaVigente(r, '2026-09-15')).toBe(2); // hoy
    expect(rachaVigente(r, '2026-09-16')).toBe(2); // ayer, aún viva
    expect(rachaVigente(r, '2026-09-17')).toBe(2); // el protector la cubre
    expect(rachaVigente(r, '2026-09-18')).toBe(0); // rota
  });

  it('el cierre del día deja la racha en cero cuando ya está rota', () => {
    let r = inicial();
    r = registrarMetaCumplida(r, '2026-09-14').racha;
    expect(cerrarRacha(r, '2026-09-15').actual).toBe(1);
    expect(cerrarRacha(r, '2026-09-20').actual).toBe(0);
  });

  it('la constancia real cuenta días cumplidos, sin protectores', () => {
    const dias = ['2026-09-14', '2026-09-15', '2026-09-17'];
    expect(constanciaReal(dias, '2026-09-14', '2026-09-20')).toBe(3);
    expect(constanciaReal(dias, '2026-09-16', '2026-09-20')).toBe(1);
  });
});
