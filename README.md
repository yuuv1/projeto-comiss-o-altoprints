# Altoprints — Sistema de Pedidos DTF

Sistema web (em português do Brasil) para gerenciar a produção de filmes DTF:
pedidos, clientes, vendedores, impressão, entregas e relatórios de comissão.

Recriado a partir do prompt `ultra-prompt-altoprints.md` e do comportamento observado
no sistema antigo (artastic-printflow.lovable.app): mesma navegação em "pílulas",
mesmos cartões de resumo, as mesmas etiquetas de status, os mesmos cálculos de preço
por metragem e os mesmos relatórios prontos para a contabilidade.

---

## Como rodar

```bash
cd app
npm install
npm run dev      # abre em http://localhost:8080
```

Outros comandos:

| Comando | O que faz |
| --- | --- |
| `npm run dev` | abre o sistema no seu computador (desenvolvimento) |
| `npm run build` | gera a versão final na pasta `dist/` |
| `npm run preview` | testa a versão final |
| `npm run testar` | roda os testes das regras (preço, comissão, senha) e das telas |

---

## Telas do sistema

| Menu | Rota | Para que serve |
| --- | --- | --- |
| **Pedidos** | `/` | Início. Cartões (Total, Retirada, Correios, A receber), busca grande e lista de pedidos |
| **Clientes** | `/clientes` | Cadastro de clientes, vendedor responsável, ★ cliente especial e valor especial do metro |
| **Vendedores** | `/vendedores` | Cadastro simples de vendedores |
| **Por vendedor** | `/por-vendedor` | Pedidos de um vendedor, filtro de 7/30/90 dias, totais e avisos de impressão |
| **Para imprimir** | `/para-imprimir` | Só pedidos **pagos e ainda não impressos** |
| **Entregas** | `/entregas` | Aba Correios (rastreio/entrega) e aba Retirada na loja |
| **Relatório** | `/relatorio` | Somente pagos, comissão de 1,5%, CSV e impressão em A4 |
| **Cliente especial** | `/relatorio-cliente-especial` | Extrato do cliente especial (pagos e pendentes) em A4 |

Extras: janela de **revisão a cada 3 dias** com os pedidos que não estão "DTF pronto"
e "Pago" ao mesmo tempo, **Importar comprovante** (a IA lê a foto e preenche o pedido)
e **tema claro/escuro** (botão no cabeçalho, cada pessoa escolhe o seu).

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
| acima de 50 m | 1,5% |
| sem metragem informada | 3% (editável) |

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

- No menu do dono também aparecem **Equipe** (criar, ligar a um vendedor, redefinir
  senha, desativar ou excluir contas), **Relatório**, **Para imprimir**, **Entregas** e
  **Configurações** — nada disso aparece para os vendedores.
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

Status de produção: Editar arte → Fila de impressão → Pagamento → Imprimir → **DTF pronto**.
Status de pagamento: Pendente, Pago, Parcial, Cancelado.

---

## Onde ficam os dados

O sistema funciona de duas formas, sem mudar nenhuma tela:

1. **Modo local (padrão)** — os dados ficam salvos no próprio navegador. Bom para
   conhecer o sistema e testar. Os arquivos de arte ficam no navegador também.
2. **Modo nuvem (Supabase, grátis)** — os dados ficam num banco na nuvem e aparecem
   iguais em todos os computadores e celulares. Para ativar, veja **[app/DEPLOY.md](app/DEPLOY.md)**.

---

## Estrutura do projeto

```
app/
├── src/
│   ├── lib/            regras e dados (tipos, preços, comissão, senha, tema, banco, arquivos)
│   ├── components/     telas de apoio (menu, cartões, modais, etiquetas de status, logo)
│   ├── pages/          as 8 telas do menu + formulário de pedido
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
- [ ] Colocar no ar (Netlify conectado ao GitHub) e conectar o Supabase
- [ ] Enviar o logo oficial (Configurações → Empresa)
- [ ] Ajustes finos depois de usar no dia a dia

> Observação: cada vendedor só enxerga os pedidos dele e o proprietário vê tudo.
> Ainda assim, use uma **senha forte** para o proprietário — o link do sistema pode
> ser aberto por qualquer pessoa que o tenha.
