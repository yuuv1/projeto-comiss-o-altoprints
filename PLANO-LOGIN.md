# Plano — Login, perfis e área de cada funcionário

> Documento de planejamento (nada aqui foi implementado ainda).
> Objetivo: transformar o sistema atual (sem login) em um sistema com entrada por
> usuário e senha, onde **o vendedor vê só o que é dele** e **o proprietário vê tudo**.

---

## 1. Visão geral

Hoje o sistema é aberto: qualquer pessoa com o link entra e vê todos os pedidos, e a
proteção existe apenas no painel de configurações (senha local).

A proposta é:

- **Entrada por login** (usuário + senha), com opção "manter conectado neste aparelho".
- **Cada funcionário cria a própria conta**, e o **proprietário aprova** (ou já entra
  liberado — decide-se na pergunta 2).
- **Vendedor** entra e cai direto na área dele: só pedidos dele, comissão dele,
  pendências dele.
- **Proprietário (dono)** entra e vê **tudo**: todas as equipes, todos os pedidos,
  comissões, relatórios, financeiro e o cadastro de pessoas.
- Continua disponível em **domínio público** — o que muda é que agora ninguém entra sem
  usuário e senha.

---

## 2. Perfis (papéis)

| Papel | Quem usa | O que vê |
| --- | --- | --- |
| **Proprietário** | o dono / a dona | Tudo, de todos: pedidos, clientes, vendedores, comissões, relatórios, entregas, cadastro de equipe e regras |
| **Vendedor** | equipe de vendas | Só o que é dele: seus pedidos, seus clientes, sua comissão, seus avisos de impressão |
| **Produção** (opcional) | quem imprime/expede | Fila "Para imprimir" e "Entregas", sem valores de comissão e sem financeiro |
| **Financeiro** (opcional) | quem confere pagamentos | Marcar pago, relatórios e comissões, sem mexer em arte/produção |

Sugestão: começamos com **Proprietário + Vendedor** e, se fizer sentido, ligamos
**Produção** depois — é só adicionar o papel, sem refazer nada.

---

## 3. O que cada perfil vê em cada tela

| Tela | Proprietário | Vendedor | Produção |
| --- | --- | --- | --- |
| **Minha área** (nova — início do vendedor) | — | ✅ seus números, pendências e comissão | — |
| **Painel do dono** (nova — início do proprietário) | ✅ total do mês, por vendedor, comissões, a receber | — | — |
| Pedidos | ✅ todos, filtra por vendedor | ✅ só os dele (cria e edita) | ✅ fila, sem valores de comissão |
| Clientes | ✅ todos | ✅ só os clientes dele | ❌ |
| Vendedores / Equipe | ✅ cadastra e gerencia | ❌ | ❌ |
| Por vendedor | ✅ qualquer vendedor | ✅ só ele mesmo | ❌ |
| Para imprimir | ✅ | ❌ | ✅ |
| Entregas | ✅ | ❌ | ✅ |
| Relatório / Comissões | ✅ | ❌ (vê a comissão dele em Minha área) | ❌ |
| Relatório cliente especial | ✅ | ❌ | ❌ |
| Configurações / Regras de comissão | ✅ (deixa de ter senha separada: o dono já está logado) | ❌ | ❌ |

Detalhe importante: o vendedor continua criando pedidos em nome **dele** — o campo
"vendedor" já vem travado no nome de quem está logado (o proprietário pode escolher
qualquer vendedor).

---

## 4. Fluxos do dia a dia

### 4.1 Primeiro acesso (implantação)
1. Sistema abre sem nenhuma conta.
2. Aparece a tela **"Criar conta do proprietário"** (só aparece enquanto não existir dono):
   nome, usuário, senha.
3. A partir daí, quem abrir o link vê a tela de **Login**.

### 4.2 Funcionário se cadastrando
1. Na tela de login, o funcionário clica em **"Sou funcionário — criar meu acesso"**.
2. Preenche: nome, usuário, senha, e o **vendedor correspondente** (ou o proprietário
   vincula depois).
3. Conforme a decisão da pergunta 2: entra direto, ou fica "aguardando liberação" até o
   dono aprovar (recomendado para um sistema público).

### 4.3 Uso diário
- Vendedor abre o sistema no celular → "Minha área" → vê os pedidos dele e os avisos
  ("seu pedido foi impresso"), cria pedido novo, confere a comissão do mês.
- Proprietário abre → painel geral → confere comissões, fecha o mês, vê o que está
  pendente, gerencia a equipe.
- Cada aparelho pode manter o login ("manter conectado"), e existe o botão **Sair**.

### 4.4 Senhas
- Trocar a própria senha: dentro do sistema ("Meu perfil").
- Esqueci a senha: **o proprietário redefine** para o funcionário (nada de e-mail, para
  não depender de serviço externo).
- Funcionário sai da empresa: o proprietário **desativa** o acesso (o histórico de
  pedidos permanece).

---

## 5. Arquitetura técnica — duas opções

### Opção A — Supabase Auth + regras no banco (RECOMENDADA)
- O Supabase (que já vamos usar para os dados) tem login pronto: e-mail/senha,
  sessão, "manter conectado", recuperação.
- **Segurança real:** o banco passa a ter regras (RLS) que impedem o vendedor de ler os
  pedidos dos outros **mesmo se ele tentar acessar a API direto**. Isso resolve o alerta
  que eu te dei sobre o painel por senha ser apenas um cadeado visual.
- Como o funcionário não precisa saber e-mail: ele digita o **usuário** (ex.: `jessica`) e
  o sistema converte internamente em `jessica@altoprints.local`. Simples para a equipe,
  seguro por baixo.
- Plano gratuito cobre tranquilamente (usuários ilimitados).
- Trabalho: médio — tela de login/cadastro, controle de sessão, tabela de perfis,
  políticas por papel e ajuste das telas por permissão.

### Opção B — Login próprio (usuário/senha numa tabela do sistema)
- Parecido com o painel atual: tabela `usuarios` com senha criptografada e sessão
  guardada no navegador.
- Rápido de fazer, **mas a proteção é fraca**: quem souber ler o código da página
  conseguiria puxar dados direto do banco (a chave fica no navegador). Serve como
  "organização" (cada um vê a tela do seu jeito), não como segurança.
- Recomendado apenas se você quiser velocidade agora e segurança depois.

### Comparação rápida

| | Opção A (Supabase Auth) | Opção B (login próprio) |
| --- | --- | --- |
| Vendedor vê só o dele de verdade | ✅ | ⚠️ apenas na tela |
| Complexidade | média | baixa |
| Custo | R$ 0 | R$ 0 |
| Funciona offline/sem nuvem? | ❌ (precisa do Supabase) | ✅ (pode rodar só no navegador) |
| Pronto para crescer (mais papéis) | ✅ | ⚠️ |

> Observação: a Opção A exige ligar o Supabase. Se ainda não deu para configurar o
> Supabase, eu posso fazer a Opção B primeiro e migrar para a A depois — o app foi
> feito com uma camada de dados separada justamente para permitir esse tipo de troca.

---

## 6. Modelo de dados proposto (Opção A)

```sql
-- vincula cada conta de login ao papel, ao nome e ao vendedor correspondente
create table public.perfis (
  id         uuid primary key references auth.users (id) on delete cascade,
  nome       text not null,
  usuario    text unique not null,              -- "jessica" (sem @)
  papel      text not null default 'vendedor',  -- proprietario | vendedor | producao | financeiro
  vendedor_id text references public.vendedores (id),  -- liga a conta ao vendedor
  ativo      boolean not null default true,
  criado_em  timestamptz not null default now()
);

-- ex.: o vendedor só enxerga os pedidos dele; o proprietário enxerga tudo
create policy "pedidos_por_papel" on public.pedidos
  for select using (
    exists (select 1 from public.perfis p where p.id = auth.uid() and p.papel = 'proprietario')
    or vendedor_id = (select p.vendedor_id from public.perfis p where p.id = auth.uid())
  );
```

Regras equivalentes para `clientes` (só os do vendedor), `arquivos` (pelos pedidos) e
`configuracoes` (só o proprietário lê e escreve).

Resumo das permissões no banco:

| Tabela | Proprietário | Vendedor | Produção |
| --- | --- | --- | --- |
| pedidos | tudo | lê/cria/edita os dele (sem excluir) | lê os pagos, marca impresso/entregue |
| clientes | tudo | lê/edita os dele | — |
| vendedores | tudo | lê a própria lista | — |
| arquivos | tudo | os dos pedidos dele | lê os da fila |
| configuracoes | tudo | ❌ | ❌ |

---

## 7. O que muda na interface

1. **Tela de Login** (nova): logo, usuário, senha, "manter conectado", "entrar", e
   "criar meu acesso" (funcionário).
2. **Minha área** (nova, início do vendedor): cartões com pedidos do mês, metragem,
   faturamento, **comissão do mês** (com o detalhe por faixa), lista dos pedidos dele e
   os avisos de impressão.
3. **Painel do dono** (novo, início do proprietário): visão geral do mês, ranking de
   vendedores com comissão, pendências (a receber, não impressos, entregas), atalhos.
4. **Equipe** (nova, só dono): lista de pessoas, papel, vínculo com vendedor, ativar/
   desativar, redefinir senha, promover a proprietário.
5. **Menu** passa a mudar conforme o papel (o vendedor não vê "Relatório", "Equipe",
   "Configurações").
6. **Meu perfil** (novo): trocar nome/usuário e trocar a própria senha.
7. O cadeado ⚙️ deixa de existir como está: quem administra é o login de proprietário.

---

## 8. Ordem de implementação sugerida

| Etapa | O que entrega | Depende de |
| --- | --- | --- |
| 1 | Criar o Supabase e subir o sistema atual na nuvem (sem login ainda) | decidir hospedagem |
| 2 | Tabela de perfis + tela de login + sessão + sair | etapa 1 |
| 3 | Cadastro do funcionário + aprovação do dono + tela Equipe | etapa 2 |
| 4 | Regras no banco (RLS) e ajuste das telas por papel | etapa 2 e 3 |
| 5 | Minha área e Painel do dono | etapa 4 |
| 6 | Testar com um vendedor de verdade, ajustar e publicar | etapa 5 |

Se preferir velocidade, dá para inverter: fazer 2, 3 e 5 no **modo local** (Opção B),
usar por alguns dias e só depois plugar a nuvem.

---

## 9. Riscos e cuidados

- **Sem e-mail de verdade**: se o funcionário esquecer a senha, o dono redefine. Simples,
  mas exige o dono disponível.
- **Link público**: mesmo com login, o sistema fica exposto a tentativas de senha. Vou
  colocar limite de tentativas e senha mínima. (Se um dia quiser, dá para ligar
  verificação em duas etapas do Supabase.)
- **Migração dos dados atuais**: os pedidos que já existem entram normalmente; só os
  vendedores precisam ser vinculados às contas novas (uma vez).
- **Celular**: o operador de produção usa celular no dia a dia — as telas novas
  (login, Minha área) já nascem responsivas.

---

## 10. Decisões pendentes (perguntas para o dono)

1. Quantos papéis queremos agora? (2, 3 ou 4)
2. O funcionário entra direto após criar a conta, ou espera liberação do dono?
3. Login por **usuário** (ex.: `jessica`) ou por **e-mail**?
4. Opção A (Supabase Auth, seguro) ou Opção B (login próprio, mais simples)?
5. O que o vendedor pode fazer com os próprios pedidos (criar, editar, excluir)?
6. Implementamos o login **antes** ou **depois** de publicar o site?
