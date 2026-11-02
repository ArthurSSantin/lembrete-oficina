import { Suspense } from "react";
import { NavInferior, NavLateral } from "@/components/Nav";
import { getContexto } from "@/lib/oficina";

// Todas as telas dependem do usuário logado, então são renderizadas na hora.
export const instant = false;

async function NomeOficina() {
  const { oficina } = await getContexto();
  return <>{oficina.nome}</>;
}

const nome = (
  <Suspense fallback={<span className="inline-block h-5 w-32 animate-pulse rounded bg-gray-200" />}>
    <NomeOficina />
  </Suspense>
);

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <NavLateral oficina={nome} />
      <div className="flex-1">
        <header className="sticky top-0 z-10 border-b border-gray-200 bg-white px-4 py-3 md:hidden">
          <div className="truncate font-bold">{nome}</div>
        </header>
        <main className="mx-auto max-w-3xl px-4 pt-4 pb-24 md:py-8">{children}</main>
      </div>
      <NavInferior />
    </div>
  );
}
