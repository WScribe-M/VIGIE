// Icônes Lucide associées aux valeurs métier (handoff de design).
// Toujours avec TRAIT_ICONE, jamais dans un cercle coloré, jamais seules pour porter un état.
import {
  Activity,
  Building2,
  ChartColumn,
  CircleCheck,
  CircleDot,
  CirclePause,
  CircleQuestionMark,
  CircleSlash,
  Clock,
  Coffee,
  Database,
  Gauge,
  Globe,
  House,
  Inbox,
  LoaderCircle,
  Mail,
  MapPin,
  MessageCircleQuestionMark,
  Monitor,
  OctagonX,
  Phone,
  Plus,
  Printer,
  Server,
  Ticket,
  User,
  Users,
} from 'lucide-react';

export const TRAIT_ICONE = 1.75;

// Tailles du handoff : 16 px dans les tableaux, 20 px dans la navigation.
// Les badges suivent leur hauteur (voir StatusBadge, SlaBadge).
export const TAILLE_ICONE = { tableau: 16, navigation: 20 };

export const ICONES_STATUT = {
  NOUVEAU: CircleDot,
  EN_COURS: LoaderCircle,
  EN_ATTENTE_DEMANDEUR: MessageCircleQuestionMark, // « message-circle-question » dans le handoff
  TERMINE: CircleCheck,
  ABANDONNE: CircleSlash,
};

export const ICONES_SLA = {
  DANS_LES_TEMPS: Clock,
  ECHEANCE_PROCHE: Clock,
  EN_RETARD: Clock,
  SUSPENDU: CirclePause,
};

export const ICONES_IMPACT = { FAIBLE: User, MOYEN: Users, FORT: Building2 };

export const ICONES_URGENCE = { FAIBLE: Coffee, MOYENNE: Gauge, HAUTE: OctagonX };

export const ICONES_CANAL = { TELEPHONE: Phone, EMAIL: Mail, DIRECT: MapPin };

// Services du catalogue : « Autre / je ne sais pas » pour tout service inconnu
const ICONES_SERVICE = {
  VPN: Globe,
  Messagerie: Mail,
  ERP: Database,
  Imprimante: Printer,
  'Poste de travail': Monitor,
  'Autre / je ne sais pas': CircleQuestionMark, // « circle-help » dans le handoff
};

export function iconeService(nomService) {
  return ICONES_SERVICE[nomService] ?? CircleQuestionMark;
}

// Entrées de la barre latérale, par libellé (docs/ecrans/composants.md, capture composants-03-barre-laterale-et-en-tete)
export const ICONES_NAVIGATION = {
  'Mes demandes': House,
  'Ma file': Inbox,
  'Tous les tickets': Ticket,
  'Nouveau ticket': Plus,
  Pilotage: ChartColumn,
  'État des services': Activity,
  Utilisateurs: Users,
  Services: Server,
  // Page provisoire de VIGIE-2 : le design la découpe en « Utilisateurs » et « Services »
  Administration: Users,
};
