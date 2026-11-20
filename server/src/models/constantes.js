// Valeurs autorisées, issues du dossier de cadrage

export const ROLES = ['ADMIN', 'GESTIONNAIRE', 'CLIENT', 'LECTEUR'];

export const STATUTS = ['NOUVEAU', 'EN_COURS', 'EN_ATTENTE_DEMANDEUR', 'TERMINE', 'ABANDONNE'];

// Impact : moi seul / mon équipe / toute l'entreprise
export const IMPACTS = ['FAIBLE', 'MOYEN', 'FORT'];

// Urgence : je peux continuer / mode dégradé / je suis bloqué
export const URGENCES = ['FAIBLE', 'MOYENNE', 'HAUTE'];

export const PRIORITES = ['BASSE', 'MOYENNE', 'HAUTE', 'CRITIQUE'];

// Rang numérique de chaque priorité : stockées en texte, les priorités se trieraient
// par ordre alphabétique (BASSE, CRITIQUE, HAUTE, MOYENNE). On trie donc sur ce rang.
export const RANG_PRIORITE = { BASSE: 1, MOYENNE: 2, HAUTE: 3, CRITIQUE: 4 };

// Dernière alerte SLA envoyée pour un ticket : la tâche planifiée n'alerte qu'au changement
export const NIVEAUX_ALERTE_SLA = ['AUCUNE', 'ORANGE', 'ROUGE'];

export const DOMAINES = [
  'RESEAU',
  'INFRASTRUCTURE',
  'APPLICATIF',
  'BASE_DE_DONNEES',
  'A_QUALIFIER',
];

// Canal d'origine : APPLICATION quand le demandeur crée lui-même le ticket
export const CANAUX = ['APPLICATION', 'TELEPHONE', 'EMAIL', 'DIRECT'];

// Champs tracés dans l'historique d'un ticket (VIGIE-9) : statut, assignation, priorité, domaine
export const CHAMPS_HISTORIQUE = ['statut', 'technicien', 'priorite', 'domaine'];

export const TYPES_NOTIFICATION = [
  'NOUVEAU_TICKET',
  'TICKET_MIS_A_JOUR',
  'CHANGEMENT_STATUT',
  'NOUVEAU_COMMENTAIRE',
  'ATTENTE_REPONSE',
  'TICKET_TERMINE',
  'TICKET_CONTESTE',
  'ALERTE_SLA',
  'RELANCE',
];

export const NOM_SERVICE_AUTRE = 'Autre / je ne sais pas';
