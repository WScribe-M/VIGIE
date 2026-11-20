import mongoose from 'mongoose';
import { DOMAINES } from './constantes.js';

// Catalogue de services : le client choisit un service, le domaine technique en est déduit
const serviceSchema = new mongoose.Schema(
  {
    nom: { type: String, required: true, trim: true },
    domaine: { type: String, enum: DOMAINES, required: true },
    actif: { type: Boolean, default: true },
  },
  { timestamps: true },
);

// Comparaison des noms à la française, sans tenir compte des majuscules (« vpn » = « VPN »).
// L’index unique, le tri du catalogue et le seed utilisent la même : une requête sans
// cette collation ne verrait pas les mêmes doublons que l’index.
export const COLLATION_NOM = { locale: 'fr', strength: 2 };

// Unicité des noms
serviceSchema.index(
  { nom: 1 },
  { name: 'nom_unique_insensible_casse', unique: true, collation: COLLATION_NOM },
);

export const Service = mongoose.model('Service', serviceSchema);
