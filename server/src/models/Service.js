import mongoose from 'mongoose';
import { DOMAINES } from './constantes.js';

// Catalogue de services : le client choisit un service, le domaine technique en est déduit
const serviceSchema = new mongoose.Schema(
  {
    nom: { type: String, required: true, unique: true, trim: true },
    domaine: { type: String, enum: DOMAINES, required: true },
    actif: { type: Boolean, default: true },
  },
  { timestamps: true },
);

export const Service = mongoose.model('Service', serviceSchema);
