export default function Carregando() {
  return (
    <div className="space-y-3" aria-busy="true" aria-label="Carregando">
      <div className="h-7 w-48 animate-pulse rounded bg-gray-200" />
      <div className="h-4 w-64 animate-pulse rounded bg-gray-100" />
      {[0, 1, 2].map((i) => (
        <div key={i} className="h-24 animate-pulse rounded-xl bg-gray-100" />
      ))}
    </div>
  );
}
