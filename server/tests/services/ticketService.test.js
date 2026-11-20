import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import mongoose from 'mongoose';

process.env.MONGODB_URI ??= 'mongodb://localhost:27017/vigie-test';
process.env.JWT_SECRET ??= 'secret-de-test';

const { composerDescription, estimerTicket, preparerTicket, validerCreation } =
  await import('../../src/services/ticketService.js');
const { Ticket } = await import('../../src/models/index.js');

const SERVICE = '665a1f0c2b7e4a0000000051';
const CLIENT = { id: '665a1f0c2b7e4a0000000001', role: 'CLIENT' };

function corpsValide(champs = {}) {
  return {
    titre: '  VPN coupé  ',
    description: { probleme: 'Le VPN refuse la connexion', depuis: 'Ce matin 8 h' },
    service: SERVICE,
    impact: 'FORT',
    urgence: 'HAUTE',
    ...champs,
  };
}

// Attend une erreur 400 de validation
function refuse(corps, message) {
  assert.throws(
    () => validerCreation(corps),
    (err) => {
      assert.equal(err.status, 400);
      if (message) assert.match(err.message, message);
      return true;
    },
  );
}

describe('composerDescription (description guidée, cadrage 9.9)', () => {
  it('assemble les trois rubriques, toujours dans le même ordre', () => {
    const texte = composerDescription({
      messageErreur: 'Erreur 809',
      depuis: 'Ce matin',
      probleme: 'Le VPN refuse la connexion',
    });
    assert.equal(
      texte,
      "Que se passe-t-il ?\nLe VPN refuse la connexion\n\nDepuis quand ?\nCe matin\n\nQuel message d'erreur ?\nErreur 809",
    );
  });

  it('garde la rubrique facultative, avec « Non précisé »', () => {
    const texte = composerDescription({ probleme: 'Imprimante muette', depuis: 'Hier' });
    assert.match(texte, /Quel message d'erreur \?\nNon précisé$/);
  });

  it('exige « Que se passe-t-il ? » et « Depuis quand ? »', () => {
    assert.throws(() => composerDescription({ probleme: 'X' }), { status: 400 });
    assert.throws(() => composerDescription({ depuis: 'Hier', probleme: '   ' }), { status: 400 });
  });

  it('refuse une description en texte libre', () => {
    assert.throws(() => composerDescription('VPN coupé depuis ce matin'), { status: 400 });
  });
});

describe('validerCreation', () => {
  it('accepte un ticket complet et nettoie les espaces', () => {
    const champs = validerCreation(corpsValide());
    assert.equal(champs.titre, 'VPN coupé');
    assert.match(champs.description, /^Que se passe-t-il \?\nLe VPN refuse la connexion/);
  });

  it('refuse une priorité, un délai, un statut ou un demandeur envoyés par le client', () => {
    refuse(corpsValide({ priorite: 'CRITIQUE' }), /priorite/);
    refuse(corpsValide({ echeanceSla: '2026-11-20' }), /echeanceSla/);
    refuse(corpsValide({ statut: 'TERMINE' }), /statut/);
    refuse(corpsValide({ demandeur: CLIENT.id }), /demandeur/);
  });

  it('exige un titre de 120 caractères au plus', () => {
    refuse(corpsValide({ titre: '' }), /Titre/);
    refuse(corpsValide({ titre: 'x'.repeat(121) }), /120/);
    assert.equal(validerCreation(corpsValide({ titre: 'x'.repeat(120) })).titre.length, 120);
  });

  it('refuse un impact, une urgence ou un service invalides', () => {
    refuse(corpsValide({ impact: 'ENORME' }), /Impact/);
    refuse(corpsValide({ urgence: undefined }), /Urgence/);
    refuse(corpsValide({ service: 'vpn' }), /Service/);
    refuse(corpsValide({ service: { $ne: null } }), /Service/);
  });

  it('refuse un corps absent ou qui n’est pas un objet', () => {
    refuse(undefined);
    refuse([]);
  });
});

describe('preparerTicket', () => {
  const maintenant = new Date(2026, 10, 20, 10, 0); // vendredi 10 h
  const preparer = (champs = {}) =>
    preparerTicket({ ...validerCreation(corpsValide()), ...champs }, CLIENT, {
      numero: 42,
      domaine: 'RESEAU',
      maintenant,
    });

  it('crée un ticket NOUVEAU dont le demandeur est l’utilisateur connecté', () => {
    const ticket = preparer();
    assert.equal(ticket.statut, 'NOUVEAU');
    assert.equal(ticket.demandeur, CLIENT.id);
    assert.equal(ticket.createur, CLIENT.id);
    assert.equal(ticket.canal, 'APPLICATION');
    assert.equal(ticket.numero, 42);
    assert.deepEqual(ticket.dateStatut, maintenant);
  });

  it('calcule la priorité et l’échéance SLA à partir de l’impact et de l’urgence', () => {
    const ticket = preparer(); // FORT × HAUTE
    assert.equal(ticket.prioriteCalculee, 'CRITIQUE');
    assert.equal(ticket.prioriteFinale, 'CRITIQUE');
    assert.deepEqual(ticket.echeanceSla, new Date(2026, 10, 20, 14, 0)); // + 4 h ouvrées
  });

  it('trace la création dans l’historique', () => {
    assert.deepEqual(preparer().historique, [
      { auteur: CLIENT.id, champ: 'statut', ancienneValeur: null, nouvelleValeur: 'NOUVEAU' },
    ]);
  });

  it('produit un document que le schéma Ticket accepte', async () => {
    const ticket = new Ticket(preparer());
    await ticket.validate();
    assert.equal(ticket.rangPriorite, 4);
    assert.ok(mongoose.isValidObjectId(ticket.service));
  });
});

describe('estimerTicket', () => {
  it('donne la même priorité et la même échéance qu’à la création', () => {
    const maintenant = new Date(2026, 10, 20, 10, 0);
    const estimation = estimerTicket('FORT', 'HAUTE', maintenant);
    const ticket = preparerTicket(validerCreation(corpsValide()), CLIENT, {
      numero: 1,
      domaine: 'RESEAU',
      maintenant,
    });
    assert.equal(estimation.prioriteCalculee, ticket.prioriteFinale);
    assert.deepEqual(estimation.echeanceSla, ticket.echeanceSla);
  });

  it('refuse un impact ou une urgence invalides', () => {
    assert.throws(() => estimerTicket('ENORME', 'HAUTE'), { status: 400 });
    assert.throws(() => estimerTicket('FORT', undefined), { status: 400 });
  });
});
