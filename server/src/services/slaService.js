import { config } from '../config/env.js';

// Délai de résolution selon la priorité (cadrage 9.2), compté en heures ouvrées :
// un « jour » est une journée de travail (9 h à 18 h par défaut), pas 24 heures.
const DELAIS = {
  CRITIQUE: { heures: 4 },
  HAUTE: { jours: 1 },
  MOYENNE: { jours: 3 },
  BASSE: { jours: 5 },
};

const MINUTE = 60 * 1000;

// Jour de la semaine de 1 (lundi) à 7 (dimanche), comme SLA_WORK_DAYS
function jourSemaine(date) {
  return date.getDay() || 7;
}

// La même date, à une heure donnée en minutes depuis minuit (heure locale du serveur)
function aMinute(date, minutes) {
  const resultat = new Date(date);
  resultat.setHours(0, minutes, 0, 0);
  return resultat;
}

function lendemainDebut(date, horaires) {
  const lendemain = new Date(date);
  lendemain.setDate(lendemain.getDate() + 1);
  return aMinute(lendemain, horaires.debut);
}

// Délai de la priorité, en minutes ouvrées (une journée = heure de fin − heure de début)
export function delaiMinutes(priorite, horaires = config.sla) {
  const { heures = 0, jours = 0 } = DELAIS[priorite];
  return heures * 60 + jours * (horaires.fin - horaires.debut);
}

// Échéance d'un ticket ouvert à « debut » : on avance dans le calendrier en ne comptant que
// les heures ouvrées. Un ticket créé le vendredi à 17 h en Critique (4 h) est dû le lundi à 12 h.
// Fonction pure (horaires injectables) pour être testée sans dépendre de la configuration.
export function calculerEcheance(debut, priorite, horaires = config.sla) {
  return ajouterMinutesOuvrees(debut, delaiMinutes(priorite, horaires), horaires);
}

// La date atteinte après « minutes » minutes ouvrées à partir de « debut » (aussi utilisée par le
// seed de démonstration pour placer les événements pendant les heures de travail)
export function ajouterMinutesOuvrees(debut, minutes, horaires = config.sla) {
  let restant = minutes * MINUTE;
  let curseur = new Date(debut);

  // Au plus un an de recherche : protège d'une boucle sans fin si la configuration était vide
  for (let i = 0; i < 366; i++) {
    const ouvert = horaires.jours.includes(jourSemaine(curseur));
    const ouverture = aMinute(curseur, horaires.debut);
    const fermeture = aMinute(curseur, horaires.fin);

    if (ouvert && curseur < fermeture) {
      if (curseur < ouverture) {
        curseur = ouverture;
      }
      const disponible = fermeture - curseur;
      if (restant <= disponible) {
        return new Date(curseur.getTime() + restant);
      }
      restant -= disponible;
    }
    curseur = lendemainDebut(curseur, horaires);
  }
  throw new Error('Aucune heure ouvrée configurée pour le SLA');
}

// Minutes ouvrées entre deux dates (0 si fin est avant debut) : temps restant avant l'échéance,
// ou retard après l'échéance, comptés comme le délai, en heures ouvrées
export function minutesOuvreesEntre(debut, fin, horaires = config.sla) {
  let total = 0;
  let curseur = new Date(debut);
  const limite = new Date(fin);
  // Au plus dix ans de jours parcourus : protège d'une boucle sans fin
  for (let i = 0; i < 3660 && curseur < limite; i++) {
    if (horaires.jours.includes(jourSemaine(curseur))) {
      const ouverture = aMinute(curseur, horaires.debut);
      const fermeture = aMinute(curseur, horaires.fin);
      const de = Math.max(curseur, ouverture);
      const a = Math.min(limite, fermeture);
      if (a > de) total += a - de;
    }
    curseur = lendemainDebut(curseur, horaires);
  }
  return Math.round(total / MINUTE);
}

// Niveau SLA affiché (badge des listes, « À traiter ») : une lecture de l'échéance à un instant donné.
// Les alertes envoyées (niveauAlerteSla, tâche planifiée) relèvent de VIGIE-20, qui réutilisera
// cette fonction. Renvoie null pour un ticket clos ou sans échéance.
//   SUSPENDU        : en attente du demandeur (délai suspendu, cadrage 9.2) ; minutes depuis l'attente
//   EN_RETARD       : échéance dépassée ; minutes ouvrées de retard
//   ECHEANCE_PROCHE : au moins 75 % du délai écoulé (SLA_WARNING_RATIO) ; minutes ouvrées restantes
//   DANS_LES_TEMPS  : sinon ; minutes ouvrées restantes
export function niveauSla(ticket, maintenant = new Date(), horaires = config.sla) {
  if (ticket.statut === 'EN_ATTENTE_DEMANDEUR') {
    // Durée calendaire : « depuis 4 j » compte aussi les nuits et le week-end
    const depuis = ticket.dateStatut ? (maintenant - new Date(ticket.dateStatut)) / MINUTE : 0;
    return { niveau: 'SUSPENDU', minutes: Math.max(Math.round(depuis), 0) };
  }
  if (['TERMINE', 'ABANDONNE'].includes(ticket.statut) || !ticket.echeanceSla) {
    return null;
  }
  const echeance = new Date(ticket.echeanceSla);
  if (maintenant >= echeance) {
    return { niveau: 'EN_RETARD', minutes: minutesOuvreesEntre(echeance, maintenant, horaires) };
  }
  const restantes = minutesOuvreesEntre(maintenant, echeance, horaires);
  const proche =
    restantes <= delaiMinutes(ticket.prioriteFinale, horaires) * (1 - horaires.seuilAlerte);
  return { niveau: proche ? 'ECHEANCE_PROCHE' : 'DANS_LES_TEMPS', minutes: restantes };
}
