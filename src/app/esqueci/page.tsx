import { FormEsqueci } from "@/components/FormEsqueci";

// Lê o ?erro= da URL: renderiza na requisição.
export const instant = false;

export default async function EsqueciPage({ searchParams }: PageProps<"/esqueci">) {
  const { erro } = await searchParams;
  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <div className="w-full max-w-sm space-y-4">
        <h1 className="text-3xl font-bold">Esqueci minha senha</h1>
        <p className="text-sm text-tinta-2">
          Digite o e-mail da conta. Mandamos um link para você criar uma senha nova.
        </p>
        <FormEsqueci linkVencido={erro === "link"} />
      </div>
    </main>
  );
}
