import {
  ArrowLeft,
  ArrowRight,
  Check,
  CircleAlert,
  CircleCheck,
  Info,
  PenLine,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import { appelerApi } from '../api.js';
import { Button } from '../composants/Button.jsx';
import { TextArea, TextField } from '../composants/Champs.jsx';
import { ChoiceGroup } from '../composants/ChoiceCard.jsx';
import { DelayEstimate } from '../composants/DelayEstimate.jsx';
import { ErrorState, Skeleton } from '../composants/Etats.jsx';
import { PageHeader } from '../composants/PageHeader.jsx';
import {
  ICONES_IMPACT,
  ICONES_URGENCE,
  IconeService,
  iconeService,
  TRAIT_ICONE,
} from '../styles/icones.js';
import {
  DESCRIPTIONS_IMPACT,
  DESCRIPTIONS_URGENCE,
  LIBELLES_IMPACT,
  LIBELLES_URGENCE,
} from '../styles/libelles.js';
import { formaterEcheance } from '../utils/dates.js';
import styles from './NouveauTicket.module.css';

// Création d'un ticket en deux étapes (docs/ecrans/03-creer-un-ticket.md, VIGIE-3).
// Le client ne choisit ni la priorité ni le délai : il répond à deux questions, le serveur calcule.
// Hors de cette story : suggestions de doublons (VIGIE-15) et pièces jointes (VIGIE-35).

const TITRE_MAX = 120;
const ETAPES = ['Décrire le problème', 'Évaluer la situation'];

// Les clés viennent de constantes.js via libelles.js : on ne réécrit pas les valeurs
const optionsDe = (libelles, descriptions, icones) =>
  Object.keys(libelles).map((valeur) => ({
    valeur,
    titre: libelles[valeur],
    description: descriptions[valeur],
    icone: icones[valeur],
  }));
const OPTIONS_IMPACT = optionsDe(LIBELLES_IMPACT, DESCRIPTIONS_IMPACT, ICONES_IMPACT);
const OPTIONS_URGENCE = optionsDe(LIBELLES_URGENCE, DESCRIPTIONS_URGENCE, ICONES_URGENCE);

const VIDE = { titre: '', probleme: '', depuis: '', messageErreur: '', service: null };

function verifierEtape1(champs) {
  const erreurs = {};
  if (!champs.titre.trim()) erreurs.titre = 'Le titre est obligatoire.';
  if (!champs.probleme.trim()) erreurs.probleme = 'Décrivez ce qui se passe.';
  if (!champs.depuis.trim()) erreurs.depuis = 'Indiquez depuis quand.';
  if (!champs.service) erreurs.service = 'Choisissez un service, ou « Autre / je ne sais pas ».';
  return erreurs;
}

function verifierEtape2(reponses) {
  const erreurs = {};
  if (!reponses.impact) erreurs.impact = 'Choisissez une réponse.';
  if (!reponses.urgence) erreurs.urgence = 'Choisissez une réponse.';
  return erreurs;
}

function Etapes({ courante }) {
  return (
    <ol className={styles.etapes} aria-label="Étapes">
      {ETAPES.map((libelle, index) => {
        const numero = index + 1;
        const etat = numero < courante ? 'faite' : numero === courante ? 'courante' : 'aVenir';
        return (
          <li
            key={libelle}
            className={`${styles.etape} ${styles[etat]}`}
            aria-current={etat === 'courante' ? 'step' : undefined}
          >
            {index > 0 && <span className={styles.trait} aria-hidden="true" />}
            <span className={styles.rond} aria-hidden="true">
              {etat === 'faite' ? <Check size={14} strokeWidth={3} /> : numero}
            </span>
            {libelle}
          </li>
        );
      })}
    </ol>
  );
}

function BandeauErreurs({ nombre, message, refBandeau }) {
  return (
    <div ref={refBandeau} className={styles.bandeau} role="alert" tabIndex={-1}>
      <CircleAlert size={18} strokeWidth={TRAIT_ICONE} aria-hidden="true" />
      {message ?? (
        <span>
          <strong>
            {nombre} {nombre > 1 ? 'champs à compléter' : 'champ à compléter'}
          </strong>{' '}
          avant de continuer.
        </span>
      )}
    </div>
  );
}

function NomService({ nom }) {
  return (
    <>
      <IconeService nom={nom} size={16} />
      {nom}
    </>
  );
}

function Confirmation({ ticket }) {
  const navigate = useNavigate();
  return (
    <div className={styles.confirmation} role="status">
      <CircleCheck
        className={styles.iconeSucces}
        size={32}
        strokeWidth={TRAIT_ICONE}
        aria-hidden="true"
      />
      <h2 className={styles.titreConfirmation}>Ticket {ticket.reference} créé</h2>
      <p className={styles.texteConfirmation}>
        Résolution prévue avant {formaterEcheance(ticket.echeanceSla)}. Chaque étape vous sera
        notifiée ici et par e-mail.
      </p>
      <Button onClick={() => navigate(`/tickets/${ticket._id}`)}>Suivre ma demande</Button>
    </div>
  );
}

export function NouveauTicket() {
  const navigate = useNavigate();
  const refBandeau = useRef(null);
  const [etape, setEtape] = useState(1);
  const [champs, setChamps] = useState(VIDE);
  const [reponses, setReponses] = useState({ impact: null, urgence: null });
  const [erreurs, setErreurs] = useState({});
  const [services, setServices] = useState(null); // null : chargement
  const [erreurServices, setErreurServices] = useState(false);
  const [estimation, setEstimation] = useState(null); // { cle, resultat }
  const [envoi, setEnvoi] = useState(false);
  const [erreurServeur, setErreurServeur] = useState(null);
  const [ticketCree, setTicketCree] = useState(null);

  // Les états ne changent que dans la réponse de l'API, jamais directement dans l'effet
  const chargerServices = () =>
    appelerApi('/services')
      .then(setServices)
      .catch(() => setErreurServices(true));
  useEffect(() => {
    chargerServices();
  }, []);

  function rechargerServices() {
    setErreurServices(false);
    setServices(null);
    chargerServices();
  }

  // Délai estimé : calculé par le serveur dès que les deux questions ont une réponse.
  // On le garde avec les réponses qui l'ont produit (cle) : une ancienne estimation n'est jamais affichée.
  const cleEstimation =
    reponses.impact && reponses.urgence ? `${reponses.impact}-${reponses.urgence}` : null;
  useEffect(() => {
    if (!cleEstimation) return;
    const [impact, urgence] = cleEstimation.split('-');
    appelerApi(`/tickets/estimation?${new URLSearchParams({ impact, urgence })}`)
      .then((resultat) => setEstimation({ cle: cleEstimation, resultat }))
      .catch(() => setEstimation(null));
  }, [cleEstimation]);
  const estimationAffichee = estimation?.cle === cleEstimation ? estimation.resultat : null;

  // Après chaque envoi refusé, le bandeau d'erreurs prend le focus : le lecteur d'écran l'annonce
  // et la page y remonte. Seulement à l'envoi (envois), pas pendant la frappe.
  const [envois, setEnvois] = useState(0);
  useEffect(() => {
    if (envois) refBandeau.current?.focus();
  }, [envois, erreurServeur]);

  // Corriger un champ efface son erreur : le message ne reste pas affiché sur un champ rempli
  function effacerErreur(champ) {
    if (erreurs[champ]) {
      const restantes = { ...erreurs };
      delete restantes[champ];
      setErreurs(restantes);
    }
  }
  const changerChamp = (champ, valeur) => {
    setChamps({ ...champs, [champ]: valeur });
    effacerErreur(champ);
  };
  const changerReponse = (question, valeur) => {
    setReponses({ ...reponses, [question]: valeur });
    effacerErreur(question);
  };
  const modifier = (champ) => (event) => changerChamp(champ, event.target.value);
  const service = services?.find((s) => s._id === champs.service);

  function continuer(event) {
    event.preventDefault();
    const trouvees = verifierEtape1(champs);
    setErreurs(trouvees);
    setEnvois((n) => n + 1);
    if (!Object.keys(trouvees).length) setEtape(2);
  }

  async function creer(event) {
    event.preventDefault();
    const trouvees = verifierEtape2(reponses);
    setErreurs(trouvees);
    setEnvois((n) => n + 1);
    setErreurServeur(null);
    if (Object.keys(trouvees).length) return;

    setEnvoi(true);
    try {
      const ticket = await appelerApi('/tickets', {
        methode: 'POST',
        corps: {
          titre: champs.titre,
          description: {
            probleme: champs.probleme,
            depuis: champs.depuis,
            messageErreur: champs.messageErreur,
          },
          service: champs.service,
          ...reponses,
        },
      });
      setTicketCree(ticket);
    } catch (err) {
      setErreurServeur(err.message);
    } finally {
      setEnvoi(false);
    }
  }

  const nombreErreurs = Object.keys(erreurs).length;

  return (
    <>
      <PageHeader retour={{ chemin: '/mes-demandes', libelle: 'Mes demandes' }} />
      <div className={styles.page}>
        <div className={styles.entete}>
          <h1 className="text-display-lg">Nouveau ticket</h1>
          {!ticketCree && <Etapes courante={etape} />}
        </div>

        {ticketCree ? (
          <Confirmation ticket={ticketCree} />
        ) : (
          <div className={styles.colonnes}>
            {etape === 1 ? (
              <form className={styles.formulaire} onSubmit={continuer} noValidate>
                {nombreErreurs > 0 && (
                  <BandeauErreurs nombre={nombreErreurs} refBandeau={refBandeau} />
                )}
                <TextField
                  libelle="Titre"
                  obligatoire
                  grand
                  maxLength={TITRE_MAX}
                  value={champs.titre}
                  onChange={modifier('titre')}
                  aide="Résumez le problème en quelques mots"
                  compteur={{ valeur: champs.titre.length, max: TITRE_MAX }}
                  erreur={erreurs.titre}
                />
                {/* Description guidée (cadrage 9.9) : trois questions au lieu d'un champ libre */}
                <TextArea
                  libelle="Que se passe-t-il ?"
                  obligatoire
                  grand
                  value={champs.probleme}
                  onChange={modifier('probleme')}
                  erreur={erreurs.probleme}
                />
                <TextField
                  libelle="Depuis quand ?"
                  obligatoire
                  grand
                  placeholder="Ce matin, depuis la mise à jour d’hier…"
                  value={champs.depuis}
                  onChange={modifier('depuis')}
                  erreur={erreurs.depuis}
                />
                <TextField
                  libelle="Quel message d’erreur ?"
                  facultatif
                  grand
                  value={champs.messageErreur}
                  onChange={modifier('messageErreur')}
                />

                {erreurServices ? (
                  <ErrorState
                    titre="Impossible de charger les services"
                    onReessayer={rechargerServices}
                  />
                ) : services === null ? (
                  <div className={styles.squelettesServices} aria-label="Chargement des services">
                    {Array.from({ length: 6 }, (_, index) => (
                      <Skeleton key={index} hauteur={44} />
                    ))}
                  </div>
                ) : (
                  <ChoiceGroup
                    compacte
                    question="Service concerné"
                    obligatoire
                    options={services.map((s) => ({
                      valeur: s._id,
                      titre: s.nom,
                      icone: iconeService(s.nom),
                    }))}
                    valeur={champs.service}
                    onChange={(id) => changerChamp('service', id)}
                    erreur={erreurs.service}
                  />
                )}

                <div className={styles.pied}>
                  <Button variante="secondaire" onClick={() => navigate('/mes-demandes')}>
                    Annuler
                  </Button>
                  <Button type="submit" iconeApres={ArrowRight}>
                    Continuer
                  </Button>
                </div>
              </form>
            ) : (
              <form className={styles.formulaire} onSubmit={creer} noValidate>
                {(nombreErreurs > 0 || erreurServeur) && (
                  <BandeauErreurs
                    nombre={nombreErreurs}
                    message={erreurServeur}
                    refBandeau={refBandeau}
                  />
                )}
                <ChoiceGroup
                  question="Qui est touché ?"
                  obligatoire
                  options={OPTIONS_IMPACT}
                  valeur={reponses.impact}
                  onChange={(impact) => changerReponse('impact', impact)}
                  erreur={erreurs.impact}
                />
                <ChoiceGroup
                  question="Pouvez-vous continuer à travailler ?"
                  obligatoire
                  options={OPTIONS_URGENCE}
                  valeur={reponses.urgence}
                  onChange={(urgence) => changerReponse('urgence', urgence)}
                  erreur={erreurs.urgence}
                />
                <DelayEstimate estimation={estimationAffichee} />
                <div className={`${styles.pied} ${styles.piedEtape2}`}>
                  <Button
                    variante="secondaire"
                    icone={ArrowLeft}
                    disabled={envoi}
                    onClick={() => {
                      setErreurs({});
                      setErreurServeur(null);
                      setEtape(1);
                    }}
                  >
                    Retour
                  </Button>
                  <Button type="submit" chargement={envoi && 'Création…'}>
                    Créer le ticket
                  </Button>
                </div>
              </form>
            )}

            <aside className={styles.colonneDroite}>
              {etape === 1 ? (
                <div className={styles.encart}>
                  <Info size={18} strokeWidth={TRAIT_ICONE} aria-hidden="true" />
                  {/* Texte de la fiche complété pour les données personnelles (cadrage 9.9), à valider */}
                  <p>
                    N’indiquez jamais de mot de passe dans un ticket. Le support ne vous le
                    demandera pas. Évitez aussi les données personnelles (santé, coordonnées d’un
                    tiers…) dans le titre et la description.
                  </p>
                </div>
              ) : (
                <section className={styles.recapitulatif} aria-labelledby="recapitulatif">
                  <div className={styles.recapEntete}>
                    <h2 id="recapitulatif" className="text-heading-md">
                      Récapitulatif
                    </h2>
                    <button
                      type="button"
                      className={styles.lienModifier}
                      onClick={() => setEtape(1)}
                    >
                      <PenLine size={15} strokeWidth={TRAIT_ICONE} aria-hidden="true" />
                      Modifier
                    </button>
                  </div>
                  <dl className={styles.rubriques}>
                    <dt>Titre</dt>
                    <dd className={styles.recapTitre}>{champs.titre}</dd>
                    <dt>Service</dt>
                    <dd className={styles.recapService}>
                      {service && <NomService nom={service.nom} />}
                    </dd>
                    <dt>Description</dt>
                    <dd className={styles.recapDescription}>{champs.probleme}</dd>
                  </dl>
                  <p className={styles.note}>
                    La priorité n’est pas à choisir : elle est calculée à partir de l’impact et de
                    l’urgence.
                  </p>
                </section>
              )}
            </aside>
          </div>
        )}
      </div>
    </>
  );
}
