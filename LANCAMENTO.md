# 🚀 Colocar o Altoprints no ar — guia curto

Este é o passo a passo **do lançamento**. Ele resume o que fazer, na ordem, sem parte
técnica. (Os detalhes completos ficam em [`app/DEPLOY.md`](app/DEPLOY.md) e a conexão do
banco na nuvem em [`app/CONECTAR-NUVEM.md`](app/CONECTAR-NUVEM.md).)

**Tempo total:** ~10 minutos para o site entrar no ar · +8 minutos quando quiser a equipe
toda vendo os mesmos pedidos.

---

## O que já está pronto (não precisa fazer nada)

| Item | Situação |
| --- | --- |
| **Dados** | O sistema começa **vazio, do zero**. Nenhum pedido, cliente, vendedor ou impressão de exemplo é carregado sozinho. |
| **Acessos** | **Não existe usuário nem senha padrão.** O primeiro acesso de proprietário é criado por você, na hora, com a senha que você escolher. |
| **Dados de treino** | Existem, mas são **opcionais e fictícios** (`CLIENTE EXEMPLO 01`, telefone `(00) 90000-0001`). Só entram se você pedir em *Configurações → Dados → Carregar demonstração*, e a tela fica com um aviso amarelo “dados de exemplo — não são reais” até você apagar. |
| **Pacote para publicar** | A pasta [`publicar/`](publicar) já vem pronta e **conferida**: um robô (`npm run checar`) impede que o pacote saia com senha de exemplo, dado de pessoa real ou chave secreta do banco. |
| **Testes** | Todos passando (regras de preço/comissão, login e todas as telas). |

---

## Etapa 1 — Publicar o site (5 minutos, grátis)

O jeito mais rápido é o **Netlify Drop**: arrastar a pasta pronta.

1. Baixe/tenha em mãos a pasta **`publicar`** deste repositório.
   - Gerou mudanças depois? Rode `cd app && npm run publicar` que ela é refeita sozinha
     (e conferida de novo).
   - Prefere não instalar nada? Na aba **Actions** do GitHub, abra a última execução e
     baixe o artefato **`Altoprints-pronto-para-publicar`** — a pasta `publicar/` está lá dentro.
2. Abra **<https://app.netlify.com/drop>**.
3. **Arraste a pasta `publicar` inteira** para a área pontilhada.
4. Espere o *Deploy* terminar e clique em **Claim site** (reivindicar) → crie a conta
   grátis na hora. ⚠️ Sem esse clique o Netlify **apaga** o site depois de um tempo.
5. O endereço aparece no topo (algo como `https://nome-aleatorio.netlify.app`).
   Dá para trocar em *Site configuration → Change site name* (ex.: `altoprints-sistema`).

> **Quer que atualize sozinho?** Conecte o Netlify ao GitHub (10 minutos): *Add new site →
> Import an existing project → GitHub*. O arquivo [`netlify.toml`](netlify.toml) já deixa
> tudo configurado — a partir daí, cada alteração enviada ao repositório publica o sistema
> sem você fazer nada. Passo a passo: [`app/DEPLOY.md`](app/DEPLOY.md), opção **B1**.

---

## Etapa 2 — Criar o seu acesso de proprietário (2 minutos)

Faça isso **antes** de mandar o link para a equipe.

1. Abra o endereço do sistema acrescentando **`/#/administracao`** no fim
   (ex.: `https://altoprints-sistema.netlify.app/#/administracao`).
   - Outras formas de abrir a mesma porta: **5 toques seguidos no logo** ou
     **Ctrl + Alt + D** no computador.
2. Como ainda não existe nenhum dono, a tela mostra **“Criar acesso do proprietário”**:
   digite o seu nome, escolha o usuário e uma **senha forte** (guarde-a bem — ela é a
   tranca do sistema).
3. **Salve o endereço como ícone na tela de início do celular**: entra com 1 toque.

### Mais acessos de proprietário (sócio, gerente, escritório)

Pode ter quantos quiser: **Equipe → Nova conta → Tipo de acesso: “Proprietário — vê tudo”**.
O atalho também aparece em **Configurações → Meu acesso → Outro acesso de proprietário**.
O sistema só não permite ficar **sem nenhum** proprietário ativo — por isso o último não
pode ser desativado nem excluído.

### Contas da equipe

- **Você cria:** *Equipe → Nova conta* (nome, usuário, a senha que a pessoa combinou com
  você e o vínculo com o vendedor).
- **Ou cada um cria:** na tela de entrada, em *“Criar meu acesso”*.
- Permissões e telas liberadas: *Configurações → Permissões* e *Equipe → Vínculo e senha*.

---

## Etapa 3 — Nuvem: a equipe toda vendo os mesmos pedidos (8 minutos)

⚠️ **Importante:** sem este passo, o sistema está no ar mas **cada aparelho guarda os
próprios dados** — o celular do vendedor não enxerga os pedidos lançados no computador.
Para trabalhar em equipe, conecte o banco na nuvem (Supabase, grátis):

1. Entre como proprietário → **Configurações → Nuvem**.
2. Siga o assistente: ele te guia para criar o projeto no Supabase, tem o botão
   **“Copiar o SQL”** (é só colar no SQL Editor do Supabase e dar *Run*) e o campo para
   colar a URL e a chave pública.
3. Clique em **Conectar à nuvem** → deve aparecer “Banco na nuvem conectado”.
4. Clique em **Copiar link** e mande no grupo da equipe: quem abrir o link uma vez já
   fica conectado naquele aparelho.

Guia detalhado, com o que fazer se algo der errado: **[`app/CONECTAR-NUVEM.md`](app/CONECTAR-NUVEM.md)**.

> 🔐 Use sempre a chave **pública** (`sb_publishable_...` ou a antiga `anon`). A chave
> **secreta** (`sb_secret_...`) nunca vai para o site — o sistema se recusa a conectar com
> ela, e o robô de publicação também barra.

---

## Checklist final antes de divulgar o link

- [ ] Site no ar e o endereço já foi **reivindicado (Claim)** na conta do Netlify
- [ ] Acesso do **proprietário** criado com **senha forte** (e o ícone salvo no celular)
- [ ] Segundo proprietário criado, se for o caso (sócio/gerente/escritório)
- [ ] Contas da equipe criadas e ligadas ao vendedor certo (*Equipe* mostra quantos
      pedidos cada conta vê)
- [ ] **Comissões** e **preços do metro** conferidos em *Configurações*
- [ ] **Logo da empresa** enviado em *Configurações → Empresa*
- [ ] Se treinou com os exemplos: *Configurações → Dados → **Apagar todos os dados***
      (o aviso amarelo “dados de exemplo” some junto)
- [ ] **Nuvem conectada** (ou, se ainda não, você sabe que cada aparelho tem os próprios dados)
- [ ] Testou no celular de um vendedor: pedidos, metragem e comissão certos
- [ ] *Configurações → Dados → **Baixar backup*** funcionou (guarde o arquivo)

**Mensagem pronta para o grupo:**

> *Oi, gente! O sistema novo de pedidos está no ar 👇*
> *Link: (colocar aqui)*
> *Você entra com o usuário e a senha que combinamos comigo.*
> *Para trocar a senha: canto direito → Meu perfil → Trocar minha senha.*
> *Funcionário novo: toque em “Criar meu acesso” e crie o seu.*

---

## Rotina depois do lançamento

| Quando | O que fazer |
| --- | --- |
| Toda semana | *Configurações → Dados → Baixar backup* (o plano grátis do Supabase não faz backup automático) |
| Quando o sistema for atualizado | Com o Netlify ligado ao GitHub: automático. No modo Drop: `npm run publicar` e arraste a pasta de novo |
| Se alguém esquecer a senha | *Equipe → Vínculo e senha → Redefinir senha* |
| Se **você** esquecer a senha | [`app/DEPLOY.md`](app/DEPLOY.md) → “Esqueci a senha” |
| Se o endereço administrativo vazar | Trocamos por outro (uma linha de código) |
| 1 semana sem usar o sistema | O banco grátis “dorme”: abra o painel do Supabase e clique em *Restore project* |

---

## Se você já tinha aberto uma versão anterior do sistema

Versões antigas carregavam **dados de exemplo sozinhos** e traziam um acesso pronto de
proprietário (usuário `gui`, senha `12345`). Isso **não existe mais** nesta versão — mas,
se algum aparelho seu já tinha aberto o sistema antes, os dados antigos continuam **naquele
aparelho** (e no banco, se você já tinha conectado a nuvem). Para começar do zero:

1. Abra o sistema no aparelho em questão e entre (ou use o acesso antigo).
2. **Configurações → Dados → Apagar todos os dados** — apaga pedidos, clientes,
   vendedores, impressões **e as contas da equipe**; o seu acesso é mantido para você não
   ficar trancado fora.
3. Se quiser apagar também o seu acesso antigo (inclusive o `gui`), use o bloco
   **“Começar limpo neste aparelho”** na mesma tela: ele baixa um backup antes e limpa tudo
   o que o sistema guardou naquele navegador.
4. Se já tinha conectado o Supabase: rode o passo 2 com a nuvem conectada (assim o banco é
   limpo para todos) — e confira em *Equipe* se sobrou alguma conta que não devia.

> Depois disso, crie o acesso do proprietário novo (Etapa 2) com uma **senha forte**.

---

## Comandos úteis (para quem mexe no código)

```bash
cd app
npm install         # instala as dependências (só na primeira vez)
npm run dev         # abre o sistema no computador para desenvolver (http://localhost:8080)
npm run testar      # roda todos os testes
npm run publicar    # gera a pasta publicar/ + o arquivo único + confere o pacote
npm run checar      # só a conferência do pacote (pode ir para o ar?)
```

> No `npm run dev` o sistema abre já logado (conta temporária de desenvolvimento, criada
> só nesse modo, com senha aleatória). **Na versão publicada isso não existe**: ela sempre
> pede login.
