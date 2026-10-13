import { CheckCircle2, Clock, PackageCheck, Plus, Printer, Wallet, type LucideIcon } from 'lucide-react'
import { LABEL_ESTAGIO, type EstagioFila } from '../lib/types'
import { cn, Etiqueta } from './ui'

/** Cores e ícones do estágio da fila (só existem dois: em andamento e concluído) */
export const COR_ESTAGIO: Record<EstagioFila, string> = {
  em_andamento: 'bg-sky-100 text-sky-800 border-sky-200',
  concluido: 'bg-emerald-100 text-emerald-800 border-emerald-200',
}

export const ICONE_ESTAGIO: Record<EstagioFila, LucideIcon> = {
  em_andamento: Clock,
  concluido: CheckCircle2,
}

/**
 * Selo do cartão. Sem `onClick` ele é só informação; com `onClick` vira um
 * botão: o mouse em cima mostra o que o clique faz.
 */
function Selo({
  children,
  className,
  icone: Icone,
  onClick,
  dica,
}: {
  children: string
  className: string
  icone: LucideIcon
  onClick?: () => void
  dica?: string
}) {
  if (!onClick) {
    return (
      <Etiqueta className={className} icone={Icone}>
        {children}
      </Etiqueta>
    )
  }
  return (
    <button
      type="button"
      title={dica}
      onClick={onClick}
      className={cn(
        'inline-flex cursor-pointer items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide transition hover:shadow-soft active:scale-95 print:hidden',
        className,
      )}
    >
      <Icone className="h-3 w-3" />
      {children}
    </button>
  )
}

/** selo de marcação ainda não feita: tracejado, com um "+" na frente */
const COR_PENDENTE =
  'border-dashed border-slate-300 bg-white text-slate-400 hover:border-purple-300 hover:text-purple-600 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-500'

/**
 * Estágio da fila. Com `onClick` o selo alterna: em andamento → concluído
 * (saiu da máquina) e concluído → em andamento.
 */
export function EtiquetaEstagio({ status, onClick }: { status: EstagioFila; onClick?: () => void }) {
  const concluido = status === 'concluido'
  return (
    <Selo
      className={COR_ESTAGIO[status]}
      icone={ICONE_ESTAGIO[status]}
      onClick={onClick}
      dica={concluido ? 'Fila concluída — clicar volta para em andamento' : 'Clique quando a fila sair da máquina'}
    >
      {LABEL_ESTAGIO[status]}
    </Selo>
  )
}

/** Marcação opcional: a fila já foi entregue ao cliente */
export function EtiquetaEntrega({ entregue, onClick }: { entregue: boolean; onClick?: () => void }) {
  if (entregue) {
    return (
      <Selo
        className="border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
        icone={PackageCheck}
        onClick={onClick}
        dica="Entregue ao cliente — clicar desfaz"
      >
        Entregue
      </Selo>
    )
  }
  if (!onClick) return null
  return (
    <Selo className={COR_PENDENTE} icone={Plus} onClick={onClick} dica="Marcar como entregue ao cliente">
      Entregue
    </Selo>
  )
}

/** Marcação opcional de pagamento (controle do proprietário) */
export function EtiquetaPago({ pago, onClick }: { pago: boolean; onClick?: () => void }) {
  if (pago) {
    return (
      <Selo
        className="border-teal-200 bg-teal-50 text-teal-700 hover:bg-teal-100"
        icone={Wallet}
        onClick={onClick}
        dica="Pago — clicar desfaz"
      >
        Pago
      </Selo>
    )
  }
  if (!onClick) return null
  return (
    <Selo className={COR_PENDENTE} icone={Plus} onClick={onClick} dica="Marcar como pago">
      Pago
    </Selo>
  )
}

/** Passo do fluxo mostrado na tela do pedido (em andamento → concluído → entregue) */
export function PassoEstagio({ ativo, children, icone: Icone }: { ativo: boolean; children: string; icone: LucideIcon }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide transition ${
        ativo ? 'border-purple-200 bg-purple-50 text-purple-700' : 'border-slate-200 bg-white text-slate-400'
      }`}
    >
      <Icone className="h-3.5 w-3.5" />
      {children}
    </span>
  )
}

export { CheckCircle2, Clock, PackageCheck, Printer, Wallet }
