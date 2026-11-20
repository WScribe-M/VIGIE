import { NOM_SERVICE_AUTRE } from '../models/constantes.js';
import mongoose from 'mongoose';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { COLLATION_NOM, Service } from '../models/Service.js';
// Les six services initiaux validés pour VIGIE-4.
export const SERVICES_INITIAUX = [
  { nom: 'VPN', domaine: 'RESEAU' },
  { nom: 'Messagerie', domaine: 'APPLICATIF' },
  { nom: 'ERP', domaine: 'APPLICATIF' },
  { nom: 'Imprimante', domaine: 'INFRASTRUCTURE' },
  { nom: 'Poste de travail', domaine: 'INFRASTRUCTURE' },
  { nom: NOM_SERVICE_AUTRE, domaine: 'A_QUALIFIER' },
];

export async function initialiserServices(modele = Service) {
  for (const service of SERVICES_INITIAUX) {
    await modele.updateOne(
      { nom: service.nom },
      {
        // Ne pas écraser les modifications faites par un ADMIN.
        $setOnInsert: {
          ...service,
          actif: true,
        },
      },
      // Même collation que l’index unique : sans elle, un « vpn » créé par l’ADMIN ne serait pas
      // retrouvé, le seed tenterait d’insérer « VPN » et l’index le refuserait (E11000).
      { upsert: true, collation: COLLATION_NOM },
    );
  }
}

// Importer ce fichier dans les tests ne doit pas lancer MongoDB.
const executionDirecte =
  process.argv[1] &&
  path.normalize(path.resolve(process.argv[1])).toLowerCase() ===
    path.normalize(fileURLToPath(import.meta.url)).toLowerCase();
if (executionDirecte) {
  try {
    const { connecterBase } = await import('../config/db.js');

    await connecterBase();
    await initialiserServices();

    console.log('Catalogue de services initialisé');
  } catch (erreur) {
    console.error('Initialisation impossible :', erreur.message);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
}
