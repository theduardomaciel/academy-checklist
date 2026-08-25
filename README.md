# Fechamento do Espaço · Edge Academy

App para os estagiários registrarem o fechamento diário do espaço: uma
checklist ordenada de equipamentos (ar-condicionados, luzes, fechadura),
com foto obrigatória de cada item desligado/trancado.

Stack: **React + Vite** (PWA) no front-end, **Supabase** (Postgres + Auth +
Storage) no back-end, hospedado na **Vercel**.

---

## 1. Configurar o Supabase

1. Crie um projeto gratuito em [supabase.com](https://supabase.com).
2. Vá em **SQL Editor** e rode o conteúdo de [`supabase/schema.sql`](supabase/schema.sql).
   Isso cria as tabelas, as políticas de RLS, o bucket de fotos privado e
   um checklist de exemplo (edite os itens de exemplo para refletir os
   equipamentos reais do seu espaço — veja a seção 5).
3. Em **Project Settings > API**, copie a `Project URL` e a `anon public key`.
4. Em **Authentication > Users**, crie manualmente uma conta para cada
   estagiário (e-mail + senha). Não há autocadastro no app — só quem tem
   conta criada consegue entrar. (A restrição por domínio de e-mail fica
   para depois; ver seção 6.)

## 2. Rodar localmente

```bash
npm install
cp .env.example .env.local
# edite .env.local com a URL e a anon key do seu projeto Supabase
npm run dev
```

Abra `http://localhost:5173`. Para testar a captura de foto pela câmera
do celular, acesse o app pelo IP da sua máquina na mesma rede (o Vite
mostra esse endereço no terminal), ou já publique na Vercel (passo 4).

## 3. Estrutura do projeto

```
src/
  components/       Header, captura de foto, card de item, barra de progresso...
  contexts/         AuthContext (sessão Supabase) e ThemeContext (claro/escuro)
  pages/            Login, Dashboard, ChecklistSession, History, SessionDetail
  utils/
    imageCompression.js   compressão da foto ANTES do upload (ver seção 5)
  lib/supabaseClient.js   cliente Supabase único, usado em todo o app
supabase/
  schema.sql                        tabelas + RLS + bucket + limpeza automática
  functions/cleanup-old-photos/     Edge Function que apaga fotos antigas
```

Fluxo de dados: `checklist_templates` → `checklist_items` (itens ordenados
de um checklist) → `closing_sessions` (um fechamento realizado por um
estagiário) → `closing_logs` (o registro de cada item dentro de uma sessão,
com o caminho da foto no Storage).

## 4. Publicar na Vercel

1. Suba este projeto num repositório Git (GitHub/GitLab).
2. Na Vercel: **New Project** → importe o repositório.
3. Em **Environment Variables**, adicione `VITE_SUPABASE_URL` e
   `VITE_SUPABASE_ANON_KEY` com os mesmos valores do `.env.local`.
4. Deploy. O `vercel.json` incluso já configura o fallback de rotas para
   o React Router funcionar corretamente.

## 5. Por que as fotos não estouram o plano gratuito

O plano gratuito do Supabase tem **1 GB de Storage**. Fotos de celular cru
(3–8 MB cada) esgotariam isso em poucas semanas. Por isso:

- **Toda foto é comprimida no navegador antes do upload**
  (`src/utils/imageCompression.js`), redimensionada para ~1000px no lado
  maior e recomprimida em JPEG a ~70% de qualidade — o resultado fica em
  torno de 60–150 KB, suficiente para confirmar visualmente que o
  equipamento está desligado.
- **Limpeza automática**: a Edge Function `cleanup-old-photos` apaga
  sessões (e as fotos associadas) com mais de 60 dias, agendada via
  `pg_cron` (instruções comentadas no final de `schema.sql`). Isso mantém
  o uso de armazenamento estável ao longo do tempo em vez de crescer para
  sempre. Ajuste `RETENTION_DAYS` na função se quiser manter por menos ou
  mais tempo (o pedido original era 1–2 meses).

Para ativar a limpeza automática depois do primeiro deploy da função:

```bash
supabase functions deploy cleanup-old-photos --no-verify-jwt
```

E então, no SQL Editor, defina as duas configurações e descomente o
`cron.schedule(...)` no final de `schema.sql` (instruções lá mesmo).

## 6. Restrição por domínio de e-mail (pendente, não bloqueante)

Por enquanto qualquer conta criada manualmente no painel do Supabase
consegue entrar — não há autocadastro, então isso já é uma barreira
razoável no dia a dia. Quando quiser reforçar por domínio de e-mail, duas
opções:

- **Auth Hook** (`Before User Created`, em Authentication > Hooks):
  rejeita o cadastro se o e-mail não terminar com o domínio da Edge
  Academy.
- **Trigger no Postgres** em `auth.users`, como camada extra de segurança.

## 7. Modo claro/escuro e identidade visual

As cores da marca (`#173c6c`, `#009db4`, branco) estão centralizadas como
variáveis CSS em `src/index.css`, com um conjunto equivalente de tokens
para o tema escuro em `[data-theme='dark']`. O botão de alternância fica
no cabeçalho e na tela de login; a preferência é salva no `localStorage`
e, na primeira visita, respeita `prefers-color-scheme` do sistema.

As duas logos enviadas (`logo-blue.svg` para fundos claros,
`logo-white.svg` para o cabeçalho azul) estão em `public/` e também são
usadas como ícone do PWA.

## 8. Próximos passos sugeridos

- Popular `checklist_templates` / `checklist_items` com o checklist real
  do espaço (edite o bloco de seed em `schema.sql` ou insira direto pela
  UI de Table Editor do Supabase).
- Restrição de domínio de e-mail (seção 6).
- Tela de administração para o responsável cadastrar/editar itens sem
  precisar mexer em SQL, se o time crescer.
- Notificação (e-mail/push) se ninguém finalizar o checklist até um
  horário limite.
