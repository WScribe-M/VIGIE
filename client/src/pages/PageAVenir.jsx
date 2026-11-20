import { PageHeader } from '../composants/PageHeader.jsx';

// Page provisoire : chaque vue sera développée dans sa propre story.
// Elle garde l'en-tête, pour que la cloche des notifications soit là dès l'accueil (« Ma file »).
export function PageAVenir({ titre, story }) {
  return (
    <>
      <PageHeader />
      <section style={{ paddingTop: 'var(--space-8)' }}>
        <h1 className="text-display-lg">{titre}</h1>
        <p className="texte-secondaire">À venir ({story}).</p>
      </section>
    </>
  );
}
