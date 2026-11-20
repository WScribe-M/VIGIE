import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { DOMAINES, IMPACTS, PRIORITES, ROLES, STATUTS, URGENCES } from '../models/constantes.js';
import { specificationApi } from './specificationApi.js';

// Le YAML ne peut pas importer constantes.js : ces tests évitent que la documentation
// annonce des valeurs ou des liens qui n'existent plus.

// Toutes les valeurs de "$ref" présentes dans la spécification
function references(noeud, trouvees = []) {
  if (Array.isArray(noeud)) {
    noeud.forEach((element) => references(element, trouvees));
  } else if (noeud && typeof noeud === 'object') {
    for (const [cle, valeur] of Object.entries(noeud)) {
      if (cle === '$ref') {
        trouvees.push(valeur);
      } else {
        references(valeur, trouvees);
      }
    }
  }
  return trouvees;
}

describe('documentation OpenAPI', () => {
  it('est une spécification OpenAPI 3', () => {
    assert.match(specificationApi.openapi, /^3\./);
    assert.ok(Object.keys(specificationApi.paths).length > 0);
  });

  it('chaque $ref pointe vers un élément qui existe', () => {
    for (const ref of references(specificationApi)) {
      const cible = ref
        .replace(/^#\//, '')
        .split('/')
        .reduce((noeud, partie) => noeud?.[partie], specificationApi);
      assert.ok(cible, `${ref} est introuvable`);
    }
  });

  it('les rôles sont ceux de constantes.js', () => {
    assert.deepEqual(specificationApi.components.schemas.Role.enum, ROLES);
  });

  it('les domaines sont ceux de constantes.js', () => {
    assert.deepEqual(specificationApi.components.schemas.Domaine.enum, DOMAINES);
  });

  it('impacts, urgences, priorités et statuts sont ceux de constantes.js', () => {
    const { schemas } = specificationApi.components;
    assert.deepEqual(schemas.Impact.enum, IMPACTS);
    assert.deepEqual(schemas.Urgence.enum, URGENCES);
    assert.deepEqual(schemas.Priorite.enum, PRIORITES);
    assert.deepEqual(schemas.Statut.enum, STATUTS);
  });

  it('seules la santé et la connexion sont publiques', () => {
    const publiques = [];
    for (const [chemin, methodes] of Object.entries(specificationApi.paths)) {
      for (const [methode, operation] of Object.entries(methodes)) {
        if (Array.isArray(operation.security) && operation.security.length === 0) {
          publiques.push(`${methode.toUpperCase()} ${chemin}`);
        }
      }
    }
    assert.deepEqual(publiques.sort(), ['GET /health', 'POST /auth/connexion']);
  });
});
