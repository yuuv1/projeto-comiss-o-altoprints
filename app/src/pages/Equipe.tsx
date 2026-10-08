import { Crown, KeyRound, Pencil, ShieldCheck, ShieldOff, Trash2, UserPlus, Users } from 'lucide-react'
import { useState } from 'react'
import { useStore } from '../lib/store'
import { useAuth } from '../lib/auth'
import { dataBR, moeda } from '../lib/format'
import { calcularComissao } from '../lib/comissao'
import { FAIXAS_PADRAO, LABEL_PAPEL, type Usuario } from '../lib/types'
import {
  Botao,
  Campo,
  CartaoResumo,
  Entrada,
  Etiqueta,
  Modal,
  Selecao,
  TituloPagina,
  Vazio,
  useConfirmacao,
} from '../components/ui'

export default function Equipe() {
  const { db, avisar } = useStore()
  const { usuario: eu, redefinirSenha, atualizarVinculo, alternarAtivo, excluirUsuario } = useAuth()
  const { confirmar, dialog } = useConfirmacao()
  const faixas = db.configuracoes.faixas_comissao?.length ? db.configuracoes.faixas_comissao : FAIXAS_PADRAO
  const semMetragem = db.configuracoes.comissao_sem_metragem ?? 0

  const [editando, setEditando] = useState<Usuario | null>(null)
  const [vendedorId, setVendedorId] = useState('')
  const [novaSenha, setNovaSenha] = useState('')
  const [salvando, setSalvando] = useState(false)

  const abrirEdicao = (u: Usuario) => {
    setEditando(u)
    setVendedorId(u.vendedor_id || '')
    setNovaSenha('')
  }

  const salvarVinculo = async () => {
    if (!editando) return
    setSalvando(true)
    try {
      await atualizarVinculo(editando.id, vendedorId)
      setEditando(null)
    } finally {
      setSalvando(false)
    }
  }

  const salvarNovaSenha = async () => {
    if (!editando) return
    setSalvando(true)
    try {
      await redefinirSenha(editando.id, novaSenha)
      setNovaSenha('')
      setEditando(null)
    } catch (e) {
      avisar((e as Error).message, 'erro')
    } finally {
      setSalvando(false)
    }
  }

  const contas = [...db.usuarios].sort((a, b) => a.papel.localeCompare(b.papel) || a.nome.localeCompare(b.nome))
  const vendedores = contas.filter((c) => c.papel === 'vendedor')

  return (
    <>
      <TituloPagina
        icone={Users}
        titulo="Equipe"
        subtitulo="Contas de acesso, vínculo com o vendedor, senhas e liberação."
      />

      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <CartaoResumo titulo="Contas" valor={contas.length} icone={Users} gradiente="from-pink-500 to-purple-600" />
        <CartaoResumo
          titulo="Vendedores com acesso"
          valor={vendedores.filter((v) => v.ativo).length}
          icone={ShieldCheck}
          gradiente="from-emerald-500 to-green-600"
        />
        <CartaoResumo
          titulo="Desativados"
          valor={contas.filter((c) => !c.ativo).length}
          icone={ShieldOff}
          gradiente="from-amber-500 to-orange-600"
        />
        <CartaoResumo
          titulo="Proprietários"
          valor={contas.filter((c) => c.papel === 'proprietario').length}
          icone={Crown}
          gradiente="from-violet-500 to-indigo-600"
        />
      </div>

      {contas.length === 0 ? (
        <Vazio icone={UserPlus} titulo="Nenhuma conta criada ainda" descricao="As contas são criadas na tela de login." />
      ) : (
        <div className="space-y-3">
          {contas.map((c) => {
            const pedidos = db.pedidos.filter((p) => p.vendedor_id === c.vendedor_id)
            const pagos = pedidos.filter((p) => p.status_pagamento === 'pago')
            const comissao = calcularComissao(pagos, faixas, semMetragem)
            const vendedor = db.vendedores.find((v) => v.id === c.vendedor_id)
            return (
              <div
                key={c.id}
                className="flex flex-wrap items-center gap-3 rounded-2xl border border-slate-100 bg-white p-4 shadow-soft transition-all hover:-translate-y-0.5 hover:shadow-hover dark:border-slate-800 dark:bg-slate-900"
              >
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-pink-500 via-purple-600 to-indigo-600 text-sm font-black text-white">
                  {c.nome.slice(0, 2).toUpperCase()}
                </div>
                <div className="min-w-[190px] flex-1">
                  <p className="flex flex-wrap items-center gap-2 text-base font-extrabold text-slate-800 dark:text-slate-100">
                    {c.nome}
                    {c.papel === 'proprietario' ? (
                      <Etiqueta className="border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-900 dark:bg-violet-950/50 dark:text-violet-300" icone={Crown}>
                        Proprietário
                      </Etiqueta>
                    ) : (
                      <Etiqueta className="border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-900 dark:bg-sky-950/50 dark:text-sky-300">
                        Vendedor
                      </Etiqueta>
                    )}
                    {!c.ativo ? (
                      <Etiqueta className="border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900 dark:bg-rose-950/50 dark:text-rose-300">
                        Desativado
                      </Etiqueta>
                    ) : null}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    usuário: <b>{c.usuario}</b> • desde {dataBR(c.criado_em)}
                    {c.papel === 'vendedor' ? ` • vendedor: ${vendedor?.nome ?? 'sem vínculo'}` : ''}
                  </p>
                </div>

                {c.papel === 'vendedor' ? (
                  <div className="text-right text-xs">
                    <p className="font-bold text-emerald-600 dark:text-emerald-400">{moeda(comissao.total)} de comissão</p>
                    <p className="text-slate-400 dark:text-slate-500">
                      {pagos.length} pagos • {pedidos.length} pedidos
                    </p>
                  </div>
                ) : null}

                <div className="flex flex-wrap gap-1.5">
                  <Botao tamanho="sm" variante="secundario" icone={Pencil} onClick={() => abrirEdicao(c)}>
                    Vínculo e senha
                  </Botao>
                  {c.id !== eu?.id ? (
                    <>
                      <Botao
                        tamanho="sm"
                        variante={c.ativo ? 'ghost' : 'sucesso'}
                        icone={c.ativo ? ShieldOff : ShieldCheck}
                        onClick={async () => {
                          try {
                            await alternarAtivo(c.id, !c.ativo)
                          } catch (e) {
                            avisar((e as Error).message, 'erro')
                          }
                        }}
                      >
                        {c.ativo ? 'Desativar' : 'Liberar'}
                      </Botao>
                      {c.papel !== 'proprietario' ? (
                        <Botao
                          tamanho="sm"
                          variante="ghost"
                          className="text-rose-500 hover:bg-rose-50"
                          icone={Trash2}
                          onClick={async () => {
                            const ok = await confirmar({
                              titulo: `Excluir o acesso de ${c.nome}?`,
                              mensagem:
                                'Os pedidos dele continuam salvos no sistema — só o acesso é apagado. Se ele saiu da empresa, prefira “Desativar”.',
                            })
                            if (ok) {
                              try {
                                await excluirUsuario(c.id)
                              } catch (e) {
                                avisar((e as Error).message, 'erro')
                              }
                            }
                          }}
                        >
                          Excluir
                        </Botao>
                      ) : null}
                    </>
                  ) : (
                    <Etiqueta className="border-slate-200 bg-slate-50 text-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
                      é você
                    </Etiqueta>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      <p className="mt-5 rounded-2xl border border-sky-200 bg-sky-50 p-4 text-xs text-sky-800 dark:border-sky-900 dark:bg-sky-950/40 dark:text-sky-200">
        <b>Como cada acesso funciona:</b> o vendedor entra e vê apenas os pedidos dele (e a comissão dele). O
        proprietário vê tudo. Aqui você pode trocar a senha de quem esqueceu, desativar quem saiu e ligar cada acesso
        ao vendedor correspondente — é esse vínculo que define quais pedidos aparecem para cada pessoa.
      </p>

      <Modal
        aberto={Boolean(editando)}
        onFechar={() => setEditando(null)}
        icone={KeyRound}
        largura="max-w-lg"
        titulo={`Acesso de ${editando?.nome ?? ''}`}
        subtitulo="Vínculo com o vendedor e redefinição de senha."
        rodape={
          <>
            <Botao variante="secundario" onClick={() => setEditando(null)}>
              Fechar
            </Botao>
            <Botao icone={Pencil} onClick={salvarVinculo} carregando={salvando}>
              Salvar vínculo
            </Botao>
          </>
        }
      >
        <div className="space-y-4">
          <Campo
            label="Vendedor vinculado"
            dica="Define quais pedidos e comissões esta pessoa enxerga."
          >
            <Selecao value={vendedorId} onChange={(e) => setVendedorId(e.target.value)}>
              <option value="">Sem vínculo (não vê pedidos)</option>
              {db.vendedores.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.nome}
                </option>
              ))}
            </Selecao>
          </Campo>

          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-900 dark:bg-amber-950/40">
            <p className="mb-2 flex items-center gap-2 text-sm font-bold text-amber-900 dark:text-amber-200">
              <KeyRound className="h-4 w-4" /> Redefinir a senha
            </p>
            <p className="mb-3 text-xs text-amber-800 dark:text-amber-300">
              Use quando a pessoa esquecer a senha. Combine a nova senha com ela e oriente a trocar depois em "Meu
              perfil".
            </p>
            <div className="flex flex-wrap items-end gap-2">
              <Campo label="Nova senha" className="w-48">
                <Entrada value={novaSenha} onChange={(e) => setNovaSenha(e.target.value)} placeholder="mínimo 4 caracteres" />
              </Campo>
              <Botao variante="aviso" icone={KeyRound} onClick={salvarNovaSenha} carregando={salvando} disabled={novaSenha.length < 4}>
                Redefinir senha
              </Botao>
            </div>
          </div>

          <p className="text-xs text-slate-500 dark:text-slate-400">
            Papel: <b>{editando ? LABEL_PAPEL[editando.papel] : ''}</b> • criado em{' '}
            {editando ? dataBR(editando.criado_em) : ''}
          </p>
        </div>
      </Modal>
      {dialog}
    </>
  )
}
