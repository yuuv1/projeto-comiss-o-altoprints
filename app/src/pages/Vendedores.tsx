import { Pencil, Plus, Trash2, UserPlus, UsersRound } from 'lucide-react'
import { useMemo, useState } from 'react'
import { BarraAcoes, Botao, Campo, CartaoResumo, Entrada, Modal, TituloPagina, Vazio, useConfirmacao } from '../components/ui'
import { calcularComissao } from '../lib/comissao'
import { moeda } from '../lib/format'
import { useStore } from '../lib/store'
import { FAIXAS_PADRAO, filasDaComissao, type Vendedor } from '../lib/types'

/** Vendedores também pode aparecer como aba dentro de Configurações */
export default function Vendedores({ embutido = false }: { embutido?: boolean } = {}) {
  const { db, salvarVendedor, excluirVendedor } = useStore()
  const faixas = db.configuracoes.faixas_comissao?.length ? db.configuracoes.faixas_comissao : FAIXAS_PADRAO
  const semMetragem = db.configuracoes.comissao_sem_metragem ?? 0
  const { confirmar, dialog } = useConfirmacao()
  const [aberto, setAberto] = useState(false)
  const [editando, setEditando] = useState<Vendedor | null>(null)
  const [nome, setNome] = useState('')
  const [salvando, setSalvando] = useState(false)

  const dados = useMemo(
    () =>
      [...db.vendedores]
        .sort((a, b) => a.nome.localeCompare(b.nome))
        .map((v) => {
          const pedidos = db.pedidos.filter((p) => p.vendedor_id === v.id)
          const total = pedidos.reduce((s, p) => s + Number(p.valor || 0), 0)
          const pagos = filasDaComissao(pedidos, db.configuracoes.comissao_base)
          return {
            vendedor: v,
            pedidos: pedidos.length,
            total,
            pago: pagos.reduce((s, p) => s + Number(p.valor || 0), 0),
            comissao: calcularComissao(pagos, faixas, semMetragem).total,
            clientes: db.clientes.filter((c) => c.vendedor_id === v.id).length,
          }
        }),
    [db.clientes, db.pedidos, db.vendedores, faixas, semMetragem],
  )

  const abrirNovo = () => {
    setEditando(null)
    setNome('')
    setAberto(true)
  }

  const salvar = async (e: React.FormEvent) => {
    e.preventDefault()
    setSalvando(true)
    try {
      await salvarVendedor({ nome }, editando?.id)
      setAberto(false)
    } catch {
      /* erro mostrado no toast */
    } finally {
      setSalvando(false)
    }
  }

  return (
    <>
      {embutido ? (
        <BarraAcoes>
          <Botao icone={Plus} onClick={abrirNovo}>
            Novo vendedor
          </Botao>
        </BarraAcoes>
      ) : (
        <TituloPagina
          icone={UsersRound}
          titulo="Vendedores"
          subtitulo="Quem vende aparece como opção nos cadastros de cliente e de pedido."
          acoes={
            <Botao icone={Plus} onClick={abrirNovo}>
              Novo vendedor
            </Botao>
          }
        />
      )}

      <div className="mb-3 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <CartaoResumo titulo="Vendedores" valor={db.vendedores.length} icone={UsersRound} gradiente="from-pink-500 to-purple-600" />
        <CartaoResumo
          titulo="Pedidos"
          valor={db.pedidos.length}
          icone={Plus}
          gradiente="from-violet-500 to-indigo-600"
        />
        <CartaoResumo
          titulo="Faturamento pago"
          valor={moeda(dados.reduce((s, d) => s + d.pago, 0))}
          icone={Plus}
          gradiente="from-emerald-500 to-green-600"
        />
        <CartaoResumo
          titulo="Comissão (paga)"
          valor={moeda(dados.reduce((s, d) => s + d.comissao, 0))}
          icone={Plus}
          gradiente="from-amber-500 to-orange-600"
        />
      </div>

      {dados.length === 0 ? (
        <Vazio
          icone={UserPlus}
          titulo="Nenhum vendedor cadastrado"
          descricao="Cadastre os vendedores para poder lançar pedidos."
          acao={
            <Botao icone={Plus} onClick={abrirNovo}>
              Novo vendedor
            </Botao>
          }
        />
      ) : (
        <div className="space-y-3">
          {dados.map(({ vendedor, pedidos, pago, comissao, clientes }) => (
            <div
              key={vendedor.id}
              className="flex flex-wrap items-center gap-3 rounded-2xl border border-slate-100 bg-white p-4 shadow-soft transition-all hover:-translate-y-0.5 hover:shadow-hover"
            >
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-pink-500 via-purple-600 to-indigo-600 text-sm font-black text-white">
                {vendedor.nome.slice(0, 2).toUpperCase()}
              </div>
              <div className="min-w-[160px] flex-1">
                <p className="text-base font-extrabold text-slate-800">{vendedor.nome}</p>
                <p className="text-xs text-slate-500">
                  {pedidos} pedido(s) • {clientes} cliente(s)
                </p>
              </div>
              <div className="text-right text-xs">
                <p className="font-bold text-emerald-600">{moeda(pago)} pagos</p>
                <p className="text-slate-400">comissão {moeda(comissao)}</p>
              </div>
              <div className="flex gap-1.5">
                <Botao
                  tamanho="sm"
                  variante="secundario"
                  icone={Pencil}
                  onClick={() => {
                    setEditando(vendedor)
                    setNome(vendedor.nome)
                    setAberto(true)
                  }}
                >
                  Editar
                </Botao>
                <Botao
                  tamanho="sm"
                  variante="ghost"
                  className="text-rose-500 hover:bg-rose-50"
                  icone={Trash2}
                  onClick={async () => {
                    const ok = await confirmar({
                      titulo: `Excluir ${vendedor.nome}?`,
                      mensagem: 'Os pedidos já lançados continuam salvos, mas ficarão sem vendedor.',
                    })
                    if (ok) await excluirVendedor(vendedor.id)
                  }}
                >
                  Excluir
                </Botao>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal
        aberto={aberto}
        onFechar={() => setAberto(false)}
        icone={UserPlus}
        largura="max-w-md"
        titulo={editando ? 'Editar vendedor' : 'Novo vendedor'}
        rodape={
          <>
            <Botao variante="secundario" type="button" onClick={() => setAberto(false)}>
              Cancelar
            </Botao>
            <Botao type="submit" form="form-vendedor" carregando={salvando}>
              Salvar
            </Botao>
          </>
        }
      >
        <form id="form-vendedor" onSubmit={salvar}>
          <Campo label="Nome" obrigatorio>
            <Entrada value={nome} onChange={(e) => setNome(e.target.value)} required autoFocus placeholder="Nome do vendedor" />
          </Campo>
        </form>
      </Modal>
      {dialog}
    </>
  )
}
