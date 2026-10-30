import {
  BarChart3,
  ClipboardList,
  Crown,
  LayoutDashboard,
  LockKeyhole,
  LogOut,
  Menu,
  Moon,
  Rows3,
  Rows4,
  Search,
  Settings,
  Sparkles,
  Sun,
  Users,
  X,
  type LucideIcon,
} from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { ROTA_ADMIN, useCincoToquesNoLogo } from '../lib/admin'
import { useAuth } from '../lib/auth'
import { useStore } from '../lib/store'
import { useTema } from '../lib/tema'
import { naFilaDeImpressao } from '../lib/types'
import { VERSAO } from '../lib/versao'
import { Logo } from './Logo'
import { BuscaGlobal } from './BuscaGlobal'
import { PerfilDialog } from './PerfilDialog'
import { ReviewModal } from './ReviewModal'
import { Botao, cn } from './ui'

interface ItemMenu {
  to: string
  label: string
  icone: LucideIcon
  badge?: number
}

/**
 * Casca do sistema.
 *
 * A equipe usa sem login: a barra tem Pedidos e Clientes. O proprietário, quando
 * entra pelo “Login proprietário”, ganha o Painel, o Relatório e a engrenagem
 * (Configurações / Funcionários e acessos).
 */
export function Layout() {
  const { db } = useStore()
  const { usuario, ehProprietario, sair } = useAuth()
  const { escuro, alternar, compacto, alternarDensidade } = useTema()
  const navegar = useNavigate()
  const [menuAberto, setMenuAberto] = useState(false)
  const [perfilAberto, setPerfilAberto] = useState(false)
  const [buscaAberta, setBuscaAberta] = useState(false)
  const local = useLocation()

  // Ctrl + K (ou ⌘ + K) abre a busca rápida de qualquer tela
  useEffect(() => {
    const aoTeclar = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && (e.key === 'k' || e.key === 'K')) {
        e.preventDefault()
        setBuscaAberta((v) => !v)
      }
      if (e.key === 'Escape') setBuscaAberta(false)
    }
    window.addEventListener('keydown', aoTeclar)
    return () => window.removeEventListener('keydown', aoTeclar)
  }, [])

  // trocar de tela fecha o menu do celular
  useEffect(() => {
    setMenuAberto(false)
  }, [local.pathname])

  // 5 toques seguidos no logo abrem a porta do proprietário
  const tocarNoLogo = useCincoToquesNoLogo(() => navegar(ROTA_ADMIN))

  /** filas em andamento — é o número que aparece no atalho Pedidos */
  const emAndamento = useMemo(() => db.pedidos.filter(naFilaDeImpressao).length, [db.pedidos])

  /*
   * A barra de cima tem só o dia a dia. A engrenagem (Configurações, com
   * Funcionários e acessos dentro) aparece apenas para o proprietário.
   */
  const menu: ItemMenu[] = ehProprietario
    ? [
        { to: '/', label: 'Painel', icone: LayoutDashboard },
        { to: '/pedidos', label: 'Pedidos', icone: ClipboardList, badge: emAndamento },
        { to: '/clientes', label: 'Clientes', icone: Users },
        { to: '/relatorio', label: 'Relatório', icone: BarChart3 },
      ]
    : [
        { to: '/pedidos', label: 'Pedidos', icone: ClipboardList, badge: emAndamento },
        { to: '/clientes', label: 'Clientes', icone: Users },
      ]

  return (
    <div className="min-h-screen bg-gradient-to-b from-fuchsia-50 via-slate-50 to-sky-50 pb-10 transition-colors print:bg-white dark:from-slate-950 dark:via-slate-950 dark:to-slate-900">
      <div className="pointer-events-none fixed inset-0 overflow-hidden opacity-100 transition-opacity print:hidden dark:opacity-25">
        <div className="absolute -left-24 -top-24 h-72 w-72 rounded-full bg-gradient-to-br from-pink-300/40 to-purple-300/30 blur-3xl" />
        <div className="absolute -right-24 top-32 h-80 w-80 rounded-full bg-gradient-to-br from-sky-300/40 to-emerald-200/30 blur-3xl" />
        <div className="absolute bottom-0 left-1/3 h-72 w-72 rounded-full bg-gradient-to-br from-amber-200/30 to-pink-200/30 blur-3xl" />
      </div>

      <header className="sticky top-0 z-40 border-b border-white/60 bg-white/80 backdrop-blur-xl print:hidden dark:border-slate-800 dark:bg-slate-950/85">
        <div className="mx-auto flex max-w-[1900px] items-center gap-1.5 px-3 py-1.5">
          <button
            type="button"
            title="Altoprints"
            aria-label="Ir para o início"
            className="shrink-0 rounded-2xl focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-400"
            onClick={() => {
              // 5 toques seguidos no logo abrem o “Login proprietário”
              if (!tocarNoLogo()) navegar('/')
            }}
          >
            <Logo />
          </button>

          <nav className="ml-auto hidden flex-wrap items-center gap-1 xl:flex">
            {menu.map(({ to, label, icone: Icone, badge }) => (
              <NavLink
                key={to}
                to={to}
                end={to === '/'}
                className={({ isActive }) =>
                  cn(
                    'relative inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[12px] font-bold transition-all duration-200',
                    isActive
                      ? 'bg-gradient-to-r from-pink-500 via-purple-600 to-indigo-600 text-white shadow-soft'
                      : 'text-slate-600 hover:bg-white hover:text-purple-700 hover:shadow-soft dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-purple-300',
                  )
                }
              >
                <Icone className="h-4 w-4" />
                {label}
                {badge ? (
                  <span
                    title={`${badge} ${badge === 1 ? 'fila em andamento' : 'filas em andamento'}`}
                    className="ml-0.5 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-amber-400 px-1 text-[10px] font-black text-amber-900"
                  >
                    {badge}
                  </span>
                ) : null}
              </NavLink>
            ))}
          </nav>

          <div className="ml-auto flex items-center gap-2 xl:ml-1">
            <button
              onClick={() => setBuscaAberta(true)}
              title="Buscar pedido, cliente ou telefone (Ctrl + K)"
              className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white py-1.5 pl-2 pr-2 text-slate-500 shadow-sm transition hover:text-purple-700 sm:pr-3 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:text-purple-300"
            >
              <Search className="h-4 w-4" />
              <span className="hidden text-[12px] font-bold sm:inline">Buscar</span>
              <span className="hidden rounded-md border border-slate-200 px-1 text-[10px] font-bold text-slate-400 md:inline dark:border-slate-600 dark:text-slate-400">
                Ctrl K
              </span>
            </button>

            <button
              onClick={alternar}
              className="rounded-full border border-slate-200 bg-white p-1.5 text-slate-500 shadow-sm transition hover:text-purple-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:text-purple-300"
              title={escuro ? 'Usar tema claro' : 'Usar tema escuro'}
            >
              {escuro ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>

            <button
              onClick={alternarDensidade}
              className="hidden items-center gap-1.5 rounded-full border border-slate-200 bg-white px-2.5 py-2 text-[11px] font-bold text-slate-500 shadow-sm transition hover:text-purple-700 sm:inline-flex dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:text-purple-300"
              title={compacto ? 'Deixar os blocos mais espaçados' : 'Deixar a tela mais compacta'}
            >
              {compacto ? <Rows4 className="h-4 w-4" /> : <Rows3 className="h-4 w-4" />}
              {compacto ? 'Compacto' : 'Confortável'}
            </button>

            {ehProprietario ? (
              <>
                <NavLink
                  to="/configuracoes"
                  title="Configurações, Funcionários e acessos"
                  className={({ isActive }) =>
                    cn(
                      'hidden rounded-full border p-2 shadow-sm transition sm:inline-flex',
                      isActive
                        ? 'border-transparent bg-gradient-to-r from-pink-500 via-purple-600 to-indigo-600 text-white'
                        : 'border-slate-200 bg-white text-slate-500 hover:text-purple-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:text-purple-300',
                    )
                  }
                >
                  <Settings className="h-4 w-4" />
                </NavLink>

                <button
                  onClick={() => setPerfilAberto(true)}
                  className="flex items-center gap-2 rounded-full border border-slate-200 bg-white py-1 pl-1 pr-2.5 text-left shadow-sm transition hover:text-purple-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:text-purple-300"
                  title="Meu perfil (proprietário)"
                >
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-pink-500 via-purple-600 to-indigo-600 text-[11px] font-black text-white">
                    {(usuario?.nome ?? '?').slice(0, 2).toUpperCase()}
                  </span>
                  <span className="hidden leading-tight sm:block">
                    <span className="block text-xs font-bold">{usuario?.nome}</span>
                    <span className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
                      <Crown className="h-3 w-3" /> Proprietário
                    </span>
                  </span>
                </button>

                <button
                  onClick={async () => {
                    await sair()
                  }}
                  className="hidden rounded-full border border-slate-200 bg-white p-2 text-slate-500 shadow-sm transition hover:text-rose-600 sm:block dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:text-rose-400"
                  title="Sair do login do proprietário"
                >
                  <LogOut className="h-4 w-4" />
                </button>
              </>
            ) : (
              <NavLink
                to={ROTA_ADMIN}
                title="Entrar como proprietário (só o dono tem login)"
                className="inline-flex items-center gap-1.5 rounded-full border border-violet-200 bg-violet-50 px-2.5 py-1.5 text-[11px] font-bold text-violet-700 shadow-sm transition hover:bg-violet-100 dark:border-violet-900 dark:bg-violet-950/50 dark:text-violet-300 dark:hover:bg-violet-900/50 sm:text-[12px]"
              >
                <LockKeyhole className="h-3.5 w-3.5" />
                Login proprietário
              </NavLink>
            )}

            <button
              onClick={() => setMenuAberto((v) => !v)}
              className="rounded-full border border-slate-200 bg-white p-2 text-slate-600 shadow-sm transition hover:text-purple-700 xl:hidden dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
              title="Menu"
            >
              {menuAberto ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
            </button>
          </div>
        </div>

        {menuAberto ? (
          <div className="animate-fade-in-up border-t border-slate-100 bg-white/95 px-2 pb-2 pt-1.5 xl:hidden dark:border-slate-800 dark:bg-slate-950/95">
            <div className="grid grid-cols-2 gap-1">
              {menu.map(({ to, label, icone: Icone, badge }) => (
                <NavLink
                  key={to}
                  to={to}
                  end={to === '/'}
                  onClick={() => setMenuAberto(false)}
                  className={({ isActive }) =>
                    cn(
                      'inline-flex items-center gap-2 rounded-xl px-2.5 py-2 text-[13px] font-bold transition',
                      isActive
                        ? 'bg-gradient-to-r from-pink-500 via-purple-600 to-indigo-600 text-white shadow-soft'
                        : 'bg-slate-50 text-slate-600 dark:bg-slate-800 dark:text-slate-300',
                    )
                  }
                >
                  <Icone className="h-4 w-4" />
                  <span className="truncate">{label}</span>
                  {badge ? (
                    <span className="ml-auto inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-amber-400 px-1 text-[10px] font-black text-amber-900">
                      {badge}
                    </span>
                  ) : null}
                </NavLink>
              ))}
            </div>

            {ehProprietario ? (
              <NavLink
                to="/configuracoes"
                onClick={() => setMenuAberto(false)}
                className="mt-1.5 flex w-full items-center justify-center gap-2 rounded-xl bg-slate-50 px-2.5 py-2 text-[13px] font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-300"
              >
                <Settings className="h-4 w-4" /> Configurações, Funcionários e acessos
              </NavLink>
            ) : (
              <NavLink
                to={ROTA_ADMIN}
                onClick={() => setMenuAberto(false)}
                className="mt-1.5 flex w-full items-center justify-center gap-2 rounded-xl bg-violet-50 px-2.5 py-2 text-[13px] font-bold text-violet-700 dark:bg-violet-950/50 dark:text-violet-300"
              >
                <LockKeyhole className="h-4 w-4" /> Login proprietário
              </NavLink>
            )}

            {ehProprietario ? (
              <button
                onClick={async () => {
                  setMenuAberto(false)
                  await sair()
                }}
                className="mt-1.5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-rose-50 px-3 py-2 text-[13px] font-bold text-rose-600 dark:bg-rose-950/40 dark:text-rose-300"
              >
                <LogOut className="h-4 w-4" /> Sair do login do proprietário
              </button>
            ) : null}
          </div>
        ) : null}
      </header>

      <main className="relative mx-auto max-w-[1900px] px-3 py-2">
        {db.configuracoes.modo_exemplo ? (
          <div className="mb-3 flex flex-wrap items-center gap-2 rounded-2xl border-2 border-amber-400 bg-amber-50 p-2.5 shadow-soft dark:border-amber-600 dark:bg-amber-950/40 print:hidden">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 text-white">
              <Sparkles className="h-5 w-5" />
            </span>
            <p className="min-w-[220px] flex-1 text-sm font-semibold text-amber-900 dark:text-amber-100">
              Dados de <b>exemplo</b> (fictícios) carregados — estes pedidos <b>não são reais</b>.
              {ehProprietario ? ' Apague tudo em Dados (menu da engrenagem) antes de usar de verdade.' : ''}
            </p>
            {ehProprietario ? (
              <Botao tamanho="sm" variante="aviso" icone={Settings} onClick={() => navegar('/configuracoes')}>
                Apagar dados de exemplo
              </Botao>
            ) : null}
          </div>
        ) : null}
        <Outlet />
      </main>

      <footer className="relative mx-auto max-w-[1900px] px-3 pb-2 text-center text-[11px] text-slate-400 print:hidden dark:text-slate-500">
        {db.configuracoes.empresa_nome || 'Altoprints'} · Sistema de pedidos DTF ·{' '}
        {ehProprietario
          ? `visão do proprietário · ${db.pedidos.length} pedidos • ${db.vendedores.length} funcionários`
          : `modo equipe (sem login) · ${db.pedidos.length} pedidos • ${db.vendedores.length} funcionários`}{' '}
        · v{VERSAO}
      </footer>

      {ehProprietario ? <PerfilDialog aberto={perfilAberto} onFechar={() => setPerfilAberto(false)} /> : null}
      <BuscaGlobal aberto={buscaAberta} onFechar={() => setBuscaAberta(false)} />
      {ehProprietario ? <ReviewModal /> : null}
    </div>
  )
}
