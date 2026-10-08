/**
 * Testes das regras de negócio (preço por metragem, datas, formatação).
 * Rode com:  npm run testar
 */
import { calcularValor, precoMetro, proximoNumero } from '../src/lib/pricing'
import { dataBR, dataHoraBR, hojeISO, moeda, metros } from '../src/lib/format'
import { gerarDadosDemo } from '../src/lib/seed'
import { isPedidoCompleto, pedidoPendenteFinanceiro, type Pedido } from '../src/lib/types'

let ok = 0
const falhas: string[] = []

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

/* ------------------------------- resultado ---------------------------- */
console.log(`\n✅ ${ok} verificações passaram`)
if (falhas.length) {
  console.log(`\n❌ ${falhas.length} falha(s):`)
  for (const f of falhas) console.log('  - ' + f)
  process.exit(1)
}
