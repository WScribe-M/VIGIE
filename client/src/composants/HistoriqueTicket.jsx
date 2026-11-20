import { CircleDot, Flag, History, PenLine, Plus, RotateCcw, User, Users } from 'lucide-react';
import { ICONES_STATUT } from '../styles/icones.js';
import { LIBELLES_DOMAINE } from '../styles/libelles.js';
import { formaterDateHeure } from '../utils/dates.js';
import { EmptyState } from './Etats.jsx';
import { PriorityBadge } from './PriorityBadge.jsx';
import { StatusBadge } from './StatusBadge.jsx';
import { Changement, Timeline, TimelineItem } from './TimelineItem.jsx';

// Historique d'un ticket (VIGIE-9) : traduit chaque entrée renvoyée par l'API (champ, ancienne et
// nouvelle valeur, auteur, date, motif) en un élément de frise, avec les textes de la fiche 06.

const nomComplet = (personne) => (personne ? `${personne.prenom} ${personne.nom}` : '');
const memeId = (a, b) => Boolean(a && b) && String(a._id ?? a) === String(b._id ?? b);

// La prise en charge écrit deux entrées au même instant (statut NOUVEAU → EN_COURS, puis le
// technicien) : on n'en affiche qu'une, « a pris en charge le ticket »
function estPartieDUnePriseEnCharge(entree, historique) {
  return (
    entree.champ === 'technicien' &&
    historique.some(
      (autre) =>
        autre.champ === 'statut' &&
        autre.ancienneValeur === 'NOUVEAU' &&
        autre.nouvelleValeur === 'EN_COURS' &&
        autre.date === entree.date &&
        memeId(autre.auteur, entree.auteur),
    )
  );
}

function statuts(entree) {
  return (
    <Changement
      avant={<StatusBadge statut={entree.ancienneValeur} />}
      apres={<StatusBadge statut={entree.nouvelleValeur} />}
    />
  );
}

// Icône, phrase et changement affichés pour une entrée
function decrire(entree, demandeur) {
  const { champ, ancienneValeur: avant, nouvelleValeur: apres } = entree;
  if (champ === 'statut') {
    if (!avant) return { icone: Plus, action: 'a signalé l’incident' };
    if (avant === 'NOUVEAU' && apres === 'EN_COURS') {
      return { icone: User, action: 'a pris en charge le ticket', changement: statuts(entree) };
    }
    if (avant === 'TERMINE' && apres === 'EN_COURS') {
      // Contestation par le demandeur, ou réouverture par le support (cadrage 3.1)
      const action = memeId(entree.auteur, demandeur) ? 'a contesté' : 'a rouvert le ticket';
      return { icone: RotateCcw, action, changement: statuts(entree) };
    }
    return {
      icone: ICONES_STATUT[apres] ?? CircleDot,
      action: 'a changé le statut',
      changement: statuts(entree),
    };
  }
  if (champ === 'priorite') {
    return {
      icone: Flag,
      action: 'a requalifié la priorité',
      changement: (
        <Changement
          avant={<PriorityBadge priorite={avant} />}
          apres={<PriorityBadge priorite={apres} />}
        />
      ),
    };
  }
  if (champ === 'domaine') {
    return {
      icone: PenLine,
      action: 'a changé le domaine',
      changement: <Changement avant={LIBELLES_DOMAINE[avant]} apres={LIBELLES_DOMAINE[apres]} />,
    };
  }
  if (champ === 'technicien') {
    // « Non assigné » : texte du design system pour une personne absente
    return {
      icone: User,
      action: 'a modifié l’assignation',
      changement: (
        <Changement
          avant={nomComplet(avant) || 'Non assigné'}
          apres={nomComplet(apres) || 'Non assigné'}
        />
      ),
    };
  }
  return null;
}

/**
 * Historique d'un ticket, par ordre chronologique (l'API le renvoie déjà trié).
 * @param historique entrées de GET /api/tickets/:id
 * @param demandeur  demandeur du ticket : distingue une contestation d'une réouverture
 */
export function HistoriqueTicket({ historique = [], demandeur }) {
  const elements = historique
    .filter((entree) => !estPartieDUnePriseEnCharge(entree, historique))
    .map((entree) => ({ entree, description: decrire(entree, demandeur) }))
    .filter(({ description }) => description);

  // Personnes déclarées concernées (VIGIE-15) : une seule ligne, « 3 personnes se sont déclarées
  // concernées » (fiche 06), placée au dernier rattachement. Pas de noms : un client ne les reçoit
  // pas pour les autres personnes (masquerConcernes côté serveur).
  const concernes = historique.filter((entree) => entree.champ === 'concerne');
  if (concernes.length) {
    const derniere = concernes.at(-1);
    const position = elements.findIndex(
      ({ entree }) => new Date(entree.date) > new Date(derniere.date),
    );
    const une = concernes.length === 1;
    elements.splice(position === -1 ? elements.length : position, 0, {
      entree: { ...derniere, auteur: null, motif: null },
      description: {
        icone: Users,
        action: une
          ? '1 personne s’est déclarée concernée'
          : `${concernes.length} personnes se sont déclarées concernées`,
      },
    });
  }

  if (!elements.length) {
    return <EmptyState icone={History} titre="Aucun changement enregistré pour l’instant" />;
  }
  return (
    <Timeline libelle="Historique du ticket">
      {elements.map(({ entree, description }) => (
        <TimelineItem
          key={entree._id ?? `${entree.champ}-${entree.date}`}
          {...description}
          auteur={nomComplet(entree.auteur)}
          motif={entree.motif}
          date={entree.date}
          dateAffichee={formaterDateHeure(entree.date)}
        />
      ))}
    </Timeline>
  );
}
