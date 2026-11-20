import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

process.env.MONGODB_URI ??= 'mongodb://localhost:27017/vigie-test';
process.env.JWT_SECRET ??= 'secret-de-test';

const {
  indicateursHistorique,
  masquerConcernes,
  minutesSuspendues,
  preparerHistorique,
  trierHistorique,
} = await import('../../src/services/historiqueService.js');

// Horaires du cadrage (9.2) : du lundi au vendredi, de 9 h à 18 h (en minutes depuis minuit)
const HORAIRES = { jours: [1, 2, 3, 4, 5], debut: 9 * 60, fin: 18 * 60, seuilAlerte: 0.75 };
// Dates en heure locale. Le 20/11/2026 est un vendredi, le 23/11/2026 un lundi.
const le = (jour, heure, minute = 0) => new Date(2026, 10, jour, heure, minute);

const DEMANDEUR = 'demandeur';
const TECHNICIEN = 'technicien';

const statut = (ancienneValeur, nouvelleValeur, date, motif) => ({
  auteur: TECHNICIEN,
  champ: 'statut',
  ancienneValeur,
  nouvelleValeur,
  date,
  motif,
});

// Vie complète d'un ticket : création, prise en charge, requalification, attente, clôture,
// contestation, nouvelle clôture
const VIE_COMPLETE = [
  { ...statut(null, 'NOUVEAU', le(20, 10)), auteur: DEMANDEUR },
  statut('NOUVEAU', 'EN_COURS', le(20, 11)),
  {
    auteur: TECHNICIEN,
    champ: 'technicien',
    ancienneValeur: null,
    nouvelleValeur: TECHNICIEN,
    date: le(20, 11),
  },
  {
    auteur: TECHNICIEN,
    champ: 'priorite',
    ancienneValeur: 'MOYENNE',
    nouvelleValeur: 'HAUTE',
    date: le(20, 11, 5),
    motif: 'Deux sites touchés',
  },
  statut('EN_COURS', 'EN_ATTENTE_DEMANDEUR', le(20, 16)),
  statut('EN_ATTENTE_DEMANDEUR', 'EN_COURS', le(23, 10)),
  statut('EN_COURS', 'TERMINE', le(23, 12)),
  { ...statut('TERMINE', 'EN_COURS', le(23, 14), 'Toujours en panne'), auteur: DEMANDEUR },
  statut('EN_COURS', 'TERMINE', le(23, 15)),
];

describe('trierHistorique', () => {
  it('range les entrées par ordre chronologique, sans modifier l’original', () => {
    const melange = [VIE_COMPLETE[2], VIE_COMPLETE[0], VIE_COMPLETE[1]];
    const trie = trierHistorique(melange);
    assert.deepEqual(
      trie.map((entree) => entree.date),
      [le(20, 10), le(20, 11), le(20, 11)],
    );
    assert.equal(melange[0], VIE_COMPLETE[2]);
  });

  it('garde l’ordre d’écriture de deux entrées de même date (prise en charge)', () => {
    const trie = trierHistorique([VIE_COMPLETE[1], VIE_COMPLETE[2]]);
    assert.deepEqual(
      trie.map((entree) => entree.champ),
      ['statut', 'technicien'],
    );
  });
});

describe('preparerHistorique', () => {
  // Faux modèle User : find().select().lean(), sans base de données
  function modele(personnes) {
    const appels = [];
    return {
      appels,
      find(filtre) {
        appels.push(filtre);
        return { select: () => ({ lean: async () => personnes }) };
      },
    };
  }

  it('remplace les techniciens d’une assignation par leur nom', async () => {
    const faux = modele([{ _id: TECHNICIEN, prenom: 'Mamadou', nom: 'Koné' }]);
    const historique = await preparerHistorique([VIE_COMPLETE[2], VIE_COMPLETE[0]], faux);
    assert.equal(historique[0].champ, 'statut');
    assert.equal(historique[1].ancienneValeur, null);
    assert.deepEqual(historique[1].nouvelleValeur, {
      _id: TECHNICIEN,
      prenom: 'Mamadou',
      nom: 'Koné',
    });
  });

  it('ne lit aucun utilisateur s’il n’y a pas d’assignation', async () => {
    const faux = modele([]);
    const historique = await preparerHistorique([VIE_COMPLETE[0]], faux);
    assert.equal(faux.appels.length, 0);
    assert.equal(historique.length, 1);
  });
});

describe('indicateursHistorique (ce que l’historique permet de calculer)', () => {
  it('donne création, prise en charge et résolution', () => {
    const { creation, priseEnCharge, resolution } = indicateursHistorique(VIE_COMPLETE);
    assert.deepEqual(creation, le(20, 10));
    assert.deepEqual(priseEnCharge, le(20, 11));
    // Dernière clôture, après la contestation
    assert.deepEqual(resolution, le(23, 15));
  });

  it('compte les requalifications et les réouvertures', () => {
    const { requalifications, reouvertures } = indicateursHistorique(VIE_COMPLETE);
    assert.equal(requalifications, 1);
    assert.equal(reouvertures, 1);
  });

  it('retrouve les périodes de suspension du SLA', () => {
    assert.deepEqual(indicateursHistorique(VIE_COMPLETE).suspensions, [
      { debut: le(20, 16), fin: le(23, 10) },
    ]);
  });

  it('une attente en cours n’a pas encore de fin', () => {
    const { suspensions, resolution } = indicateursHistorique(VIE_COMPLETE.slice(0, 5));
    assert.deepEqual(suspensions, [{ debut: le(20, 16), fin: null }]);
    assert.equal(resolution, null);
  });

  it('un ticket réouvert n’est plus résolu', () => {
    assert.equal(indicateursHistorique(VIE_COMPLETE.slice(0, 8)).resolution, null);
  });

  it('un ticket encore nouveau n’a ni prise en charge ni résolution', () => {
    const indicateurs = indicateursHistorique(VIE_COMPLETE.slice(0, 1));
    assert.equal(indicateurs.priseEnCharge, null);
    assert.equal(indicateurs.resolution, null);
    assert.equal(indicateurs.reouvertures, 0);
  });

  it('un historique vide ne casse rien', () => {
    assert.deepEqual(indicateursHistorique([]), {
      creation: null,
      priseEnCharge: null,
      resolution: null,
      suspensions: [],
      requalifications: 0,
      reouvertures: 0,
    });
  });
});

describe('minutesSuspendues (suspension du SLA en heures ouvrées)', () => {
  it('ne compte ni la nuit ni le week-end', () => {
    // Vendredi 16 h → lundi 10 h : 2 h le vendredi + 1 h le lundi
    const { suspensions } = indicateursHistorique(VIE_COMPLETE);
    assert.equal(minutesSuspendues(suspensions, le(23, 18), HORAIRES), 180);
  });

  it('compte une attente en cours jusqu’à maintenant', () => {
    const { suspensions } = indicateursHistorique(VIE_COMPLETE.slice(0, 5));
    assert.equal(minutesSuspendues(suspensions, le(20, 17), HORAIRES), 60);
  });
});

describe('masquerConcernes (VIGIE-15)', () => {
  const awa = { _id: 'awa', prenom: 'Awa', nom: 'Diallo' };
  const lea = { _id: 'lea', prenom: 'Léa', nom: 'Martin' };
  const historique = [
    { champ: 'statut', auteur: lea, ancienneValeur: null, nouvelleValeur: 'NOUVEAU' },
    { champ: 'concerne', auteur: awa, ancienneValeur: null, nouvelleValeur: 'awa' },
  ];

  it('cache à un client qui d’autre s’est déclaré concerné', () => {
    const vu = masquerConcernes(historique, { id: 'lea', role: 'CLIENT' });
    assert.equal(vu[1].auteur, null);
    assert.equal(vu[1].nouvelleValeur, null);
    // Le reste de l'historique ne change pas
    assert.deepEqual(vu[0], historique[0]);
  });

  it('laisse au client sa propre entrée', () => {
    const vu = masquerConcernes(historique, { id: 'awa', role: 'CLIENT' });
    assert.deepEqual(vu[1].auteur, awa);
  });

  it('laisse les noms au support', () => {
    const vu = masquerConcernes(historique, { id: 'sophie', role: 'GESTIONNAIRE' });
    assert.deepEqual(vu, historique);
  });
});
