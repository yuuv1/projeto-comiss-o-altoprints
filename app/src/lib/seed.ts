/**
 * Dados de EXEMPLO — 100% fictícios, só para treinar a equipe.
 *
 * Regras importantes (valem para o sistema publicado):
 *  1. O sistema **nunca** começa com estes dados. Ele sobe vazio, do zero.
 *     Quem quiser exemplos pede em Configurações → Dados → "Carregar demonstração".
 *  2. Nenhum nome, telefone, endereço ou valor de pessoa/empresa real aparece
 *     aqui: tudo é rotulado como "EXEMPLO" de propósito, para ninguém confundir
 *     treino com produção (e para não vazar dado de cliente).
 *  3. A demonstração **não cria nenhuma conta de acesso** — nem de proprietário.
 *     As contas de verdade são criadas pela porta administrativa (#/administracao)
 *     ou em Equipe → Nova conta. Não existe mais usuário/senha padrão no sistema.
 */
import { calcularValor } from './pricing'
import { novoId } from './files'
import {
  CONFIG_PADRAO,
  type Cliente,
  type DB,
  type EstagioFila,
  type Impressao,
  MOTIVOS_REIMPRESSAO,
  type Pedido,
  type Vendedor,
} from './types'

/** Quantos registros de cada tipo a demonstração gera (números pequenos de propósito) */
export const TAMANHO_DEMO = { vendedores: 2, clientes: 30, pedidos: 68 } as const

/** Nomes obviamente fictícios: ninguém confunde com um vendedor de verdade */
const VENDEDORES_EXEMPLO = ['VENDEDOR EXEMPLO A', 'VENDEDOR EXEMPLO B']

/** Descrição das filas — textos genéricos, sem anotação de pedido real */
const DESCRICOES = [
  'arte frente e costas (exemplo)',
  '2 estampas diferentes (exemplo)',
  'logo + nome (exemplo)',
  'aplicação inclusa (exemplo)',
  'repetição de arte (exemplo)',
]

const OBSERVACOES = [
  'Registro de exemplo — pode apagar.',
  'Exemplo para treino da equipe.',
  'Fila fictícia: nenhum cliente real aqui.',
]

/** PRNG simples: gera sempre os mesmos exemplos (nada de dado aleatório real) */
const criarRandom = (semente: number) => {
  let s = semente
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296
    return s / 4294967296
  }
}

/** telefone visivelmente falso: DDD 00, número sequencial */
const telefoneExemplo = (i: number) => `(00) 90000-${String(i).padStart(4, '0')}`

/** e-mail em domínio reservado (nunca existe de verdade — RFC 2606) */
const emailExemplo = (i: number) => `cliente.exemplo${String(i).padStart(2, '0')}@exemplo.invalid`

export function gerarDadosDemo(): DB {
  const rnd = criarRandom(20261008)

  const vendedores: Vendedor[] = VENDEDORES_EXEMPLO.map((nome) => ({
    id: novoId(),
    nome,
    created_at: new Date().toISOString(),
  }))

  const clientes: Cliente[] = Array.from({ length: TAMANHO_DEMO.clientes }, (_, indice) => {
    const numero = indice + 1
    const nome = `CLIENTE EXEMPLO ${String(numero).padStart(2, '0')}`
    const especial = indice % 7 === 0
    return {
      id: novoId(),
      nome,
      telefone: telefoneExemplo(numero),
      email: indice % 3 === 0 ? emailExemplo(numero) : '',
      observacoes: especial ? 'Cliente de exemplo com condição especial (fictício).' : '',
      vendedor_id: vendedores[indice % vendedores.length].id,
      valor_especial_metro: especial ? 49.9 : null,
      especial,
      created_at: new Date().toISOString(),
    }
  })

  const pedidos: Pedido[] = []
  const total = TAMANHO_DEMO.pedidos
  const agora = new Date()

  for (let i = 0; i < total; i++) {
    const numero = total - i
    const diasAtras = Math.floor((i / total) * 55)
    const data = new Date(agora)
    data.setDate(agora.getDate() - diasAtras)
    data.setHours(8 + Math.floor(rnd() * 9), Math.floor(rnd() * 59), 0, 0)

    const cliente = clientes[Math.floor(rnd() * clientes.length)]
    const metragem = Number((0.5 + rnd() * 12).toFixed(2))
    const valor = calcularValor(metragem, cliente.valor_especial_metro)

    /**
     * As filas mais novas (as últimas registradas) ficam em andamento — as duas
     * primeiras ainda não começaram a imprimir. As antigas já saíram da máquina.
     */
    const estagio: EstagioFila = i < 5 ? 'em_andamento' : 'concluido'
    const iniciado_em = i < 2 ? null : data.toISOString()
    const entregue = estagio === 'concluido' && diasAtras > 4 ? rnd() > 0.15 : false
    const pago = i === 7 ? false : rnd() < (diasAtras > 3 ? 0.92 : 0.6)

    const tipo_entrega = rnd() < 0.1 ? 'correios' : 'retirada'

    pedidos.push({
      id: novoId(),
      numero,
      cliente_nome: cliente.nome,
      cliente_id: cliente.id,
      vendedor_id: cliente.vendedor_id,
      descricao: rnd() < 0.22 ? DESCRICOES[Math.floor(rnd() * DESCRICOES.length)] : '',
      metragem,
      valor,
      valor_modo: 'auto',
      estagio,
      iniciado_em,
      entregue,
      pago,
      forma_pagamento: pago ? (rnd() < 0.7 ? 'Pix' : 'Dinheiro') : '',
      data_pagamento: pago ? data.toISOString().slice(0, 10) : null,
      data_pedido: data.toISOString(),
      observacoes: rnd() < 0.12 ? OBSERVACOES[Math.floor(rnd() * OBSERVACOES.length)] : '',
      tipo_entrega,
      endereco: tipo_entrega === 'correios' ? `Rua Exemplo, ${100 + Math.floor(rnd() * 900)}` : '',
      cidade: tipo_entrega === 'correios' ? 'CIDADE EXEMPLO' : '',
      estado: tipo_entrega === 'correios' ? 'EX' : '',
      cep: tipo_entrega === 'correios' ? '00000-000' : '',
      codigo_rastreio:
        tipo_entrega === 'correios' && diasAtras > 2
          ? `EX${String(100000000 + Math.floor(rnd() * 899999999))}BR`
          : '',
      data_envio:
        entregue && tipo_entrega === 'correios'
          ? new Date(data.getTime() + 86400000).toISOString().slice(0, 10)
          : null,
      data_entrega: entregue ? new Date(data.getTime() + 2 * 86400000).toISOString().slice(0, 10) : null,
      retirado_por: entregue && tipo_entrega === 'retirada' ? cliente.nome : '',
      data_retirada: entregue && tipo_entrega === 'retirada' ? data.toISOString().slice(0, 10) : null,
      created_at: data.toISOString(),
      updated_at: data.toISOString(),
    })
  }

  /* ---------------------- filas impressas de exemplo --------------------- */
  // Toda fila já concluída ganha o registro de produção (metros e quem imprimiu)
  // e algumas levam reimpressão com motivo — assim a tela abre com movimento.
  const impressoes: Impressao[] = []
  const concluidas = pedidos.filter((p) => p.estagio === 'concluido').sort((a, b) => b.numero - a.numero)

  concluidas.forEach((p, indice) => {
    const quem = vendedores[indice % vendedores.length].nome
    const metrosPedido = Number(p.metragem || 0)
    // as primeiras ficam com data de hoje (a tela abre com movimento)
    const quando =
      indice < 4
        ? new Date(agora.getFullYear(), agora.getMonth(), agora.getDate(), 8 + indice * 2, 15 + indice * 7, 0).toISOString()
        : String(p.iniciado_em || p.data_pedido)
    if (indice < 4) p.iniciado_em = quando

    impressoes.push({
      id: novoId(),
      pedido_id: p.id,
      pedido_numero: p.numero,
      cliente_nome: p.cliente_nome,
      arquivo_id: '',
      arquivo_nome: '',
      metros: Number((metrosPedido * (0.95 + rnd() * 0.1)).toFixed(2)),
      quem,
      usuario_id: '',
      tipo: 'impressao',
      motivo: '',
      observacao: rnd() < 0.1 ? 'Exemplo: o filme acabou no meio — completado na sequência.' : '',
      quando,
      created_at: quando,
    })

    if (rnd() < 0.14) {
      const quandoReimpressao = new Date(new Date(quando).getTime() + 3600000 * (1 + Math.floor(rnd() * 5))).toISOString()
      impressoes.push({
        id: novoId(),
        pedido_id: p.id,
        pedido_numero: p.numero,
        cliente_nome: p.cliente_nome,
        arquivo_id: '',
        arquivo_nome: '',
        metros: Number((metrosPedido * (0.9 + rnd() * 0.2)).toFixed(2)),
        quem,
        usuario_id: '',
        tipo: 'reimpressao',
        motivo: MOTIVOS_REIMPRESSAO[Math.floor(rnd() * (MOTIVOS_REIMPRESSAO.length - 1))],
        observacao: '',
        quando: quandoReimpressao,
        created_at: quandoReimpressao,
      })
    }
  })

  return {
    vendedores,
    clientes,
    pedidos: pedidos.sort((a, b) => b.numero - a.numero),
    arquivos: [],
    impressoes: impressoes.sort((a, b) => b.quando.localeCompare(a.quando)),
    // nenhuma conta é criada pela demonstração: o acesso é sempre decidido pelo dono
    usuarios: [],
    configuracoes: {
      ...CONFIG_PADRAO,
      revisao_ultima_em: new Date().toISOString(),
      // liga o aviso "dados de exemplo" na tela, para ninguém confundir com produção
      modo_exemplo: true,
    },
  }
}
