import {
  Activity,
  ArrowRight,
  Bell,
  ChartColumn,
  Copy,
  Ellipsis,
  House,
  Inbox,
  Plus,
  Search,
  Server,
  Ticket,
  Trash,
  Users,
} from 'lucide-react';
import { useState } from 'react';
import { Avatar } from '../composants/Avatar.jsx';
import { Button, IconButton } from '../composants/Button.jsx';
import { Select, TextArea, TextField } from '../composants/Champs.jsx';
import { ChoiceGroup } from '../composants/ChoiceCard.jsx';
import { DelayEstimate } from '../composants/DelayEstimate.jsx';
import { DuplicatePanel } from '../composants/DuplicatePanel.jsx';
import { EmptyState, ErrorState, Skeleton } from '../composants/Etats.jsx';
import { HistoriqueTicket } from '../composants/HistoriqueTicket.jsx';
import { MenuStatut } from '../composants/MenuStatut.jsx';
import { Modal } from '../composants/Modal.jsx';
import { PriorityBadge } from '../composants/PriorityBadge.jsx';
import { ProgressTracker } from '../composants/ProgressTracker.jsx';
import { Sidebar } from '../composants/Sidebar.jsx';
import { SlaBadge } from '../composants/SlaBadge.jsx';
import { StatusBadge } from '../composants/StatusBadge.jsx';
import { ICONES_IMPACT, iconeService } from '../styles/icones.js';
import {
  DESCRIPTIONS_IMPACT,
  LIBELLES_IMPACT,
  LIBELLES_PRIORITE,
  LIBELLES_SLA,
  LIBELLES_STATUT,
} from '../styles/libelles.js';
import styles from './Styleguide.module.css';

// Page de développement uniquement (absente du build de production) : catalogue des
// composants du design system, à comparer avec les captures de docs/ecrans/.
// Les données sont celles de la démo du handoff.

// Valeurs lues dans libelles.js : jamais réécrites à la main (elles suivent l'API)
const STATUTS = Object.keys(LIBELLES_STATUT);
const PRIORITES = Object.keys(LIBELLES_PRIORITE);
const DETAILS_SLA = {
  DANS_LES_TEMPS: 'reste 2 h',
  ECHEANCE_PROCHE: 'reste 25 min',
  EN_RETARD: 'de 3 h',
  SUSPENDU: 'depuis 4 j',
};
const SLA = Object.keys(LIBELLES_SLA).map((niveau) => ({ niveau, detail: DETAILS_SLA[niveau] }));

const COULEURS = [
  {
    famille: 'Marque — Pétrole',
    prefixe: '--color-brand-',
    cles: [50, 100, 200, 300, 400, 500, 600, 700, 800, 900],
  },
  {
    famille: 'Neutres chauds',
    prefixe: '--color-neutral-',
    cles: [0, 50, 100, 200, 300, 400, 500, 600, 700, 800, 900],
  },
  { famille: 'Graphiques', prefixe: '--color-chart-', cles: [1, 2, 3, 4, 5, 6] },
];

const TYPOGRAPHIE = [
  ['text-display-xl', 'Bonjour Awa.'],
  ['text-display-lg', 'Mes demandes'],
  ['text-heading-lg', 'Évaluation de la situation'],
  ['text-heading-md', 'État des services'],
  ['text-heading-sm', 'VPN inaccessible'],
  ['text-body-lg', 'Impossible de me connecter au VPN depuis ce matin.'],
  ['text-body-md', 'Mamadou Koné a pris en charge votre demande.'],
  ['text-body-sm', 'INC-1024 · Awa Diallo · il y a 5 min'],
  ['text-label', 'Service concerné'],
  ['text-caption', '17 nov. 2026, 10:24'],
  ['text-numeric-xl', '24 · 4,6/5 · 12 %'],
];

const ETATS_BOUTON = [
  ['Par défaut', undefined],
  ['Survol', 'survol'],
  ['Focus clavier', 'focus'],
  ['Actif', 'actif'],
  ['Désactivé', 'desactive'],
  ['Chargement', 'chargement'],
];

const BOUTONS = [
  {
    variante: 'primaire',
    nom: 'Primaire',
    libelle: 'Nouveau ticket',
    icone: Plus,
    chargement: 'Création…',
  },
  { variante: 'secondaire', nom: 'Secondaire', libelle: 'Annuler', chargement: 'Chargement…' },
  {
    variante: 'tertiaire',
    nom: 'Tertiaire',
    libelle: 'Voir tout',
    icone: ArrowRight,
    chargement: 'Chargement…',
  },
  {
    variante: 'danger',
    nom: 'Danger',
    libelle: 'Désactiver',
    icone: Trash,
    chargement: 'Désactivation…',
  },
];

const LIGNES_DEMO = [
  {
    id: 'INC-1022',
    titre: 'Accès à l’ERP impossible',
    statut: 'NOUVEAU',
    priorite: 'CRITIQUE',
    sla: { niveau: 'ECHEANCE_PROCHE', detail: 'reste 25 min' },
  },
  {
    id: 'INC-1024',
    titre: 'VPN inaccessible',
    statut: 'EN_COURS',
    priorite: 'HAUTE',
    sla: { niveau: 'EN_RETARD', detail: 'de 3 h' },
  },
  {
    id: 'INC-1023',
    titre: 'Imprimante en panne (Bât. A)',
    statut: 'EN_ATTENTE_DEMANDEUR',
    priorite: 'MOYENNE',
    sla: { niveau: 'SUSPENDU' },
  },
];

// Barres latérales des quatre rôles, telles que dessinées dans le handoff (capture composants-03-barre-laterale-et-en-tete)
const BARRES = [
  {
    utilisateur: { prenom: 'Awa', nom: 'Diallo', role: 'CLIENT', paire: 1 },
    entrees: [
      { chemin: '/demo/mes-demandes', libelle: 'Mes demandes', icone: House, actif: true },
      { chemin: '/demo/nouveau', libelle: 'Nouveau ticket', icone: Plus },
      { chemin: '/demo/services', libelle: 'État des services', icone: Activity },
    ],
  },
  {
    utilisateur: { prenom: 'Mamadou', nom: 'Koné', role: 'GESTIONNAIRE', paire: 2 },
    entrees: [
      { chemin: '/demo/ma-file', libelle: 'À traiter', icone: Inbox, compteur: 3, actif: true },
      { chemin: '/demo/tickets', libelle: 'Tous les tickets', icone: Ticket },
      { chemin: '/demo/nouveau', libelle: 'Nouveau ticket', icone: Plus },
      { chemin: '/demo/pilotage', libelle: 'Pilotage', icone: ChartColumn },
      { chemin: '/demo/services', libelle: 'État des services', icone: Activity },
    ],
  },
  {
    utilisateur: { prenom: 'Karim', nom: 'Benali', role: 'ADMIN', paire: 4 },
    entrees: [
      { chemin: '/demo/ma-file', libelle: 'À traiter', icone: Inbox, compteur: 2 },
      { chemin: '/demo/tickets', libelle: 'Tous les tickets', icone: Ticket },
      { chemin: '/demo/nouveau', libelle: 'Nouveau ticket', icone: Plus },
      { chemin: '/demo/pilotage', libelle: 'Pilotage', icone: ChartColumn },
      { chemin: '/demo/services', libelle: 'État des services', icone: Activity },
      {
        chemin: '/demo/utilisateurs',
        libelle: 'Utilisateurs',
        icone: Users,
        section: 'Administration',
        actif: true,
      },
      { chemin: '/demo/catalogue', libelle: 'Services', icone: Server },
    ],
  },
  {
    utilisateur: { prenom: 'Claire', nom: 'Fontaine', role: 'LECTEUR', paire: 6 },
    entrees: [
      {
        chemin: '/demo/tickets',
        libelle: 'Tous les tickets',
        icone: Ticket,
        etiquette: 'Lecture seule',
        actif: true,
      },
      { chemin: '/demo/pilotage', libelle: 'Pilotage', icone: ChartColumn },
      { chemin: '/demo/services', libelle: 'État des services', icone: Activity },
    ],
  },
];

const AVATARS = [
  ['Awa', 'Diallo'],
  ['Mamadou', 'Koné'],
  ['Léa', 'Martin'],
  ['Karim', 'Benali'],
  ['Sophie', 'Laurent'],
  ['Claire', 'Fontaine'],
];

// Historique de la capture composants-03-frise.png, au format de GET /api/tickets/:id
const AWA = { _id: 'awa', prenom: 'Awa', nom: 'Diallo' };
const MAMADOU = { _id: 'mamadou', prenom: 'Mamadou', nom: 'Koné' };
const HISTORIQUE_DEMO = [
  {
    _id: '1',
    auteur: AWA,
    champ: 'statut',
    ancienneValeur: null,
    nouvelleValeur: 'NOUVEAU',
    date: '2026-11-17T09:24:00Z',
  },
  {
    _id: '2',
    auteur: MAMADOU,
    champ: 'statut',
    ancienneValeur: 'NOUVEAU',
    nouvelleValeur: 'EN_COURS',
    date: '2026-11-17T10:02:00Z',
  },
  {
    _id: '3',
    auteur: MAMADOU,
    champ: 'technicien',
    ancienneValeur: null,
    nouvelleValeur: MAMADOU,
    date: '2026-11-17T10:02:00Z',
  },
  {
    _id: '4',
    auteur: MAMADOU,
    champ: 'priorite',
    ancienneValeur: 'MOYENNE',
    nouvelleValeur: 'HAUTE',
    motif: 'Deux sites touchés, l’équipe commerciale ne peut plus accéder au CRM.',
    date: '2026-11-17T10:05:00Z',
  },
  {
    _id: '5',
    auteur: MAMADOU,
    champ: 'domaine',
    ancienneValeur: 'APPLICATIF',
    nouvelleValeur: 'RESEAU',
    date: '2026-11-17T10:42:00Z',
  },
  {
    _id: '6',
    auteur: MAMADOU,
    champ: 'statut',
    ancienneValeur: 'EN_COURS',
    nouvelleValeur: 'TERMINE',
    date: '2026-11-17T14:10:00Z',
  },
  {
    _id: '7',
    auteur: AWA,
    champ: 'statut',
    ancienneValeur: 'TERMINE',
    nouvelleValeur: 'EN_COURS',
    motif: 'Le CRM est de nouveau inaccessible depuis Lyon.',
    date: '2026-11-17T15:38:00Z',
  },
];

function Bloc({ titre, note, children }) {
  return (
    <section className={styles.bloc}>
      <div className={styles.entete}>
        <h2 className="text-heading-lg">{titre}</h2>
        {note && <span className="text-body-sm texte-secondaire">{note}</span>}
      </div>
      {children}
    </section>
  );
}

const OPTIONS_IMPACT = Object.keys(LIBELLES_IMPACT).map((valeur) => ({
  valeur,
  titre: LIBELLES_IMPACT[valeur],
  description: DESCRIPTIONS_IMPACT[valeur],
  icone: ICONES_IMPACT[valeur],
}));
const OPTIONS_SERVICE = ['VPN', 'Messagerie', 'ERP', 'Autre / je ne sais pas'].map((nom) => ({
  valeur: nom,
  titre: nom,
  icone: iconeService(nom),
}));
// Échéance de démonstration : demain à 11 h
const ESTIMATION_DEMO = {
  prioriteCalculee: 'HAUTE',
  echeanceSla: new Date(new Date().setHours(35, 0, 0, 0)).toISOString(),
};

// Les cartes de choix ont besoin d'un état pour montrer la sélection et les flèches du clavier
const JALONS_DEMO = [
  { libelle: 'Reçu', detail: '17 nov., 10:24', etat: 'fait' },
  { libelle: 'Vu par le support', detail: '17 nov., 10:40', etat: 'fait' },
  {
    libelle: 'Pris en charge',
    detail: 'Mamadou Koné, 11:02',
    etat: 'courant',
    mention: 'En attente de votre réponse',
  },
  { libelle: 'Terminé', detail: 'prévu avant le 20/11 à 11 h', etat: 'aVenir' },
];

// Le menu et la modale ont besoin d'un état pour être manipulés sur la page
function DemoStatut() {
  const [statut, setStatut] = useState('EN_COURS');
  const [modale, setModale] = useState(false);
  return (
    <div className={styles.colonneDemo}>
      <div className={styles.ligneOutils}>
        <MenuStatut
          statut={statut}
          possibles={['EN_ATTENTE_DEMANDEUR', 'TERMINE', 'ABANDONNE']}
          onChoisir={setStatut}
        />
        <StatusBadge statut={statut} taille={28} />
        <Button variante="secondaire" onClick={() => setModale(true)}>
          Ouvrir une modale
        </Button>
      </div>
      <Modal
        ouverte={modale}
        titre="Abandonner le ticket"
        onFermer={() => setModale(false)}
        actions={
          <>
            <Button variante="secondaire" onClick={() => setModale(false)}>
              Annuler
            </Button>
            <Button variante="danger" onClick={() => setModale(false)}>
              Abandonner
            </Button>
          </>
        }
      >
        <p>Le ticket sera clos sans résolution. Le demandeur verra le motif.</p>
        <TextArea libelle="Motif" obligatoire erreur="Ce champ est obligatoire." />
      </Modal>
    </div>
  );
}

function DemoChoix() {
  const [impact, setImpact] = useState('MOYEN');
  const [service, setService] = useState(null);
  return (
    <div className={styles.colonneDemo}>
      <ChoiceGroup
        question="Qui est touché ?"
        obligatoire
        options={OPTIONS_IMPACT}
        valeur={impact}
        onChange={setImpact}
      />
      <ChoiceGroup
        compacte
        question="Service concerné"
        obligatoire
        options={OPTIONS_SERVICE}
        valeur={service}
        onChange={setService}
        erreur={service ? undefined : 'Choisissez un service, ou « Autre / je ne sais pas ».'}
      />
      <DelayEstimate estimation={null} />
      <DelayEstimate estimation={ESTIMATION_DEMO} />
    </div>
  );
}

// Suggestions de doublons de la démo : titre, service, statut, date d'ouverture (cadrage 9.3)
const SUGGESTIONS_DEMO = [
  {
    _id: 'demo-1027',
    titre: 'Coupure VPN sur le site de Lyon',
    service: { nom: 'VPN' },
    statut: 'EN_COURS',
    createdAt: new Date(Date.now() - 12 * 60000).toISOString(),
  },
  {
    _id: 'demo-1024',
    titre: 'VPN inaccessible',
    service: { nom: 'VPN' },
    statut: 'EN_COURS',
    createdAt: new Date(Date.now() - 3 * 3600000).toISOString(),
  },
];

function DoublonsDemo() {
  const [rejoints, setRejoints] = useState({ 'demo-1024': { concernes: 4 } });
  return (
    <div className={styles.colonneDemo}>
      <DuplicatePanel
        recherche="vpn ne marche plus"
        etat="resultats"
        suggestions={SUGGESTIONS_DEMO}
        rejoints={rejoints}
        onRejoindre={({ _id }) => setRejoints({ ...rejoints, [_id]: { concernes: 10 } })}
      />
      <DuplicatePanel etat="attente" />
      <DuplicatePanel etat="chargement" />
      <DuplicatePanel etat="resultats" suggestions={[]} />
      <DuplicatePanel etat="erreur" onReessayer={() => {}} />
    </div>
  );
}

function LigneDemo({ ligne }) {
  return (
    <div className={`${styles.ligne} ${ligne.sla.niveau === 'EN_RETARD' ? styles.enRetard : ''}`}>
      <span className="text-body-sm texte-secondaire chiffres">{ligne.id}</span>
      <span className={styles.titreLigne}>{ligne.titre}</span>
      <span className={styles.badges}>
        <StatusBadge statut={ligne.statut} taille={26} />
        <PriorityBadge priorite={ligne.priorite} taille={26} />
        <SlaBadge {...ligne.sla} taille={26} />
      </span>
    </div>
  );
}

export function Styleguide() {
  return (
    <div className={styles.page}>
      <header className={styles.titre}>
        <span className="text-label texte-secondaire">
          Développement uniquement · à comparer avec les maquettes
        </span>
        <h1 className="text-display-lg">Design system</h1>
      </header>

      <Bloc titre="Couleurs" note="Tokens de styles/tokens.css">
        {COULEURS.map(({ famille, prefixe, cles }) => (
          <div key={famille} className={styles.famille}>
            <span className="text-label">{famille}</span>
            <div className={styles.nuancier}>
              {cles.map((cle) => (
                <div key={cle} className={styles.nuance}>
                  <span
                    className={styles.pastille}
                    style={{ background: `var(${prefixe}${cle})` }}
                  />
                  <span className="text-caption texte-secondaire">
                    {prefixe}
                    {cle}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </Bloc>

      <Bloc titre="Typographie" note="Figtree · une classe par usage (styles/typographie.css)">
        {TYPOGRAPHIE.map(([classe, exemple]) => (
          <div key={classe} className={styles.typo}>
            <span className="text-label">.{classe}</span>
            <span className={classe}>{exemple}</span>
          </div>
        ))}
      </Bloc>

      <Bloc titre="Boutons" note="Hauteur 40 (md) · 32 (sm) · une seule action primaire par écran">
        <div className={styles.grilleBoutons}>
          <span />
          {ETATS_BOUTON.map(([nom]) => (
            <span key={nom} className="text-caption texte-secondaire">
              {nom}
            </span>
          ))}
          {BOUTONS.map((bouton) => (
            <div key={bouton.variante} className={styles.rangee}>
              <span className="text-label">{bouton.nom}</span>
              {ETATS_BOUTON.map(([nom, etat]) => (
                <div key={nom}>
                  <Button
                    variante={bouton.variante}
                    icone={bouton.icone}
                    etat={etat}
                    disabled={etat === 'desactive'}
                    chargement={etat === 'chargement' ? bouton.chargement : undefined}
                  >
                    {bouton.libelle}
                  </Button>
                </div>
              ))}
            </div>
          ))}
        </div>
        <div className={styles.ligneOutils}>
          <Button variante="secondaire" taille="sm" icone={Copy}>
            Je suis aussi concerné
          </Button>
          <IconButton icone={Search} libelle="Rechercher" />
          <IconButton icone={Bell} libelle="Notifications" etat="survol" />
          <IconButton icone={Ellipsis} libelle="Plus d’actions" etat="focus" />
        </div>
      </Bloc>

      <Bloc
        titre="Statut"
        note="Pastille : fond teinté, bordure, icône et libellé · hauteurs 24 · 26 · 28"
      >
        {[24, 26, 28].map((taille) => (
          <div key={taille} className={styles.rangeeBadges}>
            <span className="text-caption texte-secondaire">{taille} px</span>
            {STATUTS.map((statut) => (
              <StatusBadge key={statut} statut={statut} taille={taille} />
            ))}
          </div>
        ))}
      </Bloc>

      <Bloc
        titre="Priorité"
        note="Barres de signal sans fond, Critique compris (décision du 20/11)"
      >
        {[24, 26].map((taille) => (
          <div key={taille} className={styles.rangeeBadges}>
            <span className="text-caption texte-secondaire">{taille} px</span>
            {PRIORITES.map((priorite) => (
              <PriorityBadge key={priorite} priorite={priorite} taille={taille} />
            ))}
          </div>
        ))}
      </Bloc>

      <Bloc
        titre="Délai (SLA)"
        note="Étiquette rectangulaire · fond teinté seulement quand il faut agir"
      >
        {[24, 26, 28].map((taille) => (
          <div key={taille} className={styles.rangeeBadges}>
            <span className="text-caption texte-secondaire">{taille} px</span>
            {SLA.map((sla) => (
              <SlaBadge key={sla.niveau} {...sla} taille={taille} />
            ))}
          </div>
        ))}
        <div className={styles.rangeeBadges}>
          <span className="text-caption texte-secondaire">Court</span>
          <SlaBadge niveau="ECHEANCE_PROCHE" detail="reste 34 min" court />
          <SlaBadge niveau="SUSPENDU" court />
        </div>
      </Bloc>

      <Bloc
        titre="Une ligne, trois formes"
        note="Puis la même ligne en niveaux de gris : la forme et le libellé portent l’information"
      >
        <div className={styles.tableau}>
          {LIGNES_DEMO.map((ligne) => (
            <LigneDemo key={ligne.id} ligne={ligne} />
          ))}
        </div>
        <div className={`${styles.tableau} ${styles.gris}`}>
          {LIGNES_DEMO.map((ligne) => (
            <LigneDemo key={ligne.id} ligne={ligne} />
          ))}
        </div>
      </Bloc>

      <Bloc titre="Champs" note="Libellé au-dessus · 40 px (44 dans les formulaires de création)">
        <div className={styles.colonneDemo}>
          <TextField
            libelle="Titre"
            obligatoire
            grand
            defaultValue="vpn ne marche plus"
            aide="Résumez le problème en quelques mots"
            compteur={{ valeur: 18, max: 120 }}
          />
          <TextField libelle="Titre" obligatoire erreur="Le titre est obligatoire." />
          <TextField libelle="Quel message d’erreur ?" facultatif disabled />
          <TextArea libelle="Que se passe-t-il ?" obligatoire grand />
          <Select
            libelle="Nouvelle priorité"
            obligatoire
            defaultValue="CRITIQUE"
            apercu={<PriorityBadge priorite="CRITIQUE" />}
          >
            {Object.entries(LIBELLES_PRIORITE).map(([valeur, libelle]) => (
              <option key={valeur} value={valeur}>
                {libelle}
              </option>
            ))}
          </Select>
        </div>
      </Bloc>

      <Bloc
        titre="Cartes de choix et délai estimé"
        note="role=radio · flèches au clavier · variante compacte pour le service"
      >
        <DemoChoix />
      </Bloc>

      <Bloc titre="Suivi de la demande" note="4 jalons (décision 9.11) · fait, en cours, à venir">
        <ProgressTracker
          jalons={JALONS_DEMO}
          message="Le support attend votre réponse. Le délai reprendra dès que vous aurez répondu."
        />
      </Bloc>

      <Bloc
        titre="Historique"
        note="TimelineItem · qui, quoi, quand · ordre chronologique · avant → après"
      >
        <div className={styles.carteDemo}>
          <HistoriqueTicket historique={HISTORIQUE_DEMO} demandeur={AWA} />
        </div>
      </Bloc>

      <Bloc
        titre="Changer le statut et fenêtre modale"
        note="Statuts possibles fournis par l'API · <dialog> natif : focus piégé, Échap ferme"
      >
        <DemoStatut />
      </Bloc>

      <Bloc titre="États vide, erreur, chargement" note="Icône 32 sans illustration · une action">
        <div className={styles.colonneDemo}>
          <EmptyState
            icone={Inbox}
            titre="Aucune demande pour l’instant"
            texte="Un souci avec votre poste, le VPN ou une imprimante ? Signalez-le en moins d’une minute."
            action={<Button icone={Plus}>Nouveau ticket</Button>}
          />
          <ErrorState
            titre="Impossible de charger vos demandes"
            texte="Le serveur ne répond pas. Vos demandes ne sont pas perdues ; en cas d’urgence, appelez le 4400."
            onReessayer={() => {}}
          />
          <Skeleton largeur="60%" />
          <Skeleton largeur={80} hauteur={26} rond />
        </div>
      </Bloc>

      <Bloc
        titre="Panneau « Ce problème est peut-être déjà signalé »"
        note="Dès 3 caractères, 300 ms après la dernière frappe · 1 à 3 tickets"
      >
        <DoublonsDemo />
      </Bloc>

      <Bloc titre="Avatars" note="24 · 32 · 36 · 40 px · une paire de couleurs par personne">
        {[24, 32, 36, 40].map((taille) => (
          <div key={taille} className={styles.rangeeBadges}>
            <span className="text-caption texte-secondaire">{taille} px</span>
            {AVATARS.map(([prenom, nom], index) => (
              <Avatar key={nom} prenom={prenom} nom={nom} paire={index + 1} taille={taille} />
            ))}
            <Avatar taille={taille} />
          </div>
        ))}
      </Bloc>

      <Bloc titre="Barre latérale par rôle" note="248 px · Encre brune · le menu dépend du rôle">
        {/* Les liens de démonstration ne doivent pas quitter la page */}
        <div className={styles.barres} onClickCapture={(event) => event.preventDefault()}>
          {BARRES.map(({ utilisateur, entrees }) => (
            <div key={utilisateur.role} className={styles.barre}>
              <Sidebar entrees={entrees} utilisateur={utilisateur} onDeconnexion={() => {}} />
            </div>
          ))}
        </div>
      </Bloc>
    </div>
  );
}
