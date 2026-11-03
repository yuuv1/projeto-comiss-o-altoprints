import { novoId } from './files'
import {
  CONFIG_PADRAO,
  normalizarPedido,
  type Arquivo,
  type Cliente,
  type DB,
  type Impressao,
  type Pedido,
  type Usuario,
  type Vendedor,
} from './types'

type Objeto = Record<string, unknown>

const ehObjeto = (valor: unknown): valor is Objeto =>
  typeof valor === 'object' && valor !== null && !Array.isArray(valor)

const texto = (valor: unknown) => (typeof valor === 'string' || typeof valor === 'number' ? String(valor) : '')
const agoraISO = () => new Date().toISOString()
const listaDeObjetos = (valor: unknown): Objeto[] => (Array.isArray(valor) ? valor.filter(ehObjeto) : [])

/** Desembrulha os formatos que apareceram no histórico: DB puro, { db }, { dados } e { data }. */
function lerDados(bruto: unknown): Objeto {
  let atual: unknown = bruto
  for (let tentativas = 0; tentativas < 5; tentativas++) {
    if (!ehObjeto(atual)) break
    if (Array.isArray(atual.pedidos) || Array.isArray(atual.clientes)) return atual
    const proximo = [atual.dados, atual.db, atual.data, atual.backup].find(ehObjeto)
    if (!proximo) break
    atual = proximo
  }
  throw new Error('Este arquivo não parece ser um backup do sistema (faltam os pedidos e clientes).')
}

const normalizarVendedor = (bruto: Objeto): Vendedor | null => {
  const nome = texto(bruto.nome ?? bruto.name).trim()
  if (!nome) return null
  return {
    id: texto(bruto.id) || novoId(),
    nome,
    created_at: texto(bruto.created_at ?? bruto.criado_em) || agoraISO(),
  }
}

const normalizarCliente = (bruto: Objeto): Cliente | null => {
  const nome = texto(bruto.nome ?? bruto.name).trim()
  if (!nome) return null
  const valorBruto = bruto.valor_especial_metro
  const textoValor = texto(valorBruto).trim()
  const valor =
    typeof valorBruto === 'number' ? valorBruto : textoValor ? Number(textoValor.replace(',', '.')) : Number.NaN
  return {
    id: texto(bruto.id) || novoId(),
    nome,
    telefone: texto(bruto.telefone ?? bruto.celular),
    email: texto(bruto.email),
    observacoes: texto(bruto.observacoes ?? bruto.observacao),
    vendedor_id: texto(bruto.vendedor_id),
    valor_especial_metro: Number.isFinite(valor) ? valor : null,
    especial: typeof bruto.especial === 'boolean' ? bruto.especial : Boolean(bruto.especial),
    created_at: texto(bruto.created_at ?? bruto.criado_em) || agoraISO(),
  }
}

const nomeChave = (nome: string) => nome.trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('pt-BR')

const semDuplicadosPorId = <T extends { id: string }>(lista: T[]): T[] => {
  const vistos = new Set<string>()
  const resultado: T[] = []
  for (const item of lista) {
    if (!item.id || vistos.has(item.id)) continue
    vistos.add(item.id)
    resultado.push(item)
  }
  return resultado
}

const normalizarArquivo = (bruto: Objeto, idsPedidos: Set<string>): Arquivo | null => {
  const pedidoId = texto(bruto.pedido_id).trim()
  if (!pedidoId || !idsPedidos.has(pedidoId)) return null
  const tamanhoBruto = Number(bruto.tamanho ?? 0)
  return {
    id: texto(bruto.id).trim() || novoId(),
    pedido_id: pedidoId,
    nome: texto(bruto.nome ?? 'arquivo').trim() || 'arquivo',
    tipo: texto(bruto.tipo),
    tamanho: Number.isFinite(tamanhoBruto) && tamanhoBruto >= 0 ? Math.trunc(tamanhoBruto) : 0,
    url: texto(bruto.url),
    created_at: texto(bruto.created_at ?? bruto.criado_em) || agoraISO(),
  }
}

const normalizarImpressao = (bruto: Objeto, idsPedidos: Set<string>): Impressao | null => {
  const pedidoId = texto(bruto.pedido_id).trim()
  if (!pedidoId || !idsPedidos.has(pedidoId)) return null
  const numeroBruto = Number(bruto.pedido_numero ?? 0)
  const metrosBruto = Number(String(bruto.metros ?? 0).replace(',', '.'))
  return {
    id: texto(bruto.id).trim() || novoId(),
    pedido_id: pedidoId,
    pedido_numero: Number.isFinite(numeroBruto) ? Math.trunc(numeroBruto) : 0,
    cliente_nome: texto(bruto.cliente_nome),
    arquivo_id: texto(bruto.arquivo_id),
    arquivo_nome: texto(bruto.arquivo_nome),
    metros: Number.isFinite(metrosBruto) ? metrosBruto : 0,
    quem: texto(bruto.quem),
    usuario_id: texto(bruto.usuario_id),
    tipo: texto(bruto.tipo) === 'reimpressao' ? 'reimpressao' : 'impressao',
    motivo: texto(bruto.motivo),
    observacao: texto(bruto.observacao),
    quando: texto(bruto.quando ?? bruto.created_at) || agoraISO(),
    created_at: texto(bruto.created_at ?? bruto.quando) || agoraISO(),
  }
}

/**
 * Converte backups baixados pelas versões antigas do Altoprints para o formato atual.
 * Não restaura logins de funcionário: seus nomes/vínculos viram cadastros de equipe.
 */
export function prepararBackup(bruto: unknown, usuariosAtuais: Usuario[] = []): DB {
  const dados = lerDados(bruto)
  const usuariosDoArquivo = listaDeObjetos(dados.usuarios)

  const vendedores: Vendedor[] = semDuplicadosPorId(
    listaDeObjetos(dados.vendedores)
      .map(normalizarVendedor)
      .filter((v): v is Vendedor => Boolean(v)),
  )
  const idsVendedores = new Set(vendedores.map((v) => v.id))
  const nomesVendedores = new Map(vendedores.map((v) => [nomeChave(v.nome), v.id]))
  const aliasesVendedores = new Map<string, string>()

  // Antes da versão 1.4, a equipe também tinha contas em "usuarios". Se um
  // backup antigo não tiver a linha correspondente em "vendedores", recupera
  // o nome e o ID vinculado para não perder ninguém nem quebrar o histórico.
  for (const usuario of usuariosDoArquivo) {
    const vendedorIdDoArquivo = texto(usuario.vendedor_id)
    if (usuario.papel === 'proprietario' || (usuario.papel !== 'vendedor' && !vendedorIdDoArquivo)) continue
    const nome = texto(usuario.nome).trim()
    if (!nome) continue
    const id = vendedorIdDoArquivo || texto(usuario.id) || novoId()
    if (idsVendedores.has(id)) continue
    const vendedorMesmoNome = nomesVendedores.get(nomeChave(nome))
    if (vendedorMesmoNome) {
      aliasesVendedores.set(id, vendedorMesmoNome)
      continue
    }
    vendedores.push({ id, nome, created_at: texto(usuario.criado_em ?? usuario.created_at) || agoraISO() })
    idsVendedores.add(id)
    nomesVendedores.set(nomeChave(nome), id)
  }

  const clientes: Cliente[] = semDuplicadosPorId(
    listaDeObjetos(dados.clientes)
      .map(normalizarCliente)
      .filter((c): c is Cliente => Boolean(c))
      .map((c) => ({ ...c, vendedor_id: aliasesVendedores.get(c.vendedor_id) ?? c.vendedor_id })),
  )

  const pedidos: Pedido[] = semDuplicadosPorId(
    listaDeObjetos(dados.pedidos)
      .map((p) => {
        const normalizado = normalizarPedido(p as Partial<Pedido> & Record<string, unknown>)
        return {
          ...normalizado,
          id: texto(normalizado.id).trim() || novoId(),
          vendedor_id: aliasesVendedores.get(normalizado.vendedor_id) ?? normalizado.vendedor_id,
        }
      }),
  )
  const idsPedidos = new Set(pedidos.map((p) => p.id))

  const donosAtuais = usuariosAtuais.filter((u) => u.papel === 'proprietario')
  const donosAtuaisPorUsuario = new Map(donosAtuais.map((u) => [u.usuario.trim().toLowerCase(), u]))

  const donosDoArquivo: Usuario[] = usuariosDoArquivo
    .filter((u) => u.papel !== 'vendedor' && Boolean(texto(u.senha_hash)))
    .map((u) => {
      const login = texto(u.usuario).trim()
      const atualMesmoLogin = donosAtuaisPorUsuario.get(login.toLowerCase())
      return {
        id: atualMesmoLogin?.id || texto(u.id) || novoId(),
        nome: texto(u.nome).trim(),
        usuario: login,
        senha_hash: texto(u.senha_hash),
        papel: 'proprietario' as const,
        vendedor_id: '',
        ativo: typeof u.ativo === 'boolean' ? u.ativo : true,
        auth_id: texto(u.auth_id) || undefined,
        telas: ehObjeto(u.telas) ? (u.telas as Usuario['telas']) : {},
        criado_em: texto(u.criado_em ?? u.created_at) || agoraISO(),
      }
    })
    .filter((u) => u.nome && u.usuario)

  const loginsDoArquivo = new Set(donosDoArquivo.map((u) => u.usuario.trim().toLowerCase()))
  const usuariosPreservados = donosDoArquivo.length
    ? [
        ...donosDoArquivo,
        ...donosAtuais.filter((u) => !loginsDoArquivo.has(u.usuario.trim().toLowerCase())),
      ]
    : donosAtuais

  const configuracoes = ehObjeto(dados.configuracoes) ? dados.configuracoes : {}

  return {
    vendedores,
    clientes,
    pedidos,
    arquivos: semDuplicadosPorId(
      listaDeObjetos(dados.arquivos)
        .map((a) => normalizarArquivo(a, idsPedidos))
        .filter((a): a is Arquivo => Boolean(a)),
    ),
    impressoes: semDuplicadosPorId(
      listaDeObjetos(dados.impressoes)
        .map((i) => normalizarImpressao(i, idsPedidos))
        .filter((i): i is Impressao => Boolean(i)),
    ),
    usuarios: semDuplicadosPorId(usuariosPreservados),
    configuracoes: { ...CONFIG_PADRAO, ...configuracoes, modo_exemplo: false },
  }
}
