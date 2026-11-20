import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import jwt from 'jsonwebtoken';

process.env.MONGODB_URI ??= 'mongodb://localhost:27017/vigie-test';
process.env.JWT_SECRET ??= 'secret-de-test';

const { authentifierSocket, couperAExpiration } = await import('../../src/socket/authSocket.js');
const { creerJeton } = await import('../../src/services/jetonService.js');

const ID = '665a1f0c2b7e4a0012345678';
const compteActif = async () => ({ role: 'GESTIONNAIRE', actif: true });

// Simule le socket reçu par un middleware Socket.io
function fauxSocket(jeton) {
  return { handshake: { auth: jeton === undefined ? {} : { jeton } }, data: {} };
}

// Appelle le middleware et renvoie l'erreur passée à next (null si la connexion est acceptée)
async function connecter(socket, charger = compteActif) {
  let erreur;
  await authentifierSocket(socket, (err) => (erreur = err ?? null), charger);
  return erreur;
}

describe('authentifierSocket (handshake)', () => {
  it('refuse une connexion sans jeton', async () => {
    const erreur = await connecter(fauxSocket());
    assert.equal(erreur.message, 'Authentification requise');
  });

  it('refuse un jeton invalide ou signé avec un autre secret', async () => {
    assert.equal(
      (await connecter(fauxSocket('pas-un-jeton'))).message,
      'Session invalide ou expirée',
    );
    const fauxJeton = jwt.sign({ role: 'ADMIN' }, 'autre-secret', { subject: ID });
    assert.equal((await connecter(fauxSocket(fauxJeton))).message, 'Session invalide ou expirée');
  });

  it('refuse un jeton expiré', async () => {
    const expire = jwt.sign({ role: 'CLIENT' }, process.env.JWT_SECRET, {
      subject: ID,
      expiresIn: -10,
    });
    assert.equal((await connecter(fauxSocket(expire))).message, 'Session invalide ou expirée');
  });

  it('refuse un jeton sans date d’expiration', async () => {
    const sansFin = jwt.sign({ role: 'CLIENT' }, process.env.JWT_SECRET, { subject: ID });
    assert.equal((await connecter(fauxSocket(sansFin))).message, 'Session invalide ou expirée');
  });

  it('accepte un jeton valide et lit identité et rôle dans le jeton', async () => {
    const socket = fauxSocket(creerJeton({ _id: ID, role: 'GESTIONNAIRE' }));
    assert.equal(await connecter(socket), null);
    assert.deepEqual(socket.data.utilisateur, { id: ID, role: 'GESTIONNAIRE' });
    assert.ok(socket.data.expiration > Date.now());
  });

  it('refuse un compte désactivé ou supprimé', async () => {
    const jeton = creerJeton({ _id: ID, role: 'GESTIONNAIRE' });
    const desactive = async () => ({ role: 'GESTIONNAIRE', actif: false });
    assert.equal(
      (await connecter(fauxSocket(jeton), desactive)).message,
      'Session invalide ou expirée',
    );
    assert.equal(
      (await connecter(fauxSocket(jeton), async () => null)).message,
      'Session invalide ou expirée',
    );
  });

  it('refuse un jeton dont le rôle a changé depuis sa création', async () => {
    // Le jeton dit GESTIONNAIRE, mais l'ADMIN l'a repassé en CLIENT
    const jeton = creerJeton({ _id: ID, role: 'GESTIONNAIRE' });
    const retrograde = async () => ({ role: 'CLIENT', actif: true });
    assert.equal(
      (await connecter(fauxSocket(jeton), retrograde)).message,
      'Session invalide ou expirée',
    );
  });

  it('ne révèle pas le détail d’une erreur de base de données', async () => {
    const jeton = creerJeton({ _id: ID, role: 'CLIENT' });
    const enPanne = async () => {
      throw new Error('connexion MongoDB perdue');
    };
    const console_error = console.error;
    console.error = () => {}; // l'erreur est journalisée côté serveur : on ne pollue pas la sortie
    try {
      assert.equal((await connecter(fauxSocket(jeton), enPanne)).message, 'Erreur interne');
    } finally {
      console.error = console_error;
    }
  });
});

describe('couperAExpiration', () => {
  it('ferme la connexion à l’expiration du jeton', async (t) => {
    t.mock.timers.enable({ apis: ['setTimeout', 'Date'] });
    let ferme = false;
    const socket = {
      data: { expiration: Date.now() + 60_000 },
      disconnect: () => (ferme = true),
      on: () => {},
    };
    couperAExpiration(socket);
    t.mock.timers.tick(59_999);
    assert.equal(ferme, false);
    t.mock.timers.tick(1);
    assert.equal(ferme, true);
  });

  it('annule la minuterie quand le client se déconnecte avant', (t) => {
    t.mock.timers.enable({ apis: ['setTimeout', 'Date'] });
    let ferme = false;
    let surDeconnexion;
    const socket = {
      data: { expiration: Date.now() + 60_000 },
      disconnect: () => (ferme = true),
      on: (evenement, fn) => (surDeconnexion = fn),
    };
    couperAExpiration(socket);
    surDeconnexion();
    t.mock.timers.tick(60_000);
    assert.equal(ferme, false);
  });
});
