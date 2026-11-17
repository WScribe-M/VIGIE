// Erreur métier avec un code HTTP : les services la lèvent, le gestionnaire d'erreurs (app.js)
// la transforme en réponse { message } avec le bon code.
export class ErreurHttp extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}
