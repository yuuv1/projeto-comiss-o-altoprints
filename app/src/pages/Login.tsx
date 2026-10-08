import { ArrowRight, Eye, EyeOff, KeyRound, LogIn, ShieldCheck, Sparkles, UserPlus } from 'lucide-react'
import { useState } from 'react'
import { Navigate } from 'react-router-dom'
import { Logo } from '../components/Logo'
import { Botao, Campo, Entrada, Selecao, cn } from '../components/ui'
import { normalizarUsuario, useAuth } from '../lib/auth'
import { useStore } from '../lib/store'

type Tela = 'entrar' | 'criar-proprietario' | 'criar-vendedor'

export default function Login() {
  const { usuario, entrar, criarContaProprietario, criarContaVendedor, temProprietario, nuvem } = useAuth()
  const { db } = useStore()

  const [tela, setTela] = useState<Tela>(temProprietario ? 'entrar' : 'criar-proprietario')
  const [login, setLogin] = useState('')
  const [senha, setSenha] = useState('')
  const [mostrar, setMostrar] = useState(false)
  const [manter, setManter] = useState(true)
  const [nome, setNome] = useState('')
  const [repetir, setRepetir] = useState('')
  const [vendedorId, setVendedorId] = useState('')
  const [erro, setErro] = useState('')
  const [enviando, setEnviando] = useState(false)

  const enviar = async (e: React.FormEvent) => {
    e.preventDefault()
    setErro('')
    setEnviando(true)
    try {
      if (tela === 'entrar') {
        await entrar(login, senha, manter)
      } else if (tela === 'criar-proprietario') {
        if (senha !== repetir) throw new Error('As duas senhas precisam ser iguais.')
        await criarContaProprietario({ nome, usuario: login, senha })
      } else {
        if (senha !== repetir) throw new Error('As duas senhas precisam ser iguais.')
        await criarContaVendedor({ nome, usuario: login, senha, vendedorId })
      }
    } catch (err) {
      setErro((err as Error).message)
    } finally {
      setEnviando(false)
    }
  }

  // quem já está conectado não precisa ver a tela de login
  const jaConectado = Boolean(usuario)

  const trocarTela = (nova: Tela) => {
    setTela(nova)
    setErro('')
    setSenha('')
    setRepetir('')
  }

  const titulo =
    tela === 'entrar'
      ? 'Entrar no sistema'
      : tela === 'criar-proprietario'
        ? 'Criar a conta do proprietário'
        : 'Criar meu acesso'

  const subtitulo =
    tela === 'entrar'
      ? 'Use o seu usuário e senha.'
      : tela === 'criar-proprietario'
        ? 'Esta conta é do dono do sistema: ela vê tudo — pedidos, comissões, equipe e relatórios.'
        : 'Preencha os dados e comece a lançar seus pedidos agora mesmo.'

  if (jaConectado) return <Navigate to="/" replace />

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-fuchsia-50 via-slate-50 to-sky-50 p-4 dark:from-slate-950 dark:via-slate-950 dark:to-slate-900">
      <div className="pointer-events-none absolute inset-0 overflow-hidden opacity-70 dark:opacity-20">
        <div className="absolute -left-24 -top-24 h-72 w-72 rounded-full bg-gradient-to-br from-pink-300/50 to-purple-300/40 blur-3xl" />
        <div className="absolute -right-20 bottom-0 h-80 w-80 rounded-full bg-gradient-to-br from-sky-300/50 to-emerald-200/40 blur-3xl" />
      </div>

      <div className="relative w-full max-w-md">
        <div className="mb-5 flex flex-col items-center text-center">
          <Logo />
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
            Sistema de pedidos DTF — acesse com o seu usuário
          </p>
        </div>

        <form
          onSubmit={enviar}
          className="rounded-3xl border border-slate-100 bg-white/95 p-6 shadow-hover backdrop-blur dark:border-slate-800 dark:bg-slate-900/95"
        >
          <div className="mb-5">
            <h1 className="text-xl font-extrabold text-slate-800 dark:text-slate-100">{titulo}</h1>
            <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">{subtitulo}</p>
          </div>

          {tela !== 'entrar' ? (
            <Campo label="Seu nome" obrigatorio className="mb-3">
              <Entrada
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder="Ex.: JESSICA"
                required
                autoFocus
              />
            </Campo>
          ) : null}

          {tela === 'criar-vendedor' ? (
            <Campo
              label="Vendedor correspondente"
              dica="Serve para os seus pedidos e a sua comissão aparecerem certos."
              className="mb-3"
            >
              <Selecao value={vendedorId} onChange={(e) => setVendedorId(e.target.value)}>
                <option value="">Criar um novo com o meu nome</option>
                {db.vendedores.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.nome}
                  </option>
                ))}
              </Selecao>
            </Campo>
          ) : null}

          <Campo label="Usuário" obrigatorio className="mb-3" dica="Só letras, números, ponto, traço e underline.">
            <Entrada
              value={login}
              onChange={(e) => setLogin(e.target.value)}
              placeholder="ex.: jessica"
              autoCapitalize="none"
              autoCorrect="off"
              required
              autoFocus={tela === 'entrar'}
            />
          </Campo>

          <Campo label="Senha" obrigatorio className="mb-3">
            <div className="relative">
              <Entrada
                type={mostrar ? 'text' : 'password'}
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                placeholder="••••••"
                className="pr-11"
                required
              />
              <button
                type="button"
                onClick={() => setMostrar((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 transition hover:text-slate-600 dark:hover:text-slate-200"
                title={mostrar ? 'Esconder senha' : 'Mostrar senha'}
              >
                {mostrar ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </Campo>

          {tela !== 'entrar' ? (
            <Campo label="Repita a senha" obrigatorio className="mb-3">
              <Entrada
                type={mostrar ? 'text' : 'password'}
                value={repetir}
                onChange={(e) => setRepetir(e.target.value)}
                placeholder="••••••"
                required
              />
            </Campo>
          ) : (
            <label className="mb-3 flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
              <input
                type="checkbox"
                checked={manter}
                onChange={(e) => setManter(e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-purple-600 focus:ring-purple-500 dark:border-slate-600"
              />
              Manter conectado neste aparelho
            </label>
          )}

          {erro ? (
            <p className="mb-3 rounded-xl border border-rose-200 bg-rose-50 p-2.5 text-sm font-semibold text-rose-700 dark:border-rose-900 dark:bg-rose-950/50 dark:text-rose-300">
              {erro}
            </p>
          ) : null}

          <Botao
            type="submit"
            tamanho="lg"
            className="w-full"
            icone={tela === 'entrar' ? LogIn : UserPlus}
            carregando={enviando}
          >
            {tela === 'entrar' ? 'Entrar' : tela === 'criar-proprietario' ? 'Criar conta do proprietário' : 'Criar meu acesso'}
            <ArrowRight className="h-4 w-4" />
          </Botao>

          <div className="mt-4 space-y-2 text-center text-sm">
            {tela === 'entrar' ? (
              <button
                type="button"
                onClick={() => trocarTela(temProprietario ? 'criar-vendedor' : 'criar-proprietario')}
                className="font-semibold text-purple-700 hover:underline dark:text-purple-300"
              >
                Sou funcionário — criar meu acesso
              </button>
            ) : (
              <button
                type="button"
                onClick={() => trocarTela('entrar')}
                className="font-semibold text-purple-700 hover:underline dark:text-purple-300"
              >
                Já tenho acesso — entrar
              </button>
            )}
          </div>
        </form>

        <div className="mt-4 space-y-2 text-center">
          <p
            className={cn(
              'inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[11px] font-semibold',
              nuvem
                ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300'
                : 'border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200',
            )}
          >
            {nuvem ? <ShieldCheck className="h-3.5 w-3.5" /> : <KeyRound className="h-3.5 w-3.5" />}
            {nuvem
              ? 'Contas validadas no Supabase (seguro)'
              : 'Modo local: as contas ficam neste navegador. Configure o Supabase para usar em vários aparelhos.'}
          </p>
          <p className="flex items-center justify-center gap-1.5 text-[11px] text-slate-400 dark:text-slate-500">
            <Sparkles className="h-3 w-3" /> Esqueceu a senha? O proprietário redefine no painel dele.
          </p>
        </div>
      </div>
    </div>
  )
}
