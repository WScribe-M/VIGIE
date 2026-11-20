import {
  Calendar,
  CalendarCheck,
  Check,
  CircleAlert,
  Clock,
  Flag,
  History,
  Layers,
  Ticket,
  User,
  UserRound,
} from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { appelerApi } from '../api.js';
import { useAuth } from '../auth/AuthContext.jsx';
import { MENU_PAR_ROLE } from '../auth/roles.js';
import { Avatar } from '../composants/Avatar.jsx';
import { Button } from '../composants/Button.jsx';
import { Select, TextArea } from '../composants/Champs.jsx';
import { EmptyState, ErrorState, Skeleton } from '../composants/Etats.jsx';
import { MenuStatut } from '../composants/MenuStatut.jsx';
import { Modal } from '../composants/Modal.jsx';
import { PageHeader } from '../composants/PageHeader.jsx';
import { PriorityBadge } from '../composants/PriorityBadge.jsx';
import { ProgressTracker } from '../composants/ProgressTracker.jsx';
import { StatusBadge } from '../composants/StatusBadge.jsx';
import { IconeService, TRAIT_ICONE } from '../styles/icones.js';
import { LIBELLES_DOMAINE, LIBELLES_PRIORITE } from '../styles/libelles.js';
import { socket } from '../tempsReel/socket.js';
import { formaterDateHeure, formaterEcheance } from '../utils/dates.js';
import styles from './FicheTicket.module.css';

// Fiche d'un ticket (VIGIE-7) : docs/ecrans/05-fiche-ticket-client.md pour le demandeur,
// 06-fiche-ticket-gestionnaire.md pour le support. Échanges et historique : VIGIE-29 et VIGIE-9.

const ROLES_SUPPORT = ['GESTIONNAIRE', 'ADMIN'];
const TEXTE_MAX = 500;
// Requalification (VIGIE-5) : mêmes règles que le serveur (prioriteService), vérifiées ici pour
// répondre tout de suite ; le serveur reste celui qui décide
const MOTIF_MIN = 10;
const STATUTS_CLOS = ['TERMINE', 'ABANDONNE'];
const ICONE_16 = { size: 16, strokeWidth: TRAIT_ICONE, 'aria-hidden': true };

const nomComplet = (personne) => (personne ? `${personne.prenom} ${personne.nom}` : '');

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

function Personne({ personne }) {
  if (!personne) return 'Non assigné';
  return (
    <span className={styles.personne}>
      <Avatar id={personne._id} prenom={personne.prenom} nom={personne.nom} taille={24} />
      {nomComplet(personne)}
    </span>
  );
}

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

// Frise des 4 jalons (cadrage 9.8, décision 9.11) et phrase de suivi, calculées depuis le ticket
function suiviDuTicket(ticket) {
  const heure = (date) => formaterDateHeure(date);
  const termine = ticket.statut === 'TERMINE';
  const faits = [
    true,
    Boolean(ticket.vuParSupportLe || ticket.datePriseEnCharge),
    Boolean(ticket.datePriseEnCharge),
    termine,
  ];
  const courant = faits.indexOf(false);
  const etat = (index) => (faits[index] ? 'fait' : index === courant ? 'courant' : 'aVenir');
  const enAttente = ticket.statut === 'EN_ATTENTE_DEMANDEUR';

  const jalons = [
    { libelle: 'Reçu', detail: heure(ticket.createdAt) },
    { libelle: 'Vu par le support', detail: ticket.vuParSupportLe && heure(ticket.vuParSupportLe) },
    {
      libelle: 'Pris en charge',
      detail:
        ticket.datePriseEnCharge &&
        `${nomComplet(ticket.technicien)}, ${heure(ticket.datePriseEnCharge)}`,
      mention: enAttente ? 'En attente de votre réponse' : undefined,
    },
    {
      libelle: 'Terminé',
      detail: termine
        ? heure(ticket.dateCloture)
        : ticket.echeanceSla && `prévu avant ${formaterEcheance(ticket.echeanceSla)}`,
    },
  ].map((jalon, index) => ({ ...jalon, etat: etat(index) }));

  const echeance = ticket.echeanceSla && formaterEcheance(ticket.echeanceSla);
  let message;
  if (termine) message = `Résolu le ${heure(ticket.dateCloture)}.`;
  else if (enAttente)
    message = 'Le support attend votre réponse. Le délai reprendra dès que vous aurez répondu.';
  else if (ticket.datePriseEnCharge)
    message = `${nomComplet(ticket.technicien)} s’en occupe depuis le ${heure(ticket.datePriseEnCharge)}. Prochaine étape : résolution prévue avant ${echeance}.`;
  else message = `Votre demande est arrivée. Résolution prévue avant ${echeance}.`;

  return { jalons, message };
}

// Barre d'actions du support (fiche 06) : prise en charge et changement de statut
function ActionsSupport({ ticket, utilisateur, onAction, enCours }) {
  const prisParMoi = ticket.technicien?._id === utilisateur.id;
  return (
    <div className={styles.actions}>
      {ticket.statut === 'NOUVEAU' ? (
        <Button
          chargement={enCours === 'prise' && 'Prise en charge…'}
          onClick={() => onAction('prise')}
        >
          Prendre en charge
        </Button>
      ) : (
        prisParMoi && (
          <span className={styles.prisParMoi}>
            <Check {...ICONE_16} />
            Pris en charge par vous
          </span>
        )
      )}
      {ticket.transitionsPossibles?.length > 0 && (
        <MenuStatut
          statut={ticket.statut}
          possibles={ticket.transitionsPossibles}
          disabled={Boolean(enCours)}
          onChoisir={(statut) => onAction('statut', statut)}
        />
      )}
      {!STATUTS_CLOS.includes(ticket.statut) && (
        <Button
          variante="secondaire"
          icone={Flag}
          disabled={Boolean(enCours)}
          onClick={() => onAction('priorite')}
        >
          Requalifier la priorité
        </Button>
      )}
    </div>
  );
}

export function FicheTicket() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { utilisateur } = useAuth();
  const [ticket, setTicket] = useState(null);
  const [erreur, setErreur] = useState(null); // 'introuvable' | 'reseau'
  const [erreurAction, setErreurAction] = useState(null);
  const [enCours, setEnCours] = useState(null); // action en cours : 'prise' | 'statut' | 'priorite'
  const [modale, setModale] = useState(null); // 'TERMINE' | 'ABANDONNE' | 'PRIORITE'
  const [saisie, setSaisie] = useState({ cause: '', solution: '', motif: '', priorite: '' });
  const [erreursSaisie, setErreursSaisie] = useState({});

  const support = ROLES_SUPPORT.includes(utilisateur.role);
  // Retour vers l'accueil du rôle : « Mes demandes » pour un client, « Ma file » pour le support
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

  // Temps réel (VIGIE-12) : on rejoint la room du ticket ; à chaque modification annoncée par le
  // serveur, on recharge le ticket par l'API, qui reste la source de vérité
  useEffect(() => {
    const rejoindre = () => socket.emit('ticket:rejoindre', id, () => {});
    const surModification = (evenement) => evenement._id === id && charger();
    rejoindre();
    socket.on('connect', rejoindre);
    socket.on('ticket:modifie', surModification);
    return () => {
      socket.emit('ticket:quitter', id, () => {});
      socket.off('connect', rejoindre);
      socket.off('ticket:modifie', surModification);
    };
  }, [id, charger]);

  function reessayer() {
    setErreur(null);
    setTicket(null);
    charger();
  }

  // Appel d'une action ; la fiche renvoyée par l'API remplace l'ancienne
  async function executer(type, chemin, options) {
    setEnCours(type);
    setErreurAction(null);
    try {
      setTicket(await appelerApi(chemin, options));
      return true;
    } catch (err) {
      // 409 : un collègue a agi entre-temps, on recharge pour montrer l'état réel
      if (err.status === 409) charger();
      setErreurAction(err.message);
      return false;
    } finally {
      setEnCours(null);
    }
  }

  function surAction(type, statut) {
    if (type === 'prise') {
      executer('prise', `/tickets/${id}/prise-en-charge`, { methode: 'POST' });
    } else if (type === 'priorite') {
      // La liste part de la priorité actuelle, comme sur la capture
      setSaisie({ cause: '', solution: '', motif: '', priorite: ticket.prioriteFinale });
      setErreursSaisie({});
      setErreurAction(null);
      setModale('PRIORITE');
    } else if (statut === 'TERMINE' || statut === 'ABANDONNE') {
      // Clôture et abandon demandent une saisie : on ouvre la fenêtre correspondante
      setSaisie({ cause: '', solution: '', motif: '' });
      setErreursSaisie({});
      setModale(statut);
    } else {
      executer('statut', `/tickets/${id}/statut`, { methode: 'PATCH', corps: { statut } });
    }
  }

  async function confirmerModale() {
    const champs = modale === 'TERMINE' ? ['cause', 'solution'] : ['motif'];
    const manquants = {};
    for (const champ of champs) {
      if (!saisie[champ].trim()) manquants[champ] = 'Ce champ est obligatoire.';
    }
    setErreursSaisie(manquants);
    if (Object.keys(manquants).length) return;

    const corps = { statut: modale };
    for (const champ of champs) corps[champ] = saisie[champ];
    const reussi = await executer('statut', `/tickets/${id}/statut`, { methode: 'PATCH', corps });
    if (reussi) setModale(null);
  }

  async function confirmerRequalification() {
    const manquants = {};
    if (saisie.priorite === ticket.prioriteFinale) {
      manquants.priorite = 'Le ticket a déjà cette priorité.';
    }
    if (saisie.motif.trim().length < MOTIF_MIN) {
      manquants.motif = `Indiquez un motif (${MOTIF_MIN} caractères minimum).`;
    }
    setErreursSaisie(manquants);
    if (Object.keys(manquants).length) return;

    const corps = { priorite: saisie.priorite, motif: saisie.motif };
    const reussi = await executer('priorite', `/tickets/${id}/priorite`, {
      methode: 'PATCH',
      corps,
    });
    if (reussi) setModale(null);
  }

  const modifierSaisie = (champ) => (event) => {
    setSaisie({ ...saisie, [champ]: event.target.value });
    setErreursSaisie({ ...erreursSaisie, [champ]: undefined });
  };

  let contenu;
  if (erreur === 'introuvable') {
    // Introuvable ou non autorisé : même message, on ne révèle pas l'existence du ticket
    contenu = (
      <EmptyState
        icone={Ticket}
        titre="Ce ticket n’existe plus ou ne vous est pas accessible"
        texte="Il a peut-être été fusionné avec un autre ticket. Retrouvez vos demandes depuis l’accueil."
        action={
          accueil && (
            <Button onClick={() => navigate(accueil.chemin)}>
              Retour à {accueil.libelle.toLowerCase()}
            </Button>
          )
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
    const abandonne = ticket.statut === 'ABANDONNE';
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
            {support && <PriorityBadge priorite={ticket.prioriteFinale} />}
          </div>
        </div>

        {support && (
          <ActionsSupport
            ticket={ticket}
            utilisateur={utilisateur}
            onAction={surAction}
            enCours={enCours}
          />
        )}
        {erreurAction && !modale && (
          <p className={styles.bandeau} role="alert">
            <CircleAlert size={18} strokeWidth={TRAIT_ICONE} aria-hidden="true" />
            {erreurAction}
          </p>
        )}

        {/* Abandonné : pas de frise, un message avec le motif (fiche 05) */}
        {abandonne ? (
          <p className={styles.messageAbandon}>
            Abandonné{ticket.motifAbandon ? ` : ${ticket.motifAbandon}` : '.'}
          </p>
        ) : (
          !support && <ProgressTracker {...suiviDuTicket(ticket)} />
        )}

        <section className={styles.carte} aria-label="Informations">
          <dl className={styles.informations}>
            <Information
              icone={<IconeService nom={ticket.service?.nom} size={16} />}
              libelle="Service"
            >
              {ticket.service?.nom}
            </Information>
            {support && (
              <>
                <Information icone={<Layers {...ICONE_16} />} libelle="Domaine">
                  {LIBELLES_DOMAINE[ticket.domaine]}
                </Information>
                <Information icone={<UserRound {...ICONE_16} />} libelle="Demandeur">
                  <Personne personne={ticket.demandeur} />
                </Information>
              </>
            )}
            <Information icone={<User {...ICONE_16} />} libelle="Technicien">
              <Personne personne={ticket.technicien} />
            </Information>
            <Information icone={<Calendar {...ICONE_16} />} libelle="Signalé le">
              {formaterDateHeure(ticket.createdAt)}
            </Information>
            {ticket.echeanceSla && (
              <Information icone={<Clock {...ICONE_16} />} libelle="Échéance">
                {formaterDateHeure(ticket.echeanceSla)}
              </Information>
            )}
            <Information icone={<History {...ICONE_16} />} libelle="Dernière modification">
              {formaterDateHeure(ticket.updatedAt)}
            </Information>
            {ticket.dateCloture && (
              <Information icone={<CalendarCheck {...ICONE_16} />} libelle="Clôturé le">
                {formaterDateHeure(ticket.dateCloture)}
              </Information>
            )}
          </dl>

          {/* Résolution structurée (VIGIE-44), visible du demandeur et du support */}
          {ticket.resolution && (
            <div className={styles.bloc}>
              <h2 className={styles.libelleBloc}>Résolution</h2>
              <p className={styles.texteResolution}>
                <strong>Cause :</strong> {ticket.resolution.cause}
              </p>
              <p className={styles.texteResolution}>
                <strong>Solution :</strong> {ticket.resolution.solution}
              </p>
              {ticket.resolution.auteur && (
                <p className={styles.auteurResolution}>
                  {nomComplet(ticket.resolution.auteur)} a clos le ticket le{' '}
                  {formaterDateHeure(ticket.resolution.date)}.
                </p>
              )}
            </div>
          )}

          <div className={styles.bloc}>
            <h2 className={styles.libelleBloc}>Description</h2>
            <p className={styles.description}>{ticket.description}</p>
          </div>
        </section>
      </div>
    );
  }

  return (
    <>
      <PageHeader retour={accueil && { chemin: accueil.chemin, libelle: accueil.libelle }} />
      <div className={styles.conteneur}>{contenu}</div>

      <Modal
        ouverte={modale === 'TERMINE'}
        titre="Terminer le ticket"
        onFermer={() => setModale(null)}
        actions={
          <>
            <Button variante="secondaire" onClick={() => setModale(null)}>
              Annuler
            </Button>
            <Button chargement={enCours && 'Clôture…'} onClick={confirmerModale}>
              Terminer le ticket
            </Button>
          </>
        }
      >
        <p>
          Décrivez la cause et la solution : elles serviront pour les incidents similaires.
          N’indiquez aucune donnée personnelle.
        </p>
        <TextArea
          libelle="Cause"
          obligatoire
          maxLength={TEXTE_MAX}
          value={saisie.cause}
          onChange={modifierSaisie('cause')}
          compteur={{ valeur: saisie.cause.length, max: TEXTE_MAX }}
          erreur={erreursSaisie.cause}
        />
        <TextArea
          libelle="Solution"
          obligatoire
          maxLength={TEXTE_MAX}
          value={saisie.solution}
          onChange={modifierSaisie('solution')}
          compteur={{ valeur: saisie.solution.length, max: TEXTE_MAX }}
          erreur={erreursSaisie.solution}
        />
        {erreurAction && <p className={styles.erreurModale}>{erreurAction}</p>}
      </Modal>

      <Modal
        ouverte={modale === 'ABANDONNE'}
        titre="Abandonner le ticket"
        onFermer={() => setModale(null)}
        actions={
          <>
            <Button variante="secondaire" onClick={() => setModale(null)}>
              Annuler
            </Button>
            <Button variante="danger" chargement={enCours && 'Abandon…'} onClick={confirmerModale}>
              Abandonner
            </Button>
          </>
        }
      >
        <p>Le ticket sera clos sans résolution. Le demandeur verra le motif.</p>
        <TextArea
          libelle="Motif"
          obligatoire
          maxLength={TEXTE_MAX}
          placeholder="Demande annulée, doublon de VIG-0042…"
          value={saisie.motif}
          onChange={modifierSaisie('motif')}
          erreur={erreursSaisie.motif}
        />
        {erreurAction && <p className={styles.erreurModale}>{erreurAction}</p>}
      </Modal>

      {/* Requalification (VIGIE-5, fiche 06 et capture composants-03-modales) */}
      <Modal
        ouverte={modale === 'PRIORITE'}
        titre="Requalifier la priorité"
        onFermer={() => setModale(null)}
        actions={
          <>
            <Button variante="secondaire" onClick={() => setModale(null)}>
              Annuler
            </Button>
            <Button chargement={enCours && 'Requalification…'} onClick={confirmerRequalification}>
              Requalifier
            </Button>
          </>
        }
      >
        <p className={styles.calculee}>
          Calculée : <PriorityBadge priorite={ticket?.prioriteCalculee} />
        </p>
        <Select
          libelle="Nouvelle priorité"
          obligatoire
          value={saisie.priorite}
          onChange={modifierSaisie('priorite')}
          erreur={erreursSaisie.priorite}
          apercu={<PriorityBadge priorite={saisie.priorite} />}
        >
          {Object.entries(LIBELLES_PRIORITE).map(([valeur, libelle]) => (
            <option key={valeur} value={valeur}>
              {libelle}
            </option>
          ))}
        </Select>
        <TextArea
          libelle="Motif"
          obligatoire
          maxLength={TEXTE_MAX}
          placeholder="Expliquez la raison au demandeur…"
          value={saisie.motif}
          onChange={modifierSaisie('motif')}
          erreur={erreursSaisie.motif}
        />
        {erreurAction && <p className={styles.erreurModale}>{erreurAction}</p>}
      </Modal>
    </>
  );
}
