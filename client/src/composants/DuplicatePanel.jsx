import { Check, CircleAlert, Copy, Info, RefreshCw, Users } from 'lucide-react';
import { TRAIT_ICONE } from '../styles/icones.js';
import { formaterDepuis } from '../utils/dates.js';
import { Button } from './Button.jsx';
import { Skeleton } from './Etats.jsx';
import { StatusBadge } from './StatusBadge.jsx';
import styles from './DuplicatePanel.module.css';

// Panneau « Ce problème est peut-être déjà signalé » (docs/ecrans/03-creer-un-ticket.md, parcours 1,
// composants.md : DuplicatePanel). Composant d'affichage : la page fait la recherche et le rattachement.
// Une suggestion ne montre que le titre, le service, le statut et la date d'ouverture (cadrage 9.3,
// plan A) : ni numéro, ni demandeur, ni technicien, ni nombre de concernés avant d'avoir rejoint.

const personnes = (nombre) =>
  nombre > 1 ? `${nombre} personnes concernées` : '1 personne concernée';

function Suggestion({ suggestion, rejoint, rattachement, onRejoindre }) {
  const concerne = suggestion.dejaConcerne || rejoint;
  const enCours = rattachement?.id === suggestion._id && rattachement.enCours;
  const erreur = rattachement?.id === suggestion._id ? rattachement.erreur : null;

  return (
    <li className={styles.carte}>
      <StatusBadge statut={suggestion.statut} />
      <p className={styles.titre} title={suggestion.titre}>
        {suggestion.titre}
      </p>
      <p className={styles.meta}>
        Signalé {formaterDepuis(suggestion.createdAt)}
        {suggestion.service && ` · ${suggestion.service.nom}`}
        {/* Le nombre de concernés n'apparaît qu'après avoir rejoint (parcours 1, ⚠) */}
        {rejoint && ` · ${personnes(rejoint.concernes)}`}
      </p>
      {concerne ? (
        <span className={styles.concerne}>
          <Check size={15} strokeWidth={TRAIT_ICONE} aria-hidden="true" />
          Vous êtes concerné
        </span>
      ) : (
        <Button
          variante="secondaire"
          taille="sm"
          icone={Users}
          className={styles.bouton}
          chargement={enCours && 'Je suis aussi concerné'}
          onClick={() => onRejoindre(suggestion)}
        >
          Je suis aussi concerné
        </Button>
      )}
      {erreur && (
        <p className={styles.erreur} role="alert">
          {erreur}
        </p>
      )}
    </li>
  );
}

/**
 * @param recherche    titre saisi, tel qu'envoyé à l'API (null sous 3 caractères)
 * @param etat         'attente' (moins de 3 caractères) | 'chargement' | 'erreur' | 'resultats'
 * @param suggestions  tickets proposés par GET /api/tickets/similaires (0 à 3)
 * @param rejoints     { [id]: { reference, concernes } } : tickets rejoints sur cette page
 * @param rattachement { id, enCours, erreur } : « Je suis aussi concerné » en cours ou refusé
 */
export function DuplicatePanel({
  recherche,
  etat,
  suggestions = [],
  rejoints = {},
  rattachement,
  onRejoindre,
  onReessayer,
}) {
  if (etat === 'attente') {
    return (
      <div className={`${styles.encadre} ${styles.attente}`}>
        Les tickets similaires apparaîtront ici dès 3 caractères.
      </div>
    );
  }

  if (etat === 'chargement') {
    return (
      <div className={styles.encadre} role="status" aria-busy="true">
        Recherche de tickets similaires…
        <Skeleton largeur="70%" hauteur={14} />
        <Skeleton largeur="45%" hauteur={14} />
      </div>
    );
  }

  // État non dessiné : composé comme l'état vide, avec une seule action (design-system.md)
  if (etat === 'erreur') {
    return (
      <div className={`${styles.encadre} ${styles.ligne}`} role="alert">
        <CircleAlert
          className={styles.iconeErreur}
          size={18}
          strokeWidth={TRAIT_ICONE}
          aria-hidden="true"
        />
        <div className={styles.texteErreur}>
          <p>
            Impossible de rechercher les tickets similaires. Vous pouvez continuer votre
            déclaration.
          </p>
          <Button variante="tertiaire" taille="sm" icone={RefreshCw} onClick={onReessayer}>
            Réessayer
          </Button>
        </div>
      </div>
    );
  }

  if (!suggestions.length) {
    return (
      <div className={`${styles.encadre} ${styles.ligne}`} role="status">
        <Info size={18} strokeWidth={TRAIT_ICONE} aria-hidden="true" />
        Aucun ticket ouvert ne ressemble au vôtre. Continuez.
      </div>
    );
  }

  const nombre = suggestions.length;
  return (
    <section className={styles.panneau} aria-labelledby="doublons-titre" aria-live="polite">
      <div className={styles.entete}>
        <Copy className={styles.icone} size={20} strokeWidth={TRAIT_ICONE} aria-hidden="true" />
        <div>
          <h2 id="doublons-titre" className={styles.titrePanneau}>
            Ce problème est peut-être déjà signalé
          </h2>
          <p className={styles.texte}>
            {nombre > 1
              ? `${nombre} tickets ouverts ressemblent à « ${recherche} ».`
              : `1 ticket ouvert ressemble à « ${recherche} ».`}{' '}
            Rejoignez-en un : chaque avancée vous sera signalée.
          </p>
        </div>
      </div>
      <ul className={styles.liste}>
        {suggestions.map((suggestion) => (
          <Suggestion
            key={suggestion._id}
            suggestion={suggestion}
            rejoint={rejoints[suggestion._id]}
            rattachement={rattachement}
            onRejoindre={onRejoindre}
          />
        ))}
      </ul>
      <p className={styles.texte}>Ce n’est pas le même problème ? Continuez votre déclaration.</p>
    </section>
  );
}
