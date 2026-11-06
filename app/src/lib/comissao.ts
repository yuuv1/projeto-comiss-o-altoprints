// Cálculo de comissão.
//
// Desde 01/11/2026 a comissão NÃO é mais por faixa de metragem: ela é definida
// pelo **valor do metro** praticado no pedido (valor ÷ metragem), segundo a
// tabela oficial em `FAIXAS_VALOR_PADRAO`. Pedidos anteriores a essa data
// continuam com a tabela antiga (por metragem), para o histórico não mudar.
//
// As duas tabelas são configuráveis em Configurações → Comissões.
import { moeda } from './format'
import {
  FAIXAS_PADRAO,
  FAIXAS_VALOR_PADRAO,
  type Configuracoes,
  type FaixaComissao,
  type FaixaComissaoValor,
  type Pedido,
} from './types'

/** Modelo de cálculo usado num pedido */
export type ModeloComissao = 'valor' | 'metragem'

/** Tudo o que o cálculo precisa saber (vem das Configurações) */
export interface RegrasComissao {
  /** tabela antiga: faixas de metragem (pedidos antes da vigência) */
  faixas: FaixaComissao[]
  /** tabela atual: faixas de valor do metro */
  faixasValor: FaixaComissaoValor[]
  /** percentual para pedido sem metragem na regra antiga */
  semMetragem: number
  /** percentual para pedido sem valor do metro na regra nova (null = menor faixa) */
  semValorMetro: number | null
  /** primeiro dia em que vale a regra do valor do metro (null = nunca) */
  desde: string | null
  /**
   * Quanto o valor do metro pode estar "fora" de uma faixa e ainda contar como
   * aquela faixa (em R$). Ex.: com R$ 1,00, um pedido a R$ 59,08/m entra como
   * R$ 59,90/m (3%) e um a R$ 39,86/m entra como R$ 39,90/m (2%).
   */
  toleranciaMetro: number
}

export interface LinhaComissao {
  id: string
  rotulo: string
  percentual: number
  pedidos: number
  metragem: number
  faturamento: number
  comissao: number
  /** de qual tabela é a linha (útil para separar as regras na tela) */
  modelo: ModeloComissao | 'sem_metragem'
}

export interface ResultadoComissao {
  total: number
  base: number
  porFaixa: LinhaComissao[]
  semMetragem: LinhaComissao
  percentualMedio: number
  /** quantos pedidos foram calculados pela tabela do valor do metro */
  pedidosPorValor: number
  /** quantos pedidos foram calculados pela tabela antiga (por metragem) */
  pedidosPorMetragem: number
}

/** Aceita tanto as regras completas quanto a tabela antiga (compatibilidade) */
export type EntradaRegras = RegrasComissao | FaixaComissao[] | null | undefined

export const REGRAS_PADRAO: RegrasComissao = {
  faixas: FAIXAS_PADRAO,
  faixasValor: FAIXAS_VALOR_PADRAO,
  semMetragem: 0,
  semValorMetro: 1.5,
  desde: '2026-11-01',
  toleranciaMetro: 1,
}

/** Monta as regras a partir das configurações salvas */
export const regrasDaConfig = (c?: Partial<Configuracoes> | null): RegrasComissao => ({
  faixas: c?.faixas_comissao?.length ? c.faixas_comissao : FAIXAS_PADRAO,
  faixasValor: c?.faixas_comissao_valor?.length ? c.faixas_comissao_valor : FAIXAS_VALOR_PADRAO,
  semMetragem: Number(c?.comissao_sem_metragem ?? 0) || 0,
  semValorMetro:
    c?.comissao_sem_valor_metro === null ||
    c?.comissao_sem_valor_metro === undefined ||
    c?.comissao_sem_valor_metro === ('' as unknown as number)
      ? 1.5
      : Number(c.comissao_sem_valor_metro),
  desde: c?.comissao_por_valor_desde === undefined ? '2026-11-01' : c.comissao_por_valor_desde,
  toleranciaMetro: Math.max(0, Number(c?.comissao_tolerancia_metro ?? 1) || 0),
})

/** Normaliza qualquer entrada para as regras completas */
export function normalizarRegras(entrada: EntradaRegras, semMetragem = 0): RegrasComissao {
  if (!entrada) return { ...REGRAS_PADRAO, semMetragem }
  if (Array.isArray(entrada)) {
    // tabela avulsa = regra antiga por metragem (usada em testes e telas antigas)
    return { ...REGRAS_PADRAO, faixas: entrada.length ? entrada : FAIXAS_PADRAO, semMetragem, desde: null }
  }
  return entrada
}

/* ------------------------------------------------------------------ */
/* Regra do valor do metro                                             */
/* ------------------------------------------------------------------ */

/** Valor do metro praticado no pedido (valor ÷ metragem) — null quando não dá para saber */
export const valorDoMetroPedido = (pedido: Pick<Pedido, 'metragem' | 'valor'>): number | null => {
  const m = Number(pedido.metragem) || 0
  const v = Number(pedido.valor) || 0
  if (m <= 0 || v <= 0) return null
  return v / m
}

/** Data que decide qual regra vale: a do pagamento e, sem ela, a do pedido */
export const dataDaComissao = (pedido: Pick<Pedido, 'data_pagamento' | 'data_pedido' | 'created_at'>) =>
  String(pedido.data_pagamento || pedido.data_pedido || pedido.created_at || '').slice(0, 10)

/** O pedido já cai na regra nova (valor do metro)? */
export function usaRegraPorValor(
  pedido: Pick<Pedido, 'data_pagamento' | 'data_pedido' | 'created_at'>,
  regras: RegrasComissao,
): boolean {
  if (!regras.desde) return false
  const data = dataDaComissao(pedido)
  if (!data) return false
  return data >= regras.desde
}

/**
 * Menor percentual da tabela — é o piso usado quando o pedido não tem valor do
 * metro ou ficou abaixo da primeira faixa (ex.: abaixo de R$ 39,90 o metro).
 */
/** Valor do metro já encaixado na faixa mais próxima (usado no relatório) */
export const valorMetroParaFaixa = (
  pedido: Pick<Pedido, 'metragem' | 'valor'>,
  entrada: EntradaRegras = REGRAS_PADRAO,
): number | null => {
  const regras = normalizarRegras(entrada)
  return ajustarValorDoMetro(valorDoMetroPedido(pedido), regras.faixasValor, regras.toleranciaMetro)
}

export const percentualMinimo = (faixas: FaixaComissaoValor[] = FAIXAS_VALOR_PADRAO): number => {
  const lista = faixas.length ? faixas : FAIXAS_VALOR_PADRAO
  const valores = lista.map((f) => Number(f.percentual)).filter((n) => !Number.isNaN(n))
  return valores.length ? Math.min(...valores) : 0
}

/**
 * Encaixa o valor do metro no valor de faixa **mais próximo**, quando a diferença
 * for de até `tolerancia` reais. É o que faz um pedido a R$ 59,08/m contar como
 * R$ 59,90/m (3%) e um a R$ 39,86/m contar como R$ 39,90/m (2%), em vez de cair
 * na faixa de baixo por causa de centavos.
 *
 * Só os inícios de faixa (R$ 39,90, R$ 44,90, …) servem de referência — um valor
 * no meio de uma faixa fica onde está.
 */
export function ajustarValorDoMetro(
  valorMetro: number | null | undefined,
  faixas: FaixaComissaoValor[] = FAIXAS_VALOR_PADRAO,
  tolerancia = 1,
): number | null {
  const v = Number(valorMetro)
  if (valorMetro === null || valorMetro === undefined || Number.isNaN(v) || v <= 0) return null
  const lista = faixas.length ? faixas : FAIXAS_VALOR_PADRAO
  if (!(tolerancia > 0)) return v

  const referencias = [...new Set(lista.map((f) => Number(f.de)).filter((n) => n > 0))]
  let melhor: number | null = null
  let melhorDistancia = Infinity
  for (const referencia of referencias) {
    const distancia = Math.abs(v - referencia)
    if (distancia > tolerancia + 1e-9) continue
    // empate: fica com a referência maior (o arredondamento tradicional para cima)
    if (distancia < melhorDistancia - 1e-9 || (Math.abs(distancia - melhorDistancia) < 1e-9 && referencia > (melhor ?? 0))) {
      melhor = referencia
      melhorDistancia = distancia
    }
  }
  return melhor ?? v
}

/** Faixa de valor do metro em que o pedido cai */
export function faixaDoValor(
  valorMetro: number | null | undefined,
  faixas: FaixaComissaoValor[] = FAIXAS_VALOR_PADRAO,
  semValorMetro: number | null = null,
  tolerancia = 1,
) {
  const lista = [...(faixas.length ? faixas : FAIXAS_VALOR_PADRAO)].sort((a, b) => a.de - b.de)
  const v = Number(ajustarValorDoMetro(valorMetro, lista, tolerancia))
  const piso = (rotulo: string, id: string): { percentual: number; rotulo: string; id: string } => ({
    percentual:
      semValorMetro === null || semValorMetro === undefined
        ? percentualMinimo(lista)
        : Number(semValorMetro),
    rotulo,
    id,
  })

  if (valorMetro === null || valorMetro === undefined || Number.isNaN(v) || v <= 0)
    return piso('Sem valor do metro', '__sem_valor_metro__')

  const faixa = lista.find((f) => v >= f.de && (f.ate === null || v < f.ate))
  if (faixa) return { percentual: Number(faixa.percentual), rotulo: faixa.rotulo, id: faixa.id }

  // abaixo da primeira faixa: piso da tabela (ex.: abaixo de R$ 39,90 o metro)
  if (v < Number(lista[0]?.de ?? 0))
    return piso(`Abaixo de ${moeda(Number(lista[0]?.de ?? 0))}/m`, '__abaixo_da_tabela__')

  // acima da última: a última faixa vale como teto
  const ultima = [...lista].reverse().find((f) => v >= f.de)
  if (ultima) return { percentual: Number(ultima.percentual), rotulo: ultima.rotulo, id: ultima.id }
  return piso('Sem valor do metro', '__sem_valor_metro__')
}

/* ------------------------------------------------------------------ */
/* Regra antiga (por metragem) — só para o histórico                   */
/* ------------------------------------------------------------------ */

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
  const faixa = faixas.find((f) => m >= f.de && (f.ate === null || m < f.ate))
  if (faixa) return { percentual: faixa.percentual, rotulo: faixa.rotulo, id: faixa.id }
  // metragem fora de qualquer faixa: usa a faixa mais próxima (maior início abaixo do valor)
  const ordenadas = [...faixas].sort((a, b) => a.de - b.de)
  const anterior = [...ordenadas].reverse().find((f) => m >= f.de)
  if (anterior) return { percentual: anterior.percentual, rotulo: anterior.rotulo, id: anterior.id }
  const primeira = ordenadas[0]
  if (primeira) return { percentual: primeira.percentual, rotulo: primeira.rotulo, id: primeira.id }
  return { percentual: percentualSemMetragem, rotulo: 'Sem metragem', id: '__sem_metragem__' }
}

/* ------------------------------------------------------------------ */
/* Regra do pedido (escolhe a tabela pela data)                        */
/* ------------------------------------------------------------------ */

/**
 * Percentual de um pedido, já sabendo qual tabela usar:
 *  • pedidos a partir da vigência → tabela do valor do metro
 *  • pedidos anteriores           → tabela antiga, por metragem
 */
export function regraDoPedido(
  pedido: Pick<Pedido, 'metragem' | 'valor' | 'data_pagamento' | 'data_pedido' | 'created_at'>,
  entrada: EntradaRegras,
  percentualSemMetragem = 0,
): { percentual: number; rotulo: string; id: string; modelo: ModeloComissao | 'sem_metragem'; valorMetro: number | null } {
  const regras = normalizarRegras(entrada, percentualSemMetragem)
  const valorMetro = valorDoMetroPedido(pedido)

  if (usaRegraPorValor(pedido, regras)) {
    const faixa = faixaDoValor(valorMetro, regras.faixasValor, regras.semValorMetro, regras.toleranciaMetro)
    if (valorMetro === null) return { ...faixa, modelo: 'sem_metragem', valorMetro }
    return { ...faixa, modelo: 'valor', valorMetro }
  }

  const faixa = faixaDoPedido(pedido.metragem, regras.faixas, regras.semMetragem)
  return {
    ...faixa,
    modelo: faixa.id === '__sem_metragem__' ? 'sem_metragem' : 'metragem',
    valorMetro,
  }
}

/** Percentual aplicado ao pedido */
export const percentualDoPedido = (pedido: Pedido, entrada: EntradaRegras, semMetragem = 0) =>
  regraDoPedido(pedido, entrada, semMetragem).percentual

/** Comissão de um único pedido */
export const comissaoDoPedido = (pedido: Pedido, entrada: EntradaRegras, semMetragem = 0) =>
  (Number(pedido.valor) || 0) * (percentualDoPedido(pedido, entrada, semMetragem) / 100)

/* ------------------------------------------------------------------ */
/* Totais                                                              */
/* ------------------------------------------------------------------ */

const linhaVazia = (
  id: string,
  rotulo: string,
  percentual: number,
  modelo: ModeloComissao | 'sem_metragem',
): LinhaComissao => ({ id, rotulo, percentual, pedidos: 0, metragem: 0, faturamento: 0, comissao: 0, modelo })

/** Calcula a comissão de uma lista de pedidos, agrupando por faixa */
export function calcularComissao(
  pedidos: Pedido[],
  entrada: EntradaRegras = REGRAS_PADRAO,
  percentualSemMetragem = 0,
): ResultadoComissao {
  const regras = normalizarRegras(entrada, percentualSemMetragem)
  const mapa = new Map<string, LinhaComissao>()

  const chave = (modelo: ModeloComissao | 'sem_metragem', id: string) => `${modelo}:${id}`

  for (const f of regras.faixasValor) {
    mapa.set(chave('valor', f.id), linhaVazia(f.id, f.rotulo, Number(f.percentual), 'valor'))
  }
  for (const f of regras.faixas) {
    mapa.set(chave('metragem', f.id), linhaVazia(f.id, f.rotulo, Number(f.percentual), 'metragem'))
  }

  const semMetragem = linhaVazia('__sem_metragem__', 'Sem metragem', Number(percentualSemMetragem) || 0, 'sem_metragem')

  let pedidosPorValor = 0
  let pedidosPorMetragem = 0

  for (const p of pedidos) {
    const regra = regraDoPedido(p, regras, percentualSemMetragem)
    const valor = Number(p.valor) || 0

    let linha: LinhaComissao
    if (regra.modelo === 'valor') {
      pedidosPorValor += 1
      linha = mapa.get(chave('valor', regra.id)) ?? linhaVazia(regra.id, regra.rotulo, regra.percentual, 'valor')
      if (!mapa.has(chave('valor', regra.id))) mapa.set(chave('valor', regra.id), linha)
    } else if (regra.modelo === 'metragem') {
      pedidosPorMetragem += 1
      linha = mapa.get(chave('metragem', regra.id)) ?? linhaVazia(regra.id, regra.rotulo, regra.percentual, 'metragem')
      if (!mapa.has(chave('metragem', regra.id))) mapa.set(chave('metragem', regra.id), linha)
    } else if (usaRegraPorValor(p, regras)) {
      pedidosPorValor += 1
      linha = mapa.get(chave('sem_metragem', regra.id)) ?? linhaVazia(regra.id, regra.rotulo, regra.percentual, 'sem_metragem')
      mapa.set(chave('sem_metragem', regra.id), linha)
    } else {
      pedidosPorMetragem += 1
      linha = semMetragem
    }

    linha.pedidos += 1
    linha.metragem += Number(p.metragem) || 0
    linha.faturamento += valor
    linha.comissao += valor * (Number(regra.percentual) / 100)
  }

  const comPedidos = [...mapa.values()].filter((l) => l.pedidos > 0)
  const porFaixa = comPedidos.length
    ? comPedidos
    : regras.faixasValor.map((f) => linhaVazia(f.id, f.rotulo, Number(f.percentual), 'valor'))
  const base = pedidos.reduce((s, p) => s + (Number(p.valor) || 0), 0)
  const total = [...porFaixa, semMetragem].reduce((s, l) => s + l.comissao, 0)

  return {
    total,
    base,
    porFaixa,
    semMetragem,
    percentualMedio: base > 0 ? (total / base) * 100 : 0,
    pedidosPorValor,
    pedidosPorMetragem,
  }
}

/** Mesmo cálculo, mas separado por vendedor (para a tabela comissão por vendedor) */
export function comissaoPorVendedor(pedidos: Pedido[], entrada: EntradaRegras, percentualSemMetragem = 0) {
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
    resultado: calcularComissao(lista, entrada, percentualSemMetragem),
  }))
}

/* ------------------------------------------------------------------ */
/* Rótulos e validação                                                 */
/* ------------------------------------------------------------------ */

/** Rótulo curto de uma faixa de metragem a partir dos números (usado no editor) */
export const rotuloFaixa = (de: number, ate: number | null) =>
  ate === null ? `acima de ${de} m` : `${de} a ${ate} m`

/** Rótulo curto de uma faixa de valor do metro (ex.: "R$ 44,90 a R$ 49,89") */
export const rotuloFaixaValor = (de: number, ate: number | null) => {
  if (ate === null) return de > 0 ? `${moeda(de)} ou mais` : 'Qualquer valor'
  if (de <= 0) return `Abaixo de ${moeda(ate)}`
  return `${moeda(de)} a ${moeda(Number((ate - 0.01).toFixed(2)))}`
}

/** Confere se as faixas de metragem não se sobrepõem e estão completas */
export function validarFaixas(faixas: FaixaComissao[]): string[] {
  const problemas: string[] = []
  const ordenadas = [...faixas].sort((a, b) => a.de - b.de)
  ordenadas.forEach((f, i) => {
    if (f.de <= 0) problemas.push(`A faixa "${f.rotulo}" precisa começar em 1 metro ou mais.`)
    if (f.ate !== null && f.ate < f.de) problemas.push(`A faixa "${f.rotulo}" termina antes de começar.`)
    if (f.percentual < 0 || f.percentual > 100) problemas.push(`O percentual da faixa "${f.rotulo}" deve ficar entre 0 e 100.`)
    const proxima = ordenadas[i + 1]
    if (proxima && f.ate !== null && proxima.de < f.ate) {
      problemas.push(`As faixas "${f.rotulo}" e "${proxima.rotulo}" estão sobrepostas.`)
    }
    if (proxima && f.ate === null) {
      problemas.push(`A faixa "${f.rotulo}" não tem fim, então nenhuma faixa pode vir depois dela.`)
    }
  })
  return problemas
}

/** Confere as faixas de valor do metro (a tabela em vigor) */
export function validarFaixasValor(faixas: FaixaComissaoValor[]): string[] {
  const problemas: string[] = []
  if (!faixas.length) return ['Deixe pelo menos uma faixa de comissão pelo valor do metro.']
  const ordenadas = [...faixas].sort((a, b) => a.de - b.de)
  ordenadas.forEach((f, i) => {
    if (f.de < 0) problemas.push(`A faixa "${f.rotulo}" não pode começar com valor negativo.`)
    if (f.ate !== null && f.ate <= f.de)
      problemas.push(`A faixa "${f.rotulo}" termina antes (ou junto) de começar.`)
    if (f.percentual < 0 || f.percentual > 100)
      problemas.push(`O percentual da faixa "${f.rotulo}" deve ficar entre 0 e 100.`)
    const proxima = ordenadas[i + 1]
    if (proxima && f.ate !== null && proxima.de < f.ate) {
      problemas.push(`As faixas "${f.rotulo}" e "${proxima.rotulo}" estão sobrepostas.`)
    }
    if (proxima && f.ate === null) {
      problemas.push(`A faixa "${f.rotulo}" não tem fim, então nenhuma faixa pode vir depois dela.`)
    }
  })
  return problemas
}

/* ------------------------------------------------------------------ */
/* Compatibilidade                                                     */
/* ------------------------------------------------------------------ */

/** Tabelas que o sistema usou antes — só para migrar quem nunca editou as faixas */
const TABELAS_ANTERIORES: FaixaComissao[][] = [
  // 5% / 4% / 3% / 2%
  [
    { id: 'faixa-1', de: 1, ate: 5, percentual: 5, rotulo: '1 a 5 m' },
    { id: 'faixa-2', de: 6, ate: 20, percentual: 4, rotulo: '6 a 20 m' },
    { id: 'faixa-3', de: 21, ate: 50, percentual: 3, rotulo: '21 a 50 m' },
    { id: 'faixa-4', de: 51, ate: null, percentual: 2, rotulo: 'acima de 50 m' },
  ],
  // 4% / 3,5% / 3% / 2,5% / 1,5% (sem a faixa de 50 a 100 m)
  [
    { id: 'faixa-1', de: 1, ate: 5, percentual: 4, rotulo: '1 a 5 m' },
    { id: 'faixa-2', de: 5, ate: 10, percentual: 3.5, rotulo: '5 a 10 m' },
    { id: 'faixa-3', de: 10, ate: 20, percentual: 3, rotulo: '10 a 20 m' },
    { id: 'faixa-4', de: 20, ate: 50, percentual: 2.5, rotulo: '20 a 50 m' },
    { id: 'faixa-5', de: 50, ate: null, percentual: 1.5, rotulo: 'acima de 50 m' },
  ],
]

const mesmaTabela = (a: FaixaComissao[], b: FaixaComissao[]) =>
  a.length === b.length &&
  a.every((f, i) => f.de === b[i].de && f.ate === b[i].ate && Number(f.percentual) === b[i].percentual)

/**
 * Traz as faixas salvas para a tabela atual quando elas ainda são exatamente uma
 * das tabelas antigas (ou seja: o proprietário nunca editou). Tabela editada é mantida.
 */
export function migrarFaixas(faixas?: FaixaComissao[] | null): FaixaComissao[] {
  if (!faixas || !faixas.length) return FAIXAS_PADRAO
  if (TABELAS_ANTERIORES.some((t) => mesmaTabela(faixas, t))) return FAIXAS_PADRAO.map((f) => ({ ...f }))
  return faixas
}

/** Devolve as faixas de metragem prontas para salvar (com rótulo recalculado e ordenadas) */
export const normalizarFaixas = (faixas: FaixaComissao[]): FaixaComissao[] =>
  [...faixas]
    .sort((a, b) => a.de - b.de)
    .map((f) => ({ ...f, rotulo: rotuloFaixa(f.de, f.ate), percentual: Number(f.percentual) }))

/** Devolve as faixas de valor do metro prontas para salvar */
export const normalizarFaixasValor = (faixas: FaixaComissaoValor[]): FaixaComissaoValor[] =>
  [...faixas]
    .sort((a, b) => a.de - b.de)
    .map((f) => ({
      ...f,
      rotulo: rotuloFaixaValor(f.de, f.ate),
      percentual: Number(f.percentual),
      de: Number(f.de),
      ate: f.ate === null ? null : Number(f.ate),
    }))
