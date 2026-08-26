# Fechamento do Espaço · Edge Academy

App para os estagiários registrarem o fechamento diário do espaço: uma
checklist ordenada de equipamentos (ar-condicionados, luzes, fechadura),
com foto obrigatória de cada item desligado/trancado.

Stack: **React + Vite** (PWA) no front-end, **Tailwind CSS 4 + shadcn/ui
(base-ui)** como sistema de UI, **Supabase** (Postgres + Auth + Storage)
no back-end, hospedado na **Vercel**.

---

## 1. Configurar o Supabase

1. Crie um projeto gratuito em [supabase.com](https://supabase.com).
2. Vá em **SQL Editor** e rode o conteúdo de [`supabase/schema.sql`](supabase/schema.sql).
   Isso cria as tabelas, as políticas de RLS, o bucket de fotos privado e
   um checklist de exemplo.
3. Rode também [`supabase/admin-schema.sql`](supabase/admin-schema.sql).
   Isso cria a tabela `profiles` (criada automaticamente para cada novo
   usuário via trigger), a função `is_admin()`, as políticas que permitem
   ao admin gerenciar checklists e ver todos os fechamentos, e as funções
   RPC `list_users()` e `set_user_admin()`.
4. Promova o primeiro administrador manualmente (ninguém consegue fazer
   isso pelo app ainda):

    ```sql
    update public.profiles set is_admin = true where id = '<seu-user-uuid>';
    ```

5. Em **Project Settings > API**, copie a `Project URL` e a `anon public key`.

Usuários são criados de duas formas:

- **Pelo app**, na tela _Administração · Usuários_ (`/admin/usuarios`) —
  disponível apenas para admins — usando a Edge Function `create-user`
  (ver seção 6). Não há autocadastro no app.
- **Manualmente**, em **Authentication > Users** no painel do Supabase.

## 2. Rodar localmente

```bash
pnpm install
cp .env.example .env.local
# edite .env.local com a URL e a anon key do seu projeto Supabase
pnpm dev
```

Abra `http://localhost:5173`. Para testar a captura de foto pela câmera
do celular, acesse o app pelo IP da sua máquina na mesma rede (o Vite
mostra esse endereço no terminal), ou já publique na Vercel (passo 4).

Scripts úteis: `pnpm build` (typecheck + build), `pnpm lint` (ESLint),
`pnpm typecheck`.

## 3. Estrutura do projeto

```
src/
  components/            header, captura de foto, card de item, barra de
                         progresso, spinner e wrappers de layout
                         (PageShell: PageMain, FormError, BottomNav...)
    ui/                  componentes shadcn/ui (button, card, input,
                         label, badge) sobre @base-ui/react
  contexts/              auth-context (sessão Supabase + flag isAdmin) e
                         theme-context (claro/escuro)
  pages/                 login, dashboard, checklist-session, history,
                         session-detail e as telas de admin
                         (admin-users, admin-checklists)
  utils/
    image-compression.ts compressão da foto ANTES do upload (ver seção 5)
  lib/
    supabase-client.ts   cliente Supabase único, usado em todo o app
    utils.ts             helper cn() (clsx + tailwind-merge)
supabase/
  schema.sql                        tabelas + RLS + bucket + limpeza automática
  admin-schema.sql                  profiles + is_admin + políticas/RPCs de admin
  functions/cleanup-old-photos/     Edge Function que apaga fotos antigas
  functions/create-user/            Edge Function que cria usuários (admin)
```

Fluxo de dados: `checklist_templates` → `checklist_items` (itens ordenados
de um checklist) → `closing_sessions` (um fechamento realizado por um
estagiário) → `closing_logs` (o registro de cada item dentro de uma sessão,
com o caminho da foto no Storage). Cada usuário tem uma linha em
`profiles`, com a flag `is_admin`.

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
  (`src/utils/image-compression.ts`), redimensionada para ~1000px no lado
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

## 6. Administração (usuários e checklists)

Admins têm um atalho de engrenagem no cabeçalho e acesso a duas telas:

- **`/admin/usuarios`**: cria novos usuários (nome, e-mail e senha inicial)
  e promove/remove administradores. A criação chama a Edge Function
  `create-user`, que valida o JWT do chamador contra `is_admin()` antes de
  usar a service-role key. O SQL impede remover o último admin.
- **`/admin/checklists`**: cria, ativa/desativa e exclui templates, e
  adiciona/remove itens (título, instruções, exigência de foto). As
  políticas de RLS permitem escrita apenas para admins — estagiários
  continuam com acesso somente leitura.
- Admins também veem, no histórico, os fechamentos de **todos** os
  usuários (com nome de quem registrou).

### Deploy da função `create-user`

A função roda como Edge Function no projeto Supabase e **precisa estar
publicada** para que a tela `/admin/usuarios` consiga criar usuários. Se ela
não estiver deployada, a chamada do app recebe `404` no preflight de CORS e
falha. O código da função (`supabase/functions/create-user/index.ts`) já trata
o preflight `OPTIONS` e devolve os cabeçalhos `Access-Control-Allow-*`; basta
publicá-la.

Pré-requisitos (uma vez por máquina):

```bash
# instalar a CLI do Supabase
npm install -g supabase        # ou: iwr https://supabase.com/install.ps1 | iex
supabase login                 # abre o navegador para autenticar
```

Deploy (do diretório raiz do projeto):

```bash
supabase link --project-ref <project-ref>
supabase secrets set \
  SUPABASE_URL=<url-do-projeto> \
  SUPABASE_ANON_KEY=<sua-anon-key> \
  SUPABASE_SERVICE_ROLE_KEY=<sua-service-role-key>
supabase functions deploy create-user
```

- `SUPABASE_ANON_KEY` e `SUPABASE_SERVICE_ROLE_KEY` ficam em **Project Settings
    > API**. A service-role key é secreta: não a exponha no front-end.
- A função valida o JWT do chamador contra `is_admin()`, então **não** use
  `--no-verify-jwt` aqui.

### Deploy da função `cleanup-old-photos`

```bash
supabase functions deploy cleanup-old-photos --no-verify-jwt
```

## 7. Modo claro/escuro e identidade visual

As cores da marca (`#173c6c`, `#009db4`, branco) estão centralizadas como
tokens Tailwind/variáveis CSS em `src/index.css`. Os tokens semânticos do
shadcn (`--background`, `--primary`, `--border`, ...) estão mapeados para
a paleta da marca, com um conjunto equivalente para o tema escuro em
`[data-theme='dark']`. O botão de alternância fica no cabeçalho e na tela
de login; a preferência é salva no `localStorage` e, na primeira visita,
respeita `prefers-color-scheme` do sistema.

As duas logos enviadas (`logo-blue.svg` para fundos claros,
`logo-white.svg` para o cabeçalho azul) estão em `public/` e também são
usadas como ícone do PWA.

## 8. Próximos passos sugeridos

- Editar o checklist real do espaço direto pela tela
  `/admin/checklists` (não precisa mais mexer em SQL nem no Table Editor).
- Restrição de domínio de e-mail — hoje só quem tem conta criada por um
  admin entra; quando quiser reforçar:
    - **Auth Hook** (`Before User Created`, em Authentication > Hooks):
      rejeita o cadastro se o e-mail não terminar com o domínio da Edge
      Academy; ou
    - **Trigger no Postgres** em `auth.users`, como camada extra.
- Notificação (e-mail/push) se ninguém finalizar o checklist até um
  horário limite.
