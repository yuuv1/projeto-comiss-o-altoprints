# Próximas etapas — logins com relatórios, área do chefe e catálogo de impressões
### você pediu: (1) logins com opções de relatórios, (2) melhor experiência do chefe no administrativo, (3) catalogar as impressões

> **Documento de planejamento histórico.** As seções antigas abaixo registram como as
> funcionalidades foram pensadas; não são instruções atuais de publicação. Para o estado
> vigente, consulte [`LANCAMENTO.md`](LANCAMENTO.md).

## Situação atual

- **Frente A (logins com opções de relatórios): IMPLEMENTADA** — as caixinhas por acesso estão
  em **Configurações → Equipe**, e as telas liberadas saem filtradas só com os dados do vendedor.
- **Frente B (experiência do chefe): IMPLEMENTADA** — inclui resumo de hoje, atalhos, checklist,
  busca global, equipe em tabela e explicações nas Configurações.
- **Frente C (catalogar as impressões): FORA do sistema, por decisão de simplificação.**
  O fluxo atual é uma fila na tela **Pedidos**; a tela de catálogo foi retirada do menu.
- **Publicação online-only (versão 1.5.7):** o site oficial requer a configuração central do
  Supabase no GitHub Actions. Sem URL e chave pública válidas, o build/publicação é bloqueado;
  não existe modo local nem conexão por aparelho. O guia atualizado está em
  [`PLANO-NUVEM-E-PUBLICACAO.md`](PLANO-NUVEM-E-PUBLICACAO.md) e [`LANCAMENTO.md`](LANCAMENTO.md).

---

## Frente A — Logins com opções de relatórios

**O problema:** hoje o vendedor vê só *Minha área, Pedidos, Clientes e Meu desempenho*. Se você
quiser dar mais (ou menos) para alguém, não tem como.

**O que proponho:** na tela **Equipe**, ao abrir um acesso, além do vínculo e da senha, aparecer
uma seção **"Opções de relatórios e telas"** com caixinhas para você marcar, acesso por acesso:

| Opção | O que a pessoa passa a ver |
| --- | --- |
| ☑ Minha área | a tela inicial com os pedidos dela (já é padrão) |
| ☐ **Relatório de vendas (só os dados dela)** | a mesma tela bonita de relatório, com gráficos e totais — **filtrado automaticamente para ela**, com "Imprimir/PDF" e CSV |
| ☐ **Meu desempenho detalhado** | metragem, faturamento e comissão dela por período e por faixa |
| ☐ **Para imprimir** | a fila de impressão (sem valores em dinheiro e sem outros vendedores) |
| ☐ **Entregas** | a lista de entregas (endereços e código de rastreio) |
| ☐ **Cliente especial** | o relatório de cliente especial (só dos clientes dela) |

- Todos os relatórios liberados já saem **com os dados filtrados pelo vínculo** dela — ninguém vê o
  faturamento de outro.
- O que não estiver marcado **não aparece no menu** e, se ela digitar o endereço na mão, recebe
  *"Esta área não está liberada para o seu acesso"*.
- Valores em dinheiro (faturamento, comissão) podem ser escondidos separadamente nas telas de
  produção/entrega — decide-se junto com a Frente C.

**Onde fica a decisão:** `Equipe → (abrir o acesso) → Opções de relatórios e telas`. Padrão de
fábrica: igual ao que é hoje (só Minha área, Pedidos, Clientes e Meu desempenho).

---

## Frente B — Melhorar a experiência do chefe no administrativo

**O problema:** hoje o dono tem sete telas e precisa lembrar onde fica cada coisa.

**O que proponho (tudo na tela inicial do dono, o *Painel*):**

1. **Resumo de hoje** (novo bloco no topo): pedidos criados hoje · pagos hoje · prontos para
   imprimir · entregas de hoje · **atrasados** · contas a receber (com soma em R$).
2. **Botões grandes de ação** (linha de atalhos): *Novo pedido* · *Registrar pagamento* ·
   *Nova conta* · *Ver contas a receber* · *Fechar o mês da comissão*.
3. **Checklist de primeiros passos** (aparece só enquanto o sistema está "novo"): criar o acesso do
   proprietário ✓ · cadastrar as contas da equipe · revisar a tabela de comissão · enviar o logo ·
   publicar o link. Vai marcando sozinho conforme você faz.
4. **Busca global (Ctrl + K)**: uma caixa que acha pedido, cliente, telefone, código de rastreio e
   arquivo — de qualquer tela.
5. **Equipe no formato de tabela**: uma linha por acesso, com *pedidos · última venda · comissão do
   mês · vínculo*, e os botões na própria linha (mais fácil de bater o olho).
6. **Configurações com explicação curta** em cada aba ("para que serve") e um botão *Ver exemplo*
   onde fizer sentido.

---

## Frente C — Catalogar as impressões ✅ (parte principal implementada)

> **Feito:** a janela de registrar impressão, a tela **Impressões** (totais, filtros por período /
> quem imprimiu / busca / só reimpressões, CSV e folha de produção para imprimir), o histórico
> dentro da ficha do pedido, o cartão **Meu dia na produção** (na Minha área) e a caixinha
> *Impressões* na tela **Equipe** para liberar a tela a quem produz — sempre sem valores em dinheiro.
> No banco entrou a tabela `impressoes` (quem já tem banco na nuvem precisa rodar o SQL de novo —
> o sistema avisa e não apaga nada).
>
> **Falta:** o catálogo de artes (item 4 abaixo), que reaproveita os arquivos já enviados.

**O problema:** hoje o pedido só guarda "impresso: sim/não" e a data. Não se sabe **quem imprimiu,
quantos metros saíram, quantas vezes reimprimiu nem por quê**.

**O que proponho:**

1. **Ficha de impressão** — ao marcar *Impresso* numa fila/para-imprimir, abre uma janelinha:
   - **Metragem impressa** (já vem preenchida com a metragem do pedido, você pode corrigir)
   - **Quem imprimiu** (já vem com o seu nome; você pode trocar)
   - **Observação** (ex.: "filme acabou no meio")
   - Botão **Reimpressão** com **motivo** (arte errada · defeito na impressão · tamanho errado ·
     cliente mudou · outro)
2. **Nova tela "Impressões"** (catálogo de tudo que foi impresso):
   - Filtros: período (hoje / semana / mês / tudo), quem imprimiu, pedido, cliente e "só reimpressões"
   - Totais no topo: **nº de impressões · metros impressos · metros perdidos · % de reimpressão**
   - Cada linha mostra: data/hora, pedido, cliente, arte, metros, quem imprimiu, observação
   - Exportar CSV e **Imprimir/PDF** (folha de produção do dia)
3. **No pedido** (ficha do pedido): histórico de impressões — *"impresso 2× · 4,5 m no total · por
   NOME DA PESSOA em 08/10 14:32"*.
4. **Catálogo de artes** (segunda aba da mesma tela): os arquivos enviados viram uma biblioteca com
   **prévia da imagem**, cliente, tema/tag e "usado em N pedidos" — dá para reenviar a mesma arte
   para um pedido novo em 1 clique, sem o cliente precisar mandar de novo.
5. **Meu dia (para o vendedor/produção)**: um cartão na *Minha área* com "o que eu imprimi hoje:
   X pedidos · Y metros" e um atalho para a fila de impressão (essa tela só aparece para quem tiver
   a opção marcada na Frente A).

**Dados novos necessários:** uma tabela `impressoes` (pedido, arquivo, metros, quem, quando, motivo
de reimpressão, observação) e um campo de tags nos arquivos. No Supabase isso entra no
`schema.sql` que eu já mantenho; qualquer implementação futura deve continuar no Supabase
central, sem criar modo local.

---

## Ordem que eu proponho

1. **Frente A** (logins com relatórios) — é o que você pediu primeiro e mexe no menu/rotas.
2. **Frente C** (catalogar impressões) — é o dia a dia da equipe.
3. **Frente B** (experiência do chefe) — rende mais depois que os dados de impressão existem
   (porque o Painel vai mostrar metros impressos, reimpressões etc.).

Em alterações futuras: implementar → rodar os testes → revisar o pacote online. `npm run publicar`
é apenas uma validação local; não versione `app/dist/` nem `publicar/` (artefatos gerados).

---

## Decisões tomadas

1. **Opções de relatórios:** caixinha por acesso (implementado em Configurações → Equipe).
2. **Impressões:** o fluxo é o status da fila na tela Pedidos; a tela de catálogo de impressões
   saiu do sistema (os dados continuam no banco para o futuro).
3. **Publicação:** GitHub Pages publica a `main` somente depois que o workflow valida a
   configuração central do Supabase. O site oficial é online-only; consulte [`LANCAMENTO.md`](LANCAMENTO.md)
   e `app/PASSO-A-PASSO-SUPABASE.md`.
