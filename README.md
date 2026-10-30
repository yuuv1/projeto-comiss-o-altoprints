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
> curto (10 minutos) com a ordem certa: publicar, criar o acesso do dono, criar as contas
> da equipe e conectar a nuvem.

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
> **não existe usuário nem senha padrão**. O primeiro acesso de proprietário é criado por
> você em `#/administracao` (ou 5 toques no logo, ou `Ctrl + Alt + D`).
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

> **Versão atual: 1.3.0** — o número aparece na tela de entrada e no rodapé do sistema.
> Se o aparelho mostrar um número menor, ele está com uma versão antiga em cache: recarregue.

| Tela | Rota | Para que serve |
| --- | --- | --- |
| **Painel** (dono) | `/` | Resumo de hoje, atalhos grandes, checklist de primeiros passos, desempenho por vendedor, comissão por faixa e a equipe em tabela |
| **Minha área** (vendedor) | `/` | Só o que é dele: avisos de fila pronta, comissão do mês, últimos pedidos e as filas do dia |
| **Pedidos** | `/pedidos` | As filas de impressão com quatro filtros (Em andamento, A pagar, Concluídas, Entregues) e os selos clicáveis no cartão. Aceita `?filtro=` e `?vendedor=` |
| **Clientes** | `/clientes` | Cadastro, vendedor responsável, ★ cliente especial, valor especial do metro e a aba **Especiais** |
| **Relatório** | `/relatorio` | Resumo por vendedor, comissão pelas faixas de metragem, CSV e impressão em A4 |
| **Cliente especial** | `/relatorio-cliente-especial` | Extrato do cliente especial (pagos e pendentes) em A4 |
| **Configurações** | `/configuracoes` | 11 abas: Comissões, Preços, Permissões, **Equipe**, **Vendedores**, Empresa, Comprovantes (IA), Dados, Nuvem, Meu acesso e Aparência. Aceita `?aba=` |
| **Porta do proprietário** | `/administracao` | Criar o primeiro acesso de dono e, depois, só o login de administrador |

Extras: **busca rápida em tudo com `Ctrl + K`** (pedido, cliente, telefone, cidade,
rastreio e vendedor), **Janela de revisão a cada 3 dias** (o que está fora de "concluído
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

Em **Configurações → Meu acesso** o proprietário troca o próprio usuário e a própria senha.

---

## Login e perfis de acesso

O sistema tem **login próprio** (nome de usuário + senha). Existem dois perfis:

| Perfil | O que vê |
| --- | --- |
| **Proprietário** | Tudo: todos os pedidos, relatórios, comissões, equipe e configurações |
| **Vendedor** | Só o que é dele: os próprios pedidos, clientes, metragem e comissão |

**Funcionário:** na tela de entrada, toque em *"Criar meu acesso"* e escolha o vínculo
(o próprio nome na lista de vendedores ou *"criar novo com o meu nome"*). A conta já
entra em uso na hora, sem precisar de aprovação.

### Porta do proprietário (separada do login dos funcionários)

A criação do acesso do dono **não** aparece na tela comum — a tela de entrada só mostra
*Entrar* e *Criar meu acesso*. A porta administrativa abre de três formas:

| Forma | Como |
| --- | --- |
| Endereço | `…/#/administracao` (salve como ícone na tela de início do celular: entra com 1 toque) |
| 5 toques no logo | toque/clique 5 vezes seguidas no logo, em qualquer tela |
| Teclado | `Ctrl + Alt + D` |

Na primeira vez ela pede para **criar o acesso do proprietário**; depois disso só pede
usuário e senha. Quem descobrir a porta vê apenas um login — **sem a senha do
administrador não há nada para fazer ali** (nem lista de nomes, nem dados).

**Contas da equipe:** o proprietário pode registrar cada pessoa em **Equipe → Nova conta**
(nome, usuário, a senha que a pessoa escolher e o vínculo com o vendedor), útil para
colocar quem já trabalhava aqui com o histórico ligado. O dono também redefine senhas e
troca vínculos nessa tela.

**Vários proprietários:** na mesma janela, *Tipo de acesso → “Proprietário — vê tudo”* cria
outro login de dono (sócio, gerente, escritório) — o atalho também aparece em
*Configurações → Meu acesso*. O sistema aceita quantos quiser, mas **nunca fica sem
nenhum** proprietário ativo: o último não pode ser desativado nem excluído, e ninguém
apaga o próprio acesso.

- A barra de cima tem só **Painel/Minha área, Pedidos, Clientes e Relatório**. A
  engrenagem do canto abre as **Configurações**, e dentro delas ficam **Equipe**
  (criar, ligar a um vendedor, redefinir senha, desativar ou excluir contas) e
  **Vendedores** — nada disso aparece para quem é vendedor.
- **Permissões dos vendedores** (`Configurações → Permissões`): podem ter acesso total,
  mexer nos pedidos mas não excluir (padrão) ou só criar pedidos.
- **Senhas** nunca ficam em texto puro: guardamos só um hash (impressão digital).
  Depois de 5 tentativas erradas o acesso fica bloqueado por 5 minutos.
- **Sessão**: a opção *"manter conectado"* guarda o acesso por 30 dias (senão, 1 hora).
  Em *Meu perfil* (canto direito do cabeçalho) cada um troca a senha.

> A segurança é a de um **sistema interno**: as contas ficam no próprio banco do sistema
> (navegador/Supabase), não no Supabase Auth. Se um dia quiser trancar mais, é ligar o
> *Supabase Auth* e trocar as políticas do banco — o resto do sistema não muda.

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
   ⚠️ Cada aparelho guarda os **próprios** dados: sem a nuvem, o celular do vendedor não
   vê os pedidos do computador.
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
- [x] Login com dois perfis (proprietário e vendedor) e permissões escolhidas pelo dono
- [x] Porta administrativa escondida (endereço `#/administracao`, 5 toques no logo, Ctrl+Alt+D)
- [x] Equipe → Nova conta (o dono registra a equipe já com o histórico antigo ligado)
- [x] Opções de relatórios e telas liberadas acesso por acesso (Equipe)
- [x] Sistema limpo para produção: começa vazio, sem dados nem senha de exemplo
      (dados de treino opcionais e fictícios, com aviso na tela)
- [x] Vários acessos de proprietário (Equipe → Nova conta → “Proprietário — vê tudo”)
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

> Observação: cada vendedor só enxerga os pedidos dele e o proprietário vê tudo.
> Ainda assim, use uma **senha forte** para o proprietário — o link do sistema pode
> ser aberto por qualquer pessoa que o tenha.
