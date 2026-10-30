# Plano — porta do proprietário + lançamento com as contas que já existem
### versão 2 · com as decisões que você tomou

> ⚠️ **Documento histórico.** A porta administrativa (`#/administracao`, 5 toques no logo,
> `Ctrl + Alt + D`) virou o **“Login proprietário”** e o modelo de contas de funcionário
> **saiu do sistema** na versão **1.4.0**: hoje só o proprietário tem login e a equipe
> escolhe o próprio nome ao registrar a fila. O que vale está em
> **[PLANO-LOGIN.md](PLANO-LOGIN.md)**.

**Decidido:**
1. A criação do acesso do proprietário **sai** da tela comum → vai para uma **porta administrativa escondida**, que o seu chefe abre com facilidade e que exige o **acesso de administrador** para fazer qualquer coisa.
2. **Sem código de equipe** — cadastro livre para funcionário novo.
3. Quando alguém assume um nome já existente, **entra direto** (você confere depois em Equipe).
4. No lançamento, **você registra as contas das funcionárias atuais** (com a senha que cada uma escolheu na conversa com você), ligadas ao histórico antigo. Depois só avisa: "seu usuário é X, a senha é a que você pediu". Funcionário novo usa o cadastro normal.

---

## 1. Porta administrativa (a nova forma de entrar como dono)

### 1.1 Como o seu chefe abre (fácil, e separado do login dos funcionários)
Três formas, todas abrindo a **mesma tela** — quem guardar uma, entra por ela:

| Forma | Como é | Por que |
| --- | --- | --- |
| **Atalho na tela de início do celular** ⭐ | o endereço da porta administrativa salvo como ícone no celular do seu chefe (ex.: `…/#/administracao`) | **1 toque** para entrar; ninguém mais sabe que existe |
| **5 toques no logo** | tocar/clicar 5× rápido no logo, em qualquer tela | socorro quando estiver em outro aparelho |
| **Ctrl + Alt + D** | atalho de teclado no computador | rápido no PC da loja |

Endereço sugerido: **`#/administracao`** (fácil de ditar e de guardar). Se preferir algo secreto, dá para trocar por outro nome — ver pergunta no fim.

### 1.2 O que a porta administrativa mostra
- **Antes do lançamento** (ainda não existe dono): "Criar acesso do proprietário" — nome, usuário e senha. **Você faz isso sozinho, antes de mandar o link para a equipe.**
- **Depois disso**: só uma tela de **login de administrador**.
- Funcionário que descobrir a porta: vê apenas um login comum, **sem lista, sem dados, sem pista nenhuma** — e sem a senha do administrador não entra em nada (é exatamente o que você pediu). Se tentar criar outra conta de proprietário, recebe: *"O sistema já tem um proprietário cadastrado"*.
- A tela comum de entrada **não mostra nem menciona** nada de proprietário: só **Entrar** e **Criar meu acesso**.

### 1.3 Onde fica o "grude" da proteção
- Esconder a porta é o segredo do endereço; a **senha do proprietário é a tranca de verdade**. Use uma senha forte (e diferente da dos funcionários).
- Um passo extra de segurança real (trancar o banco por login) só é possível ligando o Supabase Auth + RLS — as telas não mudariam. Fica para depois, se você quiser.

---

## 2. Separação de funções (matriz final)

| Tela / ação | Vendedor | Proprietário |
| --- | --- | --- |
| Minha área (início dele) | ✅ só os pedidos dele | ➖ usa o Painel |
| Painel geral | ❌ nem aparece no menu | ✅ todos e tudo |
| Pedidos — criar | ✅ sempre no próprio nome | ✅ escolhe o vendedor |
| Pedidos — editar | ✅ conforme permissão do dono | ✅ |
| Pedidos — excluir | ✅ só com permissão "total" | ✅ |
| Pedidos — marcar pago / impresso | ✅ conforme permissão | ✅ |
| Clientes | ✅ só os dele | ✅ todos |
| Meu desempenho / Por vendedor | ✅ só o dele | ✅ todos |
| Para imprimir · Entregas | ❌ | ✅ |
| Relatório · Cliente especial | ❌ | ✅ |
| Vendedores · Equipe · Configurações | ❌ | ✅ |
| Meu perfil (trocar a própria senha) | ✅ | ✅ |

- Endereço digitado na mão → *"Esta área é do proprietário"* + botão para voltar (sem tela vazia, sem erro feio).
- Permissões do vendedor (você escolhe em *Configurações → Permissões*): **total**, **sem excluir** (padrão) ou **somente criar**.

---

## 3. Lançamento com as funcionárias que já existem (do jeito decidido)

**A ideia:** você conversa com cada uma, ela escolhe a senha, e você cria a conta dela **já ligada ao histórico antigo** — ela continua exatamente de onde parou.

Como aparece na tela (valores ilustrativos): **VENDEDORA A** · *N* pedidos · *R$ total* — **VENDEDORA B** · *N* pedidos · *R$ total*.

> Os nomes e números reais das funcionárias **não ficam neste documento nem no sistema
> publicado**: o sistema sobe vazio e os dados de treino são fictícios (`CLIENTE EXEMPLO 01`,
> `VENDEDOR EXEMPLO A`). Os vínculos de verdade são criados por você em *Equipe → Nova conta*.

### 3.1 Como você cria a conta (tela Equipe → **Nova conta**)
Uma janela com 4 campos:

| Campo | Exemplo |
| --- | --- |
| Nome da pessoa | `NOME DA PESSOA` |
| Nome de usuário | `nome.da.pessoa` |
| Senha (a que ela escolheu com você) | `••••••` |
| Vínculo — **Já trabalha aqui?** | `VENDEDORA A · N pedidos · R$ total` |

Antes de salvar, o sistema mostra: *"Esta conta vai entrar vendo **N pedidos** de VENDEDORA A (R$ total)"*. Salvo isso, você só manda para ela: **usuário e senha**.

- O nome escolhido **sai da lista pública** de cadastro (ninguém assume por cima).
- Se ela errar/esquecer a senha, você redefine na mesma tela (Equipe → Vínculo e senha).
- Funcionário **novo** entra pelo caminho normal: **Criar meu acesso → sou novo aqui** (cria um vendedor novo com o nome dele).
- Se algum nome antigo ficar sem conta e a pessoa quiser criar sozinha, continua existindo o **"Já trabalho aqui?"** no cadastro — lista só os nomes **sem conta**, com o resumo do histórico, e entra direto (decisão nº 3).

### 3.2 Ordem no dia (evita qualquer confusão)
1. Você entra pela **porta administrativa** e cria o acesso do proprietário (isso **antes** de divulgar o link).
2. Cria as contas das funcionárias atuais com as senhas que elas escolheram.
3. Testa uma conta no celular (vê os pedidos e a comissão certos?).
4. Manda o link no grupo (mensagem pronta em 4.3).
5. Funcionário novo, a partir daí: cadastro normal.

> Sem código de equipe (como você escolheu), o mais importante é a **ordem**: criar as contas das antigas antes de mandar o link. Depois disso, os nomes delas nem aparecem mais na lista.

### 3.3 Mensagem pronta para o grupo (WhatsApp)

> *Oi, gente! O sistema novo de pedidos está no ar 👇*
> *Link: (colocar aqui)*
> *Vocês já entram com o usuário e a senha que combinamos comigo — é a mesma que você pediu.*
> *Quem quiser trocar a senha: canto direito → Meu perfil → Trocar minha senha.*
> *Funcionário novo: toque em "Criar meu acesso" e crie o seu.*

---

## 4. Checklist do lançamento

**Antes (você, sozinho)** — o roteiro detalhado está em **[LANCAMENTO.md](LANCAMENTO.md)**
1. Publicar o site — Netlify ligado ao GitHub (atualiza sozinho a cada melhoria).
2. Conectar o **Supabase** — obrigatório para a equipe toda ver os mesmos pedidos (sem ele, cada aparelho teria os seus dados).
3. Criar o **acesso do proprietário** pela porta administrativa + salvar o ícone no celular.
4. Criar as contas das funcionárias atuais (item 3.1).
5. Conferir **comissões** e **permissões** em Configurações, e enviar o **logo** (Configurações → Empresa).

**No dia**
6. Mandar o link + a mensagem (3.3).
7. Conferir em **Equipe**: cada conta ligada ao vendedor certo ("esta conta vê X pedidos").
8. Cada uma abre no celular e confere "Meus pedidos" e "Meu desempenho"; você confere Painel e Relatório.

**Depois**
9. Backup de vez em quando em Configurações → Dados.
10. Se o endereço administrativo vazar, trocamos por outro (uma linha).

---

## 5. O que falta implementar (nesta ordem)

**Já implementado (desta rodada):**
- [x] **Porta administrativa** `#/administracao`: criar o primeiro acesso do proprietário (só se não existir dono) ou entrar como administrador
- [x] Gatilhos: **5 toques no logo** + **Ctrl+Alt+D**
- [x] Tela comum de login **sem nenhuma menção a proprietário** (só Entrar + Criar meu acesso)
- [x] **Equipe → Nova conta** (nome, usuário, senha, vínculo) com o aviso "esta conta vai ver X pedidos"
- [x] Cadastro "Já trabalho aqui?": lista **só os vendedores sem conta**, com resumo do histórico
- [x] Trava de **1 conta por vendedor** (com aviso claro)
- [x] Testes cobrindo a porta administrativa, a janela Nova conta, as travas e os 5 toques no logo
- [x] Decisões: endereço `#/administracao` e o dono **também** entra pela tela comum

**Feito na rodada da limpeza para o lançamento:**
- [x] **Sistema 100% vazio no primeiro acesso** — nada de dados de exemplo é semeado sozinho
- [x] **Fim do acesso de exemplo** (`gui` / `12345`): não existe mais usuário nem senha
      padrão no código, nos documentos nem no pacote publicado
- [x] **Dados de treino fictícios e opcionais** (`CLIENTE EXEMPLO 01`, telefone
      `(00) 90000-0001`), com aviso amarelo “não são reais” no topo da tela
- [x] **Vários acessos de proprietário**: *Equipe → Nova conta → “Proprietário — vê tudo”*,
      com atalho em *Configurações → Meu acesso*; o sistema nunca fica sem nenhum dono ativo
      (o último não sai, ninguém apaga o próprio acesso)
- [x] **Guarda de publicação** (`npm run checar`): o pacote só sai se não houver senha de
      exemplo, dado de pessoa real, chave secreta do Supabase ou `.env` dentro da pasta
- [x] Pasta `publicar/` regenerada já limpa (versão 1.1.0) + artefato para baixar no GitHub Actions

**Ainda falta:**
- [ ] Publicar (Netlify) — passo a passo em **[LANCAMENTO.md](LANCAMENTO.md)**
- [ ] Conectar o Supabase (a equipe só vê os mesmos pedidos com a nuvem ligada)
- [ ] Cadastro "Já trabalho aqui?": lista de vendedores já existentes **com histórico do sistema antigo** (trazer/importar) — depende da migração dos dados
- [ ] Equipe: botão **Desvincular/Liberar** explícito no modal de vínculo

---

## 6. Decisões tomadas (confirmadas por você)

1. **Endereço da porta administrativa:** `#/administracao` — o chefe salva o ícone na tela de início do celular (1 toque).
2. **A conta de proprietário também funciona na tela comum** — se o chefe digitar usuário e senha ali, entra como administrador. A porta administrativa continua existindo para **criar** o acesso e como entrada alternativa.
