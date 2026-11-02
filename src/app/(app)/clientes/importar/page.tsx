import Link from "next/link";
import { Importador } from "@/components/Importador";

export default function ImportarPage() {
  return (
    <div className="space-y-4">
      <Link href="/clientes" className="link-toque text-sm">
        Voltar para Clientes
      </Link>
      <h1 className="text-3xl font-bold">Importar clientes</h1>
      <Importador />
    </div>
  );
}
