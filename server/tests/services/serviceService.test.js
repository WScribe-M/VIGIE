import assert from 'node:assert/strict';
import test from 'node:test';
import {
  creerService,
  deduireDomaine,
  listerServices,
  modifierService,
} from '../../src/services/serviceService.js';
import { initialiserServices, SERVICES_INITIAUX } from '../../src/scripts/seedServices.js';
const ID = '507f1f77bcf86cd799439011';

// Simule la chaîne find().select().collation().sort().lean() de Mongoose
function requete(resultat) {
  const chaine = {
    select: () => chaine,
    collation: () => chaine,
    sort: () => chaine,
    lean: async () => resultat,
  };
  return chaine;
}

test('la liste publique exclut les services inactifs', async () => {
  let filtreRecu;

  const modele = {
    find(filtre) {
      filtreRecu = filtre;
      return requete([]);
    },
  };

  await listerServices({}, modele);

  assert.deepEqual(filtreRecu, { actif: true });
});

test('le service Autre apparaît en dernier dans le catalogue', async () => {
  const modele = {
    find() {
      return requete([
        { nom: 'Autre / je ne sais pas' },
        { nom: 'ERP' },
        { nom: 'Messagerie' },
        { nom: 'VPN' },
      ]);
    },
  };

  const services = await listerServices({}, modele);

  assert.deepEqual(
    services.map((service) => service.nom),
    ['ERP', 'Messagerie', 'VPN', 'Autre / je ne sais pas'],
  );
});

test('la liste ADMIN inclut les services inactifs', async () => {
  let filtreRecu;

  const modele = {
    find(filtre) {
      filtreRecu = filtre;
      return requete([]);
    },
  };

  await listerServices({ inclureInactifs: true }, modele);

  assert.deepEqual(filtreRecu, {});
});

test('un service valide peut être créé', async () => {
  const modele = {
    async create(donnees) {
      return donnees;
    },
  };

  const service = await creerService({ nom: ' VPN ', domaine: 'RESEAU' }, modele);

  assert.deepEqual(service, {
    nom: 'VPN',
    domaine: 'RESEAU',
    actif: true,
  });
});

test('un domaine inconnu est refusé', async () => {
  await assert.rejects(creerService({ nom: 'VPN', domaine: 'INCONNU' }), { status: 400 });
});

test('un nom vide est refusé', async () => {
  await assert.rejects(creerService({ nom: ' ', domaine: 'RESEAU' }), { status: 400 });
});

test('les champs supplémentaires sont refusés', async () => {
  await assert.rejects(
    creerService({
      nom: 'VPN',
      domaine: 'RESEAU',
      actif: false,
    }),
    { status: 400 },
  );
});

test('un nom en doublon retourne 409', async () => {
  const modele = {
    async create() {
      throw Object.assign(new Error('duplicate key'), {
        code: 11000,
      });
    },
  };

  await assert.rejects(creerService({ nom: 'VPN', domaine: 'RESEAU' }, modele), { status: 409 });
});

test('Autre doit conserver A_QUALIFIER', async () => {
  await assert.rejects(
    creerService({
      nom: 'Autre / je ne sais pas',
      domaine: 'RESEAU',
    }),
    { status: 400 },
  );
});

test('un service peut être désactivé', async () => {
  const service = {
    nom: 'VPN',
    domaine: 'RESEAU',
    actif: true,
    async save() {
      return this;
    },
  };

  const modele = {
    async findById() {
      return service;
    },
  };

  const resultat = await modifierService(ID, { actif: false }, modele);

  assert.equal(resultat.actif, false);
});

test('le domaine du service Autre ne peut pas changer', async () => {
  const modele = {
    async findById() {
      return {
        nom: 'Autre / je ne sais pas',
        domaine: 'A_QUALIFIER',
        actif: true,
      };
    },
  };

  await assert.rejects(modifierService(ID, { domaine: 'APPLICATIF' }, modele), { status: 400 });
});

test('le nom du service Autre est protégé', async () => {
  const modele = {
    async findById() {
      return {
        nom: 'Autre / je ne sais pas',
        domaine: 'A_QUALIFIER',
        actif: true,
      };
    },
  };

  await assert.rejects(modifierService(ID, { nom: 'Divers' }, modele), { status: 400 });
});
test('le service Autre ne peut pas être désactivé', async () => {
  const service = {
    nom: 'Autre / je ne sais pas',
    domaine: 'A_QUALIFIER',
    actif: true,
    async save() {
      return this;
    },
  };

  const modele = {
    async findById() {
      return service;
    },
  };

  await assert.rejects(modifierService(ID, { actif: false }, modele), { status: 400 });

  assert.equal(service.actif, true);
});
test('un service inexistant retourne 404', async () => {
  const modele = {
    async findById() {
      return null;
    },
  };

  await assert.rejects(modifierService(ID, { actif: false }, modele), { status: 404 });
});

test('un identifiant invalide retourne 400', async () => {
  await assert.rejects(deduireDomaine('id-invalide'), { status: 400 });
});

test('le domaine est déduit du service actif', async () => {
  const modele = {
    async findById() {
      return { domaine: 'RESEAU', actif: true };
    },
  };

  const domaine = await deduireDomaine(ID, modele);

  assert.equal(domaine, 'RESEAU');
});

test('Autre retourne A_QUALIFIER', async () => {
  const modele = {
    async findById() {
      return { domaine: 'A_QUALIFIER', actif: true };
    },
  };

  const domaine = await deduireDomaine(ID, modele);

  assert.equal(domaine, 'A_QUALIFIER');
});

test('un service désactivé est refusé', async () => {
  const modele = {
    async findById() {
      return { domaine: 'RESEAU', actif: false };
    },
  };

  await assert.rejects(deduireDomaine(ID, modele), { status: 400 });
});

test('un service introuvable ne peut pas être déduit', async () => {
  const modele = {
    async findById() {
      return null;
    },
  };

  await assert.rejects(deduireDomaine(ID, modele), { status: 404 });
});

test('le seed peut être relancé sans créer de doublons', async () => {
  const servicesEnBase = new Map();

  // Simulation de MongoDB pour tester sans base de données.
  const modele = {
    async updateOne(filtre, modification) {
      if (!servicesEnBase.has(filtre.nom)) {
        servicesEnBase.set(filtre.nom, { ...modification.$setOnInsert });
      }
    },
  };

  // On lance le seed deux fois.
  await initialiserServices(modele);
  await initialiserServices(modele);

  // On doit toujours avoir exactement six services.
  assert.equal(servicesEnBase.size, 6);
  assert.equal(SERVICES_INITIAUX.length, 6);

  // Le service Autre doit déclencher une qualification.
  assert.equal(servicesEnBase.get('Autre / je ne sais pas').domaine, 'A_QUALIFIER');

  // Une modification ADMIN ne doit pas être écrasée par le seed.
  servicesEnBase.get('VPN').domaine = 'INFRASTRUCTURE';

  await initialiserServices(modele);

  assert.equal(servicesEnBase.get('VPN').domaine, 'INFRASTRUCTURE');
});

test('le seed retrouve un service créé avec d’autres majuscules', async () => {
  // Simulation de l’index : avec la collation, « vpn » et « VPN » sont le même nom
  const servicesEnBase = new Map([['vpn', { nom: 'vpn', domaine: 'RESEAU' }]]);
  const modele = {
    async updateOne(filtre, modification, options) {
      assert.ok(options.collation, 'le seed doit utiliser la collation de l’index');
      const cle = filtre.nom.toLowerCase();
      if (!servicesEnBase.has(cle)) {
        servicesEnBase.set(cle, { ...modification.$setOnInsert });
      }
    },
  };

  await initialiserServices(modele);

  assert.equal(servicesEnBase.size, 6);
  assert.equal(servicesEnBase.get('vpn').nom, 'vpn');
});
