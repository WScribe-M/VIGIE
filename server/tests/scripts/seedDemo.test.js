import test from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';

// Configuration minimale pour les machines sans fichier .env.
process.env.MONGODB_URI ??= 'mongodb://localhost:27017/vigie-test';
process.env.JWT_SECRET ??= 'secret-de-test';

const { creerAleatoire, choisir, creerDonneesTicket, statutSelonAge, tirerDurees } =
  await import('../../src/scripts/seedDemo.js');

const { config } = await import('../../src/config/env.js');

const { calculerPriorite } = await import('../../src/services/prioriteService.js');
const { calculerEcheance, delaiMinutes, minutesOuvreesEntre, niveauSla } =
  await import('../../src/services/slaService.js');
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

test('le statut découle de l’âge du ticket et des durées tirées', () => {
  const aleatoire = creerAleatoire();
  const durees = { prise: 60, traitement: 600 };

  for (let i = 0; i < 100; i++) {
    assert.equal(statutSelonAge(30, durees, aleatoire), 'NOUVEAU');
    assert.ok(
      ['EN_COURS', 'EN_ATTENTE_DEMANDEUR'].includes(statutSelonAge(300, durees, aleatoire)),
    );
    assert.ok(['TERMINE', 'ABANDONNE'].includes(statutSelonAge(600, durees, aleatoire)));
  }
});

test('les durées sont proportionnelles au délai SLA de la priorité', () => {
  const aleatoire = creerAleatoire();

  for (const priorite of ['CRITIQUE', 'HAUTE', 'MOYENNE', 'BASSE']) {
    const delai = delaiMinutes(priorite);
    for (let i = 0; i < 100; i++) {
      const { prise, traitement } = tirerDurees(priorite, aleatoire);
      // Un ticket qui traîne a des durées multipliées par 2,5
      assert.ok(prise <= delai * 2.5 * 0.5);
      assert.ok(traitement > prise);
      assert.ok(traitement <= prise + Math.max(30, delai * 2.5 * 0.75));
    }
  }
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

test('un doublon rejoint un ticket encore ouvert, avec son service et son titre', () => {
  const contexte = contexteTest();
  const principalId = new mongoose.Types.ObjectId();

  contexte.ticketsCrees.push({
    _id: principalId,
    numero: 1,
    service: contexte.services[0]._id,
    titre: 'Connexion VPN impossible',
    doublonDe: null,
    dateCloture: null,
    demandeur: new mongoose.Types.ObjectId(),
    createdAt: new Date('2026-06-10T12:00:00Z'),
  });

  const donnees = creerDonneesTicket(38, contexte);

  assert.equal(donnees.statut, 'ABANDONNE');
  assert.equal(String(donnees.doublonDe), String(principalId));
  assert.equal(String(donnees.service), String(contexte.services[0]._id));
  assert.equal(donnees.titre, 'Connexion VPN impossible');
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

// Pendant les heures ouvrées de la configuration (jour ouvré, entre l'ouverture et la fermeture)
function estOuvre(date) {
  const minutes = date.getHours() * 60 + date.getMinutes();
  return (
    config.sla.jours.includes(date.getDay() || 7) &&
    minutes >= config.sla.debut &&
    minutes <= config.sla.fin
  );
}

test('les événements ont lieu pendant les heures ouvrées, entre la création et maintenant', () => {
  const contexte = contexteTest();

  for (let i = 0; i < 300; i++) {
    const donnees = creerDonneesTicket(i, contexte);
    const dates = [donnees.createdAt, donnees.datePriseEnCharge, donnees.dateCloture].filter(
      Boolean,
    );

    for (const date of dates) {
      assert.ok(estOuvre(date), `${date.toISOString()} hors des heures ouvrées`);
      assert.ok(date >= donnees.createdAt && date <= contexte.maintenant);
    }
  }
});

test('les tickets anciens sont clos et les ouverts sont récents', () => {
  const contexte = contexteTest();
  const unMois = new Date(contexte.maintenant.getTime() - 30 * 86400000);

  for (let i = 0; i < 300; i++) {
    const donnees = creerDonneesTicket(i, contexte);

    if (donnees.createdAt < unMois) {
      assert.ok(['TERMINE', 'ABANDONNE'].includes(donnees.statut));
    }
  }
});

test('une quinzaine de tickets arrivent sur les trois derniers jours ouvrés', () => {
  const contexte = contexteTest();
  let recents = 0;

  for (let i = 0; i < 300; i++) {
    const donnees = creerDonneesTicket(i, contexte);
    if (
      minutesOuvreesEntre(donnees.createdAt, contexte.maintenant) <=
      3 * (config.sla.fin - config.sla.debut)
    )
      recents++;
  }

  assert.ok(recents >= 15);
});

test('le niveau d’alerte enregistré suit la lecture du SLA de l’application', () => {
  const contexte = contexteTest();
  const attendu = { EN_RETARD: 'ROUGE', ECHEANCE_PROCHE: 'ORANGE' };

  for (let i = 0; i < 300; i++) {
    const donnees = creerDonneesTicket(i, contexte);
    const sla = niveauSla(donnees, contexte.maintenant);
    assert.equal(donnees.niveauAlerteSla, attendu[sla?.niveau] ?? 'AUCUNE');
  }
});

test('une partie des tickets NOUVEAU a déjà été vue par le support', () => {
  const contexte = contexteTest();
  let vus = 0;
  let nouveaux = 0;

  for (let i = 0; i < 300; i++) {
    const donnees = creerDonneesTicket(i, contexte);
    if (donnees.statut === 'NOUVEAU') {
      nouveaux++;
      if (donnees.vuParSupportLe) vus++;
    }
  }

  assert.ok(nouveaux > 0);
  assert.ok(vus > 0 && vus < nouveaux);
});

test('l’historique ne porte que de vrais motifs', () => {
  const contexte = contexteTest();

  for (let i = 0; i < 300; i++) {
    for (const evt of creerDonneesTicket(i, contexte).historique) {
      if (evt.champ === 'technicien' || evt.nouvelleValeur === 'NOUVEAU') {
        assert.equal(evt.motif, undefined);
      }
      if (evt.nouvelleValeur === 'ABANDONNE') assert.ok(evt.motif);
    }
  }
});

test('les données générées sont acceptées par le schéma Ticket', async () => {
  const contexte = contexteTest();

  for (let i = 0; i < 100; i++) {
    const donnees = creerDonneesTicket(i, contexte);
    await new Ticket({ ...donnees, numero: i + 1 }).validate();
  }
});
