import { readFileSync } from 'node:fs';
import { parse } from 'yaml';

// La documentation vit dans un seul fichier YAML, plus lisible en relecture que des commentaires
// répartis dans les routes. Il est lu une fois au démarrage : une erreur de syntaxe empêche
// l'API de démarrer au lieu de produire une documentation vide.
const chemin = new URL('../../docs/openapi.yaml', import.meta.url);

export const specificationApi = parse(readFileSync(chemin, 'utf8'));
