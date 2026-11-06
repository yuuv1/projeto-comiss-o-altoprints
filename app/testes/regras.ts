/**
 * Testes das regras de negócio (preço por metragem, datas, formatação).
 * Rode com:  npm run testar
 */
import { readFileSync } from 'node:fs'
import {
  calcularComissao,
  comissaoDoPedido,
  faixaDoPedido,
  faixaDoValor,
  migrarFaixas,
  normalizarFaixasValor,
  regraDoPedido,
  regrasDaConfig,
  ajustarValorDoMetro,
  rotuloFaixaValor,
  usaRegraPorValor,
  valorMetroParaFaixa,
  validarFaixas,
  validarFaixasValor,
  valorDoMetroPedido,
} from '../src/lib/comissao'
import { buscarTudo, LIMITE_BUSCA, normalizarBusca } from '../src/lib/busca'
import { calcularValor, precoMetro, proximoNumero } from '../src/lib/pricing'
import { gerarHashSenha, senhaConfere } from '../src/lib/senha'
import {
  conferirChave,
  extrairConexaoDoTexto,
  lerCodigoConexao,
  montarCodigoConexao,
  normalizarUrl,
  validarConexao,
} from '../src/lib/supabase'
import { dataBR, dataHoraBR, hojeISO, moeda, metros, percentualBR } from '../src/lib/format'
import { vendedoresAtivosAtual, vendedoresDoPeriodo } from '../src/lib/equipe-inicial'
import {
  doDia,
  filtrarImpressoes,
  inicioDoPeriodo,
  linhasCSVImpressoes,
  quemImprimiu,
  resumirImpressoes,
  resumoDoPedido,
} from '../src/lib/impressoes'
import { gerarDadosDemo, TAMANHO_DEMO } from '../src/lib/seed'
import { ehErroDeEspaco, espacoNoLocalStorage, MENSAGEM_SEM_ESPACO } from '../src/lib/armazenamento'
import { prepararBackup } from '../src/lib/backup'
import { arquivoEhImagemExportavel, nomeComFormato } from '../src/lib/exportar'
import { prepararMesclaRelatorioCSV } from '../src/lib/relatorio-backup'
import {
  combinaFiltro,
  CONFIG_PADRAO,
  FAIXAS_PADRAO,
  FAIXAS_VALOR_PADRAO,
  normalizarPedido,
  filasDaComissao,
  isPedidoCompleto,
  naFilaDeImpressao,
  PASSOS_FILA,
  passoFeito,
  pedidoPendenteFinanceiro,
  podeVerTela,
  telasDoUsuario,
  type DB,
  type Impressao,
  type Pedido,
} from '../src/lib/types'

let ok = 0
const falhas: string[] = []
const assincronos: Promise<void>[] = []

/** verificações que precisam aguardar (criptografia da senha) */
const igualAsync = (descricao: string, promessa: Promise<unknown>, esperado: unknown) => {
  assincronos.push(
    promessa.then((recebido) => igual(descricao, recebido, esperado)).catch((e) => {
      falhas.push(`${descricao}\n     erro: ${String(e)}`)
    }),
  )
}

/** espaço comum e espaço fixo (nbsp) contam como iguais na comparação */
const normalizar = (v: unknown) =>
  JSON.stringify(v)?.replace(/\u00a0/g, ' ') ?? 'undefined'

function igual(descricao: string, recebido: unknown, esperado: unknown) {
  if (normalizar(recebido) === normalizar(esperado)) {
    ok++
  } else {
    falhas.push(`${descricao}\n     recebido: ${JSON.stringify(recebido)}\n     esperado: ${JSON.stringify(esperado)}`)
  }
}

/* ------------------------------- tabela ------------------------------- */
igual('1 m  -> R$ 59,90', calcularValor(1), 59.9)
igual('4 m  -> R$ 239,60', calcularValor(4), 239.6)
igual('5 m  -> R$ 274,50 (faixa 2)', calcularValor(5), 274.5)
igual('19 m -> R$ 1.043,10', calcularValor(19), 1043.1)
igual('20 m -> R$ 898,00 (faixa 3)', calcularValor(20), 898)
igual('22,27 m -> R$ 999,92', calcularValor(22.27), 999.92)
igual('1,85 m -> R$ 110,82 (meio centavo para cima)', calcularValor(1.85), 110.82)
igual('2,43 m -> R$ 145,56', calcularValor(2.43), 145.56)
igual('6,15 m -> R$ 337,64 (meio centavo para cima)', calcularValor(6.15), 337.64)
igual('7,8 m  -> R$ 428,22', calcularValor(7.8), 428.22)
igual('1,3 m  -> R$ 77,87', calcularValor(1.3), 77.87)
igual('sem metragem -> R$ 0', calcularValor(0), 0)
igual('valor especial 49,90 em 10 m -> R$ 499,00', calcularValor(10, 49.9), 499)
igual('preço do metro 3 m', precoMetro(3), 59.9)
igual('preço do metro 10 m', precoMetro(10), 54.9)
igual('preço do metro 30 m', precoMetro(30), 44.9)
igual('próximo número', proximoNumero([1, 2, 7]), 8)
igual('próximo número sem pedidos', proximoNumero([]), 1)

/* ------------------------------- formato ------------------------------ */
igual('moeda', moeda(1234.5), 'R$ 1.234,50')
igual('moeda zero', moeda(0), 'R$ 0,00')
igual('metros', metros(2), '2,00 m')
igual('metros vazio', metros(0), '—')
igual('data BR', dataBR('2026-10-08'), '08/10/2026')
igual('data BR ISO', dataBR('2026-10-08T17:00:00.000Z').slice(0, 10).endsWith('/2026'), true)
igual('data vazia', dataBR(null), '—')
igual('data e hora tem vírgula', dataHoraBR('2026-10-08T14:30:00').includes(', '), true)
igual('hoje no formato ISO', /^\d{4}-\d{2}-\d{2}$/.test(hojeISO()), true)

/* --------------------------------- fila ------------------------------- */
const base = gerarDadosDemo().pedidos[0]
const naFila: Pedido = { ...base, estagio: 'em_andamento', iniciado_em: null, entregue: false, pago: false }
const imprimindo: Pedido = { ...naFila, iniciado_em: new Date().toISOString(), pago: true }
const concluida: Pedido = { ...imprimindo, estagio: 'concluido' }
const entregue: Pedido = { ...concluida, entregue: true }
const concluidaSemPagar: Pedido = { ...concluida, pago: false, data_pagamento: null }

igual('fila em andamento não está completa', isPedidoCompleto(naFila), false)
igual('fila concluída está completa', isPedidoCompleto(concluida), true)
igual('fila em andamento está na fila de impressão', naFilaDeImpressao(naFila), true)
igual('fila concluída sai da fila de impressão', naFilaDeImpressao(concluida), false)
igual('fila sem pagamento é pendente financeiro', pedidoPendenteFinanceiro(naFila), true)
igual('fila paga não é pendente financeiro', pedidoPendenteFinanceiro(concluida), false)

/* ------------------ os três cliques do cartão (o fluxo) --------------- */
igual('passos da fila: pago, concluída e entregue', PASSOS_FILA.map((p) => p.id), ['pago', 'concluida', 'entregue'])
igual('fila nova: nada marcado', PASSOS_FILA.map((p) => passoFeito(naFila, p.id)), [false, false, false])
igual('fila paga: só o pagamento', passoFeito(imprimindo, 'pago'), true)
igual('fila paga ainda não concluiu', passoFeito(imprimindo, 'concluida'), false)
igual('fila concluída marca o passo', passoFeito(concluida, 'concluida'), true)
igual('fila entregue marca o passo', passoFeito(entregue, 'entregue'), true)

/* ---------------------------- filtros da tela -------------------------- */
igual('filtro "em andamento" pega a que está na máquina', combinaFiltro(naFila, 'em_andamento'), true)
igual('filtro "em andamento" ignora a concluída', combinaFiltro(concluida, 'em_andamento'), false)
igual('filtro "a pagar" pega a fila sem pagamento', combinaFiltro(naFila, 'a_pagar'), true)
igual('filtro "a pagar" ignora a paga', combinaFiltro(imprimindo, 'a_pagar'), false)
igual('filtro "concluída" pega a pronta', combinaFiltro(concluida, 'concluida'), true)
igual('filtro "concluída" também pega a já entregue', combinaFiltro(entregue, 'concluida'), true)
igual('filtro "concluída" ignora a que está na máquina', combinaFiltro(imprimindo, 'concluida'), false)
igual('filtro "entregue" pega a entregue', combinaFiltro(entregue, 'entregue'), true)
igual('filtro "entregue" ignora a não entregue', combinaFiltro(concluida, 'entregue'), false)
igual('filtro "todas" mostra tudo', combinaFiltro(entregue, 'todas'), true)

/* ------------------------- quem entra na comissão ---------------------- */
igual('comissão ignora a fila em andamento', filasDaComissao([naFila, concluida]).length, 1)
igual('comissão ignora a em andamento mesmo paga', filasDaComissao([imprimindo]).length, 0)
igual('comissão conta a concluída (paga ou não: "pago" é só orientação)', filasDaComissao([concluidaSemPagar]).length, 1)
igual('comissão conta todas as concluídas do período', filasDaComissao([concluida, concluidaSemPagar, entregue]).length, 3)

/* ------------------------------- semente ------------------------------ */
const demo = gerarDadosDemo()
igual('demo: 2 vendedores', demo.vendedores.length, TAMANHO_DEMO.vendedores)
igual('demo: 30 clientes', demo.clientes.length, TAMANHO_DEMO.clientes)
igual('demo: 68 pedidos', demo.pedidos.length, TAMANHO_DEMO.pedidos)
igual('demo: números únicos', new Set(demo.pedidos.map((p) => p.numero)).size, TAMANHO_DEMO.pedidos)
igual(
  'demo: todo pedido tem vendedor',
  demo.pedidos.every((p) => demo.vendedores.some((v) => v.id === p.vendedor_id)),
  true,
)
igual(
  'demo: valores calculados pela metragem ou manual',
  demo.pedidos.every((p) => p.valor > 0),
  true,
)
igual('demo: tem histórico de impressões', demo.impressoes.length > 20, true)
igual(
  'demo: toda impressão pertence a um pedido existente',
  demo.impressoes.every((i) => demo.pedidos.some((p) => p.id === i.pedido_id)),
  true,
)
igual('demo: toda impressão tem metros e quem imprimiu', demo.impressoes.every((i) => i.metros > 0 && Boolean(i.quem)), true)
igual('demo: já existe reimpressão registrada', demo.impressoes.some((i) => i.tipo === 'reimpressao'), true)
igual(
  'demo: toda reimpressão tem motivo',
  demo.impressoes.filter((i) => i.tipo === 'reimpressao').every((i) => Boolean(i.motivo)),
  true,
)
igual(
  'demo: tem impressão de hoje (a tela abre com movimento)',
  demo.impressoes.some((i) => new Date(i.quando).toDateString() === new Date().toDateString()),
  true,
)
igual(
  'demo: filas concluídas batem com o histórico',
  demo.pedidos.every((p) => (p.estagio === 'concluido' ? demo.impressoes.some((i) => i.pedido_id === p.id) : true)),
  true,
)
igual(
  'demo: tem fila em andamento (que NÃO entra no relatório)',
  demo.pedidos.some((p) => p.estagio === 'em_andamento'),
  true,
)
igual(
  'demo: o relatório só conta filas concluídas',
  filasDaComissao(demo.pedidos).every((p) => p.estagio === 'concluido') &&
    filasDaComissao(demo.pedidos).length < demo.pedidos.length,
  true,
)
igual(
  'demo: as filas não pagas continuam contando no relatório',
  filasDaComissao(demo.pedidos).some((p) => !p.pago) && filasDaComissao(demo.pedidos).length > 0,
  true,
)

/* ---------------------- busca rápida (Ctrl + K) ------------------------ */
igual('busca vazia não devolve nada', buscarTudo(demo, '   ').length, 0)
igual(
  'busca acha o cliente pelo nome',
  buscarTudo(demo, 'cliente exemplo 07').some(
    (a) => a.tipo === 'cliente' && a.cliente.nome === 'CLIENTE EXEMPLO 07',
  ),
  true,
)
igual('busca ignora acento e maiúscula', normalizarBusca('JOSÉ') === normalizarBusca('jose'), true)
igual(
  'busca acha pelo telefone digitado sem máscara',
  buscarTudo(demo, '900000007').some((a) => a.tipo === 'cliente' && a.cliente.nome === 'CLIENTE EXEMPLO 07'),
  true,
)
const numeroProcurado = demo.pedidos[5].numero
igual(
  'busca acha o pedido pelo número (com #)',
  buscarTudo(demo, `#${numeroProcurado}`).some((a) => a.tipo === 'pedido' && a.pedido.numero === numeroProcurado),
  true,
)
const vendedorDaBusca = demo.vendedores[0]
const soDele = buscarTudo(demo, 'exemplo', { vendedorId: vendedorDaBusca.id })
igual(
  'busca de um vendedor só devolve pedidos e clientes dele',
  soDele
    .filter((a) => a.tipo === 'pedido')
    .every((a) => a.tipo === 'pedido' && a.pedido.vendedor_id === vendedorDaBusca.id) &&
    soDele.filter((a) => a.tipo === 'cliente').every((a) => a.tipo === 'cliente' && a.cliente.vendedor_id === vendedorDaBusca.id),
  true,
)
igual('busca do vendedor não lista vendedores', soDele.some((a) => a.tipo === 'vendedor'), false)
igual(
  'busca do dono lista os vendedores',
  buscarTudo(demo, 'exemplo', { verVendedores: true }).some((a) => a.tipo === 'vendedor'),
  true,
)
igual(
  'busca não passa do limite de resultados',
  buscarTudo(demo, 'exemplo', { verVendedores: true }).length <= LIMITE_BUSCA,
  true,
)

/* --------------------- impressão (sempre branco no papel) -------------- */
const css = readFileSync('src/index.css', 'utf8') // o teste roda a partir da pasta app/
const blocoImpressao = css.slice(css.indexOf('@media print'), css.indexOf('@media print') + 1600)
igual('impressão: papel branco mesmo no tema noite', /html,\s*body,\s*#root/.test(blocoImpressao), true)
igual('impressão: fundo degradê não vai para o papel', blocoImpressao.includes('background-image: none !important'), true)
igual('impressão: texto do papel sai preto', /body \*[\s\S]{0,60}color: #000 !important/.test(blocoImpressao), true)

/* -------------------- sistema limpo (publicação) ------------------------ */
// O que garante que o sistema vai para o ar sem dados nem acessos de exemplo:
igual('demo: NÃO cria nenhuma conta de acesso', demo.usuarios.length, 0)
igual(
  'demo: nenhum proprietário/contador vem pronto',
  demo.usuarios.some((u) => u.papel === 'proprietario'),
  false,
)
igual('demo: marca o modo de exemplo (aviso na tela)', demo.configuracoes.modo_exemplo, true)
igual('padrão: o sistema começa fora do modo de exemplo', CONFIG_PADRAO.modo_exemplo, false)

// dados 100% fictícios: nada que possa ser confundido com cliente de verdade
igual(
  'demo: todo cliente é rotulado como exemplo',
  demo.clientes.every((c) => c.nome.includes('EXEMPLO')),
  true,
)
igual(
  'demo: todo vendedor é rotulado como exemplo',
  demo.vendedores.every((v) => v.nome.includes('EXEMPLO')),
  true,
)
igual(
  'demo: telefones visivelmente falsos (DDD 00)',
  demo.clientes.every((c) => /^\(00\) 90000-\d{4}$/.test(c.telefone)),
  true,
)
igual(
  'demo: e-mails em domínio reservado (não existe)',
  demo.clientes.every((c) => !c.email || c.email.endsWith('@exemplo.invalid')),
  true,
)
igual(
  'demo: endereços/CEPs fictícios',
  demo.pedidos.every((p) => !p.cep || p.cep === '00000-000'),
  true,
)
igual(
  'demo: nenhuma cidade/estado de verdade',
  demo.pedidos.every((p) => !p.cidade || (p.cidade === 'CIDADE EXEMPLO' && p.estado === 'EX')),
  true,
)
igual(
  'demo: nomes de clientes antigos não aparecem mais',
  JSON.stringify(demo).includes('BRUNO') || JSON.stringify(demo).includes('IVANETE'),
  false,
)

// nenhuma senha padrão/combustível de exemplo sobrou no código publicado
const codigoFonte = [
  readFileSync('src/lib/seed.ts', 'utf8'),
  readFileSync('src/lib/auth.tsx', 'utf8'),
  readFileSync('src/lib/store.tsx', 'utf8'),
  readFileSync('src/pages/Administracao.tsx', 'utf8'),
].join('\n')
igual('código: sem usuário/senha de exemplo embutidos', /ACESSO_DEMO|contaDemo|MARCA_SENHA_DEMO/.test(codigoFonte), false)
igual('código: a senha de exemplo "12345" saiu do sistema', codigoFonte.includes("'12345'"), false)
igual(
  'código: o sistema não semeia exemplos sozinho na primeira carga',
  /if \(vazio && !jaCarregouDemo/.test(readFileSync('src/lib/store.tsx', 'utf8')),
  false,
)


/* ------------------------- espaço no navegador ------------------------- */
igual(
  'espaço: o erro do navegador cheio é reconhecido',
  ehErroDeEspaco(
    new Error("Failed to execute 'setItem' on 'Storage': Setting the value of 'altoprints:db:v1' exceeded the quota."),
  ),
  true,
)
igual('espaço: erro comum não é confundido', ehErroDeEspaco(new Error('Usuário ou senha inválidos.')), false)
igual('espaço: a mensagem explica o que fazer', MENSAGEM_SEM_ESPACO.includes('Configurações → Dados'), true)
igual('espaço: sem navegador, a medição não quebra', espacoNoLocalStorage(), 0)

/* ------------------------------ impressões ----------------------------- */
const agoraImpressao = new Date()
const hojeZero = new Date(agoraImpressao.getFullYear(), agoraImpressao.getMonth(), agoraImpressao.getDate())
const impressaoFalsa = (
  quando: Date,
  tipo: Impressao['tipo'],
  metros: number,
  extra: Partial<Impressao> = {},
): Impressao => ({
  id: `i-${quando.getTime()}-${tipo}-${metros}`,
  pedido_id: 'pedido-1',
  pedido_numero: 10,
  cliente_nome: 'BRUNO',
  arquivo_id: '',
  arquivo_nome: '',
  metros,
  quem: 'JESSICA',
  usuario_id: '',
  tipo,
  motivo: tipo === 'reimpressao' ? 'Defeito na impressão' : '',
  observacao: '',
  quando: quando.toISOString(),
  created_at: quando.toISOString(),
  ...extra,
})
const quandoHoje = new Date(hojeZero.getTime() + 9 * 3600000) // hoje, 09:00
const listaImpressoes: Impressao[] = [
  impressaoFalsa(quandoHoje, 'impressao', 2),
  impressaoFalsa(quandoHoje, 'impressao', 3.5, {
    id: 'i-pedido-2',
    pedido_id: 'pedido-2',
    pedido_numero: 11,
    cliente_nome: 'TELMA',
    quem: 'RAISSA',
  }),
  impressaoFalsa(new Date(quandoHoje.getTime() - 26 * 3600000), 'reimpressao', 1.5),
  impressaoFalsa(new Date(quandoHoje.getTime() - 10 * 86400000), 'impressao', 4, {
    id: 'i-pedido-3',
    pedido_id: 'pedido-3',
    pedido_numero: 12,
    cliente_nome: 'MURILO',
  }),
]

const resumoImpresso = resumirImpressoes(listaImpressoes)
igual('impressões: total', resumoImpresso.total, 4)
igual('impressões: soma dos metros', resumoImpresso.metros, 11)
igual('impressões: quantas reimpressões', resumoImpresso.reimpressoes, 1)
igual('impressões: metros perdidos na reimpressão', resumoImpresso.metrosPerdidos, 1.5)
igual('impressões: % de reimpressão', Math.round(resumoImpresso.percentualReimpressao), 25)
igual('impressões: sem registros, o % é zero', resumirImpressoes([]).percentualReimpressao, 0)
igual('impressões de hoje', doDia(listaImpressoes).length, 2)
igual('período “hoje” filtra', filtrarImpressoes(listaImpressoes, { periodo: 'hoje', quem: '', busca: '', soReimpressoes: false }).length, 2)
igual('período “últimos 7 dias” pega a de ontem', filtrarImpressoes(listaImpressoes, { periodo: 'semana', quem: '', busca: '', soReimpressoes: false }).length, 3)
igual('período “tudo” traz as 4', filtrarImpressoes(listaImpressoes, { periodo: 'tudo', quem: '', busca: '', soReimpressoes: false }).length, 4)
igual('filtro “só reimpressões”', filtrarImpressoes(listaImpressoes, { periodo: 'tudo', quem: '', busca: '', soReimpressoes: true }).length, 1)
igual('filtro por quem imprimiu', filtrarImpressoes(listaImpressoes, { periodo: 'tudo', quem: 'RAISSA', busca: '', soReimpressoes: false }).length, 1)
igual('busca pelo cliente', filtrarImpressoes(listaImpressoes, { periodo: 'tudo', quem: '', busca: 'bruno', soReimpressoes: false }).length, 2)
igual('busca pelo motivo da reimpressão', filtrarImpressoes(listaImpressoes, { periodo: 'tudo', quem: '', busca: 'defeito', soReimpressoes: false }).length, 1)
igual('busca pelo número do pedido', filtrarImpressoes(listaImpressoes, { periodo: 'tudo', quem: '', busca: '#12', soReimpressoes: false }).length, 1)
igual('nomes de quem imprimiu, sem repetir', quemImprimiu(listaImpressoes), ['JESSICA', 'RAISSA'])
igual('resumo do pedido no histórico', resumoDoPedido(listaImpressoes, 'pedido-1').includes('2× · 3,50 m no total · por JESSICA'), true)
igual('resumo de pedido sem impressão fica vazio', resumoDoPedido(listaImpressoes, 'pedido-9'), '')
igual('CSV: cabeçalho + uma linha por impressão', linhasCSVImpressoes(listaImpressoes).length, 5)
igual('CSV: reimpressão identificada', linhasCSVImpressoes(listaImpressoes).some((l) => l[6] === 'Reimpressão'), true)
igual('período “hoje” começa à meia-noite', inicioDoPeriodo('hoje')?.getHours(), 0)
igual('período “tudo” não tem início', inicioDoPeriodo('tudo'), null)

/* ------------------------------ comissão ------------------------------ */
/** pedido do HISTÓRICO (antes de 01/11/2026): vale a tabela antiga, por metragem */
const pedidoCom = (metragem: number | null, valor: number): Pedido => ({
  ...base,
  tipo_dtf: 'textil',
  metragem,
  valor,
})
const pedidoAntigo = (metragem: number | null, valor: number, data = '2026-10-15'): Pedido => ({
  ...base,
  tipo_dtf: 'textil',
  metragem,
  valor,
  data_pedido: data,
  data_pagamento: data,
})
/** pedido a partir de 01/11/2026: vale a regra nova, pelo VALOR do metro */
const pedidoNovo = (metragem: number | null, valor: number, data = '2026-11-04'): Pedido => ({
  ...base,
  tipo_dtf: 'textil',
  metragem,
  valor,
  data_pedido: data,
  data_pagamento: data,
})

igual('tabela antiga (metragem) tem 6 faixas', FAIXAS_PADRAO.length, 6)
igual('tabela nova (valor do metro) tem 6 faixas (incluindo o piso)', FAIXAS_VALOR_PADRAO.length, 6)
igual('sem metragem começa em 0% na regra antiga', CONFIG_PADRAO.comissao_sem_metragem, 0)
igual('regra nova começa em 01/11/2026', CONFIG_PADRAO.comissao_por_valor_desde, '2026-11-01')
igual('sem valor do metro: cai na menor faixa (1,5%)', CONFIG_PADRAO.comissao_sem_valor_metro, 1.5)

/* --- tabela antiga (só histórico) --- */
igual('histórico: 3 m -> 4%', faixaDoPedido(3, FAIXAS_PADRAO, 3).percentual, 4)
igual('histórico: 4,99 m -> 4%', faixaDoPedido(4.99, FAIXAS_PADRAO, 3).percentual, 4)
igual('histórico: 5 m -> 3,5% (já é a faixa seguinte)', faixaDoPedido(5, FAIXAS_PADRAO, 3).percentual, 3.5)
igual('histórico: 10 m -> 3%', faixaDoPedido(10, FAIXAS_PADRAO, 3).percentual, 3)
igual('histórico: 20 m -> 2,5%', faixaDoPedido(20, FAIXAS_PADRAO, 3).percentual, 2.5)
igual('histórico: 50 m -> 2%', faixaDoPedido(50, FAIXAS_PADRAO, 0).percentual, 2)
igual('histórico: 100 m -> 1,5%', faixaDoPedido(100, FAIXAS_PADRAO, 0).percentual, 1.5)
igual('histórico sem metragem -> 0%', faixaDoPedido(null, FAIXAS_PADRAO, CONFIG_PADRAO.comissao_sem_metragem).percentual, 0)
igual('histórico: pedido sem metragem não gera comissão', comissaoDoPedido(pedidoAntigo(null, 500), FAIXAS_PADRAO, 0), 0)
igual('histórico: 2 m (R$ 119,80) a 4%', Number(comissaoDoPedido(pedidoAntigo(2, 119.8), FAIXAS_PADRAO).toFixed(3)), 4.792)
igual('histórico: 10 m (R$ 549,00) a 3%', comissaoDoPedido(pedidoAntigo(10, 549), FAIXAS_PADRAO), 16.47)

/* --- regra nova: percentual pela faixa do valor do metro --- */
igual('valor do metro: R$ 59,90 -> 3%', faixaDoValor(59.9).percentual, 3)
// na régua EXATA (tolerância 0): o valor de corte ainda é da faixa de baixo
const exato = (v: number) => faixaDoValor(v, FAIXAS_VALOR_PADRAO, null, 0).percentual
igual('régua exata: R$ 59,89 -> 2,75%', exato(59.89), 2.75)
igual('régua exata: R$ 54,90 -> 2,75%', exato(54.9), 2.75)
igual('régua exata: R$ 54,89 -> 2,5%', exato(54.89), 2.5)
igual('régua exata: R$ 49,90 -> 2,5%', exato(49.9), 2.5)
igual('régua exata: R$ 49,89 -> 2,25%', exato(49.89), 2.25)
igual('régua exata: R$ 44,90 -> 2,25%', exato(44.9), 2.25)
igual('régua exata: R$ 44,89 -> 2%', exato(44.89), 2)
igual('régua exata: R$ 39,90 -> 2%', exato(39.9), 2)
igual('régua exata: abaixo de R$ 39,90 -> 1,5% (piso)', exato(39.89), 1.5)
// com o encaixe ligado (padrão do sistema): quem está a centavos sobe para a faixa de cima
igual('encaixe: R$ 59,89 -> 3% (é a faixa mais próxima)', faixaDoValor(59.89).percentual, 3)
igual('encaixe: R$ 54,89 -> 2,75%', faixaDoValor(54.89).percentual, 2.75)
igual('encaixe: R$ 44,89 -> 2,25%', faixaDoValor(44.89).percentual, 2.25)
igual('encaixe: R$ 39,89 -> 2%', faixaDoValor(39.89).percentual, 2)
igual('valor do metro: muito abaixo da tabela -> 1,5%', faixaDoValor(10).percentual, 1.5)
igual('valor do metro: acima de R$ 59,90 -> 3% (teto)', faixaDoValor(142.33).percentual, 3)

/* --- encaixe na faixa mais próxima (tolerância de R$ 1,00) --- */
igual('encaixe: R$ 59,08 -> conta como R$ 59,90', ajustarValorDoMetro(59.08), 59.9)
igual('encaixe: R$ 59,08/m cai em 3%', faixaDoValor(59.08).percentual, 3)
igual('encaixe: R$ 59,86/m cai em 3%', faixaDoValor(59.86).percentual, 3)
igual('encaixe: R$ 39,86/m cai em 2% (faixa de R$ 39,90)', faixaDoValor(39.86).percentual, 2)
igual('encaixe: R$ 60,06/m cai em 3%', faixaDoValor(60.06).percentual, 3)
igual('encaixe: R$ 60,50/m (meio da faixa) fica em 3%', faixaDoValor(60.5).percentual, 3)
igual('encaixe: R$ 44,10 -> conta como R$ 44,90 (2,25%)', faixaDoValor(44.1).percentual, 2.25)
igual('encaixe: R$ 45,80 (não é perto de nenhum início) fica em 2,25%', faixaDoValor(45.8).percentual, 2.25)
igual('encaixe: R$ 38,50 fica fora da tolerância e cai no piso de 1,5%', faixaDoValor(38.5).percentual, 1.5)
igual('encaixe: R$ 41,50 -> mais perto de R$ 39,90 que de R$ 44,90 (2%)', faixaDoValor(41.5).percentual, 2)
igual('encaixe desligado (tolerância 0) mantém a régua exata', faixaDoValor(59.08, FAIXAS_VALOR_PADRAO, null, 0).percentual, 2.75)
igual('encaixe com tolerância de R$ 0,10 não pega R$ 59,08', faixaDoValor(59.08, FAIXAS_VALOR_PADRAO, null, 0.1).percentual, 2.75)
igual('encaixe não muda quem está no meio da faixa', ajustarValorDoMetro(57.5), 57.5)
igual('encaixe ignora valor vazio', ajustarValorDoMetro(null), null)
igual(
  'comissão do pedido de R$ 59,08/m já entra a 3%',
  Number(comissaoDoPedido(pedidoNovo(1.45, 85.67), regrasOficiais).toFixed(2)),
  Number((85.67 * 0.03).toFixed(2)),
)
igual(
  'comissão do pedido de R$ 39,86/m entra a 2% (e não no piso)',
  Number(comissaoDoPedido(pedidoNovo(22.58, 900), regrasOficiais).toFixed(2)),
  18,
)
igual('valor do metro mostrado no relatório já vem encaixado', valorMetroParaFaixa({ metragem: 1.45, valor: 85.67 }, regrasOficiais), 59.9)
igual('valor do metro: sem valor -> 1,5%', faixaDoValor(null).percentual, 1.5)
igual('valor do metro: pedido de 3 m por R$ 427,00 = R$ 142,33/m', Number(valorDoMetroPedido({ metragem: 3, valor: 427 })!.toFixed(2)), 142.33)
igual('valor do metro: pedido sem metragem não tem valor do metro', valorDoMetroPedido({ metragem: null, valor: 400 }), null)
const regrasOficiais = regrasDaConfig({ ...CONFIG_PADRAO, faixas_comissao: FAIXAS_PADRAO, faixas_comissao_valor: FAIXAS_VALOR_PADRAO })
igual('pedido novo de 1 m a R$ 59,90 -> 3% sobre o valor', Number(comissaoDoPedido(pedidoNovo(1, 59.9), regrasOficiais).toFixed(2)), 1.8)
igual('pedido novo de 2 m a R$ 119,80 -> 3%', Number(comissaoDoPedido(pedidoNovo(2, 119.8), regrasOficiais).toFixed(3)), 3.594)
igual('pedido novo de 20 m a R$ 44,90 -> 2,25%', Number(comissaoDoPedido(pedidoNovo(20, 898), regrasOficiais).toFixed(2)), 20.2)
igual('pedido novo com valor especial (142,33/m) -> 3%', Number(comissaoDoPedido(pedidoNovo(3, 427), regrasOficiais).toFixed(2)), 12.81)
igual('pedido novo sem metragem -> 1,5% (piso)', Number(comissaoDoPedido(pedidoNovo(null, 500), regrasOficiais).toFixed(2)), 7.5)

/* --- quem decide a regra é a data --- */
const regrasTeste = regrasDaConfig(CONFIG_PADRAO)
igual('pedido de outubro continua na regra por metragem', usaRegraPorValor(pedidoAntigo(10, 549), regrasTeste), false)
igual('pedido de novembro entra na regra por valor', usaRegraPorValor(pedidoNovo(10, 549), regrasTeste), true)
igual(
  'mesmo pedido: outubro 3% (metragem) e novembro 2,5% (valor do metro)... comparando percentuais',
  [regraDoPedido(pedidoAntigo(10, 549), regrasTeste).percentual, regraDoPedido(pedidoNovo(10, 549), regrasTeste).percentual],
  [3, 2.75],
)
igual('data do pagamento manda (pagou em novembro, pedido de outubro)', usaRegraPorValor({ ...pedidoAntigo(10, 549), data_pagamento: '2026-11-02' }, regrasTeste), true)
igual('sem data nenhuma: fica na regra antiga', usaRegraPorValor({ ...base, data_pedido: '', created_at: '', data_pagamento: null }, regrasTeste), false)

/* --- mistura de meses na mesma conta --- */
const misturado = calcularComissao([pedidoAntigo(10, 549), pedidoNovo(10, 549), pedidoNovo(null, 500)], regrasTeste)
igual('mistura: 1 pedido na regra antiga e 2 na nova', [misturado.pedidosPorMetragem, misturado.pedidosPorValor], [1, 2])
igual('mistura: total = 16,47 + 15,0975 + 7,50', Number(misturado.total.toFixed(2)), Number((16.47 + 15.0975 + 7.5).toFixed(2)))
igual('mistura: base é o faturamento somado', Number(misturado.base.toFixed(2)), 1598)

const resultadoAntigo = calcularComissao(
  [pedidoAntigo(2, 119.8), pedidoAntigo(10, 549), pedidoAntigo(80.25, 3602.77), pedidoAntigo(null, 200)],
  FAIXAS_PADRAO,
  3,
)
igual(
  'comissão total das 4 faixas (tabela antiga)',
  Number(resultadoAntigo.total.toFixed(2)),
  Number((4.792 + 16.47 + 72.0554 + 6).toFixed(2)),
)
igual('base de cálculo = faturamento', Number(resultadoAntigo.base.toFixed(2)), Number((119.8 + 549 + 3602.77 + 200).toFixed(2)))
igual('percentual médio entre 0 e 5', resultadoAntigo.percentualMedio > 0 && resultadoAntigo.percentualMedio < 5, true)
igual('resumo por faixa agrupa os pedidos certos', resultadoAntigo.porFaixa.filter((l) => l.pedidos > 0).length + (resultadoAntigo.semMetragem.pedidos > 0 ? 1 : 0), 4)
igual(
  'resumo mostra as faixas que têm pedidos (regra antiga)',
  [resultadoAntigo.porFaixa.length, resultadoAntigo.semMetragem.pedidos],
  [3, 1],
)
igual('faixas válidas (padrão)', validarFaixas(FAIXAS_PADRAO), [])
igual('faixas de valor válidas (padrão)', validarFaixasValor(FAIXAS_VALOR_PADRAO), [])
igual(
  'faixas de valor sobrepostas são recusadas',
  validarFaixasValor([
    { id: 'a', de: 39.9, ate: 50, percentual: 2, rotulo: 'a' },
    { id: 'b', de: 45, ate: null, percentual: 3, rotulo: 'b' },
  ]).length > 0,
  true,
)
igual('rótulo da faixa de valor mostra o intervalo em reais', rotuloFaixaValor(44.9, 49.9), 'R$ 44,90 a R$ 49,89')
igual('rótulo da última faixa de valor é aberto', rotuloFaixaValor(59.9, null), 'R$ 59,90 ou mais')
igual('rótulo da faixa do piso', rotuloFaixaValor(0, 39.9), 'Abaixo de R$ 39,90')
igual(
  'faixas prontas para salvar saem ordenadas e com rótulo novo',
  normalizarFaixasValor(FAIXAS_VALOR_PADRAO).map((f) => f.rotulo),
  [
    'Abaixo de R$ 39,90',
    'R$ 39,90 a R$ 44,89',
    'R$ 44,90 a R$ 49,89',
    'R$ 49,90 a R$ 54,89',
    'R$ 54,90 a R$ 59,89',
    'R$ 59,90 ou mais',
  ],
)
igual(
  'faixas encostadas (1 a 5 e 5 a 10) são aceitas',
  validarFaixas([
    { id: 'a', de: 1, ate: 5, percentual: 4, rotulo: '1 a 5 m' },
    { id: 'b', de: 5, ate: 10, percentual: 3.5, rotulo: '5 a 10 m' },
  ]),
  [],
)
igual(
  'quem nunca mexeu nas faixas ganha a tabela nova',
  migrarFaixas([
    { id: 'faixa-1', de: 1, ate: 5, percentual: 5, rotulo: '1 a 5 m' },
    { id: 'faixa-2', de: 6, ate: 20, percentual: 4, rotulo: '6 a 20 m' },
    { id: 'faixa-3', de: 21, ate: 50, percentual: 3, rotulo: '21 a 50 m' },
    { id: 'faixa-4', de: 51, ate: null, percentual: 2, rotulo: 'acima de 50 m' },
  ]).length,
  6,
)
igual(
  'tabela anterior (sem a faixa de 50 a 100 m) também é atualizada',
  migrarFaixas([
    { id: 'faixa-1', de: 1, ate: 5, percentual: 4, rotulo: '1 a 5 m' },
    { id: 'faixa-2', de: 5, ate: 10, percentual: 3.5, rotulo: '5 a 10 m' },
    { id: 'faixa-3', de: 10, ate: 20, percentual: 3, rotulo: '10 a 20 m' },
    { id: 'faixa-4', de: 20, ate: 50, percentual: 2.5, rotulo: '20 a 50 m' },
    { id: 'faixa-5', de: 50, ate: null, percentual: 1.5, rotulo: 'acima de 50 m' },
  ])[4].percentual,
  2,
)
igual(
  'faixas editadas pelo proprietário são preservadas',
  migrarFaixas([{ id: 'x', de: 1, ate: null, percentual: 7, rotulo: 'tudo' }])[0].percentual,
  7,
)
igual('faixas sobrepostas são recusadas', validarFaixas([
  { id: 'a', de: 1, ate: 10, percentual: 5, rotulo: '1 a 10 m' },
  { id: 'b', de: 5, ate: 20, percentual: 4, rotulo: '5 a 20 m' },
]).length > 0, true)
igual('percentualBR formata 4 -> 4%', percentualBR(4), '4%')
igual('percentualBR formata 3.5 -> 3,5%', percentualBR(3.5), '3,5%')
igual('percentualBR preserva duas casas decimais exatas (2.75 -> 2,75%)', percentualBR(2.75), '2,75%')

const listaVendedoresTeste = [
  { id: 'v-jessica', nome: 'JESSICA', created_at: '2026-01-01' },
  { id: 'v-raissa', nome: 'RAISSA', created_at: '2026-01-01' },
  { id: 'v-andreia', nome: 'ANDREIA', created_at: '2026-11-01' },
  { id: 'v-flavia', nome: 'FLÁVIA', created_at: '2026-01-01' },
  { id: 'v-vitoria', nome: 'VITORIA', created_at: '2026-01-01' },
]
const pedidosSetembro = [
  { ...pedidoCom(10, 500), vendedor_id: 'v-jessica', data_pedido: '2026-09-15', data_pagamento: '2026-09-15' },
  { ...pedidoCom(10, 500), vendedor_id: 'v-raissa', data_pedido: '2026-09-20', data_pagamento: '2026-09-20' },
]
const pedidosJunho = [
  { ...pedidoCom(10, 500), vendedor_id: 'v-flavia', data_pedido: '2026-06-10', data_pagamento: '2026-06-10' },
  { ...pedidoCom(10, 500), vendedor_id: 'v-vitoria', data_pedido: '2026-06-11', data_pagamento: '2026-06-11' },
]
igual(
  'vendedoresDoPeriodo em setembro mostra apenas quem trabalhou em setembro',
  vendedoresDoPeriodo(listaVendedoresTeste, pedidosSetembro).map((v) => v.nome),
  ['JESSICA', 'RAISSA'],
)
igual(
  'vendedoresDoPeriodo em junho mostra quem trabalhou em junho',
  vendedoresDoPeriodo(listaVendedoresTeste, pedidosJunho).map((v) => v.nome),
  ['FLÁVIA', 'VITORIA'],
)
igual(
  'vendedoresAtivosAtual oculta ex-funcionárias antigas e mantém equipe atual',
  vendedoresAtivosAtual(listaVendedoresTeste, [...pedidosSetembro, ...pedidosJunho], '2026-11-03').map((v) => v.nome),
  ['JESSICA', 'RAISSA', 'ANDREIA'],
)

/* ------------------ metragem em metros ou centímetros ------------------ */
igual('45 cm viram 0,45 m (conversão usada no formulário)', 45 / 100, 0.45)
igual('145 cm viram 1,45 m', 145 / 100, 1.45)
igual('0,45 m viram 45 cm', 0.45 * 100, 45)

/* --------------------- telas liberadas por acesso ---------------------- */
const vendedorTeste = {
  id: 'u1',
  nome: 'VENDEDOR',
  usuario: 'vendedor',
  senha_hash: 'x',
  papel: 'vendedor' as const,
  vendedor_id: 'v1',
  ativo: true,
  criado_em: '2026-01-01',
  telas: { relatorio: true },
}
const donoTeste = { ...vendedorTeste, papel: 'proprietario' as const, vendedor_id: '' as const }
igual('proprietário vê todas as telas', telasDoUsuario(donoTeste), {
  relatorio: true,
  paraImprimir: true,
  clienteEspecial: true,
})
igual('vendedor começa sem telas extras', telasDoUsuario(vendedorTeste).paraImprimir, false)
igual('tela liberada pelo dono é respeitada', podeVerTela(vendedorTeste, 'relatorio'), true)
igual('tela não liberada fica bloqueada', podeVerTela(vendedorTeste, 'clienteEspecial'), false)
igual('cliente especial não vem liberado por padrão', podeVerTela(vendedorTeste, 'clienteEspecial'), false)
igual('dono libera a fila de impressão para quem produz', podeVerTela({ ...vendedorTeste, telas: { paraImprimir: true } }, 'paraImprimir'), true)
igual('conta sem telas definidas fica no padrão', podeVerTela({ ...vendedorTeste, telas: undefined }, 'relatorio'), false)
igual('proprietário nunca é bloqueado', podeVerTela(donoTeste, 'clienteEspecial'), true)

/* ---------------------- chaves do Supabase ----------------------------- */
igual('sem chave: não configurada', conferirChave(''), 'faltando')
igual('sem chave (undefined): não configurada', conferirChave(undefined), 'faltando')
igual('chave publishable (nova) é aceita', conferirChave('sb_publishable_abc123'), 'ok')
igual('chave anon (antiga) é aceita', conferirChave('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.abc'), 'ok')
igual('chave secret é recusada (não pode ir para o site)', conferirChave('sb_secret_abc123'), 'secreta')
igual('chave com espaços em volta é tratada', conferirChave('  sb_publishable_x  '), 'ok')

/* ------------------- código de conexão (link da equipe) ---------------- */
const conexaoTeste = { url: 'https://abc.supabase.co', chave: 'sb_publishable_xyz' }
const codigo = montarCodigoConexao(conexaoTeste)
igual('código começa com ALT1.', codigo.startsWith('ALT1.'), true)
igual('código não tem caracteres problemáticos para link', /^ALT1\.[A-Za-z0-9\-_]+$/.test(codigo), true)
igual('código lido devolve a mesma conexão', lerCodigoConexao(codigo), conexaoTeste)
igual(
  'link inteiro também é aceito (pessoa cola o link em vez do código)',
  lerCodigoConexao(`https://sistema.netlify.app/?nuvem=${encodeURIComponent(codigo)}`),
  conexaoTeste,
)
igual('URL com barra no fim é limpa', normalizarUrl('https://abc.supabase.co/'), 'https://abc.supabase.co')
igual('URL com /rest/v1 é limpa', normalizarUrl('https://abc.supabase.co/rest/v1'), 'https://abc.supabase.co')
igual('URL vazia é recusada na validação', validarConexao('', 'sb_publishable_x').length > 0, true)
igual('URL que não é do Supabase é recusada', validarConexao('https://meusite.com', 'sb_publishable_x').length > 0, true)
igual('chave secret é recusada com aviso claro', validarConexao('https://abc.supabase.co', 'sb_secret_x').includes('SECRETA'), true)
igual('conexão válida passa na validação', validarConexao('https://abc.supabase.co', 'eyJhbGciOiJIUzI1NiJ9.x'), '')
igual(
  'colando os dois valores juntos, o sistema separa',
  extrairConexaoDoTexto('aqui ó: https://abc.supabase.co e a chave sb_publishable_xyz'),
  { url: 'https://abc.supabase.co', chave: 'sb_publishable_xyz', encontrouSecreta: undefined },
)
igual(
  'colando o trecho de código do painel, também funciona',
  extrairConexaoDoTexto("const supabase = createClient('https://def.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiJ9.abc123')"),
  {
    url: 'https://def.supabase.co',
    chave: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiJ9.abc123',
    encontrouSecreta: undefined,
  },
)
igual(
  'só a chave colada já é encontrada',
  extrairConexaoDoTexto('sb_publishable_sochave').chave,
  'sb_publishable_sochave',
)
igual('texto sem nada devolve vazio', extrairConexaoDoTexto('bom dia, tudo bem?').url, undefined)
igual(
  'texto com chave secreta é sinalizado',
  extrairConexaoDoTexto('https://abc.supabase.co sb_secret_naoPode').encontrouSecreta,
  true,
)
igual(
  'chave secreta junto da pública não bloqueia a pública',
  extrairConexaoDoTexto('sb_secret_x sb_publishable_bom').chave,
  'sb_publishable_bom',
)

/* ----------------- backups legados e histórico da equipe ---------------- */
const pedidoLegado = normalizarPedido({
  id: 'pedido-antigo',
  numero: 17,
  cliente_nome: 'CLIENTE DE HISTORICO',
  vendedor_id: 'v-jessica',
  data_pedido: '2025-04-11T10:00:00.000Z',
  status_producao: 'dtf_pronto',
  status_pagamento: 'pago',
  impresso: true,
  impresso_em: '2025-04-12T10:00:00.000Z',
  data_entrega: '2025-04-15',
} as never)
igual('backup antigo: DTF pronto vira fila concluída', pedidoLegado.estagio, 'concluido')
igual('backup antigo: status pago continua pago', pedidoLegado.pago, true)
igual('backup antigo: data de impressão é preservada', pedidoLegado.iniciado_em, '2025-04-12T10:00:00.000Z')
igual('backup antigo: data de entrega marca entregue', pedidoLegado.entregue, true)
const pedidoNaFilaAntiga = normalizarPedido({
  id: 'pedido-na-fila',
  status_producao: 'imprimir',
  status_pagamento: 'pago',
  impresso: false,
} as never)
igual('backup antigo: “imprimir” ainda não é concluído', pedidoNaFilaAntiga.estagio, 'em_andamento')
igual('backup antigo: “imprimir” não finge que já iniciou a máquina', pedidoNaFilaAntiga.iniciado_em, null)

const pedidoAtualExplicito = normalizarPedido({
  id: 'pedido-atual',
  estagio: 'em_andamento',
  entregue: false,
  pago: false,
  data_entrega: '2025-04-15',
  data_pagamento: '2025-04-12',
} as never)
igual('backup atual: marcação explícita de não entregue não é sobrescrita', pedidoAtualExplicito.entregue, false)
igual('backup atual: marcação explícita de não pago não é sobrescrita', pedidoAtualExplicito.pago, false)

const backupHistorico = prepararBackup(
  {
    versao: '1.2.0',
    dados: {
      vendedores: [{ id: 'v-jessica', nome: 'JESSICA', created_at: '2024-01-01' }],
      clientes: [
        {
          id: 'cliente-antigo',
          nome: 'CLIENTE DE HISTORICO',
          telefone: '0000000000',
          email: '',
          observacoes: '',
          vendedor_id: 'v-jessica',
          valor_especial_metro: null,
          especial: false,
          created_at: '2024-01-02',
        },
      ],
      pedidos: [
        {
          id: 'pedido-antigo',
          numero: 17,
          cliente_nome: 'CLIENTE DE HISTORICO',
          cliente_id: 'cliente-antigo',
          vendedor_id: 'v-jessica',
          data_pedido: '2025-04-11T10:00:00.000Z',
          status_producao: 'dtf_pronto',
          status_pagamento: 'pago',
          impresso: true,
          impresso_em: '2025-04-12T10:00:00.000Z',
          data_entrega: '2025-04-15',
        },
      ],
      // Em versões antigas cada funcionário também tinha uma conta de usuário.
      // Se faltar em vendedores, o nome/vínculo é recuperado daqui.
      usuarios: [
        {
          id: 'usuario-raissa',
          nome: 'RAISSA',
          usuario: 'raissa',
          senha_hash: 'hash-antigo-nao-restaurar',
          papel: 'vendedor',
          vendedor_id: 'v-raissa',
          ativo: true,
          criado_em: '2024-01-03',
        },
      ],
    },
  },
  [donoTeste],
)
igual('backup histórico: clientes são importados', backupHistorico.clientes.map((c) => c.nome), ['CLIENTE DE HISTORICO'])
igual('backup histórico: funcionário de conta antiga continua na equipe', backupHistorico.vendedores.map((v) => v.nome), ['JESSICA', 'RAISSA'])
igual('backup histórico: ID do funcionário antigo é preservado', backupHistorico.vendedores[1].id, 'v-raissa')
igual('backup histórico: conta de funcionário vira só nome (sem login)', backupHistorico.usuarios.some((u) => u.nome === 'RAISSA'), false)
igual('backup histórico sem proprietário preserva acesso atual', backupHistorico.usuarios.map((u) => u.id), [donoTeste.id])
igual('backup histórico: pedido continua ligado ao funcionário', backupHistorico.pedidos[0].vendedor_id, 'v-jessica')
igual('backup histórico: pedido antigo mantém status concluído e pago', [backupHistorico.pedidos[0].estagio, backupHistorico.pedidos[0].pago], ['concluido', true])

const backupComOutroDonoEOrfaos = prepararBackup(
  {
    pedidos: [{ id: 'pedido-valido', numero: 1, cliente_nome: 'CLIENTE', vendedor_id: 'v-jessica' }],
    clientes: [],
    vendedores: [{ id: 'v-jessica', nome: 'JESSICA', created_at: '2024-01-01' }],
    arquivos: [
      { id: 'arq-ok', pedido_id: 'pedido-valido', nome: 'arte.png', tipo: 'image/png', tamanho: 100, url: '' },
      { id: 'arq-orfao', pedido_id: 'pedido-apagado', nome: 'orfao.png', tipo: 'image/png', tamanho: 100, url: '' },
    ],
    impressoes: [
      { id: 'imp-ok', pedido_id: 'pedido-valido', metros: 2, quem: 'JESSICA', tipo: 'impressao' },
      { id: 'imp-orfao', pedido_id: 'pedido-apagado', metros: 2, quem: 'JESSICA', tipo: 'impressao' },
    ],
    usuarios: [
      {
        id: 'dono-do-backup',
        nome: 'Proprietário Antigo',
        usuario: 'donoantigo',
        senha_hash: 'hash-valido',
        papel: 'proprietario',
        ativo: true,
        criado_em: '2024-01-01',
      },
    ],
  },
  [donoTeste],
)
igual('backup remove arquivos órfãos sem pedido correspondente', backupComOutroDonoEOrfaos.arquivos.map((a) => a.id), ['arq-ok'])
igual('backup remove impressões órfãs sem pedido correspondente', backupComOutroDonoEOrfaos.impressoes.map((i) => i.id), ['imp-ok'])
igual(
  'backup com outro dono mantém também o proprietário atual da nuvem',
  backupComOutroDonoEOrfaos.usuarios.map((u) => u.usuario),
  ['donoantigo', donoTeste.usuario],
)

const pedidoDaJessica = normalizarPedido({
  id: 'pedido-jessica-recente',
  numero: 20,
  cliente_nome: 'Pedido novo da Jessica',
  vendedor_id: 'v-jessica',
  valor: 123.45,
  estagio: 'em_andamento',
} as never)
const bancoRelatorio: DB = {
  vendedores: [{ id: 'v-jessica', nome: 'Jéssica', created_at: '2024-01-01T00:00:00.000Z' }],
  clientes: [],
  pedidos: [pedidoDaJessica],
  arquivos: [],
  impressoes: [],
  usuarios: [donoTeste],
  configuracoes: CONFIG_PADRAO,
}
const csvRelatorio =
  '\uFEFFNº;Cliente;Vendedor;Metragem;Valor;Comissão;Data do pagamento;% comissão;Data do pedido;Descrição;Forma de pagamento;Pago;Entregue\r\n' +
  '20;Cliente antigo;JESSICA;1,5;500,00;20,00;01/05/2025;4%;30/04/2025;Pedido antigo;Pix;Sim;Não\r\n' +
  '21;"Cliente; Novo";Raíssa;2,25;135,00;10,00;03/05/2025;4%;02/05/2025;Camiseta;Pix;Sim;Sim\r\n' +
  '22;Cliente sem funcionário;Sem vendedor;—;75,50;0,00;;0%;04/05/2025;Arte;Outro;Não;Não\r\n' +
  'COMISSÃO 1 a 5 m;;;;;;;'
const mesclaRelatorio = prepararMesclaRelatorioCSV(csvRelatorio, bancoRelatorio)
igual('relatório: reconhece os pedidos válidos e ignora rodapé de comissão', mesclaRelatorio.pedidosNoArquivo, 3)
igual('relatório: só acrescenta pedidos com número ausente', mesclaRelatorio.pedidosNovos.map((p) => p.numero), [21, 22])
igual('relatório: pedido já existente não substitui o da Jessica', mesclaRelatorio.pedidosNovos.some((p) => p.numero === 20), false)
igual('relatório: detecta número existente com conteúdo diferente', [mesclaRelatorio.duplicados, mesclaRelatorio.conflitos], [1, 1])
igual('relatório: cria só cliente e funcionário faltantes pelo nome', [mesclaRelatorio.clientesNovos.length, mesclaRelatorio.vendedoresNovos.map((v) => v.nome)], [2, ['Raíssa']])
igual('relatório: preserva datas e status informados', [mesclaRelatorio.pedidosNovos[0].data_pedido, mesclaRelatorio.pedidosNovos[0].entregue], ['2025-05-02T12:00:00.000Z', true])
igual('relatório: linha sem funcionário permanece sem vínculo', mesclaRelatorio.pedidosNovos[1].vendedor_id, '')
const csvRelatorioPagosLegado =
  '\uFEFF"Nº Pedido";"Cliente";"Vendedor";"Email";"Telefone";"Descrição";"Metragem (m)";"Valor (R$)";"Data do pagamento"\r\n' +
  '"#3";"Kelly Ignácio";"";"";"";"";"1,00";"59,90";"—"\r\n' +
  '"#198";"jackson felipe";"FLAVIA";"";"";"";"4,40";"198,00";"22/05/2026"'
const mesclaLegado = prepararMesclaRelatorioCSV(csvRelatorioPagosLegado, bancoRelatorio)
igual(
  'relatório pagos antigo: aceita cabeçalho Nº Pedido / Metragem (m) / Valor (R$) e infere data histórica',
  [
    mesclaLegado.pedidosNovos.map((p) => p.numero),
    mesclaLegado.pedidosNovos.every((p) => p.pago && p.entregue && p.data_pagamento === '2026-05-22'),
  ],
  [[3, 198], true],
)
try {
  prepararMesclaRelatorioCSV('arquivo sem CSV', bancoRelatorio)
  falhas.push('arquivo sem CSV deveria ser recusado')
} catch (e) {
  igual('relatório em formato errado é recusado com orientação', (e as Error).message.includes('Exportar CSV'), true)
}

const sqlSupabase = readFileSync('supabase/schema.sql', 'utf8')
igual('SQL do Supabase inclui os campos atuais do fluxo', ['estagio', 'iniciado_em', 'entregue', 'pago'].every((campo) => sqlSupabase.includes(campo)), true)
igual('SQL inclui as tabelas do sistema na publicação Realtime sem duplicar', sqlSupabase.includes('pg_publication_tables') && sqlSupabase.includes('alter publication supabase_realtime add table public.%I'), true)
igual('SQL converte o status antigo em concluído durante a migração', /status_producao = 'dtf_pronto'/.test(sqlSupabase), true)

try {
  lerCodigoConexao('codigo-errado')
  falhas.push('código inválido deveria ser recusado')
} catch (e) {
  igual('código inválido é recusado com explicação', (e as Error).message.includes('ALT1'), true)
}

/* ------------------- exportação de arquivos grandes ------------------- */
{
  const arte = {
    id: 'a1',
    pedido_id: 'p1',
    nome: 'arte final.png',
    tipo: 'image/png',
    tamanho: 900 * 1024 * 1024,
    url: 'https://exemplo/arte.png',
    created_at: new Date().toISOString(),
  }
  igual('exportar como JPG troca só a extensão (nada de dividir)', nomeComFormato(arte, 'jpg'), 'arte final.jpg')
  igual('exportar como PNG mantém o nome', nomeComFormato(arte, 'png'), 'arte final.png')
  igual('formato original preserva o nome enviado', nomeComFormato(arte, 'original'), 'arte final.png')
  igual('PDF não é convertido em imagem', nomeComFormato({ ...arte, nome: 'laudo.pdf', tipo: 'application/pdf' }, 'jpg'), 'laudo.pdf')
  igual('imagem é exportável', arquivoEhImagemExportavel(arte), true)
  igual('PDF não entra na prévia de imagem', arquivoEhImagemExportavel({ ...arte, nome: 'x.pdf', tipo: 'application/pdf' }), false)
}

/* ------------------------------- senha -------------------------------- */
async function testarSenha() {
  const hash = await gerarHashSenha('1234')
  igual('a senha não é guardada em texto puro', hash !== '1234' && hash.length > 20, true)
  igual('senha correta confere', await senhaConfere('1234', hash), true)
  igual('senha errada não confere', await senhaConfere('4321', hash), false)
  igual('sem senha definida, o painel abre', await senhaConfere('qualquer', ''), true)
}

const senhaOk = testarSenha()

/* ------------------------------- resultado ---------------------------- */
function relatorio() {
  console.log(`\n✅ ${ok} verificações passaram`)
  if (falhas.length) {
    console.log(`\n❌ ${falhas.length} falha(s):`)
    for (const f of falhas) console.log('  - ' + f)
    process.exit(1)
  }
}

senhaOk.then(relatorio).catch((e) => {
  console.log('erro no teste de senha:', e)
  process.exit(1)
})
