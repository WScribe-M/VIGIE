import test from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';

// Configuration minimale pour les machines sans fichier .env.
process.env.MONGODB_URI ??= 'mongodb://localhost:27017/vigie-test';
process.env.JWT_SECRET ??= 'secret-de-test';

const { creerAleatoire, choisir, choisirStatut, creerDonneesTicket, minutesOuvreesEntre } =
  await import('../../src/scripts/seedDemo.js');

const { calculerPriorite } = await import('../../src/services/prioriteService.js');
const { calculerEcheance } = await import('../../src/services/slaService.js');
const { Ticket } = await import('../../src/models/Ticket.js');

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
    debut,
    maintenant,
    ticketsCrees: [],
    aleatoire: creerAleatoire(),
  };
}

test('le générateur aléatoire est reproductible', () => {
  const a = creerAleatoire(123);
  const b = creerAleatoire(123);

  for (let i = 0; i < 100; i++) {
    assert.equal(a(), b());
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
    assert.ok(
      ['NOUVEAU', 'EN_COURS', 'EN_ATTENTE_DEMANDEUR'].includes(choisirStatut(12, aleatoire)),
    );
  }
});

test('les tickets anciens ne restent pas NOUVEAU', () => {
  const aleatoire = creerAleatoire();

  for (let i = 0; i < 100; i++) {
    assert.notEqual(choisirStatut(1000, aleatoire), 'NOUVEAU');
  }
});

test('les anciens tickets sont majoritairement clos', () => {
  const aleatoire = creerAleatoire();
  let clos = 0;

  for (let i = 0; i < 1000; i++) {
    if (['TERMINE', 'ABANDONNE'].includes(choisirStatut(1000, aleatoire))) {
      clos++;
    }
  }

  assert.ok(clos > 970);
});

test('les priorités et échéances utilisent les services officiels', () => {
  const donnees = creerDonneesTicket(25, contexteTest());

  assert.equal(donnees.prioriteCalculee, calculerPriorite(donnees.impact, donnees.urgence));
  assert.equal(donnees.prioriteFinale, donnees.prioriteCalculee);
  assert.deepEqual(
    donnees.echeanceSla,
    calculerEcheance(donnees.createdAt, donnees.prioriteFinale),
  );
});

test('la description contient les trois rubriques', () => {
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

test('les tickets terminés ont une résolution structurée complète', () => {
  const contexte = contexteTest();
  let termines = 0;

  for (let i = 0; i < 300; i++) {
    const donnees = creerDonneesTicket(i, contexte);

    if (donnees.statut === 'TERMINE') {
      termines++;
      assert.ok(donnees.resolution.cause);
      assert.ok(donnees.resolution.solution);
      assert.equal(String(donnees.resolution.auteur), String(donnees.technicien));
      assert.deepEqual(donnees.resolution.date, donnees.dateCloture);
    } else {
      assert.equal(donnees.resolution, null);
    }
  }

  assert.ok(termines > 100);
});

test('aucun ticket en attente du demandeur ne porte une alerte ROUGE', () => {
  const contexte = contexteTest();

  for (let i = 0; i < 300; i++) {
    const donnees = creerDonneesTicket(i, contexte);

    if (donnees.statut === 'EN_ATTENTE_DEMANDEUR') {
      assert.notEqual(donnees.niveauAlerteSla, 'ROUGE');
    }
  }
});

test('la prise en charge et l’affectation ont le technicien pour auteur', () => {
  const contexte = contexteTest();
  let affectations = 0;

  for (let i = 0; i < 100; i++) {
    const donnees = creerDonneesTicket(i, contexte);

    if (donnees.technicien) {
      affectations++;

      assert.deepEqual(donnees.vuParSupportLe, donnees.datePriseEnCharge);

      const prise = donnees.historique.find(
        (evt) => evt.champ === 'statut' && evt.nouvelleValeur === 'EN_COURS',
      );

      assert.equal(String(prise.auteur), String(donnees.technicien));

      const affectation = donnees.historique.find((evt) => evt.champ === 'technicien');

      assert.equal(affectation.ancienneValeur, null);
      assert.equal(String(affectation.nouvelleValeur), String(donnees.technicien));
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
    statut: 'TERMINE',
    demandeur: new mongoose.Types.ObjectId(),
    createdAt: new Date('2026-06-10T12:00:00Z'),
  });

  const donnees = creerDonneesTicket(38, contexte);

  assert.equal(donnees.statut, 'ABANDONNE');
  assert.equal(String(donnees.doublonDe), String(principalId));
  assert.ok(donnees.historique.some((evt) => evt.motif === 'Doublon de VIG-0001'));
});

test('la durée de prise en charge varie entre les tickets', () => {
  const contexte = contexteTest();
  const delais = [];

  for (let i = 0; i < 80; i++) {
    const ticket = creerDonneesTicket(i, contexte);

    if (ticket.datePriseEnCharge) {
      delais.push(ticket.datePriseEnCharge - ticket.createdAt);
    }
  }

  assert.ok(new Set(delais).size > 15);
});

test('les minutes ouvrées ne comptent pas le weekend', () => {
  const horaires = {
    jours: [1, 2, 3, 4, 5],
    debut: 9 * 60,
    fin: 18 * 60,
  };

  const vendredi = new Date(2026, 10, 20, 17);
  const lundi = new Date(2026, 10, 23, 10);

  assert.equal(minutesOuvreesEntre(vendredi, lundi, horaires), 120);
});

test('les données générées sont acceptées par le schéma Ticket', async () => {
  const contexte = contexteTest();

  for (let i = 0; i < 100; i++) {
    const donnees = creerDonneesTicket(i, contexte);
    await new Ticket({ ...donnees, numero: i + 1 }).validate();
  }
});
