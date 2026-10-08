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
| `npm run testar` | roda os testes das regras de preço e das telas |

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
e "Pago" ao mesmo tempo, e **Importar comprovante** (a IA lê a foto e preenche o
pedido — precisa de uma chave configurada em ⚙️ Configurações).

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
│   ├── lib/            regras e dados (tipos, preços, formatação, banco, arquivos, exemplos)
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
- [ ] Colocar no ar (GitHub Pages / Netlify) e conectar o Supabase
- [ ] Enviar o logo oficial (o sistema aceita upload em ⚙️ Configurações)
- [ ] Ajustes finos depois de usar no dia a dia

> Observação: o sistema não tem tela de login. Como o link pode ser aberto por
> qualquer pessoa que o tenha, o ideal é usar um endereço difícil de adivinhar e,
> se quiser, adicionamos um login simples em uma próxima etapa.
