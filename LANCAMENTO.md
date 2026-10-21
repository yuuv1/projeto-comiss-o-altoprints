# 🚀 Altoprints no ar — passo a passo completo (do zero ao uso)

**Um caminho só, na ordem certa.** Cada parte diz o que clicar, o que conferir e o que
fazer se algo sair diferente. Tempo total: **~25 minutos**.

| Parte | O que é | Tempo |
| --- | --- | --- |
| **0** | Deixar a versão limpa na `main` (sem dados e sem senha de exemplo) | 2 min |
| **1** | Criar o banco na nuvem (**Supabase**) | 8 min |
| **2** | Publicar o site (**Netlify** ou **GitHub Pages**) | 5–10 min |
| **3** | Criar o **seu** acesso de proprietário | 3 min |
| **4** | Criar as contas da **equipe** e conectar os celulares | 5 min |
| **5** | Conferência final (checklist) | 3 min |
| **6** | Rotina: backup, atualização, senhas | — |
| **7** | Deu erro? Tabela de socorro | — |

> **Regra de ouro da ordem:** primeiro o **banco** (Parte 1), depois o **site** (Parte 2),
> depois as **contas** (Partes 3 e 4). Criando as contas *depois* de conectar a nuvem, elas
> já nascem no banco da empresa e todo mundo vê a mesma coisa.

---

## Parte 0 — Deixar a versão limpa na `main` (2 min)

A versão **1.2.0** (sem pedidos de exemplo, sem o acesso antigo `gui`/`12345`, e já com
**JESSICA, RAISSA e ANDREIA** entrando pelo nome sem senha) está no **Pull Request #5**.
Enquanto ele não for aprovado, a `main` ainda tem o pacote **antigo**.

1. Abra <https://github.com/yuuv1/projeto-comiss-o-altoprints/pull/5>
2. Role até o fim e clique em **Merge pull request** → **Confirm merge**.
   (Ou peça: *“pode fazer o merge do PR 5”* — eu faço.)
3. **Como conferir que deu certo:** abra o arquivo
   [`publicar/LEIA-ME.txt`](publicar/LEIA-ME.txt) no GitHub. As primeiras linhas precisam ser
   `Altoprints — Sistema de Pedidos DTF (versão 1.2.0)` e
   `O SISTEMA COMEÇA VAZIO, DO ZERO`. Se ainda aparecer `usuário: gui  senha: 12345`, o
   merge não foi feito.

> **Já tinha aberto uma versão antiga em algum aparelho?** Aqueles dados de exemplo (e o
> acesso `gui`) ficam **naquele navegador**. Para zerar: abra o sistema no aparelho →
> *Configurações → Dados → **Apagar todos os dados***. Se quiser apagar inclusive o seu
> acesso antigo, use **“Começar limpo neste aparelho”** (ele baixa um backup antes).

---

## Parte 1 — Criar o banco na nuvem (Supabase, grátis) — 8 min

O Supabase é quem guarda os pedidos para **todos os aparelhos verem os mesmos dados**.
Sem ele, o sistema até funciona no ar, mas cada celular/computador guarda a própria lista.

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

Escolha **um** dos três caminhos. O **A** (Netlify ligado ao GitHub) é o recomendado para
quem quer o site já conectado ao banco. O **C** (GitHub Pages) é o mais automático: tudo
roda dentro do próprio GitHub. O **B** é o mais rápido para ver no ar hoje.

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

### Caminho B (mais rápido) — Netlify Drop, arrastando a pasta

1. Tenha a pasta **`publicar`** em mãos (ela já vem pronta no repositório, gerada e
   conferida). Sem instalar nada: no GitHub, aba **Actions** → última execução →
   artefato **`Altoprints-pronto-para-publicar`**. Ou, no seu computador:
   `cd app && npm install && npm run publicar`.
2. Abra **<https://app.netlify.com/drop>**.
3. **Arraste a pasta `publicar` inteira** para a área pontilhada.
4. Quando o deploy terminar, clique em **Claim site** e crie a conta grátis.
   ⚠️ **Sem esse clique o Netlify apaga o site** depois de um tempo.
5. Neste caminho o site sobe **sem** as chaves do banco: você conecta na **Parte 3,
   passo 3B** (por dentro do sistema, em 1 minuto) — e cada aparelho da equipe usa o
   **link de conexão** da Parte 4.
6. Para atualizar depois: `npm run publicar` e arraste a pasta de novo em
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

1. **Deixar o repositório público:** no GitHub → repositório
   **`yuuv1/projeto-comiss-o-altoprints`** → **Settings** → **General** → role até o fim
   (*Danger Zone*) → **Change visibility** → **Public**.
2. **Publicar:** aba **Actions** → **Publicar sistema (GitHub Pages)** →
   **Run workflow** → **main** → **Run workflow**. (Daqui para frente, qualquer envio para
   a `main` já publica sozinho — não precisa repetir.)
   - Na primeira vez o próprio robô liga o Pages (Settings → Pages → Source:
     *GitHub Actions*). Se quiser adiantar: ligue lá antes.
3. Espere o **✓ verde** (uns 2 minutos na primeira vez) e abra
   **<https://yuuv1.github.io/projeto-comiss-o-altoprints/>**.
4. **Como conferir:** abre a tela de login do sistema com a versão no rodapé.
   Se aparecer a página **404** do GitHub, espere 1–2 minutos e atualize — o primeiro
   deploy demora um pouquinho para propagar.

**Onde ficam os dados neste caminho:** o GitHub Pages guarda **o site**. Os pedidos ficam
no **Supabase** (Parte 1) — que é o que mantém o conteúdo salvo e igual em todos os
aparelhos. Neste caminho o site sobe sem as chaves do banco: conecte a nuvem por dentro
do sistema na **Parte 3, passo 3B** (1 minuto) e mande o **link de conexão** da Parte 4
para os celulares da equipe.

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
2. Como ainda não existe nenhum dono, a tela mostra **“Criar acesso do proprietário”**:
   - **Seu nome** · **Usuário** (só letras/números) · **Senha** e **Repita a senha**
   - Use uma **senha forte** (ela é a tranca do sistema: quem tem o link chega até a porta,
     mas sem a senha não vê nada).
3. Clique em **Criar acesso do proprietário**. A conta já nasce **no banco da nuvem**.
4. **Salve o endereço como ícone no celular:** abra `…/#/administracao` no navegador do
   celular → menu → **“Adicionar à tela de início”**. Daí em diante é 1 toque.

### 3B. Se você usou o Caminho B (site sem as chaves)

**Conecte este aparelho ao banco ANTES de criar a conta** (assim ela não fica só neste
navegador):

1. Na **tela de login**, clique em **“Conectar este aparelho ao banco da empresa”**.
2. No campo de colar, **cole a URL e a chave pública juntas** (pode colar a mensagem
   inteira do painel do Supabase): o sistema mostra *“Encontrei a URL e a chave!”*.
   Confira os dois campos e clique em **Conectar à nuvem**.
   - Alternativa: cole o **código** (começa com `ALT1.`) ou o **link** de conexão.
3. Deve aparecer **“Banco na nuvem (Supabase) conectado”**.
4. Agora siga o **3A** (porta administrativa → criar o acesso do proprietário).

### 3C. Um segundo login de proprietário (sócio, gerente, escritório)

Dentro do sistema: **Equipe → Nova conta → Tipo de acesso: “Proprietário — vê tudo”**.
O atalho também está em **Configurações → Meu acesso → Outro acesso de proprietário**.
Pode ter quantos quiser — o sistema só não permite ficar **sem nenhum** dono ativo (o
último não pode ser desativado nem excluído, e ninguém exclui o próprio acesso).

---

## Parte 4 — Equipe e celulares (5 min)

### 4.1 Como a equipe entra (sem senha)

- **JESSICA**, **RAISSA** e **ANDREIA** já vêm cadastradas no sistema (com os 3 vendedores
  criados e sem nenhum pedido ainda).
- Na tela inicial aparece **“Quem está usando?”**: cada uma só **toca no próprio nome** e já
  entra na área dela — **sem precisar de senha**.
- Só o **proprietário** usa senha (pela porta `#/administracao`, 5 toques no logo ou
  `Ctrl + Alt + D`).
- **Para adicionar mais alguém depois:** *Equipe → Nova conta* (já vem marcado **“Entrar sem
  senha”** por padrão) — ou a própria pessoa toca em **“Sou funcionário novo — criar meu
  acesso”** na tela inicial.
- **Se no futuro quiser colocar senha em alguém (ou tirar):** *Equipe → Vínculo e senha*.
- **Permissões:** *Configurações → Permissões* (total / sem excluir / somente criar).
- **Telas extras por pessoa** (relatório, fila de impressão, cliente especial):
  *Equipe → Vínculo e senha*.

### 4.2 Conectar os aparelhos da equipe (1 clique para cada um)

1. **Configurações → Nuvem → “Conectar os aparelhos da equipe” → Copiar link**.
2. Mande no grupo do WhatsApp: *“Abram este link uma vez para o sistema ficar conectado.”*
3. Quem abrir o link já fica conectado naquele celular — não precisa digitar nada.
4. Se o link não abrir em algum aparelho: mande o **código** (botão *Copiar código*); a
   pessoa cola na tela de login em **“Conectar este aparelho ao banco da empresa”**.

> No **Caminho A** (chaves no Netlify) isso nem é necessário: todo aparelho que abrir o
> site já nasce conectado. O link serve para o **Caminho B**.

### 4.3 Testar antes de divulgar

- [ ] Na tela inicial aparecem **ANDREIA**, **JESSICA** e **RAISSA** e tocar num nome entra
      direto sem pedir senha
- [ ] Criou um **pedido de teste** no computador → ele apareceu no celular (e vice-versa)
- [ ] Anexou um **arquivo de arte** no pedido (testa o espaço das artes)
- [ ] Entrou tocando no nome de uma vendedora (aba anônima) e ela viu **só** os pedidos dela
- [ ] **Apagou** o pedido de teste

### 4.4 Mensagem pronta para o grupo

> *Oi, meninas! O sistema novo de pedidos está no ar 👇*
> *Link: (colocar aqui)*
> *Abra o link uma vez para conectar o seu celular.*
> *Para entrar é só tocar no seu nome na tela inicial (não precisa de senha).*
> *Para trocar de pessoa: canto direito → Meu perfil → Sair do sistema.*

---

## Parte 5 — Conferência final

- [ ] **PR #5 aprovado** e a `main` com a versão **1.2.0** (Parte 0)
- [ ] SQL rodou com **“Success. No rows returned”** (Parte 1.2)
- [ ] Projeto do Supabase na região **São Paulo**, senha do banco guardada (Parte 1.1)
- [ ] Site no ar e **reivindicado (Claim)** na sua conta do Netlify (Parte 2)
- [ ] Tela de login mostra **“Dados e contas no banco da empresa (Supabase)”** ou
      *Configurações → Nuvem* mostra **“Banco na nuvem conectado”**
- [ ] Seu acesso de **proprietário** criado com **senha forte** + ícone salvo no celular
- [ ] Segundo proprietário criado, se for o caso (Parte 3C)
- [ ] **JESSICA, RAISSA e ANDREIA** aparecendo na tela inicial (“Quem está usando?”)
- [ ] **Comissões** e **preços do metro** conferidos em *Configurações*
- [ ] **Logo da empresa** enviado em *Configurações → Empresa*
- [ ] **Nenhum dado de exemplo** no sistema (sem a faixa amarela “não são reais”).
      Se treinou com exemplos: *Configurações → Dados → Apagar todos os dados*
- [ ] Teste de pedido entre computador e celular funcionou (Parte 4.3)
- [ ] *Configurações → Dados → **Baixar backup*** funcionou (guarde o arquivo)
- [ ] Versão **1.2.0** aparecendo no rodapé da tela de login

---

## Parte 6 — Rotina depois do lançamento

| Quando | O que fazer |
| --- | --- |
| **Toda semana** | *Configurações → Dados → Baixar backup* (o plano grátis do Supabase **não** faz backup automático) |
| **Atualização do sistema** | Caminho A: automático (enviou para a `main`, o Netlify publica). Caminho B: `npm run publicar` + arrastar a pasta de novo |
| **Mudou o banco?** | *Configurações → Nuvem → Copiar o SQL* → SQL Editor → **Run**. Só completa o molde, nunca apaga nada |
| **Alguém esqueceu a senha** | *Equipe → Vínculo e senha → Redefinir senha* |
| **VOCÊ esqueceu a senha** | [`app/DEPLOY.md`](app/DEPLOY.md) → seção **“Esqueci a senha”** (uma linha de SQL resolve) |
| **1 semana sem usar o sistema** | O banco grátis “dorme”: <https://supabase.com/dashboard> → projeto → **Restore project**. Nada se perde |
| **Endereço administrativo vazou** | Trocamos por outro (uma linha de código) |
| **Saiu alguém da equipe** | *Equipe → **Desativar*** (mantém o histórico) — melhor que excluir |

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
| Tela em branco ao abrir o `index.html` com 2 cliques | normal: esse arquivo é para **hospedar** | use o **`Altoprints.html`** (arquivo único) ou o site no ar |
| “Sem espaço” / nada é salvo | janela **anônima** ou armazenamento cheio | abra numa janela normal; *Configurações → Dados → Liberar espaço* |
| O Netlify mostra o site **antigo** | deploy da `main` sem o merge | Parte 0 (merge do PR #5) → *Deploys → Trigger deploy* |
| O deploy do Netlify **falhou** | o guarda de publicação barrou algo | leia o log: ele diz exatamente o que encontrou |
| Quer trocar de projeto do Supabase | — | *Configurações → Nuvem → Desconectar* e conecte com os dados novos |

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
npm run publicar    # gera a pasta publicar/ + Altoprints.html + confere o pacote
npm run checar      # só a conferência (pode ir para o ar?) — aceita a pasta: npm run checar dist
```
