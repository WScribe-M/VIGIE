// Page provisoire : chaque vue sera développée dans sa propre story
export function PageAVenir({ titre, story }) {
  return (
    <section>
      <h1 className="text-display-lg">{titre}</h1>
      <p className="texte-secondaire">À venir ({story}).</p>
    </section>
  );
}
