// Dados de demonstração (podem ser apagados nas Configurações)
import { salvarRegistro } from './backend'
import { novoId } from './files'
import { calcularValor } from './pricing'
import {
  CONFIG_PADRAO,
  type Cliente,
  type DB,
  type EstagioFila,
  type Impressao,
  MOTIVOS_REIMPRESSAO,
  type Pedido,
  type Usuario,
  type Vendedor,
} from './types'

/**
 * Acesso de administrador que vem junto com os dados de exemplo, para dar para
 * entrar e conhecer o sistema sem passar pela tela de criação.
 * Ele some quando os dados de exemplo são apagados (Configurações → Dados).
 */
export const ACESSO_DEMO = { nome: 'GUI', usuario: 'gui', senha: '12345' }

/**
 * A senha do acesso de exemplo é calculada no próprio aparelho, no primeiro
 * uso (o cálculo depende do navegador). Até isso acontecer, o registro fica
 * com esta marca — e nenhuma senha é aceita.
 */
export const MARCA_SENHA_DEMO = 'definir-no-primeiro-uso'

/** O acesso de exemplo que acompanha os dados de demonstração */
export const contaDemo = (): Usuario => ({
  id: novoId(),
  nome: ACESSO_DEMO.nome,
  usuario: ACESSO_DEMO.usuario,
  senha_hash: MARCA_SENHA_DEMO,
  papel: 'proprietario',
  vendedor_id: '',
  ativo: true,
  criado_em: new Date().toISOString(),
})

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

    /**
     * As filas mais novas (as últimas registradas) ficam em andamento — as duas
     * primeiras ainda não começaram a imprimir. As antigas já saíram da máquina.
     */
    const estagio: EstagioFila = i < 5 ? 'em_andamento' : 'concluido'
    const iniciado_em = i < 2 ? null : data.toISOString()
    const entregue = estagio === 'concluido' && diasAtras > 4 ? rnd() > 0.15 : false
    const pago = i === 7 ? false : rnd() < (diasAtras > 3 ? 0.92 : 0.6)

    const tipo_entrega = rnd() < 0.1 ? 'correios' : 'retirada'
    const [cidade, estado] = CIDADES[Math.floor(rnd() * CIDADES.length)]

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
      observacoes: rnd() < 0.12 ? 'Cliente pediu para avisar quando ficar pronto.' : '',
      tipo_entrega,
      endereco: tipo_entrega === 'correios' ? `Rua das Estampas, ${100 + Math.floor(rnd() * 900)}` : '',
      cidade: tipo_entrega === 'correios' ? cidade : '',
      estado: tipo_entrega === 'correios' ? estado : '',
      cep: tipo_entrega === 'correios' ? `759${String(1000 + Math.floor(rnd() * 8999))}` : '',
      codigo_rastreio:
        tipo_entrega === 'correios' && diasAtras > 2 ? `AA${String(100000000 + Math.floor(rnd() * 899999999))}BR` : '',
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
  // e algumas levam reimpressão com motivo — assim a tela abre com dados.
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
      observacao: rnd() < 0.1 ? 'O filme acabou no meio — completado na sequência.' : '',
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
    usuarios: [contaDemo()],
    configuracoes: { ...CONFIG_PADRAO, revisao_ultima_em: new Date().toISOString() },
  }
}

/**
 * Troca a marca do acesso de exemplo pela senha de verdade. O cálculo do hash
 * depende do navegador, então ele é feito no primeiro uso, neste aparelho —
 * e não pode vir pronto no arquivo dos dados de exemplo.
 */
export async function prepararAcessoDemo(dados: DB, calcularHash: (senha: string) => Promise<string>) {
  const pendentes = dados.usuarios.filter((u) => u.senha_hash === MARCA_SENHA_DEMO)
  if (!pendentes.length) return dados
  const hash = await calcularHash(ACESSO_DEMO.senha)
  const usuarios = dados.usuarios.map((u) => (pendentes.some((p) => p.id === u.id) ? { ...u, senha_hash: hash } : u))
  for (const u of usuarios) {
    if (pendentes.some((p) => p.id === u.id)) await salvarRegistro('usuarios', u)
  }
  return { ...dados, usuarios }
}
