// Servidor de push falso (HTTPS local) para testar o aviso diário sem sair da máquina.
// O web-push só fala HTTPS, então o certificado é autoassinado e gerado na hora com o openssl.
//   POST /410/...  -> 410 (inscrição vencida)
//   POST /201/...  -> 201 (entregue)
//   GET  /saude    -> 200
//   GET  /recebidos -> JSON com os caminhos que receberam POST
import { execFileSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync } from "node:fs";
import { createServer } from "node:https";
import { tmpdir } from "node:os";
import { join } from "node:path";

const porta = Number(process.env.PORTA_PUSH ?? 3101);
const pasta = mkdtempSync(join(tmpdir(), "push-falso-"));
const chave = join(pasta, "chave.pem");
const cert = join(pasta, "cert.pem");

const candidatos = [
  "openssl",
  "C:/Program Files/Git/mingw64/bin/openssl.exe",
  "C:/Program Files/Git/usr/bin/openssl.exe",
];
let gerou = false;
for (const bin of candidatos) {
  if (bin !== "openssl" && !existsSync(bin)) continue;
  try {
    execFileSync(bin, [
      "req", "-x509", "-newkey", "rsa:2048", "-nodes", "-days", "1",
      "-keyout", chave, "-out", cert, "-subj", "/CN=127.0.0.1",
    ], { stdio: "ignore", env: { ...process.env, MSYS_NO_PATHCONV: "1" } });
    gerou = true;
    break;
  } catch {
    // tenta o próximo
  }
}
if (!gerou) {
  console.error("[push-falso] openssl não encontrado para gerar o certificado");
  process.exit(1);
}

const recebidos = [];
createServer({ key: readFileSync(chave), cert: readFileSync(cert) }, (req, res) => {
  if (req.method === "GET" && req.url === "/saude") return res.end("ok");
  if (req.method === "GET" && req.url === "/recebidos") {
    res.setHeader("content-type", "application/json");
    return res.end(JSON.stringify(recebidos));
  }
  if (req.method === "POST") {
    req.resume();
    req.on("end", () => {
      recebidos.push(req.url);
      res.statusCode = req.url.startsWith("/410/") ? 410 : 201;
      res.end();
    });
    return;
  }
  res.statusCode = 404;
  res.end();
}).listen(porta, "127.0.0.1", () => console.log(`[push-falso] https://127.0.0.1:${porta}`));
