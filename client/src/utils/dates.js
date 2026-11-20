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
