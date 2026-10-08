// Cálculo de comissão por faixa de metragem (configurável no painel protegido por senha)
import {
  FAIXAS_PADRAO,
  type FaixaComissao,
  type FaixaResumo,
  type Pedido,
} from './types'

export interface LinhaComissao {
  id: string
  rotulo: string
  percentual: number
  pedidos: number
  metragem: number
  faturamento: number
  comissao: number
}

export interface ResultadoComissao {
  total: number
  base: number
  porFaixa: LinhaComissao[]
  semMetragem: LinhaComissao
  percentualMedio: number
}

/** Descobre a faixa (percentual) de um pedido pela metragem dele */
export function faixaDoPedido(
  metragem: number | null | undefined,
  faixas: FaixaComissao[],
  percentualSemMetragem: number,
): { percentual: number; rotulo: string; id: string } {
  const m = Number(metragem)
  if (!metragem || Number.isNaN(m) || m <= 0) {
    return { percentual: percentualSemMetragem, rotulo: 'Sem metragem', id: '__sem_metragem__' }
  }
  const faixa = faixas.find((f) => m >= f.de && (f.ate === null || m <= f.ate))
  if (faixa) return { percentual: faixa.percentual, rotulo: faixa.rotulo, id: faixa.id }
  // metragem fora de qualquer faixa: usa a faixa mais próxima (maior início abaixo do valor)
  const ordenadas = [...faixas].sort((a, b) => a.de - b.de)
  const anterior = [...ordenadas].reverse().find((f) => m >= f.de)
  if (anterior) return { percentual: anterior.percentual, rotulo: anterior.rotulo, id: anterior.id }
  const primeira = ordenadas[0]
  if (primeira) return { percentual: primeira.percentual, rotulo: primeira.rotulo, id: primeira.id }
  return { percentual: percentualSemMetragem, rotulo: 'Sem metragem', id: '__sem_metragem__' }
}

export const percentualDoPedido = (pedido: Pedido, faixas: FaixaComissao[], semMetragem = 0) =>
  faixaDoPedido(pedido.metragem, faixas, semMetragem).percentual

/** Comissão de um único pedido */
export const comissaoDoPedido = (pedido: Pedido, faixas: FaixaComissao[], semMetragem = 0) =>
  (Number(pedido.valor) || 0) * (percentualDoPedido(pedido, faixas, semMetragem) / 100)

/** Calcula a comissão de uma lista de pedidos, agrupando por faixa de metragem */
export function calcularComissao(
  pedidos: Pedido[],
  faixas: FaixaComissao[] = FAIXAS_PADRAO,
  percentualSemMetragem = 0,
): ResultadoComissao {
  const ordem = faixas.length ? faixas : FAIXAS_PADRAO
  const mapa = new Map<string, LinhaComissao>()

  for (const f of ordem) {
    mapa.set(f.id, {
      id: f.id,
      rotulo: f.rotulo,
      percentual: f.percentual,
      pedidos: 0,
      metragem: 0,
      faturamento: 0,
      comissao: 0,
    })
  }

  const semMetragem: LinhaComissao = {
    id: '__sem_metragem__',
    rotulo: 'Sem metragem',
    percentual: percentualSemMetragem,
    pedidos: 0,
    metragem: 0,
    faturamento: 0,
    comissao: 0,
  }

  for (const p of pedidos) {
    const { id } = faixaDoPedido(p.metragem, ordem, percentualSemMetragem)
    const linha = id === '__sem_metragem__' ? semMetragem : mapa.get(id) ?? semMetragem
    const valor = Number(p.valor) || 0
    linha.pedidos += 1
    linha.metragem += Number(p.metragem) || 0
    linha.faturamento += valor
    linha.comissao += valor * (linha.percentual / 100)
  }

  const porFaixa = [...mapa.values()].filter((l) => l.pedidos > 0 || l.percentual > 0)
  const base = pedidos.reduce((s, p) => s + (Number(p.valor) || 0), 0)
  const total = [...porFaixa, semMetragem].reduce((s, l) => s + l.comissao, 0)

  return {
    total,
    base,
    porFaixa,
    semMetragem,
    percentualMedio: base > 0 ? (total / base) * 100 : 0,
  }
}

/** Mesmo cálculo, mas separado por vendedor (para a tabela comissão por vendedor) */
export function comissaoPorVendedor(
  pedidos: Pedido[],
  faixas: FaixaComissao[],
  percentualSemMetragem = 0,
) {
  const grupos = new Map<string, Pedido[]>()
  for (const p of pedidos) {
    const chave = p.vendedor_id || '__sem_vendedor__'
    const lista = grupos.get(chave) ?? []
    lista.push(p)
    grupos.set(chave, lista)
  }
  return [...grupos.entries()].map(([chave, lista]) => ({
    chave,
    pedidos: lista.length,
    metragem: lista.reduce((s, p) => s + (Number(p.metragem) || 0), 0),
    faturamento: lista.reduce((s, p) => s + (Number(p.valor) || 0), 0),
    resultado: calcularComissao(lista, faixas, percentualSemMetragem),
  }))
}

/** Rótulo curto de uma faixa a partir dos números (usado no editor) */
export const rotuloFaixa = (de: number, ate: number | null) =>
  ate === null ? `acima de ${de} m` : `${de} a ${ate} m`

/** Confere se as faixas não se sobrepõem e estão completas */
export function validarFaixas(faixas: FaixaComissao[]): string[] {
  const problemas: string[] = []
  const ordenadas = [...faixas].sort((a, b) => a.de - b.de)
  ordenadas.forEach((f, i) => {
    if (f.de <= 0) problemas.push(`A faixa "${f.rotulo}" precisa começar em 1 metro ou mais.`)
    if (f.ate !== null && f.ate < f.de) problemas.push(`A faixa "${f.rotulo}" termina antes de começar.`)
    if (f.percentual < 0 || f.percentual > 100) problemas.push(`O percentual da faixa "${f.rotulo}" deve ficar entre 0 e 100.`)
    const proxima = ordenadas[i + 1]
    if (proxima && f.ate !== null && proxima.de <= f.ate) {
      problemas.push(`As faixas "${f.rotulo}" e "${proxima.rotulo}" estão sobrepostas.`)
    }
    if (proxima && f.ate === null) {
      problemas.push(`A faixa "${f.rotulo}" não tem fim, então nenhuma faixa pode vir depois dela.`)
    }
  })
  return problemas
}

/** Devolve as faixas prontas para salvar (com rótulo recalculado e ordenadas) */
export const normalizarFaixas = (faixas: FaixaComissao[]): FaixaComissao[] =>
  [...faixas]
    .sort((a, b) => a.de - b.de)
    .map((f) => ({ ...f, rotulo: rotuloFaixa(f.de, f.ate), percentual: Number(f.percentual) }))
