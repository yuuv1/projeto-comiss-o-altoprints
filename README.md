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

> 🚀 **Quer colocar no ar agora?** Siga o **[LANCAMENTO.md](LANCAMENTO.md)**. O site oficial só publica com o Supabase central configurado; todos os aparelhos usam o mesmo banco online.

---

## Como rodar

```bash
cd app
npm install
npm run dev      # abre em http://localhost:8080
```

### Publicação oficial (somente online)

`npm run publicar` gera apenas o pacote do site hospedado e exige `VITE_SUPABASE_URL` mais uma chave pública (`VITE_SUPABASE_PUBLISHABLE_KEY` ou `VITE_SUPABASE_ANON_KEY`). Sem essa conexão central, a publicação é bloqueada e o app não usa armazenamento local como alternativa para pedidos, clientes, arquivos ou outros dados operacionais. Não existe mais um arquivo para abrir offline.

> **O sistema começa vazio:** não há pedidos de exemplo nem senha padrão. A equipe escolhe o próprio nome ao registrar as filas; o proprietário cria o acesso em **Login proprietário**. Dados de treinamento são fictícios e só entram se forem solicitados em Configurações → Dados.

`npm run dev` serve apenas para desenvolvimento; não é o site oficial nem uma forma de compartilhar dados entre aparelhos.

Outros comandos:

| Comando | O que faz |
| --- | --- |
| `npm run dev` | abre o sistema no seu computador (desenvolvimento, atualiza ao salvar) |
| `npm run build` | compila a versão de produção na pasta `dist/` |
| `npm run preview` | testa a versão compilada (online-only) |
| `npm run testar` | roda as regras, telas e validação da configuração de publicação |
| `npm run publicar` | monta a pasta hospedável `publicar/`; exige a conexão central do Supabase |
| `npm run checar` | bloqueia pacote sem URL/chave pública, com segredos ou dados proibidos |

---

## Telas do sistema

> **Versão atual: 1.5.7** — fixa a conexão do site ao Supabase central e bloqueia qualquer fallback para modo local; o PWA segue atualizando automaticamente.
> O login do proprietário usa um único campo de usuário e senha; o e-mail dele pode ser o usuário.
> O número aparece no rodapé; se estiver antigo, feche e abra o app para receber a atualização.

| Tela | Rota | Para que serve |
| --- | --- | --- |
| **Painel** (dono) | `/` | Resumo de hoje, atalhos grandes, checklist de primeiros passos, desempenho por funcionário, comissão pelo valor do metro e a equipe em tabela |
| **Início da equipe** | `/` | Sem login, cai direto em **Pedidos** (não existe mais “Minha área”) |
| **Pedidos** | `/pedidos` | As filas de impressão com quatro filtros (Em andamento, A pagar, Concluídas, Entregues) e os selos clicáveis no cartão. Aceita `?filtro=` e `?vendedor=` |
| **Clientes** | `/clientes` | Cadastro, vendedor responsável, ★ cliente especial, valor especial do metro e a aba **Especiais** |
| **Relatório** | `/relatorio` | Resumo por funcionário, comissão pelas faixas do valor do metro, CSV e impressão em A4 (só o dono) |
| **Cliente especial** | `/relatorio-cliente-especial` | Extrato do cliente especial (pagos e pendentes) em A4 (só o dono) |
| **Configurações** | `/configuracoes` | 10 abas: Comissões, Preços, **Funcionários e acessos**, Empresa, Comprovantes (IA), Dados, Nuvem, Meu acesso e Aparência. Aceita `?aba=` |
| **Login proprietário** | `/administracao` | Criar o primeiro acesso de dono (com senha) e, depois, só entrar/sair |

Extras: **busca rápida em tudo com `Ctrl + K`** (pedido, cliente, telefone, cidade,
rastreio e funcionário), **Janela de revisão a cada 3 dias** (o que está fora de "concluído
e pago"), **Importar comprovante** (a IA lê a foto e preenche o pedido), **tema
claro/escuro** e instalação como **aplicativo PWA**.

### Instalar no celular ou computador

Abra o site pelo endereço HTTPS e toque em **Instalar app** (no menu do celular ou no
cabeçalho do computador). No iPhone/iPad, abra no Safari e use **Compartilhar → Adicionar
à Tela de Início**. Depois, o ícone do Altoprints abre o sistema sem redigitar o endereço.
O PWA atualiza o programa automaticamente; pedidos e sincronização com o Supabase ainda
precisam de internet. Veja [`app/PWA.md`](app/PWA.md) para o passo a passo.

---

## Comissão pelo valor do metro (configurável)

Desde **01/11/2026** a comissão de cada pedido **não é mais pela metragem**: ela usa o
**valor do metro** praticado no pedido (valor ÷ metragem). O percentual da faixa em que
esse valor cai é aplicado sobre o valor do pedido.

Tabela oficial (toda editável pelo proprietário):

| Valor do metro | Comissão |
| --- | --- |
| R$ 59,90 ou mais | 3% |
| R$ 54,90 a R$ 59,89 | 2,75% |
| R$ 49,90 a R$ 54,89 | 2,5% |
| R$ 44,90 a R$ 49,89 | 2,25% |
| R$ 39,90 a R$ 44,89 | 2% |
| abaixo de R$ 39,90 | 1,5% |

> Cada faixa vale de `de` até **antes** de `ate`. Pedido com **valor especial do cliente**
> também entra pela faixa certa, porque o cálculo olha o valor do metro que foi realmente cobrado.

**Encaixe na faixa mais próxima:** quando o valor do metro fica a poucos centavos de uma faixa,
o pedido entra naquela faixa em vez de cair na de baixo. Com a tolerância padrão de **R$ 1,00**,
um pedido a R$ 59,08/m conta como R$ 59,90/m (3%) e um a R$ 39,86/m conta como R$ 39,90/m (2%).
A tolerância é editável em **Configurações → Comissões** (0 = régua exata).

Pedidos **anteriores a 01/11/2026** continuam com a tabela antiga, por metragem
(1–5 m 4% · 5–10 m 3,5% · 10–20 m 3% · 20–50 m 2,5% · 50–100 m 2% · acima de 100 m 1,5%),
para o histórico e as comissões já pagas não mudarem. A data de vigência fica em
**Configurações → Comissões → Vale a partir de**.

Onde alterar: **Configurações → Comissões** (só o proprietário entra lá). A tela tem uma
**prévia ao vivo** que mostra, com os pedidos pagos do mês, quantos pedidos caem em cada
faixa e quanto sai de comissão — antes mesmo de salvar — e um botão **"Usar tabela oficial"**
para restaurar os valores acima. A tabela antiga continua acessível no mesmo lugar
(botão **"Mostrar tabela antiga"**), para consulta e ajuste do histórico.

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
  antigas e embrulhados. Recupera clientes e funcionários; se uma versão antiga só tiver
  o funcionário em `usuarios`, o nome e o vínculo também são recuperados. As contas antigas
  de funcionário deixam de ser logins; os acessos de proprietário do aparelho são mantidos
  se o arquivo não trouxer nenhum.
- Antes de aplicar, a restauração mostra quantos pedidos, clientes e funcionários há no arquivo
  (e avisa se não houver clientes/funcionários). Ela **substitui os dados atuais**; não mescla.
  Guarde uma cópia do banco atual antes de aplicar.
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

O site oficial tem **um único modo: online, no Supabase central**. Pedidos, clientes, acessos e arquivos são lidos e gravados nesse mesmo banco em todos os aparelhos. Se a conexão não estiver configurada ou a internet cair, o sistema bloqueia as gravações — não cria uma cópia local divergente. A publicação também falha se faltar a URL ou a chave pública do Supabase.

O armazenamento local aparece somente nos testes e no desenvolvimento (`npm run dev`); ele não é incluído como opção de uso no site publicado.

---

## Estrutura do projeto

```
app/
├── public/           manifesto e ícones do PWA
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
- [x] Instalação do site como aplicativo PWA (Android, iOS e computador)
- [x] Comissão pelo **valor do metro** (desde 01/11/2026), configurável em Configurações → Comissões
- [x] Tabela histórica por metragem, preservada para os pedidos anteriores à vigência
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
- [x] Site oficial online-only: um Supabase central, sem fallback nem gravação local
- [x] Publicação bloqueada quando faltam URL/chave pública ou quando a chave é secreta
- [ ] Configurar/verificar `VITE_SUPABASE_URL` + chave pública em GitHub Actions Secrets/Variables (os valores não são lidos nem versionados no repositório)
- [ ] Enviar o logo oficial (Configurações → Empresa)
- [ ] Ajustes finos depois de usar no dia a dia

> Observação: a equipe usa o sistema sem login (é uma loja só: todos veem os pedidos e os
> clientes). As telas de gestão ficam com o proprietário. Ainda assim, use uma **senha
> forte** — o link do sistema pode ser aberto por qualquer pessoa que o tenha.
