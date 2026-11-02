// Sobe o `next dev` para os testes e2e numa cópia do app em .e2e-app/.
//
// Por quê: o Next 16 trava a pasta .next/dev para um único `next dev` por projeto,
// e o servidor de desenvolvimento normal (porta 3000) pode estar rodando. A cópia
// tem a própria pasta .next e NÃO leva o .env.local (que aponta para produção):
// as variáveis do Supabase local vêm só do ambiente (webServer.env do Playwright).
import { spawn } from "node:child_process";
import { cpSync, existsSync, mkdirSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const raiz = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const destino = join(raiz, ".e2e-app");
const porta = process.env.PORTA_E2E ?? "3100";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
if (!/^http:\/\/(127\.0\.0\.1|localhost):\d+/.test(url)) {
  console.error(`[e2e] NEXT_PUBLIC_SUPABASE_URL precisa ser o Supabase local. Recebido: "${url}"`);
  process.exit(1);
}

mkdirSync(destino, { recursive: true });
for (const pasta of ["src", "public"]) {
  rmSync(join(destino, pasta), { recursive: true, force: true });
  if (existsSync(join(raiz, pasta))) cpSync(join(raiz, pasta), join(destino, pasta), { recursive: true });
}
for (const arquivo of ["package.json", "next.config.ts", "tsconfig.json", "next-env.d.ts", "postcss.config.mjs"]) {
  if (existsSync(join(raiz, arquivo))) cpSync(join(raiz, arquivo), join(destino, arquivo));
}
for (const env of [".env", ".env.local", ".env.development", ".env.development.local"]) {
  rmSync(join(destino, env), { force: true });
}

const next = join(raiz, "node_modules", "next", "dist", "bin", "next");
const filho = spawn(process.execPath, [next, "dev", "-p", porta], {
  cwd: destino,
  stdio: "inherit",
  env: { ...process.env, NEXT_TELEMETRY_DISABLED: "1" },
});
filho.on("exit", (codigo) => process.exit(codigo ?? 0));
for (const sinal of ["SIGINT", "SIGTERM"]) process.on(sinal, () => filho.kill(sinal));
