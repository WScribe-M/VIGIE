import { Calendar, Clock, Ticket, User } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { appelerApi } from '../api.js';
import { useAuth } from '../auth/AuthContext.jsx';
import { MENU_PAR_ROLE } from '../auth/roles.js';
import { Avatar } from '../composants/Avatar.jsx';
import { Button } from '../composants/Button.jsx';
import { EmptyState, ErrorState, Skeleton } from '../composants/Etats.jsx';
import { PageHeader } from '../composants/PageHeader.jsx';
import { StatusBadge } from '../composants/StatusBadge.jsx';
import { IconeService, TRAIT_ICONE } from '../styles/icones.js';
import { formaterDateHeure } from '../utils/dates.js';
import styles from './FicheTicket.module.css';

// Fiche d'un ticket, version minimale de VIGIE-3 (« Suivre ma demande ») : en-tête, informations
// et description (docs/ecrans/05-fiche-ticket-client.md). La frise de suivi, les échanges et
// l'historique arrivent avec VIGIE-7, VIGIE-13 et VIGIE-9.

// `icone` : l'icône déjà construite (<User size={16} … />)
function Information({ icone, libelle, children }) {
  return (
    <div className={styles.ligne}>
      <dt>
        {icone}
        {libelle}
      </dt>
      <dd>{children}</dd>
    </div>
  );
}

const ICONE_16 = { size: 16, strokeWidth: TRAIT_ICONE, 'aria-hidden': true };

function Chargement() {
  return (
    <div className={styles.page} aria-busy="true" aria-label="Chargement du ticket">
      <Skeleton largeur={220} hauteur={12} />
      <Skeleton largeur={360} hauteur={28} />
      <Skeleton largeur={100} hauteur={28} />
      <Skeleton hauteur={140} />
    </div>
  );
}

export function FicheTicket() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { utilisateur } = useAuth();
  const [ticket, setTicket] = useState(null);
  const [erreur, setErreur] = useState(null); // 'introuvable' | 'reseau'

  // Retour vers l'accueil du rôle : « Mes demandes » pour un client
  const accueil = MENU_PAR_ROLE[utilisateur.role]?.[0];

  // Les états ne changent que dans la réponse de l'API, jamais directement dans l'effet
  const charger = useCallback(() => {
    appelerApi(`/tickets/${id}`)
      .then(setTicket)
      .catch((err) => setErreur(err.status === 404 ? 'introuvable' : 'reseau'));
  }, [id]);
  useEffect(() => {
    charger();
  }, [charger]);

  function reessayer() {
    setErreur(null);
    setTicket(null);
    charger();
  }

  let contenu;
  if (erreur === 'introuvable') {
    // Introuvable ou non autorisé : même message, on ne révèle pas l'existence du ticket
    contenu = (
      <EmptyState
        icone={Ticket}
        titre="Ce ticket n’existe plus ou ne vous est pas accessible"
        texte="Il a peut-être été fusionné avec un autre ticket. Retrouvez vos demandes depuis l’accueil."
        action={
          accueil && <Button onClick={() => navigate(accueil.chemin)}>Retour à mes demandes</Button>
        }
      />
    );
  } else if (erreur) {
    contenu = (
      <ErrorState
        titre="Impossible de charger le ticket"
        texte="Le serveur ne répond pas. Réessayez dans un instant."
        onReessayer={reessayer}
      />
    );
  } else if (!ticket) {
    contenu = <Chargement />;
  } else {
    const parMoi = ticket.demandeur?._id === utilisateur.id;
    contenu = (
      <div className={styles.page}>
        <div className={styles.entete}>
          <p className={`${styles.meta} chiffres`}>
            {ticket.reference} · signalé {parMoi ? 'par vous ' : ''}le{' '}
            {formaterDateHeure(ticket.createdAt)}
          </p>
          <h1 className="text-display-lg">{ticket.titre}</h1>
          <div className={styles.badges}>
            <StatusBadge statut={ticket.statut} taille={28} />
          </div>
        </div>

        <section className={styles.carte} aria-label="Informations">
          <dl className={styles.informations}>
            <Information
              icone={<IconeService nom={ticket.service?.nom} size={16} />}
              libelle="Service"
            >
              {ticket.service?.nom}
            </Information>
            <Information icone={<User {...ICONE_16} />} libelle="Technicien">
              {ticket.technicien ? (
                <span className={styles.personne}>
                  <Avatar
                    id={ticket.technicien._id}
                    prenom={ticket.technicien.prenom}
                    nom={ticket.technicien.nom}
                    taille={24}
                  />
                  {ticket.technicien.prenom} {ticket.technicien.nom}
                </span>
              ) : (
                'Non assigné'
              )}
            </Information>
            <Information icone={<Calendar {...ICONE_16} />} libelle="Signalé le">
              {formaterDateHeure(ticket.createdAt)}
            </Information>
            {ticket.echeanceSla && (
              <Information icone={<Clock {...ICONE_16} />} libelle="Échéance">
                {formaterDateHeure(ticket.echeanceSla)}
              </Information>
            )}
          </dl>
          <div className={styles.description}>
            <h2 className={styles.libelleDescription}>Description</h2>
            <p>{ticket.description}</p>
          </div>
        </section>
      </div>
    );
  }

  return (
    <>
      <PageHeader retour={accueil && { chemin: accueil.chemin, libelle: accueil.libelle }} />
      <div className={styles.conteneur}>{contenu}</div>
    </>
  );
}
