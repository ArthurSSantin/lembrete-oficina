export default function Carregando() {
  return (
    <div className="space-y-3" aria-busy="true" aria-label="Carregando">
      <div className="h-7 w-48 motion-safe:animate-pulse rounded bg-linha" />
      <div className="h-4 w-64 motion-safe:animate-pulse rounded bg-fundo" />
      {[0, 1, 2].map((i) => (
        <div key={i} className="h-24 motion-safe:animate-pulse rounded-xl bg-fundo" />
      ))}
    </div>
  );
}
