import assert from 'node:assert/strict';
import { afterEach, describe, it, mock } from 'node:test';

process.env.MONGODB_URI ??= 'mongodb://localhost:27017/vigie-test';
process.env.JWT_SECRET ??= 'secret-de-test';

const {
  CHAMP_CONCERNE,
  SUGGESTIONS_MAX,
  chercherSimilaires,
  preparerRattachement,
  rejoindreTicket,
  texteRecherche,
  verifierRattachement,
  versSuggestion,
} = await import('../../src/services/doublonService.js');
const { Ticket } = await import('../../src/models/index.js');

const CLIENT = { id: '665a1f0c2b7e4a0000000001', role: 'CLIENT' };
const AUTRE_CLIENT = '665a1f0c2b7e4a0000000002';
const TICKET_ID = '665a1f0c2b7e4a00000000a1';

// Ticket complet tel qu'il est en base : tout ce qui ne doit jamais sortir d'une suggestion
function ticketComplet(champs = {}) {
  return {
    _id: TICKET_ID,
    numero: 27,
    titre: 'Coupure VPN sur le site de Lyon',
    description: 'Que se passe-t-il ?\nLe VPN coupe toutes les 5 minutes',
    service: { _id: '665a1f0c2b7e4a0000000051', nom: 'VPN' },
    statut: 'NOUVEAU',
    createdAt: new Date('2026-11-20T09:00:00Z'),
    demandeur: AUTRE_CLIENT,
    technicien: '665a1f0c2b7e4a0000000009',
    suiveurs: [],
    enCopie: [],
    commentaires: [{ texte: 'Bonjour' }],
    piecesJointes: [{ nomOriginal: 'capture.png' }],
    historique: [],
    score: 1.5,
    ...champs,
  };
}

// Simule une requête Mongoose chaînable (select, populate, sort, limit, lean)
function requete(resultat, appels = {}) {
  const chaine = {
    select: (champs) => ((appels.select = champs), chaine),
    populate: () => chaine,
    sort: (tri) => ((appels.sort = tri), chaine),
    limit: (n) => ((appels.limit = n), chaine),
    lean: async () => resultat,
  };
  return chaine;
}

afterEach(() => mock.restoreAll());

describe('texteRecherche', () => {
  it('ne cherche rien sous 3 caractères (espaces ignorés)', () => {
    assert.equal(texteRecherche(undefined), null);
    assert.equal(texteRecherche(''), null);
    assert.equal(texteRecherche('  vp  '), null);
    assert.equal(texteRecherche('vpn'), 'vpn');
  });

  it('neutralise les guillemets et le tiret, qui ont un sens pour $text', () => {
    assert.equal(texteRecherche('wi-fi "coupé'), 'wi fi  coupé');
    assert.equal(texteRecherche('-vpn'), 'vpn');
  });

  it('refuse un titre qui n’est pas un texte (paramètre répété)', () => {
    assert.throws(() => texteRecherche(['vpn', 'erp']), { status: 400 });
  });

  it('coupe un texte démesuré à la longueur d’un titre', () => {
    assert.equal(texteRecherche('a'.repeat(500)).length, 120);
  });
});

describe('versSuggestion (plan A du cadrage 9.3)', () => {
  it('ne renvoie que le titre, le service, le statut et la date d’ouverture', () => {
    const suggestion = versSuggestion(ticketComplet(), CLIENT);
    assert.deepEqual(suggestion, {
      _id: TICKET_ID,
      titre: 'Coupure VPN sur le site de Lyon',
      service: { nom: 'VPN' },
      statut: 'NOUVEAU',
      createdAt: new Date('2026-11-20T09:00:00Z'),
      dejaConcerne: false,
    });
  });

  it('ne divulgue ni description, ni demandeur, ni commentaires, ni pièces jointes, ni concernés', () => {
    const suggestion = versSuggestion(ticketComplet({ suiveurs: [AUTRE_CLIENT] }), CLIENT);
    for (const champ of [
      'description',
      'demandeur',
      'technicien',
      'commentaires',
      'piecesJointes',
      'suiveurs',
      'enCopie',
      'historique',
      'numero',
      'concernes',
    ]) {
      assert.equal(champ in suggestion, false, champ);
    }
  });

  it('signale un ticket que le client suit déjà (demandeur, suiveur ou en copie)', () => {
    assert.equal(
      versSuggestion(ticketComplet({ demandeur: CLIENT.id }), CLIENT).dejaConcerne,
      true,
    );
    assert.equal(
      versSuggestion(ticketComplet({ suiveurs: [CLIENT.id] }), CLIENT).dejaConcerne,
      true,
    );
    assert.equal(
      versSuggestion(ticketComplet({ enCopie: [CLIENT.id] }), CLIENT).dejaConcerne,
      true,
    );
  });
});

describe('chercherSimilaires', () => {
  it('ne cherche pas en base sous 3 caractères', async () => {
    const find = mock.method(Ticket, 'find', () => requete([]));
    assert.deepEqual(await chercherSimilaires('vp', CLIENT), []);
    assert.equal(find.mock.callCount(), 0);
  });

  it('cherche les tickets ouverts par l’index textuel, 3 au plus, les plus proches d’abord', async () => {
    const appels = {};
    const find = mock.method(Ticket, 'find', () => requete([ticketComplet()], appels));
    const suggestions = await chercherSimilaires('vpn ne marche plus', CLIENT);

    const [filtre] = find.mock.calls[0].arguments;
    assert.deepEqual(filtre, {
      $text: { $search: 'vpn ne marche plus' },
      statut: { $nin: ['TERMINE', 'ABANDONNE'] },
    });
    assert.equal(appels.limit, SUGGESTIONS_MAX);
    assert.equal(SUGGESTIONS_MAX, 3);
    assert.deepEqual(appels.sort, { score: { $meta: 'textScore' } });
    // Projection : jamais la description, les commentaires ni les pièces jointes
    assert.doesNotMatch(appels.select, /description|commentaires|piecesJointes|historique/);
    assert.equal(suggestions.length, 1);
    assert.equal('description' in suggestions[0], false);
  });
});

describe('verifierRattachement', () => {
  it('ticket inexistant : 404', () => {
    assert.throws(() => verifierRattachement(null, CLIENT), { status: 404 });
  });

  it('ticket clos (terminé ou abandonné) : 409, on déclare un nouveau ticket', () => {
    for (const statut of ['TERMINE', 'ABANDONNE']) {
      assert.throws(() => verifierRattachement(ticketComplet({ statut }), CLIENT), {
        status: 409,
      });
    }
  });

  it('son propre ticket : 409', () => {
    assert.throws(() => verifierRattachement(ticketComplet({ demandeur: CLIENT.id }), CLIENT), {
      status: 409,
    });
  });

  it('ticket ouvert d’un autre demandeur : accepté, quel que soit le statut ouvert', () => {
    for (const statut of ['NOUVEAU', 'EN_COURS', 'EN_ATTENTE_DEMANDEUR']) {
      assert.equal(verifierRattachement(ticketComplet({ statut }), CLIENT), false);
    }
  });

  it('déjà suiveur : accepté sans nouvel effet', () => {
    assert.equal(verifierRattachement(ticketComplet({ suiveurs: [CLIENT.id] }), CLIENT), true);
  });
});

describe('preparerRattachement', () => {
  const maintenant = new Date('2026-11-20T10:00:00Z');
  const { filtre, miseAJour } = preparerRattachement(TICKET_ID, CLIENT, maintenant);

  it('n’écrit que si le ticket est encore ouvert et le client pas encore suiveur', () => {
    assert.deepEqual(filtre, {
      _id: TICKET_ID,
      statut: { $nin: ['TERMINE', 'ABANDONNE'] },
      demandeur: { $ne: CLIENT.id },
      suiveurs: { $ne: CLIENT.id },
    });
  });

  it('ajoute le suiveur sans doublon et trace un doublon évité dans l’historique', () => {
    assert.deepEqual(miseAJour.$addToSet, { suiveurs: CLIENT.id });
    assert.deepEqual(miseAJour.$push.historique, {
      auteur: CLIENT.id,
      champ: CHAMP_CONCERNE,
      ancienneValeur: null,
      nouvelleValeur: CLIENT.id,
      date: maintenant,
    });
  });

  it('ne crée pas de ticket et ne touche ni au statut ni à la priorité', () => {
    assert.equal(miseAJour.$set, undefined);
  });
});

describe('rejoindreTicket', () => {
  it('identifiant invalide : 404 sans lecture en base', async () => {
    const findById = mock.method(Ticket, 'findById', () => requete(null));
    await assert.rejects(rejoindreTicket('abc', CLIENT), { status: 404 });
    assert.equal(findById.mock.callCount(), 0);
  });

  it('rattache le client et renvoie la référence et le nombre de concernés', async () => {
    mock.method(Ticket, 'findById', () => requete(ticketComplet({ suiveurs: [AUTRE_CLIENT] })));
    const ecriture = mock.method(Ticket, 'findOneAndUpdate', () =>
      requete(ticketComplet({ suiveurs: [AUTRE_CLIENT, CLIENT.id] })),
    );
    const resultat = await rejoindreTicket(TICKET_ID, CLIENT);
    assert.equal(ecriture.mock.callCount(), 1);
    assert.deepEqual(resultat, { _id: TICKET_ID, reference: 'VIG-0027', concernes: 3 });
  });

  it('déjà suiveur : idempotent, aucune écriture (pas compté deux fois)', async () => {
    mock.method(Ticket, 'findById', () => requete(ticketComplet({ suiveurs: [CLIENT.id] })));
    const ecriture = mock.method(Ticket, 'findOneAndUpdate', () => requete(null));
    const resultat = await rejoindreTicket(TICKET_ID, CLIENT);
    assert.equal(ecriture.mock.callCount(), 0);
    assert.equal(resultat.concernes, 2);
  });

  it('double clic : le second appel trouve le client déjà suiveur et réussit', async () => {
    let lectures = 0;
    mock.method(Ticket, 'findById', () =>
      requete(ticketComplet({ suiveurs: lectures++ === 0 ? [] : [CLIENT.id] })),
    );
    mock.method(Ticket, 'findOneAndUpdate', () => requete(null));
    const resultat = await rejoindreTicket(TICKET_ID, CLIENT);
    assert.equal(resultat.concernes, 2);
  });

  it('ticket clos entre la lecture et l’écriture : 409', async () => {
    let lectures = 0;
    mock.method(Ticket, 'findById', () =>
      requete(ticketComplet({ statut: lectures++ === 0 ? 'EN_COURS' : 'TERMINE' })),
    );
    mock.method(Ticket, 'findOneAndUpdate', () => requete(null));
    await assert.rejects(rejoindreTicket(TICKET_ID, CLIENT), { status: 409 });
  });
});
