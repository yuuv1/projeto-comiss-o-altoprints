Quero um sistema web completo, em português do Brasil, para gerenciar uma empresa de impressão em DTF (mercado de estamparia). O cliente envia a arte, nós montamos, imprimimos o filme DTF e entregamos pronto para prensar. Enviamos para todo o Brasil pelos Correios ou o cliente retira na loja. Use banco de dados na nuvem, moeda em reais (R$) e datas no formato brasileiro (dd/mm/aaaa).

## Identidade visual
- Tema "Moderno Vibrante", inspirado no logo (vou enviar): degradês de rosa, roxo, azul, verde e laranja.
- Cabeçalho fixo com logo brilhante e menu em formato de "pílulas" com a aba ativa destacada.
- Cartões com cantos arredondados, sombra suave e leve elevação ao passar o mouse.
- Cartões de resumo com ícone dentro de um quadrado em degradê.
- Etiquetas coloridas para cada status de produção e de pagamento.
- Funcionar bem no celular e no computador.

## Menu (cada item é uma página própria)
Pedidos, Clientes, Vendedores, Por vendedor, Para imprimir, Entregas, Relatório, Relatório cliente especial.

## Cadastros

### Vendedores
- Lista de vendedores com nome. Adicionar, editar e excluir.
- Os vendedores aparecem como lista de seleção nos cadastros de cliente e pedido.

### Clientes
- Campos: nome (obrigatório), telefone, e-mail, observações, vendedor responsável (obrigatório, seleção), valor especial do metro (opcional) e marcação "★ Cliente especial".
- Busca por nome, telefone ou vendedor.
- Editar e excluir.

### Pedidos
- Número do pedido automático e sequencial (#1, #2...).
- Campos: cliente (no pedido novo sempre digitar o nome de um cliente novo; não escolher de uma lista), vendedor (obrigatório), descrição, metragem, valor, status de produção, status de pagamento, forma de pagamento, data do pagamento, data do pedido (pode ser alterada), observações, tipo de entrega (Retirada ou Correios), endereço, cidade, estado, CEP, código de rastreio, data de envio, data de entrega, "retirado por".
- Envio de arquivos de arte (imagens, PDF), guardados na nuvem, com lista para baixar e excluir.
- **Cálculo automático do valor pela metragem:**
  - 1 a 4 metros: R$ 59,90 o metro
  - 5 a 19 metros: R$ 54,90 o metro
  - 20 metros ou mais: R$ 44,90 o metro
  - Se o cliente tiver valor especial do metro, usar esse valor.
  - Botão para trocar entre valor "automático" e "manual", para o vendedor ajustar quando precisar.
- Quando o pagamento for marcado como "Pago", preencher a data do pagamento com hoje (pode ser alterada).

### Status de produção (nesta ordem)
1. Editar arte
2. Fila de impressão
3. Pagamento
4. Imprimir
5. DTF pronto

### Status de pagamento
Pendente, Pago, Parcial, Cancelado.

## Páginas

### Pedidos (início)
- Título, subtítulo e botão "Novo pedido".
- 4 cartões de resumo: **Total** de pedidos, **Retirada**, **Correios**, **A receber** (soma dos pedidos pendentes ou parciais).
- Campo de busca grande: nome do cliente, número do pedido, descrição, cidade ou código de rastreio.
- Lista com: número, cliente, descrição + metragem, etiquetas de produção e pagamento, valor, data, botões editar e excluir (com confirmação; excluir também apaga os arquivos).

### Por vendedor
- Escolher o vendedor e ver só os pedidos dele.
- Filtro de período: 7, 30 ou 90 dias, ou datas personalizadas.
- Totais: quantidade, valor total e valor pago.
- Botão "Novo pedido" que já vem com o vendedor preenchido.
- Aviso em destaque quando um pedido dele foi impresso, até ele marcar como visto.

### Para imprimir
- Mostra só pedidos **pagos** que ainda não foram impressos.
- Botão "Marcar como impresso", que muda o status e avisa o vendedor responsável.

### Entregas
- Aba **Correios**: em trânsito e entregues, com botão "Marcar como entregue" e código de rastreio.
- Aba **Retirada na loja**: aguardando e retirados, com campo para informar quem retirou e a data.

### Relatório (para a contabilidade)
- Mostra **somente pedidos pagos**.
- Filtro de período pela **data do pagamento** (se o pedido não tiver data de pagamento, usar a data do pedido). Atalhos: hoje, esta semana, este mês, mês passado.
- Cartões: **Pedidos**, **Metragem total**, **Faturamento** e **Comissão** (1,5% do faturamento).
- Tabela "Resumo por vendedor": vendedor, pedidos, metragem, faturamento, comissão de 1,5%, botão "Ver só este" e linha de TOTAL.
- Tabela detalhada com aparência de planilha (linhas zebradas, bordas, números alinhados, valores em verde): Nº, Cliente, Vendedor, Observação, Metragem, Valor, Data do pagamento, Ações.
  - A descrição aparece em uma linha abaixo do pedido só quando existir.
  - Botão para tirar um pedido do relatório (só na tela, não apaga o pedido) e botão para restaurar todos.
- Exportar CSV (abre no Excel com acentos corretos, separado por ponto e vírgula).
- **Impressão / PDF em folha A4 em pé:**
  - Logo da empresa no cabeçalho, título, período e data de emissão.
  - Somente a tabela em preto e branco, letra grande (13px) e legível, sem cortar nas bordas.
  - Sem menu, botões ou cores do site.
  - Totais gerais só no final da última página.

### Relatório cliente especial
- Escolher um cliente marcado como especial e um período.
- Cabeçalho com logo e dados do cliente: nome, telefone, e-mail, vendedor e valor especial do metro.
- Tabelas separadas de pedidos pagos e pendentes, com totais.
- Versão para imprimir em A4, pronta para enviar ao cliente.

## Aviso de revisão a cada 3 dias
- A cada 3 dias, abrir uma janela listando pedidos incompletos (que não estão "DTF pronto" e "Pago" ao mesmo tempo).
- Para cada pedido: botões **Manter**, **Editar** (abre o pedido na hora) e **Excluir**.
- A janela continua aparecendo até todos os pedidos serem resolvidos ou mantidos.

## Extra (opcional)
- Botão "Importar comprovante": enviar foto ou PDF de um comprovante, a inteligência artificial lê cliente, valor e data e preenche o formulário do pedido para conferir antes de salvar.

## Regras gerais
- Todos os textos em português.
- Mensagens de confirmação ao salvar ou excluir.
- Campos obrigatórios marcados e validados.
- Títulos próprios em cada página.
