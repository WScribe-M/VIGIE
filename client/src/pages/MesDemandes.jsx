import { ChevronRight, Inbox, Plus } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { appelerApi } from '../api.js';
import { useAuth } from '../auth/AuthContext.jsx';
import { Button } from '../composants/Button.jsx';
import { EmptyState, ErrorState, Skeleton } from '../composants/Etats.jsx';
import { PageHeader } from '../composants/PageHeader.jsx';
import { StatusBadge } from '../composants/StatusBadge.jsx';
import { IconeService, TRAIT_ICONE } from '../styles/icones.js';
import { formaterEcheance } from '../utils/dates.js';
import styles from './MesDemandes.module.css';

// « Mes demandes », version minimale de VIGIE-3 : le ticket créé apparaît dans la liste
// (docs/ecrans/02-mes-demandes.md). Cartes de synthèse, tickets suivis et temps réel : VIGIE-18.

const STATUTS_CLOS = ['TERMINE', 'ABANDONNE'];

function LigneTicket({ ticket }) {
  const meta = STATUTS_CLOS.includes(ticket.statut)
    ? ticket.reference
    : `${ticket.reference} · résolution prévue avant ${formaterEcheance(ticket.echeanceSla)}`;
  return (
    <li>
      <Link to={`/tickets/${ticket._id}`} className={styles.ligne}>
        <IconeService nom={ticket.service?.nom} className={styles.icone} size={20} />
        <span className={styles.textes}>
          <span className={styles.titre}>{ticket.titre}</span>
          <span className={`${styles.meta} chiffres`}>{meta}</span>
        </span>
        <StatusBadge statut={ticket.statut} taille={26} />
        <ChevronRight
          className={styles.chevron}
          size={16}
          strokeWidth={TRAIT_ICONE}
          aria-hidden="true"
        />
      </Link>
    </li>
  );
}

export function MesDemandes() {
  const navigate = useNavigate();
  const { utilisateur } = useAuth();
  const [tickets, setTickets] = useState(null); // null : chargement
  const [erreur, setErreur] = useState(false);

  // Les états ne changent que dans la réponse de l'API, jamais directement dans l'effet
  const charger = useCallback(() => {
    appelerApi('/tickets')
      .then(setTickets)
      .catch(() => setErreur(true));
  }, []);
  useEffect(() => {
    charger();
  }, [charger]);

  function reessayer() {
    setErreur(false);
    setTickets(null);
    charger();
  }

  const boutonNouveau = (
    <Button icone={Plus} onClick={() => navigate('/tickets/nouveau')}>
      Nouveau ticket
    </Button>
  );

  let contenu;
  if (erreur) {
    contenu = (
      <ErrorState
        titre="Impossible de charger vos demandes"
        texte="Le serveur ne répond pas. Vos demandes ne sont pas perdues ; en cas d’urgence, appelez le 4400."
        onReessayer={reessayer}
      />
    );
  } else if (!tickets) {
    contenu = (
      <div className={styles.carte} aria-busy="true" aria-label="Chargement de vos demandes">
        {[1, 2, 3].map((n) => (
          <div key={n} className={styles.ligneSquelette}>
            <Skeleton largeur={20} hauteur={20} />
            <span className={styles.textes}>
              <Skeleton largeur="60%" />
              <Skeleton largeur="40%" hauteur={12} />
            </span>
            <Skeleton largeur={80} hauteur={26} rond />
          </div>
        ))}
      </div>
    );
  } else if (!tickets.length) {
    contenu = (
      <EmptyState
        icone={Inbox}
        titre="Aucune demande pour l’instant"
        texte="Un souci avec votre poste, le VPN ou une imprimante ? Signalez-le en moins d’une minute."
        action={boutonNouveau}
      />
    );
  } else {
    contenu = (
      <section className={styles.carte} aria-labelledby="recents">
        <h2 id="recents" className={styles.titreCarte}>
          Mes tickets récents
        </h2>
        <ul className={styles.liste}>
          {tickets.map((ticket) => (
            <LigneTicket key={ticket._id} ticket={ticket} />
          ))}
        </ul>
      </section>
    );
  }

  return (
    <>
      <PageHeader />
      <div className={styles.page}>
        <div className={styles.accueil}>
          <h1 className="text-display-lg">Bonjour {utilisateur.prenom}</h1>
          {tickets?.length > 0 && boutonNouveau}
        </div>
        {contenu}
      </div>
    </>
  );
}
