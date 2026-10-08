import {
  BadgeCheck,
  Ban,
  Brush,
  CheckCircle2,
  CircleDollarSign,
  Clock,
  Hourglass,
  ListOrdered,
  Printer,
  Split,
  Wallet,
  type LucideIcon,
} from 'lucide-react'
import { LABEL_PAGAMENTO, LABEL_PRODUCAO, type StatusPagamento, type StatusProducao } from '../lib/types'
import { Etiqueta } from './ui'

export const COR_PRODUCAO: Record<StatusProducao, string> = {
  editar_arte: 'bg-amber-100 text-amber-800 border-amber-200',
  fila_impressao: 'bg-sky-100 text-sky-800 border-sky-200',
  pagamento: 'bg-violet-100 text-violet-800 border-violet-200',
  imprimir: 'bg-fuchsia-100 text-fuchsia-800 border-fuchsia-200',
  dtf_pronto: 'bg-emerald-100 text-emerald-800 border-emerald-200',
}

export const COR_PAGAMENTO: Record<StatusPagamento, string> = {
  pendente: 'bg-amber-100 text-amber-800 border-amber-200',
  pago: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  parcial: 'bg-orange-100 text-orange-800 border-orange-200',
  cancelado: 'bg-rose-100 text-rose-700 border-rose-200',
}

export const ICONE_PRODUCAO: Record<StatusProducao, LucideIcon> = {
  editar_arte: Brush,
  fila_impressao: ListOrdered,
  pagamento: Wallet,
  imprimir: Printer,
  dtf_pronto: CheckCircle2,
}

export const ICONE_PAGAMENTO: Record<StatusPagamento, LucideIcon> = {
  pendente: Hourglass,
  pago: BadgeCheck,
  parcial: Split,
  cancelado: Ban,
}

export function EtiquetaProducao({ status }: { status: StatusProducao }) {
  return (
    <Etiqueta className={COR_PRODUCAO[status]} icone={ICONE_PRODUCAO[status]}>
      {LABEL_PRODUCAO[status]}
    </Etiqueta>
  )
}

export function EtiquetaPagamento({ status }: { status: StatusPagamento }) {
  return (
    <Etiqueta className={COR_PAGAMENTO[status]} icone={ICONE_PAGAMENTO[status]}>
      {LABEL_PAGAMENTO[status]}
    </Etiqueta>
  )
}

export function PassoStatus({ status, ativo }: { status: StatusProducao; ativo: boolean }) {
  const Icone = ICONE_PRODUCAO[status]
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide transition ${
        ativo ? COR_PRODUCAO[status] : 'border-slate-200 bg-white text-slate-400'
      }`}
    >
      <Icone className="h-3.5 w-3.5" />
      {LABEL_PRODUCAO[status]}
    </span>
  )
}

export { CircleDollarSign, Clock }
