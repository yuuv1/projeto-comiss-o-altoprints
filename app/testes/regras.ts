/**
 * Testes das regras de negócio (preço por metragem, datas, formatação).
 * Rode com:  npm run testar
 */
import { calcularComissao, comissaoDoPedido, faixaDoPedido, validarFaixas } from '../src/lib/comissao'
import { calcularValor, precoMetro, proximoNumero } from '../src/lib/pricing'
import { gerarHashSenha, senhaConfere } from '../src/lib/senha'
import { dataBR, dataHoraBR, hojeISO, moeda, metros } from '../src/lib/format'
import { gerarDadosDemo } from '../src/lib/seed'
import { FAIXAS_PADRAO, isPedidoCompleto, pedidoPendenteFinanceiro, type Pedido } from '../src/lib/types'

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

/* -------------------------------- status ------------------------------ */
const base = gerarDadosDemo().pedidos[0]
const completo: Pedido = { ...base, status_producao: 'dtf_pronto', status_pagamento: 'pago' }
const pendente: Pedido = { ...base, status_producao: 'dtf_pronto', status_pagamento: 'pendente' }
igual('pedido completo', isPedidoCompleto(completo), true)
igual('pedido incompleto', isPedidoCompleto(pendente), false)
igual('pendente financeiro', pedidoPendenteFinanceiro(pendente), true)
igual('pago não é pendente financeiro', pedidoPendenteFinanceiro(completo), false)

/* ------------------------------- semente ------------------------------ */
const demo = gerarDadosDemo()
igual('demo: 2 vendedores', demo.vendedores.length, 2)
igual('demo: 30 clientes', demo.clientes.length, 30)
igual('demo: 68 pedidos', demo.pedidos.length, 68)
igual('demo: números únicos', new Set(demo.pedidos.map((p) => p.numero)).size, 68)
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

/* ------------------------------ comissão ------------------------------ */
const pedidoCom = (metragem: number | null, valor: number): Pedido =>
  ({ ...base, metragem, valor })

igual('faixa 3 m -> 5%', faixaDoPedido(3, FAIXAS_PADRAO, 3).percentual, 5)
igual('faixa 5 m -> 5% (limite da faixa)', faixaDoPedido(5, FAIXAS_PADRAO, 3).percentual, 5)
igual('faixa 6 m -> 4%', faixaDoPedido(6, FAIXAS_PADRAO, 3).percentual, 4)
igual('faixa 20 m -> 4% (limite da faixa)', faixaDoPedido(20, FAIXAS_PADRAO, 3).percentual, 4)
igual('faixa 21 m -> 3%', faixaDoPedido(21, FAIXAS_PADRAO, 3).percentual, 3)
igual('faixa 80,25 m -> 2%', faixaDoPedido(80.25, FAIXAS_PADRAO, 3).percentual, 2)
igual('sem metragem -> percentual configurado', faixaDoPedido(null, FAIXAS_PADRAO, 3).percentual, 3)
igual('comissão de 2 m (R$ 119,80) a 5%', comissaoDoPedido(pedidoCom(2, 119.8), FAIXAS_PADRAO), 5.99)
igual('comissão de 10 m (R$ 549,00) a 4%', comissaoDoPedido(pedidoCom(10, 549), FAIXAS_PADRAO), 21.96)

const resultado = calcularComissao(
  [pedidoCom(2, 119.8), pedidoCom(10, 549), pedidoCom(80.25, 3602.77), pedidoCom(null, 200)],
  FAIXAS_PADRAO,
  3,
)
igual('comissão total das 4 faixas', Number(resultado.total.toFixed(2)), Number((5.99 + 21.96 + 72.06 + 6).toFixed(2)))
igual('base de cálculo = faturamento', Number(resultado.base.toFixed(2)), Number((119.8 + 549 + 3602.77 + 200).toFixed(2)))
igual('percentual médio entre 0 e 5', resultado.percentualMedio > 0 && resultado.percentualMedio < 5, true)
igual('resumo por faixa tem 4 linhas com pedidos', resultado.porFaixa.filter((l) => l.pedidos > 0).length + (resultado.semMetragem.pedidos > 0 ? 1 : 0), 4)
igual('faixas válidas (padrão)', validarFaixas(FAIXAS_PADRAO), [])
igual('faixas sobrepostas são recusadas', validarFaixas([
  { id: 'a', de: 1, ate: 10, percentual: 5, rotulo: '1 a 10 m' },
  { id: 'b', de: 5, ate: 20, percentual: 4, rotulo: '5 a 20 m' },
]).length > 0, true)

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
