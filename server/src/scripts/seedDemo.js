import mongoose from 'mongoose';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

import { connecterBase } from '../config/db.js';
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
  ],
  Messagerie: [
    ['Envoi des emails impossible', 'Boîte saturée', 'Messages archivés et envoi rétabli'],
    [
      'Réception des emails retardée',
      'File de traitement bloquée',
      'Service relancé et réception vérifiée',
    ],
  ],
  ERP: [
    ['Connexion ERP impossible', 'Session corrompue', 'Session réinitialisée et accès rétabli'],
    ['ERP bloqué', 'Cache applicatif défectueux', 'Cache vidé et fonctionnement validé'],
  ],
  Imprimante: [
    ['Imprimante indisponible', 'File d’impression bloquée', 'File purgée et impression testée'],
    ['Impression illisible', 'Cartouche défectueuse', 'Cartouche remplacée et impression validée'],
  ],
  'Poste de travail': [
    ['Ordinateur très lent', 'Disque saturé', 'Disque nettoyé et performances vérifiées'],
    [
      'Application inaccessible',
      'Installation endommagée',
      'Application réinstallée et démarrage vérifié',
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

export function choisirStatut(heuresDisponibles, aleatoire) {
  const tirage = aleatoire();

  // Les tickets récents restent majoritairement ouverts.
  if (heuresDisponibles < 24) {
    return tirage < 0.7 ? 'NOUVEAU' : 'EN_COURS';
  }

  if (heuresDisponibles < 72) {
    if (tirage < 0.2) return 'NOUVEAU';
    if (tirage < 0.7) return 'EN_COURS';
    if (tirage < 0.85) return 'EN_ATTENTE_DEMANDEUR';
    return 'TERMINE';
  }

  if (tirage < 0.2) return 'EN_COURS';
  if (tirage < 0.3) return 'EN_ATTENTE_DEMANDEUR';
  if (tirage < 0.9) return 'TERMINE';
  return 'ABANDONNE';
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
    ancienneValeur: '',
    nouvelleValeur: String(technicien._id),
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
  const {
    services,
    clients,
    techniciens,
    gestionnaire,
    debut,
    maintenant,
    ticketsCrees,
    aleatoire,
  } = contexte;

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

  // Un doublon doit toujours désigner un ticket existant
  // du même service, qui n'est pas lui-même un doublon.
  const estCandidatDoublon = index > 20 && index % 19 === 0;

  const principaux = estCandidatDoublon
    ? ticketsCrees.filter(
        (ticket) => String(ticket.service) === String(service._id) && !ticket.doublonDe,
      )
    : [];

  const ticketPrincipal = principaux.length > 0 ? choisir(principaux, aleatoire) : null;

  if (ticketPrincipal) {
    statut = 'ABANDONNE';
  }

  const technicien = statut === 'NOUVEAU' ? null : choisir(techniciens, aleatoire);

  const priseEnCharge = ajouterHeures(creation, Math.min(2, heuresDisponibles / 3));

  const finTraitement = ajouterHeures(creation, Math.min(Math.max(heuresDisponibles * 0.5, 3), 72));

  const termine = statut === 'TERMINE';
  const abandonne = statut === 'ABANDONNE';

  const reouvert = termine && index % 13 === 0 && heuresDisponibles > 48;

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
        gestionnaire,
        'NOUVEAU',
        'EN_COURS',
        priseEnCharge,
        'Prise en charge du ticket',
      ),
      evenementAffectation(technicien, technicien, priseEnCharge),
    );
  }

  if (reouvert) {
    const premiereResolution = ajouterHeures(priseEnCharge, 1);
    const reouverture = ajouterHeures(priseEnCharge, 2);

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
    } else if (tempsRestant < 24 * 3600000) {
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
    dateCloture: termine || abandonne ? finTraitement : null,
    echeanceSla,
    niveauAlerteSla,
    nbReouvertures: reouvert ? 1 : 0,
    demandeur: demandeur._id,
    createur: demandeur._id,
    canal: choisir(CANAUX, aleatoire),
    technicien: technicien?._id ?? null,
    doublonDe: ticketPrincipal?._id ?? null,
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

  // Détecter aussi les tickets de l'ancien seed.
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
  const gestionnaire = utilisateurs[1];
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
    gestionnaire,
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
