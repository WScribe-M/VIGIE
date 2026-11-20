import mongoose from 'mongoose';
import { DOMAINES, IMPACTS, URGENCES } from '../models/constantes.js';
import { Ticket } from '../models/index.js';
import { ErreurHttp } from '../utils/ErreurHttp.js';
import { formaterNumero, prochainNumeroTicket } from './numeroService.js';
import { calculerPriorite } from './prioriteService.js';
import { deduireDomaine } from './serviceService.js';
import { calculerEcheance } from './slaService.js';
import { filtreTicketsVisibles, peutVoirTicket } from './visibiliteService.js';

// Longueur maximale du titre : celle du compteur du formulaire (docs/ecrans/03-creer-un-ticket.md)
const TITRE_MAX = 120;
// Garde-fou contre un texte démesuré, pas une règle métier : une description reste courte
const REPONSE_MAX = 2000;

// Description guidée (cadrage 9.9) : trois questions, toujours dans le même ordre et avec les mêmes
// intitulés. Tous les tickets ont ainsi une description de même forme (recherche, futur RAG).
export const RUBRIQUES_DESCRIPTION = [
  { champ: 'probleme', intitule: 'Que se passe-t-il ?', obligatoire: true },
  { champ: 'depuis', intitule: 'Depuis quand ?', obligatoire: true },
  { champ: 'messageErreur', intitule: "Quel message d'erreur ?", obligatoire: false },
];

const CHAMPS_CREATION = ['titre', 'description', 'service', 'impact', 'urgence'];

// Lecture d'un ticket et liste : uniquement les champs affichés (CONTRIBUTING, Requêtes MongoDB).
// Ni commentaires, ni historique, ni pièces jointes : chaque story les ajoutera avec ses droits.
const CHAMPS_FICHE =
  'numero titre description service domaine impact urgence prioriteFinale statut dateStatut echeanceSla demandeur technicien createdAt';
const CHAMPS_LISTE = 'numero titre service statut prioriteFinale echeanceSla createdAt';
// Liste minimale de VIGIE-3, sans pagination : VIGIE-6 ajoutera tri, filtres et pagination
const LISTE_MAX = 50;

function texte(valeur, { libelle, max, obligatoire = true }) {
  if (valeur === undefined || valeur === null || valeur === '') {
    if (obligatoire) {
      throw new ErreurHttp(400, `${libelle} : champ obligatoire`);
    }
    return '';
  }
  if (typeof valeur !== 'string') {
    throw new ErreurHttp(400, `${libelle} : texte attendu`);
  }
  const propre = valeur.trim();
  if (obligatoire && !propre) {
    throw new ErreurHttp(400, `${libelle} : champ obligatoire`);
  }
  if (propre.length > max) {
    throw new ErreurHttp(400, `${libelle} : ${max} caractères au maximum`);
  }
  return propre;
}

// Assemble les trois réponses en un seul texte, avec les intitulés fixes.
// Une rubrique facultative laissée vide est écrite « Non précisé » : la forme reste la même.
export function composerDescription(reponses) {
  if (!reponses || typeof reponses !== 'object' || Array.isArray(reponses)) {
    throw new ErreurHttp(400, 'Description : réponses aux trois questions attendues');
  }
  return RUBRIQUES_DESCRIPTION.map(({ champ, intitule, obligatoire }) => {
    const reponse = texte(reponses[champ], { libelle: intitule, max: REPONSE_MAX, obligatoire });
    return `${intitule}\n${reponse || 'Non précisé'}`;
  }).join('\n\n');
}

// Vérifie le corps de POST /api/tickets. Un champ inconnu est refusé : le demandeur ne choisit
// ni la priorité, ni le délai, ni le statut, ni le demandeur (lu dans le jeton).
export function validerCreation(donnees) {
  if (!donnees || typeof donnees !== 'object' || Array.isArray(donnees)) {
    throw new ErreurHttp(400, 'Données invalides');
  }
  const inconnus = Object.keys(donnees).filter((champ) => !CHAMPS_CREATION.includes(champ));
  if (inconnus.length) {
    throw new ErreurHttp(400, `Champ non autorisé : ${inconnus.join(', ')}`);
  }
  if (!IMPACTS.includes(donnees.impact)) {
    throw new ErreurHttp(400, 'Impact invalide');
  }
  if (!URGENCES.includes(donnees.urgence)) {
    throw new ErreurHttp(400, 'Urgence invalide');
  }
  if (!mongoose.isObjectIdOrHexString(donnees.service)) {
    throw new ErreurHttp(400, 'Service invalide');
  }
  return {
    titre: texte(donnees.titre, { libelle: 'Titre', max: TITRE_MAX }),
    description: composerDescription(donnees.description),
    service: donnees.service,
    impact: donnees.impact,
    urgence: donnees.urgence,
  };
}

// Construit le document du nouveau ticket. Pure (numéro, domaine et date fournis) pour être
// testée sans base de données.
export function preparerTicket(champs, utilisateur, { numero, domaine, maintenant }) {
  const priorite = calculerPriorite(champs.impact, champs.urgence);
  return {
    ...champs,
    numero,
    domaine,
    prioriteCalculee: priorite,
    prioriteFinale: priorite,
    // rangPriorite est recalculé par le schéma à la validation
    statut: 'NOUVEAU',
    dateStatut: maintenant,
    echeanceSla: calculerEcheance(maintenant, priorite),
    demandeur: utilisateur.id,
    createur: utilisateur.id,
    canal: 'APPLICATION',
    // Première entrée de l'historique : la création, base du jalon « Reçu » (cadrage 9.8)
    historique: [
      { auteur: utilisateur.id, champ: 'statut', ancienneValeur: null, nouvelleValeur: 'NOUVEAU' },
    ],
  };
}

// Ajoute la référence affichée (VIG-0042) pour que le client ne recopie pas le format
function avecReference(ticket) {
  return { ...ticket, reference: formaterNumero(ticket.numero) };
}

export async function creerTicket(donnees, utilisateur) {
  // Tout est vérifié avant de prendre un numéro : une requête invalide ne consomme pas de numéro
  const champs = validerCreation(donnees);
  let domaine;
  try {
    domaine = await deduireDomaine(champs.service);
  } catch (err) {
    // Le service vient du corps de la requête : inconnu, c'est une donnée invalide (400), pas une
    // adresse introuvable (404)
    throw err.status === 404 ? new ErreurHttp(400, 'Service inconnu') : err;
  }
  const numero = await prochainNumeroTicket();
  const ticket = await Ticket.create(
    preparerTicket(champs, utilisateur, { numero, domaine, maintenant: new Date() }),
  );
  return lireTicket(ticket._id, utilisateur);
}

// Un ticket invisible pour cet utilisateur répond comme un ticket inexistant : on ne révèle pas
// quels numéros existent
export async function lireTicket(id, utilisateur) {
  if (!mongoose.isObjectIdOrHexString(id)) {
    throw new ErreurHttp(404, 'Ticket introuvable');
  }
  const ticket = await Ticket.findById(id)
    .select(`${CHAMPS_FICHE} suiveurs enCopie`)
    .populate('service', 'nom')
    .populate('demandeur', 'nom prenom')
    .populate('technicien', 'nom prenom')
    .lean();
  if (!ticket || !peutVoirTicket(utilisateur, ticket)) {
    throw new ErreurHttp(404, 'Ticket introuvable');
  }
  // suiveurs et enCopie servent seulement à la vérification : on ne les renvoie pas
  delete ticket.suiveurs;
  delete ticket.enCopie;
  return avecReference(ticket);
}

// Tickets visibles, les plus récents d'abord : « Mes demandes » pour un CLIENT
export async function listerTickets(utilisateur) {
  const tickets = await Ticket.find(filtreTicketsVisibles(utilisateur))
    .select(CHAMPS_LISTE)
    .populate('service', 'nom')
    .sort({ createdAt: -1 })
    .limit(LISTE_MAX)
    .lean();
  return tickets.map(avecReference);
}

// Correction du domaine par le support (critère repris de VIGIE-4) : par exemple un ticket
// « Autre / je ne sais pas », arrivé en A_QUALIFIER, une fois qualifié. Tracée dans l'historique.
export async function corrigerDomaine(id, domaine, utilisateur) {
  if (!DOMAINES.includes(domaine)) {
    throw new ErreurHttp(400, 'Domaine technique invalide');
  }
  if (!mongoose.isObjectIdOrHexString(id)) {
    throw new ErreurHttp(404, 'Ticket introuvable');
  }
  const ticket = await Ticket.findById(id);
  if (!ticket) {
    throw new ErreurHttp(404, 'Ticket introuvable');
  }
  if (ticket.domaine === domaine) {
    throw new ErreurHttp(400, 'Le ticket a déjà ce domaine');
  }

  ticket.historique.push({
    auteur: utilisateur.id,
    champ: 'domaine',
    ancienneValeur: ticket.domaine,
    nouvelleValeur: domaine,
  });
  ticket.domaine = domaine;
  try {
    // optimisticConcurrency : refuse l'écriture si le ticket a changé depuis sa lecture
    await ticket.save();
  } catch (err) {
    if (err instanceof mongoose.Error.VersionError) {
      throw new ErreurHttp(409, 'Le ticket a été modifié entre-temps : rechargez-le');
    }
    throw err;
  }
  return lireTicket(ticket._id, utilisateur);
}
