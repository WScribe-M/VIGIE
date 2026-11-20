// Formats de date du design system (docs/design-system.md, « Formats ») : Intl, fr-FR

const JOUR_MOIS = new Intl.DateTimeFormat('fr-FR', { day: '2-digit', month: '2-digit' });
const DATE_HEURE = new Intl.DateTimeFormat('fr-FR', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
});

// « 11 h » ou « 11 h 30 », avec des espaces insécables
function heure(date) {
  const minutes = date.getMinutes();
  return `${date.getHours()}\u00a0h${minutes ? `\u00a0${String(minutes).padStart(2, '0')}` : ''}`;
}

// Échéance SLA : « le 20/11 à 11 h » (fiche 03 : « Résolution prévue avant le 20/11 à 11 h »)
export function formaterEcheance(valeur) {
  const date = new Date(valeur);
  return `le ${JOUR_MOIS.format(date)} à ${heure(date)}`;
}

// Métadonnée : « 17 nov. 2026, 10:24 »
export function formaterDateHeure(valeur) {
  return DATE_HEURE.format(new Date(valeur));
}

const ESPACE = '\u00a0';

// Durée en heures ouvrées (délai SLA) : « 28 min », « 3 h 40 », « 2 j ».
// `minutesParJour` : longueur d'une journée ouvrée, renvoyée par l'API (9 h par défaut).
export function formaterDureeOuvree(minutes, minutesParJour) {
  if (minutes < 60) return `${minutes}${ESPACE}min`;
  if (minutes < minutesParJour) {
    const heures = Math.floor(minutes / 60);
    const reste = minutes % 60;
    return `${heures}${ESPACE}h${reste ? `${ESPACE}${String(reste).padStart(2, '0')}` : ''}`;
  }
  return `${Math.floor(minutes / minutesParJour)}${ESPACE}j`;
}

// Durée calendaire (attente du demandeur) : « 25 min », « 5 h », « 4 j »
export function formaterDuree(minutes) {
  if (minutes < 60) return `${minutes}${ESPACE}min`;
  if (minutes < 24 * 60) return `${Math.floor(minutes / 60)}${ESPACE}h`;
  return `${Math.floor(minutes / (24 * 60))}${ESPACE}j`;
}
