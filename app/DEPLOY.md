# Como colocar o sistema online (de graça)

O sistema é um site estático (arquivos HTML/JS/CSS). Isso significa que ele pode ser
hospedado de graça em vários serviços. O banco de dados é separado — e também tem
opção gratuita (Supabase).

Você pode fazer em duas etapas:

- **Etapa 1 (5 minutos)** — publicar o site. Nesta etapa os dados ficam salvos no
  navegador de cada pessoa (bom para mostrar o sistema).
- **Etapa 2 (10 minutos)** — criar o banco na nuvem, para que todos vejam os mesmos
  pedidos de qualquer computador ou celular.

---

## Etapa 1 — Publicar o site

### Opção A: GitHub Pages (já está configurado neste repositório)

1. No GitHub, abra o repositório e vá em **Settings → Pages**.
2. Em **Source**, escolha **GitHub Actions**.
3. Vá em **Actions → "Publicar sistema (GitHub Pages)" → Run workflow**
   (ou faça qualquer alteração na branch `main`).
4. Em 1 a 2 minutos o link aparece no próprio GitHub
   (algo como `https://seu-usuario.github.io/projeto-comiss-o-altoprints/`).

O arquivo `.github/workflows/publicar.yml` já cuida de instalar, testar e publicar.

### Opção B: Netlify (arrastar e soltar)

1. No seu computador:
   ```bash
   cd app
   npm install
   npm run build
   ```
2. Abra <https://app.netlify.com/drop> e arraste a pasta `app/dist` para a página.
3. Pronto: o Netlify gera um link na hora (dá para renomear, ex.: `altoprints.netlify.app`).

### Opção C: Vercel

1. Abra <https://vercel.com>, clique em **Add New → Project** e importe este repositório.
2. Configure **Root Directory: `app`** e **Build Command: `npm run build`**.
3. Em **Environment Variables** coloque as chaves do Supabase (etapa 2) e clique em **Deploy**.

---

## Etapa 2 — Banco de dados na nuvem (Supabase, grátis)

1. Crie uma conta em <https://supabase.com> e clique em **New project**.
   - Nome: `altoprints` · Senha do banco: guarde em lugar seguro · Região: South America (São Paulo).
2. No menu lateral, abra **SQL Editor → New query**, cole todo o conteúdo do arquivo
   [`app/supabase/schema.sql`](supabase/schema.sql) e clique em **Run**.
   Isso cria as tabelas `vendedores`, `clientes`, `pedidos`, `arquivos` e `configuracoes`.
3. No menu lateral, abra **Storage → New bucket**:
   - Nome: `artes` · marque **Public bucket** → **Save**.
   - É aqui que os arquivos de arte dos pedidos são guardados.
4. Abra **Project Settings → API** e copie:
   - **Project URL** → `VITE_SUPABASE_URL`
   - **anon public** (Project API keys) → `VITE_SUPABASE_ANON_KEY`
5. Coloque essas duas variáveis onde você publicou:

   - **No seu computador**: crie o arquivo `app/.env` (copie de `app/.env.example`) com:
     ```
     VITE_SUPABASE_URL=https://xxxxxxxx.supabase.co
     VITE_SUPABASE_ANON_KEY=eyJhbGciOi...
     ```
     Depois rode `npm run dev` novamente.

   - **No GitHub Pages**: no repositório, vá em
     **Settings → Secrets and variables → Actions → New repository secret** e crie os
     dois segredos com os mesmos nomes (`VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`).
     Depois rode o workflow de publicação novamente.

   - **No Netlify/Vercel**: em *Environment Variables* do projeto, adicione as duas
     variáveis e faça um novo deploy.

Pronto! Ao abrir o site, em ⚙️ **Configurações** aparece a mensagem
"Banco na nuvem (Supabase) conectado". A partir daí tudo o que for salvo aparece igual
em todos os aparelhos.

---

## Dicas importantes

- **Logo oficial**: envie em ⚙️ Configurações (PNG/JPG até 400 KB). Ele aparece no
  cabeçalho e nos relatórios impressos em A4.
- **Imprimir/PDF**: nas telas de Relatório use o botão *Imprimir / PDF* e escolha
  "Salvar como PDF" no navegador. A folha já sai em A4 em pé, preto e branco, com o
  logo no cabeçalho e os totais no final.
- **Dados de exemplo**: em ⚙️ Configurações existe *Carregar demonstração* e
  *Apagar todos os dados* para começar a usar de verdade.
- **Backup**: no Supabase, em **Database → Backups**, os planos gratuitos guardam
  cópias diárias por alguns dias. Também é possível exportar CSV pelo próprio relatório.
- **Celular**: o sistema é responsivo — dá para usar no celular do vendedor durante a
  venda, e o menu vira um botão no topo.
- **Segurança**: o sistema não tem tela de login (igual ao antigo). Não publique o
  link em redes sociais e, se em algum momento quiser, adicionamos login com e-mail e
  senha em uma próxima etapa.

---

## Domínio próprio (opcional, depois)

Se a empresa já tem um domínio (ex.: `altoprints.com.br`), dá para apontar um subdomínio
como `sistema.altoprints.com.br` para o GitHub Pages, Netlify ou Vercel — sem custo extra
além do domínio. O passo a passo fica em *Settings → Pages → Custom domain* (GitHub) ou
*Domain management* (Netlify/Vercel).
