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

// Échéance d'un ticket ouvert à « debut » : on avance dans le calendrier en ne comptant que
// les heures ouvrées. Un ticket créé le vendredi à 17 h en Critique (4 h) est dû le lundi à 12 h.
// Fonction pure (horaires injectables) pour être testée sans dépendre de la configuration.
export function calculerEcheance(debut, priorite, horaires = config.sla) {
  const { heures = 0, jours = 0 } = DELAIS[priorite];
  let restant = (heures * 60 + jours * (horaires.fin - horaires.debut)) * MINUTE;
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
