import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { IMPACTS, PRIORITES, URGENCES } from '../models/constantes.js';
import { calculerPriorite } from './prioriteService.js';

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
