# Contexto do projeto

## Objetivo

Sistema de lembretes de manutenção por WhatsApp para auto centers.
Começa como ferramenta para o meu próprio auto center (uso principal no celular,
também no PC) e depois vira um micro-SaaS vendido para outras oficinas.

A promessa: trazer de volta o cliente que fez troca de óleo, alinhamento, freios etc.
e na próxima vez foi para o posto ou para o concorrente porque ninguém lembrou dele.

## Por que essa ideia (pesquisa feita antes)

Ideias avaliadas e descartadas:

- **Gerador de anúncios para Mercado Livre/Shopee**: o próprio Mercado Livre já tem IA para
  título e descrição, e o UpSeller oferece isso em plano grátis. Mercado saturado.
- **Compatibilidade de autopeças no Mercado Livre**: dor real, mas depende de dados técnicos
  licenciados (TecDoc, catálogos de fabricantes), já existe solução dedicada (Seconds) e a API
  de compatibilidades do Mercado Livre passou a ter restrições a partir de 15/07/2026.
- **Comparador regional de preços de autopeças para oficinas**: exige cadastrar lojas uma a uma
  (muito contato humano) e já existem concorrentes com investimento (Mecanizou, que captou
  US$ 14,5 mi; Partsfy; Peça.Aí, com a Bosch como sócia).
- **CRM genérico para comércio**: muitas opções grátis (Kyte, Agendor, RD Station CRM,
  WhatsApp Business). Segundo o Sebrae, menos de 2% dos pequenos negócios do Sudeste usam CRM:
  o problema é complexidade, não falta de ferramenta.

Por que auto center funciona melhor:

- O retorno é previsível (óleo a cada 5–10 mil km ou 6 meses, alinhamento, freios, pneus, bateria).
- O ticket é alto: um cliente que volta paga meses de assinatura.
- Sistemas de gestão de oficina às vezes têm lembrete, mas são completos e caros. Não foi encontrado
  um produto simples focado só em lembrete de revisão por WhatsApp.
- Risco principal: dono de oficina é menos digital; vender 100% online é mais difícil.
  Plano: teste grátis e conteúdo em vídeo curto para donos de oficina.

Preço pensado para a venda: R$ 49 a R$ 97 por mês.

## Estado atual (MVP)

Feito (ver README para instalação):

- Next.js 16 (App Router) + Supabase (Postgres, Auth, RLS) + API do Claude para escrever as mensagens.
- Multi-oficina desde o início: todas as tabelas têm `oficina_id` e RLS por oficina.
- Telas: Hoje (quem chamar), Novo atendimento, Clientes, Resultados, Ajustes.
- Próxima data do serviço = o que vier primeiro entre dias e km (km estimado pela média de km/dia do carro).
- Envio manual pelo link `wa.me` (sem API oficial do WhatsApp, sem risco de banimento, sem custo).
- Retorno contado quando o cliente foi chamado e depois o mesmo serviço é registrado para o carro.
- Consentimento do cliente registrado (LGPD) e página de privacidade com texto base.
- Sem chave da API de IA, usa uma mensagem padrão.

Verificado: `tsc`, `eslint` e `next build` passando; lógica de datas testada.
**Ainda não testado contra um banco Supabase real.**

## Próximos passos

1. Criar o projeto no Supabase, rodar `supabase/schema.sql`, preencher `.env.local`.
2. Testar o fluxo completo: cadastro, primeiro atendimento, lembrete, envio.
3. Publicar na Vercel e instalar no celular ("Adicionar à tela inicial").
4. Usar no auto center por 1 a 3 meses e medir retornos.
5. Fase 2: importar clientes por planilha, convite de atendentes, ajustes de uso real.
6. Fase 3 (venda): página de vendas, teste grátis, assinatura (Asaas ou Mercado Pago),
   limite de uso da IA por plano, revisão jurídica da política de privacidade.
