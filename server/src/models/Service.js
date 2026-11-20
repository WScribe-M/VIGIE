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
// Unicité des noms sans distinction entre majuscules et minuscules.
serviceSchema.index(
  { nom: 1 },
  {
    name: 'nom_unique_insensible_casse',
    unique: true,
    collation: { locale: 'fr', strength: 2 },
  },
);
export const Service = mongoose.model('Service', serviceSchema);
