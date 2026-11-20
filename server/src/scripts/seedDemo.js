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
import { prochainNumeroTicket } from '../services/numeroService.js';
import { calculerPriorite } from '../services/prioriteService.js';
import { calculerEcheance } from '../services/slaService.js';
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

export function ajouterHeures(date, heures) {
  return new Date(date.getTime() + heures * 3600000);
}

// Temps écoulé en minutes ouvrées.
export function minutesOuvreesEntre(debut, fin, horaires = config.sla) {
  if (fin <= debut) return 0;

  let minutes = 0;
  const jour = new Date(debut);
  jour.setHours(0, 0, 0, 0);

  while (jour < fin) {
    if (horaires.jours.includes(jour.getDay() || 7)) {
      const ouverture = new Date(jour);
      ouverture.setMinutes(horaires.debut);

      const fermeture = new Date(jour);
      fermeture.setMinutes(horaires.fin);

      minutes += Math.max(0, Math.min(fin, fermeture) - Math.max(debut, ouverture)) / 60000;
    }

    jour.setDate(jour.getDate() + 1);
  }

  return minutes;
}

export function choisirStatut(heuresDisponibles, aleatoire) {
  const tirage = aleatoire();

  // Tickets récents : davantage de demandes à traiter.
  if (heuresDisponibles < 72) {
    if (tirage < 0.6) return 'NOUVEAU';
    if (tirage < 0.92) return 'EN_COURS';
    return 'EN_ATTENTE_DEMANDEUR';
  }

  if (heuresDisponibles <= 14 * 24) {
    if (tirage < 0.38) return 'NOUVEAU';
    if (tirage < 0.63) return 'EN_COURS';
    if (tirage < 0.73) return 'EN_ATTENTE_DEMANDEUR';
    if (tirage < 0.96) return 'TERMINE';
    return 'ABANDONNE';
  }

  // Les tickets anciens sont presque tous clôturés.
  if (tirage < 0.965) return 'TERMINE';
  if (tirage < 0.99) return 'ABANDONNE';
  if (tirage < 0.995) return 'EN_COURS';
  return 'EN_ATTENTE_DEMANDEUR';
}

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
    motif: 'Affectation du ticket',
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
  const { services, clients, techniciens, debut, maintenant, ticketsCrees, aleatoire } = contexte;

  const service = choisir(services, aleatoire);
  const [titre, cause, solution] = choisir(SCENARIOS[service.nom], aleatoire);

  const creation = new Date(
    debut.getTime() + ((maintenant.getTime() - debut.getTime()) * (index + 0.5)) / TOTAL,
  );

  const heuresDisponibles = (maintenant.getTime() - creation.getTime()) / 3600000;

  const demandeur = choisir(clients, aleatoire);
  const impact = choisir(IMPACTS, aleatoire);
  const urgence = choisir(URGENCES, aleatoire);
  const priorite = calculerPriorite(impact, urgence);

  let statut = choisirStatut(heuresDisponibles, aleatoire);

  // Doublons : même service, autre demandeur, ticket récent non abandonné.
  const estCandidatDoublon = index > 20 && index % 19 === 0;

  const principaux = estCandidatDoublon
    ? ticketsCrees.filter(
        (ticket) =>
          String(ticket.service) === String(service._id) &&
          !ticket.doublonDe &&
          ticket.statut !== 'ABANDONNE' &&
          (!ticket.demandeur || String(ticket.demandeur) !== String(demandeur._id)) &&
          (!ticket.createdAt ||
            creation.getTime() - new Date(ticket.createdAt).getTime() <= 21 * 86400000),
      )
    : [];

  const ticketPrincipal = principaux.length > 0 ? choisir(principaux, aleatoire) : null;

  if (ticketPrincipal) {
    statut = 'ABANDONNE';
  }

  const technicien = statut === 'NOUVEAU' ? null : choisir(techniciens, aleatoire);

  // Durées variables selon la priorité.
  const delaisParPriorite = {
    CRITIQUE: { prise: 1, resolution: 6 },
    HAUTE: { prise: 3, resolution: 18 },
    MOYENNE: { prise: 8, resolution: 48 },
    BASSE: { prise: 16, resolution: 120 },
  };

  const delais = delaisParPriorite[priorite];

  const heuresPriseEnCharge = Math.min(0.25 + aleatoire() * delais.prise, heuresDisponibles / 3);

  const heuresResolution = Math.min(
    heuresPriseEnCharge + 1 + aleatoire() * delais.resolution,
    heuresDisponibles * 0.9,
  );

  const priseEnCharge = ajouterHeures(creation, heuresPriseEnCharge);
  const finTraitement = ajouterHeures(creation, heuresResolution);

  const termine = statut === 'TERMINE';
  const abandonne = statut === 'ABANDONNE';

  const reouvert =
    termine && index % 13 === 0 && finTraitement.getTime() - priseEnCharge.getTime() > 3 * 3600000;

  const historique = [evenementStatut(demandeur, null, 'NOUVEAU', creation, 'Création du ticket')];

  const commentaires = [
    {
      auteur: demandeur._id,
      texte: 'Bonjour, merci de prendre en charge cet incident.',
      date: creation,
    },
  ];

  if (technicien) {
    historique.push(
      evenementStatut(
        technicien,
        'NOUVEAU',
        'EN_COURS',
        priseEnCharge,
        'Prise en charge du ticket',
      ),
      evenementAffectation(technicien, technicien, priseEnCharge),
    );
  }

  if (reouvert) {
    const duree = finTraitement.getTime() - priseEnCharge.getTime();
    const premiereResolution = new Date(priseEnCharge.getTime() + duree * 0.35);
    const reouverture = new Date(priseEnCharge.getTime() + duree * 0.55);

    historique.push(
      evenementStatut(technicien, 'EN_COURS', 'TERMINE', premiereResolution, 'Première résolution'),
      evenementStatut(demandeur, 'TERMINE', 'EN_COURS', reouverture, 'Le problème est réapparu'),
      evenementStatut(technicien, 'EN_COURS', 'TERMINE', finTraitement, 'Résolution définitive'),
    );
  } else if (statut === 'EN_ATTENTE_DEMANDEUR') {
    historique.push(
      evenementStatut(
        technicien,
        'EN_COURS',
        statut,
        finTraitement,
        'Informations complémentaires demandées',
      ),
    );
  } else if (termine || abandonne) {
    const motif = ticketPrincipal
      ? `Doublon de VIG-${String(ticketPrincipal.numero).padStart(4, '0')}`
      : termine
        ? 'Incident résolu'
        : 'Demande abandonnée';

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
    statut === 'NOUVEAU' ? creation : statut === 'EN_COURS' ? priseEnCharge : finTraitement;

  const echeanceSla = calculerEcheance(creation, priorite);

  let niveauAlerteSla = 'AUCUNE';

  if (!termine && !abandonne && statut !== 'EN_ATTENTE_DEMANDEUR') {
    const tempsRestant = echeanceSla.getTime() - maintenant.getTime();

    if (tempsRestant < 0) {
      niveauAlerteSla = 'ROUGE';
    } else if (
      minutesOuvreesEntre(creation, maintenant) >=
      0.75 * minutesOuvreesEntre(creation, echeanceSla)
    ) {
      niveauAlerteSla = 'ORANGE';
    }
  }

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
    datePriseEnCharge: technicien ? priseEnCharge : null,
    vuParSupportLe: technicien ? priseEnCharge : null,
    dateCloture: termine || abandonne ? finTraitement : null,
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
      service: ticket.service,
      doublonDe: ticket.doublonDe,
      statut: ticket.statut,
      demandeur: ticket.demandeur,
      createdAt: ticket.createdAt,
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
