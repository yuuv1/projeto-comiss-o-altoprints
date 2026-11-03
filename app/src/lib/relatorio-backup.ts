import { novoId } from './files'
import { normalizarPedido, pedidoVazio, type Cliente, type DB, type Pedido, type Vendedor } from './types'

export interface MesclaRelatorio {
  pedidosNoArquivo: number
  pedidosNovos: Pedido[]
  clientesNovos: Cliente[]
  vendedoresNovos: Vendedor[]
  duplicados: number
  conflitos: number
  linhasIgnoradas: number
  datasSemOrigem: number
}

type Colunas = {
  numero: number
  cliente: number
  vendedor: number
  metragem: number
  valor: number
  dataPedido: number
  dataPagamento: number
  descricao: number
  formaPagamento: number
  pago: number
  entregue: number
}

const normalizarCabecalho = (valor: string) =>
  valor
    .trim()
    .toLocaleLowerCase('pt-BR')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[º°]/g, 'o')
    .replace(/[^a-z0-9]/g, '')

const normalizarNome = (valor: string) =>
  valor
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .toLocaleLowerCase('pt-BR')

function contarSeparadores(linha: string, separador: string) {
  let aspas = false
  let total = 0
  for (let i = 0; i < linha.length; i++) {
    const caractere = linha[i]
    if (caractere === '"') {
      if (aspas && linha[i + 1] === '"') i++
      else aspas = !aspas
    } else if (!aspas && caractere === separador) {
      total++
    }
  }
  return total
}

function lerLinhasCSV(conteudo: string): string[][] {
  const limpo = conteudo.replace(/^\uFEFF/, '')
  const candidatas = limpo
    .split(/\r?\n/)
    .slice(0, 10)
    .filter((linha) => linha.trim())
    .flatMap((linha) => [';', ',', '\t'].map((c) => ({ c, quantidade: contarSeparadores(linha, c) })))
  const separador = candidatas.sort((a, b) => b.quantidade - a.quantidade)[0]
  if (!separador || separador.quantidade === 0) {
    throw new Error('Não encontrei colunas neste arquivo. Escolha o CSV baixado em Relatório → Exportar CSV.')
  }

  const linhas: string[][] = []
  let linha: string[] = []
  let campo = ''
  let aspas = false

  for (let i = 0; i < limpo.length; i++) {
    const caractere = limpo[i]
    if (caractere === '"') {
      if (aspas && limpo[i + 1] === '"') {
        campo += '"'
        i++
      } else {
        aspas = !aspas
      }
    } else if (!aspas && caractere === separador.c) {
      linha.push(campo)
      campo = ''
    } else if (!aspas && caractere === '\n') {
      linha.push(campo.replace(/\r$/, ''))
      if (linha.some((celula) => celula.trim())) linhas.push(linha)
      linha = []
      campo = ''
    } else {
      campo += caractere
    }
  }

  if (campo.length || linha.length) {
    linha.push(campo.replace(/\r$/, ''))
    if (linha.some((celula) => celula.trim())) linhas.push(linha)
  }

  return linhas
}

const indiceColuna = (cabecalho: string[], nomes: string[]) =>
  cabecalho.findIndex((c) => nomes.includes(normalizarCabecalho(c)))

function encontrarColunas(linhas: string[][]): { indiceCabecalho: number; colunas: Colunas } {
  for (let i = 0; i < Math.min(linhas.length, 10); i++) {
    const h = linhas[i]
    const numero = indiceColuna(h, ['n', 'no', 'numero', 'num', 'numeropedido', 'pedidonumero', 'npedido'])
    const cliente = indiceColuna(h, ['cliente', 'nomecliente'])
    const vendedor = indiceColuna(h, ['vendedor', 'vendedora', 'funcionario', 'funcionaria', 'responsavel'])
    const metragem = indiceColuna(h, ['metragem', 'metros', 'metrage'])
    const valor = indiceColuna(h, ['valor', 'valorpedido', 'faturamento', 'total'])

    // Só aceita o relatório geral de vendas: evita tratar qualquer CSV como backup.
    if ([numero, cliente, vendedor, metragem, valor].some((indice) => indice < 0)) continue

    return {
      indiceCabecalho: i,
      colunas: {
        numero,
        cliente,
        vendedor,
        metragem,
        valor,
        dataPedido: indiceColuna(h, ['datadopedido', 'datapedido', 'pedidoem']),
        dataPagamento: indiceColuna(h, ['datadopagamento', 'datapagamento', 'pagamento']),
        descricao: indiceColuna(h, ['descricao', 'descricaodopedido']),
        formaPagamento: indiceColuna(h, ['formadepagamento', 'pagamentopor']),
        pago: indiceColuna(h, ['pago', 'pagamentoefetuado']),
        entregue: indiceColuna(h, ['entregue', 'pedidoentregue']),
      },
    }
  }
  throw new Error(
    'Este arquivo não tem as colunas do relatório geral (Nº, Cliente, Vendedor, Metragem e Valor). Use Relatório → Exportar CSV.',
  )
}

const valorDaCelula = (linha: string[], indice: number) => (indice >= 0 ? (linha[indice] ?? '').trim() : '')

function numeroBR(valor: string): number | null {
  let texto = valor.trim().replace(/\u00a0/g, ' ').replace(/\s/g, '').replace(/[R$%m]/gi, '')
  if (!texto || /^[-—–]+$/.test(texto)) return null
  texto = texto.replace(/[^\d,.-]/g, '')
  if (!texto || !/\d/.test(texto)) return null

  if (texto.includes(',')) {
    texto = texto.replace(/\./g, '').replace(',', '.')
  } else if (/^-?\d{1,3}(\.\d{3})+$/.test(texto)) {
    texto = texto.replace(/\./g, '')
  }
  const resultado = Number(texto)
  return Number.isFinite(resultado) ? resultado : null
}

function numeroPedido(valor: string): number | null {
  const numero = valor.trim().replace(/^#\s*/, '')
  if (!/^\d+$/.test(numero)) return null
  const resultado = Number(numero)
  return Number.isSafeInteger(resultado) && resultado > 0 ? resultado : null
}

function dataISO(valor: string): string | null {
  const texto = valor.trim()
  if (!texto || /^[-—–]+$/.test(texto)) return null

  const iso = texto.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/)
  if (iso) {
    const [, ano, mes, dia] = iso
    return validarData(Number(ano), Number(mes), Number(dia))
  }

  const brasileira = texto.match(/^(\d{1,2})[/.\-](\d{1,2})[/.\-](\d{2,4})$/)
  if (brasileira) {
    const [, dia, mes, anoTexto] = brasileira
    const ano = Number(anoTexto.length === 2 ? `20${anoTexto}` : anoTexto)
    return validarData(ano, Number(mes), Number(dia))
  }
  return null
}

function validarData(ano: number, mes: number, dia: number): string | null {
  const data = new Date(Date.UTC(ano, mes - 1, dia))
  if (data.getUTCFullYear() !== ano || data.getUTCMonth() !== mes - 1 || data.getUTCDate() !== dia) return null
  return `${String(ano).padStart(4, '0')}-${String(mes).padStart(2, '0')}-${String(dia).padStart(2, '0')}`
}

const paraISOComHora = (data: string) => `${data}T12:00:00.000Z`

function simNao(valor: string, padrao: boolean): boolean {
  const texto = normalizarNome(valor)
  if (!texto) return padrao
  if (['sim', 's', 'yes', 'true', '1', 'entregue', 'pago'].includes(texto)) return true
  if (['nao', 'n', 'no', 'false', '0', 'pendente'].includes(texto)) return false
  return padrao
}

const semVendedor = (nome: string) => ['sem vendedor', 'sem funcionario', 'nenhum', '—', '-'].includes(normalizarNome(nome))

function valoresDiferem(
  a: Pedido,
  cliente: string,
  vendedorDoRelatorio: string,
  vendedorAtual: string,
  metragem: number | null,
  valor: number,
) {
  const vendedorRelatorio = semVendedor(vendedorDoRelatorio) ? '' : vendedorDoRelatorio
  return (
    normalizarNome(a.cliente_nome) !== normalizarNome(cliente) ||
    Math.abs(Number(a.valor) - valor) > 0.01 ||
    (metragem !== null && Math.abs(Number(a.metragem ?? 0) - metragem) > 0.01) ||
    normalizarNome(vendedorRelatorio) !== normalizarNome(vendedorAtual)
  )
}

/**
 * Lê o CSV exportado em Relatório → Exportar CSV e prepara uma MESCLAGEM,
 * nunca uma substituição. Pedidos existentes (mesmo número) permanecem intactos.
 * O relatório contém menos dados que o backup JSON; só recria as informações
 * que aparecem nas linhas do arquivo.
 */
export function prepararMesclaRelatorioCSV(conteudo: string, atual: DB): MesclaRelatorio {
  const linhas = lerLinhasCSV(conteudo)
  const { indiceCabecalho, colunas } = encontrarColunas(linhas)
  const vendedorPorNome = new Map(atual.vendedores.map((v) => [normalizarNome(v.nome), v]))
  const clientePorNome = new Map(atual.clientes.map((c) => [normalizarNome(c.nome), c]))
  const pedidoPorNumero = new Map(atual.pedidos.map((p) => [p.numero, p]))
  const numerosVistos = new Set<number>()
  const vendedoresNovos: Vendedor[] = []
  const clientesNovos: Cliente[] = []
  const pedidosNovos: Pedido[] = []
  let pedidosNoArquivo = 0
  let duplicados = 0
  let conflitos = 0
  let linhasIgnoradas = 0
  let datasSemOrigem = 0
  const agora = new Date().toISOString()
  const hoje = agora.slice(0, 10)

  for (const linha of linhas.slice(indiceCabecalho + 1)) {
    if (!linha.some((celula) => celula.trim())) continue

    const numero = numeroPedido(valorDaCelula(linha, colunas.numero))
    const clienteNome = valorDaCelula(linha, colunas.cliente)
    const vendedorNome = valorDaCelula(linha, colunas.vendedor)
    const valor = numeroBR(valorDaCelula(linha, colunas.valor))
    const metragem = numeroBR(valorDaCelula(linha, colunas.metragem))

    // Rodapé do relatório (ex.: “COMISSÃO 1 a 5 m”) não é linha de pedido.
    if (!numero && /^comissao\b/i.test(normalizarNome(valorDaCelula(linha, colunas.numero)))) continue
    if (!numero || !clienteNome || valor === null || valor < 0) {
      linhasIgnoradas++
      continue
    }
    pedidosNoArquivo++

    const existente = pedidoPorNumero.get(numero)
    if (existente || numerosVistos.has(numero)) {
      duplicados++
      if (existente) {
        const vendedorAtual = atual.vendedores.find((v) => v.id === existente.vendedor_id)?.nome ?? ''
        if (valoresDiferem(existente, clienteNome, vendedorNome, vendedorAtual, metragem, valor)) conflitos++
      }
      numerosVistos.add(numero)
      continue
    }
    numerosVistos.add(numero)

    const chaveVendedor = semVendedor(vendedorNome) ? '' : normalizarNome(vendedorNome)
    let vendedor = chaveVendedor ? vendedorPorNome.get(chaveVendedor) : undefined
    if (chaveVendedor && !vendedor) {
      vendedor = { id: novoId(), nome: vendedorNome.trim(), created_at: agora }
      vendedorPorNome.set(chaveVendedor, vendedor)
      vendedoresNovos.push(vendedor)
    }

    const chaveCliente = normalizarNome(clienteNome)
    let cliente = clientePorNome.get(chaveCliente)
    if (!cliente) {
      cliente = {
        id: novoId(),
        nome: clienteNome.trim(),
        telefone: '',
        email: '',
        observacoes: '',
        vendedor_id: vendedor?.id ?? '',
        valor_especial_metro: null,
        especial: false,
        created_at: agora,
      }
      clientePorNome.set(chaveCliente, cliente)
      clientesNovos.push(cliente)
    }

    const dataPedidoColuna = dataISO(valorDaCelula(linha, colunas.dataPedido))
    const dataPagamento = dataISO(valorDaCelula(linha, colunas.dataPagamento))
    const dataPedido = dataPedidoColuna ?? dataPagamento ?? hoje
    if (!dataPedidoColuna && !dataPagamento) datasSemOrigem++

    const pedidoBase = {
      ...pedidoVazio(),
      id: novoId(),
      numero,
      cliente_nome: clienteNome.trim(),
      cliente_id: cliente.id,
      vendedor_id: vendedor?.id ?? '',
      descricao: valorDaCelula(linha, colunas.descricao),
      metragem,
      valor,
      valor_modo: 'manual' as const,
      estagio: 'concluido' as const,
      iniciado_em: paraISOComHora(dataPedido),
      pago: simNao(valorDaCelula(linha, colunas.pago), Boolean(dataPagamento)),
      forma_pagamento: valorDaCelula(linha, colunas.formaPagamento),
      data_pagamento: dataPagamento,
      data_pedido: paraISOComHora(dataPedido),
      entregue: simNao(valorDaCelula(linha, colunas.entregue), false),
      created_at: agora,
      updated_at: agora,
    }
    pedidosNovos.push(normalizarPedido(pedidoBase as Partial<Pedido> & Record<string, unknown>))
  }

  if (!pedidosNoArquivo) {
    throw new Error('Não encontrei pedidos no CSV. Confira se exportou o relatório geral com pelo menos uma fila concluída.')
  }

  return {
    pedidosNoArquivo,
    pedidosNovos,
    clientesNovos,
    vendedoresNovos,
    duplicados,
    conflitos,
    linhasIgnoradas,
    datasSemOrigem,
  }
}
