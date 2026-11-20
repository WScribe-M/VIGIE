import mongoose from 'mongoose';
import { ErreurHttp } from '../utils/ErreurHttp.js';
import { COLLATION_NOM, Service } from '../models/Service.js';
import { DOMAINES, NOM_SERVICE_AUTRE as NOM_AUTRE } from '../models/constantes.js';

// Le service « Autre » doit toujours déclencher une qualification.
const DOMAINE_A_QUALIFIER = 'A_QUALIFIER';

function verifierNom(nom) {
  if (typeof nom !== 'string' || !nom.trim()) {
    throw new ErreurHttp(400, 'Le nom du service est obligatoire');
  }

  return nom.trim();
}

function verifierDomaine(domaine) {
  if (!DOMAINES.includes(domaine)) {
    throw new ErreurHttp(400, 'Domaine technique invalide');
  }

  return domaine;
}

function verifierIdentifiant(id) {
  if (!mongoose.isValidObjectId(id)) {
    throw new ErreurHttp(400, 'Identifiant de service invalide');
  }
}

function verifierChamps(donnees, champsAutorises) {
  if (!donnees || typeof donnees !== 'object' || Array.isArray(donnees)) {
    throw new ErreurHttp(400, 'Données invalides');
  }

  const champs = Object.keys(donnees);

  if (champs.length === 0 || champs.some((champ) => !champsAutorises.includes(champ))) {
    throw new ErreurHttp(400, 'Champs du service invalides');
  }
}

function verifierServiceAutre(nom, domaine) {
  if (nom === NOM_AUTRE && domaine !== DOMAINE_A_QUALIFIER) {
    throw new ErreurHttp(400, 'Le service Autre doit conserver le domaine A_QUALIFIER');
  }
}

function convertirErreurDoublon(erreur) {
  if (erreur.code === 11000) {
    throw new ErreurHttp(409, 'Un service portant ce nom existe déjà');
  }

  throw erreur;
}

// Le client ne voit que les services actifs.
// L'administrateur peut également consulter les services désactivés.
export async function listerServices({ inclureInactifs = false } = {}, modele = Service) {
  const filtre = inclureInactifs ? {} : { actif: true };

  // Liste : seulement les champs affichés, en objets simples (CONTRIBUTING, « Requêtes MongoDB »).
  // La collation trie « écran » et « imprimante » avec les autres, et pas après « VPN ».
  const services = await modele
    .find(filtre)
    .select('nom domaine actif')
    .collation(COLLATION_NOM)
    .sort({ nom: 1 })
    .lean();

  // « Autre » en dernier, pour qu’il ne devienne pas le choix par défaut du formulaire
  return services.sort((a, b) => {
    if (a.nom === NOM_AUTRE) return 1;
    if (b.nom === NOM_AUTRE) return -1;
    return 0;
  });
}

export async function creerService(donnees, modele = Service) {
  verifierChamps(donnees, ['nom', 'domaine']);

  const nom = verifierNom(donnees.nom);
  const domaine = verifierDomaine(donnees.domaine);

  verifierServiceAutre(nom, domaine);

  try {
    return await modele.create({
      nom,
      domaine,
      actif: true,
    });
  } catch (erreur) {
    convertirErreurDoublon(erreur);
  }
}

export async function modifierService(id, modifications, modele = Service) {
  verifierIdentifiant(id);
  verifierChamps(modifications, ['nom', 'domaine', 'actif']);

  const service = await modele.findById(id);

  if (!service) {
    throw new ErreurHttp(404, 'Service introuvable');
  }

  const nom = modifications.nom === undefined ? service.nom : verifierNom(modifications.nom);

  const domaine =
    modifications.domaine === undefined ? service.domaine : verifierDomaine(modifications.domaine);

  // Le service « Autre » est une valeur métier réservée.
  if (service.nom === NOM_AUTRE && nom !== NOM_AUTRE) {
    throw new ErreurHttp(400, 'Le nom du service Autre ne peut pas être modifié');
  }

  verifierServiceAutre(nom, domaine);

  if (modifications.actif !== undefined && typeof modifications.actif !== 'boolean') {
    throw new ErreurHttp(400, 'Le champ actif doit être un booléen');
  }
  // Le service « Autre » ne peut pas être désactivé.
  if (service.nom === NOM_AUTRE && modifications.actif === false) {
    throw new ErreurHttp(400, 'Le service Autre ne peut pas être désactivé');
  }
  service.nom = nom;
  service.domaine = domaine;

  if (modifications.actif !== undefined) {
    service.actif = modifications.actif;
  }

  try {
    return await service.save();
  } catch (erreur) {
    convertirErreurDoublon(erreur);
  }
}

// Cette fonction sera réutilisée par VIGIE-3 à la création du ticket.
export async function deduireDomaine(serviceId, modele = Service) {
  verifierIdentifiant(serviceId);

  const service = await modele.findById(serviceId);

  if (!service) {
    throw new ErreurHttp(404, 'Service introuvable');
  }

  if (!service.actif) {
    throw new ErreurHttp(400, 'Ce service est désactivé');
  }

  return service.domaine;
}
