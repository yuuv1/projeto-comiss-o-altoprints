# Publicação e manutenção do Altoprints

> O site oficial tem **um único modo: online**, ligado a um único projeto Supabase. Não há
> fallback para dados locais, arquivo offline `Altoprints.html` nem conexão diferente por
> aparelho. Se a conexão não estiver no build, a publicação falha; se o app antigo estiver
> sem conexão, ele bloqueia o uso em vez de salvar uma cópia neste navegador.
>
> Guia de lançamento na ordem certa: [`../LANCAMENTO.md`](../LANCAMENTO.md).

## 1. Preparar o Supabase

1. Crie um projeto Supabase na região South America (São Paulo).
2. No **SQL Editor**, execute [`supabase/schema.sql`](supabase/schema.sql). O script cria
   as tabelas e o bucket necessário sem apagar pedidos existentes.
3. Em **Project Settings → API**, copie a **Project URL** e uma chave pública:
   - `VITE_SUPABASE_URL` = Project URL;
   - `VITE_SUPABASE_PUBLISHABLE_KEY` = `sb_publishable_...`; ou
   - `VITE_SUPABASE_ANON_KEY` = JWT público `anon`, se o projeto usa a chave antiga.

Nunca use a senha do banco, `service_role` ou `sb_secret_`. A chave publishable/anon é
pública por definição e será incorporada ao bundle do site; a chave secreta não pode ser
publicada.

## 2. Configurar o host antes de publicar

Configure as duas variáveis no host que realmente publica o site:

- **GitHub Pages**: repositório → **Settings → Secrets and variables → Actions** → crie
  `VITE_SUPABASE_URL` e `VITE_SUPABASE_PUBLISHABLE_KEY` (ou `VITE_SUPABASE_ANON_KEY`).
  O workflow também aceita Repository Variables com os mesmos nomes. Depois execute
  **Actions → Publicar sistema (GitHub Pages)**.
- **Netlify**: **Site configuration → Environment variables**; salve as variáveis e faça
  um novo deploy.
- **Vercel**: **Project → Settings → Environment Variables**; salve as variáveis e faça
  um novo deploy.

A verificação do pacote exige que URL e chave pública apareçam no build. Sem elas, a
publicação é bloqueada. O app oficial ignora chaves antigas guardadas no navegador ou
recebidas em links: assim todos os aparelhos permanecem vinculados ao mesmo banco central.

## 3. Netlify Drop (deploy manual)

O pacote só pode ser gerado com as variáveis da conexão presentes no ambiente de build:

```bash
cd app
npm ci
npm run publicar
```

O comando valida o bundle antes de criar `../publicar/`. Se faltar a conexão, ele remove o
pacote antigo e termina com erro, para ninguém arrastar por engano uma versão local ou
obsoleta. Também é possível baixar o artefato `Altoprints-pronto-para-publicar` de uma
execução bem-sucedida em **GitHub → Actions** e arrastá-lo no Netlify Drop. O pacote não
inclui um arquivo para abrir com dois cliques.

## 4. O que acontece quando o Supabase não responde

- O app não salva pedidos, usuários ou arquivos em IndexedDB/localStorage como alternativa.
- Ações de leitura/gravação exibem erro e tentam novamente quando a conexão volta.
- Se URL/chave não estiverem no build, o site mostra **“Conexão com o banco online
  necessária”**; não existe modo local de produção.
- Não apague o armazenamento do navegador para atualizar. Dados operacionais ficam no
  Supabase; o cache PWA contém apenas arquivos do app.

## Esqueci a senha do proprietário

O login usa usuário e senha (o usuário também pode ser o e-mail). Outro proprietário pode
redefinir o acesso em **Configurações → Funcionários e acessos → Redefinir senha**.

Se a senha perdida for a única conta de proprietário, no **SQL Editor** do projeto correto
rode a instrução abaixo, trocando `SEU_USUARIO`:

```sql
update public.usuarios
set senha_hash = ''
where lower(usuario) = lower('SEU_USUARIO');
```

Depois entre com esse usuário e defina imediatamente uma senha forte e exclusiva. Não
compartilhe a senha no chat nem a coloque no código.

## Manutenção

- Baixe backup em **Configurações → Dados → Baixar backup**. O plano gratuito pode não
  manter backups por tempo suficiente para a rotina da empresa.
- Para adicionar colunas/tabelas, consulte o esquema em `supabase/schema.sql` e execute
  somente as migrações compatíveis no projeto correto; não apague pedidos existentes.
- As novas versões do PWA são instaladas ao abrir/retomar o site online; não é necessário
  limpar cache.
