import {
  Crown,
  Eye,
  EyeOff,
  KeyRound,
  Pencil,
  Plus,
  ShieldCheck,
  ShieldOff,
  Trash2,
  UserCheck,
  UserPlus,
  Users,
} from 'lucide-react'
import { useMemo, useState } from 'react'
import { useStore } from '../lib/store'
import { useAuth } from '../lib/auth'
import { dataBR, moeda, numeroBR } from '../lib/format'
import { calcularComissao } from '../lib/comissao'
import { FAIXAS_PADRAO, filasDaComissao, type Vendedor } from '../lib/types'
import {
  BarraAcoes,
  Botao,
  Campo,
  Cartao,
  CartaoResumo,
  Entrada,
  Etiqueta,
  Modal,
  TituloPagina,
  Vazio,
  useConfirmacao,
} from '../components/ui'

/**
 * Funcionários e acessos (só o proprietário).
 *
 *  • FUNCIONÁRIOS — os nomes que aparecem na hora de registrar uma fila. Não têm
 *    conta nem senha: a pessoa escolhe o próprio nome no pedido.
 *  • ACESSOS DE PROPRIETÁRIO — quem pode entrar com usuário e senha e ver tudo.
 */
export default function Equipe({ embutido = false }: { embutido?: boolean } = {}) {
  const { db, salvarVendedor, excluirVendedor, avisar } = useStore()
  const { usuario, criarOutroProprietario, redefinirSenha, alternarAtivo, excluirUsuario } = useAuth()
  const { confirmar, dialog } = useConfirmacao()

  const faixas = db.configuracoes.faixas_comissao?.length ? db.configuracoes.faixas_comissao : FAIXAS_PADRAO
  const semMetragem = db.configuracoes.comissao_sem_metragem ?? 0
  const mesAtual = new Date().toISOString().slice(0, 7)
  // mesmo critério do relatório: vale a data do pagamento; sem ela, a do pedido
  const mesDaVenda = (p: { data_pagamento?: string | null; data_pedido?: string | null }) =>
    (p.data_pagamento || p.data_pedido || '').slice(0, 7)

  /* ------------------------------ funcionários ------------------------------ */

  const [novoNome, setNovoNome] = useState('')
  const [salvandoNome, setSalvandoNome] = useState(false)
  const [renomeando, setRenomeando] = useState<Vendedor | null>(null)
  const [nomeEditado, setNomeEditado] = useState('')

  const funcionarios = useMemo(() => {
    return db.vendedores
      .map((v) => {
        const pedidos = db.pedidos.filter((p) => p.vendedor_id === v.id)
        const noMes = pedidos.filter((p) => mesDaVenda(p) === mesAtual)
        const concluidos = filasDaComissao(noMes)
        const ultima = pedidos
          .map((p) => p.data_pedido)
          .filter(Boolean)
          .sort()
          .pop()
        return {
          vendedor: v,
          total: pedidos.length,
          pedidos: noMes.length,
          faturamento: concluidos.reduce((s, p) => s + Number(p.valor || 0), 0),
          comissao: calcularComissao(concluidos, faixas, semMetragem).total,
          ultima: ultima ?? null,
        }
      })
      .sort((a, b) => b.faturamento - a.faturamento || a.vendedor.nome.localeCompare(b.vendedor.nome))
  }, [db.pedidos, db.vendedores, faixas, mesAtual, semMetragem])

  const adicionarFuncionario = async (e: React.FormEvent) => {
    e.preventDefault()
    setSalvandoNome(true)
    try {
      await salvarVendedor({ nome: novoNome })
      setNovoNome('')
    } catch (erro) {
      avisar((erro as Error).message, 'erro')
    } finally {
      setSalvandoNome(false)
    }
  }

  const salvarRenomeado = async () => {
    if (!renomeando) return
    setSalvandoNome(true)
    try {
      await salvarVendedor({ nome: nomeEditado }, renomeando.id)
      setRenomeando(null)
    } catch (erro) {
      avisar((erro as Error).message, 'erro')
    } finally {
      setSalvandoNome(false)
    }
  }

  const pedirExclusaoFuncionario = async (v: Vendedor, pedidos: number) => {
    if (pedidos > 0) {
      avisar(
        `${v.nome} tem ${pedidos} pedido(s) no histórico. Para não perder a comissão já lançada, renomeie em vez de excluir.`,
        'erro',
      )
      return
    }
    const ok = await confirmar({
      titulo: `Excluir ${v.nome}?`,
      mensagem: 'O nome sai da lista de funcionários. Como não há pedidos no histórico dele, nada é perdido.',
      textoBotao: 'Excluir',
    })
    if (ok) await excluirVendedor(v.id)
  }

  /* --------------------------- acessos de proprietário --------------------------- */

  const donos = useMemo(
    () => db.usuarios.filter((u) => u.papel === 'proprietario').sort((a, b) => a.nome.localeCompare(b.nome)),
    [db.usuarios],
  )

  const [criandoDono, setCriandoDono] = useState(false)
  const [donoNome, setDonoNome] = useState('')
  const [donoUsuario, setDonoUsuario] = useState('')
  const [donoSenha, setDonoSenha] = useState('')
  const [donoRepetir, setDonoRepetir] = useState('')
  const [senhaDe, setSenhaDe] = useState<null | { id: string; nome: string }>(null)
  const [senhaNova, setSenhaNova] = useState('')
  const [senhaRepetida, setSenhaRepetida] = useState('')
  const [mostrarSenha, setMostrarSenha] = useState(false)
  const [salvando, setSalvando] = useState(false)

  const abrirNovoDono = () => {
    setDonoNome('')
    setDonoUsuario('')
    setDonoSenha('')
    setDonoRepetir('')
    setMostrarSenha(false)
    setCriandoDono(true)
  }

  const salvarNovoDono = async (e: React.FormEvent) => {
    e.preventDefault()
    if (donoSenha !== donoRepetir) return avisar('As duas senhas precisam ser iguais.', 'erro')
    setSalvando(true)
    try {
      await criarOutroProprietario({ nome: donoNome, usuario: donoUsuario, senha: donoSenha })
      setCriandoDono(false)
    } catch (erro) {
      avisar((erro as Error).message, 'erro')
    } finally {
      setSalvando(false)
    }
  }

  const salvarNovaSenha = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!senhaDe) return
    if (senhaNova !== senhaRepetida) return avisar('As duas senhas precisam ser iguais.', 'erro')
    setSalvando(true)
    try {
      await redefinirSenha(senhaDe.id, senhaNova)
      setSenhaDe(null)
      setSenhaNova('')
      setSenhaRepetida('')
    } catch (erro) {
      avisar((erro as Error).message, 'erro')
    } finally {
      setSalvando(false)
    }
  }

  const excluirDono = async (id: string, nome: string) => {
    const ok = await confirmar({
      titulo: `Excluir o acesso de ${nome}?`,
      mensagem: 'Esta pessoa deixa de poder entrar como proprietário. Os pedidos e clientes continuam intactos.',
      textoBotao: 'Excluir acesso',
    })
    if (!ok) return
    try {
      await excluirUsuario(id)
    } catch (erro) {
      avisar((erro as Error).message, 'erro')
    }
  }

  const alterarAtivo = async (id: string, ativo: boolean) => {
    try {
      await alternarAtivo(id, ativo)
    } catch (erro) {
      avisar((erro as Error).message, 'erro')
    }
  }

  const totalComissao = funcionarios.reduce((s, f) => s + f.comissao, 0)

  return (
    <>
      {embutido ? (
        <BarraAcoes>
          <Botao tamanho="sm" variante="secundario" icone={Plus} onClick={() => document.getElementById('novo-funcionario')?.focus()}>
            Novo funcionário
          </Botao>
          <Botao tamanho="sm" icone={Crown} onClick={abrirNovoDono}>
            Novo acesso de proprietário
          </Botao>
        </BarraAcoes>
      ) : (
        <TituloPagina
          icone={Users}
          titulo="Funcionários e acessos"
          subtitulo="Os funcionários não têm login: escolhem o próprio nome ao registrar uma fila. Só o proprietário entra com usuário e senha."
          acoes={
            <>
              <Botao variante="secundario" icone={Crown} onClick={abrirNovoDono}>
                Novo acesso de proprietário
              </Botao>
              <Botao icone={UserPlus} onClick={() => document.getElementById('novo-funcionario')?.focus()}>
                Novo funcionário
              </Botao>
            </>
          }
        />
      )}

      <div className="mb-3 grid grid-cols-2 gap-3 lg:grid-cols-3">
        <CartaoResumo
          titulo="Funcionários"
          valor={funcionarios.length}
          icone={Users}
          gradiente="from-pink-500 to-purple-600"
          sub="nomes que aparecem nos pedidos"
        />
        <CartaoResumo
          titulo="Comissão do mês"
          valor={moeda(totalComissao)}
          icone={UserCheck}
          gradiente="from-amber-500 to-orange-600"
          sub="filas concluídas"
        />
        <CartaoResumo
          titulo="Acessos de proprietário"
          valor={donos.length}
          icone={Crown}
          gradiente="from-violet-500 to-indigo-600"
          sub="quem entra com usuário e senha"
        />
      </div>

      {/* ------------------------------ funcionários ------------------------------ */}
      <Cartao hover={false} className="mb-4">
        <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
          <div>
            <h2 className="text-base font-extrabold text-slate-800 dark:text-slate-100">Funcionários</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Só o proprietário cadastra nomes novos. Eles não têm senha — escolhem o próprio nome no pedido.
            </p>
          </div>
        </div>

        <form onSubmit={adicionarFuncionario} className="mb-3 flex flex-wrap items-end gap-2">
          <Campo label="Novo funcionário" className="min-w-[220px] flex-1">
            <Entrada
              id="novo-funcionario"
              value={novoNome}
              onChange={(e) => setNovoNome(e.target.value)}
              placeholder="Nome (ex.: JESSICA)"
              maxLength={40}
            />
          </Campo>
          <Botao type="submit" icone={Plus} carregando={salvandoNome} disabled={!novoNome.trim()}>
            Cadastrar
          </Botao>
        </form>

        {funcionarios.length === 0 ? (
          <Vazio
            icone={Users}
            titulo="Nenhum funcionário cadastrado"
            descricao="Cadastre o primeiro nome acima — ele passa a aparecer na hora de registrar uma fila."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left text-[11px] font-bold uppercase tracking-wide text-slate-400 dark:text-slate-500">
                  <th className="px-2 py-1.5">Funcionário</th>
                  <th className="px-2 py-1.5 text-right">Pedidos</th>
                  <th className="px-2 py-1.5 text-right">Faturamento</th>
                  <th className="px-2 py-1.5 text-right">Comissão</th>
                  <th className="px-2 py-1.5">Última venda</th>
                  <th className="px-2 py-1.5" />
                </tr>
              </thead>
              <tbody>
                {funcionarios.map(({ vendedor, total, pedidos, faturamento, comissao, ultima }) => (
                  <tr
                    key={vendedor.id}
                    className="border-t border-slate-100 text-slate-700 dark:border-slate-800 dark:text-slate-200"
                  >
                    <td className="px-2 py-2">
                      <span className="flex items-center gap-2">
                        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-pink-500 via-purple-600 to-indigo-600 text-[10px] font-black text-white">
                          {vendedor.nome.slice(0, 2).toUpperCase()}
                        </span>
                        <span className="font-bold">{vendedor.nome}</span>
                      </span>
                    </td>
                    <td className="px-2 py-2 text-right font-semibold">
                      {pedidos}
                      <span className="block text-[11px] font-normal text-slate-400 dark:text-slate-500">
                        {total} no total
                      </span>
                    </td>
                    <td className="px-2 py-2 text-right font-semibold">{moeda(faturamento)}</td>
                    <td className="px-2 py-2 text-right font-bold text-amber-600 dark:text-amber-400">
                      {moeda(comissao)}
                    </td>
                    <td className="px-2 py-2 text-xs text-slate-500 dark:text-slate-400">
                      {ultima ? dataBR(ultima) : 'sem pedidos'}
                    </td>
                    <td className="px-2 py-2">
                      <div className="flex flex-wrap justify-end gap-1.5">
                        <Botao
                          tamanho="sm"
                          variante="secundario"
                          icone={Pencil}
                          onClick={() => {
                            setRenomeando(vendedor)
                            setNomeEditado(vendedor.nome)
                          }}
                        >
                          Renomear
                        </Botao>
                        <Botao
                          tamanho="sm"
                          variante="ghost"
                          className="text-rose-500 hover:bg-rose-50"
                          icone={Trash2}
                          onClick={() => void pedirExclusaoFuncionario(vendedor, total)}
                        >
                          Excluir
                        </Botao>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Cartao>

      {/* --------------------------- acessos de proprietário --------------------------- */}
      <Cartao hover={false}>
        <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
          <div>
            <h2 className="text-base font-extrabold text-slate-800 dark:text-slate-100">Acessos de proprietário</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Entram pelo “Login proprietário” (topo da tela) e veem tudo. Dá para ter mais de um (sócio, escritório,
              celular da dona).
            </p>
          </div>
          <Botao tamanho="sm" variante="secundario" icone={Crown} onClick={abrirNovoDono}>
            Novo acesso
          </Botao>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left text-[11px] font-bold uppercase tracking-wide text-slate-400 dark:text-slate-500">
                <th className="px-2 py-1.5">Nome</th>
                <th className="px-2 py-1.5">Usuário</th>
                <th className="px-2 py-1.5">Situação</th>
                <th className="px-2 py-1.5">Criado em</th>
                <th className="px-2 py-1.5" />
              </tr>
            </thead>
            <tbody>
              {donos.map((dono) => {
                const eu = dono.id === usuario?.id
                return (
                  <tr
                    key={dono.id}
                    className="border-t border-slate-100 text-slate-700 dark:border-slate-800 dark:text-slate-200"
                  >
                    <td className="px-2 py-2">
                      <span className="flex items-center gap-2 font-bold">
                        <Crown className="h-3.5 w-3.5 text-violet-500" />
                        {dono.nome}
                        {eu ? (
                          <Etiqueta className="border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-900 dark:bg-violet-950/50 dark:text-violet-300">
                            você
                          </Etiqueta>
                        ) : null}
                      </span>
                    </td>
                    <td className="px-2 py-2 font-mono text-xs">{dono.usuario}</td>
                    <td className="px-2 py-2">
                      {dono.ativo ? (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                          <ShieldCheck className="h-3.5 w-3.5" /> ativo
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-slate-400 dark:text-slate-500">
                          <ShieldOff className="h-3.5 w-3.5" /> desativado
                        </span>
                      )}
                    </td>
                    <td className="px-2 py-2 text-xs text-slate-500 dark:text-slate-400">{dataBR(dono.criado_em)}</td>
                    <td className="px-2 py-2">
                      <div className="flex flex-wrap justify-end gap-1.5">
                        {!eu ? (
                          <Botao
                            tamanho="sm"
                            variante="secundario"
                            icone={KeyRound}
                            onClick={() => {
                              setSenhaDe({ id: dono.id, nome: dono.nome })
                              setSenhaNova('')
                              setSenhaRepetida('')
                              setMostrarSenha(false)
                            }}
                          >
                            Redefinir senha
                          </Botao>
                        ) : null}
                        {!eu ? (
                          <Botao
                            tamanho="sm"
                            variante="ghost"
                            onClick={() => void alterarAtivo(dono.id, !dono.ativo)}
                          >
                            {dono.ativo ? 'Desativar' : 'Ativar'}
                          </Botao>
                        ) : null}
                        {!eu && donos.length > 1 ? (
                          <Botao
                            tamanho="sm"
                            variante="ghost"
                            className="text-rose-500 hover:bg-rose-50"
                            icone={Trash2}
                            onClick={() => void excluirDono(dono.id, dono.nome)}
                          >
                            Excluir
                          </Botao>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        <p className="mt-3 rounded-xl border border-sky-200 bg-sky-50 p-3 text-xs text-sky-800 dark:border-sky-900 dark:bg-sky-950/40 dark:text-sky-200">
          A sua própria senha e o seu usuário ficam em <b>Configurações → Meu acesso</b>. O sistema nunca fica sem
          nenhum proprietário ativo: o último não pode ser desativado nem excluído.
        </p>
      </Cartao>

      {/* ------------------------------ janelas ------------------------------ */}

      <Modal
        aberto={criandoDono}
        onFechar={() => setCriandoDono(false)}
        icone={Crown}
        titulo="Novo acesso de proprietário"
        subtitulo="Esta pessoa poderá entrar pelo “Login proprietário” e ver tudo."
      >
        <form onSubmit={salvarNovoDono} className="space-y-3">
          <Campo label="Nome" obrigatorio>
            <Entrada value={donoNome} onChange={(e) => setDonoNome(e.target.value)} placeholder="Nome de quem vai usar" required />
          </Campo>
          <Campo label="Usuário (login)" obrigatorio dica="Só letras, números, ponto, traço e underline.">
            <Entrada
              value={donoUsuario}
              onChange={(e) => setDonoUsuario(e.target.value)}
              autoCapitalize="none"
              autoCorrect="off"
              placeholder="ex.: dona"
              required
            />
          </Campo>
          <Campo label="Senha" obrigatorio>
            <div className="relative">
              <Entrada
                type={mostrarSenha ? 'text' : 'password'}
                value={donoSenha}
                onChange={(e) => setDonoSenha(e.target.value)}
                placeholder="••••••"
                className="pr-11"
                required
              />
              <button
                type="button"
                onClick={() => setMostrarSenha((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                title={mostrarSenha ? 'Esconder senha' : 'Mostrar senha'}
              >
                {mostrarSenha ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </Campo>
          <Campo label="Repita a senha" obrigatorio>
            <Entrada
              type={mostrarSenha ? 'text' : 'password'}
              value={donoRepetir}
              onChange={(e) => setDonoRepetir(e.target.value)}
              placeholder="••••••"
              required
            />
          </Campo>
          <div className="flex justify-end gap-2 pt-1">
            <Botao type="button" variante="secundario" onClick={() => setCriandoDono(false)}>
              Cancelar
            </Botao>
            <Botao type="submit" icone={ShieldCheck} carregando={salvando}>
              Criar acesso
            </Botao>
          </div>
        </form>
      </Modal>

      <Modal
        aberto={Boolean(senhaDe)}
        onFechar={() => setSenhaDe(null)}
        icone={KeyRound}
        titulo={`Redefinir a senha de ${senhaDe?.nome ?? ''}`}
        subtitulo="A pessoa passa a entrar com a senha nova na hora."
      >
        <form onSubmit={salvarNovaSenha} className="space-y-3">
          <Campo label="Nova senha" obrigatorio>
            <Entrada
              type={mostrarSenha ? 'text' : 'password'}
              value={senhaNova}
              onChange={(e) => setSenhaNova(e.target.value)}
              placeholder="••••••"
              required
            />
          </Campo>
          <Campo label="Repita a nova senha" obrigatorio>
            <Entrada
              type={mostrarSenha ? 'text' : 'password'}
              value={senhaRepetida}
              onChange={(e) => setSenhaRepetida(e.target.value)}
              placeholder="••••••"
              required
            />
          </Campo>
          <label className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
            <input
              type="checkbox"
              checked={mostrarSenha}
              onChange={(e) => setMostrarSenha(e.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-purple-600 focus:ring-purple-500 dark:border-slate-600"
            />
            Mostrar as senhas
          </label>
          <div className="flex justify-end gap-2 pt-1">
            <Botao type="button" variante="secundario" onClick={() => setSenhaDe(null)}>
              Cancelar
            </Botao>
            <Botao type="submit" icone={KeyRound} carregando={salvando}>
              Salvar nova senha
            </Botao>
          </div>
        </form>
      </Modal>

      <Modal
        aberto={Boolean(renomeando)}
        onFechar={() => setRenomeando(null)}
        icone={Pencil}
        titulo="Renomear funcionário"
        subtitulo="O nome muda nos pedidos, no relatório e na lista de escolha."
      >
        <form
          onSubmit={(e) => {
            e.preventDefault()
            void salvarRenomeado()
          }}
          className="space-y-3"
        >
          <Campo label="Nome" obrigatorio>
            <Entrada value={nomeEditado} onChange={(e) => setNomeEditado(e.target.value)} required autoFocus />
          </Campo>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {numeroBR(funcionarios.find((f) => f.vendedor.id === renomeando?.id)?.total ?? 0, 0)} pedido(s) no
            histórico continuam ligados a este nome.
          </p>
          <div className="flex justify-end gap-2 pt-1">
            <Botao type="button" variante="secundario" onClick={() => setRenomeando(null)}>
              Cancelar
            </Botao>
            <Botao type="submit" icone={Pencil} carregando={salvandoNome}>
              Salvar nome
            </Botao>
          </div>
        </form>
      </Modal>

      {dialog}
    </>
  )
}
