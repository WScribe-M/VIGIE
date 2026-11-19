import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

process.env.MONGODB_URI ??= 'mongodb://localhost:27017/vigie-test';
process.env.JWT_SECRET ??= 'secret-de-test';

const { authentifier, autoriser, interdireEcritureLecteur } = await import('./auth.js');
const { creerJeton } = await import('../services/jetonService.js');

// Simule req / res / next d'Express
function appeler(middleware, req) {
  const resultat = { status: null, body: null, suivant: false };
  const res = {
    status(code) {
      resultat.status = code;
      return this;
    },
    json(body) {
      resultat.body = body;
      return this;
    },
  };
  req.headers ??= {};
  middleware(req, res, () => (resultat.suivant = true));
  return resultat;
}

describe('authentifier', () => {
  it('refuse une requête sans jeton (401)', () => {
    const r = appeler(authentifier, {});
    assert.equal(r.status, 401);
    assert.equal(r.suivant, false);
  });

  it('refuse un jeton invalide (401)', () => {
    const r = appeler(authentifier, { headers: { authorization: 'Bearer faux.jeton.ici' } });
    assert.equal(r.status, 401);
  });

  it('accepte un jeton valide et remplit req.utilisateur depuis le jeton', () => {
    const jeton = creerJeton({ _id: 'abc123', role: 'CLIENT' });
    const req = { headers: { authorization: `Bearer ${jeton}` }, body: { role: 'ADMIN' } };
    const r = appeler(authentifier, req);
    assert.equal(r.suivant, true);
    // Le rôle envoyé dans le corps est ignoré
    assert.deepEqual(req.utilisateur, { id: 'abc123', role: 'CLIENT' });
  });
});

describe('autoriser', () => {
  it('laisse passer un rôle autorisé', () => {
    const r = appeler(autoriser('GESTIONNAIRE', 'ADMIN'), { utilisateur: { role: 'ADMIN' } });
    assert.equal(r.suivant, true);
  });

  it('refuse un rôle non autorisé (403)', () => {
    const r = appeler(autoriser('ADMIN'), { utilisateur: { role: 'CLIENT' } });
    assert.equal(r.status, 403);
    assert.equal(r.suivant, false);
  });
});

describe('interdireEcritureLecteur', () => {
  it('autorise la lecture au LECTEUR', () => {
    const r = appeler(interdireEcritureLecteur, {
      method: 'GET',
      utilisateur: { role: 'LECTEUR' },
    });
    assert.equal(r.suivant, true);
  });

  it('refuse toute écriture au LECTEUR (403)', () => {
    for (const method of ['POST', 'PUT', 'PATCH', 'DELETE']) {
      const r = appeler(interdireEcritureLecteur, { method, utilisateur: { role: 'LECTEUR' } });
      assert.equal(r.status, 403, method);
    }
  });

  it("n'affecte pas les autres rôles", () => {
    const r = appeler(interdireEcritureLecteur, {
      method: 'POST',
      utilisateur: { role: 'CLIENT' },
    });
    assert.equal(r.suivant, true);
  });
});
