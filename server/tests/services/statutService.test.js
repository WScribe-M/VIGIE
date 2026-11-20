import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { STATUTS } from '../../src/models/constantes.js';
import {
  TRANSITIONS,
  transitionsDuMenu,
  verifierChangement,
} from '../../src/services/statutService.js';

const RESOLUTION = { cause: 'Certificat VPN expiré', solution: 'Certificat renouvelé' };

// Attend un refus 400, avec un message qui contient `texte`
function refuse(depuis, vers, donnees, texte) {
  assert.throws(
    () => verifierChangement(depuis, vers, donnees),
    (err) => {
      assert.equal(err.status, 400);
      if (texte) assert.match(err.message, texte);
      return true;
    },
  );
}

describe('table des transitions (cadrage 3.1)', () => {
  it('couvre exactement les statuts de constantes.js', () => {
    assert.deepEqual(Object.keys(TRANSITIONS).sort(), [...STATUTS].sort());
    for (const destinations of Object.values(TRANSITIONS)) {
      for (const statut of destinations) assert.ok(STATUTS.includes(statut), statut);
    }
  });

  it('ne revient jamais vers NOUVEAU', () => {
    for (const destinations of Object.values(TRANSITIONS)) {
      assert.ok(!destinations.includes('NOUVEAU'));
    }
  });

  it('ABANDONNE est définitif', () => {
    assert.deepEqual(TRANSITIONS.ABANDONNE, []);
    assert.deepEqual(transitionsDuMenu('ABANDONNE'), []);
  });

  it('le menu propose les transitions sans celles qui ont leur propre action', () => {
    assert.deepEqual(transitionsDuMenu('NOUVEAU'), ['ABANDONNE']); // EN_COURS = prise en charge
    assert.deepEqual(transitionsDuMenu('EN_COURS'), [
      'EN_ATTENTE_DEMANDEUR',
      'TERMINE',
      'ABANDONNE',
    ]);
    assert.deepEqual(transitionsDuMenu('EN_ATTENTE_DEMANDEUR'), [
      'EN_COURS',
      'TERMINE',
      'ABANDONNE',
    ]);
    assert.deepEqual(transitionsDuMenu('TERMINE'), []); // réouverture = VIGIE-30
  });
});

describe('verifierChangement', () => {
  it('accepte une transition autorisée, avec un motif facultatif', () => {
    assert.deepEqual(verifierChangement('EN_COURS', 'EN_ATTENTE_DEMANDEUR'), { motif: undefined });
    assert.deepEqual(
      verifierChangement('EN_ATTENTE_DEMANDEUR', 'EN_COURS', { motif: '  Réponse reçue  ' }),
      { motif: 'Réponse reçue' },
    );
  });

  it('refuse une transition non autorisée (400)', () => {
    refuse('ABANDONNE', 'EN_COURS', {}, /non autorisée/);
    refuse('EN_COURS', 'NOUVEAU', {}, /non autorisée/);
    refuse('TERMINE', 'ABANDONNE', {}, /non autorisée/);
    refuse('EN_COURS', 'EN_COURS', {}, /non autorisée/);
  });

  it('refuse un statut inconnu', () => {
    refuse('EN_COURS', 'FERME', {}, /Statut invalide/);
    refuse('EN_COURS', undefined, {}, /Statut invalide/);
  });

  it('renvoie vers la bonne action pour la prise en charge et la réouverture', () => {
    refuse('NOUVEAU', 'EN_COURS', {}, /Prendre en charge/);
    refuse('TERMINE', 'EN_COURS', {}, /contestation/);
  });

  it('exige un motif pour abandonner', () => {
    refuse('EN_COURS', 'ABANDONNE', {}, /Motif obligatoire/);
    refuse('NOUVEAU', 'ABANDONNE', { motif: '   ' }, /Motif obligatoire/);
    assert.deepEqual(verifierChangement('NOUVEAU', 'ABANDONNE', { motif: 'Doublon de VIG-0042' }), {
      motif: 'Doublon de VIG-0042',
    });
  });

  it('abandonner ne demande ni cause ni solution (VIGIE-44)', () => {
    const resultat = verifierChangement('EN_COURS', 'ABANDONNE', { motif: 'Demande annulée' });
    assert.equal(resultat.resolution, undefined);
  });

  it('exige la cause et la solution pour terminer (VIGIE-44)', () => {
    refuse('EN_COURS', 'TERMINE', {}, /Cause obligatoire/);
    refuse('EN_COURS', 'TERMINE', { cause: 'Certificat expiré' }, /Solution obligatoire/);
    assert.deepEqual(verifierChangement('EN_COURS', 'TERMINE', RESOLUTION).resolution, RESOLUTION);
  });

  it('limite la cause, la solution et le motif à 500 caractères', () => {
    const long = 'x'.repeat(501);
    refuse('EN_COURS', 'TERMINE', { ...RESOLUTION, cause: long }, /500/);
    refuse('EN_COURS', 'TERMINE', { ...RESOLUTION, solution: long }, /500/);
    refuse('EN_COURS', 'ABANDONNE', { motif: long }, /500/);
    assert.ok(verifierChangement('EN_COURS', 'ABANDONNE', { motif: 'x'.repeat(500) }));
  });

  it('refuse un texte qui n’est pas une chaîne', () => {
    refuse('EN_COURS', 'TERMINE', { cause: { $ne: null }, solution: 'ok' }, /texte attendu/);
  });
});
