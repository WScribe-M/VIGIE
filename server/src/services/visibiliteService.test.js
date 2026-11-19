import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { filtreTicketsVisibles, peutVoirTicket } from './visibiliteService.js';

const ticket = { demandeur: 'demandeur', suiveurs: ['suiveur'], enCopie: ['copie'] };

describe('peutVoirTicket', () => {
  for (const role of ['GESTIONNAIRE', 'ADMIN', 'LECTEUR']) {
    it(`${role} voit tous les tickets`, () => {
      assert.equal(peutVoirTicket({ id: 'autre', role }, ticket), true);
    });
  }

  it('le CLIENT demandeur voit son ticket', () => {
    assert.equal(peutVoirTicket({ id: 'demandeur', role: 'CLIENT' }, ticket), true);
  });

  it('le CLIENT suiveur ou en copie voit le ticket', () => {
    assert.equal(peutVoirTicket({ id: 'suiveur', role: 'CLIENT' }, ticket), true);
    assert.equal(peutVoirTicket({ id: 'copie', role: 'CLIENT' }, ticket), true);
  });

  it('un autre CLIENT ne voit pas le ticket', () => {
    assert.equal(peutVoirTicket({ id: 'autre', role: 'CLIENT' }, ticket), false);
  });

  it('fonctionne avec des documents peuplés (populate) et des ObjectId', () => {
    const peuple = {
      demandeur: { _id: { toString: () => 'demandeur' } },
      suiveurs: [{ _id: 'suiveur' }],
      enCopie: [],
    };
    assert.equal(peutVoirTicket({ id: 'demandeur', role: 'CLIENT' }, peuple), true);
    assert.equal(peutVoirTicket({ id: 'suiveur', role: 'CLIENT' }, peuple), true);
    assert.equal(peutVoirTicket({ id: 'autre', role: 'CLIENT' }, peuple), false);
  });
});

describe('filtreTicketsVisibles', () => {
  it("n'ajoute aucun filtre pour GESTIONNAIRE, ADMIN et LECTEUR", () => {
    for (const role of ['GESTIONNAIRE', 'ADMIN', 'LECTEUR']) {
      assert.deepEqual(filtreTicketsVisibles({ id: 'x', role }), {});
    }
  });

  it('limite le CLIENT à ses tickets, ceux suivis et ceux en copie', () => {
    assert.deepEqual(filtreTicketsVisibles({ id: 'moi', role: 'CLIENT' }), {
      $or: [{ demandeur: 'moi' }, { suiveurs: 'moi' }, { enCopie: 'moi' }],
    });
  });
});
