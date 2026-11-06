// Tabela de preços da metragem (DTF) e cálculo automático do valor.
//
// Os preços moram nas configurações do sistema (Configurações → Preços), então
// o proprietário muda a tabela sem mexer no código.

import {
  FAIXAS_PRECO_PADRAO,
  FAIXAS_PRECO_UV_PADRAO,
  type Configuracoes,
  type FaixaPreco,
  type Pedido,
  type TipoDtf,
} from './types'

/** faixas em uso (as salvas pelo proprietário ou a tabela padrão) */
export const faixasDePreco = (faixas?: FaixaPreco[] | null): FaixaPreco[] =>
  faixas && faixas.length ? faixas : FAIXAS_PRECO_PADRAO

/** Faixas de preço de um tipo de DTF (UV tem a tabela dele) */
export const faixasDoTipo = (tipo: TipoDtf | null | undefined, c?: Partial<Configuracoes> | null): FaixaPreco[] =>
  tipo === 'uv'
    ? c?.faixas_preco_uv?.length
      ? c.faixas_preco_uv
      : FAIXAS_PRECO_UV_PADRAO
    : c?.faixas_preco?.length
      ? c.faixas_preco
      : FAIXAS_PRECO_PADRAO

/** Faixa de preço em que a metragem cai */
export const faixaDePreco = (m: number, faixas?: FaixaPreco[] | null): FaixaPreco | undefined => {
  const metros = Number(m) || 0
  const lista = [...faixasDePreco(faixas)].sort((a, b) => a.de - b.de)
  return (
    lista.find((f) => metros >= f.de && (f.ate === null || metros < f.ate)) ??
    // metragem acima da última faixa: usa a última mesmo
    [...lista].reverse().find((f) => metros >= f.de) ??
    lista[0]
  )
}

/** Preço do metro conforme a faixa de metragem */
export const precoMetro = (m: number, faixas?: FaixaPreco[] | null): number =>
  Number(faixaDePreco(m, faixas)?.valor ?? 0)

export const faixaRotulo = (m: number, faixas?: FaixaPreco[] | null) => faixaDePreco(m, faixas)?.rotulo ?? ''

/**
 * Arredonda para 2 casas com o "meio para cima" do dia a dia do comércio
 * (R$ 71,955 vira R$ 71,96 — o toFixed puro devolveria 71,95 por causa do ponto
 * flutuante). É o que fecha o valor do centímetro do DTF UV.
 */
const arredonda = (v: number) => Math.round((Number(v) + 1e-9) * 100) / 100

/**
 * Valor automático da fila.
 * Se o cliente tiver "valor especial do metro", esse valor é usado no lugar da tabela
 * (vale também para o DTF UV). Sem valor especial, usa a tabela do tipo escolhido.
 */
export const calcularValor = (
  m: number | null | undefined,
  valorEspecial?: number | null,
  faixas?: FaixaPreco[] | null,
) => {
  const metros = Number(m) || 0
  if (metros <= 0) return 0
  const base =
    valorEspecial !== null && valorEspecial !== undefined && Number(valorEspecial) > 0
      ? Number(valorEspecial)
      : precoMetro(metros, faixas)
  return arredonda(metros * base)
}

/* ------------------------------------------------------------------ */
/* Metros e centímetros                                                */
/* ------------------------------------------------------------------ */

export type UnidadeMetragem = 'm' | 'cm'

/** Converte o que a pessoa digitou para metros (o pedido sempre guarda metros) */
export const paraMetros = (quantidade: number | string | null | undefined, unidade: UnidadeMetragem) => {
  const n = Number(String(quantidade ?? '').replace(',', '.')) || 0
  return arredonda(unidade === 'cm' ? n / 100 : n)
}

/** Converte metros para a unidade escolhida (para mostrar no campo) */
export const deMetros = (metros: number | null | undefined, unidade: UnidadeMetragem) => {
  const m = Number(metros) || 0
  return unidade === 'cm' ? Number((m * 100).toFixed(0)) : Number(m.toFixed(2))
}

/** Valor por metro efetivamente praticado no pedido */
export const valorPorMetro = (p: Pick<Pedido, 'metragem' | 'valor' | 'valor_modo'>) => {
  const m = Number(p.metragem) || 0
  if (!m) return 0
  return Number((Number(p.valor) / m).toFixed(2))
}

/** Texto bonito: "1,45 m" ou "145 cm" */
export const metragemTexto = (metros: number | null | undefined, unidade: UnidadeMetragem = 'm') => {
  const m = Number(metros) || 0
  if (m <= 0) return '—'
  if (unidade === 'cm')
    return `${(m * 100).toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} cm`
  return `${m.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} m`
}

export const proximoNumero = (numeros: number[]) =>
  numeros.length ? Math.max(...numeros) + 1 : 1
