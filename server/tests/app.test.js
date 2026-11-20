import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';

process.env.MONGODB_URI ??= 'mongodb://localhost:27017/vigie-test';
process.env.JWT_SECRET ??= 'secret-de-test';

const { app } = await import('../src/app.js');

// Serveur HTTP réel sur un port libre, sans base de données
let serveur;
let base;
before(async () => {
  serveur = app.listen(0);
  await new Promise((resolve) => serveur.once('listening', resolve));
  base = `http://localhost:${serveur.address().port}/api`;
});
after(() => serveur.close());

async function appeler(chemin, options = {}) {
  const reponse = await fetch(base + chemin, options);
  return { status: reponse.status, corps: await reponse.json() };
}

describe('routage de l’API', () => {
  it('/api/health est public', async () => {
    const { status, corps } = await appeler('/health');
    assert.equal(status, 200);
    assert.equal(corps.status, 'ok');
  });

  it('une adresse inconnue répond 404, même sans jeton', async () => {
    for (const chemin of ['/inconnue', '/login', '/auth/login']) {
      const { status, corps } = await appeler(chemin, { method: 'POST' });
      assert.equal(status, 404, chemin);
      assert.equal(corps.message, 'Route introuvable');
    }
  });

  it('la connexion appelée en GET répond 404 (seul POST existe)', async () => {
    const { status } = await appeler('/auth/connexion');
    assert.equal(status, 404);
  });

  it('/api/auth/moi exige un jeton (401)', async () => {
    const { status, corps } = await appeler('/auth/moi');
    assert.equal(status, 401);
    assert.equal(corps.message, 'Authentification requise');
  });

  it('le renouvellement du jeton exige un jeton valide (401)', async () => {
    const { status } = await appeler('/auth/renouveler', { method: 'POST' });
    assert.equal(status, 401);
    const invalide = await appeler('/auth/renouveler', {
      method: 'POST',
      headers: { Authorization: 'Bearer jeton-invalide' },
    });
    assert.equal(invalide.status, 401);
  });

  it('la connexion refuse un corps incomplet (400)', async () => {
    const { status } = await appeler('/auth/connexion', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{}',
    });
    assert.equal(status, 400);
  });

  it('un JSON mal formé répond 400 et non 500', async () => {
    const { status, corps } = await appeler('/auth/connexion', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{oups',
    });
    assert.equal(status, 400);
    assert.equal(corps.message, 'Requête invalide');
  });
});

describe('documentation de l’API', () => {
  it('/api/docs affiche Swagger UI sans jeton', async () => {
    // Swagger UI redirige /api/docs vers /api/docs/ : fetch suit la redirection
    const reponse = await fetch(`${base}/docs`);
    assert.equal(reponse.status, 200);
    assert.match(reponse.headers.get('content-type'), /text\/html/);
  });

  it('/api/docs/openapi.json renvoie la spécification sans jeton', async () => {
    const { status, corps } = await appeler('/docs/openapi.json');
    assert.equal(status, 200);
    assert.match(corps.openapi, /^3\./);
  });
});

describe('droits sur /api/tickets (sans base : les middlewares répondent avant)', () => {
  const ID = '665a1f0c2b7e4a0000000001';
  const entetes = async (role) => {
    const { creerJeton } = await import('../src/services/jetonService.js');
    return {
      Authorization: `Bearer ${creerJeton({ _id: ID, role })}`,
      'Content-Type': 'application/json',
    };
  };

  it('exige un jeton (401)', async () => {
    assert.equal((await appeler('/tickets')).status, 401);
    assert.equal((await appeler('/tickets', { method: 'POST' })).status, 401);
  });

  it('le LECTEUR ne crée pas de ticket (403)', async () => {
    const { status } = await appeler('/tickets', {
      method: 'POST',
      headers: await entetes('LECTEUR'),
      body: '{}',
    });
    assert.equal(status, 403);
  });

  it('un CLIENT ne corrige pas le domaine (403)', async () => {
    const { status } = await appeler(`/tickets/${ID}/domaine`, {
      method: 'PATCH',
      headers: await entetes('CLIENT'),
      body: JSON.stringify({ domaine: 'RESEAU' }),
    });
    assert.equal(status, 403);
  });

  it('seul le support change le statut ou prend en charge (403 pour CLIENT et LECTEUR)', async () => {
    for (const role of ['CLIENT', 'LECTEUR']) {
      const statut = await appeler(`/tickets/${ID}/statut`, {
        method: 'PATCH',
        headers: await entetes(role),
        body: JSON.stringify({ statut: 'ABANDONNE', motif: 'test' }),
      });
      const prise = await appeler(`/tickets/${ID}/prise-en-charge`, {
        method: 'POST',
        headers: await entetes(role),
      });
      assert.equal(statut.status, 403, role);
      assert.equal(prise.status, 403, role);
    }
  });

  it('une création invalide répond 400 sans toucher à la base', async () => {
    const { status, corps } = await appeler('/tickets', {
      method: 'POST',
      headers: await entetes('CLIENT'),
      body: JSON.stringify({ titre: 'VPN', priorite: 'CRITIQUE' }),
    });
    assert.equal(status, 400);
    assert.match(corps.message, /priorite/);
  });
});
