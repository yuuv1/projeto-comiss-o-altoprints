import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import {
  carregarTudo,
  limparTudo,
  MODO_NUVEM,
  removerArquivosDoPedido,
  removerRegistro,
  salvarConfiguracoes,
  salvarRegistro,
  salvarVarios,
  substituirTudo,
} from './backend'
import { apagarVariosArquivos, enviarArquivo, novoId } from './files'
import { calcularValor, proximoNumero } from './pricing'
import { gerarDadosDemo } from './seed'
import {
  CONFIG_PADRAO,
  type Arquivo,
  type Cliente,
  type Configuracoes,
  type DB,
  type ID,
  type Pedido,
  type Vendedor,
} from './types'

export interface Toast {
  id: number
  texto: string
  tipo: 'sucesso' | 'erro' | 'info'
}

interface Ctx {
  db: DB
  carregando: boolean
  erro: string | null
  nuvem: boolean
  limparErro: () => void
  recarregar: () => Promise<DB>
  /* toasts */
  toasts: Toast[]
  avisar: (texto: string, tipo?: Toast['tipo']) => void
  fecharToast: (id: number) => void
  /* vendedores */
  salvarVendedor: (dados: { nome: string }, id?: ID) => Promise<void>
  excluirVendedor: (id: ID) => Promise<void>
  /* clientes */
  salvarCliente: (dados: Omit<Cliente, 'id' | 'created_at'>, id?: ID) => Promise<void>
  excluirCliente: (id: ID) => Promise<void>
  /* pedidos */
  salvarPedido: (dados: Omit<Pedido, 'id'>, id: ID | undefined, arquivosNovos: File[]) => Promise<Pedido>
  atualizarPedido: (id: ID, patch: Partial<Pedido>) => Promise<void>
  excluirPedido: (id: ID) => Promise<void>
  /* arquivos */
  enviarArquivos: (pedidoId: ID, arquivos: File[]) => Promise<void>
  excluirArquivoDoPedido: (arquivo: Arquivo) => Promise<void>
  /* configurações */
  salvarConfig: (parcial: Partial<Configuracoes>) => Promise<void>
  resetarDados: () => Promise<void>
  carregarDemo: () => Promise<void>
  /* utilidades */
  vendedorPorId: (id: ID | '' | null | undefined) => Vendedor | undefined
  nomeVendedor: (id: ID | '' | null | undefined) => string
  proximoNumeroPedido: number
  pedidoPorId: (id: ID | undefined) => Pedido | undefined
}

const StoreContext = createContext<Ctx | null>(null)

const dbVazio = (): DB => ({
  vendedores: [],
  clientes: [],
  pedidos: [],
  arquivos: [],
  configuracoes: { ...CONFIG_PADRAO },
})

const CHAVE_DEMO = 'altoprints:demo-inicial-carregada'

export function StoreProvider({ children }: { children: ReactNode }) {
  const [db, setDb] = useState<DB>(dbVazio())
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState<string | null>(null)
  const [toasts, setToasts] = useState<Toast[]>([])
  const contadorToast = useRef(0)

  const avisar = useCallback((texto: string, tipo: Toast['tipo'] = 'sucesso') => {
    contadorToast.current += 1
    const id = contadorToast.current
    setToasts((t) => [...t, { id, texto, tipo }])
    window.setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4200)
  }, [])

  const fecharToast = useCallback((id: number) => setToasts((t) => t.filter((x) => x.id !== id)), [])

  const recarregar = useCallback(async () => {
    setCarregando(true)
    try {
      const dados = await carregarTudo()
      setDb(dados)
      setErro(null)
      return dados
    } catch (e) {
      setErro((e as Error).message)
      throw e
    } finally {
      setCarregando(false)
    }
  }, [])

  // primeira carga
  useEffect(() => {
    ;(async () => {
      try {
        const dados = await carregarTudo()
        const vazio = !dados.pedidos.length && !dados.clientes.length && !dados.vendedores.length
        const jaCarregouDemo = localStorage.getItem(CHAVE_DEMO) === '1'
        if (vazio && !jaCarregouDemo && !MODO_NUVEM) {
          const demo = gerarDadosDemo()
          await substituirTudo(demo)
          localStorage.setItem(CHAVE_DEMO, '1')
          setDb(demo)
        } else {
          setDb(dados)
        }
        setErro(null)
      } catch (e) {
        setErro((e as Error).message)
      } finally {
        setCarregando(false)
      }
    })()
  }, [])

  /* ----------------------------- vendedores ----------------------------- */

  const salvarVendedor = useCallback(
    async (dados: { nome: string }, id?: ID) => {
      const nome = dados.nome.trim()
      if (!nome) throw new Error('Informe o nome do vendedor.')
      const existente = id ? db.vendedores.find((v) => v.id === id) : undefined
      const registro: Vendedor = {
        id: id ?? novoId(),
        nome,
        created_at: existente?.created_at ?? new Date().toISOString(),
      }
      await salvarRegistro('vendedores', registro)
      setDb((atual) => ({
        ...atual,
        vendedores: existente
          ? atual.vendedores.map((v) => (v.id === registro.id ? registro : v))
          : [...atual.vendedores, registro].sort((a, b) => a.nome.localeCompare(b.nome)),
      }))
      avisar(existente ? 'Vendedor atualizado com sucesso!' : 'Vendedor cadastrado com sucesso!')
    },
    [avisar, db.vendedores],
  )

  const excluirVendedor = useCallback(
    async (id: ID) => {
      await removerRegistro('vendedores', id)
      setDb((atual) => ({ ...atual, vendedores: atual.vendedores.filter((v) => v.id !== id) }))
      avisar('Vendedor excluído.', 'info')
    },
    [avisar],
  )

  /* ------------------------------ clientes ------------------------------ */

  const salvarCliente = useCallback(
    async (dados: Omit<Cliente, 'id' | 'created_at'>, id?: ID) => {
      if (!dados.nome.trim()) throw new Error('O nome do cliente é obrigatório.')
      if (!dados.vendedor_id) throw new Error('Escolha o vendedor responsável.')
      const existente = id ? db.clientes.find((c) => c.id === id) : undefined
      const registro: Cliente = {
        ...dados,
        nome: dados.nome.trim(),
        id: id ?? novoId(),
        created_at: existente?.created_at ?? new Date().toISOString(),
      }
      await salvarRegistro('clientes', registro)
      setDb((atual) => ({
        ...atual,
        clientes: existente
          ? atual.clientes.map((c) => (c.id === registro.id ? registro : c))
          : [...atual.clientes, registro].sort((a, b) => a.nome.localeCompare(b.nome)),
      }))
      avisar(existente ? 'Cliente atualizado com sucesso!' : 'Cliente cadastrado com sucesso!')
    },
    [avisar, db.clientes],
  )

  const excluirCliente = useCallback(
    async (id: ID) => {
      await removerRegistro('clientes', id)
      setDb((atual) => ({ ...atual, clientes: atual.clientes.filter((c) => c.id !== id) }))
      avisar('Cliente excluído.', 'info')
    },
    [avisar],
  )

  /* ------------------------------- pedidos ------------------------------ */

  const enviarArquivos = useCallback(
    async (pedidoId: ID, arquivos: File[]) => {
      if (!arquivos.length) return
      const registros: Arquivo[] = []
      for (const f of arquivos) registros.push(await enviarArquivo(pedidoId, f))
      await salvarVarios('arquivos', registros)
      setDb((atual) => ({ ...atual, arquivos: [...registros, ...atual.arquivos] }))
    },
    [],
  )

  const salvarPedido = useCallback(
    async (dados: Omit<Pedido, 'id'>, id: ID | undefined, arquivosNovos: File[]) => {
      if (!dados.cliente_nome.trim()) throw new Error('Informe o nome do cliente.')
      if (!dados.vendedor_id) throw new Error('Escolha o vendedor responsável.')

      const existente = id ? db.pedidos.find((p) => p.id === id) : undefined
      const agora = new Date().toISOString()
      const clienteVinculado = db.clientes.find(
        (c) => c.nome.toLowerCase() === dados.cliente_nome.trim().toLowerCase(),
      )
      const valorEspecial = clienteVinculado?.valor_especial_metro ?? null

      const valor =
        dados.valor_modo === 'auto'
          ? calcularValor(dados.metragem, valorEspecial)
          : Number(Number(dados.valor || 0).toFixed(2))

      const impresso = dados.impresso || dados.status_producao === 'dtf_pronto'
      const mudouParaPronto = !existente?.impresso && impresso

      const registro: Pedido = {
        ...dados,
        cliente_nome: dados.cliente_nome.trim(),
        cliente_id: clienteVinculado?.id ?? existente?.cliente_id ?? null,
        valor,
        impresso,
        impresso_em: impresso ? existente?.impresso_em ?? dados.impresso_em ?? agora : null,
        aviso_visto: mudouParaPronto ? false : dados.aviso_visto,
        id: id ?? novoId(),
        numero: existente?.numero ?? proximoNumero(db.pedidos.map((p) => p.numero)),
        created_at: existente?.created_at ?? agora,
        updated_at: agora,
      }

      await salvarRegistro('pedidos', registro)
      if (arquivosNovos.length) await enviarArquivos(registro.id, arquivosNovos)

      setDb((atual) => {
        const pedidos = existente
          ? atual.pedidos.map((p) => (p.id === registro.id ? registro : p))
          : [registro, ...atual.pedidos]
        return { ...atual, pedidos }
      })

      avisar(existente ? `Pedido #${registro.numero} atualizado com sucesso!` : `Pedido #${registro.numero} criado com sucesso!`)
      return registro
    },
    [avisar, db.clientes, db.pedidos, enviarArquivos],
  )

  const atualizarPedido = useCallback(
    async (id: ID, patch: Partial<Pedido>) => {
      const atual = db.pedidos.find((p) => p.id === id)
      if (!atual) return
      const registro: Pedido = { ...atual, ...patch, updated_at: new Date().toISOString() }
      await salvarRegistro('pedidos', registro)
      setDb((d) => ({ ...d, pedidos: d.pedidos.map((p) => (p.id === id ? registro : p)) }))
    },
    [db.pedidos],
  )

  const excluirPedido = useCallback(
    async (id: ID) => {
      const arquivos = db.arquivos.filter((a) => a.pedido_id === id)
      await apagarVariosArquivos(arquivos)
      await removerArquivosDoPedido(id)
      await removerRegistro('pedidos', id)
      setDb((atual) => ({
        ...atual,
        pedidos: atual.pedidos.filter((p) => p.id !== id),
        arquivos: atual.arquivos.filter((a) => a.pedido_id !== id),
      }))
      avisar('Pedido excluído.', 'info')
    },
    [avisar, db.arquivos],
  )

  const excluirArquivoDoPedido = useCallback(
    async (arquivo: Arquivo) => {
      await apagarVariosArquivos([arquivo])
      await removerRegistro('arquivos', arquivo.id)
      setDb((atual) => ({ ...atual, arquivos: atual.arquivos.filter((a) => a.id !== arquivo.id) }))
      avisar('Arquivo excluído.', 'info')
    },
    [avisar],
  )

  /* ---------------------------- configurações --------------------------- */

  const salvarConfig = useCallback(
    async (parcial: Partial<Configuracoes>) => {
      await salvarConfiguracoes(parcial)
      setDb((atual) => ({ ...atual, configuracoes: { ...atual.configuracoes, ...parcial } }))
    },
    [],
  )

  const resetarDados = useCallback(async () => {
    await limparTudo()
    const vazio = dbVazio()
    localStorage.setItem(CHAVE_DEMO, '1')
    setDb(vazio)
    avisar('Todos os dados foram apagados.', 'info')
  }, [avisar])

  const carregarDemo = useCallback(async () => {
    const demo = gerarDadosDemo()
    await substituirTudo(demo)
    localStorage.setItem(CHAVE_DEMO, '1')
    setDb(demo)
    avisar('Dados de demonstração carregados!')
  }, [avisar])

  /* ------------------------------ utilidades ---------------------------- */

  const vendedorPorId = useCallback(
    (id: ID | '' | null | undefined) => db.vendedores.find((v) => v.id === id),
    [db.vendedores],
  )
  const nomeVendedor = useCallback(
    (id: ID | '' | null | undefined) => vendedorPorId(id)?.nome ?? 'Sem vendedor',
    [vendedorPorId],
  )
  const pedidoPorId = useCallback((id: ID | undefined) => db.pedidos.find((p) => p.id === id), [db.pedidos])

  const valor: Ctx = useMemo(
    () => ({
      db,
      carregando,
      erro,
      nuvem: MODO_NUVEM,
      limparErro: () => setErro(null),
      recarregar,
      toasts,
      avisar,
      fecharToast,
      salvarVendedor,
      excluirVendedor,
      salvarCliente,
      excluirCliente,
      salvarPedido,
      atualizarPedido,
      excluirPedido,
      enviarArquivos,
      excluirArquivoDoPedido,
      salvarConfig,
      resetarDados,
      carregarDemo,
      vendedorPorId,
      nomeVendedor,
      proximoNumeroPedido: proximoNumero(db.pedidos.map((p) => p.numero)),
      pedidoPorId,
    }),
    [
      db,
      carregando,
      erro,
      recarregar,
      toasts,
      avisar,
      fecharToast,
      salvarVendedor,
      excluirVendedor,
      salvarCliente,
      excluirCliente,
      salvarPedido,
      atualizarPedido,
      excluirPedido,
      enviarArquivos,
      excluirArquivoDoPedido,
      salvarConfig,
      resetarDados,
      carregarDemo,
      vendedorPorId,
      nomeVendedor,
      pedidoPorId,
    ],
  )

  return <StoreContext.Provider value={valor}>{children}</StoreContext.Provider>
}

export const useStore = () => {
  const ctx = useContext(StoreContext)
  if (!ctx) throw new Error('useStore precisa estar dentro de <StoreProvider>')
  return ctx
}
