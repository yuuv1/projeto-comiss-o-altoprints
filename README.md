# Altoprints — Sistema de Pedidos DTF

Sistema web (em português do Brasil) para gerenciar a produção de filmes DTF:
pedidos, clientes, vendedores, impressão, entregas e relatórios de comissão.

🌐 **Site no ar (GitHub Pages):** <https://yuuv1.github.io/projeto-comiss-o-altoprints/> —
atualiza sozinho a cada envio na `main` (o robô roda testes, build e conferência de
segurança antes de publicar).

Recriado a partir do prompt `ultra-prompt-altoprints.md` e do comportamento observado
no sistema antigo (artastic-printflow.lovable.app): mesma navegação em "pílulas",
mesmos cartões de resumo, as mesmas etiquetas de status, os mesmos cálculos de preço
por metragem e os mesmos relatórios prontos para a contabilidade.

> 🚀 **Quer colocar no ar agora?** Siga o **[LANCAMENTO.md](LANCAMENTO.md)** — é o guia
> curto (10 minutos) com a ordem certa: publicar, criar o acesso do dono (senha), cadastrar
> os funcionários e conectar a nuvem.

---

## Como rodar

```bash
cd app
npm install
npm run dev      # abre em http://localhost:8080
```

### Quer só abrir o sistema para ver e usar? (sem instalar nada)

Rode `npm run publicar` e clique **duas vezes** em **`publicar/Altoprints.html`**.
É um arquivo único (programa + visual embutidos) que abre no navegador já funcionando,
sem internet e sem instalar nada — os dados ficam salvos nesse computador.

> **O sistema começa vazio, do zero:** nenhum pedido, cliente ou conta vem pronto e
> **não existe usuário nem senha padrão**. A equipe (JESSICA, RAISSA, ANDREIA) já vem como
> lista de nomes, **sem login**: cada um escolhe o próprio nome ao registrar uma fila. O
> acesso do **proprietário** (único com senha) é criado em *“Login proprietário”*, no canto
> do topo (ou em `#/administracao`, 5 toques no logo, `Ctrl + Alt + D`).
>
> **Dados de exemplo** são opcionais e **fictícios** (`CLIENTE EXEMPLO 01`, telefone
> `(00) 90000-0001`): entram só quando o proprietário pede em *Configurações → Dados →
> Carregar demonstração*, e a tela fica com um aviso amarelo *“dados de exemplo — não são
> reais”* até serem apagados. Eles não criam nenhuma conta de acesso.

> ⚠️ **Não abra o `publicar/index.html` com dois cliques** — a tela fica em branco. Esse
> arquivo serve para **hospedar** (ele busca o programa na pasta `assets/`, e o navegador
> bloqueia esse carregamento quando o arquivo é aberto direto do disco). Detalhes em
> [`app/DEPLOY.md`](app/DEPLOY.md).

Outros comandos:

| Comando | O que faz |
| --- | --- |
| `npm run dev` | abre o sistema no seu computador (desenvolvimento, atualiza ao salvar) |
| `npm run build` | gera a versão final na pasta `dist/` |
| `npm run preview` | testa a versão final |
| `npm run testar` | roda os testes das regras (preço, comissão, senha) e das telas |
| `npm run publicar` | monta a pasta `publicar/` (site pronto) + o arquivo `Altoprints.html` |
| `npm run checar` | confere se o pacote pode ir para o ar (sem senha de exemplo, dado real ou chave secreta) |

---

## Telas do sistema

> **Versão atual: 1.4.0** — o número aparece no rodapé do sistema (e na tela de login do dono).
> Se o aparelho mostrar um número menor, ele está com uma versão antiga em cache: recarregue.

| Tela | Rota | Para que serve |
| --- | --- | --- |
| **Painel** (dono) | `/` | Resumo de hoje, atalhos grandes, checklist de primeiros passos, desempenho por funcionário, comissão por faixa e a equipe em tabela |
| **Início da equipe** | `/` | Sem login, cai direto em **Pedidos** (não existe mais “Minha área”) |
| **Pedidos** | `/pedidos` | As filas de impressão com quatro filtros (Em andamento, A pagar, Concluídas, Entregues) e os selos clicáveis no cartão. Aceita `?filtro=` e `?vendedor=` |
| **Clientes** | `/clientes` | Cadastro, vendedor responsável, ★ cliente especial, valor especial do metro e a aba **Especiais** |
| **Relatório** | `/relatorio` | Resumo por funcionário, comissão pelas faixas de metragem, CSV e impressão em A4 (só o dono) |
| **Cliente especial** | `/relatorio-cliente-especial` | Extrato do cliente especial (pagos e pendentes) em A4 (só o dono) |
| **Configurações** | `/configuracoes` | 10 abas: Comissões, Preços, **Funcionários e acessos**, Empresa, Comprovantes (IA), Dados, Nuvem, Meu acesso e Aparência. Aceita `?aba=` |
| **Login proprietário** | `/administracao` | Criar o primeiro acesso de dono (com senha) e, depois, só entrar/sair |

Extras: **busca rápida em tudo com `Ctrl + K`** (pedido, cliente, telefone, cidade,
rastreio e funcionário), **Janela de revisão a cada 3 dias** (o que está fora de "concluído
e pago"), **Importar comprovante** (a IA lê a foto e preenche o pedido) e **tema
claro/escuro** (botão no cabeçalho, cada pessoa escolhe o seu).

---

## Comissão por faixas de metragem (configurável)

A comissão de cada pedido é calculada pela **metragem do pedido**: o percentual da faixa
em que ele cai é aplicado sobre o valor do pedido. Vale apenas para pedidos com
pagamento confirmado.

Tabela oficial (toda editável pelo proprietário):

| Metragem | Comissão |
| --- | --- |
| 1 a 5 m | 4% |
| 5 a 10 m | 3,5% |
| 10 a 20 m | 3% |
| 20 a 50 m | 2,5% |
| 50 a 100 m | 2% |
| acima de 100 m | 1,5% |
| sem metragem informada | 0% (editável) |

> Cada faixa vale de `de` até **antes** de `ate` — ou seja, um pedido de 5 m entra na faixa
> "5 a 10 m".

Onde alterar: **Configurações → Comissões** (só o proprietário entra lá). A tela tem uma
**prévia ao vivo** que mostra, com os pedidos pagos do mês, quantos pedidos caem em cada
faixa e quanto sai de comissão — antes mesmo de salvar — e um botão **"Usar tabela oficial"**
para restaurar os valores acima.

Em **Configurações → Meu acesso** (ou no cartão do topo) o proprietário troca o próprio
usuário, o nome e a senha.

---

## Acesso: só o proprietário tem login

A equipe **usa o sistema sem login**. Ao registrar uma fila (pedido), a própria pessoa
escolhe o nome dela na lista de funcionários, e é esse nome que aparece no cartão, no
relatório e na comissão. O sistema já lembra no aparelho o último nome escolhido.

O **proprietário** é a única pessoa com usuário e senha. O login fica num cantinho do topo
chamado **“Login proprietário”** e, na primeira vez, é ali que ele **cria o acesso**
(nome, usuário e senha). Depois de entrar, ele ganha todos os recursos de dono:

| Recurso | Onde |
| --- | --- |
| Painel do proprietário | `/` (o topo passa a mostrar “Painel”) |
| Relatórios, comissões e cliente especial | `/relatorio`, `/relatorio-cliente-especial` |
| Cadastro de funcionários | *Configurações → Funcionários e acessos* |
| Configurações (preços, comissões, IA, dados, nuvem) | engrenagem no topo |

Para sair, o botão de saída no topo (ou *Meu perfil → Sair do modo proprietário*) devolve o
sistema ao modo equipe. **Sem o login do dono, a equipe continua trabalhando normalmente** —
só não vê as telas de gestão.

### Como abrir o “Login proprietário”

| Forma | Como |
| --- | --- |
| Cantinho do topo | botão **“Login proprietário”** no cabeçalho, em qualquer tela |
| Endereço | `…/#/administracao` (salve como ícone na tela de início do celular: entra com 1 toque) |
| 5 toques no logo | toque/clique 5 vezes seguidas no logo |
| Teclado | `Ctrl + Alt + D` |

Na primeira vez a tela pede para **criar o acesso do proprietário**; depois disso só pede
usuário e senha. Quem abrir o endereço sem a senha não encontra dados: apenas o formulário.

- **Funcionários** (só o dono cadastra): nome e mais nada — não existe conta, senha ou
  permissão por pessoa. Quem já tem pedidos no histórico não pode ser excluído (para não
  perder comissão já lançada); use **Renomear**.
- **Vários proprietários:** em *Funcionários e acessos → Novo acesso de proprietário*
  (sócio, gerente, escritório) — o sistema aceita quantos quiser, mas **nunca fica sem
  nenhum** proprietário ativo: o último não pode ser desativado nem excluído, e ninguém
  apaga o próprio acesso.
- **Senhas** nunca ficam em texto puro: guardamos só um hash (impressão digital).
  Depois de 5 tentativas erradas o acesso fica bloqueado por 5 minutos.
- **Sessão:** a opção *“manter conectado”* guarda o acesso por 30 dias (senão, 1 hora).

> A segurança é a de um **sistema interno**: as contas ficam no próprio banco do sistema
> (navegador/Supabase), não no Supabase Auth. Se um dia quiser trancar mais, é ligar o
> *Supabase Auth* e trocar as políticas do banco — o resto do sistema não muda.

---

## Backup e vários computadores

- **Baixar backup** (*Configurações → Dados*) gera um `.json` com pedidos, clientes,
  funcionários, arquivos (links) e os acessos de proprietário.
- **Restaurar backup** lê esse arquivo em qualquer aparelho — inclusive backups de versões
  antigas (as contas de funcionário que existiam antes são descartadas, porque hoje só o
  dono tem login; os acessos de dono já existentes no aparelho são mantidos se o arquivo
  não trouxer nenhum).
- Com o **Supabase conectado**, a restauração sobe para a nuvem e **todos os aparelhos
  passam a ver os mesmos dados**. Sem recarregar a página: o sistema relê o banco a cada
  15 segundos, ao voltar para a aba e ao ganhar foco na janela.

---

## Regras de preço (cálculo automático pela metragem)

| Metragem | Valor do metro |
| --- | --- |
| 1 a 4 m | R$ 59,90 |
| 5 a 19 m | R$ 54,90 |
| 20 m ou mais | R$ 44,90 |

- Se o cliente tiver **valor especial do metro**, esse valor é usado no lugar da tabela.
- O botão **Auto / Manual** alterna entre o cálculo automático e o valor digitado.
- Ao marcar o pagamento como **Pago**, a data do pagamento é preenchida com hoje.

Cada pedido é uma **fila** com um estágio (`em andamento` ou `concluído` — "saiu da
máquina") e duas marcações opcionais no cartão: **pago** e **entregue**. O relatório
conta as filas **concluídas** do período; o "pago" é orientação da equipe.

---

## Onde ficam os dados

O sistema funciona de duas formas, sem mudar nenhuma tela:

1. **Modo local (padrão)** — os dados ficam salvos no próprio navegador. Bom para
   conhecer o sistema e testar. Os arquivos de arte ficam no navegador também.
   ⚠️ Cada aparelho guarda os **próprios** dados: sem a nuvem, o celular não vê os pedidos
   do computador (dá para levar os dados de um para o outro com **Backup → Restaurar**).
2. **Modo nuvem (Supabase, grátis)** — os dados ficam num banco na nuvem e aparecem
   iguais em todos os computadores e celulares. Para ativar, veja **[app/DEPLOY.md](app/DEPLOY.md)**.

---

## Estrutura do projeto

```
app/
├── src/
│   ├── lib/            regras e dados (tipos, preços, comissão, senha, tema, banco, arquivos)
│   ├── components/     telas de apoio (menu, cartões, modais, etiquetas de status, logo)
│   ├── pages/          as telas do sistema + formulário de pedido
│   └── index.css       estilos + regras de impressão A4
├── testes/             testes das regras e das telas (npm run testar)
├── supabase/schema.sql banco na nuvem (rodar no SQL Editor do Supabase)
└── DEPLOY.md           como colocar online de graça
```

---

## Próximos passos combinados

- [x] Recriar o sistema fielmente ao antigo
- [x] Hospedagem gratuita documentada (`app/DEPLOY.md`) + robô de publicação no GitHub Pages
- [x] Tema claro/escuro
- [x] Comissão por faixas de metragem, configurável em Configurações → Comissões
- [x] **Só o proprietário tem login** (a equipe escolhe o próprio nome ao registrar a fila)
- [x] **“Login proprietário”** no topo + endereço `#/administracao`, 5 toques no logo, Ctrl+Alt+D
- [x] **Funcionários e acessos**: o dono cadastra funcionários (sem conta) e outros donos
- [x] Sistema limpo para produção: começa vazio, sem dados nem senha de exemplo
      (dados de treino opcionais e fictícios, com aviso na tela)
- [x] Vários acessos de proprietário (Funcionários e acessos → Novo acesso de proprietário)
- [x] Backup importável em qualquer aparelho + sincronização automática quando a nuvem
      estiver conectada
- [x] Guarda de publicação (`npm run checar`) + pacote `publicar/` conferido no GitHub Actions
- [x] Colocar no ar — guia curto: **[`LANCAMENTO.md`](LANCAMENTO.md)** (site:
      <https://yuuv1.github.io/projeto-comiss-o-altoprints/>)
- [x] **Painel do chefe**: resumo de hoje, atalhos grandes, checklist de primeiros passos,
      comissão por faixa e equipe em tabela
- [x] **Busca rápida (Ctrl + K)** em todo o sistema, respeitando o que cada acesso pode ver
- [x] Abrir Configurações direto numa aba (`?aba=equipe`, `?aba=nuvem`…) e explicação curta
      em cada aba
- [ ] **Conectar o Supabase** (mesmos dados para a equipe toda) — plano em
      **[`PLANO-NUVEM-E-PUBLICACAO.md`](PLANO-NUVEM-E-PUBLICACAO.md)**
- [ ] Conectar o Supabase (guia: `app/CONECTAR-NUVEM.md`) para a equipe compartilhar os dados
- [ ] Enviar o logo oficial (Configurações → Empresa)
- [ ] Ajustes finos depois de usar no dia a dia

> Observação: a equipe usa o sistema sem login (é uma loja só: todos veem os pedidos e os
> clientes). As telas de gestão ficam com o proprietário. Ainda assim, use uma **senha
> forte** — o link do sistema pode ser aberto por qualquer pessoa que o tenha.
