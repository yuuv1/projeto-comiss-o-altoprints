/**
 * Funcionários que já trabalham na loja.
 *
 * **Não existe mais conta de funcionário.** Estas pessoas são só nomes na lista
 * de funcionários: na hora de registrar uma fila, a pessoa escolhe o próprio
 * nome e ele fica gravado no pedido (é o que alimenta o relatório de comissão).
 *
 * Para mudar a equipe:
 *  • dia a dia → dentro do sistema: Funcionários e acessos → Novo funcionário
 *  • na instalação (nomes que já vêm prontos) → edite a lista EQUIPE_INICIAL
 *
 * O acesso do PROPRIETÁRIO nunca vem pronto: ele é criado no primeiro “Login
 * proprietário”, com senha.
 */
import { novoId } from './files'
import { hojeISO } from './format'
import type { DB, Pedido, Vendedor } from './types'

/** Quem já trabalha na loja (só o primeiro nome, como aparece nos pedidos) */
export const EQUIPE_INICIAL = ['JESSICA', 'RAISSA', 'ANDREIA']

/**
 * Marca de "equipe inicial já criada". Sem ela, apagar um funcionário de
 * propósito faria o sistema criar tudo de novo na próxima abertura.
 */
export const CHAVE_EQUIPE_INICIAL = 'altoprints:equipe-inicial-criada'

/**
 * Monta os cadastros de funcionário que ainda faltam. Aproveita quem já existe
 * (mesmo nome) e nunca duplica — assim dá para rodar em qualquer aparelho, no
 * modo local ou na nuvem.
 */
export function vendedoresDaEquipeInicial(db: DB): Vendedor[] {
  const agora = new Date().toISOString()
  const existentes = new Set(db.vendedores.map((v) => v.nome.trim().toLowerCase()))
  const faltando: Vendedor[] = []
  for (const nome of EQUIPE_INICIAL) {
    if (existentes.has(nome.trim().toLowerCase())) continue
    existentes.add(nome.trim().toLowerCase())
    faltando.push({ id: novoId(), nome, created_at: agora })
  }
  return faltando
}

/**
 * Retorna apenas as funcionárias que efetivamente trabalharam (tiveram pedidos)
 * na lista de pedidos do mês/período selecionado.
 */
export function vendedoresDoPeriodo(vendedores: Vendedor[], pedidosDoPeriodo: Pedido[]): Vendedor[] {
  const idsComPedido = new Set(pedidosDoPeriodo.map((p) => p.vendedor_id).filter(Boolean))
  return vendedores.filter((v) => idsComPedido.has(v.id))
}

/**
 * Retorna as funcionárias atualmente ativas na empresa (ocultando ex-funcionárias
 * que só possuem vendas em meses antigos do histórico).
 *
 * Considera ativa quem:
 *  - ainda não tem nenhum pedido (recém-cadastrada na equipe), OU
 *  - faz parte da EQUIPE_INICIAL atual, OU
 *  - teve pedido nos últimos 45 dias em relação à data mais recente do sistema.
 */
export function vendedoresAtivosAtual(
  vendedores: Vendedor[],
  todosPedidos: Pedido[],
  dataReferenciaISO = hojeISO(),
): Vendedor[] {
  const nomesEquipeAtual = new Set(EQUIPE_INICIAL.map((n) => n.trim().toLowerCase()))

  let maiorData = dataReferenciaISO.slice(0, 10)
  for (const p of todosPedidos) {
    const d = (p.data_pagamento || p.data_pedido || '').slice(0, 10)
    if (d && d > maiorData) maiorData = d
  }
  const refMs = new Date(`${maiorData}T12:00:00`).getTime()
  const limiteIso = Number.isNaN(refMs)
    ? maiorData.slice(0, 7) + '-01'
    : new Date(refMs - 45 * 86400000).toISOString().slice(0, 10)

  const ativos = vendedores.filter((v) => {
    if (nomesEquipeAtual.has(v.nome.trim().toLowerCase())) return true
    const meus = todosPedidos.filter((p) => p.vendedor_id === v.id)
    if (meus.length === 0) return true
    return meus.some((p) => {
      const d = (p.data_pagamento || p.data_pedido || '').slice(0, 10)
      return d >= limiteIso
    })
  })

  return ativos.length > 0 ? ativos : vendedores
}
