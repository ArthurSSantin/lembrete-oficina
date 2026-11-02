"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const tracos = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

const ICONES: Record<string, React.ReactNode> = {
  hoje: (
    <svg viewBox="0 0 24 24" {...tracos}>
      <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
      <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
    </svg>
  ),
  novo: (
    <svg viewBox="0 0 24 24" {...tracos}>
      <rect x="3" y="3" width="18" height="18" rx="3" />
      <path d="M12 8v8M8 12h8" />
    </svg>
  ),
  clientes: (
    <svg viewBox="0 0 24 24" {...tracos}>
      <path d="M5 17h14v-5l-2-5H7l-2 5v5Z" />
      <path d="M5 12h14" />
      <circle cx="8" cy="17" r="2" />
      <circle cx="16" cy="17" r="2" />
    </svg>
  ),
  resultados: (
    <svg viewBox="0 0 24 24" {...tracos}>
      <path d="M3 3v18h18" />
      <path d="M7 15l4-4 3 3 5-6" />
    </svg>
  ),
  config: (
    <svg viewBox="0 0 24 24" {...tracos}>
      <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76Z" />
    </svg>
  ),
};

const ITENS = [
  { href: "/", rotulo: "Hoje", icone: "hoje" },
  { href: "/novo", rotulo: "Atender", icone: "novo" },
  { href: "/clientes", rotulo: "Clientes", icone: "clientes" },
  { href: "/resultados", rotulo: "Resultados", icone: "resultados" },
  { href: "/config", rotulo: "Ajustes", icone: "config" },
];

function ativo(pathname: string, href: string) {
  return href === "/" ? pathname === "/" || pathname === "/chamar" : pathname.startsWith(href);
}

export function NavInferior() {
  const pathname = usePathname();
  return (
    <nav
      aria-label="Principal"
      className="fixed inset-x-0 bottom-0 z-20 border-t border-linha bg-white pb-[env(safe-area-inset-bottom)] md:hidden"
    >
      <ul className="grid grid-cols-5">
        {ITENS.map((i) => {
          const atual = ativo(pathname, i.href);
          return (
            <li key={i.href}>
              <Link
                href={i.href}
                aria-current={atual ? "page" : undefined}
                className={`relative flex flex-col items-center gap-1 pt-2.5 pb-2 text-xs ${
                  atual ? "font-semibold text-tinta" : "text-tinta-3"
                }`}
              >
                {atual && <span className="absolute inset-x-5 top-0 h-[3px] rounded-b bg-sinal" />}
                <span className="h-6 w-6">{ICONES[i.icone]}</span>
                {i.rotulo}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

export function NavLateral({ oficina }: { oficina: React.ReactNode }) {
  const pathname = usePathname();
  return (
    <aside className="hidden w-60 shrink-0 bg-asfalto text-white md:block">
      <div className="sticky top-0 p-4">
        <div className="mb-8 truncate px-2 pt-2 font-display text-xl font-bold">{oficina}</div>
        <nav aria-label="Principal">
          <ul className="space-y-1">
            {ITENS.map((i) => {
              const atual = ativo(pathname, i.href);
              return (
                <li key={i.href}>
                  <Link
                    href={i.href}
                    aria-current={atual ? "page" : undefined}
                    className={`flex items-center gap-3 rounded-lg px-3 py-2.5 ${
                      atual ? "bg-sinal font-semibold text-tinta" : "text-white/75 hover:bg-white/10 hover:text-white"
                    }`}
                  >
                    <span className="h-5 w-5">{ICONES[i.icone]}</span>
                    {i.rotulo}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      </div>
    </aside>
  );
}
