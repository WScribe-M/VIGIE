import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  formaterNumero,
  lireNumero,
  prochainNumeroTicket,
} from '../../src/services/numeroService.js';

describe('numéro lisible des tickets', () => {
  it('formate sur quatre chiffres avec le préfixe VIG', () => {
    assert.equal(formaterNumero(1), 'VIG-0001');
    assert.equal(formaterNumero(42), 'VIG-0042');
    assert.equal(formaterNumero(12345), 'VIG-12345');
  });

  it('lit un numéro saisi de plusieurs façons', () => {
    assert.equal(lireNumero('VIG-0042'), 42);
    assert.equal(lireNumero('vig42'), 42);
    assert.equal(lireNumero(' 42 '), 42);
    assert.equal(lireNumero('VPN en panne'), null);
    assert.equal(lireNumero(''), null);
    assert.equal(lireNumero(undefined), null);
  });

  it('incrémente le compteur en une seule opération atomique', async () => {
    let appel;
    const modele = {
      async findOneAndUpdate(filtre, modification, options) {
        appel = { filtre, modification, options };
        return { _id: 'tickets', valeur: 7 };
      },
    };

    assert.equal(await prochainNumeroTicket(modele), 7);
    assert.deepEqual(appel.filtre, { _id: 'tickets' });
    assert.deepEqual(appel.modification, { $inc: { valeur: 1 } });
    // upsert : le premier ticket crée le compteur ; le document renvoyé est celui d'après $inc
    assert.equal(appel.options.upsert, true);
    assert.equal(appel.options.returnDocument, 'after');
  });
});
