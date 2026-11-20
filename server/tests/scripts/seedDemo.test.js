import test from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';

import {
  creerAleatoire,
  choisir,
  choisirStatut,
  creerDonneesTicket,
} from '../../src/scripts/seedDemo.js';

import { calculerPriorite } from '../../src/services/prioriteService.js';
import { calculerEcheance } from '../../src/services/slaService.js';

function utilisateur(role = 'CLIENT') {
  return {
    _id: new mongoose.Types.ObjectId(),
    role,
  };
}

function contexteTest() {
  const maintenant = new Date('2026-11-20T12:00:00Z');
  const debut = new Date('2026-05-20T12:00:00Z');

  return {
    services: [
      {
        _id: new mongoose.Types.ObjectId(),
        nom: 'VPN',
        domaine: 'RESEAU',
      },
    ],
    clients: [utilisateur()],
    techniciens: [utilisateur('GESTIONNAIRE')],
    gestionnaire: utilisateur('GESTIONNAIRE'),
    debut,
    maintenant,
    ticketsCrees: [],
    aleatoire: creerAleatoire(),
  };
}

test('le générateur aléatoire est reproductible', () => {
  const premier = creerAleatoire(123);
  const second = creerAleatoire(123);

  for (let i = 0; i < 100; i++) {
    assert.equal(premier(), second());
  }
});

test('choisir retourne une valeur de la liste', () => {
  const aleatoire = creerAleatoire();

  for (let i = 0; i < 100; i++) {
    assert.ok(['A', 'B', 'C'].includes(choisir(['A', 'B', 'C'], aleatoire)));
  }
});

test('les tickets très récents ne sont pas terminés', () => {
  const aleatoire = creerAleatoire();

  for (let i = 0; i < 100; i++) {
    assert.ok(['NOUVEAU', 'EN_COURS'].includes(choisirStatut(12, aleatoire)));
  }
});

test('les tickets anciens ne restent pas NOUVEAU', () => {
  const aleatoire = creerAleatoire();

  for (let i = 0; i < 100; i++) {
    assert.notEqual(choisirStatut(1000, aleatoire), 'NOUVEAU');
  }
});

test('les priorités et échéances utilisent les services officiels', () => {
  const contexte = contexteTest();
  const donnees = creerDonneesTicket(25, contexte);

  assert.equal(donnees.prioriteCalculee, calculerPriorite(donnees.impact, donnees.urgence));

  assert.equal(donnees.prioriteFinale, donnees.prioriteCalculee);

  assert.deepEqual(
    donnees.echeanceSla,
    calculerEcheance(donnees.createdAt, donnees.prioriteFinale),
  );
});

test('la description contient les rubriques guidées', () => {
  const donnees = creerDonneesTicket(0, contexteTest());

  assert.match(donnees.description, /Que se passe-t-il \?/);
  assert.match(donnees.description, /Depuis quand \?/);
  assert.match(donnees.description, /Quel message d'erreur \?/);
});

test('les titres ne contiennent pas de préfixe de démonstration', () => {
  const donnees = creerDonneesTicket(0, contexteTest());

  assert.doesNotMatch(donnees.titre, /DEMO-VIGIE-23/);
  assert.doesNotMatch(donnees.titre, /#\d+$/);
});

test('les tickets terminés et abandonnés ont une date de clôture', () => {
  const contexte = contexteTest();

  for (let i = 0; i < 300; i++) {
    const donnees = creerDonneesTicket(i, contexte);

    if (['TERMINE', 'ABANDONNE'].includes(donnees.statut)) {
      assert.ok(donnees.dateCloture instanceof Date);
    }
  }
});

test('un ticket en attente du demandeur ne porte pas une alerte ROUGE', () => {
  const contexte = contexteTest();

  for (let i = 0; i < 300; i++) {
    const donnees = creerDonneesTicket(i, contexte);

    if (donnees.statut === 'EN_ATTENTE_DEMANDEUR') {
      assert.notEqual(donnees.niveauAlerteSla, 'ROUGE');
    }
  }
});

test('un ticket affecté trace son technicien dans l’historique', () => {
  const contexte = contexteTest();
  let affectations = 0;

  for (let i = 0; i < 100; i++) {
    const donnees = creerDonneesTicket(i, contexte);

    if (donnees.technicien) {
      affectations++;
      assert.ok(donnees.historique.some((evenement) => evenement.champ === 'technicien'));
    }
  }

  assert.ok(affectations > 0);
});

test('les doublons pointent vers un ticket du même service', () => {
  const contexte = contexteTest();
  const principalId = new mongoose.Types.ObjectId();

  contexte.ticketsCrees.push({
    _id: principalId,
    numero: 1,
    service: contexte.services[0]._id,
    doublonDe: null,
  });

  const donnees = creerDonneesTicket(38, contexte);

  assert.equal(donnees.statut, 'ABANDONNE');
  assert.equal(String(donnees.doublonDe), String(principalId));
  assert.ok(donnees.historique.some((evenement) => evenement.motif === 'Doublon de VIG-0001'));
});

test('les données générées sont acceptées par le schéma Ticket', async () => {
  const { Ticket } = await import('../../src/models/Ticket.js');
  const contexte = contexteTest();

  for (let i = 0; i < 100; i++) {
    const donnees = creerDonneesTicket(i, contexte);
    const ticket = new Ticket({
      ...donnees,
      numero: i + 1,
    });

    await ticket.validate();
  }
});
