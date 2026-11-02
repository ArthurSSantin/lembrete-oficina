# Lembrete Oficina

Sistema de lembretes de manutenção por WhatsApp para auto centers.
Registra cada serviço feito, calcula quando o cliente deve voltar e mostra
todo dia quem chamar, com a mensagem pronta.

## Como funciona

1. **Novo atendimento**: placa, cliente, WhatsApp, km e serviços feitos.
   Se a placa já existe, os dados são preenchidos sozinhos.
2. O sistema calcula a próxima data de cada serviço pelo que vier primeiro:
   o prazo em dias ou os km (estimados pela média que o carro roda).
3. **Hoje**: lista de clientes para chamar. "Preparar mensagem" escreve o texto
   (com IA, se configurada) e "Enviar no WhatsApp" abre a conversa pronta.
4. Quando o cliente volta e você registra o mesmo serviço, conta como **retorno**
   na tela de **Resultados**.

## Instalação

### 1. Banco de dados (Supabase, grátis)

1. Crie uma conta em https://supabase.com e um projeto novo (região São Paulo).
2. Vá em **SQL Editor**, cole o conteúdo de `supabase/schema.sql` e clique em **Run**.
3. Em **Authentication > Sign In / Providers > Email**, desative
   "Confirm email" se quiser entrar sem confirmar o e-mail (uso pessoal).
4. Em **Project Settings > API Keys**, copie a URL do projeto e a *publishable key*.

### 2. Configuração

Copie `.env.example` para `.env.local` e preencha:

```
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=...
ANTHROPIC_API_KEY=...   # opcional: sem ela usa uma mensagem padrão
```

### 3. Rodar no computador

```
npm install
npm run dev
```

Abra http://localhost:3000.

Para testar no celular na mesma rede Wi-Fi: `npm run dev -- -H 0.0.0.0` e
acesse `http://IP-DO-COMPUTADOR:3000` pelo celular.

### 4. Colocar no ar (Vercel, grátis)

1. Suba o projeto para um repositório no GitHub.
2. Em https://vercel.com, importe o repositório.
3. Cadastre as mesmas variáveis do `.env.local` em **Settings > Environment Variables**.
4. No Supabase, em **Authentication > URL Configuration**, coloque o endereço da Vercel
   em "Site URL".

No celular, abra o endereço e use "Adicionar à tela inicial" para ficar como um app.

## Pronto para várias oficinas

- Todos os dados têm `oficina_id` e o banco bloqueia o acesso entre oficinas (RLS).
- Nome, assinatura e prazos dos serviços são configuráveis por oficina.
- O consentimento do cliente para receber mensagens fica registrado (LGPD).

Para vender no futuro, faltam: página de vendas, assinatura (Asaas ou Mercado Pago),
convite de atendentes e limite de uso da IA por plano.
