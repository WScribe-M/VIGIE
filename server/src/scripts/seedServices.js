import mongoose from 'mongoose';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Service } from '../models/Service.js';
import { DOMAINES } from '../models/constantes.js';

const [RESEAU, INFRASTRUCTURE, APPLICATIF, , A_QUALIFIER] = DOMAINES;

// Les six services initiaux validés pour VIGIE-4.
export const SERVICES_INITIAUX = [
  { nom: 'VPN', domaine: RESEAU },
  { nom: 'Messagerie', domaine: APPLICATIF },
  { nom: 'ERP', domaine: APPLICATIF },
  { nom: 'Imprimante', domaine: INFRASTRUCTURE },
  { nom: 'Poste de travail', domaine: INFRASTRUCTURE },
  { nom: 'Autre / je ne sais pas', domaine: A_QUALIFIER },
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
      { upsert: true },
    );
  }
}

// Importer ce fichier dans les tests ne doit pas lancer MongoDB.
const executionDirecte =
  process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

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
