# Passo a passo do Supabase (banco na nuvem) — sem errar

> **Para que serve:** hoje o sistema salva os dados **no navegador de cada aparelho**
> (modo local). Com o Supabase, todos passam a ver **os mesmos pedidos**, de qualquer
> celular ou computador, e os dados ficam guardados na nuvem mesmo se alguém limpar o
> navegador.
>
> **Tempo:** cerca de 15 minutos · **Custo:** R$ 0 · **Cartão de crédito:** não é pedido.

⚠️ **Três coisas que você precisa saber antes (leia agora, é rápido):**

1. **O plano grátis pausa o banco depois de 1 semana sem uso.** No dia a dia da loja isso
   não acontece; se acontecer (ex.: férias coletivas), o site avisa e basta um clique em
   *Restore project* no painel do Supabase para voltar. Está explicado na Parte 12.
2. **Limites do grátis:** 500 MB de banco (≈ centenas de milhares de pedidos) e 1 GB de
   arquivos (artes/fotos). Para uma loja, sobra muito.
3. **O plano grátis não tem backup automático.** Por isso eu já deixei um botão
   **Baixar backup** em *Configurações → Dados* — Parte 12 explica quando usar.

---

## Parte 1 — Criar a conta no Supabase

1. Abra <https://supabase.com> e clique em **Start your project**.
2. Entre com **GitHub** (mais rápido) ou com um **e-mail e senha**. Se usar e-mail,
   confirme o link que chega na caixa de entrada.
3. Você cai no painel (uma lista de projetos, no começo vazia).

> Guarde o e-mail e a senha **da conta** do Supabase em um lugar seguro (gerenciador de
> senhas ou papel na gaveta). Sem eles ninguém administra o banco.

---

## Parte 2 — Criar o projeto (o banco)

1. Clique em **New project**.
2. Preencha:

| Campo | O que colocar |
| --- | --- |
| **Organization** | a sua (aparece sozinha) |
| **Name** | `altoprints` |
| **Database Password** | clique em **Generate a password**, depois clique em **Copy** |
| **Region** | **South America (São Paulo)** — é o mais perto do Brasil, fica mais rápido |
| **Plan** | Free |

3. **Antes de clicar em Create**, cole a senha do banco em um lugar seguro
   (gerenciador de senhas / arquivo no seu computador).

> ⚠️ Essa é a **senha do banco de dados**, não é a senha do sistema! Você quase não vai
> usá-la (o site não precisa dela). Ela só serve para acessos técnicos ao banco.
> Se perder, dá para gerar outra em *Settings → Database → Reset database password*.

4. Clique em **Create new project** e espere ~2 minutos, até aparecer o painel do projeto.

---

## Parte 3 — Criar as tabelas (o passo mais importante)

Sem isso o sistema mostra “as tabelas ainda não foram criadas”.

1. No menu da esquerda, clique em **SQL Editor**.
2. Clique em **New query** (botão no topo).
3. Abra no seu computador o arquivo **`app/supabase/schema.sql`** deste projeto
   (dá para abrir com o Bloco de Notas / TextEdit).
4. Selecione **todo o conteúdo** (Ctrl+A) → copie (Ctrl+C).
5. Cole na janela do SQL Editor do Supabase (Ctrl+V).
6. Clique em **Run** (canto inferior direito) — ou aperte **Ctrl + Enter**.
7. **O que deve aparecer:** uma mensagem verde **`Success. No rows returned`**.
   É exatamente isso que queremos (o script cria as tabelas, ele não “retorna” nada).

**Como conferir que deu certo:** clique em **Table Editor** no menu da esquerda. Você deve
ver as tabelas: `vendedores`, `clientes`, `pedidos`, `arquivos`, `usuarios` e
`configuracoes`.

> 🔁 Se der algum erro, **não tem problema rodar de novo**: o script é feito para ser
> executado quantas vezes você quiser (ele não apaga dados existentes, só garante que
> tudo exista). Se aparecer erro vermelho, me mande o texto do erro.

> ℹ️ O script também cria as **regras de acesso (RLS)** e as **permissões das artes**.
> É tudo automático nesse mesmo arquivo.

---

## Parte 4 — Criar o espaço das artes (Storage)

1. No menu da esquerda, clique em **Storage**.
2. Clique em **New bucket**.
3. Nome: **`artes`** — exatamente assim, tudo minúsculo. (O sistema procura esse nome.)
4. Ligue a chave **Public bucket** (sim, tem que ser público: é assim que as artes
   aparecem nas telas).
5. Clique em **Create bucket** (ou *Save*).

**Como conferir:** a lista de Storage deve mostrar um bucket chamado `artes` escrito
“Public”.

> Se você pular esta parte, o sistema funciona, mas dará erro ao enviar arquivos de arte
> (“Falha ao enviar o arquivo”), porque o bucket não existe.

---

## Parte 5 — Copiar as duas informações do projeto

São só duas: a **URL** e a **chave pública**.

1. Clique no botão **Connect** (fica no topo do painel do projeto). A janela mostra a
   **Project URL** e a chave pública — já prontas para copiar.
2. Se preferir ver tudo separado: **Settings (engrenagem) → API Keys**.
   - **Project URL**: algo como `https://abcdefghijklm.supabase.co`
   - **Chave pública**:
     - projetos novos mostram **`sb_publishable_...`** (chave “publishable”, a atual);
     - projetos antigos mostram **`anon`** (uma sequência longa que começa com `eyJ`).
     - **As duas funcionam no sistema** — ele aceita tanto o nome novo quanto o antigo.

> 🚫 **NUNCA copie a chave `secret` (`sb_secret_...`) nem a `service_role`.** Essa chave dá
> acesso total ao banco e não pode ficar no site. O sistema foi feito para recusar essa
> chave: se ela for colada por engano, ele não conecta e avisa no console do navegador.
> Guarde a chave pública à vontade — ela é feita para ficar no site (o que decide o que
> cada pessoa vê são as permissões e o login do sistema).

---

## Parte 6 — Ligar o sistema no banco (arquivo `.env`)

1. Na pasta **`app/`** do projeto, crie um arquivo chamado exatamente **`.env`**
   (com o ponto na frente, sem `.txt` no fim).
   - No Windows, no Bloco de Notas: *Arquivo → Salvar como* → em “Tipo” escolha
     **Todos os arquivos** → nome `".env"` (com aspas, para ele não virar `.env.txt`).
2. Cole dentro dele estas duas linhas, trocando pelos seus valores:

```
VITE_SUPABASE_URL=https://abcdefghijklm.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
```

Regras para não errar:
- **Sem aspas**, sem espaços antes ou depois do `=`, sem ponto e vírgula no fim.
- Sem barra `/` no fim da URL (`...supabase.co`, nunca `...supabase.co/`).
- Se o seu projeto mostrar a chave **anon**, use a linha com o nome antigo:

```
VITE_SUPABASE_ANON_KEY=eyJhbGciOi... (a chave longa)
```

> 🔒 O `.env` **não vai para o GitHub** (já está no `.gitignore`). Ele fica só no seu
> computador e nas variáveis do Netlify.

---

## Parte 7 — Testar no seu computador (antes de publicar)

1. Na pasta `app`, rode:
   ```bash
   npm run dev
   ```
2. Abra o endereço que aparece (ex.: <http://localhost:8080>).
3. Na tela de login, olhe o aviso embaixo do cartão:
   - **“Contas validadas no Supabase (seguro)”** → está na nuvem ✅
   - **“Modo local: as contas ficam neste navegador”** → o `.env` não foi lido ❌
4. Outra forma de conferir: entre como proprietário e vá em **Configurações → Empresa**.
   Deve estar escrito **“Banco na nuvem (Supabase) conectado”**.

Se apareceu “modo local”: feche o terminal, confira o nome e o conteúdo do `.env`
(Parte 6) e rode `npm run dev` de novo.

> Teste de verdade: crie um pedido de teste aqui, abra o sistema no celular (mesma rede,
> ou depois de publicado) e veja se o pedido aparece. Se aparecer nos dois, a nuvem está
> funcionando.

---

## Parte 8 — Publicar (pasta pronta para o Netlify)

1. Na pasta `app`, rode:
   ```bash
   npm run publicar
   ```
   Isso compila o sistema **já com as chaves do `.env`** e monta a pasta `publicar/`,
   que fica na raiz do projeto, com um `LEIA-ME.txt` dentro.
2. Abra <https://app.netlify.com/drop>.
3. **Arraste a pasta `publicar` inteira** para a área pontilhada e espere o *Deploy*.
4. Clique em **Claim site** (reivindicar) e entre/crie a conta Netlify na hora.
   Sem esse clique o Netlify pode apagar o site depois.
5. Anote o endereço que aparece (ex.: `https://nome-aleatorio.netlify.app`).
6. Para **atualizar** mais tarde: rode `npm run publicar` de novo e arraste a pasta outra
   vez em *Deploys → drag and drop*.

---

## Parte 9 — Primeiros passos depois de publicar

1. **Crie o seu acesso de proprietário** (importante: antes de mandar o link para a equipe):
   - abra `SEU-ENDERECO/#/administracao` (ou toque 5 vezes no logo), escolha o nome, o
     usuário e uma **senha forte** (diferente da dos funcionários);
   - dica: no celular, abra esse endereço e use *“Adicionar à tela de início”* — vira um
     ícone e o acesso fica em 1 toque.
2. **Confira as comissões**: *Configurações → Comissões* (a tabela oficial já vem
   preenchida: 4% / 3,5% / 3% / 2,5% / 2% / 1,5%).
3. **Suba o logo**: *Configurações → Empresa*.
4. **Crie as contas da equipe**: *Equipe → Nova conta* (nome, usuário, a senha que a
   pessoa escolheu e o vínculo com o vendedor). Cada uma já entra vendo o histórico dela.
5. **Teste a divisão de perfis**: abra uma aba anônima no celular, entre com uma conta de
   vendedor e confira que ela vê só os pedidos dela.

> Se você carregou dados de demonstração para treinar: *Configurações → Dados →
> **Apagar todos os dados***. O seu acesso de proprietário é mantido (você não fica
> trancado fora) — as contas da equipe e os pedidos de exemplo são apagados.

---

## Parte 10 — Verificação final (checklist)

Faça nesta ordem e vá marcando:

- [ ] SQL Editor mostrou `Success. No rows returned`
- [ ] Table Editor mostra as 6 tabelas (`pedidos`, `clientes`, `vendedores`, `arquivos`, `usuarios`, `configuracoes`)
- [ ] Storage tem o bucket `artes` marcado como **Public**
- [ ] Existe o arquivo `app/.env` com a URL e a chave **pública** (nunca a secret)
- [ ] Login mostra **“Contas validadas no Supabase (seguro)”**
- [ ] Criou o acesso do proprietário pela porta administrativa
- [ ] Criou **um pedido de teste**, abriu no **celular** e o pedido estava lá (nuvem ok)
- [ ] Enviou um arquivo de arte no pedido (testa o bucket `artes`)
- [ ] Criou **uma conta de vendedor** e ela viu apenas os pedidos dela
- [ ] Baixou um **backup** em *Configurações → Dados* e guardou o arquivo
- [ ] Apagou o pedido e a conta de teste

---

## Parte 11 — Segurança (o que é normal e o que não é)

| Informação | Pode aparecer no site? | Por quê |
| --- | --- | --- |
| **URL do projeto** | ✅ sim | é só o endereço do banco |
| **Chave pública** (`sb_publishable_` ou `anon`) | ✅ sim | é feita para ficar no site; o que protege são as permissões |
| **Chave secret** (`sb_secret_` / `service_role`) | 🚫 **nunca** | dá acesso total ao banco, ignora todas as permissões |
| **Senha do banco** | 🚫 nunca | só serve para acessos técnicos |
| **Senhas dos usuários** | — | ficam guardadas só como “impressão digital” (hash) |

Cuidados do dia a dia:
- **Senha forte para o proprietário** — é ela que separa você dos funcionários.
- **Não mande o endereço `#/administracao` no grupo.** O uso normal do seu chefe é a tela
  comum de login (que também dá acesso de proprietário com a senha dele). A porta
  administrativa existe para **criar** o primeiro acesso e como atalho pessoal.
- **Não divulgue o link do sistema** fora da equipe. O sistema é interno; as regras de
  acesso do banco foram feitas para esse cenário (uso interno com login próprio). Proteção
  “de banco trancado” (Supabase Auth + RLS por usuário) existe, mas é uma etapa técnica
  futura — o sistema não muda, é só configuração.
- **Nunca** cole a chave secret em `.env`, no Netlify ou em conversa.

---

## Parte 12 — Manutenção

**Backup (importante, porque o grátis não tem automático)**
- *Configurações → Dados → **Baixar backup*** → guarda um arquivo `.json` com tudo
  (pedidos, clientes, vendedores, contas e configurações).
- Faça isso **uma vez por semana**, ou antes de mexer em algo grande. Pode guardar no
  Google Drive / no seu computador.
- Para voltar atrás: **Restaurar backup** → escolhe o arquivo. (Ele substitui os dados
  atuais pelos do arquivo.)

**Projeto pausado por falta de uso (plano grátis)**
- Acontece depois de **1 semana sem nenhum acesso**. O site mostra uma mensagem
  explicando que não conseguiu falar com o banco.
- Solução: abra <https://supabase.com/dashboard>, entre no projeto `altoprints` e clique
  em **Restore project**. Em ~1 minuto volta a funcionar, sem perder nada.

**Limites do grátis:** 500 MB de banco · 1 GB de arquivos · 5 GB de tráfego/mês ·
2 projetos ativos. Na prática: os pedidos são levinhos; os arquivos de arte são o que
ocupa espaço. Se o Storage encher, o caminho é apagar artes antigas (nos pedidos) ou
passar para o Pro (US$ 25/mês, que também tira a pausa e liga backup diário).

**Quando faz sentido o Pro:** se a loja ficar uma semana ou mais sem usar o sistema e isso
virar problema, ou se os arquivos passarem de 1 GB.

---

## Parte 13 — Problemas comuns (e a solução)

| O que aparece | O que é | Como resolver |
| --- | --- | --- |
| “as tabelas ainda não foram criadas no Supabase” | faltou rodar o SQL | Parte 3 (SQL Editor → colar `schema.sql` → Run) |
| “não foi possível falar com o banco na nuvem” | internet caiu **ou** o projeto está pausado | confira a internet; se estiver ok, restaure o projeto (Parte 12) |
| “a chave do Supabase parece inválida” | chave errada/vazia ou secret no lugar da pública | refaça a Parte 5 e 6 (use `publishable` ou `anon`) |
| Login mostra “Modo local…” | o `.env` não existe, está na pasta errada ou tem erro de digitação | o arquivo tem que ser `app/.env`; rode `npm run dev` de novo |
| “Falha ao enviar o arquivo” | bucket `artes` não criado | Parte 4 |
| O site publicado não vê os dados, mas o local vê | a pasta foi gerada antes de criar o `.env` | rode `npm run publicar` de novo e arraste a pasta |
| Esqueci a senha do proprietário | — | *Equipe → Vínculo e senha → Redefinir a senha* (se for a sua, veja `DEPLOY.md` → “Esqueci a senha (login)”) |
| Quero trocar a chave (vazou ou troquei o projeto) | — | *Settings → API Keys* no Supabase, copie a nova, atualize o `.env` e rode `npm run publicar` |

---

## Parte 14 — Se quiser voltar ao modo local

1. Renomeie ou apague o arquivo `app/.env` (ou só as duas linhas dentro dele).
2. Rode `npm run publicar` de novo e arraste a pasta no Netlify.

O sistema volta a guardar os dados no navegador de cada aparelho. **Os dados que já estão
na nuvem continuam no Supabase** (nada é apagado) — e, se você religar o `.env` depois,
eles voltam a aparecer.

> Para apagar o banco de vez: painel do Supabase → *Project Settings → General → Delete
> project*. Só faça isso depois de ter um backup baixado.
