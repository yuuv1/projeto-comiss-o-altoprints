import {
  BarChart3,
  ChevronDown,
  ClipboardList,
  Crown,
  Eye,
  History,
  LayoutDashboard,
  LogOut,
  Menu,
  MoreHorizontal,
  Rows3,
  Rows4,
  Moon,
  Printer,
  Settings,
  Star,
  Sun,
  Truck,
  Undo2,
  UserCheck,
  UserCog,
  Users,
  UsersRound,
  X,
  type LucideIcon,
} from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { ROTA_ADMIN, useCincoToquesNoLogo } from '../lib/admin'
import { useAuth } from '../lib/auth'
import { LABEL_PAPEL } from '../lib/types'
import { rotuloVisualizacao } from '../lib/visualizacao'
import { type TelasAcesso, telasDoUsuario } from '../lib/types'
import { useStore } from '../lib/store'
import { useTema } from '../lib/tema'
import { Logo } from './Logo'
import { PerfilDialog } from './PerfilDialog'
import { ReviewModal } from './ReviewModal'
import { Botao, cn } from './ui'

/** como o item aparece no menu "Mais" quando não é um dos atalhos de cima */
type GrupoMenu = 'Producao' | 'Relatorios' | 'Administracao'

interface ItemMenu {
  to: string
  label: string
  icone: LucideIcon
  badge?: number
  /** só o proprietário vê (Equipe, Configurações, Vendedores...) */
  soProprietario?: boolean
  /** tela extra que o proprietário pode liberar para um vendedor */
  tela?: keyof TelasAcesso
  /** seção do menu "Mais" (os atalhos de cima não precisam) */
  grupo?: GrupoMenu
}

/**
 * Atalhos que ficam sempre à vista na barra de cima. Todo o resto continua a
 * um clique de distância, dentro de "Mais" — a ideia é quem está começando
 * enxergar só o essencial do dia a dia.
 */
const ATALHOS_DONO = ['/', '/pedidos', '/clientes', '/para-imprimir']
const ATALHOS_VENDEDOR = ['/', '/pedidos', '/clientes', '/por-vendedor', '/para-imprimir']

export function Layout() {
  const { db, nomeVendedor } = useStore()
  const { usuario, ehProprietario, vendedorNome, sair, emVisualizacao, sairDaVisualizacao } = useAuth()
  const telas = telasDoUsuario(usuario)
  const { escuro, alternar, compacto, alternarDensidade } = useTema()
  const navegar = useNavigate()
  const [menuAberto, setMenuAberto] = useState(false)
  const [perfilAberto, setPerfilAberto] = useState(false)
  const [maisAberto, setMaisAberto] = useState(false)
  const [maisCelular, setMaisCelular] = useState(false)
  const refMais = useRef<HTMLDivElement | null>(null)
  const local = useLocation()

  // trocar de tela fecha os menus abertos
  useEffect(() => {
    setMaisAberto(false)
    setMaisCelular(false)
    setMenuAberto(false)
  }, [local.pathname])

  // clicar fora (ou apertar Esc) fecha o menu "Mais"
  useEffect(() => {
    if (!maisAberto) return
    const fora = (e: MouseEvent) => {
      if (!refMais.current?.contains(e.target as Node)) setMaisAberto(false)
    }
    const escapar = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMaisAberto(false)
    }
    document.addEventListener('mousedown', fora)
    window.addEventListener('keydown', escapar)
    return () => {
      document.removeEventListener('mousedown', fora)
      window.removeEventListener('keydown', escapar)
    }
  }, [maisAberto])

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
      grupo: 'Relatorios',
    },
    { to: '/para-imprimir', label: 'Para imprimir', icone: Printer, badge: paraImprimir, tela: 'paraImprimir' },
    { to: '/impressoes', label: 'Impressões', icone: History, tela: 'impressoes', grupo: 'Producao' },
    { to: '/entregas', label: 'Entregas', icone: Truck, tela: 'entregas', grupo: 'Producao' },
    { to: '/relatorio', label: 'Relatório', icone: BarChart3, tela: 'relatorio', grupo: 'Relatorios' },
    {
      to: '/relatorio-cliente-especial',
      label: 'Cliente especial',
      icone: Star,
      tela: 'clienteEspecial',
      grupo: 'Relatorios',
    },
    { to: '/vendedores', label: 'Vendedores', icone: UsersRound, soProprietario: true, grupo: 'Administracao' },
    { to: '/equipe', label: 'Equipe', icone: UserCog, soProprietario: true, grupo: 'Administracao' },
    { to: '/configuracoes', label: 'Configurações', icone: Settings, soProprietario: true, grupo: 'Administracao' },
  ]

  const visiveis = menu.filter((m) => {
    if (ehProprietario) return true
    if (m.soProprietario) return false
    return !m.tela || telas[m.tela]
  })

  /* O que fica na barra de cima e o que vai para o menu "Mais". */
  const atalhos = ehProprietario ? ATALHOS_DONO : ATALHOS_VENDEDOR
  const principais = visiveis.filter((m) => atalhos.includes(m.to))
  const demais = visiveis.filter((m) => !atalhos.includes(m.to))
  const gruposDoMais = (
    [
      { titulo: 'Produção', grupo: 'Producao' as GrupoMenu },
      { titulo: 'Relatórios', grupo: 'Relatorios' as GrupoMenu },
      { titulo: 'Administração', grupo: 'Administracao' as GrupoMenu },
    ] as const
  )
    .map(({ titulo, grupo }) => ({ titulo, itens: demais.filter((m) => m.grupo === grupo) }))
    .filter((g) => g.itens.length > 0)
  const escondidosComAviso = demais.some((m) => m.badge)

  return (
    <div className="min-h-screen bg-gradient-to-b from-fuchsia-50 via-slate-50 to-sky-50 pb-10 transition-colors print:bg-white dark:from-slate-950 dark:via-slate-950 dark:to-slate-900">
      <div className="pointer-events-none fixed inset-0 overflow-hidden opacity-100 transition-opacity print:hidden dark:opacity-25">
        <div className="absolute -left-24 -top-24 h-72 w-72 rounded-full bg-gradient-to-br from-pink-300/40 to-purple-300/30 blur-3xl" />
        <div className="absolute -right-24 top-32 h-80 w-80 rounded-full bg-gradient-to-br from-sky-300/40 to-emerald-200/30 blur-3xl" />
        <div className="absolute bottom-0 left-1/3 h-72 w-72 rounded-full bg-gradient-to-br from-amber-200/30 to-pink-200/30 blur-3xl" />
      </div>

      <header className="sticky top-0 z-40 border-b border-white/60 bg-white/80 backdrop-blur-xl print:hidden dark:border-slate-800 dark:bg-slate-950/85">
        <div className="mx-auto flex max-w-[1700px] items-center gap-2 px-3 py-2">
          <NavLink to="/" className="shrink-0" onClick={tocarNoLogo}>
            <Logo />
          </NavLink>

          <nav className="ml-auto hidden flex-wrap items-center gap-1 xl:flex">
            {principais.map(({ to, label, icone: Icone, badge }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  cn(
                    'relative inline-flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-[12px] font-bold transition-all duration-200',
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

            {gruposDoMais.length ? (
              <div className="relative" ref={refMais}>
                <button
                  type="button"
                  onClick={() => setMaisAberto((v) => !v)}
                  aria-haspopup="menu"
                  aria-expanded={maisAberto}
                  title="Ver as outras telas do sistema"
                  className={cn(
                    'relative inline-flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-[12px] font-bold transition-all duration-200',
                    maisAberto || demais.some((m) => m.to === local.pathname)
                      ? 'bg-gradient-to-r from-pink-500 via-purple-600 to-indigo-600 text-white shadow-soft'
                      : 'text-slate-600 hover:bg-white hover:text-purple-700 hover:shadow-soft dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-purple-300',
                  )}
                >
                  <MoreHorizontal className="h-4 w-4" />
                  Mais
                  <ChevronDown className={cn('h-3.5 w-3.5 transition-transform', maisAberto && 'rotate-180')} />
                  {escondidosComAviso && !maisAberto ? (
                    <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-amber-400 ring-2 ring-white dark:ring-slate-900" />
                  ) : null}
                </button>

                {maisAberto ? (
                  <div className="absolute right-0 top-full z-50 mt-1.5 w-60 animate-pop-in rounded-2xl border border-slate-100 bg-white p-1.5 shadow-hover dark:border-slate-800 dark:bg-slate-900 dark:shadow-dark-hover">
                    {gruposDoMais.map(({ titulo, itens }) => (
                      <div key={titulo} className="py-0.5">
                        <p className="px-2.5 pb-1 pt-1 text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500">
                          {titulo}
                        </p>
                        {itens.map(({ to, label, icone: Icone, badge }) => (
                          <NavLink
                            key={to}
                            to={to}
                            onClick={() => setMaisAberto(false)}
                            className={({ isActive }) =>
                              cn(
                                'flex items-center gap-2 rounded-xl px-2.5 py-2 text-[13px] font-bold transition',
                                isActive
                                  ? 'bg-gradient-to-r from-pink-500 via-purple-600 to-indigo-600 text-white shadow-soft'
                                  : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800',
                              )
                            }
                          >
                            <Icone className="h-4 w-4" />
                            <span className="flex-1 truncate">{label}</span>
                            {badge ? (
                              <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-amber-400 px-1 text-[10px] font-black text-amber-900">
                                {badge}
                              </span>
                            ) : null}
                          </NavLink>
                        ))}
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>
            ) : null}
          </nav>

          <div className="ml-auto flex items-center gap-2 xl:ml-1">
            <button
              onClick={alternar}
              className="rounded-full border border-slate-200 bg-white p-2 text-slate-500 shadow-sm transition hover:text-purple-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:text-purple-300"
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

            <button
              onClick={() => setPerfilAberto(true)}
              className="flex items-center gap-2 rounded-full border border-slate-200 bg-white py-1 pl-1 pr-2.5 text-left shadow-sm transition hover:text-purple-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:text-purple-300"
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
              className="hidden rounded-full border border-slate-200 bg-white p-2 text-slate-500 shadow-sm transition hover:text-rose-600 sm:block dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:text-rose-400"
              title="Sair"
            >
              <LogOut className="h-4 w-4" />
            </button>

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
              {principais.map(({ to, label, icone: Icone, badge }) => (
                <NavLink
                  key={to}
                  to={to}
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

            {gruposDoMais.length ? (
              <>
                <button
                  type="button"
                  onClick={() => setMaisCelular((v) => !v)}
                  className="mt-1 flex w-full items-center justify-center gap-1.5 rounded-xl bg-slate-50 px-2.5 py-2 text-[13px] font-bold text-slate-500 dark:bg-slate-800 dark:text-slate-300"
                >
                  <MoreHorizontal className="h-4 w-4" />
                  {maisCelular ? 'Menos opções' : 'Mais opções'}
                  <ChevronDown className={cn('h-3.5 w-3.5 transition-transform', maisCelular && 'rotate-180')} />
                  {escondidosComAviso && !maisCelular ? <span className="h-2 w-2 rounded-full bg-amber-400" /> : null}
                </button>

                {maisCelular ? (
                  <div className="mt-1 space-y-1.5">
                    {gruposDoMais.map(({ titulo, itens }) => (
                      <div key={titulo}>
                        <p className="px-1 pb-1 pt-1 text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500">
                          {titulo}
                        </p>
                        <div className="grid grid-cols-2 gap-1">
                          {itens.map(({ to, label, icone: Icone, badge }) => (
                            <NavLink
                              key={to}
                              to={to}
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
                      </div>
                    ))}
                  </div>
                ) : null}
              </>
            ) : null}

            <button
              onClick={async () => {
                setMenuAberto(false)
                await sair()
              }}
              className="mt-1.5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-rose-50 px-3 py-2 text-[13px] font-bold text-rose-600 dark:bg-rose-950/40 dark:text-rose-300"
            >
              <LogOut className="h-4 w-4" /> Sair do sistema
            </button>
          </div>
        ) : null}
      </header>

      <main className="relative mx-auto max-w-[1700px] px-3 py-3">
        {emVisualizacao && usuario ? (
          <div className="mb-3 flex flex-wrap items-center gap-2 rounded-2xl border-2 border-amber-400 bg-amber-50 p-2.5 shadow-soft dark:border-amber-600 dark:bg-amber-950/40 print:hidden">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 text-white">
              <Eye className="h-5 w-5" />
            </span>
            <p className="min-w-[220px] flex-1 text-sm font-semibold text-amber-900 dark:text-amber-100">
              {rotuloVisualizacao(usuario.nome, LABEL_PAPEL[usuario.papel])}
            </p>
            <Botao tamanho="sm" variante="aviso" icone={Undo2} onClick={sairDaVisualizacao}>
              Voltar ao meu acesso
            </Botao>
          </div>
        ) : null}
        <Outlet />
      </main>

      <footer className="relative mx-auto max-w-[1700px] px-3 pb-3 text-center text-[11px] text-slate-400 print:hidden dark:text-slate-500">
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
