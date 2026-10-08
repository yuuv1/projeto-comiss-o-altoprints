import {
  BarChart3,
  ClipboardList,
  Lock,
  Menu,
  Moon,
  Printer,
  Settings,
  Star,
  Sun,
  Truck,
  UserCheck,
  Users,
  UsersRound,
  X,
  type LucideIcon,
} from 'lucide-react'
import { useMemo, useState } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { isPedidoCompleto } from '../lib/types'
import { useStore } from '../lib/store'
import { useTema } from '../lib/tema'
import { AdminPanel } from './AdminPanel'
import { Logo } from './Logo'
import { ReviewModal } from './ReviewModal'
import { cn } from './ui'

interface ItemMenu {
  to: string
  label: string
  icone: LucideIcon
  badge?: number
}

export function Layout() {
  const { db, nomeVendedor } = useStore()
  const { escuro, alternar } = useTema()
  const [menuAberto, setMenuAberto] = useState(false)
  const [configAberto, setConfigAberto] = useState(false)
  const local = useLocation()
  const temSenha = Boolean(db.configuracoes.senha_admin_hash)

  const { paraImprimir, avisos } = useMemo(() => {
    const paraImprimir = db.pedidos.filter(
      (p) => p.status_pagamento === 'pago' && !p.impresso && p.status_producao !== 'dtf_pronto',
    ).length
    const avisos = db.pedidos.filter((p) => p.impresso && !p.aviso_visto).length
    return { paraImprimir, avisos }
  }, [db.pedidos])

  const menu: ItemMenu[] = [
    { to: '/', label: 'Pedidos', icone: ClipboardList },
    { to: '/clientes', label: 'Clientes', icone: Users },
    { to: '/vendedores', label: 'Vendedores', icone: UsersRound },
    { to: '/por-vendedor', label: 'Por vendedor', icone: UserCheck, badge: avisos },
    { to: '/para-imprimir', label: 'Para imprimir', icone: Printer, badge: paraImprimir },
    { to: '/entregas', label: 'Entregas', icone: Truck },
    { to: '/relatorio', label: 'Relatório', icone: BarChart3 },
    { to: '/relatorio-cliente-especial', label: 'Cliente especial', icone: Star },
  ]

  // título da aba do navegador
  const atual = menu.find((m) => m.to === local.pathname)
  const titulo = atual?.label ?? (local.pathname.startsWith('/pedido') ? 'Pedido' : 'Altoprints')
  useMemo(() => {
    document.title = `${titulo} — Altoprints`
  }, [titulo])

  return (
    <div className="min-h-screen bg-gradient-to-b from-fuchsia-50 via-slate-50 to-sky-50 pb-16 transition-colors print:bg-white dark:from-slate-950 dark:via-slate-950 dark:to-slate-900">
      {/* bolhas decorativas */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden opacity-100 transition-opacity print:hidden dark:opacity-25">
        <div className="absolute -left-24 -top-24 h-72 w-72 rounded-full bg-gradient-to-br from-pink-300/40 to-purple-300/30 blur-3xl" />
        <div className="absolute -right-24 top-32 h-80 w-80 rounded-full bg-gradient-to-br from-sky-300/40 to-emerald-200/30 blur-3xl" />
        <div className="absolute bottom-0 left-1/3 h-72 w-72 rounded-full bg-gradient-to-br from-amber-200/30 to-pink-200/30 blur-3xl" />
      </div>

      <header className="sticky top-0 z-40 border-b border-white/60 bg-white/80 backdrop-blur-xl print:hidden dark:border-slate-800 dark:bg-slate-950/85">
        <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-3">
          <NavLink to="/" className="shrink-0">
            <Logo />
          </NavLink>

          <nav className="ml-auto hidden flex-wrap items-center gap-1 lg:flex">
            {menu.map(({ to, label, icone: Icone, badge }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  cn(
                    'relative inline-flex items-center gap-1.5 rounded-full px-3.5 py-2 text-[13px] font-bold transition-all duration-200',
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

          <button
            onClick={alternar}
            className="ml-auto rounded-full border border-slate-200 bg-white p-2.5 text-slate-500 shadow-sm transition hover:text-purple-700 lg:ml-1 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:text-purple-300"
            title={escuro ? 'Usar tema claro' : 'Usar tema escuro'}
          >
            {escuro ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>

          <button
            onClick={() => setConfigAberto(true)}
            className={cn(
              'relative rounded-full border border-slate-200 bg-white p-2.5 shadow-sm transition lg:ml-1 dark:border-slate-700 dark:bg-slate-800',
              temSenha
                ? 'text-slate-500 hover:text-purple-700 dark:text-slate-300 dark:hover:text-purple-300'
                : 'text-amber-500 hover:text-amber-600',
            )}
            title={temSenha ? 'Painel do administrador' : 'Definir a senha do painel'}
          >
            {temSenha ? <Settings className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
          </button>

          <button
            onClick={() => setMenuAberto((v) => !v)}
            className="rounded-full border border-slate-200 bg-white p-2.5 text-slate-600 shadow-sm transition hover:text-purple-700 lg:hidden dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
            title="Menu"
          >
            {menuAberto ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </button>
        </div>

        {menuAberto ? (
          <div className="animate-fade-in-up border-t border-slate-100 bg-white/95 px-3 pb-3 pt-2 lg:hidden dark:border-slate-800 dark:bg-slate-950/95">
            <div className="grid grid-cols-2 gap-1.5">
              {menu.map(({ to, label, icone: Icone, badge }) => (
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
          </div>
        ) : null}
      </header>

      <main className="relative mx-auto max-w-7xl px-4 py-6">
        <Outlet />
      </main>

      <footer className="relative mx-auto max-w-7xl px-4 pb-8 text-center text-xs text-slate-400 print:hidden dark:text-slate-500">
        {db.configuracoes.empresa_nome || 'Altoprints'} · Sistema de pedidos DTF ·{' '}
        {db.pedidos.filter(isPedidoCompleto).length} pedidos prontos
        <span className="mx-1">·</span>
        vendedores: {db.vendedores.map((v) => nomeVendedor(v.id)).join(', ') || '—'}
      </footer>

      <AdminPanel aberto={configAberto} onFechar={() => setConfigAberto(false)} />
      <ReviewModal />
    </div>
  )
}
