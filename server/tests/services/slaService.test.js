import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

process.env.MONGODB_URI ??= 'mongodb://localhost:27017/vigie-test';
process.env.JWT_SECRET ??= 'secret-de-test';

const { calculerEcheance } = await import('../../src/services/slaService.js');

// Horaires du cadrage (9.2) : du lundi au vendredi, de 9 h à 18 h (en minutes depuis minuit)
const HORAIRES = { jours: [1, 2, 3, 4, 5], debut: 9 * 60, fin: 18 * 60 };

// Dates en heure locale. Le 20/11/2026 est un vendredi, le 23/11/2026 un lundi.
const le = (jour, heure, minute = 0) => new Date(2026, 10, jour, heure, minute);
const echeance = (debut, priorite) => calculerEcheance(debut, priorite, HORAIRES);

describe('calculerEcheance (SLA en heures ouvrées, cadrage 9.2)', () => {
  it('Critique (4 h) dans la journée', () => {
    assert.deepEqual(echeance(le(20, 10), 'CRITIQUE'), le(20, 14));
  });

  it('Critique ouvert le vendredi à 17 h : 1 h vendredi, 3 h lundi', () => {
    assert.deepEqual(echeance(le(20, 17), 'CRITIQUE'), le(23, 12));
  });

  it('Haute = un jour ouvré (9 h), pas 24 heures', () => {
    assert.deepEqual(echeance(le(20, 10), 'HAUTE'), le(23, 10));
  });

  it('Moyenne = 3 jours ouvrés', () => {
    assert.deepEqual(echeance(le(23, 9), 'MOYENNE'), le(25, 18));
  });

  it('Basse = 5 jours ouvrés', () => {
    assert.deepEqual(echeance(le(23, 9), 'BASSE'), le(27, 18));
  });

  it('un ticket ouvert le week-end démarre le lundi à 9 h', () => {
    assert.deepEqual(echeance(le(21, 15), 'CRITIQUE'), le(23, 13));
  });

  it('un ticket ouvert avant l’ouverture démarre à 9 h', () => {
    assert.deepEqual(echeance(le(23, 7), 'CRITIQUE'), le(23, 13));
  });

  it('un ticket ouvert après la fermeture démarre le lendemain à 9 h', () => {
    assert.deepEqual(echeance(le(23, 19, 30), 'CRITIQUE'), le(24, 13));
  });

  it('suit des horaires configurés autrement (samedi travaillé)', () => {
    const samedi = { ...HORAIRES, jours: [1, 2, 3, 4, 5, 6] };
    assert.deepEqual(calculerEcheance(le(21, 10), 'CRITIQUE', samedi), le(21, 14));
  });

  it('signale une configuration sans jour ouvré au lieu de boucler', () => {
    assert.throws(() => calculerEcheance(le(20, 10), 'CRITIQUE', { ...HORAIRES, jours: [] }));
  });
});
