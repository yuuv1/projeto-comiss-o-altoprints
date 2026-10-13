import { Mail, Pencil, Phone, Plus, Star, Trash2, UserPlus, Users } from 'lucide-react'
import { useMemo, useState } from 'react'
import { AreaTexto, BarraBusca, Botao, Campo, CartaoResumo, Entrada, Interruptor, Modal, Selecao, TituloPagina, Vazio, useConfirmacao } from '../components/ui'
import { useAuth } from '../lib/auth'
import { moeda } from '../lib/format'
import { useStore } from '../lib/store'
import type { Cliente } from '../lib/types'

const clienteEmBranco = (): Omit<Cliente, 'id' | 'created_at'> => ({
  nome: '',
  telefone: '',
  email: '',
  observacoes: '',
  vendedor_id: '',
  valor_especial_metro: null,
  especial: false,
})

export default function Clientes() {
  const { db, salvarCliente, excluirCliente, nomeVendedor } = useStore()
  const { usuario, ehProprietario } = useAuth()
  const { confirmar, dialog } = useConfirmacao()
  const [busca, setBusca] = useState('')
  const [aberto, setAberto] = useState(false)
  const [editando, setEditando] = useState<Cliente | null>(null)
  const [form, setForm] = useState(clienteEmBranco())
  const [valorEspecialTxt, setValorEspecialTxt] = useState('')
  const [salvando, setSalvando] = useState(false)
  const [preenchido, setPreenchido] = useState(false)

  const abrirNovo = () => {
    setEditando(null)
    setForm({ ...clienteEmBranco(), vendedor_id: ehProprietario ? '' : usuario?.vendedor_id ?? '' })
    setValorEspecialTxt('')
    setPreenchido(false)
    setAberto(true)
  }

  const abrirEdicao = (c: Cliente) => {
    setEditando(c)
    const { id: _id, created_at: _c, ...resto } = c
    setForm(resto)
    setValorEspecialTxt(c.valor_especial_metro ? String(c.valor_especial_metro).replace('.', ',') : '')
    setPreenchido(false)
    setAberto(true)
  }

  const clientes = useMemo(() => {
    const t = busca.trim().toLowerCase()
    const todos = ehProprietario
      ? db.clientes
      : db.clientes.filter((c) => c.vendedor_id === usuario?.vendedor_id)
    const lista = [...todos].sort((a, b) => a.nome.localeCompare(b.nome))
    if (!t) return lista
    return lista.filter((c) =>
      [c.nome, c.telefone, c.email, nomeVendedor(c.vendedor_id)].join(' ').toLowerCase().includes(t),
    )
  }, [busca, db.clientes, ehProprietario, nomeVendedor, usuario?.vendedor_id])

  const especiais = db.clientes.filter((c) => c.especial).length

  const salvar = async (e: React.FormEvent) => {
    e.preventDefault()
    setSalvando(true)
    try {
      const valorEspecial = Number(String(valorEspecialTxt).replace(',', '.')) || null
      await salvarCliente({ ...form, valor_especial_metro: valorEspecial }, editando?.id)
      setAberto(false)
    } catch (err) {
      // o erro já aparece no toast
    } finally {
      setSalvando(false)
    }
  }

  const pedidosDoCliente = (c: Cliente) =>
    db.pedidos.filter((p) => p.cliente_id === c.id || p.cliente_nome.toLowerCase() === c.nome.toLowerCase())

  return (
    <>
      <TituloPagina
        icone={Users}
        titulo={ehProprietario ? 'Clientes' : 'Meus clientes'}
        subtitulo={
          ehProprietario
            ? 'Cadastro de clientes com vendedor responsável e valor especial do metro.'
            : 'Aqui aparecem somente os clientes ligados a você.'
        }
        acoes={
          <Botao icone={Plus} onClick={abrirNovo}>
            Novo cliente
          </Botao>
        }
      />

      <div className="mb-3 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <CartaoResumo titulo="Clientes" valor={db.clientes.length} icone={Users} gradiente="from-pink-500 to-purple-600" />
        <CartaoResumo titulo="★ Especiais" valor={especiais} icone={Star} gradiente="from-amber-500 to-orange-600" />
        <CartaoResumo
          titulo="Com e-mail"
          valor={db.clientes.filter((c) => c.email).length}
          icone={Mail}
          gradiente="from-sky-500 to-blue-600"
        />
        <CartaoResumo
          titulo="Com telefone"
          valor={db.clientes.filter((c) => c.telefone).length}
          icone={Phone}
          gradiente="from-emerald-500 to-green-600"
        />
      </div>

      <BarraBusca
        className="mb-3"
        valor={busca}
        onChange={setBusca}
        placeholder="Buscar por nome, telefone ou vendedor..."
      />

      {clientes.length === 0 ? (
        <Vazio
          icone={UserPlus}
          titulo={busca ? 'Nenhum cliente encontrado' : 'Nenhum cliente cadastrado ainda'}
          descricao={busca ? 'Tente outro termo de busca.' : 'Cadastre o primeiro cliente para começar.'}
          acao={
            !busca ? (
              <Botao icone={Plus} onClick={abrirNovo}>
                Novo cliente
              </Botao>
            ) : undefined
          }
        />
      ) : (
        <div className="space-y-3">
          {clientes.map((c) => {
            const pedidos = pedidosDoCliente(c)
            const total = pedidos.reduce((s, p) => s + Number(p.valor || 0), 0)
            return (
              <div
                key={c.id}
                className="flex flex-wrap items-center gap-3 rounded-2xl border border-slate-100 bg-white p-4 shadow-soft transition-all hover:-translate-y-0.5 hover:shadow-hover"
              >
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-pink-500 via-purple-600 to-indigo-600 text-sm font-black text-white">
                  {c.nome.slice(0, 2).toUpperCase()}
                </div>
                <div className="min-w-[180px] flex-1">
                  <p className="flex items-center gap-1.5 text-base font-extrabold text-slate-800">
                    {c.nome}
                    {c.especial ? <Star className="h-4 w-4 fill-amber-400 text-amber-400" /> : null}
                  </p>
                  <p className="flex flex-wrap items-center gap-x-3 text-xs text-slate-500">
                    {c.telefone ? (
                      <span className="inline-flex items-center gap-1">
                        <Phone className="h-3 w-3" /> {c.telefone}
                      </span>
                    ) : null}
                    {c.email ? (
                      <span className="inline-flex items-center gap-1">
                        <Mail className="h-3 w-3" /> {c.email}
                      </span>
                    ) : null}
                    <span>Vendedor: {nomeVendedor(c.vendedor_id)}</span>
                  </p>
                  {c.observacoes ? <p className="mt-0.5 text-xs text-slate-400">{c.observacoes}</p> : null}
                </div>

                <div className="text-right text-xs">
                  <p className="font-bold text-slate-700">
                    {c.valor_especial_metro ? `${moeda(c.valor_especial_metro)}/m` : 'valor da tabela'}
                  </p>
                  <p className="text-slate-400">
                    {pedidos.length} pedido(s) • {moeda(total)}
                  </p>
                </div>

                <div className="flex gap-1.5">
                  <Botao tamanho="sm" variante="secundario" icone={Pencil} onClick={() => abrirEdicao(c)}>
                    Editar
                  </Botao>
                  <Botao
                    tamanho="sm"
                    variante="ghost"
                    className="text-rose-500 hover:bg-rose-50"
                    icone={Trash2}
                    onClick={async () => {
                      const ok = await confirmar({
                        titulo: `Excluir ${c.nome}?`,
                        mensagem: 'Os pedidos deste cliente continuam salvos no sistema.',
                      })
                      if (ok) await excluirCliente(c.id)
                    }}
                  >
                    Excluir
                  </Botao>
                </div>
              </div>
            )
          })}
        </div>
      )}

      <Modal
        aberto={aberto}
        onFechar={() => setAberto(false)}
        icone={editando ? Pencil : UserPlus}
        titulo={editando ? 'Editar cliente' : 'Novo cliente'}
        subtitulo="Campos com * são obrigatórios."
        rodape={
          <>
            <Botao variante="secundario" onClick={() => setAberto(false)} type="button">
              Cancelar
            </Botao>
            <Botao type="submit" form="form-cliente" carregando={salvando}>
              Salvar
            </Botao>
          </>
        }
      >
        <form id="form-cliente" onSubmit={salvar} className="grid gap-4 sm:grid-cols-2">
          <Campo label="Nome" obrigatorio className="sm:col-span-2">
            <Entrada
              value={form.nome}
              onChange={(e) => setForm({ ...form, nome: e.target.value })}
              required
              autoFocus
              placeholder="Nome do cliente"
            />
          </Campo>
          <Campo label="Telefone">
            <Entrada
              value={form.telefone}
              onChange={(e) => setForm({ ...form, telefone: e.target.value })}
              placeholder="(00) 00000-0000"
            />
          </Campo>
          <Campo label="E-mail">
            <Entrada
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="cliente@email.com"
            />
          </Campo>
          <Campo label="Vendedor responsável" obrigatorio>
            {ehProprietario ? (
              <Selecao
                value={form.vendedor_id}
                onChange={(e) => setForm({ ...form, vendedor_id: e.target.value })}
                required
              >
                <option value="">Selecione</option>
                {db.vendedores.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.nome}
                  </option>
                ))}
              </Selecao>
            ) : (
              <Entrada value={nomeVendedor(usuario?.vendedor_id)} readOnly className="bg-slate-50 dark:bg-slate-800" />
            )}
          </Campo>
          <Campo
            label="Valor especial do metro (opcional)"
            dica="Se preenchido, os novos pedidos deste cliente usam este valor no cálculo automático."
          >
            <Entrada
              value={valorEspecialTxt}
              onChange={(e) => setValorEspecialTxt(e.target.value.replace(/[^\d.,]/g, ''))}
              placeholder="49,90"
              inputMode="decimal"
            />
          </Campo>
          <div className="sm:col-span-2">
            <Interruptor
              ativo={form.especial}
              onChange={(v) => setForm({ ...form, especial: v })}
              label="★ Cliente especial"
              descricao="Clientes especiais aparecem no relatório de cliente especial."
            />
          </div>
          <Campo label="Observações" className="sm:col-span-2">
            <AreaTexto
              value={form.observacoes}
              onChange={(e) => setForm({ ...form, observacoes: e.target.value })}
              placeholder="Informações importantes sobre o cliente..."
            />
          </Campo>
          {preenchido ? null : null}
        </form>
      </Modal>
      {dialog}
    </>
  )
}
