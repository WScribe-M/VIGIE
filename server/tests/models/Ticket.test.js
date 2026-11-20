import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import mongoose from 'mongoose';
import { Notification } from '../../src/models/Notification.js';
import { Ticket } from '../../src/models/Ticket.js';

// Validation sans base de données : on vérifie le schéma conçu à partir des requêtes (cadrage 9.10)

function ticketValide(champs = {}) {
  const id = () => new mongoose.Types.ObjectId();
  return new Ticket({
    numero: 1,
    titre: 'VPN coupé',
    description: 'Impossible de se connecter depuis ce matin',
    service: id(),
    domaine: 'RESEAU',
    impact: 'FORT',
    urgence: 'HAUTE',
    prioriteCalculee: 'CRITIQUE',
    prioriteFinale: 'CRITIQUE',
    demandeur: id(),
    createur: id(),
    ...champs,
  });
}

function index(modele) {
  return modele.schema.indexes();
}

describe('schéma Ticket', () => {
  it('calcule rangPriorite depuis prioriteFinale, pour un tri juste', async () => {
    const attendus = { BASSE: 1, MOYENNE: 2, HAUTE: 3, CRITIQUE: 4 };
    for (const [priorite, rang] of Object.entries(attendus)) {
      const ticket = ticketValide({ prioriteFinale: priorite });
      await ticket.validate();
      assert.equal(ticket.rangPriorite, rang, priorite);
    }
  });

  it('suit une requalification de la priorité', async () => {
    const ticket = ticketValide();
    await ticket.validate();
    ticket.prioriteFinale = 'BASSE';
    await ticket.validate();
    assert.equal(ticket.rangPriorite, 1);
  });

  it('a des valeurs par défaut pour les champs de suivi', () => {
    const ticket = ticketValide();
    assert.equal(ticket.statut, 'NOUVEAU');
    assert.ok(ticket.dateStatut instanceof Date);
    assert.equal(ticket.niveauAlerteSla, 'AUCUNE');
    assert.equal(ticket.dateCloture, null);
    assert.equal(ticket.datePriseEnCharge, null);
    assert.equal(ticket.derniereRelance, null);
  });

  it('exige un numéro lisible', async () => {
    const ticket = ticketValide({ numero: undefined });
    await assert.rejects(ticket.validate(), /numero/);
  });

  it('refuse un niveau d’alerte SLA inconnu', async () => {
    const ticket = ticketValide({ niveauAlerteSla: 'JAUNE' });
    await assert.rejects(ticket.validate(), /niveauAlerteSla/);
  });

  it('indexe chaque branche du filtre de visibilité d’un CLIENT', () => {
    const cles = index(Ticket).map(([champs]) => Object.keys(champs).join(','));
    for (const champ of ['demandeur', 'suiveurs', 'enCopie']) {
      assert.ok(cles.includes(champ), `index manquant sur ${champ}`);
    }
  });

  it('trie « À traiter » sur le rang numérique, pas sur le texte de la priorité', () => {
    const champs = index(Ticket).map(([c]) => c);
    assert.ok(champs.some((c) => c.statut === 1 && c.rangPriorite === -1 && c.echeanceSla === 1));
    assert.ok(!champs.some((c) => 'prioriteFinale' in c));
  });

  it('fait la recherche textuelle en français', () => {
    const texte = index(Ticket).find(([champs]) => champs.titre === 'text');
    assert.equal(texte[1].default_language, 'french');
  });

  it('numéro unique', () => {
    const numero = index(Ticket).find(([champs]) => 'numero' in champs);
    assert.equal(numero?.[1].unique, true);
  });
});

// Historique (VIGIE-9) : des entrées de même forme, qu'on ajoute mais qu'on ne modifie jamais
describe('historique du ticket', () => {
  const id = () => new mongoose.Types.ObjectId();
  const DATE = new Date('2026-11-17T10:24:00Z');

  function entree(champs = {}) {
    return {
      _id: id(),
      auteur: id(),
      champ: 'priorite',
      ancienneValeur: 'MOYENNE',
      nouvelleValeur: 'HAUTE',
      motif: 'Deux sites touchés',
      date: DATE,
      ...champs,
    };
  }

  it('refuse un champ qui n’est pas tracé', async () => {
    const ticket = ticketValide({ historique: [entree({ champ: 'titre' })] });
    await assert.rejects(ticket.validate(), /champ/);
  });

  it('exige un auteur', async () => {
    const ticket = ticketValide({ historique: [entree({ auteur: undefined })] });
    await assert.rejects(ticket.validate(), /auteur/);
  });

  it('ignore la modification d’une entrée déjà enregistrée', () => {
    // hydrate : un ticket tel qu'il est lu depuis la base
    const ticket = Ticket.hydrate({ _id: id(), historique: [entree()] });
    const enregistree = ticket.historique[0];
    enregistree.motif = 'Motif réécrit';
    enregistree.nouvelleValeur = 'BASSE';
    enregistree.auteur = id();
    enregistree.date = new Date();
    assert.equal(enregistree.motif, 'Deux sites touchés');
    assert.equal(enregistree.nouvelleValeur, 'HAUTE');
    assert.deepEqual(enregistree.date, DATE);
    assert.equal(ticket.isModified(), false);
  });

  it('accepte l’ajout d’une entrée à un ticket enregistré', async () => {
    const ticket = Ticket.hydrate({ _id: id(), historique: [entree()] });
    ticket.historique.push(entree({ champ: 'domaine', ancienneValeur: 'APPLICATIF' }));
    assert.equal(ticket.historique[1].ancienneValeur, 'APPLICATIF');
    assert.equal(ticket.isModified('historique'), true);
  });

  // VIGIE-15 : la correction du domaine fait un save() complet ; il échouait (500) sur un ticket
  // déjà rejoint par « Je suis aussi concerné » tant que « concerne » n'était pas un champ autorisé
  it('reste valide avec une entrée « concerne » quand on ajoute une entrée', async () => {
    const client = id();
    const ticket = ticketValide({
      historique: [
        entree({
          champ: 'concerne',
          auteur: client,
          ancienneValeur: null,
          nouvelleValeur: client,
          motif: undefined,
        }),
      ],
    });
    ticket.historique.push(entree({ champ: 'domaine', ancienneValeur: 'APPLICATIF' }));
    await ticket.validate();
  });
});

describe('schéma Notification', () => {
  it('supprime seulement les notifications lues, après 90 jours', () => {
    const ttl = index(Notification).find(([, options]) => options.expireAfterSeconds);
    assert.equal(ttl[1].expireAfterSeconds, 90 * 24 * 60 * 60);
    assert.deepEqual(ttl[1].partialFilterExpression, { lu: true });
  });
});
