import { NavInferior, NavLateral } from "@/components/Nav";
import { getContexto } from "@/lib/oficina";

// Todas as telas dependem do usuário logado, então são renderizadas na hora.
export const instant = false;

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { oficina } = await getContexto();

  return (
    <div className="flex min-h-screen">
      <NavLateral oficina={oficina.nome} />
      <div className="flex-1">
        <header className="sticky top-0 z-10 border-b border-gray-200 bg-white px-4 py-3 md:hidden">
          <p className="truncate font-bold">{oficina.nome}</p>
        </header>
        <main className="mx-auto max-w-3xl px-4 pt-4 pb-24 md:py-8">{children}</main>
      </div>
      <NavInferior />
    </div>
  );
}
