import { FormNovaSenha } from "@/components/FormNovaSenha";

export default function NovaSenhaPage() {
  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <div className="w-full max-w-sm space-y-4">
        <h1 className="text-3xl font-bold">Criar nova senha</h1>
        <FormNovaSenha />
      </div>
    </main>
  );
}
