import mongoose from 'mongoose';
import { connecterBase } from '../config/db.js';
import { User } from '../models/User.js';
import { Service } from '../models/Service.js';
import { Ticket } from '../models/Ticket.js';
import { hacherMotDePasse } from '../services/authService.js';
import { prochainNumeroTicket } from '../services/numeroService.js';
import { initialiserServices } from './seedServices.js';
import { RANG_PRIORITE } from '../models/constantes.js';

const TOTAL = 300;
const PREFIXE = '[DEMO-VIGIE-23]';
const MOT_DE_PASSE = 'DemoVigie2026!';

const PROFILS = [
  ['admin.demo@vigie.test', 'ADMIN', 'Alice', 'Martin'],
  ['gestionnaire.demo@vigie.test', 'GESTIONNAIRE', 'Hugo', 'Bernard'],
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

const STATUTS = ['NOUVEAU', 'EN_COURS', 'EN_ATTENTE_DEMANDEUR', 'TERMINE', 'ABANDONNE'];

const PRIORITES = ['BASSE', 'MOYENNE', 'HAUTE', 'CRITIQUE'];
const IMPACTS = ['FAIBLE', 'MOYEN', 'FORT'];
const URGENCES = ['FAIBLE', 'MOYENNE', 'HAUTE'];
const CANAUX = ['APPLICATION', 'TELEPHONE', 'EMAIL', 'DIRECT'];

function choix(index, valeurs, decalage = 0) {
  return valeurs[(index * 37 + decalage) % valeurs.length];
}

function ajouterHeures(date, heures) {
  return new Date(date.getTime() + heures * 3600000);
}

function evenement(auteur, ancienneValeur, nouvelleValeur, date, motif) {
  return {
    auteur: auteur._id,
    champ: 'statut',
    ancienneValeur,
    nouvelleValeur,
    date,
    ...(motif ? { motif } : {}),
  };
}

async function creerUtilisateurs() {
  const utilisateurs = [];

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
          motDePasse: await hacherMotDePasse(MOT_DE_PASSE),
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

function creerDonneesTicket(index, contexte) {
  const { services, clients, techniciens, gestionnaire, debut, maintenant, idsCrees } = contexte;

  const service = choix(index, services);
  const [titre, cause, solution] = choix(index, SCENARIOS[service.nom], 1);

  const creation = new Date(
    debut.getTime() + ((maintenant.getTime() - debut.getTime()) * (index + 0.5)) / TOTAL,
  );

  const heuresDisponibles = (maintenant.getTime() - creation.getTime()) / 3600000;
  const statut = choix(index, STATUTS, 2);
  const priorite = choix(index, PRIORITES, 3);
  const demandeur = choix(index, clients, 4);
  const technicien = statut === 'NOUVEAU' ? null : choix(index, techniciens, 5);

  const termine = statut === 'TERMINE';
  const reouvert = termine && index % 13 === 0 && heuresDisponibles > 48;
  const retard = index % 7 === 0;
  const doublon = index > 20 && index % 19 === 0;

  const priseEnCharge = ajouterHeures(creation, 2);
  const finTraitement = ajouterHeures(creation, Math.min(Math.max(heuresDisponibles * 0.5, 8), 72));

  const historique = [evenement(demandeur, null, 'NOUVEAU', creation, 'Création du ticket')];

  const commentaires = [
    {
      auteur: demandeur._id,
      texte: 'Bonjour, merci de prendre en charge cet incident.',
      date: creation,
    },
  ];

  if (statut !== 'NOUVEAU') {
    historique.push(
      evenement(gestionnaire, 'NOUVEAU', 'EN_COURS', priseEnCharge, 'Prise en charge du ticket'),
    );
  }

  if (reouvert) {
    const premiereResolution = ajouterHeures(priseEnCharge, 2);
    const reouverture = ajouterHeures(priseEnCharge, 4);

    historique.push(
      evenement(technicien, 'EN_COURS', 'TERMINE', premiereResolution, 'Première résolution'),
      evenement(demandeur, 'TERMINE', 'EN_COURS', reouverture, 'Le problème est réapparu'),
      evenement(technicien, 'EN_COURS', 'TERMINE', finTraitement, 'Résolution définitive'),
    );
  } else if (statut === 'EN_ATTENTE_DEMANDEUR') {
    historique.push(
      evenement(
        technicien,
        'EN_COURS',
        statut,
        finTraitement,
        'Informations complémentaires demandées',
      ),
    );
  } else if (statut === 'TERMINE' || statut === 'ABANDONNE') {
    historique.push(
      evenement(
        technicien,
        'EN_COURS',
        statut,
        finTraitement,
        statut === 'TERMINE' ? 'Incident résolu' : 'Demande abandonnée',
      ),
    );
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

  const echeanceSla = ajouterHeures(creation, retard ? 4 : 96);
  const slaDepasse = echeanceSla < maintenant;

  return {
    titre: `${PREFIXE} ${titre} #${index + 1}`,
    description: [
      `Service concerné : ${service.nom}`,
      `Problème rencontré : ${titre}.`,
      'Impact utilisateur : activité perturbée.',
      'Résultat attendu : retour au fonctionnement normal.',
    ].join('\n'),
    service: service._id,
    domaine: service.domaine,
    impact: choix(index, IMPACTS, 6),
    urgence: choix(index, URGENCES, 7),
    prioriteCalculee: priorite,
    prioriteFinale: priorite,
    rangPriorite: RANG_PRIORITE[priorite],
    statut,
    dateStatut,
    datePriseEnCharge: technicien ? priseEnCharge : null,
    dateCloture: termine ? finTraitement : null,
    echeanceSla,
    niveauAlerteSla: slaDepasse && !termine && statut !== 'ABANDONNE' ? 'ROUGE' : 'AUCUNE',
    nbReouvertures: reouvert ? 1 : 0,
    demandeur: demandeur._id,
    createur: demandeur._id,
    canal: choix(index, CANAUX, 8),
    technicien: technicien?._id ?? null,
    doublonDe: doublon ? choix(index, idsCrees) : null,
    commentaires,
    historique,
    createdAt: creation,
    updatedAt: dateStatut,
  };
}

async function executer() {
  if (process.env.CONFIRMER_SEED_DEMO !== 'OUI') {
    throw new Error('Seed bloqué : définir CONFIRMER_SEED_DEMO=OUI pour autoriser la génération.');
  }

  await connecterBase();

  const existants = await Ticket.countDocuments({
    titre: { $regex: '^\\[DEMO-VIGIE-23\\]' },
  });

  if (existants > 0) {
    console.log(`${existants} tickets de démonstration déjà présents. Génération annulée.`);
    return;
  }

  await initialiserServices();

  const utilisateurs = await creerUtilisateurs();
  const gestionnaire = utilisateurs[1];
  const clients = utilisateurs.slice(3);
  const techniciens = [utilisateurs[0], gestionnaire];

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
    idsCrees: [],
  };

  for (let i = 0; i < TOTAL; i++) {
    const donnees = creerDonneesTicket(i, contexte);
    const ticket = new Ticket({
      ...donnees,
      numero: await prochainNumeroTicket(),
    });

    await ticket.save();
    contexte.idsCrees.push(ticket._id);
  }

  console.log(`${TOTAL} tickets de démonstration créés.`);
  console.log('Comptes de démonstration :');
  for (const [email, role] of PROFILS) {
    console.log(`- ${email} (${role})`);
  }
  console.log(`Mot de passe initial : ${MOT_DE_PASSE}`);
}

try {
  await executer();
} catch (erreur) {
  console.error('Erreur seed :', erreur.message);
  process.exitCode = 1;
} finally {
  await mongoose.disconnect();
}
