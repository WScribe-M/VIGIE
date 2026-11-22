import assert from 'node:assert/strict';
import { afterEach, describe, it, mock } from 'node:test';

process.env.MONGODB_URI ??= 'mongodb://localhost:27017/vigie-test';
process.env.JWT_SECRET ??= 'secret-de-test';

const {
  COMMENTAIRE_MAX,
  ajouterCommentaire,
  attribuerTechnicien,
  preparerAttribution,
  verifierCommentaire,
} = await import('../../src/services/ticketInteractionService.js');
const { Ticket, User } = await import('../../src/models/index.js');

// Assignation et commentaires (VIGIE-29), sans base de données : les requêtes Mongoose sont simulées

const TICKET_ID = '665a1f0c2b7e4a00000000a1';
const SOPHIE = '665a1f0c2b7e4a0000000011';
const MAMADOU = '665a1f0c2b7e4a0000000012';
const GESTIONNAIRE = { id: '665a1f0c2b7e4a0000000013', role: 'GESTIONNAIRE' };
const CLIENT = { id: '665a1f0c2b7e4a0000000001', role: 'CLIENT' };
const MAINTENANT = new Date('2026-11-20T10:00:00Z');

// Requête Mongoose chaînable (select, populate, sort, lean) qui renvoie `resultat`
function requete(resultat) {
  const chaine = {
    select: () => chaine,
    populate: () => chaine,
    sort: () => chaine,
    lean: async () => resultat,
  };
  return chaine;
}

// Ticket tel que le relit lireTicket après l'écriture
function ticketLu(champs = {}) {
  return {
    _id: TICKET_ID,
    numero: 27,
    titre: 'Coupure VPN',
    statut: 'EN_COURS',
    demandeur: { _id: CLIENT.id, prenom: 'Awa', nom: 'Diallo' },
    vuParSupportLe: MAINTENANT,
    suiveurs: [],
    enCopie: [],
    historique: [],
    commentaires: [],
    ...champs,
  };
}

afterEach(() => mock.restoreAll());

describe('preparerAttribution', () => {
  it('ticket NOUVEAU : passe En cours, avec le statut puis le technicien dans l’historique', () => {
    const { filtre, miseAJour } = preparerAttribution(
      { _id: TICKET_ID, statut: 'NOUVEAU', technicien: null },
      SOPHIE,
      GESTIONNAIRE,
      MAINTENANT,
    );
    // État attendu dans le filtre : rien n'est écrit si un collègue a agi entre-temps
    assert.deepEqual(filtre, { _id: TICKET_ID, statut: 'NOUVEAU', technicien: null });
    assert.deepEqual(miseAJour.$set, {
      technicien: SOPHIE,
      statut: 'EN_COURS',
      dateStatut: MAINTENANT,
      datePriseEnCharge: MAINTENANT,
    });
    const entrees = miseAJour.$push.historique.$each;
    assert.deepEqual(
      entrees.map((e) => [e.champ, e.ancienneValeur, e.nouvelleValeur]),
      [
        ['statut', 'NOUVEAU', 'EN_COURS'],
        ['technicien', null, SOPHIE],
      ],
    );
    assert.ok(entrees.every((e) => e.auteur === GESTIONNAIRE.id && e.motif === undefined));
  });

  it('ticket En cours : change seulement le technicien, l’ancien est gardé dans l’historique', () => {
    const { filtre, miseAJour } = preparerAttribution(
      { _id: TICKET_ID, statut: 'EN_COURS', technicien: MAMADOU },
      SOPHIE,
      GESTIONNAIRE,
      MAINTENANT,
    );
    assert.equal(filtre.technicien, MAMADOU);
    assert.deepEqual(miseAJour.$set, { technicien: SOPHIE });
    const [entree] = miseAJour.$push.historique.$each;
    assert.equal(entree.ancienneValeur, MAMADOU);
    assert.equal(entree.nouvelleValeur, SOPHIE);
  });

  it('refuse un ticket clos (409) et le technicien déjà affecté (400)', () => {
    for (const statut of ['TERMINE', 'ABANDONNE']) {
      assert.throws(() => preparerAttribution({ statut }, SOPHIE, GESTIONNAIRE, MAINTENANT), {
        status: 409,
      });
    }
    assert.throws(
      () =>
        preparerAttribution(
          { statut: 'EN_COURS', technicien: SOPHIE },
          SOPHIE,
          GESTIONNAIRE,
          MAINTENANT,
        ),
      { status: 400 },
    );
  });
});

describe('attribuerTechnicien', () => {
  it('réservée au support : 403 pour un client ou un lecteur', async () => {
    for (const role of ['CLIENT', 'LECTEUR']) {
      await assert.rejects(attribuerTechnicien(TICKET_ID, SOPHIE, { id: 'x', role }), {
        status: 403,
      });
    }
  });

  it('le responsable DSI (GESTIONNAIRE) peut attribuer : cadrage §2', async () => {
    mock.method(User, 'findOne', () => requete({ _id: SOPHIE }));
    mock.method(Ticket, 'findById', () =>
      requete(ticketLu({ statut: 'NOUVEAU', technicien: null })),
    );
    const ecriture = mock.method(Ticket, 'findOneAndUpdate', () =>
      requete({ _id: TICKET_ID, statut: 'EN_COURS' }),
    );
    const ticket = await attribuerTechnicien(TICKET_ID, SOPHIE, GESTIONNAIRE, MAINTENANT);
    assert.equal(ecriture.mock.callCount(), 1);
    assert.equal(ticket.reference, 'VIG-0027');
  });

  it('technicien invalide, inactif ou non gestionnaire : 400', async () => {
    await assert.rejects(attribuerTechnicien(TICKET_ID, 'abc', GESTIONNAIRE), { status: 400 });
    // findOne filtre sur role GESTIONNAIRE et actif : personne trouvé
    const recherche = mock.method(User, 'findOne', () => requete(null));
    await assert.rejects(attribuerTechnicien(TICKET_ID, SOPHIE, GESTIONNAIRE), { status: 400 });
    assert.deepEqual(recherche.mock.calls[0].arguments[0], {
      _id: SOPHIE,
      role: 'GESTIONNAIRE',
      actif: true,
    });
  });

  it('ticket introuvable : 404', async () => {
    await assert.rejects(attribuerTechnicien('abc', SOPHIE, GESTIONNAIRE), { status: 404 });
    mock.method(User, 'findOne', () => requete({ _id: SOPHIE }));
    mock.method(Ticket, 'findById', () => requete(null));
    await assert.rejects(attribuerTechnicien(TICKET_ID, SOPHIE, GESTIONNAIRE), { status: 404 });
  });

  it('un collègue a agi entre la lecture et l’écriture : 409', async () => {
    mock.method(User, 'findOne', () => requete({ _id: SOPHIE }));
    mock.method(Ticket, 'findById', () =>
      requete(ticketLu({ statut: 'NOUVEAU', technicien: null })),
    );
    mock.method(Ticket, 'findOneAndUpdate', () => requete(null));
    await assert.rejects(attribuerTechnicien(TICKET_ID, SOPHIE, GESTIONNAIRE), { status: 409 });
  });
});

describe('verifierCommentaire', () => {
  it('nettoie le texte', () => {
    assert.equal(verifierCommentaire({ texte: '  Le VPN remarche  ' }), 'Le VPN remarche');
  });

  it('refuse un commentaire vide, absent ou trop long (400)', () => {
    for (const donnees of [undefined, {}, { texte: '   ' }, { texte: 42 }]) {
      assert.throws(() => verifierCommentaire(donnees), { status: 400 });
    }
    assert.throws(() => verifierCommentaire({ texte: 'a'.repeat(COMMENTAIRE_MAX + 1) }), {
      status: 400,
    });
    assert.equal(
      verifierCommentaire({ texte: 'a'.repeat(COMMENTAIRE_MAX) }).length,
      COMMENTAIRE_MAX,
    );
  });
});

describe('ajouterCommentaire', () => {
  it('le lecteur est en lecture seule : 403', async () => {
    await assert.rejects(
      ajouterCommentaire(TICKET_ID, { texte: 'Bonjour' }, { id: 'x', role: 'LECTEUR' }),
      {
        status: 403,
      },
    );
  });

  it('un client ne commente que les tickets qu’il voit : ticket invisible ou inexistant, 404', async () => {
    const ecriture = mock.method(Ticket, 'findOneAndUpdate', () => requete(null));
    await assert.rejects(ajouterCommentaire(TICKET_ID, { texte: 'Bonjour' }, CLIENT), {
      status: 404,
    });
    // Le filtre de visibilité est dans la mise à jour : demandeur, suiveur ou en copie
    const [filtre] = ecriture.mock.calls[0].arguments;
    assert.deepEqual(filtre, {
      _id: TICKET_ID,
      $or: [{ demandeur: CLIENT.id }, { suiveurs: CLIENT.id }, { enCopie: CLIENT.id }],
    });
  });

  it('ajoute le commentaire avec l’auteur du jeton et renvoie la fiche', async () => {
    const ecriture = mock.method(Ticket, 'findOneAndUpdate', () =>
      requete({ _id: TICKET_ID, statut: 'EN_COURS' }),
    );
    mock.method(Ticket, 'findById', () => requete(ticketLu()));
    const ticket = await ajouterCommentaire(TICKET_ID, { texte: ' Merci ' }, CLIENT, MAINTENANT);
    const [, miseAJour] = ecriture.mock.calls[0].arguments;
    assert.deepEqual(miseAJour, {
      $push: { commentaires: { auteur: CLIENT.id, texte: 'Merci', date: MAINTENANT } },
    });
    assert.equal(ticket.reference, 'VIG-0027');
  });
});
