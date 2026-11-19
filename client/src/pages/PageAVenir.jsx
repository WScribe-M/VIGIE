// Page provisoire : chaque vue sera développée dans sa propre story
export function PageAVenir({ titre, story }) {
  return (
    <section>
      <h1>{titre}</h1>
      <p>À venir ({story}).</p>
    </section>
  );
}
