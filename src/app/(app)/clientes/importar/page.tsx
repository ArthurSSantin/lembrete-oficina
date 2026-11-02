import Link from "next/link";
import { Importador } from "@/components/Importador";

export default function ImportarPage() {
  return (
    <div className="space-y-4">
      <Link href="/clientes" className="text-sm text-tinta underline underline-offset-2">
        Voltar para Clientes
      </Link>
      <h1 className="text-3xl font-bold">Importar clientes</h1>
      <Importador />
    </div>
  );
}
