import { KeyRound, LogOut, UserCog } from 'lucide-react'
import { useState } from 'react'
import { useAuth } from '../lib/auth'
import { useStore } from '../lib/store'
import { Botao, Campo, Entrada, Etiqueta, Modal } from './ui'

/** Meu perfil: nome, troca da própria senha e sair do sistema */
export function PerfilDialog({ aberto, onFechar }: { aberto: boolean; onFechar: () => void }) {
  const { usuario, trocarMinhaSenha, atualizarMeuPerfil, sair, nuvem } = useAuth()
  const { avisar } = useStore()

  const [nome, setNome] = useState(usuario?.nome ?? '')
  const [atual, setAtual] = useState('')
  const [nova, setNova] = useState('')
  const [repetir, setRepetir] = useState('')
  const [salvando, setSalvando] = useState(false)

  const trocarSenha = async () => {
    if (nova !== repetir) return avisar('As duas senhas novas precisam ser iguais.', 'erro')
    setSalvando(true)
    try {
      await trocarMinhaSenha(atual, nova)
      setAtual('')
      setNova('')
      setRepetir('')
    } catch (e) {
      avisar((e as Error).message, 'erro')
    } finally {
      setSalvando(false)
    }
  }

  return (
    <Modal
      aberto={aberto}
      onFechar={onFechar}
      icone={UserCog}
      largura="max-w-lg"
      titulo="Meu perfil"
      subtitulo="Seu acesso de proprietário."
      rodape={
        <>
          <Botao
            variante="secundario"
            icone={LogOut}
            onClick={async () => {
              onFechar()
              await sair()
            }}
          >
            Sair do modo proprietário
          </Botao>
          <Botao
            icone={UserCog}
            carregando={salvando}
            onClick={async () => {
              setSalvando(true)
              try {
                await atualizarMeuPerfil({ nome })
              } finally {
                setSalvando(false)
              }
            }}
          >
            Salvar nome
          </Botao>
        </>
      }
    >
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <Etiqueta className="border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-900 dark:bg-violet-950/50 dark:text-violet-300">
            Proprietário
          </Etiqueta>
          <span className="text-xs text-slate-500 dark:text-slate-400">
            usuário: <b>{usuario?.usuario}</b>
          </span>
        </div>

        <Campo label="Meu nome">
          <Entrada value={nome} onChange={(e) => setNome(e.target.value)} />
        </Campo>

        <div className="rounded-xl border border-slate-100 p-4 dark:border-slate-800">
          <p className="mb-1 flex items-center gap-2 text-sm font-bold text-slate-700 dark:text-slate-200">
            <KeyRound className="h-4 w-4 text-purple-600 dark:text-purple-400" />{' '}
            Trocar minha senha
          </p>
          <div className="grid gap-3 sm:grid-cols-3">
            <Campo label="Senha atual">
              <Entrada type="password" value={atual} onChange={(e) => setAtual(e.target.value)} placeholder="••••••" />
            </Campo>
            <Campo label="Nova senha">
              <Entrada type="password" value={nova} onChange={(e) => setNova(e.target.value)} placeholder="••••••" />
            </Campo>
            <Campo label="Repita a nova">
              <Entrada type="password" value={repetir} onChange={(e) => setRepetir(e.target.value)} placeholder="••••••" />
            </Campo>
          </div>
          <Botao
            className="mt-3"
            icone={KeyRound}
            onClick={trocarSenha}
            carregando={salvando}
            disabled={!atual || nova.length < 4}
          >
            Trocar senha
          </Botao>
          <p className="mt-2 text-[11px] text-slate-400 dark:text-slate-500">
            {nuvem
              ? 'A senha é validada e guardada pelo Supabase (seguro).'
              : 'A senha fica guardada somente como hash neste sistema. Esqueceu? O proprietário redefine.'}
          </p>
        </div>
      </div>
    </Modal>
  )
}
