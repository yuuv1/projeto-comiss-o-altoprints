# Como colocar o sistema online (de graça)

O sistema é um site estático (arquivos HTML/JS/CSS). Isso significa que ele pode ser
hospedado de graça em vários serviços. O banco de dados é separado — e também tem
opção gratuita (Supabase).

---

## Antes de tudo: como só VER e TESTAR o sistema (sem publicar)

**Forma 1 — arquivo único, dois cliques (não precisa de internet nem instalar nada):**

Rode `npm run publicar` (dentro de `app/`) e clique **duas vezes** no arquivo
`publicar/Altoprints.html`. Ele abre no navegador já funcionando e guarda os dados nesse
computador. É o jeito mais fácil de mostrar o sistema para alguém.

> **Não abra o `publicar/index.html` com dois cliques** — ele fica em branco. Esse arquivo
> é feito para ser **hospedado** (ele carrega o programa da pasta `assets/`, e o navegador
> bloqueia isso quando o arquivo é aberto direto do disco). O `Altoprints.html` já tem o
> programa embutido justamente por isso.

**Forma 2 — modo desenvolvimento (atualiza sozinho a cada alteração):**

```bash
cd app
npm install
npm run dev     # abre em http://localhost:8080
```

---

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

### Opção B: Netlify

O Netlify é confiável (empresa grande, CDN mundial, HTTPS grátis) e o plano Free permite
uso comercial: **100 GB de tráfego e 300 minutos de build por mês**. Para um sistema
interno isso é muito mais do que o necessário. Se estourar o limite do mês, o site fica
pausado até o dia 1º do mês seguinte (não gera cobrança surpresa).

**B1 — Recomendado: Netlify conectado ao GitHub (atualiza sozinho)**

Uma vez conectado, toda alteração enviada ao repositório publica o sistema automaticamente
(e dá para voltar para uma versão anterior com um clique):

1. Já existe o arquivo [`netlify.toml`](../netlify.toml) na raiz do repositório com tudo
   configurado (pasta `app`, comando de build e pasta publicada).
2. Em <https://app.netlify.com> crie a conta (dá para entrar com o GitHub).
3. Clique em **Add new site → Import an existing project → GitHub** e escolha este repositório.
4. Confirme as opções detectadas (o Netlify lê o `netlify.toml` sozinho) e clique em **Deploy**.
5. Se estiver usando o Supabase, antes de publicar adicione em
   **Site configuration → Environment variables**: `VITE_SUPABASE_URL` e
   `VITE_SUPABASE_ANON_KEY`.
6. Depois é só: **eu altero o sistema → envio para o GitHub → o Netlify publica sozinho.**

**B2 — Netlify Drop (só para testar rápido, sem conta)**

1. No seu computador: `cd app && npm install && npm run build`
2. Abra <https://app.netlify.com/drop> e arraste a pasta `app/dist`.
3. ⚠️ **Importante:** o site criado sem login é temporário — ele é apagado se você não
   **reivindicar ("Claim")** ele para uma conta Netlify. Clique no botão de claim e crie a
   conta na hora; depois disso o endereço fica firme.
4. No Drop a atualização é manual: gere o build de novo e arraste em
   **Deploys → drag and drop**. Para atualizar sozinho, conecte o repositório (opção B1).

### Opção C: Vercel (alternativa)

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
"Banco na nuvem (Supabase) conectado".

> ⚠️ Use sempre a chave **pública** do projeto: a nova `sb_publishable_...` ou a antiga
> `anon` (a sequência longa que começa com `eyJ`). **Nunca** a `sb_secret_...` /
> `service_role` — o sistema se recusa a conectar com ela (é de propósito). Se você já tinha contas criadas no modo local,
elas ficam no navegador: recrie as contas pelo primeiro acesso ou cadastre em
**Equipe** (só o proprietário entra nessa tela). A partir daí tudo o que for salvo aparece igual
em todos os aparelhos.

---

## Publicar pela pasta pronta (Netlify Drop)

Se você prefere não conectar o GitHub, o sistema gera uma pasta pronta para arrastar:

```bash
cd app
npm run publicar      # cria a pasta ../publicar (site + _redirects + LEIA-ME.txt)
```

1. Abra <https://app.netlify.com/drop>
2. Arraste a **pasta `publicar`** inteira para a área pontilhada
3. Clique em **Claim site** para o site ficar seu (site não reivindicado é apagado pelo Netlify)
4. Para atualizar depois: `npm run publicar` e arraste a pasta de novo em *Deploys*

> Sem o Supabase configurado, cada aparelho guarda os próprios dados. Para a equipe ver os mesmos
> pedidos, vale o passo do Supabase (acima) e então gerar a pasta com as chaves no `.env`.

## Esqueci a senha (login)

Cada pessoa entra com **nome de usuário + senha**. O proprietário resolve a senha de
qualquer vendedor em **Equipe → Vínculo e senha → Redefinir senha** (não precisa de nada
técnico).

Se a senha perdida for a **do proprietário**:

- **Modo nuvem (Supabase):** abra o **SQL Editor** e rode (troque `SEU_USUARIO` e
  `NOVA_SENHA`); a linha apaga a senha, então o próximo login com esse usuário aceita
  qualquer senha e você já troca em *Meu perfil* → Trocar minha senha:
  ```sql
  update public.usuarios set senha_hash = '' where lower(usuario) = lower('SEU_USUARIO');
  ```
- **Modo local:** no navegador do computador, abra o console (F12) e rode (troque
  `SEU_USUARIO`):
  ```js
  const db = JSON.parse(localStorage.getItem('altoprints:db:v1'))
  const u = db.usuarios.find((x) => x.usuario === 'SEU_USUARIO')
  u.ativo = true
  u.senha_hash = ''
  localStorage.setItem('altoprints:db:v1', JSON.stringify(db))
  localStorage.removeItem('altoprints:sessao')
  ```
  Depois recarregue e entre — troque a senha em seguida.

> Se nem isso resolver (ou você ficou sem nenhum proprietário ativo), o caminho é limpar
> o banco de contas em **Configurações → Dados** (ou recriar o projeto no Supabase) e
> criar o proprietário de novo pelo primeiro acesso.

## Dicas importantes

- **Logo oficial**: envie em ⚙️ Configurações (PNG/JPG até 400 KB). Ele aparece no
  cabeçalho e nos relatórios impressos em A4.
- **Imprimir/PDF**: nas telas de Relatório use o botão *Imprimir / PDF* e escolha
  "Salvar como PDF" no navegador. A folha já sai em A4 em pé, preto e branco, com o
  logo no cabeçalho e os totais no final.
- **Dados de exemplo**: em ⚙️ Configurações existe *Carregar demonstração* e
  *Apagar todos os dados* para começar a usar de verdade.
- **Atualizar o sistema publicado**: com o GitHub conectado (GitHub Pages ou Netlify B1)
  basta enviar a alteração para o repositório que o site se atualiza sozinho, em 1 a 2
  minutos. As alterações **não apagam nada**: os pedidos ficam no Supabase (nuvem) ou,
  no modo local, continuam salvos no navegador do usuário.
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
