// Dados de demonstração (podem ser apagados nas Configurações)
import { novoId } from './files'
import { calcularValor } from './pricing'
import {
  CONFIG_PADRAO,
  type Cliente,
  type DB,
  type Impressao,
  MOTIVOS_REIMPRESSAO,
  type Pedido,
  type StatusPagamento,
  type StatusProducao,
  type Vendedor,
} from './types'

const NOMES = [
  'BRUNO','SAMUEL','IVANETE','MURILO','TELMA','JAMIR','LORRAINE','ROGERIO','FABIA','CAMILA','DOUGLAS','PATRICIA',
  'rubiana','RUAN','NUBIA','MARCOS','LIDIMO','IVANILDE','MIRIAN','LARISSA','jesus','JUNIOR','MATHEUS','MICHELLE',
  'WANESSA','GUILHERME','ANA CAROLINA','TALLITA','JULIANA','RICARDO','EMERSON','LEANDRO','CRISTIANE','ANDRE',
  'VITOR K','JAKELINE','TATY','ANTONIA','KATHERYN','CASSIA','FELIPE','MORENA','LAINE','STEPHANIE','ISABELLA','KARLA',
]

const CIDADES: [string, string][] = [
  ['SAO PAULO', 'SP'],
  ['CAMPINAS', 'SP'],
  ['RIO DE JANEIRO', 'RJ'],
  ['BELO HORIZONTE', 'MG'],
  ['GOIANIA', 'GO'],
  ['CURITIBA', 'PR'],
  ['SALVADOR', 'BA'],
  ['FORTALEZA', 'CE'],
  ['RECIFE', 'PE'],
  ['PORTO ALEGRE', 'RS'],
]

const DESCRICOES = [
  '755+220',
  '74+22',
  'PAGO SEXTA',
  'arte frente e costas',
  '+ APLICACAO',
  '2 estampas diferentes',
  'logo + nome',
]

// PRNG simples para gerar sempre os mesmos dados
const criarRandom = (semente: number) => {
  let s = semente
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296
    return s / 4294967296
  }
}

export function gerarDadosDemo(): DB {
  const rnd = criarRandom(20261008)

  const vendedores: Vendedor[] = ['JESSICA', 'RAISSA'].map((nome) => ({
    id: novoId(),
    nome,
    created_at: new Date().toISOString(),
  }))

  const clientes: Cliente[] = NOMES.slice(0, 30).map((nome, i) => {
    const especial = i % 7 === 0
    return {
      id: novoId(),
      nome,
      telefone: `(64) 9${String(80000000 + Math.floor(rnd() * 9999999)).slice(0, 4)}-${String(
        1000 + Math.floor(rnd() * 8999),
      )}`,
      email: rnd() > 0.6 ? `${nome.split(' ')[0].toLowerCase()}@email.com` : '',
      observacoes: especial ? 'Cliente antigo — condição especial combinada.' : '',
      vendedor_id: vendedores[Math.floor(rnd() * vendedores.length)].id,
      valor_especial_metro: especial ? 49.9 : null,
      especial,
      created_at: new Date().toISOString(),
    }
  })

  const pedidos: Pedido[] = []
  const total = 68
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

    const recente = diasAtras <= 2
    let status_producao: StatusProducao = 'dtf_pronto'
    let status_pagamento: StatusPagamento = 'pago'
    if (recente && rnd() < 0.45) {
      const roleta = rnd()
      status_producao = roleta < 0.3 ? 'editar_arte' : roleta < 0.55 ? 'fila_impressao' : roleta < 0.8 ? 'pagamento' : 'imprimir'
      status_pagamento = rnd() < 0.7 ? 'pendente' : 'pago'
    } else if (rnd() < 0.06) {
      status_pagamento = 'parcial'
    }

    const tipo_entrega = rnd() < 0.1 ? 'correios' : 'retirada'
    const [cidade, estado] = CIDADES[Math.floor(rnd() * CIDADES.length)]
    const pago = status_pagamento === 'pago'
    const impresso = status_producao === 'dtf_pronto' || status_producao === 'imprimir'

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
      status_producao,
      status_pagamento,
      forma_pagamento: pago ? (rnd() < 0.7 ? 'Pix' : 'Dinheiro') : '',
      data_pagamento: pago ? data.toISOString().slice(0, 10) : null,
      data_pedido: data.toISOString(),
      observacoes: rnd() < 0.12 ? 'Cliente pediu para avisar quando ficar pronto.' : '',
      tipo_entrega,
      endereco: tipo_entrega === 'correios' ? `Rua das Estampas, ${100 + Math.floor(rnd() * 900)}` : '',
      cidade: tipo_entrega === 'correios' ? cidade : '',
      estado: tipo_entrega === 'correios' ? estado : '',
      cep: tipo_entrega === 'correios' ? `759${String(1000 + Math.floor(rnd() * 8999))}` : '',
      codigo_rastreio: tipo_entrega === 'correios' && diasAtras > 2 ? `AA${String(100000000 + Math.floor(rnd() * 899999999))}BR` : '',
      data_envio: tipo_entrega === 'correios' && diasAtras > 3 ? new Date(data.getTime() + 86400000).toISOString().slice(0, 10) : null,
      data_entrega:
        tipo_entrega === 'correios' && diasAtras > 8
          ? new Date(data.getTime() + 4 * 86400000).toISOString().slice(0, 10)
          : null,
      retirado_por: tipo_entrega === 'retirada' && diasAtras > 2 ? cliente.nome : '',
      data_retirada: tipo_entrega === 'retirada' && diasAtras > 2 ? data.toISOString().slice(0, 10) : null,
      impresso,
      impresso_em: impresso ? data.toISOString() : null,
      aviso_visto: !(impresso && diasAtras <= 2 && rnd() < 0.35),
      created_at: data.toISOString(),
      updated_at: data.toISOString(),
    })
  }

  /* ------------------------- impressões de exemplo ------------------------ */
  // Todo pedido já impresso ganha o registro de produção (metros, quem imprimiu)
  // e alguns levam reimpressão com motivo — assim a tela já nasce com dados.
  const impressoes: Impressao[] = []
  const impressos = pedidos.filter((p) => p.impresso && p.impresso_em).sort((a, b) => b.numero - a.numero)

  impressos.forEach((p, indice) => {
    const quem = vendedores[indice % vendedores.length].nome
    const metrosPedido = Number(p.metragem || 0)
    // as primeiras impressões ficam com data de hoje (a tela abre com movimento)
    const quando =
      indice < 4
        ? new Date(agora.getFullYear(), agora.getMonth(), agora.getDate(), 8 + indice * 2, 15 + indice * 7, 0).toISOString()
        : String(p.impresso_em)
    if (indice < 4) p.impresso_em = quando

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
      observacao: rnd() < 0.1 ? 'O filme acabou no meio — completado na sequência.' : '',
      quando,
      created_at: quando,
    })

    if (rnd() < 0.12) {
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
    usuarios: [],
    configuracoes: { ...CONFIG_PADRAO, revisao_ultima_em: new Date().toISOString() },
  }
}
