import { ArrowLeft, Crown, Eye, EyeOff, KeyRound, Lock, LogIn, ShieldCheck, Sparkles } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Logo } from '../components/Logo'
import { Botao, Campo, Entrada, cn } from '../components/ui'
import { useAuth } from '../lib/auth'

/**
 * Porta administrativa — o único lugar do site onde existe a criação do
 * acesso do proprietário. O login do dia a dia é feito aqui também.
 *
 * Para chegar: #/administracao, 5 toques no logo ou Ctrl + Alt + D.
 * Sem a senha do administrador, ninguém entra em nada: quem descobrir a porta
 * vê apenas um login comum.
 */
export default function Administracao() {
  const { usuario, ehProprietario, temProprietario, entrar, criarContaProprietario, sair, nuvem, carregando } = useAuth()
  const navegar = useNavigate()

  const criando = !temProprietario
  const [nome, setNome] = useState('')
  const [login, setLogin] = useState('')
  const [senha, setSenha] = useState('')
  const [repetir, setRepetir] = useState('')
  const [mostrar, setMostrar] = useState(false)
  const [manter, setManter] = useState(true)
  const [erro, setErro] = useState('')
  const [enviando, setEnviando] = useState(false)

  // já conectado: o dono vai para o painel; o vendedor é desconectado
  useEffect(() => {
    if (carregando || !usuario) return
    if (ehProprietario) {
      navegar('/', { replace: true })
    } else {
      void sair()
      setErro('Esta entrada é exclusiva do proprietário. Use a tela comum para entrar como vendedor.')
    }
  }, [carregando, ehProprietario, navegar, sair, usuario])

  const enviar = async (e: React.FormEvent) => {
    e.preventDefault()
    setErro('')
    setEnviando(true)
    try {
      if (criando) {
        if (senha !== repetir) throw new Error('As duas senhas precisam ser iguais.')
        await criarContaProprietario({ nome, usuario: login, senha })
      } else {
        await entrar(login, senha, manter)
      }
    } catch (err) {
      setErro((err as Error).message)
    } finally {
      setEnviando(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-100 via-white to-violet-50 p-4 dark:from-slate-950 dark:via-slate-950 dark:to-violet-950/40">
      <div className="pointer-events-none absolute inset-0 overflow-hidden opacity-60 dark:opacity-20">
        <div className="absolute -left-24 -top-24 h-72 w-72 rounded-full bg-gradient-to-br from-violet-300/50 to-indigo-300/40 blur-3xl" />
        <div className="absolute -right-20 bottom-0 h-80 w-80 rounded-full bg-gradient-to-br from-pink-300/40 to-purple-300/40 blur-3xl" />
      </div>

      <div className="relative w-full max-w-md">
        <div className="mb-5 flex flex-col items-center text-center">
          <Logo />
          <p className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-violet-200 bg-violet-50 px-3 py-1 text-[11px] font-bold text-violet-700 dark:border-violet-900 dark:bg-violet-950/50 dark:text-violet-300">
            <Lock className="h-3 w-3" /> Acesso restrito ao proprietário
          </p>
        </div>

        <form
          onSubmit={enviar}
          className="rounded-3xl border border-slate-100 bg-white/95 p-6 shadow-hover backdrop-blur dark:border-slate-800 dark:bg-slate-900/95"
        >
          <div className="mb-5">
            <h1 className="flex items-center gap-2 text-xl font-extrabold text-slate-800 dark:text-slate-100">
              <Crown className="h-5 w-5 text-violet-600 dark:text-violet-400" />
              {criando ? 'Criar acesso do proprietário' : 'Administração'}
            </h1>
            <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
              {criando
                ? 'Primeiro acesso do dono do sistema. Depois disso, esta tela só pede usuário e senha.'
                : 'Entre com o seu acesso de proprietário.'}
            </p>
          </div>

          {criando ? (
            <Campo label="Seu nome" obrigatorio className="mb-3">
              <Entrada value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex.: ALTUNE" required autoFocus />
            </Campo>
          ) : null}

          <Campo label="Usuário" obrigatorio className="mb-3" dica={criando ? 'Só letras, números, ponto, traço e underline.' : undefined}>
            <Entrada
              value={login}
              onChange={(e) => setLogin(e.target.value)}
              placeholder="ex.: altoprints"
              autoCapitalize="none"
              autoCorrect="off"
              required
              autoFocus={!criando}
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

          {criando ? (
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

          <Botao type="submit" tamanho="lg" className="w-full" icone={criando ? ShieldCheck : LogIn} carregando={enviando}>
            {criando ? 'Criar acesso do proprietário' : 'Entrar como administrador'}
          </Botao>

          <p className="mt-4 text-center">
            <Link
              to="/login"
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-500 hover:text-purple-700 hover:underline dark:text-slate-400 dark:hover:text-purple-300"
            >
              <ArrowLeft className="h-3.5 w-3.5" /> Voltar para o login comum
            </Link>
          </p>
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
            {nuvem ? 'Banco na nuvem (Supabase) conectado' : 'Modo local: os dados ficam neste navegador'}
          </p>
          <p className="flex items-center justify-center gap-1.5 text-[11px] text-slate-400 dark:text-slate-500">
            <Sparkles className="h-3 w-3" /> Dica: salve este endereço na tela de início do celular para entrar com 1
            toque.
          </p>
        </div>
      </div>
    </div>
  )
}
