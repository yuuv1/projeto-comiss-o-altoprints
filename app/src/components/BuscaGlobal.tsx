/**
 * Busca rápida (Ctrl + K): uma janela que acha pedido, cliente ou vendedor
 * de qualquer tela. Quem vende só encontra o que é dele.
 */
import { ClipboardList, CornerDownLeft, Search, UserRound, Users, X } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../lib/auth'
import { buscarTudo, type Achado } from '../lib/busca'
import { dataBR, moeda, numeroBR } from '../lib/format'
import { useStore } from '../lib/store'
import { cn } from './ui'

const DICAS = ['nome do cliente', 'nº do pedido (ex.: 12)', 'telefone', 'cidade', 'código de rastreio']

export function BuscaGlobal({ aberto, onFechar }: { aberto: boolean; onFechar: () => void }) {
  const { db, nomeVendedor } = useStore()
  const { usuario, ehProprietario } = useAuth()
  const navegar = useNavigate()
  const [termo, setTermo] = useState('')
  const campo = useRef<HTMLInputElement | null>(null)
  const [selecionado, setSelecionado] = useState(0)

  const achados = useMemo(
    () =>
      buscarTudo(db, termo, {
        vendedorId: ehProprietario ? '' : usuario?.vendedor_id ?? '',
        verVendedores: ehProprietario,
      }),
    [db, ehProprietario, termo, usuario?.vendedor_id],
  )

  // abre limpo e com o cursor no campo
  useEffect(() => {
    if (!aberto) return
    setTermo('')
    setSelecionado(0)
    const t = window.setTimeout(() => campo.current?.focus(), 40)
    return () => window.clearTimeout(t)
  }, [aberto])

  useEffect(() => {
    setSelecionado(0)
  }, [termo])

  if (!aberto) return null

  const abrir = (achado: Achado) => {
    onFechar()
    if (achado.tipo === 'pedido') navegar(`/pedido/${achado.pedido.id}`)
    else if (achado.tipo === 'cliente') navegar(`/clientes?busca=${encodeURIComponent(achado.cliente.nome)}`)
    else navegar(`/pedidos?vendedor=${achado.vendedor.id}`)
  }

  const aoTeclar = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') {
      onFechar()
      return
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelecionado((i) => Math.min(i + 1, achados.length - 1))
      return
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelecionado((i) => Math.max(i - 1, 0))
      return
    }
    if (e.key === 'Enter' && achados[selecionado]) {
      e.preventDefault()
      abrir(achados[selecionado])
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-slate-900/45 p-3 pt-[8vh] backdrop-blur-sm print:hidden"
      onClick={onFechar}
      role="presentation"
    >
      <div
        className="w-full max-w-xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-hover animate-fade-in-up dark:border-slate-700 dark:bg-slate-900"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Busca rápida"
      >
        <div className="flex items-center gap-2 border-b border-slate-100 px-4 py-3 dark:border-slate-800">
          <Search className="h-5 w-5 shrink-0 text-purple-600 dark:text-purple-400" />
          <input
            ref={campo}
            value={termo}
            onChange={(e) => setTermo(e.target.value)}
            onKeyDown={aoTeclar}
            placeholder="Buscar pedido, cliente, telefone ou rastreio..."
            className="h-9 flex-1 bg-transparent text-base text-slate-800 outline-none placeholder:text-slate-400 dark:text-slate-100 dark:placeholder:text-slate-500"
            aria-label="Buscar no sistema"
          />
          <button
            onClick={onFechar}
            className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
            title="Fechar a busca (Esc)"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="max-h-[60vh] overflow-y-auto p-2">
          {!termo.trim() ? (
            <div className="px-2 py-4">
              <p className="text-xs font-bold uppercase tracking-wide text-slate-400 dark:text-slate-500">
                O que dá para procurar
              </p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {DICAS.map((dica) => (
                  <span
                    key={dica}
                    className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-semibold text-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
                  >
                    {dica}
                  </span>
                ))}
              </div>
              <p className="mt-3 text-xs text-slate-400 dark:text-slate-500">
                {ehProprietario
                  ? 'Você vê tudo: pedidos, clientes e vendedores.'
                  : `Você vê apenas os pedidos e clientes de ${nomeVendedor(usuario?.vendedor_id)}.`}
              </p>
            </div>
          ) : achados.length === 0 ? (
            <p className="px-3 py-6 text-center text-sm text-slate-400 dark:text-slate-500">
              Nada encontrado para “{termo.trim()}”. Tente outro termo.
            </p>
          ) : (
            <ul className="space-y-0.5">
              {achados.map((achado, i) => (
                <li key={chave(achado)}>
                  <button
                    onMouseEnter={() => setSelecionado(i)}
                    onClick={() => abrir(achado)}
                    className={cn(
                      'flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left transition',
                      i === selecionado
                        ? 'bg-purple-50 dark:bg-purple-950/40'
                        : 'hover:bg-slate-50 dark:hover:bg-slate-800/60',
                    )}
                  >
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-pink-500 via-purple-600 to-indigo-600 text-white">
                      {achado.tipo === 'pedido' ? (
                        <ClipboardList className="h-4 w-4" />
                      ) : achado.tipo === 'cliente' ? (
                        <UserRound className="h-4 w-4" />
                      ) : (
                        <Users className="h-4 w-4" />
                      )}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-bold text-slate-800 dark:text-slate-100">
                        {titulo(achado)}
                      </span>
                      <span className="block truncate text-xs text-slate-500 dark:text-slate-400">
                        {detalhe(achado, (id) => nomeVendedor(id))}
                      </span>
                    </span>
                    {i === selecionado ? (
                      <CornerDownLeft className="h-4 w-4 shrink-0 text-slate-400 dark:text-slate-500" />
                    ) : null}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 px-4 py-2 text-[11px] font-semibold text-slate-400 dark:border-slate-800 dark:text-slate-500">
          <span>↑ ↓ para escolher · Enter para abrir · Esc para fechar</span>
          <span className="rounded-md border border-slate-200 px-1.5 py-0.5 dark:border-slate-700">Ctrl + K</span>
        </div>
      </div>
    </div>
  )
}

const chave = (achado: Achado) =>
  achado.tipo === 'pedido'
    ? `p-${achado.pedido.id}`
    : achado.tipo === 'cliente'
      ? `c-${achado.cliente.id}`
      : `v-${achado.vendedor.id}`

const titulo = (achado: Achado) => {
  if (achado.tipo === 'pedido') return `#${achado.pedido.numero} · ${achado.pedido.cliente_nome}`
  if (achado.tipo === 'cliente') return achado.cliente.nome
  return achado.vendedor.nome
}

const detalhe = (achado: Achado, nomeVendedor: (id: string) => string) => {
  if (achado.tipo === 'pedido') {
    const p = achado.pedido
    return [
      numeroBR(p.metragem) + ' m',
      moeda(p.valor),
      p.estagio === 'concluido' ? 'concluída' : 'em andamento',
      p.entregue ? 'entregue' : null,
      dataBR(p.data_pedido),
      nomeVendedor(p.vendedor_id || ''),
    ]
      .filter(Boolean)
      .join(' · ')
  }
  if (achado.tipo === 'cliente') {
    const c = achado.cliente
    return [c.telefone || 'sem telefone', c.email || null, `vendedor: ${nomeVendedor(c.vendedor_id || '')}`]
      .filter(Boolean)
      .join(' · ')
  }
  return 'vendedor — abrir os pedidos dele'
}
