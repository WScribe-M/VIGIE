import mongoose from 'mongoose';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

import { connecterBase } from '../config/db.js';
import { config } from '../config/env.js';
import { User } from '../models/User.js';
import { Service } from '../models/Service.js';
import { Ticket } from '../models/Ticket.js';
import { IMPACTS, URGENCES, CANAUX } from '../models/constantes.js';
import { hacherMotDePasse } from '../services/authService.js';
import { formaterNumero, prochainNumeroTicket } from '../services/numeroService.js';
import { calculerPriorite } from '../services/prioriteService.js';
import {
  ajouterMinutesOuvrees,
  calculerEcheance,
  delaiMinutes,
  minutesOuvreesEntre,
  niveauSla,
} from '../services/slaService.js';
import { composerDescription } from '../services/ticketService.js';
import { initialiserServices } from './seedServices.js';

const TOTAL = 300;
const GRAINE = 20261120;
const MOT_DE_PASSE = process.env.SEED_MOT_DE_PASSE || 'DemoVigie2026!';

const PROFILS = [
  ['admin.demo@vigie.test', 'ADMIN', 'Alice', 'Martin'],
  ['gestionnaire.demo@vigie.test', 'GESTIONNAIRE', 'Hugo', 'Bernard'],
  ['gestionnaire2.demo@vigie.test', 'GESTIONNAIRE', 'Nora', 'Laurent'],
  ['gestionnaire3.demo@vigie.test', 'GESTIONNAIRE', 'Karim', 'Morel'],
  ['lecteur.demo@vigie.test', 'LECTEUR', 'Lina', 'Petit'],
  ['client.demo@vigie.test', 'CLIENT', 'Emma', 'Robert'],
  ['client2.demo@vigie.test', 'CLIENT', 'Lucas', 'Moreau'],
  ['client3.demo@vigie.test', 'CLIENT', 'Sarah', 'Dubois'],
];

const SCENARIOS = {
  VPN: [
    ['Connexion VPN impossible', 'Certificat expiré', 'Certificat renouvelé et connexion vérifiée'],
    ['Déconnexions VPN', 'Client VPN obsolète', 'Client mis à jour et stabilité confirmée'],
    [
      'Accès VPN refusé après changement de mot de passe',
      'Identifiants mis en cache',
      'Cache des identifiants effacé et authentification validée',
    ],
    ['VPN lent pendant les appels', 'Routage réseau saturé', 'Routage corrigé et débit contrôlé'],
    [
      'Double authentification VPN bloquée',
      'Horloge du poste désynchronisée',
      'Horloge synchronisée et connexion rétablie',
    ],
  ],
  Messagerie: [
    ['Envoi des emails impossible', 'Boîte saturée', 'Messages archivés et envoi rétabli'],
    [
      'Réception des emails retardée',
      'File de traitement bloquée',
      'Service relancé et réception vérifiée',
    ],
    [
      'Pièces jointes bloquées',
      'Taille maximale dépassée',
      'Fichier compressé et transfert confirmé',
    ],
    [
      'Dossiers partagés invisibles',
      'Droits de délégation manquants',
      'Délégation rétablie et accès vérifié',
    ],
    [
      'Recherche dans les emails incomplète',
      'Index de messagerie désynchronisé',
      'Index reconstruit et recherche vérifiée',
    ],
  ],
  ERP: [
    ['Connexion ERP impossible', 'Session corrompue', 'Session réinitialisée et accès rétabli'],
    ['ERP bloqué', 'Cache applicatif défectueux', 'Cache vidé et fonctionnement validé'],
    [
      'Export ERP impossible',
      'Droits sur le répertoire insuffisants',
      'Permissions corrigées et export testé',
    ],
    [
      "Erreur lors de la validation d'une commande",
      'Donnée de référence manquante',
      'Référence complétée et validation confirmée',
    ],
    ['Rapport ERP vide', 'Filtre de période incorrect', 'Filtre corrigé et rapport contrôlé'],
  ],
  Imprimante: [
    ['Imprimante indisponible', 'File d’impression bloquée', 'File purgée et impression testée'],
    ['Impression illisible', 'Cartouche défectueuse', 'Cartouche remplacée et impression validée'],
    [
      'Imprimante non détectée sur le réseau',
      'Adresse IP modifiée',
      "Port d'impression corrigé et test réussi",
    ],
    [
      'Recto verso indisponible',
      "Pilote d'impression inadapté",
      'Pilote actualisé et recto verso testé',
    ],
    [
      'Impression bloquée après mise à jour',
      "Spouleur d'impression arrêté",
      'Spouleur redémarré et file contrôlée',
    ],
  ],
  'Poste de travail': [
    ['Ordinateur très lent', 'Disque saturé', 'Disque nettoyé et performances vérifiées'],
    [
      'Application inaccessible',
      'Installation endommagée',
      'Application réinstallée et démarrage vérifié',
    ],
    [
      'Écran externe non reconnu',
      'Pilote graphique obsolète',
      'Pilote actualisé et affichage testé',
    ],
    [
      'Session Windows verrouillée',
      'Profil utilisateur endommagé',
      'Profil réparé et session restaurée',
    ],
    [
      'Connexion Wi-Fi instable',
      'Pilote de carte réseau défectueux',
      'Pilote réinstallé et stabilité confirmée',
    ],
  ],
};

export function creerAleatoire(graineInitiale = GRAINE) {
  let graine = graineInitiale >>> 0;

  return function aleatoire() {
    graine = (Math.imul(1664525, graine) + 1013904223) >>> 0;
    return graine / 4294967296;
  };
}

export function choisir(valeurs, aleatoire) {
  return valeurs[Math.floor(aleatoire() * valeurs.length)];
}

// Répartition dans le temps : les tickets sont étalés sur six mois d'heures ouvrées, et les derniers
// sont resserrés sur les trois derniers jours ouvrés pour que « À traiter » ait du contenu frais.
const RECENTS = 25;
const JOURS_RECENTS = 3;

// Part des tickets terminés parmi ceux dont le traitement est fini (les autres sont abandonnés)
const PART_TERMINES = 0.92;

// Relance du demandeur au-delà de 3 jours d'attente (fiche 05, « relance après 3 jours »)
const DELAI_RELANCE = 3 * 24 * 3600000;

// Date de création, toujours pendant les heures ouvrées : les tickets arrivent quand on travaille.
export function dateDeCreation(index, contexte) {
  const { debut, maintenant, aleatoire } = contexte;
  const total = minutesOuvreesEntre(debut, maintenant);
  const recents = Math.min(JOURS_RECENTS * (config.sla.fin - config.sla.debut), total);
  const anciens = total - recents;
  // Un léger décalage aléatoire évite des arrivées à intervalles parfaitement réguliers
  const decalage = aleatoire() - 0.5;

  const position =
    index < TOTAL - RECENTS
      ? (anciens * (index + 0.5 + decalage)) / (TOTAL - RECENTS)
      : anciens + (recents * (index - (TOTAL - RECENTS) + 0.5 + decalage)) / RECENTS;

  return ajouterMinutesOuvrees(debut, Math.floor(position));
}

// Durées en minutes ouvrées, proportionnelles au délai SLA de la priorité : l'attente avant prise en
// charge vaut 5 à 50 % du délai, le travail ensuite 15 à 75 %. Un ticket sur dix traîne (durées
// multipliées par 2,5) : ce sont eux qui restent ouverts en retard dans « À traiter ».
export function tirerDurees(priorite, aleatoire) {
  const delai = delaiMinutes(priorite);
  const facteur = aleatoire() < 0.1 ? 2.5 : 1;
  const prise = Math.round(delai * facteur * (0.05 + aleatoire() * 0.45));
  const traitement = prise + Math.max(30, Math.round(delai * facteur * (0.15 + aleatoire() * 0.6)));
  return { prise, traitement };
}

// Le statut découle des durées et de l'âge du ticket (en minutes ouvrées) : un ticket n'est encore
// NOUVEAU que si personne ne l'a pris en charge, et n'est clos que si son traitement est fini.
export function statutSelonAge(age, durees, aleatoire) {
  if (age < durees.prise) return 'NOUVEAU';
  if (age < durees.traitement) return aleatoire() < 0.2 ? 'EN_ATTENTE_DEMANDEUR' : 'EN_COURS';
  return aleatoire() < PART_TERMINES ? 'TERMINE' : 'ABANDONNE';
}

// Doublon : un ticket encore ouvert quand le doublon est déclaré (créé avant, pas encore clos),
// signalé par un autre demandeur.
function trouverPrincipal(index, creation, demandeur, contexte) {
  if (index <= 20 || index % 19 !== 0) return null;

  const candidats = contexte.ticketsCrees.filter(
    (ticket) =>
      !ticket.doublonDe &&
      ticket.createdAt < creation &&
      (!ticket.dateCloture || ticket.dateCloture > creation) &&
      String(ticket.demandeur) !== String(demandeur._id),
  );

  return candidats.length > 0 ? choisir(candidats, contexte.aleatoire) : null;
}

// Motif seulement quand il y en a un vrai (abandon, doublon, mise en attente, réouverture), comme
// l'application : la frise de l'historique (VIGIE-9) affiche chaque motif sous l'événement.
export function evenementStatut(auteur, ancienneValeur, nouvelleValeur, date, motif) {
  return {
    auteur: auteur._id,
    champ: 'statut',
    ancienneValeur,
    nouvelleValeur,
    date,
    ...(motif ? { motif } : {}),
  };
}

export function evenementAffectation(auteur, technicien, date) {
  return {
    auteur: auteur._id,
    champ: 'technicien',
    ancienneValeur: null,
    nouvelleValeur: technicien._id,
    date,
  };
}

async function creerUtilisateurs() {
  const utilisateurs = [];
  const motDePasseHache = await hacherMotDePasse(MOT_DE_PASSE);

  for (const [email, role, prenom, nom] of PROFILS) {
    const utilisateur = await User.findOneAndUpdate(
      { email },
      {
        $setOnInsert: {
          email,
          role,
          prenom,
          nom,
          actif: true,
          motDePasse: motDePasseHache,
        },
      },
      {
        upsert: true,
        returnDocument: 'after',
        runValidators: true,
      },
    );

    utilisateurs.push(utilisateur);
  }

  return utilisateurs;
}

export function creerDonneesTicket(index, contexte) {
  const { services, clients, techniciens, maintenant, aleatoire } = contexte;

  const creation = dateDeCreation(index, contexte);
  const age = minutesOuvreesEntre(creation, maintenant);

  const demandeur = choisir(clients, aleatoire);
  const ticketPrincipal = trouverPrincipal(index, creation, demandeur, contexte);

  // Un doublon reprend le service et le titre du ticket qu'il rejoint
  const service = ticketPrincipal
    ? services.find((s) => String(s._id) === String(ticketPrincipal.service))
    : choisir(services, aleatoire);
  const scenario = choisir(SCENARIOS[service.nom], aleatoire);
  const [titre, cause, solution] = ticketPrincipal ? [ticketPrincipal.titre] : scenario;

  const impact = choisir(IMPACTS, aleatoire);
  const urgence = choisir(URGENCES, aleatoire);
  const priorite = calculerPriorite(impact, urgence);

  let durees = tirerDurees(priorite, aleatoire);
  let statut = statutSelonAge(age, durees, aleatoire);

  if (ticketPrincipal) {
    // Le support repère vite le doublon et le clôt en renvoyant vers le ticket principal
    const prise = Math.min(durees.prise, Math.floor(age / 2));
    durees = { prise, traitement: Math.min(prise + 30, age) };
    statut = 'ABANDONNE';
  }

  // Les événements tombent pendant les heures ouvrées, jamais après « maintenant »
  const placer = (minutes) =>
    new Date(Math.min(ajouterMinutesOuvrees(creation, minutes), maintenant));

  const technicien = statut === 'NOUVEAU' ? null : choisir(techniciens, aleatoire);
  const priseEnCharge = technicien ? placer(durees.prise) : null;
  const finTraitement = placer(durees.traitement);

  const termine = statut === 'TERMINE';
  const abandonne = statut === 'ABANDONNE';
  const enAttente = statut === 'EN_ATTENTE_DEMANDEUR';

  // Mise en attente entre la prise en charge et maintenant
  const miseEnAttente = enAttente
    ? placer(durees.prise + Math.max(1, Math.floor((age - durees.prise) * aleatoire())))
    : null;

  // Une partie des tickets NOUVEAU a déjà été ouverte par le support (« Vu par le support »)
  const vuParSupportLe = technicien
    ? priseEnCharge
    : aleatoire() < 0.5 && age > 0
      ? placer(Math.floor(age * aleatoire()))
      : null;

  const reouvert =
    termine && index % 13 === 0 && finTraitement.getTime() - priseEnCharge.getTime() > 3 * 3600000;

  const historique = [evenementStatut(demandeur, null, 'NOUVEAU', creation)];

  const commentaires = [
    {
      auteur: demandeur._id,
      texte: 'Bonjour, merci de prendre en charge cet incident.',
      date: creation,
    },
  ];

  if (technicien) {
    historique.push(
      evenementStatut(technicien, 'NOUVEAU', 'EN_COURS', priseEnCharge),
      evenementAffectation(technicien, technicien, priseEnCharge),
    );
  }

  if (reouvert) {
    const duree = finTraitement.getTime() - priseEnCharge.getTime();
    const premiereResolution = new Date(priseEnCharge.getTime() + duree * 0.35);
    const reouverture = new Date(priseEnCharge.getTime() + duree * 0.55);

    historique.push(
      evenementStatut(technicien, 'EN_COURS', 'TERMINE', premiereResolution),
      evenementStatut(demandeur, 'TERMINE', 'EN_COURS', reouverture, 'Le problème est réapparu'),
      evenementStatut(technicien, 'EN_COURS', 'TERMINE', finTraitement),
    );
  } else if (enAttente) {
    historique.push(
      evenementStatut(
        technicien,
        'EN_COURS',
        statut,
        miseEnAttente,
        'Informations complémentaires demandées',
      ),
    );
  } else if (termine || abandonne) {
    const motif = ticketPrincipal
      ? `Doublon de ${formaterNumero(ticketPrincipal.numero)}`
      : abandonne
        ? 'Demande abandonnée'
        : undefined;

    historique.push(evenementStatut(technicien, 'EN_COURS', statut, finTraitement, motif));
  }

  if (termine) {
    commentaires.push({
      auteur: technicien._id,
      texte: `Cause identifiée : ${cause}. Solution appliquée : ${solution}.`,
      date: finTraitement,
    });
  } else if (technicien) {
    commentaires.push({
      auteur: technicien._id,
      texte: 'Diagnostic effectué. Suivi de la demande en cours.',
      date: priseEnCharge,
    });
  }

  const dateStatut =
    {
      NOUVEAU: creation,
      EN_COURS: priseEnCharge,
      EN_ATTENTE_DEMANDEUR: miseEnAttente,
    }[statut] ?? finTraitement;

  // Relance du demandeur quand l'attente dépasse 3 jours
  const derniereRelance =
    enAttente && maintenant - miseEnAttente > DELAI_RELANCE
      ? new Date(miseEnAttente.getTime() + DELAI_RELANCE)
      : null;

  const echeanceSla = calculerEcheance(creation, priorite);

  // Même lecture du SLA que l'application (niveauSla), traduite en niveau d'alerte enregistré
  const sla = niveauSla({ statut, dateStatut, echeanceSla, prioriteFinale: priorite }, maintenant);
  const niveauAlerteSla =
    { EN_RETARD: 'ROUGE', ECHEANCE_PROCHE: 'ORANGE' }[sla?.niveau] ?? 'AUCUNE';

  return {
    titre,
    description: composerDescription({
      probleme: `${titre}. Le service ${service.nom} est perturbé et empêche l'utilisateur de travailler normalement.`,
      depuis: `Depuis le ${creation.toLocaleDateString('fr-FR')}.`,
      messageErreur:
        index % 3 === 0 ? 'Un message d’erreur apparaît lors de l’utilisation du service.' : '',
    }),
    service: service._id,
    domaine: service.domaine,
    impact,
    urgence,
    prioriteCalculee: priorite,
    prioriteFinale: priorite,
    statut,
    dateStatut,
    datePriseEnCharge: priseEnCharge,
    vuParSupportLe,
    dateCloture: termine || abandonne ? finTraitement : null,
    derniereRelance,
    echeanceSla,
    niveauAlerteSla,
    nbReouvertures: reouvert ? 1 : 0,
    demandeur: demandeur._id,
    createur: demandeur._id,
    canal: choisir(CANAUX, aleatoire),
    technicien: technicien?._id ?? null,
    doublonDe: ticketPrincipal?._id ?? null,
    resolution: termine
      ? {
          cause,
          solution,
          auteur: technicien._id,
          date: finTraitement,
        }
      : null,
    commentaires,
    historique,
    ...(termine && aleatoire() < 0.6 ? { satisfaction: 1 + Math.floor(aleatoire() * 5) } : {}),
    createdAt: creation,
  };
}

export async function executerSeedDemo() {
  if (process.env.CONFIRMER_SEED_DEMO !== 'OUI') {
    throw new Error('Seed bloqué : définir CONFIRMER_SEED_DEMO=OUI pour autoriser la génération.');
  }

  await connecterBase();

  // Détection des tickets créés par l'ancien seed.
  const anciensTickets = await Ticket.countDocuments({
    titre: { $regex: '^\\[DEMO-VIGIE-23\\]' },
  });

  if (anciensTickets > 0) {
    console.log(`${anciensTickets} anciens tickets de démonstration détectés. Génération annulée.`);
    return;
  }

  const emailsDemo = PROFILS.map(([email]) => email);

  const comptesDemo = await User.find({
    email: { $in: emailsDemo },
  }).select('_id');

  if (comptesDemo.length > 0) {
    const ticketsExistants = await Ticket.countDocuments({
      $or: [
        { demandeur: { $in: comptesDemo.map((user) => user._id) } },
        { createur: { $in: comptesDemo.map((user) => user._id) } },
      ],
    });

    if (ticketsExistants > 0) {
      console.log(
        `${ticketsExistants} tickets liés aux comptes de démonstration détectés. Génération annulée.`,
      );
      return;
    }
  }

  await initialiserServices();

  const utilisateurs = await creerUtilisateurs();
  const techniciens = utilisateurs.slice(1, 4);
  const clients = utilisateurs.slice(5);

  const services = await Service.find({
    nom: { $in: Object.keys(SCENARIOS) },
    actif: true,
  }).collation({ locale: 'fr', strength: 2 });

  if (services.length !== Object.keys(SCENARIOS).length) {
    throw new Error('Certains services nécessaires sont absents.');
  }

  const maintenant = new Date();
  const debut = new Date(maintenant);
  debut.setMonth(debut.getMonth() - 6);

  const contexte = {
    services,
    clients,
    techniciens,
    debut,
    maintenant,
    ticketsCrees: [],
    aleatoire: creerAleatoire(),
  };

  for (let index = 0; index < TOTAL; index++) {
    const donnees = creerDonneesTicket(index, contexte);

    const ticket = new Ticket({
      ...donnees,
      numero: await prochainNumeroTicket(),
    });

    await ticket.save();

    contexte.ticketsCrees.push({
      _id: ticket._id,
      numero: ticket.numero,
      titre: ticket.titre,
      service: ticket.service,
      doublonDe: ticket.doublonDe,
      demandeur: ticket.demandeur,
      createdAt: ticket.createdAt,
      dateCloture: ticket.dateCloture,
    });

    if (ticket.doublonDe) {
      await Ticket.updateOne(
        { _id: ticket.doublonDe },
        { $addToSet: { suiveurs: ticket.demandeur } },
      );
    }
  }

  console.log(`${TOTAL} tickets de démonstration créés.`);
  console.log('Comptes de démonstration :');

  for (const [email, role] of PROFILS) {
    console.log(`- ${email} (${role})`);
  }

  console.log('Mot de passe : valeur de SEED_MOT_DE_PASSE ou valeur par défaut documentée.');
}

const executionDirecte =
  process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (executionDirecte) {
  try {
    await executerSeedDemo();
  } catch (erreur) {
    console.error('Erreur seed :', erreur.message);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
}
