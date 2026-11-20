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
const MOTIF_MIN = 10;
const STATUTS_CLOS = ['TERMINE', 'ABANDONNE'];
const ICONE_16 = { size: 16, strokeWidth: TRAIT_ICONE, 'aria-hidden': true };

const nomComplet = (personne) => (personne ? `${personne.prenom} ${personne.nom}` : '');

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
    {
      libelle: 'Reçu',
      detail: heure(ticket.createdAt),
    },
    {
      libelle: 'Vu par le support',
      detail: ticket.vuParSupportLe && heure(ticket.vuParSupportLe),
    },
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
  ].map((jalon, index) => ({
    ...jalon,
    etat: etat(index),
  }));

  const echeance = ticket.echeanceSla && formaterEcheance(ticket.echeanceSla);

  let message;

  if (termine) {
    message = `Résolu le ${heure(ticket.dateCloture)}.`;
  } else if (enAttente) {
    message = 'Le support attend votre réponse. Le délai reprendra dès que vous aurez répondu.';
  } else if (ticket.datePriseEnCharge) {
    message = `${nomComplet(ticket.technicien)} s’en occupe depuis le ${heure(
      ticket.datePriseEnCharge,
    )}. Prochaine étape : résolution prévue avant ${echeance}.`;
  } else {
    message = `Votre demande est arrivée. Résolution prévue avant ${echeance}.`;
  }

  return { jalons, message };
}

function ActionsSupport({ ticket, utilisateur, onAction, enCours }) {
  const prisParMoi = ticket.technicien?._id === utilisateur.id;

  return (
    <div className={styles.actions}>
      {ticket.statut === 'NOUVEAU' ? (
        <Button
          chargement={enCours === 'prise' && 'Prise en charge…'}
          disabled={Boolean(enCours)}
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

  // VIGIE-29 : commentaires
  const [nouveauCommentaire, setNouveauCommentaire] = useState('');

  // VIGIE-29 : attribution
  const [gestionnaires, setGestionnaires] = useState([]);
  const [technicienChoisi, setTechnicienChoisi] = useState('');

  const [erreur, setErreur] = useState(null);
  const [erreurAction, setErreurAction] = useState(null);
  const [enCours, setEnCours] = useState(null);
  const [modale, setModale] = useState(null);

  const [saisie, setSaisie] = useState({
    cause: '',
    solution: '',
    motif: '',
    priorite: '',
  });

  const [erreursSaisie, setErreursSaisie] = useState({});

  const support = ROLES_SUPPORT.includes(utilisateur.role);
  const accueil = MENU_PAR_ROLE[utilisateur.role]?.[0];

  // Charger les gestionnaires actifs pour le responsable DSI.
  useEffect(() => {
    if (utilisateur.role !== 'ADMIN') return;

    appelerApi('/tickets/gestionnaires')
      .then(setGestionnaires)
      .catch(() => {
        setErreurAction('Impossible de charger la liste des techniciens.');
      });
  }, [utilisateur.role]);

  const charger = useCallback(() => {
    appelerApi(`/tickets/${id}`)
      .then(setTicket)
      .catch((err) => {
        setErreur(err.status === 404 ? 'introuvable' : 'reseau');
      });
  }, [id]);

  useEffect(() => {
    charger();
  }, [charger]);

  // Recharger la fiche lorsqu'un ticket est modifié en temps réel.
  useEffect(() => {
    const rejoindre = () => socket.emit('ticket:rejoindre', id, () => {});

    const surModification = (evenement) => {
      if (evenement._id === id) charger();
    };

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

  // Exécuter une action puis afficher la fiche mise à jour.
  async function executer(type, chemin, options) {
    setEnCours(type);
    setErreurAction(null);

    try {
      setTicket(await appelerApi(chemin, options));
      return true;
    } catch (err) {
      if (err.status === 409) charger();

      setErreurAction(err.message);
      return false;
    } finally {
      setEnCours(null);
    }
  }

  // VIGIE-29 : envoyer un commentaire.
  async function envoyerCommentaire(event) {
    event.preventDefault();

    const texte = nouveauCommentaire.trim();
    if (!texte || enCours) return;

    const reussi = await executer('commentaire', `/tickets/${id}/commentaires`, {
      methode: 'POST',
      corps: { texte },
    });

    if (reussi) {
      setNouveauCommentaire('');
    }
  }

  // VIGIE-29 : attribuer ou réattribuer un technicien.
  async function confirmerAttribution(event) {
    event.preventDefault();

    if (!technicienChoisi || enCours) return;

    const reussi = await executer('attribution', `/tickets/${id}/technicien`, {
      methode: 'PATCH',
      corps: { technicienId: technicienChoisi },
    });

    if (reussi) {
      setTechnicienChoisi('');
    }
  }

  function surAction(type, statut) {
    if (type === 'prise') {
      executer('prise', `/tickets/${id}/prise-en-charge`, {
        methode: 'POST',
      });
    } else if (type === 'priorite') {
      setSaisie({
        cause: '',
        solution: '',
        motif: '',
        priorite: ticket.prioriteFinale,
      });

      setErreursSaisie({});
      setErreurAction(null);
      setModale('PRIORITE');
    } else if (statut === 'TERMINE' || statut === 'ABANDONNE') {
      setSaisie({
        cause: '',
        solution: '',
        motif: '',
      });

      setErreursSaisie({});
      setModale(statut);
    } else {
      executer('statut', `/tickets/${id}/statut`, {
        methode: 'PATCH',
        corps: { statut },
      });
    }
  }

  async function confirmerModale() {
    const champs = modale === 'TERMINE' ? ['cause', 'solution'] : ['motif'];

    const manquants = {};

    for (const champ of champs) {
      if (!saisie[champ].trim()) {
        manquants[champ] = 'Ce champ est obligatoire.';
      }
    }

    setErreursSaisie(manquants);

    if (Object.keys(manquants).length) return;

    const corps = { statut: modale };

    for (const champ of champs) {
      corps[champ] = saisie[champ];
    }

    const reussi = await executer('statut', `/tickets/${id}/statut`, {
      methode: 'PATCH',
      corps,
    });

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

    const corps = {
      priorite: saisie.priorite,
      motif: saisie.motif,
    };

    const reussi = await executer('priorite', `/tickets/${id}/priorite`, {
      methode: 'PATCH',
      corps,
    });

    if (reussi) setModale(null);
  }

  const modifierSaisie = (champ) => (event) => {
    setSaisie({
      ...saisie,
      [champ]: event.target.value,
    });

    setErreursSaisie({
      ...erreursSaisie,
      [champ]: undefined,
    });
  };

  let contenu;

  if (erreur === 'introuvable') {
    contenu = (
      <EmptyState
        icone={Ticket}
        titre="Ce ticket n’existe plus ou ne vous est pas accessible"
        texte="Il a peut-être été fusionné avec un autre ticket. Retrouvez vos demandes depuis l’accueil."
        action={
          accueil && (
            <Button onClick={() => navigate(accueil.chemin)}>
              {utilisateur.role === 'CLIENT' ? 'Retour à mes demandes' : 'Retour à l’accueil'}
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
            {ticket.reference} · signalé {parMoi ? 'par vous ' : ''}
            le {formaterDateHeure(ticket.createdAt)}
          </p>

          <h1 className="text-display-lg">{ticket.titre}</h1>

          <div className={styles.badges}>
            <StatusBadge statut={ticket.statut} taille={28} />

            {support && <PriorityBadge priorite={ticket.prioriteFinale} />}
          </div>
        </div>

        {/* VIGIE-29 : attribution réservée à l'ADMIN */}
        {utilisateur.role === 'ADMIN' && !STATUTS_CLOS.includes(ticket.statut) && (
          <section className={styles.carte} aria-label="Attribution du technicien">
            <h2 className={styles.titreCommentaires}>Attribuer un technicien</h2>

            <form onSubmit={confirmerAttribution} className={styles.formulaireCommentaire}>
              <Select
                libelle="Technicien responsable"
                obligatoire
                value={technicienChoisi}
                onChange={(event) => setTechnicienChoisi(event.target.value)}
              >
                <option value="">Sélectionner un technicien</option>

                {gestionnaires.map((gestionnaire) => (
                  <option
                    key={gestionnaire._id}
                    value={gestionnaire._id}
                    disabled={gestionnaire._id === ticket.technicien?._id}
                  >
                    {nomComplet(gestionnaire)}
                    {gestionnaire._id === ticket.technicien?._id ? ' (actuel)' : ''}
                  </option>
                ))}
              </Select>

              <Button
                type="submit"
                disabled={
                  !technicienChoisi ||
                  Boolean(enCours) ||
                  technicienChoisi === ticket.technicien?._id
                }
                chargement={enCours === 'attribution' && 'Attribution…'}
              >
                {ticket.technicien ? 'Réattribuer le ticket' : 'Attribuer le ticket'}
              </Button>
            </form>
          </section>
        )}

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

        {abandonne ? (
          <p className={styles.messageAbandon}>
            Abandonné
            {ticket.motifAbandon ? ` : ${ticket.motifAbandon}` : '.'}
          </p>
        ) : (
          !support && <ProgressTracker {...suiviDuTicket(ticket)} />
        )}

        {/* Informations du ticket */}
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

          {/* Résolution du ticket */}
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

        {/* VIGIE-29 : commentaires publics */}
        <section className={styles.carte} aria-label="Commentaires">
          <h2 className={styles.titreCommentaires}>Commentaires</h2>

          {ticket.commentaires?.length ? (
            <div className={styles.listeCommentaires}>
              {ticket.commentaires.map((commentaire) => (
                <article key={commentaire._id} className={styles.commentaire}>
                  <div className={styles.enteteCommentaire}>
                    <strong>{nomComplet(commentaire.auteur) || 'Utilisateur'}</strong>

                    <time dateTime={commentaire.date}>{formaterDateHeure(commentaire.date)}</time>
                  </div>

                  <p className={styles.texteCommentaire}>{commentaire.texte}</p>
                </article>
              ))}
            </div>
          ) : (
            <p className={styles.aucunCommentaire}>Aucun commentaire pour le moment.</p>
          )}

          {utilisateur.role !== 'LECTEUR' && (
            <form onSubmit={envoyerCommentaire} className={styles.formulaireCommentaire}>
              <TextArea
                libelle="Votre commentaire"
                obligatoire
                maxLength={2000}
                value={nouveauCommentaire}
                onChange={(event) => setNouveauCommentaire(event.target.value)}
                placeholder="Écrivez votre message au sujet de ce ticket…"
                compteur={{
                  valeur: nouveauCommentaire.length,
                  max: 2000,
                }}
              />

              <Button
                type="submit"
                disabled={!nouveauCommentaire.trim() || Boolean(enCours)}
                chargement={enCours === 'commentaire' && 'Envoi…'}
              >
                Envoyer le commentaire
              </Button>

              {erreurAction && (
                <p className={styles.erreurModale} role="alert">
                  {erreurAction}
                </p>
              )}
            </form>
          )}
        </section>
      </div>
    );
  }

  return (
    <>
      <PageHeader
        retour={
          accueil && {
            chemin: accueil.chemin,
            libelle: accueil.libelle,
          }
        }
      />

      <div className={styles.conteneur}>{contenu}</div>

      {/* Modale de résolution */}
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
          compteur={{
            valeur: saisie.cause.length,
            max: TEXTE_MAX,
          }}
          erreur={erreursSaisie.cause}
        />

        <TextArea
          libelle="Solution"
          obligatoire
          maxLength={TEXTE_MAX}
          value={saisie.solution}
          onChange={modifierSaisie('solution')}
          compteur={{
            valeur: saisie.solution.length,
            max: TEXTE_MAX,
          }}
          erreur={erreursSaisie.solution}
        />

        {erreurAction && <p className={styles.erreurModale}>{erreurAction}</p>}
      </Modal>

      {/* Modale d'abandon */}
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

      {/* Modale de requalification */}
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
