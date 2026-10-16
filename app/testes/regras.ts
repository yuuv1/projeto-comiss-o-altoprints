/**
 * Testes das regras de negócio (preço por metragem, datas, formatação).
 * Rode com:  npm run testar
 */
import { readFileSync } from 'node:fs'
import {
  calcularComissao,
  comissaoDoPedido,
  faixaDoPedido,
  migrarFaixas,
  validarFaixas,
} from '../src/lib/comissao'
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
import { dataBR, dataHoraBR, hojeISO, moeda, metros } from '../src/lib/format'
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
import {
  bloquearSeVisualizando,
  definirVisualizacao,
  emVisualizacao,
  idVisualizado,
  MENSAGEM_SO_VISUALIZACAO,
  registrarAvisoDeBloqueio,
  rotuloVisualizacao,
} from '../src/lib/visualizacao'
import { ehErroDeEspaco, espacoNoLocalStorage, MENSAGEM_SEM_ESPACO } from '../src/lib/armazenamento'
import {
  combinaFiltro,
  CONFIG_PADRAO,
  FAIXAS_PADRAO,
  filasDaComissao,
  isPedidoCompleto,
  naFilaDeImpressao,
  PASSOS_FILA,
  passoFeito,
  pedidoPendenteFinanceiro,
  podeVerTela,
  telasDoUsuario,
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
igual('1,85 m -> R$ 110,81', calcularValor(1.85), 110.81)
igual('2,43 m -> R$ 145,56', calcularValor(2.43), 145.56)
igual('6,15 m -> R$ 337,63', calcularValor(6.15), 337.63)
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
  readFileSync('src/pages/Login.tsx', 'utf8'),
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

/* -------------------- modo "ver como funcionário" ---------------------- */
// o bloqueio de gravação é ligado/desligado por uma marca simples
igual('sem visualização, nada é bloqueado', (() => {
  try {
    bloquearSeVisualizando()
    return 'livre'
  } catch {
    return 'bloqueado'
  }
})(), 'livre')
definirVisualizacao('u1')
igual('em visualização, o sistema sabe disso', emVisualizacao(), true)
igual('em visualização, id visualizado fica registrado', idVisualizado(), 'u1')
igual('em visualização, gravar é bloqueado', (() => {
  try {
    bloquearSeVisualizando()
    return 'livre'
  } catch (e) {
    return (e as Error).message.includes('ver como funcionário') ? 'bloqueado' : 'outro erro'
  }
})(), 'bloqueado')
igual('ao bloquear, a tela recebe o aviso', (() => {
  let aviso = ''
  registrarAvisoDeBloqueio((t) => {
    aviso = t
  })
  try {
    bloquearSeVisualizando()
  } catch {
    /* o aviso já foi dado */
  }
  registrarAvisoDeBloqueio(null)
  return aviso === MENSAGEM_SO_VISUALIZACAO
})(), true)
definirVisualizacao(null)
igual('saindo da visualização, tudo volta ao normal', emVisualizacao(), false)
igual('a mensagem explica como sair', MENSAGEM_SO_VISUALIZACAO.includes('volte ao seu acesso'), true)
igual(
  'o rótulo da faixa diz o nome e o papel',
  rotuloVisualizacao('JESSICA', 'Vendedor').includes('JESSICA (Vendedor)'),
  true,
)

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
const pedidoCom = (metragem: number | null, valor: number): Pedido =>
  ({ ...base, metragem, valor })

igual('tabela oficial tem 6 faixas', FAIXAS_PADRAO.length, 6)
igual('sem metragem começa em 0%', CONFIG_PADRAO.comissao_sem_metragem, 0)
igual('faixa 3 m -> 4%', faixaDoPedido(3, FAIXAS_PADRAO, 3).percentual, 4)
igual('faixa 4,99 m -> 4%', faixaDoPedido(4.99, FAIXAS_PADRAO, 3).percentual, 4)
igual('faixa 5 m -> 3,5% (já é a faixa seguinte)', faixaDoPedido(5, FAIXAS_PADRAO, 3).percentual, 3.5)
igual('faixa 9,99 m -> 3,5%', faixaDoPedido(9.99, FAIXAS_PADRAO, 3).percentual, 3.5)
igual('faixa 10 m -> 3%', faixaDoPedido(10, FAIXAS_PADRAO, 3).percentual, 3)
igual('faixa 19,99 m -> 3%', faixaDoPedido(19.99, FAIXAS_PADRAO, 3).percentual, 3)
igual('faixa 20 m -> 2,5%', faixaDoPedido(20, FAIXAS_PADRAO, 3).percentual, 2.5)
igual('faixa 49,99 m -> 2,5%', faixaDoPedido(49.99, FAIXAS_PADRAO, 0).percentual, 2.5)
igual('faixa 50 m -> 2%', faixaDoPedido(50, FAIXAS_PADRAO, 0).percentual, 2)
igual('faixa 80,25 m -> 2%', faixaDoPedido(80.25, FAIXAS_PADRAO, 0).percentual, 2)
igual('faixa 99,99 m -> 2%', faixaDoPedido(99.99, FAIXAS_PADRAO, 0).percentual, 2)
igual('faixa 100 m -> 1,5%', faixaDoPedido(100, FAIXAS_PADRAO, 0).percentual, 1.5)
igual('faixa 250 m -> 1,5%', faixaDoPedido(250, FAIXAS_PADRAO, 0).percentual, 1.5)
igual('sem metragem -> 0% (padrão do sistema)', faixaDoPedido(null, FAIXAS_PADRAO, CONFIG_PADRAO.comissao_sem_metragem).percentual, 0)
igual('sem metragem -> percentual configurado quando o dono quiser', faixaDoPedido(null, FAIXAS_PADRAO, 2).percentual, 2)
igual('pedido sem metragem não gera comissão por padrão', comissaoDoPedido(pedidoCom(null, 500), FAIXAS_PADRAO, 0), 0)
igual('comissão de 2 m (R$ 119,80) a 4%', Number(comissaoDoPedido(pedidoCom(2, 119.8), FAIXAS_PADRAO).toFixed(3)), 4.792)
igual('comissão de 10 m (R$ 549,00) a 3%', comissaoDoPedido(pedidoCom(10, 549), FAIXAS_PADRAO), 16.47)
igual('comissão de 80,25 m (R$ 3.602,77) a 2%', Number(comissaoDoPedido(pedidoCom(80.25, 3602.77), FAIXAS_PADRAO).toFixed(2)), 72.06)

const resultado = calcularComissao(
  [pedidoCom(2, 119.8), pedidoCom(10, 549), pedidoCom(80.25, 3602.77), pedidoCom(null, 200)],
  FAIXAS_PADRAO,
  3,
)
igual(
  'comissão total das 4 faixas',
  Number(resultado.total.toFixed(2)),
  Number((4.792 + 16.47 + 72.0554 + 6).toFixed(2)),
)
igual('base de cálculo = faturamento', Number(resultado.base.toFixed(2)), Number((119.8 + 549 + 3602.77 + 200).toFixed(2)))
igual('percentual médio entre 0 e 5', resultado.percentualMedio > 0 && resultado.percentualMedio < 5, true)
igual('resumo por faixa agrupa os pedidos certos', resultado.porFaixa.filter((l) => l.pedidos > 0).length + (resultado.semMetragem.pedidos > 0 ? 1 : 0), 4)
igual('as 6 faixas aparecem no resumo', resultado.porFaixa.length, 6)
igual('faixas válidas (padrão)', validarFaixas(FAIXAS_PADRAO), [])
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
igual('sem chave: modo local', conferirChave(''), 'faltando')
igual('sem chave (undefined): modo local', conferirChave(undefined), 'faltando')
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

try {
  lerCodigoConexao('codigo-errado')
  falhas.push('código inválido deveria ser recusado')
} catch (e) {
  igual('código inválido é recusado com explicação', (e as Error).message.includes('ALT1'), true)
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
