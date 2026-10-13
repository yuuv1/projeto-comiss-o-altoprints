import { CheckCircle2, Clock, PackageCheck, Printer, Wallet, type LucideIcon } from 'lucide-react'
import {
  LABEL_ESTAGIO,
  PASSOS_FILA,
  passoFeito,
  type EstagioFila,
  type PassoFila,
  type Pedido,
} from '../lib/types'
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

export function EtiquetaEstagio({ status }: { status: EstagioFila }) {
  return (
    <Etiqueta className={COR_ESTAGIO[status]} icone={ICONE_ESTAGIO[status]}>
      {LABEL_ESTAGIO[status]}
    </Etiqueta>
  )
}

/** Marcação opcional: a fila já foi entregue ao cliente */
export function EtiquetaEntrega({ entregue }: { entregue: boolean }) {
  if (!entregue) return null
  return (
    <Etiqueta className="border-emerald-200 bg-emerald-50 text-emerald-700" icone={PackageCheck}>
      Entregue
    </Etiqueta>
  )
}

/** Marcação opcional de pagamento (controle do proprietário) */
export function EtiquetaPago({ pago }: { pago: boolean }) {
  if (!pago) return null
  return (
    <Etiqueta className="border-teal-200 bg-teal-50 text-teal-700" icone={Wallet}>
      Pago
    </Etiqueta>
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

/** Cor de cada passo quando ele já foi feito */
const COR_PASSO: Record<PassoFila, string> = {
  pago: 'border-teal-200 bg-teal-50 text-teal-700 hover:bg-teal-100',
  imprimindo: 'border-sky-200 bg-sky-50 text-sky-700 hover:bg-sky-100',
  concluida: 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100',
  entregue: 'border-violet-200 bg-violet-50 text-violet-700 hover:bg-violet-100',
}

const ICONE_PASSO: Record<PassoFila, LucideIcon> = {
  pago: Wallet,
  imprimindo: Printer,
  concluida: CheckCircle2,
  entregue: PackageCheck,
}

/**
 * Os quatro passos da fila, clicáveis: pago → imprimindo → concluída → entregue.
 * Clicar num passo que já foi feito desfaz (volta atrás).
 */
export function PassosFila({
  pedido,
  onPasso,
  compacto = false,
}: {
  pedido: Pedido
  onPasso: (passo: PassoFila) => void
  compacto?: boolean
}) {
  return (
    <div className="flex flex-wrap items-center gap-1">
      {PASSOS_FILA.map((passo) => {
        const feito = passoFeito(pedido, passo.id)
        const Icone = ICONE_PASSO[passo.id]
        return (
          <button
            key={passo.id}
            type="button"
            title={feito ? `${passo.label} — clicar desfaz` : passo.label}
            onClick={() => onPasso(passo.id)}
            className={cn(
              'inline-flex items-center gap-1 rounded-full border font-bold transition print:hidden',
              compacto ? 'px-2 py-0.5 text-[10px]' : 'px-2.5 py-1 text-[11px]',
              feito
                ? COR_PASSO[passo.id]
                : 'border-slate-200 bg-white text-slate-400 hover:border-purple-200 hover:text-purple-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-500',
            )}
          >
            <Icone className={compacto ? 'h-3 w-3' : 'h-3.5 w-3.5'} />
            {passo.curto}
          </button>
        )
      })}
    </div>
  )
}

export { CheckCircle2, Clock, PackageCheck, Printer, Wallet }
