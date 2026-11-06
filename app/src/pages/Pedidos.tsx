import { CheckCircle2, ClipboardList, Filter, Layers, PackageCheck, Pencil, Plus, Rows2, Rows3, Square, Trash2 } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { PedidoCartao, useAcoesPedido } from '../components/pedido'
import { BarraBusca, Botao, CartaoResumo, Pilulas, TituloPagina, Vazio, cn } from '../components/ui'
import { useAuth } from '../lib/auth'
import { moeda, numeroBR } from '../lib/format'
import { lsGravar, lsLer } from '../lib/local'
import { useStore } from '../lib/store'
import { combinaFiltro, FILTROS_FILA, rotuloTipoDtf, type FiltroFila, type PassoFila, type Pedido } from '../lib/types'

/**
 * Largura da fila — quanto cada cartão de pedido ocupa na tela.
 *
 * A escolha fica salva no aparelho e só muda a GRADE (colunas). O cartão em si
 * é fluido, então nada de largura fixa: em telas estreitas a grade cai sozinha
 * para uma coluna, sem estourar a página (era isso que "quebrava" quando a
 * largura era trocada).
 */
type LarguraFila = 'compacta' | 'media' | 'larga'

const CHAVE_LARGURA = 'altoprints:largura-fila'

const LARGURAS: { id: LarguraFila; label: string; icone: typeof Square; min: string; ajuda: string }[] = [
  { id: 'compacta', label: 'Compacta', icone: Rows2, min: '260px', ajuda: 'Mais filas por tela' },
  { id: 'media', label: 'Média', icone: Square, min: '360px', ajuda: 'Equilíbrio entre leitura e quantidade' },
  { id: 'larga', label: 'Larga', icone: Rows3, min: '520px', ajuda: 'Um cartão bem largo, fácil de ler' },
]

/**
 * Pedidos — catálogo de filas já feitas e pagas.
 */
export default function Pedidos() {
  const { db, nomeVendedor } = useStore()
  const { ehProprietario } = useAuth()
  const acoes = useAcoesPedido()
  const navegar = useNavigate()
  const [busca, setBusca] = useState('')
  const [parametros, setParametros] = useSearchParams()
  const vendedorFiltro = parametros.get('vendedor') ?? ''
  const [filtro, setFiltro] = useState<FiltroFila>(() => {
    const pedido = parametros.get('filtro')
    return FILTROS_FILA.some((f) => f.id === pedido) ? (pedido as FiltroFila) : 'todas'
  })
  const [larguraFila, setLarguraFila] = useState<LarguraFila>(() => {
    const salvo = lsLer(CHAVE_LARGURA)
    return LARGURAS.some((l) => l.id === salvo) ? (salvo as LarguraFila) : 'media'
  })

  const escolherLargura = (valor: LarguraFila) => {
    setLarguraFila(valor)
    lsGravar(CHAVE_LARGURA, valor)
  }

  // a grade se ajusta ao tamanho da janela: nada de coluna fixa sobrando na tela
  const [larguraJanela, setLarguraJanela] = useState(() =>
    typeof window === 'undefined' ? 1280 : window.innerWidth,
  )
  useEffect(() => {
    let quadro = 0
    const aoRedimensionar = () => {
      cancelAnimationFrame(quadro)
      quadro = requestAnimationFrame(() => setLarguraJanela(window.innerWidth))
    }
    window.addEventListener('resize', aoRedimensionar)
    return () => {
      cancelAnimationFrame(quadro)
      window.removeEventListener('resize', aoRedimensionar)
    }
  }, [])

  const colunasDaFila = useMemo(() => {
    const min = Number.parseInt(LARGURAS.find((l) => l.id === larguraFila)?.min ?? '360px', 10)
    const disponivel = Math.max(280, Math.min(larguraJanela, 1900) - 32)
    return Math.max(1, Math.min(4, Math.floor(disponivel / min)))
  }, [larguraFila, larguraJanela])

  /** tira o filtro de vendedor da barra de endereço (volta a ver todo mundo) */
  const limparVendedor = () => {
    const novos = new URLSearchParams(parametros)
    novos.delete('vendedor')
    setParametros(novos, { replace: true })
  }

  /*
   * A equipe vê o quadro inteiro de filas (é uma loja só, sem login de
   * funcionário). Excluir pedido continua sendo recurso do proprietário.
   */
  const meus = useMemo(() => {
    const base = db.pedidos
    return vendedorFiltro ? base.filter((p) => p.vendedor_id === vendedorFiltro) : base
  }, [db.pedidos, vendedorFiltro])

  const podeEditar = true
  const podeExcluir = ehProprietario

  const pedidos = useMemo(() => [...meus].sort((a, b) => b.numero - a.numero), [meus])

  const contagem = useMemo(
    () => Object.fromEntries(FILTROS_FILA.map((f) => [f.id, pedidos.filter((p) => combinaFiltro(p, f.id)).length])),
    [pedidos],
  ) as Record<FiltroFila, number>

  const daEtapa = useMemo(() => pedidos.filter((p) => combinaFiltro(p, filtro)), [filtro, pedidos])

  const filtrados = useMemo(() => {
    const t = busca.trim().toLowerCase()
    if (!t) return daEtapa
    return daEtapa.filter((p) =>
      [p.cliente_nome, String(p.numero), `#${p.numero}`, rotuloTipoDtf(p.tipo_dtf), p.descricao, p.cidade, p.observacoes]
        .join(' ')
        .toLowerCase()
        .includes(t),
    )
  }, [busca, daEtapa])

  const resumo = useMemo(
    () => ({
      metragem: daEtapa.reduce((s, p) => s + Number(p.metragem || 0), 0),
      valor: daEtapa.reduce((s, p) => s + Number(p.valor || 0), 0),
    }),
    [daEtapa],
  )

  /** dispara a ação sem deixar erro solto (o aviso do modo visualização já aparece) */
  const disparar = (promessa: Promise<unknown>) => {
    void promessa.catch(() => {})
  }

  const aoPasso = (p: Pedido, passo: PassoFila) => {
    disparar(acoes.alternarPasso(p, passo))
  }

  const ajuda = FILTROS_FILA.find((f) => f.id === filtro)?.ajuda ?? ''

  const acoesDoCartao = (p: Pedido) => (
    <>
      <Botao tamanho="sm" variante="secundario" icone={Pencil} onClick={() => acoes.editar(p)}>
        {podeEditar ? 'Editar' : 'Ver'}
      </Botao>
      {podeExcluir ? (
        <Botao
          tamanho="sm"
          variante="ghost"
          className="text-rose-500 hover:bg-rose-50"
          icone={Trash2}
          onClick={() => disparar(acoes.pedirExclusao(p))}
        >
          Excluir
        </Botao>
      ) : null}
    </>
  )

  return (
    <>
      <TituloPagina
        icone={ClipboardList}
        titulo="Pedidos"
        subtitulo="Catálogo de filas já feitas e pagas do DTF Têxtil."
        acoes={
          <Botao icone={Plus} onClick={() => navegar('/pedido/novo')}>
            Registrar fila
          </Botao>
        }
      />

      {!ehProprietario ? (
        <p className="mb-3 rounded-xl border border-sky-200 bg-sky-50 px-3 py-2 text-xs font-semibold text-sky-800 dark:border-sky-900 dark:bg-sky-950/40 dark:text-sky-200">
          Você está usando o sistema <b>sem login</b>. Ao registrar uma fila, escolha o <b>seu nome</b> — ele fica gravado no pedido e entra no relatório de comissão.
        </p>
      ) : null}

      {vendedorFiltro ? (
        <div className="mb-3 flex flex-wrap items-center gap-2 rounded-xl border border-purple-200 bg-purple-50 px-3 py-2 text-xs font-semibold text-purple-800 dark:border-purple-900 dark:bg-purple-950/40 dark:text-purple-200">
          <Filter className="h-4 w-4" />
          Mostrando só os pedidos de <b>{nomeVendedor(vendedorFiltro)}</b>
          <button
            onClick={limparVendedor}
            className="ml-auto rounded-lg border border-purple-300 bg-white px-2 py-1 text-[11px] font-bold text-purple-700 transition hover:bg-purple-100 dark:border-purple-800 dark:bg-slate-900 dark:text-purple-300"
          >
            Ver todos os vendedores
          </button>
        </div>
      ) : null}

      <div className="mb-3 grid grid-cols-2 gap-3 lg:grid-cols-3">
        <CartaoResumo
          titulo="Concluídas"
          valor={contagem.todas}
          icone={CheckCircle2}
          gradiente="from-emerald-500 to-green-600"
          sub="filas feitas e pagas"
        />
        <CartaoResumo
          titulo="DTF Têxtil"
          valor={contagem.textil}
          icone={Layers}
          gradiente="from-pink-500 to-purple-600"
          sub="filas de DTF Têxtil"
        />
        <CartaoResumo
          titulo="Entregues"
          valor={contagem.entregue}
          icone={PackageCheck}
          gradiente="from-violet-500 to-indigo-600"
          sub="recebidas pelo cliente"
        />
      </div>

      <Pilulas<FiltroFila>
        className="mb-3"
        ativo={filtro}
        onChange={setFiltro}
        itens={FILTROS_FILA.map((f) => ({ id: f.id, label: f.label, contador: contagem[f.id] }))}
      />

      <BarraBusca
        className="mb-3"
        valor={busca}
        onChange={setBusca}
        placeholder="Buscar por cliente, nº da fila, descrição ou cidade..."
      />

      <div className="mb-3 flex flex-wrap items-center gap-2 rounded-xl border border-slate-100 bg-white/80 px-2.5 py-2 shadow-sm dark:border-slate-800 dark:bg-slate-900/70">
        <span className="text-[11px] font-black uppercase tracking-wide text-slate-500 dark:text-slate-400">
          Largura da fila
        </span>
        <div className="flex overflow-hidden rounded-lg border border-slate-200 dark:border-slate-700">
          {LARGURAS.map((l) => {
            const Icone = l.icone
            const ativo = larguraFila === l.id
            return (
              <button
                key={l.id}
                type="button"
                onClick={() => escolherLargura(l.id)}
                title={l.ajuda}
                className={cn(
                  'inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold transition',
                  ativo
                    ? 'bg-gradient-to-r from-pink-500 via-purple-600 to-indigo-600 text-white'
                    : 'bg-white text-slate-500 hover:text-purple-700 dark:bg-slate-800 dark:text-slate-300',
                )}
              >
                <Icone className="h-3.5 w-3.5" />
                {l.label}
              </button>
            )
          })}
        </div>
        <span className="text-[11px] font-semibold text-slate-400 dark:text-slate-500">
          {colunasDaFila} {colunasDaFila === 1 ? 'fila por linha' : 'filas por linha'}
        </span>
      </div>

      <p className="mb-3 text-xs font-semibold text-slate-500 dark:text-slate-400">
        {ajuda} {filtrados.length} fila{filtrados.length === 1 ? '' : 's'}
        {busca ? ' encontrada(s)' : ''} • {numeroBR(resumo.metragem)} m • {moeda(resumo.valor)}
      </p>

      {filtrados.length === 0 ? (
        <Vazio
          icone={filtro === 'entregue' ? PackageCheck : ClipboardList}
          titulo={busca ? 'Nenhuma fila encontrada' : filtro === 'todas' ? 'Nenhuma fila registrada ainda' : 'Nada por aqui'}
          descricao={busca ? 'Tente buscar por outro termo.' : ajuda}
          acao={
            !busca && filtro === 'todas' ? (
              <Botao icone={Plus} onClick={() => navegar('/pedido/novo')}>
                Registrar fila
              </Botao>
            ) : undefined
          }
        />
      ) : (
        <div
          className="grid animate-fade-in-up gap-3"
          style={{ gridTemplateColumns: `repeat(${colunasDaFila}, minmax(0, 1fr))` }}
        >
          {filtrados.map((p) => (
            <PedidoCartao
              key={p.id}
              pedido={p}
              mostrarVendedor
              mostrarValor
              onPasso={(passo) => aoPasso(p, passo)}
              acoes={acoesDoCartao(p)}
            />
          ))}
        </div>
      )}

      {acoes.dialog}
    </>
  )
}
