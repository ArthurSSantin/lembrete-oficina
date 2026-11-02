"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const ITENS = [
  { href: "/", rotulo: "Hoje", icone: "🔔" },
  { href: "/novo", rotulo: "Novo", icone: "➕" },
  { href: "/clientes", rotulo: "Clientes", icone: "👥" },
  { href: "/resultados", rotulo: "Resultados", icone: "📈" },
  { href: "/config", rotulo: "Ajustes", icone: "⚙️" },
];

function ativo(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}

export function NavInferior() {
  const pathname = usePathname();
  return (
    <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-gray-200 bg-white pb-[env(safe-area-inset-bottom)] md:hidden">
      <ul className="grid grid-cols-5">
        {ITENS.map((i) => (
          <li key={i.href}>
            <Link
              href={i.href}
              className={`flex flex-col items-center gap-0.5 py-2 text-xs ${
                ativo(pathname, i.href) ? "font-semibold text-blue-600" : "text-gray-500"
              }`}
            >
              <span className="text-lg leading-none">{i.icone}</span>
              {i.rotulo}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

export function NavLateral({ oficina }: { oficina: React.ReactNode }) {
  const pathname = usePathname();
  return (
    <aside className="hidden w-60 shrink-0 border-r border-gray-200 bg-white md:block">
      <div className="sticky top-0 p-4">
        <div className="mb-6 truncate px-2 text-lg font-bold">{oficina}</div>
        <ul className="space-y-1">
          {ITENS.map((i) => (
            <li key={i.href}>
              <Link
                href={i.href}
                className={`flex items-center gap-3 rounded-lg px-3 py-2 ${
                  ativo(pathname, i.href)
                    ? "bg-blue-50 font-semibold text-blue-700"
                    : "text-gray-700 hover:bg-gray-100"
                }`}
              >
                <span>{i.icone}</span>
                {i.rotulo}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </aside>
  );
}
