import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

process.env.MONGODB_URI ??= 'mongodb://localhost:27017/vigie-test';
process.env.JWT_SECRET ??= 'secret-de-test';

const { quitterTicket, rejoindreTicket, roomsAutomatiques } = await import('./rooms.js');

const CLIENT = { id: '665a1f0c2b7e4a0000000001', role: 'CLIENT' };
const AUTRE_CLIENT = { id: '665a1f0c2b7e4a0000000002', role: 'CLIENT' };
const TICKET_ID = '665a1f0c2b7e4a00000000aa';

// Ticket tel que chargé pour la vérification : seulement les champs utiles à peutVoirTicket
const ticket = { demandeur: CLIENT.id, suiveurs: [], enCopie: [] };
const charger = async () => ticket;

// Simule un socket : garde la liste des rooms rejointes
function fauxSocket(utilisateur) {
  const rooms = new Set();
  return {
    data: { utilisateur },
    rooms,
    join: (room) => rooms.add(room),
    leave: (room) => rooms.delete(room),
  };
}

describe('roomsAutomatiques', () => {
  it('CLIENT : seulement sa room personnelle', () => {
    assert.deepEqual(roomsAutomatiques(CLIENT), [`user:${CLIENT.id}`]);
  });

  it('GESTIONNAIRE et ADMIN : support et pilotage', () => {
    for (const role of ['GESTIONNAIRE', 'ADMIN']) {
      assert.deepEqual(roomsAutomatiques({ id: '1', role }), ['user:1', 'support', 'pilotage']);
    }
  });

  it('LECTEUR : pilotage, mais pas support', () => {
    assert.deepEqual(roomsAutomatiques({ id: '1', role: 'LECTEUR' }), ['user:1', 'pilotage']);
  });
});

describe('rejoindreTicket', () => {
  it('le demandeur rejoint la room de son ticket', async () => {
    const socket = fauxSocket(CLIENT);
    assert.deepEqual(await rejoindreTicket(socket, TICKET_ID, charger), { ok: true });
    assert.ok(socket.rooms.has(`ticket:${TICKET_ID}`));
  });

  it('un suiveur et une personne en copie rejoignent la room', async () => {
    const suivi = async () => ({ demandeur: CLIENT.id, suiveurs: [AUTRE_CLIENT.id], enCopie: [] });
    const copie = async () => ({ demandeur: CLIENT.id, suiveurs: [], enCopie: [AUTRE_CLIENT.id] });
    assert.equal((await rejoindreTicket(fauxSocket(AUTRE_CLIENT), TICKET_ID, suivi)).ok, true);
    assert.equal((await rejoindreTicket(fauxSocket(AUTRE_CLIENT), TICKET_ID, copie)).ok, true);
  });

  it('un CLIENT ne rejoint pas le ticket d’un autre', async () => {
    const socket = fauxSocket(AUTRE_CLIENT);
    const reponse = await rejoindreTicket(socket, TICKET_ID, charger);
    assert.deepEqual(reponse, { ok: false, message: 'Ticket introuvable' });
    assert.equal(socket.rooms.size, 0);
  });

  it('GESTIONNAIRE, LECTEUR et ADMIN rejoignent tous les tickets', async () => {
    for (const role of ['GESTIONNAIRE', 'LECTEUR', 'ADMIN']) {
      const socket = fauxSocket({ id: '665a1f0c2b7e4a0000000009', role });
      assert.equal((await rejoindreTicket(socket, TICKET_ID, charger)).ok, true, role);
    }
  });

  it('ticket inexistant et ticket interdit donnent la même réponse', async () => {
    const inexistant = await rejoindreTicket(fauxSocket(CLIENT), TICKET_ID, async () => null);
    const interdit = await rejoindreTicket(fauxSocket(AUTRE_CLIENT), TICKET_ID, charger);
    assert.deepEqual(inexistant, interdit);
  });

  it('refuse un identifiant mal formé sans interroger la base', async () => {
    let appele = false;
    const espion = async () => {
      appele = true;
      return ticket;
    };
    // Un objet comme { $ne: null } tenterait une injection dans la requête MongoDB
    for (const id of ['abc', { $ne: null }, undefined, 'support']) {
      const socket = fauxSocket(CLIENT);
      assert.equal((await rejoindreTicket(socket, id, espion)).ok, false);
      assert.equal(socket.rooms.size, 0);
    }
    assert.equal(appele, false);
  });
});

describe('quitterTicket', () => {
  it('quitte la room du ticket', async () => {
    const socket = fauxSocket(CLIENT);
    await rejoindreTicket(socket, TICKET_ID, charger);
    assert.deepEqual(await quitterTicket(socket, TICKET_ID), { ok: true });
    assert.equal(socket.rooms.has(`ticket:${TICKET_ID}`), false);
  });

  it('ne permet pas de quitter une room qui n’est pas celle d’un ticket', async () => {
    const socket = fauxSocket({ id: '1', role: 'GESTIONNAIRE' });
    socket.rooms.add('support');
    assert.equal((await quitterTicket(socket, 'support')).ok, false);
    assert.ok(socket.rooms.has('support'));
  });
});
