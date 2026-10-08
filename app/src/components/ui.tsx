import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import {
  AlertTriangle,
  CheckCircle2,
  Info,
  Loader2,
  X,
  XCircle,
  type LucideIcon,
} from 'lucide-react'
import {
  useEffect,
  useState,
  type ButtonHTMLAttributes,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from 'react'
import { useStore } from '../lib/store'

export const cn = (...classes: ClassValue[]) => twMerge(clsx(classes))

/* ------------------------------------------------------------------ */
/* Botões                                                              */
/* ------------------------------------------------------------------ */

type Variante = 'primario' | 'secundario' | 'ghost' | 'perigo' | 'sucesso' | 'aviso'
type Tamanho = 'sm' | 'md' | 'lg' | 'icone'

const variantes: Record<Variante, string> = {
  primario:
    'text-white bg-gradient-to-r from-pink-500 via-purple-600 to-indigo-600 hover:brightness-110 shadow-soft hover:shadow-hover dark:shadow-dark-soft',
  secundario:
    'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 shadow-sm dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700 dark:hover:bg-slate-700',
  ghost: 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800',
  perigo:
    'text-white bg-gradient-to-r from-rose-500 to-red-600 hover:brightness-110 shadow-soft dark:shadow-dark-soft',
  sucesso:
    'text-white bg-gradient-to-r from-emerald-500 to-green-600 hover:brightness-110 shadow-soft dark:shadow-dark-soft',
  aviso: 'text-white bg-gradient-to-r from-amber-500 to-orange-500 hover:brightness-110 shadow-soft dark:shadow-dark-soft',
}

const tamanhos: Record<Tamanho, string> = {
  sm: 'h-8 px-3 text-xs gap-1.5',
  md: 'h-10 px-4 text-sm gap-2',
  lg: 'h-12 px-6 text-base gap-2',
  icone: 'h-9 w-9 text-sm',
}

interface BotaoProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variante?: Variante
  tamanho?: Tamanho
  icone?: LucideIcon
  carregando?: boolean
}

export function Botao({
  variante = 'primario',
  tamanho = 'md',
  icone: Icone,
  carregando,
  className,
  children,
  disabled,
  ...props
}: BotaoProps) {
  return (
    <button
      {...props}
      disabled={disabled || carregando}
      className={cn(
        'inline-flex items-center justify-center rounded-xl font-semibold transition-all duration-200 active:scale-[.97] disabled:cursor-not-allowed disabled:opacity-50',
        variantes[variante],
        tamanhos[tamanho],
        className,
      )}
    >
      {carregando ? <Loader2 className="h-4 w-4 animate-spin" /> : Icone ? <Icone className="h-4 w-4" /> : null}
      {children}
    </button>
  )
}

/* ------------------------------------------------------------------ */
/* Cartões                                                             */
/* ------------------------------------------------------------------ */

export function Cartao({
  className,
  children,
  hover = true,
}: {
  className?: string
  children: ReactNode
  hover?: boolean
}) {
  return (
    <div
      className={cn(
        'rounded-2xl border border-slate-100 bg-white p-5 shadow-soft transition-all duration-200 dark:border-slate-800 dark:bg-slate-900 dark:shadow-dark-soft',
        hover && 'hover:-translate-y-0.5 hover:shadow-hover dark:hover:shadow-dark-hover',
        className,
      )}
    >
      {children}
    </div>
  )
}

export function CartaoResumo({
  titulo,
  valor,
  icone: Icone,
  gradiente,
  sub,
}: {
  titulo: string
  valor: ReactNode
  icone: LucideIcon
  gradiente: string
  sub?: string
}) {
  return (
    <Cartao className="flex items-center gap-4">
      <div
        className={cn(
          'flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br text-white shadow-soft dark:shadow-dark-soft',
          gradiente,
        )}
      >
        <Icone className="h-6 w-6" />
      </div>
      <div className="min-w-0">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">{titulo}</p>
        <p className="truncate text-2xl font-extrabold text-slate-800 dark:text-slate-100">{valor}</p>
        {sub ? <p className="truncate text-xs text-slate-400 dark:text-slate-500">{sub}</p> : null}
      </div>
    </Cartao>
  )
}

/* ------------------------------------------------------------------ */
/* Etiquetas                                                           */
/* ------------------------------------------------------------------ */

export function Etiqueta({
  children,
  className,
  icone: Icone,
}: {
  children: ReactNode
  className?: string
  icone?: LucideIcon
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide',
        className,
      )}
    >
      {Icone ? <Icone className="h-3 w-3" /> : null}
      {children}
    </span>
  )
}

/* ------------------------------------------------------------------ */
/* Campos de formulário                                                */
/* ------------------------------------------------------------------ */

export function Campo({
  label,
  obrigatorio,
  children,
  dica,
  erro,
  className,
}: {
  label?: string
  obrigatorio?: boolean
  children: ReactNode
  dica?: string
  erro?: string
  className?: string
}) {
  return (
    <label className={cn('block', className)}>
      {label ? (
        <span className="mb-1.5 block text-sm font-semibold text-slate-700 dark:text-slate-300">
          {label} {obrigatorio ? <span className="text-rose-500">*</span> : null}
        </span>
      ) : null}
      {children}
      {erro ? <span className="mt-1 block text-xs font-medium text-rose-600 dark:text-rose-400">{erro}</span> : null}
      {dica && !erro ? <span className="mt-1 block text-xs text-slate-400 dark:text-slate-500">{dica}</span> : null}
    </label>
  )
}

const baseCampo =
  'w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-purple-400 focus:ring-4 focus:ring-purple-100 disabled:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-purple-500 dark:focus:ring-purple-500/20 dark:disabled:bg-slate-900'

export const Entrada = ({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) => (
  <input {...props} className={cn(baseCampo, className)} />
)

export const AreaTexto = ({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) => (
  <textarea {...props} className={cn(baseCampo, 'min-h-[92px] resize-y', className)} />
)

export const Selecao = ({ className, children, ...props }: SelectHTMLAttributes<HTMLSelectElement>) => (
  <select {...props} className={cn(baseCampo, 'cursor-pointer pr-8', className)}>
    {children}
  </select>
)

export function Interruptor({
  ativo,
  onChange,
  label,
  descricao,
}: {
  ativo: boolean
  onChange: (v: boolean) => void
  label: string
  descricao?: string
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!ativo)}
      className="flex w-full items-center gap-3 rounded-xl border border-slate-200 bg-white p-3 text-left transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700"
    >
      <span
        className={cn(
          'relative h-6 w-11 shrink-0 rounded-full transition',
          ativo ? 'bg-gradient-to-r from-pink-500 to-purple-600' : 'bg-slate-300 dark:bg-slate-600',
        )}
      >
        <span
          className={cn(
            'absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all',
            ativo ? 'left-[22px]' : 'left-0.5',
          )}
        />
      </span>
      <span className="min-w-0">
        <span className="block text-sm font-semibold text-slate-700 dark:text-slate-200">{label}</span>
        {descricao ? <span className="block text-xs text-slate-400 dark:text-slate-500">{descricao}</span> : null}
      </span>
    </button>
  )
}

/* ------------------------------------------------------------------ */
/* Modal / confirmação                                                 */
/* ------------------------------------------------------------------ */

export function Modal({
  aberto,
  onFechar,
  titulo,
  subtitulo,
  children,
  rodape,
  largura = 'max-w-2xl',
  icone: Icone,
  fecharAoClicarFora = true,
}: {
  aberto: boolean
  onFechar: () => void
  titulo: string
  subtitulo?: string
  children: ReactNode
  rodape?: ReactNode
  largura?: string
  icone?: LucideIcon
  fecharAoClicarFora?: boolean
}) {
  useEffect(() => {
    if (!aberto) return
    const anterior = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onFechar()
    }
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = anterior
      window.removeEventListener('keydown', onKey)
    }
  }, [aberto, onFechar])

  if (!aberto) return null

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/50 p-3 backdrop-blur-sm sm:p-6 print:hidden dark:bg-black/70">
      <div className="absolute inset-0" onClick={() => fecharAoClicarFora && onFechar()} aria-hidden="true" />
      <div
        className={cn(
          'relative my-4 w-full animate-pop-in rounded-2xl bg-white shadow-2xl dark:border dark:border-slate-800 dark:bg-slate-900',
          largura,
        )}
      >
        <div className="flex items-start gap-3 border-b border-slate-100 p-5 dark:border-slate-800">
          {Icone ? (
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-pink-500 via-purple-600 to-indigo-600 text-white shadow-soft">
              <Icone className="h-5 w-5" />
            </div>
          ) : null}
          <div className="min-w-0 flex-1">
            <h2 className="text-lg font-extrabold text-slate-800 dark:text-slate-100">{titulo}</h2>
            {subtitulo ? <p className="text-sm text-slate-500 dark:text-slate-400">{subtitulo}</p> : null}
          </div>
          <button
            onClick={onFechar}
            className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
            aria-label="Fechar"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="max-h-[70vh] overflow-y-auto p-5">{children}</div>
        {rodape ? (
          <div className="flex flex-wrap items-center justify-end gap-2 border-t border-slate-100 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-900/60">
            {rodape}
          </div>
        ) : null}
      </div>
    </div>
  )
}

export function useConfirmacao() {
  const [estado, setEstado] = useState<null | {
    titulo: string
    mensagem: ReactNode
    textoBotao?: string
    resolver: (v: boolean) => void
  }>(null)

  const confirmar = (opcoes: { titulo: string; mensagem: ReactNode; textoBotao?: string }) =>
    new Promise<boolean>((resolve) => setEstado({ ...opcoes, resolver: resolve }))

  const dialog = estado ? (
    <Modal
      aberto
      largura="max-w-md"
      icone={AlertTriangle}
      titulo={estado.titulo}
      onFechar={() => {
        estado.resolver(false)
        setEstado(null)
      }}
      rodape={
        <>
          <Botao
            variante="secundario"
            onClick={() => {
              estado.resolver(false)
              setEstado(null)
            }}
          >
            Cancelar
          </Botao>
          <Botao
            variante="perigo"
            onClick={() => {
              estado.resolver(true)
              setEstado(null)
            }}
          >
            {estado.textoBotao ?? 'Excluir'}
          </Botao>
        </>
      }
    >
      <div className="text-sm text-slate-600 dark:text-slate-300">{estado.mensagem}</div>
    </Modal>
  ) : null

  return { confirmar, dialog }
}

/* ------------------------------------------------------------------ */
/* Diversos                                                            */
/* ------------------------------------------------------------------ */

export function Vazio({
  titulo,
  descricao,
  icone: Icone,
  acao,
}: {
  titulo: string
  descricao?: string
  icone: LucideIcon
  acao?: ReactNode
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-slate-200 bg-white/60 px-6 py-12 text-center dark:border-slate-700 dark:bg-slate-900/60">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-pink-500/10 via-purple-500/10 to-indigo-500/10 text-purple-600 dark:text-purple-400">
        <Icone className="h-7 w-7" />
      </div>
      <div>
        <p className="text-base font-bold text-slate-700 dark:text-slate-200">{titulo}</p>
        {descricao ? <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">{descricao}</p> : null}
      </div>
      {acao}
    </div>
  )
}

export function Carregando({ texto = 'Carregando...' }: { texto?: string }) {
  return (
    <div className="flex items-center justify-center gap-3 py-16 text-slate-500 dark:text-slate-400">
      <Loader2 className="h-5 w-5 animate-spin text-purple-600 dark:text-purple-400" />
      <span className="text-sm font-medium">{texto}</span>
    </div>
  )
}

export function TituloPagina({
  titulo,
  subtitulo,
  acoes,
  icone: Icone,
}: {
  titulo: string
  subtitulo?: string
  acoes?: ReactNode
  icone?: LucideIcon
}) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
      <div className="flex items-center gap-3">
        {Icone ? (
          <div className="hidden h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-pink-500 via-purple-600 to-indigo-600 text-white shadow-soft sm:flex">
            <Icone className="h-6 w-6" />
          </div>
        ) : null}
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-800 dark:text-slate-100 sm:text-3xl">
            {titulo}
          </h1>
          {subtitulo ? <p className="text-sm text-slate-500 dark:text-slate-400">{subtitulo}</p> : null}
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2">{acoes}</div>
    </div>
  )
}

export function Abas<T extends string>({
  abas,
  ativa,
  onChange,
}: {
  abas: { id: T; label: string; icone?: LucideIcon; contador?: number }[]
  ativa: T
  onChange: (id: T) => void
}) {
  return (
    <div className="mb-4 inline-flex flex-wrap gap-1 rounded-2xl border border-slate-100 bg-white p-1 shadow-soft dark:border-slate-800 dark:bg-slate-900 dark:shadow-dark-soft">
      {abas.map((aba) => {
        const Icone = aba.icone
        const selecionada = aba.id === ativa
        return (
          <button
            key={aba.id}
            onClick={() => onChange(aba.id)}
            className={cn(
              'inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition',
              selecionada
                ? 'bg-gradient-to-r from-pink-500 via-purple-600 to-indigo-600 text-white shadow-soft'
                : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800',
            )}
          >
            {Icone ? <Icone className="h-4 w-4" /> : null}
            {aba.label}
            {aba.contador !== undefined ? (
              <span
                className={cn(
                  'rounded-full px-1.5 py-0.5 text-[10px] font-bold',
                  selecionada ? 'bg-white/25' : 'bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-300',
                )}
              >
                {aba.contador}
              </span>
            ) : null}
          </button>
        )
      })}
    </div>
  )
}

export function Toaster() {
  const { toasts, fecharToast } = useStore()
  if (!toasts.length) return null
  return (
    <div className="pointer-events-none fixed bottom-4 right-4 z-[60] flex w-[min(92vw,360px)] flex-col gap-2 print:hidden">
      {toasts.map((t) => {
        const Icone = t.tipo === 'erro' ? XCircle : t.tipo === 'info' ? Info : CheckCircle2
        const cor =
          t.tipo === 'erro'
            ? 'from-rose-500 to-red-600'
            : t.tipo === 'info'
              ? 'from-sky-500 to-blue-600'
              : 'from-emerald-500 to-green-600'
        return (
          <button
            key={t.id}
            onClick={() => fecharToast(t.id)}
            className="pointer-events-auto flex animate-fade-in-up items-start gap-3 rounded-xl border border-slate-100 bg-white p-3 text-left shadow-hover dark:border-slate-800 dark:bg-slate-900"
          >
            <span
              className={cn(
                'mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br text-white',
                cor,
              )}
            >
              <Icone className="h-4 w-4" />
            </span>
            <span className="text-sm font-medium text-slate-700 dark:text-slate-200">{t.texto}</span>
          </button>
        )
      })}
    </div>
  )
}

export function BarraBusca({
  valor,
  onChange,
  placeholder,
  className,
}: {
  valor: string
  onChange: (v: string) => void
  placeholder?: string
  className?: string
}) {
  return (
    <div className={cn('relative', className)}>
      <svg
        className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400 dark:text-slate-500"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <circle cx="11" cy="11" r="8" />
        <path d="m21 21-4.3-4.3" />
      </svg>
      <input
        value={valor}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="h-14 w-full rounded-2xl border border-slate-200 bg-white pl-12 pr-4 text-base text-slate-800 shadow-soft outline-none transition placeholder:text-slate-400 focus:border-purple-400 focus:ring-4 focus:ring-purple-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500 dark:shadow-dark-soft dark:focus:border-purple-500 dark:focus:ring-purple-500/20"
      />
    </div>
  )
}

/** Ícone de chave/senha usado no cadeado do painel */
export { AlertTriangle }
