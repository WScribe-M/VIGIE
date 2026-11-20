import {
  Clock,
  Inbox,
  LoaderCircle,
  MessageCircleQuestionMark,
  Users,
  WifiOff,
} from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { appelerApi } from '../api.js';
import { Button } from '../composants/Button.jsx';
import { EmptyState, ErrorState, Skeleton } from '../composants/Etats.jsx';
import { PageHeader } from '../composants/PageHeader.jsx';
import { PriorityBadge } from '../composants/PriorityBadge.jsx';
import { SlaBadge } from '../composants/SlaBadge.jsx';
import { StatusBadge } from '../composants/StatusBadge.jsx';
import { IconeService, TRAIT_ICONE } from '../styles/icones.js';
import { socket } from '../tempsReel/socket.js';
import { formaterDuree, formaterDureeOuvree } from '../utils/dates.js';
import styles from './MaFile.module.css';

// « À traiter » du technicien (VIGIE-31, docs/ecrans/07-ma-file.md) : ce qu'il faut traiter maintenant.
// Les données viennent de GET /api/tickets/ma-file ; la page se recharge à chaque ticket créé ou
// modifié (room support), l'API restant la source de vérité.

// L'étiquette « Nouveau · à l'instant » reste une minute sur une ligne arrivée en direct
const DUREE_NOUVEAU = 60 * 1000;

const SECTIONS = [
  {
    cle: 'aPrendre',
    titre: 'À prendre',
    colonneSla: 'Échéance',
  },
  {
    cle: 'enCours',
    titre: 'Mes tickets en cours',
    colonneSla: 'Résolution',
  },
  {
    cle: 'enAttente',
    titre: 'En attente du demandeur',
    colonneSla: 'Ancienneté',
  },
];

// Texte du badge SLA : « reste 28 min », « de 3 h » (en retard), « depuis 4 j » (suspendu)
function detailSla(sla, minutesParJour) {
  if (!sla) return undefined;
  if (sla.niveau === 'SUSPENDU') return `depuis ${formaterDuree(sla.minutes)}`;
  const duree = formaterDureeOuvree(sla.minutes, minutesParJour);
  return sla.niveau === 'EN_RETARD' ? `de ${duree}` : `reste ${duree}`;
}

// Décision du 20/11 : ni « Prendre en charge » ni bouton « Ouvrir » dans la liste. Toute la ligne
// ouvre le ticket ; on s'assigne depuis la fiche, après l'avoir lu. Le titre reste un vrai lien :
// c'est lui qu'on atteint au clavier (Tab, Entrée) et que lit le lecteur d'écran.
function Ligne({ ligne, minutesParJour, nouveau }) {
  const navigate = useNavigate();
  const enRetard = ligne.sla?.niveau === 'EN_RETARD';
  return (
    <tr
      className={`${styles.ligneCliquable} ${enRetard ? styles.enRetard : ''} ${nouveau ? styles.surbrillance : ''}`}
      onClick={() => navigate(`/tickets/${ligne._id}`)}
    >
      <td className={`${styles.numero} chiffres`}>{ligne.reference}</td>
      <td>
        <div className={styles.cellTitre}>
          <IconeService nom={ligne.service?.nom} size={16} className={styles.iconeService} />
          <div className={styles.textesTitre}>
            <Link to={`/tickets/${ligne._id}`} className={styles.titre} title={ligne.titre}>
              {ligne.titre}
            </Link>
            <span className={styles.meta}>
              {ligne.concernes > 1 && (
                <span className={styles.concernes}>
                  <Users size={13} strokeWidth={TRAIT_ICONE} aria-hidden="true" />
                  {ligne.concernes} concernés
                </span>
              )}
              {/* Critère VIGIE-31 : les tickets « Autre / je ne sais pas » sont à qualifier */}
              {ligne.domaine === 'A_QUALIFIER' && (
                <span className={styles.aQualifier}>À qualifier</span>
              )}
              {nouveau && <span className={styles.nouveau}>Nouveau · à l’instant</span>}
            </span>
          </div>
        </div>
      </td>
      <td>
        <StatusBadge statut={ligne.statut} />
      </td>
      <td>
        <PriorityBadge priorite={ligne.prioriteFinale} />
      </td>
      <td>
        {ligne.sla && (
          <SlaBadge niveau={ligne.sla.niveau} detail={detailSla(ligne.sla, minutesParJour)} />
        )}
      </td>
      <td className={styles.demandeur}>
        {ligne.demandeur && `${ligne.demandeur.prenom} ${ligne.demandeur.nom}`}
      </td>
    </tr>
  );
}

function Section({ section, lignes, total, minutesParJour, nouveaux }) {
  return (
    <section className={styles.carte} aria-labelledby={`section-${section.cle}`}>
      <div className={styles.enteteSection}>
        <h2 id={`section-${section.cle}`} className={styles.titreSection}>
          {section.titre}
        </h2>
        <span className={`${styles.compteurSection} chiffres`}>{total}</span>
      </div>
      {lignes.length ? (
        <div className={styles.defilement}>
          <table className={styles.tableau}>
            <thead>
              <tr>
                <th scope="col">N°</th>
                <th scope="col">Titre</th>
                <th scope="col">Statut</th>
                <th scope="col">Priorité</th>
                <th scope="col">{section.colonneSla}</th>
                <th scope="col">Demandeur</th>
              </tr>
            </thead>
            <tbody>
              {lignes.map((ligne) => (
                <Ligne
                  key={ligne._id}
                  ligne={ligne}
                  minutesParJour={minutesParJour}
                  nouveau={nouveaux.has(ligne._id)}
                />
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className={styles.sectionVide}>Aucun ticket.</p>
      )}
    </section>
  );
}

function Kpi({ libelle, icone: Icone, valeur, detail, alerte }) {
  return (
    <div className={`${styles.kpi} ${alerte ? styles.kpiAlerte : ''}`}>
      <span className={styles.kpiLibelle}>
        {libelle}
        <Icone size={18} strokeWidth={TRAIT_ICONE} aria-hidden="true" />
      </span>
      <span className={`${styles.kpiValeur} chiffres`}>{valeur}</span>
      {detail && <span className={styles.kpiDetail}>{detail}</span>}
    </div>
  );
}

function Chargement() {
  return (
    <div className={styles.carte} aria-busy="true" aria-label="Chargement de la file">
      {[1, 2, 3, 4].map((n) => (
        <div key={n} className={styles.ligneSquelette}>
          <Skeleton largeur={56} hauteur={10} />
          <Skeleton largeur="50%" hauteur={12} />
          <Skeleton largeur={80} hauteur={24} rond />
        </div>
      ))}
    </div>
  );
}

const heureMinute = (date) =>
  date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

export function MaFile() {
  const [file, setFile] = useState(null);
  const [erreur, setErreur] = useState(false);
  const [majLe, setMajLe] = useState(null);
  const [connecte, setConnecte] = useState(socket.connected);
  const [nouveaux, setNouveaux] = useState(new Set());
  const idsConnus = useRef(null);

  // Les états ne changent que dans la réponse de l'API, jamais directement dans l'effet
  const charger = useCallback(() => {
    appelerApi('/tickets/ma-file')
      .then((reponse) => {
        // Lignes « À prendre » apparues depuis le chargement précédent : surlignées (fiche 07)
        const ids = reponse.aPrendre.map((ligne) => ligne._id);
        if (idsConnus.current) {
          const arrivees = ids.filter((id) => !idsConnus.current.has(id));
          if (arrivees.length) {
            setNouveaux((actuels) => new Set([...actuels, ...arrivees]));
            setTimeout(() => {
              setNouveaux(
                (actuels) => new Set([...actuels].filter((id) => !arrivees.includes(id))),
              );
            }, DUREE_NOUVEAU);
          }
        }
        idsConnus.current = new Set(ids);
        setFile(reponse);
        setErreur(false);
        setMajLe(new Date());
      })
      .catch(() => setErreur(true));
  }, []);

  useEffect(() => {
    charger();
    const surConnexion = () => {
      setConnecte(true);
      charger(); // après une coupure, on se resynchronise par l'API
    };
    const surDeconnexion = () => setConnecte(false);
    socket.on('ticket:cree', charger);
    socket.on('ticket:modifie', charger);
    socket.on('connect', surConnexion);
    socket.on('disconnect', surDeconnexion);
    return () => {
      socket.off('ticket:cree', charger);
      socket.off('ticket:modifie', charger);
      socket.off('connect', surConnexion);
      socket.off('disconnect', surDeconnexion);
    };
  }, [charger]);

  const enDirect = (
    <span className={styles.enDirect}>
      <span
        className={`${styles.pointDirect} ${connecte ? '' : styles.pointCoupe}`}
        aria-hidden="true"
      />
      {connecte ? 'En direct' : 'Hors connexion'}
    </span>
  );

  let contenu;
  if (erreur && !file) {
    contenu = (
      <ErrorState
        titre="Impossible de charger la file"
        texte="Le serveur ne répond pas. Réessayez dans un instant."
        onReessayer={charger}
      />
    );
  } else if (!file) {
    contenu = <Chargement />;
  } else {
    const { compteurs, minutesParJour } = file;
    const vide = !file.aPrendre.length && !file.enCours.length && !file.enAttente.length;
    const alertes = compteurs.enRetard + compteurs.echeanceProche;
    contenu = (
      <>
        <div className={styles.kpis}>
          <Kpi
            libelle="À prendre"
            icone={Inbox}
            valeur={compteurs.aPrendre}
            detail={
              compteurs.aPrendreCritiques
                ? `dont ${compteurs.aPrendreCritiques} Critique`
                : undefined
            }
          />
          <Kpi libelle="Mes tickets en cours" icone={LoaderCircle} valeur={compteurs.enCours} />
          <Kpi
            libelle="Alertes SLA"
            icone={Clock}
            valeur={alertes}
            alerte={alertes > 0}
            detail={`${compteurs.enRetard} en retard · ${compteurs.echeanceProche} échéance proche`}
          />
          <Kpi
            libelle="En attente du demandeur"
            icone={MessageCircleQuestionMark}
            valeur={compteurs.enAttente}
            detail={
              compteurs.attenteLaPlusAncienne !== null
                ? `le plus ancien : depuis ${formaterDuree(compteurs.attenteLaPlusAncienne)}`
                : undefined
            }
          />
        </div>

        {vide ? (
          <EmptyState
            icone={Inbox}
            titre="Aucun ticket à prendre"
            texte="Bonne nouvelle : la file est vide. Les nouveaux tickets apparaîtront ici en direct."
          />
        ) : (
          SECTIONS.map((section) => (
            <Section
              key={section.cle}
              section={section}
              lignes={file[section.cle]}
              total={compteurs[section.cle]}
              minutesParJour={minutesParJour}
              nouveaux={nouveaux}
            />
          ))
        )}
      </>
    );
  }

  return (
    <>
      <PageHeader gauche={enDirect} />
      <div className={styles.page}>
        {/* Décision du 20/11 : une seule densité (« Confort », lignes de 52 px), pas de sélecteur */}
        {/* Ni sous-titre ni description de section (décision du 20/11) */}
        <h1 className={`text-display-lg ${styles.titrePage}`}>À traiter</h1>

        {/* Temps réel coupé : la liste reste affichée avec son heure (fiche 07, état erreur) */}
        {!connecte && file && (
          <div className={styles.coupure} role="status">
            <WifiOff size={18} strokeWidth={TRAIT_ICONE} aria-hidden="true" />
            <span>
              <strong>Mises à jour en direct interrompues</strong> · La liste affichée date de{' '}
              {majLe && heureMinute(majLe)}. Nouvelle tentative automatique…
            </span>
            <Button variante="secondaire" taille="sm" onClick={() => socket.connect()}>
              Réessayer maintenant
            </Button>
          </div>
        )}

        {contenu}
      </div>
    </>
  );
}
