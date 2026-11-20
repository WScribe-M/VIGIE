import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { IMPACTS, PRIORITES, URGENCES } from '../../src/models/constantes.js';
import {
  calculerPriorite,
  MOTIF_MIN,
  verifierRequalification,
} from '../../src/services/prioriteService.js';

describe('calculerPriorite (matrice impact × urgence, cadrage 9.1)', () => {
  // Recopie du tableau du cadrage : une erreur dans la matrice du code fait échouer le test
  const attendu = [
    ['FORT', 'FAIBLE', 'MOYENNE'],
    ['FORT', 'MOYENNE', 'HAUTE'],
    ['FORT', 'HAUTE', 'CRITIQUE'],
    ['MOYEN', 'FAIBLE', 'BASSE'],
    ['MOYEN', 'MOYENNE', 'MOYENNE'],
    ['MOYEN', 'HAUTE', 'HAUTE'],
    ['FAIBLE', 'FAIBLE', 'BASSE'],
    ['FAIBLE', 'MOYENNE', 'BASSE'],
    ['FAIBLE', 'HAUTE', 'MOYENNE'],
  ];

  for (const [impact, urgence, priorite] of attendu) {
    it(`impact ${impact} × urgence ${urgence} → ${priorite}`, () => {
      assert.equal(calculerPriorite(impact, urgence), priorite);
    });
  }

  it('couvre toutes les combinaisons avec une priorité autorisée', () => {
    for (const impact of IMPACTS) {
      for (const urgence of URGENCES) {
        assert.ok(PRIORITES.includes(calculerPriorite(impact, urgence)), `${impact} × ${urgence}`);
      }
    }
  });

  it('ne donne Critique que pour toute l’entreprise bloquée', () => {
    const critiques = IMPACTS.flatMap((impact) =>
      URGENCES.filter((urgence) => calculerPriorite(impact, urgence) === 'CRITIQUE'),
    );
    assert.deepEqual(critiques, ['HAUTE']);
  });
});

describe('verifierRequalification (VIGIE-5)', () => {
  const MOTIF = 'Toute la comptabilité est bloquée';

  // Attend un refus 400, avec un message qui contient `texte`
  function refuse(actuelle, donnees, texte) {
    assert.throws(
      () => verifierRequalification(actuelle, donnees),
      (err) => {
        assert.equal(err.status, 400);
        assert.match(err.message, texte);
        return true;
      },
    );
  }

  it('accepte une nouvelle priorité avec un motif, sans les espaces autour', () => {
    assert.deepEqual(
      verifierRequalification('MOYENNE', { priorite: 'HAUTE', motif: `  ${MOTIF} ` }),
      {
        priorite: 'HAUTE',
        motif: MOTIF,
      },
    );
  });

  it('refuse une priorité inconnue ou absente', () => {
    refuse('MOYENNE', { priorite: 'URGENTE', motif: MOTIF }, /Priorité invalide/);
    refuse('MOYENNE', { motif: MOTIF }, /Priorité invalide/);
    refuse('MOYENNE', undefined, /Priorité invalide/);
  });

  it('refuse la priorité que le ticket a déjà', () => {
    refuse('HAUTE', { priorite: 'HAUTE', motif: MOTIF }, /déjà cette priorité/);
  });

  it(`exige un motif d’au moins ${MOTIF_MIN} caractères, espaces non comptés`, () => {
    const message = /Indiquez un motif \(10 caractères minimum\)\./;
    refuse('MOYENNE', { priorite: 'HAUTE' }, message);
    refuse('MOYENNE', { priorite: 'HAUTE', motif: '' }, message);
    refuse('MOYENNE', { priorite: 'HAUTE', motif: 'x'.repeat(9) }, message);
    refuse('MOYENNE', { priorite: 'HAUTE', motif: `   ${'x'.repeat(9)}      ` }, message);
    assert.ok(verifierRequalification('MOYENNE', { priorite: 'HAUTE', motif: 'x'.repeat(10) }));
  });

  it('limite le motif à 500 caractères', () => {
    refuse('MOYENNE', { priorite: 'HAUTE', motif: 'x'.repeat(501) }, /500/);
    assert.ok(verifierRequalification('MOYENNE', { priorite: 'HAUTE', motif: 'x'.repeat(500) }));
  });

  it('refuse un motif qui n’est pas une chaîne', () => {
    refuse('MOYENNE', { priorite: 'HAUTE', motif: { $ne: null } }, /texte attendu/);
  });
});
