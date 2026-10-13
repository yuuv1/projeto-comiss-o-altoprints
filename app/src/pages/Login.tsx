import {
  AlertTriangle,
  ArrowRight,
  Eye,
  EyeOff,
  KeyRound,
  Link2,
  LogIn,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  TriangleAlert,
  UserPlus,
  Users,
} from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { Logo } from '../components/Logo'
import { filasDaComissao } from '../lib/types'
import { JanelaConexao } from '../components/Nuvem'
import { Botao, Campo, Entrada, Etiqueta, Selecao, cn } from '../components/ui'
import { ROTA_ADMIN, useCincoToquesNoLogo } from '../lib/admin'
import type { DiagnosticoArmazenamento } from '../lib/armazenamento'
import { normalizarUsuario, useAuth } from '../lib/auth'
import { moeda } from '../lib/format'
import { useStore } from '../lib/store'
import { VERSAO } from '../lib/versao'

type Tela = 'entrar' | 'criar'

/** tela comum de entrada: só vendedores. Nada aqui fala do proprietário. */
export default function Login() {
  const { usuario, entrar, criarContaVendedor, nuvem } = useAuth()
  const { db, medirEspaco, liberarEspaco, comecarLimpoNesteAparelho } = useStore()
  const navegar = useNavigate()

  const [tela, setTela] = useState<Tela>('entrar')
  const [login, setLogin] = useState('')
  const [senha, setSenha] = useState('')
  const [mostrar, setMostrar] = useState(false)
  const [manter, setManter] = useState(true)
  const [nome, setNome] = useState('')
  const [repetir, setRepetir] = useState('')
  const [vendedorId, setVendedorId] = useState('')
  const [erro, setErro] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [conexaoAberta, setConexaoAberta] = useState(false)
  const [armazenamento, setArmazenamento] = useState<DiagnosticoArmazenamento | null>(null)

  // confere se o navegador está deixando salvar os dados (anônima / sem espaço)
  useEffect(() => {
    void medirEspaco().then(setArmazenamento)
  }, [medirEspaco])

  const semArmazenamento = Boolean(armazenamento && !armazenamento.localOk && !armazenamento.idbOk)

  // o logo esconde a porta do proprietário: 5 toques seguidos
  const tocarNoLogo = useCincoToquesNoLogo(() => navegar(ROTA_ADMIN))

  /** nomes de vendedores que ainda não têm acesso — para a pessoa "assumir" o dela */
  const disponiveis = useMemo(
    () =>
      db.vendedores
        .filter((v) => !db.usuarios.some((u) => u.vendedor_id === v.id))
        .map((v) => {
          const pedidos = db.pedidos.filter((p) => p.vendedor_id === v.id)
          const pagos = filasDaComissao(pedidos)
          return {
            id: v.id,
            nome: v.nome,
            pedidos: pedidos.length,
            faturamento: pagos.reduce((s, p) => s + Number(p.valor || 0), 0),
          }
        })
        .sort((a, b) => b.pedidos - a.pedidos),
    [db.pedidos, db.usuarios, db.vendedores],
  )

  const escolhido = disponiveis.find((v) => v.id === vendedorId)

  const enviar = async (e: React.FormEvent) => {
    e.preventDefault()
    setErro('')
    setEnviando(true)
    try {
      if (tela === 'entrar') {
        await entrar(login, senha, manter)
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

  const trocarTela = (nova: Tela) => {
    setTela(nova)
    setErro('')
    setSenha('')
    setRepetir('')
  }

  // quem já está conectado não precisa ver a tela de login
  if (usuario) return <Navigate to="/" replace />

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-fuchsia-50 via-slate-50 to-sky-50 p-4 dark:from-slate-950 dark:via-slate-950 dark:to-slate-900">
      <div className="pointer-events-none absolute inset-0 overflow-hidden opacity-70 dark:opacity-20">
        <div className="absolute -left-24 -top-24 h-72 w-72 rounded-full bg-gradient-to-br from-pink-300/50 to-purple-300/40 blur-3xl" />
        <div className="absolute -right-20 bottom-0 h-80 w-80 rounded-full bg-gradient-to-br from-sky-300/50 to-emerald-200/40 blur-3xl" />
      </div>

      <div className="relative w-full max-w-md">
        <div className="mb-3 flex flex-col items-center text-center">
          <button type="button" onClick={tocarNoLogo} className="cursor-default" title="Altoprints">
            <Logo />
          </button>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
            Sistema de pedidos DTF — acesse com o seu usuário
          </p>
        </div>

        <form
          onSubmit={enviar}
          className="rounded-3xl border border-slate-100 bg-white/95 p-5 shadow-hover backdrop-blur dark:border-slate-800 dark:bg-slate-900/95"
        >
          <div className="mb-3">
            <h1 className="text-xl font-extrabold text-slate-800 dark:text-slate-100">
              {tela === 'entrar' ? 'Entrar no sistema' : 'Criar meu acesso'}
            </h1>
            <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
              {tela === 'entrar'
                ? 'Use o seu usuário e senha.'
                : 'Escolha um usuário, invente a sua senha e comece a lançar seus pedidos agora mesmo.'}
            </p>
          </div>

          {tela === 'criar' ? (
            <>
              <Campo label="Seu nome" obrigatorio className="mb-3">
                <Entrada value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Seu nome completo" required autoFocus />
              </Campo>

              <Campo
                label="Já trabalho aqui?"
                dica="Escolha o seu nome para continuar vendo os seus pedidos. Se você é novo na equipe, deixe em “sou novo aqui”."
                className="mb-3"
              >
                <Selecao value={vendedorId} onChange={(e) => setVendedorId(e.target.value)}>
                  <option value="">Sou novo aqui — criar com o meu nome</option>
                  {disponiveis.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.nome} · {v.pedidos} {v.pedidos === 1 ? 'pedido' : 'pedidos'}
                    </option>
                  ))}
                </Selecao>
              </Campo>

              {escolhido ? (
                <div className="mb-3 flex flex-wrap items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200">
                  <Etiqueta className="border-emerald-200 bg-white text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-300" icone={Users}>
                    {escolhido.nome}
                  </Etiqueta>
                  <span>
                    Você vai continuar de onde parou: <b>{escolhido.pedidos}</b> pedido(s) e{' '}
                    <b>{moeda(escolhido.faturamento)}</b> nas filas concluídas.
                  </span>
                </div>
              ) : (
                <p className="mb-3 rounded-xl border border-slate-100 bg-slate-50 p-3 text-xs text-slate-500 dark:border-slate-800 dark:bg-slate-800/60 dark:text-slate-400">
                  Nenhum nome escolhido: vamos criar um cadastro novo com o seu nome.
                </p>
              )}
            </>
          ) : null}

          <Campo label="Usuário" obrigatorio className="mb-3" dica="Só letras, números, ponto, traço e underline.">
            <Entrada
              value={login}
              onChange={(e) => setLogin(e.target.value)}
              placeholder="Digite seu usuário"
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

          {tela === 'criar' ? (
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
            {tela === 'entrar' ? 'Entrar' : 'Criar meu acesso'}
            <ArrowRight className="h-4 w-4" />
          </Botao>

          <div className="mt-4 space-y-2 text-center text-sm">
            {tela === 'entrar' ? (
              <button
                type="button"
                onClick={() => trocarTela('criar')}
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

        {semArmazenamento ? (
          <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-left text-xs text-rose-900 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-100">
            <p className="mb-1 flex items-center gap-2 text-sm font-bold">
              <TriangleAlert className="h-4 w-4" /> Este navegador não está deixando salvar os dados
            </p>
            <p className="mb-2">
              É por isso que aparece um erro ao entrar e nada fica guardado. Isso costuma acontecer em{' '}
              <b>janela anônima/privada</b> ou com o armazenamento bloqueado pelo navegador. Abra o sistema numa{' '}
              <b>janela normal</b> para tudo funcionar.
            </p>
            <div className="flex flex-wrap gap-2">
              <Botao
                tamanho="sm"
                variante="secundario"
                icone={RefreshCw}
                onClick={async () => setArmazenamento(await medirEspaco())}
              >
                Testar de novo
              </Botao>
            </div>
          </div>
        ) : armazenamento?.onde === 'localStorage' && armazenamento.bytesLocal > 3_500_000 ? (
          <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-left text-xs text-amber-900 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-100">
            <p className="mb-1 flex items-center gap-2 text-sm font-bold">
              <AlertTriangle className="h-4 w-4" /> O armazenamento deste navegador está quase cheio
            </p>
            <p className="mb-2">
              Os dados deste aparelho ocupam quase todo o espaço reservado pelo navegador. Clique em{' '}
              <b>Liberar espaço</b>: os pedidos são movidos para o armazenamento novo e continuam aí.
            </p>
            <div className="flex flex-wrap gap-2">
              <Botao
                tamanho="sm"
                icone={RefreshCw}
                onClick={async () => {
                  await liberarEspaco()
                  setArmazenamento(await medirEspaco())
                }}
              >
                Liberar espaço
              </Botao>
              <Botao tamanho="sm" variante="secundario" onClick={() => void comecarLimpoNesteAparelho()}>
                Baixar backup e começar limpo
              </Botao>
            </div>
          </div>
        ) : null}

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
            <Sparkles className="h-3 w-3" /> Esqueceu a senha? Peça para redefinirem para você.
          </p>
          <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-300 dark:text-slate-600">
            versão {VERSAO}
          </p>
          {!nuvem ? (
            <button
              type="button"
              onClick={() => setConexaoAberta(true)}
              className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-sky-600 hover:underline dark:text-sky-400"
            >
              <Link2 className="h-3 w-3" /> Conectar este aparelho ao banco da empresa
            </button>
          ) : null}
        </div>
      </div>

      <JanelaConexao aberto={conexaoAberta} onFechar={() => setConexaoAberta(false)} />
    </div>
  )
}
