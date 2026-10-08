import {
  BarChart3,
  ClipboardList,
  Crown,
  LayoutDashboard,
  LogOut,
  Menu,
  Moon,
  Printer,
  Settings,
  Star,
  Sun,
  Truck,
  UserCheck,
  UserCog,
  Users,
  UsersRound,
  X,
  type LucideIcon,
} from 'lucide-react'
import { useMemo, useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { ROTA_ADMIN, useCincoToquesNoLogo } from '../lib/admin'
import { useAuth } from '../lib/auth'
import { type TelasAcesso, telasDoUsuario } from '../lib/types'
import { useStore } from '../lib/store'
import { useTema } from '../lib/tema'
import { Logo } from './Logo'
import { PerfilDialog } from './PerfilDialog'
import { ReviewModal } from './ReviewModal'
import { cn } from './ui'

interface ItemMenu {
  to: string
  label: string
  icone: LucideIcon
  badge?: number
  /** só o proprietário vê (Equipe, Configurações, Vendedores...) */
  soProprietario?: boolean
  /** tela extra que o proprietário pode liberar para um vendedor */
  tela?: keyof TelasAcesso
}

export function Layout() {
  const { db, nomeVendedor } = useStore()
  const { usuario, ehProprietario, vendedorNome, sair } = useAuth()
  const telas = telasDoUsuario(usuario)
  const { escuro, alternar } = useTema()
  const navegar = useNavigate()
  const [menuAberto, setMenuAberto] = useState(false)
  const [perfilAberto, setPerfilAberto] = useState(false)

  // 5 toques seguidos no logo abrem a porta do proprietário
  const tocarNoLogo = useCincoToquesNoLogo(() => navegar(ROTA_ADMIN))

  const meusPedidos = useMemo(
    () => (ehProprietario ? db.pedidos : db.pedidos.filter((p) => p.vendedor_id === usuario?.vendedor_id)),
    [db.pedidos, ehProprietario, usuario?.vendedor_id],
  )

  const { paraImprimir, avisos } = useMemo(() => {
    const base = ehProprietario ? db.pedidos : meusPedidos
    return {
      paraImprimir: base.filter((p) => p.status_pagamento === 'pago' && !p.impresso && p.status_producao !== 'dtf_pronto')
        .length,
      avisos: meusPedidos.filter((p) => p.impresso && !p.aviso_visto).length,
    }
  }, [db.pedidos, ehProprietario, meusPedidos])

  const menu: ItemMenu[] = [
    { to: '/', label: ehProprietario ? 'Painel' : 'Minha área', icone: ehProprietario ? LayoutDashboard : UserCheck },
    { to: '/pedidos', label: 'Pedidos', icone: ClipboardList },
    { to: '/clientes', label: 'Clientes', icone: Users },
    {
      to: '/por-vendedor',
      label: ehProprietario ? 'Por vendedor' : 'Meu desempenho',
      icone: UserCheck,
      badge: avisos,
    },
    { to: '/para-imprimir', label: 'Para imprimir', icone: Printer, badge: paraImprimir, tela: 'paraImprimir' },
    { to: '/entregas', label: 'Entregas', icone: Truck, tela: 'entregas' },
    { to: '/relatorio', label: 'Relatório', icone: BarChart3, tela: 'relatorio' },
    { to: '/relatorio-cliente-especial', label: 'Cliente especial', icone: Star, tela: 'clienteEspecial' },
    { to: '/vendedores', label: 'Vendedores', icone: UsersRound, soProprietario: true },
    { to: '/equipe', label: 'Equipe', icone: UserCog, soProprietario: true },
    { to: '/configuracoes', label: 'Configurações', icone: Settings, soProprietario: true },
  ]

  const visiveis = menu.filter((m) => {
    if (ehProprietario) return true
    if (m.soProprietario) return false
    return !m.tela || telas[m.tela]
  })

  return (
    <div className="min-h-screen bg-gradient-to-b from-fuchsia-50 via-slate-50 to-sky-50 pb-16 transition-colors print:bg-white dark:from-slate-950 dark:via-slate-950 dark:to-slate-900">
      <div className="pointer-events-none fixed inset-0 overflow-hidden opacity-100 transition-opacity print:hidden dark:opacity-25">
        <div className="absolute -left-24 -top-24 h-72 w-72 rounded-full bg-gradient-to-br from-pink-300/40 to-purple-300/30 blur-3xl" />
        <div className="absolute -right-24 top-32 h-80 w-80 rounded-full bg-gradient-to-br from-sky-300/40 to-emerald-200/30 blur-3xl" />
        <div className="absolute bottom-0 left-1/3 h-72 w-72 rounded-full bg-gradient-to-br from-amber-200/30 to-pink-200/30 blur-3xl" />
      </div>

      <header className="sticky top-0 z-40 border-b border-white/60 bg-white/80 backdrop-blur-xl print:hidden dark:border-slate-800 dark:bg-slate-950/85">
        <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-3">
          <NavLink to="/" className="shrink-0" onClick={tocarNoLogo}>
            <Logo />
          </NavLink>

          <nav className="ml-auto hidden flex-wrap items-center gap-1 xl:flex">
            {visiveis.map(({ to, label, icone: Icone, badge }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  cn(
                    'relative inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-[12.5px] font-bold transition-all duration-200',
                    isActive
                      ? 'bg-gradient-to-r from-pink-500 via-purple-600 to-indigo-600 text-white shadow-soft'
                      : 'text-slate-600 hover:bg-white hover:text-purple-700 hover:shadow-soft dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-purple-300',
                  )
                }
              >
                <Icone className="h-4 w-4" />
                {label}
                {badge ? (
                  <span className="ml-0.5 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-amber-400 px-1 text-[10px] font-black text-amber-900">
                    {badge}
                  </span>
                ) : null}
              </NavLink>
            ))}
          </nav>

          <div className="ml-auto flex items-center gap-2 xl:ml-1">
            <button
              onClick={alternar}
              className="rounded-full border border-slate-200 bg-white p-2.5 text-slate-500 shadow-sm transition hover:text-purple-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:text-purple-300"
              title={escuro ? 'Usar tema claro' : 'Usar tema escuro'}
            >
              {escuro ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>

            <button
              onClick={() => setPerfilAberto(true)}
              className="flex items-center gap-2 rounded-full border border-slate-200 bg-white py-1.5 pl-1.5 pr-3 text-left shadow-sm transition hover:text-purple-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:text-purple-300"
              title="Meu perfil"
            >
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-pink-500 via-purple-600 to-indigo-600 text-[11px] font-black text-white">
                {(usuario?.nome ?? '?').slice(0, 2).toUpperCase()}
              </span>
              <span className="hidden leading-tight sm:block">
                <span className="block text-xs font-bold">{usuario?.nome}</span>
                <span className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
                  {ehProprietario ? <Crown className="h-3 w-3" /> : null}
                  {ehProprietario ? 'Proprietário' : vendedorNome}
                </span>
              </span>
            </button>

            <button
              onClick={async () => {
                await sair()
              }}
              className="hidden rounded-full border border-slate-200 bg-white p-2.5 text-slate-500 shadow-sm transition hover:text-rose-600 sm:block dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:text-rose-400"
              title="Sair"
            >
              <LogOut className="h-4 w-4" />
            </button>

            <button
              onClick={() => setMenuAberto((v) => !v)}
              className="rounded-full border border-slate-200 bg-white p-2.5 text-slate-600 shadow-sm transition hover:text-purple-700 xl:hidden dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
              title="Menu"
            >
              {menuAberto ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
            </button>
          </div>
        </div>

        {menuAberto ? (
          <div className="animate-fade-in-up border-t border-slate-100 bg-white/95 px-3 pb-3 pt-2 xl:hidden dark:border-slate-800 dark:bg-slate-950/95">
            <div className="grid grid-cols-2 gap-1.5">
              {visiveis.map(({ to, label, icone: Icone, badge }) => (
                <NavLink
                  key={to}
                  to={to}
                  onClick={() => setMenuAberto(false)}
                  className={({ isActive }) =>
                    cn(
                      'inline-flex items-center gap-2 rounded-xl px-3 py-2.5 text-[13px] font-bold transition',
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
            <button
              onClick={async () => {
                setMenuAberto(false)
                await sair()
              }}
              className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-rose-50 px-3 py-2.5 text-[13px] font-bold text-rose-600 dark:bg-rose-950/40 dark:text-rose-300"
            >
              <LogOut className="h-4 w-4" /> Sair do sistema
            </button>
          </div>
        ) : null}
      </header>

      <main className="relative mx-auto max-w-7xl px-4 py-6">
        <Outlet />
      </main>

      <footer className="relative mx-auto max-w-7xl px-4 pb-8 text-center text-xs text-slate-400 print:hidden dark:text-slate-500">
        {db.configuracoes.empresa_nome || 'Altoprints'} · Sistema de pedidos DTF ·{' '}
        {ehProprietario
          ? `${db.pedidos.length} pedidos • ${db.vendedores.length} vendedores • visão do proprietário`
          : `você está vendo apenas os pedidos de ${nomeVendedor(usuario?.vendedor_id)}`}
      </footer>

      <PerfilDialog aberto={perfilAberto} onFechar={() => setPerfilAberto(false)} />
      {ehProprietario ? <ReviewModal /> : null}
    </div>
  )
}
