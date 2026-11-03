# 🚀 Altoprints no ar — passo a passo completo (do zero ao uso)

**Um caminho só, na ordem certa.** Cada parte diz o que clicar, o que conferir e o que
fazer se algo sair diferente. Tempo total: **~25 minutos**.

| Parte | O que é | Tempo |
| --- | --- | --- |
| **0** | Deixar a versão limpa na `main` (sem dados e sem senha de exemplo) | 2 min |
| **1** | Criar o banco na nuvem (**Supabase**) | 8 min |
| **2** | Publicar o site (**Netlify** ou **GitHub Pages**) | 5–10 min |
| **3** | Criar o **seu** acesso de proprietário (único login do sistema) | 3 min |
| **4** | Cadastrar os **funcionários** e conectar os celulares | 5 min |
| **5** | Conferência final (checklist) | 3 min |
| **6** | Rotina: backup, atualização, senhas | — |
| **7** | Deu erro? Tabela de socorro | — |

> **Regra de ouro da ordem:** primeiro o **banco** (Parte 1), depois o **site** (Parte 2),
> depois o **seu login** (Parte 3) e os **funcionários** (Parte 4). Fazendo isso *depois* de
> conectar a nuvem, tudo já nasce no banco da empresa e todo mundo vê a mesma coisa.

---

## Parte 0 — Conferir a versão que está na `main` (2 min)

A versão **1.5.7** bloqueia o modo local no site oficial: o build de produção exige a URL
mais uma chave pública do Supabase e os aparelhos usam a mesma conexão central. Também
mantém PWA com atualização automática, mesclagem do CSV sem apagar pedidos existentes,
login do proprietário por usuário e senha, equipe sem logins individuais e dados de exemplo
opcionais. Nenhuma conta, chave ou dado real foi criado ou alterado por esta correção.

1. Abra <https://github.com/yuuv1/projeto-comiss-o-altoprints> e confira o merge mais recente.
2. Em **Settings → Secrets and variables → Actions**, confirme que existem
   `VITE_SUPABASE_URL` e `VITE_SUPABASE_PUBLISHABLE_KEY` (ou `VITE_SUPABASE_ANON_KEY`).
   Os valores precisam ser o mesmo projeto Supabase usado pela empresa; não use senha do
   banco, `service_role` nem chave `sb_secret_`.
3. O workflow valida a conexão antes de compilar e confere que ela entrou no pacote. Sem
   essas variáveis, falha sem publicar uma versão local. Para conferir o release, abra o
   site oficial e veja `v1.5.7` no rodapé.

> **Dados de versões antigas:** pedidos ou anexos que eventualmente tenham ficado salvos
> em um navegador antigo não são lidos, migrados nem apagados pela versão online. Não limpe
> o armazenamento do navegador para atualizar. Se houver dados locais importantes, preserve
> uma cópia antes de descontinuar a versão antiga; a aplicação não altera esses dados.

---

## Parte 1 — Criar o banco na nuvem (Supabase, grátis) — 8 min

O Supabase guarda os pedidos para **todos os aparelhos verem os mesmos dados**. O site oficial só é publicado quando este banco está configurado; sem ele, não há modo local nem gravação de dados operacionais no navegador.

### 1.1 Criar a conta e o projeto

1. Abra **<https://supabase.com>** → **Start your project** (grátis, sem cartão).
   Entre com a sua conta do **GitHub** (mais fácil) ou com e-mail.
2. Clique em **New project** e preencha:
   - **Name:** `altoprints`
   - **Database Password:** clique em **Generate a password** → **Copy** → **guarde num
     lugar seguro** (é a senha técnica do banco; você quase não vai usá-la).
   - **Region:** **South America (São Paulo)** ← importante, deixa o sistema rápido aqui
   - **Plan:** **Free**
3. Clique em **Create new project** e espere ~2 minutos.

### 1.2 Criar as tabelas (rodar o SQL)

1. No menu da esquerda do Supabase, clique em **SQL Editor** → **New query**.
2. Pegue o texto do SQL — **as duas formas dão o mesmo texto**:
   - **Pelo GitHub:** abra [`app/supabase/schema.sql`](app/supabase/schema.sql) → botão
     **Copy raw file** (ou selecione tudo e copie).
   - **Pelo sistema:** *Configurações → Nuvem → **Copiar o SQL*** (se você já tiver entrado
     como proprietário — veja a Parte 3).
3. Cole no SQL Editor e clique em **Run**.
4. Precisa aparecer a mensagem verde **“Success. No rows returned”**.

> Isso cria as tabelas (`pedidos`, `clientes`, `vendedores`, `arquivos`, `impressoes`,
> `usuarios`, `configuracoes`) **e** o espaço das artes (bucket `artes`) — não precisa
> mexer em *Storage* na mão.
> **Pode rodar de novo quantas vezes quiser**: o SQL só cria o que estiver faltando, nunca
> apaga pedido nenhum.

### 1.3 Copiar as duas informações do banco

1. No topo do projeto, clique em **Connect** (ou vá em **Project Settings → API Keys**).
2. Copie e guarde num bloco de notas:
   - **Project URL** → algo como `https://xxxxxxxx.supabase.co`
   - **Chave pública** → nos projetos novos chama **publishable** (`sb_publishable_...`);
     nos antigos aparece como **anon** (começa com `eyJ`). **As duas funcionam.**
3. 🚫 **Nunca** copie a chave **secret** (`sb_secret_...` / `service_role`). Ela dá acesso
   total ao banco. O sistema se recusa a conectar com ela e a publicação é bloqueada se ela
   aparecer no pacote.

**Fim da Parte 1.** Você tem: URL + chave pública + banco com as tabelas criadas.

---

## Parte 2 — Publicar o site (grátis) — 5 a 10 min

Escolha um host: Netlify ligado ao GitHub (A) ou GitHub Pages (C) atualizam automaticamente;
Netlify Drop (B) é manual. **Todos exigem a mesma conexão central do Supabase** antes de
publicar. Se as variáveis faltarem, o deploy falha — nunca sobe em modo local.

### Caminho A (recomendado) — Netlify ligado ao GitHub

1. Abra **<https://app.netlify.com>** e crie a conta entrando com o **GitHub**.
2. **Add new site → Import an existing project → GitHub** → autorize e escolha o
   repositório **`yuuv1/projeto-comiss-o-altoprints`**.
3. O Netlify lê sozinho o arquivo [`netlify.toml`](netlify.toml): pasta `app`, comando de
   build, pasta publicada `dist`, Node 22 e a conferência de segurança do pacote
   (`npm run checar dist`) — se o pacote estiver sujo, o deploy **falha** de propósito.
4. **Antes de clicar em Deploy**, adicione as chaves do banco:
   - **Site configuration → Environment variables → Add variable**
   - `VITE_SUPABASE_URL` = a **Project URL** da Parte 1.3
   - `VITE_SUPABASE_PUBLISHABLE_KEY` = a **chave pública** da Parte 1.3
     (se a sua for a antiga `anon`, use o nome `VITE_SUPABASE_ANON_KEY`)
5. Clique em **Deploy site**. Em ~2 minutos aparece o endereço
   (ex.: `https://nome-aleatorio.netlify.app`).
6. **Trocar o endereço por um bonito:** *Site configuration → Change site name*
   (ex.: `altoprints-sistema` → fica `https://altoprints-sistema.netlify.app`).
7. **Como conferir:** abra o endereço. Na tela de login precisa aparecer
   **“Contas validadas no Supabase (seguro)”** em verde. Nesse modo a aba
   *Configurações → Nuvem* fica só informativa (a conexão vem do site, não do aparelho).

> Daqui para frente: **eu altero o sistema → envio para a `main` → o Netlify publica
> sozinho** em 1–2 minutos. Para voltar uma versão: *Deploys → Rollback*.

### Caminho B — Netlify Drop, arrastando o pacote online

1. Configure `VITE_SUPABASE_URL` e a chave pública nos Secrets/Variables do GitHub Actions
   (como no Caminho C), ou no ambiente local antes de rodar `npm run publicar`.
2. Baixe o artefato **Altoprints-pronto-para-publicar** da última execução bem-sucedida em
   **GitHub → Actions**. O repositório não guarda um build pré-configurado.
3. Abra **<https://app.netlify.com/drop>**, arraste a pasta do artefato e clique em
   **Claim site** para manter o endereço.
4. Todos os aparelhos devem usar esse mesmo endereço e o mesmo banco. Sem URL/chave válida,
   `npm run publicar` e o workflow falham; não existe conexão por aparelho nem modo local.
5. Para atualizar depois, baixe o artefato da execução mais recente e publique-o em
   *Deploys → drag and drop*.

---

### Caminho C (automático) — GitHub Pages, direto pelo GitHub

O site fica em **<https://yuuv1.github.io/projeto-comiss-o-altoprints/>** e se atualiza
**sozinho** a cada envio para a `main`: o robô do repositório (aba **Actions** →
*Publicar sistema*) roda os testes, gera a versão final, confere o pacote e publica.

**Antes de tudo — o repositório precisa ficar PÚBLICO.** O GitHub Pages em repositório
privado exige conta paga (Pro/Team). Deixar público aqui é **seguro**: o robô roda a
conferência (`npm run checar`) que **barra** qualquer senha, dado de pessoa real ou chave
secreta antes de publicar — e o sistema já nasce vazio, do zero. (Se preferir manter o
código fechado, use o Caminho A ou B.)

1. **Deixar o repositório público** (se a conta não tiver Pages pago): GitHub →
   repositório → **Settings → General → Danger Zone → Change visibility → Public**.
2. **Configurar o banco central antes da publicação:** em **Settings → Secrets and
   variables → Actions**, crie `VITE_SUPABASE_URL` e uma chave pública:
   `VITE_SUPABASE_PUBLISHABLE_KEY` (ou `VITE_SUPABASE_ANON_KEY` para chave antiga).
   Use a URL e a chave pública do mesmo projeto Supabase da Parte 1. Nunca use senha,
   `service_role` ou `sb_secret_`.
3. **Publicar:** aba **Actions → Publicar sistema (GitHub Pages) → Run workflow → main →
   Run workflow**. Depois, qualquer envio para a `main` publica automaticamente.
   Na primeira vez, confirme **Settings → Pages → Source: GitHub Actions**.
4. Espere o **✓ verde** e abra **<https://yuuv1.github.io/projeto-comiss-o-altoprints/>**.
   Se a validação do Supabase falhar, o site antigo continua no ar e o log informa qual
   variável pública está ausente/inválida; não é publicada uma versão em modo local.

**Dados:** o GitHub Pages só hospeda o app; todo o conteúdo operacional fica no único
Supabase central. Configuração por link ou por aparelho é ignorada no site oficial.

---

## Parte 2.5 — Deixar o endereço bonitinho (domínio próprio) — opcional

O GitHub Pages entrega o endereço **<https://yuuv1.github.io/projeto-comiss-o-altoprints/>**:
funciona em qualquer lugar, é grátis, tem HTTPS e **nunca muda**. O único defeito é ser
comprido de falar. Se quiser um endereço curto (ex.: **`https://sistema.altoprints.com.br`**),
siga abaixo.

**Se você JÁ tem um domínio** (ex.: `altoprints.com.br`, registrado no Registro.br, Hostinger,
etc.):

1. **No painel do domínio** (onde ele foi registrado), crie um registro **CNAME**:
   - **Nome/tipo:** `sistema` (pode ser outro apelido: `pedidos`, `painel`…)
   - **Valor:** `yuuv1.github.io`
2. **No GitHub:** *Settings* → **Pages** → **Custom domain** → digite
   `sistema.seudominio.com.br` → **Save**.
3. Espere a verificação do DNS (de minutos a algumas horas) e marque **Enforce HTTPS**.
4. Pronto: o mesmo site responde no endereço novo **e** no do github.io.

> Prefere o endereço **raiz** (`altoprints.com.br` direto, sem `sistema.`)? Dá também, mas
> exige 4 registros **A** no lugar do CNAME (185.199.108.153, .109, .110 e .111) — o CNAME
> num subdomínio é mais simples de acertar. Me avise que eu passo os valores.

**Se você NÃO tem domínio:**

- Registrar um **`.com.br`** no **Registro.br** custa ~**R$ 40/ano** e leva 5 minutos.
- Ou seguir com o endereço do **github.io** mesmo: é grátis, seguro e estável.

O sistema funciona nos dois endereços **sem mudar nada no código** — os links internos são
relativos, então qualquer endereço serve.

---

## Parte 3 — Criar o SEU acesso de proprietário (3 min)

Faça isso **antes** de mandar o link para a equipe.

### 3A. Se você usou o Caminho A (site já conectado ao banco)

1. Abra o endereço do sistema e acrescente **`/#/administracao`** no fim:
   `https://SEU-ENDERECO.netlify.app/#/administracao`
   - Outras formas de abrir a mesma porta: **5 toques seguidos no logo** ou
     **Ctrl + Alt + D** no computador.
2. Como ainda não existe nenhum dono, a tela mostra **“Criar o acesso do proprietário”**:
   - **Seu nome** · **Usuário** (pode ser o e-mail habitual, sem campo separado de e-mail) · **Senha** e **Repita a senha**
   - Use uma **senha forte** (ela é a tranca do sistema: quem tem o link chega até a porta,
     mas sem a senha não vê nada).
3. Clique em **Criar acesso e entrar**. A conta já nasce **no banco da nuvem**.
4. **Instale o aplicativo:** depois de abrir o site publicado pelo celular, toque em
   **Instalar app** no menu do sistema. No iPhone/iPad, use Safari → **Compartilhar →
   Adicionar à Tela de Início**. Depois, o ícone abre o Altoprints com 1 toque. Guia em
   [`app/PWA.md`](app/PWA.md).

A conexão vem do build do site. Não cole URL/código em cada aparelho: se faltar conexão,
o site bloqueia o acesso em vez de criar dados locais.

### 3B. Um segundo login de proprietário (sócio, gerente, escritório)

Dentro do sistema: **Configurações → Funcionários e acessos → Novo acesso** (ou o atalho em
**Configurações → Meu acesso → Outro acesso de proprietário**).
Pode ter quantos quiser — o sistema só não permite ficar **sem nenhum** dono ativo (o
último não pode ser desativado nem excluído, e ninguém exclui o próprio acesso).

---

## Parte 4 — Funcionários e celulares (5 min)

### 4.1 Como a equipe entra (sem login, sem senha)

- **JESSICA**, **RAISSA** e **ANDREIA** já vêm cadastradas como **funcionárias** (nomes na
  lista, sem conta e sem senha). Nenhum pedido vem pronto.
- A equipe abre o sistema e **já está dentro**: a tela inicial é **Pedidos**.
- Ao registrar uma fila, a pessoa **escolhe o próprio nome** no campo *“Seu nome
  (funcionário)”*. É esse nome que aparece no cartão, no relatório e na comissão.
- **Para adicionar mais alguém depois:** entre como proprietário →
  *Configurações → Funcionários e acessos → Novo funcionário*. **Só o dono cadastra.**
- **Não existe mais** senha, “tela de entrada pelo nome” ou permissão por funcionário: a
  equipe vê os pedidos e os clientes da loja; as telas de gestão são do proprietário.

### 4.2 Usar o mesmo site e banco em todos os aparelhos

1. Mande à equipe o endereço oficial publicado.
2. Todos devem abrir esse mesmo endereço; a conexão central do Supabase já vem na publicação.
3. Não há link/código de conexão por aparelho. Se o site estiver sem a conexão central,
   ele bloqueia o uso e não salva pedidos em armazenamento local.

### 4.3 Testar antes de divulgar

- [ ] Na tela inicial aparecem **ANDREIA**, **JESSICA** e **RAISSA** e tocar num nome entra
      direto sem pedir senha
- [ ] Criou um **pedido de teste** no computador → ele apareceu no celular (e vice-versa)
- [ ] Anexou um **arquivo de arte** no pedido (testa o espaço das artes)
- [ ] Entrou tocando no nome de uma vendedora (aba anônima) e ela viu **só** os pedidos dela
- [ ] **Apagou** o pedido de teste

### 4.4 Instalar no celular como aplicativo

1. Abra o site já publicado pelo celular, usando **HTTPS**.
2. No Android, toque em **Instalar app** no menu do sistema (ou Chrome → **⋮ → Instalar app**).
3. No iPhone/iPad, abra no **Safari** → **Compartilhar → Adicionar à Tela de Início**.
4. Confirme o ícone **Altoprints** na tela inicial. A instalação é uma vez por aparelho.

> O Altoprints é somente online: não há arquivo `Altoprints.html` nem operação de pedidos sem internet.
> O PWA atualiza sozinho e os dados do Supabase carregam/sincronizam quando a conexão está disponível.

Guia completo para celular e computador: [`app/PWA.md`](app/PWA.md).

### 4.5 Mensagem pronta para o grupo

> *Oi, meninas! O sistema novo de pedidos está no ar 👇*
> *Link: (colocar aqui)*
> *Abra o mesmo endereço oficial em todos os aparelhos. Os pedidos são compartilhados online.*
> *A equipe não tem login: ao registrar a fila, escolha o seu nome na lista.*
> *Ao registrar a fila, escolha o seu nome na lista “Seu nome (funcionário)”.*

---

## Parte 5 — Conferência final

- [ ] `main` com a versão **1.5.7** e sem PR pendente (Parte 0)
- [ ] SQL rodou com **“Success. No rows returned”** (Parte 1.2)
- [ ] Projeto do Supabase na região **São Paulo**, senha do banco guardada (Parte 1.1)
- [ ] Site oficial no ar (Netlify Drop precisa estar **reivindicado/Claim**)
- [ ] Workflow confirmou a URL + chave pública do Supabase no pacote
- [ ] **Altoprints instalado** como aplicativo no celular principal (Parte 4.4)
- [ ] *Configurações → Nuvem* mostra **“Banco na nuvem conectado”**
- [ ] Seu acesso de **proprietário** criado com **senha forte** + ícone salvo no celular
- [ ] Segundo proprietário criado, se for o caso (Parte 3C)
- [ ] **JESSICA, RAISSA e ANDREIA** aparecendo na lista de funcionários do pedido
- [ ] **Comissões** e **preços do metro** conferidos em *Configurações*
- [ ] **Logo da empresa** enviado em *Configurações → Empresa*
- [ ] **Nenhum dado de exemplo** no sistema (sem a faixa amarela “não são reais”).
      Se treinou com exemplos: *Configurações → Dados → Apagar todos os dados*
- [ ] Teste de pedido entre computador e celular funcionou (Parte 4.3)
- [ ] *Configurações → Dados → **Baixar backup*** funcionou (guarde o arquivo)
- [ ] Versão **1.5.7** aparecendo no rodapé do sistema

---

## Parte 6 — Rotina depois do lançamento

| Quando | O que fazer |
| --- | --- |
| **Toda semana** | *Configurações → Dados → Baixar backup* (o plano grátis do Supabase **não** faz backup automático) |
| **Atualização do sistema** | GitHub Pages/Netlify publica automaticamente na `main`; Netlify Drop usa o artefato da última execução bem-sucedida (sempre com Supabase central) |
| **Mudou o banco?** | *Configurações → Nuvem → Copiar o SQL* → SQL Editor → **Run**. Só completa o molde, nunca apaga nada |
| **Outro proprietário esqueceu a senha** | *Configurações → Funcionários e acessos → Redefinir senha* |
| **VOCÊ esqueceu a senha** | [`app/DEPLOY.md`](app/DEPLOY.md) → seção **“Esqueci a senha”** (uma linha de SQL resolve) |
| **1 semana sem usar o sistema** | O banco grátis “dorme”: <https://supabase.com/dashboard> → projeto → **Restore project**. Nada se perde |
| **Endereço administrativo vazou** | Trocamos por outro (uma linha de código) |
| **Saiu alguém da equipe** | *Funcionários e acessos* → o nome **não pode ser excluído** se tiver pedidos; use **Renomear** (mantém o histórico) |

**Limites do plano grátis (folgado para uma loja):** 500 MB de banco (centenas de milhares
de pedidos) · 1 GB de artes · 100 GB de tráfego/mês no Netlify. Se estourar, o site pausa
até o mês seguinte (sem cobrança surpresa).

---

## Parte 7 — Deu erro? Tabela de socorro

| O que aparece | Causa | Como resolver |
| --- | --- | --- |
| “as tabelas ainda não foram criadas no Supabase” | o SQL não rodou | Parte 1.2 de novo → **Run** |
| “não foi possível falar com o banco na nuvem” | internet caiu **ou** o projeto está dormindo | **Restore project** no painel do Supabase |
| “a chave do Supabase parece inválida” | chave errada/incompleta/**secreta** | Parte 1.3: use a **pública** (`sb_publishable_` ou `anon`) |
| “Falha ao enviar o arquivo” | o SQL não rodou por completo (faltou o bucket) | rode o SQL de novo |
| Publicação bloqueada por configuração Supabase | URL/chave ausente ou inválida | configure `VITE_SUPABASE_URL` e chave `publishable`/`anon` nos Secrets/Variables; rode o workflow de novo |
| O site mostra o aviso de conexão central ausente | pacote antigo ou build sem variáveis | corrija as variáveis de publicação e publique novamente; o app não salvará no navegador |
| Falha ao carregar ou salvar | internet indisponível, projeto pausado ou erro no Supabase | confira a conexão e o painel do Supabase; o app não muda para armazenamento local |
| O site mostra a versão **antiga** | o deploy não rodou ou o navegador guardou cache | *Actions → Publicar sistema → Re-run* · depois reabra online |
| O deploy do Netlify **falhou** | configuração do Supabase ou guarda bloqueou o build | leia o log: ele informa qual validação falhou |
| Quer trocar o projeto Supabase | conexão central definida na publicação | atualize os Secrets/Variables do host e publique de novo; não altere aparelho por aparelho |

---

## Onde está cada documento

| Arquivo | Para que serve |
| --- | --- |
| **`LANCAMENTO.md`** (este) | o caminho completo, na ordem |
| [`app/CONECTAR-NUVEM.md`](app/CONECTAR-NUVEM.md) | só a nuvem, com mais detalhe e prints do assistente |
| [`app/DEPLOY.md`](app/DEPLOY.md) | referência de hospedagem (Netlify, Vercel, GitHub Pages), recuperação de senha, domínio próprio |
| [`app/PASSO-A-PASSO-SUPABASE.md`](app/PASSO-A-PASSO-SUPABASE.md) | Supabase em detalhes (parte por parte do painel) |
| [`README.md`](README.md) | o sistema: telas, regras de preço, comissão, perfis |
| [`app/supabase/schema.sql`](app/supabase/schema.sql) | o “molde” do banco (colar no SQL Editor) |

## Comandos (só para quem mexe no código)

```bash
cd app
npm install         # dependências (só na primeira vez)
npm run dev         # desenvolver no computador (http://localhost:8080) — abre já logado
npm run testar      # todos os testes (regras, login, telas)
npm run publicar    # gera só o pacote online; exige URL e chave pública do Supabase
npm run checar      # só a conferência (pode ir para o ar?) — aceita a pasta: npm run checar dist
```
