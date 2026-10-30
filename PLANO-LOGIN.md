# Acesso do sistema — modelo atual (versão 1.4.0)

> Este documento substitui o plano antigo de "login para todo mundo". O que vale hoje é o
> que está descrito aqui e implementado em `app/src/lib/auth.tsx`.

---

## 1. Resumo

- **Só o proprietário tem login** (usuário + senha).
- **Funcionário não tem conta nem senha.** Ele usa o sistema direto e, na hora de registrar
  uma fila, **escolhe o próprio nome** na lista de funcionários. É esse nome que vai para o
  cartão do pedido, para o relatório e para a comissão.
- **Só o proprietário cadastra funcionários.** Os já existentes (**JESSICA**, **RAISSA**,
  **ANDREIA**) vêm prontos na primeira abertura.
- O login fica num cantinho do topo chamado **“Login proprietário”**. Na primeira vez ele
  **cria** o acesso (nome, usuário e senha) e já entra com todos os recursos de dono.
- Backup exportado é **importável** em qualquer aparelho e, com a nuvem conectada, **toda
  mudança chega a todos os computadores**.

---

## 2. O que cada pessoa vê

| Quem | Login | Telas |
| --- | --- | --- |
| **Equipe (funcionários)** | nenhum | Pedidos (as filas) e Clientes. No cabeçalho aparece o botão “Login proprietário” |
| **Proprietário** | usuário + senha | Tudo: Painel, Pedidos, Clientes, Relatório, Cliente especial, Configurações e Funcionários e acessos |

Sem o login do dono, as rotas de gestão (`/relatorio`, `/relatorio-cliente-especial`,
`/equipe`, `/configuracoes`) mostram um aviso com o atalho para o login — nada de dados.

---

## 3. Como o proprietário entra

| Forma | Como |
| --- | --- |
| Cantinho do topo | botão **“Login proprietário”** em qualquer tela |
| Endereço | `…/#/administracao` (dá para salvar como ícone na tela de início) |
| 5 toques no logo | 5 cliques/toques seguidos |
| Teclado | `Ctrl + Alt + D` |

- **Primeira vez:** a tela mostra *“Criar o acesso do proprietário”* (nome, usuário, senha e
  confirmação). Não existe usuário nem senha padrão.
- **Depois:** só *“Entrar como proprietário”*, com a opção **“manter conectado neste
  aparelho”** (30 dias; sem ela, a sessão dura 1 hora).
- **Sair:** botão de saída no topo ou *Meu perfil → Sair do modo proprietário*. O sistema
  volta ao modo equipe (ninguém fica trancado fora).

---

## 4. Regras de segurança que continuam valendo

- A senha é guardada **só como hash** (`lib/senha.ts`), nunca em texto puro.
- **5 tentativas erradas** bloqueiam o login por **5 minutos**.
- **Nunca fica sem proprietário ativo:** o último não pode ser desativado nem excluído.
- **Ninguém desativa nem exclui o próprio acesso.**
- Vários proprietários são permitidos (sócio, gerente, escritório), criados em
  *Configurações → Funcionários e acessos → Novo acesso*.

---

## 5. Funcionários (sem conta)

- Cadastro em *Configurações → Funcionários e acessos*: **só o nome**.
- Renomear mantém o histórico (pedidos, comissão e relatórios seguem o mesmo cadastro).
- **Excluir é bloqueado** quando o funcionário já tem pedidos — nesse caso, renomeie.
- O campo do pedido mostra **“Seu nome (funcionário)”** para todo mundo. O último nome
  escolhido fica lembrado no aparelho para agilizar o próximo pedido.

---

## 6. Backup e vários computadores

- *Configurações → Dados → Baixar backup* gera um `.json` completo (pedidos, clientes,
  funcionários, arquivos e acessos de proprietário).
- *Restaurar backup* aceita esse arquivo (e também backups antigos, inclusive embrulhados em
  `{ versao, dados }`). Contas de funcionário de versões antigas são descartadas; se o
  arquivo não trouxer nenhum dono, os acessos já existentes no aparelho são mantidos.
- Com o Supabase conectado, restaurar **envia** para a nuvem e os outros aparelhos recebem a
  mudança sozinhos: o sistema relê o banco a cada **15 s**, ao voltar para a aba e ao ganhar
  foco na janela.

---

## 7. O que saiu do sistema

- Tela “Quem está usando?” (entrada pelo nome) e o cadastro de funcionário pelo próprio
  funcionário no login.
- `entrarSemSenha`, `criarContaVendedor`, `criarContaComoDono`, `prepararConta`,
  `removerSenha`, `atualizarVinculo`.
- Aba **Permissões** (`permissao_vendedor`): não existe mais “o que o vendedor pode fazer”,
  porque não existe mais login de vendedor.
- Modo **“ver como funcionário”** (só fazia sentido com contas de vendedor).
- Telas **Minha área**, **Vendedores** e a antiga **tela de login**.
