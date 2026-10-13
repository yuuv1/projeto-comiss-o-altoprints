import {
  CheckCircle2,
  ClipboardList,
  Package,
  Pencil,
  Plus,
  Printer,
  PrinterCheck,
  Store,
  Trash2,
  Truck,
  Wallet,
} from 'lucide-react'
import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useRegistrarImpressao } from '../components/impressao'
import { PedidoCartao, useAcoesPedido } from '../components/pedido'
import { Abas, BarraBusca, Botao, CartaoResumo, Etiqueta, Pilulas, Vazio, cn } from '../components/ui'
import { useAuth } from '../lib/auth'
import { dataBR, moeda, numeroBR } from '../lib/format'
import { useStore } from '../lib/store'
import {
  type EtapaFila,
  LABEL_ETAPA,
  type Pedido,
  etapaFila,
  pedidoPendenteFinanceiro,
  podeEditarPedidos,
  podeExcluirPedidos,
  telasDoUsuario,
} from '../lib/types'
import Entregas from './Entregas'

type Aba = 'pedidos' | 'entregas'
type Filtro = EtapaFila | 'todas'

/** o que cada filtro mostra, escritos em português claro */
const AJUDA_FILTRO: Record<Filtro, string> = {
  todas: 'Todos os pedidos, do lançamento até a entrega.',
  a_pagar: 'Pedidos que ainda não tiveram o pagamento confirmado.',
  a_imprimir: 'Na fila de impressão: pagos e que ainda não saíram da máquina.',
  imprimindo: 'Na máquina agora.',
  concluido: 'Já saíram da máquina e estão prontos, aguardando a entrega.',
  entregue: 'Já entregues ou retirados.',
}

const ICONE_ETAPA: Record<Filtro, typeof Package> = {
  todas: Package,
  a_pagar: Wallet,
  a_imprimir: Printer,
  imprimindo: Printer,
  concluido: CheckCircle2,
  entregue: Truck,
}

const COR_ETAPA: Record<Filtro, string> = {
  todas: 'from-pink-500 to-purple-600',
  a_pagar: 'from-amber-500 to-orange-600',
  a_imprimir: 'from-fuchsia-500 to-pink-600',
  imprimindo: 'from-sky-500 to-blue-600',
  concluido: 'from-violet-500 to-indigo-600',
  entregue: 'from-emerald-500 to-green-600',
}

export default function Pedidos() {
  const { db, atualizarPedido, avisar } = useStore()
  const { usuario, ehProprietario } = useAuth()
  const acoes = useAcoesPedido()
  const impressao = useRegistrarImpressao()
  const navegar = useNavigate()
  const [busca, setBusca] = useState('')
  const [aba, setAba] = useState<Aba>('pedidos')

  const telas = telasDoUsuario(usuario)
  /** entregas fica aqui dentro; cada acesso só vê se o dono liberar */
  const verEntregas = ehProprietario || telas.entregas
  /** quem cuida da produção enxerga a fila da loja inteira (e sem valores) */
  const verFilaDaProducao = ehProprietario || telas.paraImprimir
  const semVinculo = !ehProprietario && !usuario?.vendedor_id
  const verLojaInteira = ehProprietario || (semVinculo && verFilaDaProducao)

  /** quem só cuida da impressão cai direto na fila */
  const [filtro, setFiltro] = useState<Filtro>(semVinculo && verFilaDaProducao ? 'a_imprimir' : 'todas')

  const meus = useMemo(
    () =>
      verLojaInteira ? db.pedidos : db.pedidos.filter((p) => p.vendedor_id === usuario?.vendedor_id),
    [db.pedidos, verLojaInteira, usuario?.vendedor_id],
  )

  const permissao = db.configuracoes.permissao_vendedor
  const podeEditar = ehProprietario || podeEditarPedidos(permissao)
  const podeExcluir = ehProprietario || podeExcluirPedidos(permissao)

  const pedidos = useMemo(() => [...meus].sort((a, b) => b.numero - a.numero), [meus])

  const contagem = useMemo(() => {
    const mapa = { a_pagar: 0, a_imprimir: 0, imprimindo: 0, concluido: 0, entregue: 0 } as Record<EtapaFila, number>
    pedidos.forEach((p) => {
      mapa[etapaFila(p)] += 1
    })
    return mapa
  }, [pedidos])

  const daEtapa = useMemo(
    () => (filtro === 'todas' ? pedidos : pedidos.filter((p) => etapaFila(p) === filtro)),
    [filtro, pedidos],
  )

  const filtrados = useMemo(() => {
    const t = busca.trim().toLowerCase()
    if (!t) return daEtapa
    return daEtapa.filter((p) =>
      [p.cliente_nome, String(p.numero), `#${p.numero}`, p.descricao, p.cidade, p.codigo_rastreio, p.observacoes]
        .join(' ')
        .toLowerCase()
        .includes(t),
    )
  }, [busca, daEtapa])

  const resumo = useMemo(() => {
    const retirada = daEtapa.filter((p) => p.tipo_entrega === 'retirada').length
    const correios = daEtapa.filter((p) => p.tipo_entrega === 'correios').length
    const aReceber = daEtapa.filter(pedidoPendenteFinanceiro).reduce((s, p) => s + Number(p.valor || 0), 0)
    const metragem = daEtapa.reduce((s, p) => s + Number(p.metragem || 0), 0)
    const valor = daEtapa.reduce((s, p) => s + Number(p.valor || 0), 0)
    return { total: daEtapa.length, retirada, correios, aReceber, metragem, valor }
  }, [daEtapa])

  /** dispara a ação sem deixar erro solto (o aviso do modo visualização já aparece) */
  const disparar = (promessa: Promise<unknown>) => {
    void promessa.catch(() => {})
  }

  const iniciarImpressao = (p: Pedido) => {
    disparar(
      atualizarPedido(p.id, { status_producao: 'imprimir' }).then(() =>
        avisar(`Impressão do pedido #${p.numero} iniciada!`),
      ),
    )
  }

  /** botões da fila: cada etapa tem só o próximo passo (e o anterior fica registrado) */
  const botoesDaFila = (p: Pedido) => {
    const etapa = etapaFila(p)
    const meu = ehProprietario || p.vendedor_id === usuario?.vendedor_id
    const podeMexer = meu || verFilaDaProducao
    const entregueEm = p.data_entrega || p.data_retirada
    return (
      <>
        {podeMexer && etapa === 'a_pagar' ? (
          <Botao tamanho="sm" variante="sucesso" icone={Wallet} onClick={() => disparar(acoes.marcarPago(p))}>
            Marcar pago
          </Botao>
        ) : null}
        {podeMexer && (etapa === 'a_pagar' || etapa === 'a_imprimir') ? (
          <Botao tamanho="sm" variante="secundario" icone={Printer} onClick={() => iniciarImpressao(p)}>
            Iniciar impressão
          </Botao>
        ) : null}
        {podeMexer && (etapa === 'a_imprimir' || etapa === 'imprimindo') ? (
          <Botao tamanho="sm" variante="sucesso" icone={PrinterCheck} onClick={() => impressao.imprimir(p)}>
            Fila concluída
          </Botao>
        ) : null}
        {podeMexer && etapa === 'concluido' ? (
          <Botao tamanho="sm" variante="sucesso" icone={Truck} onClick={() => disparar(acoes.marcarEntregue(p))}>
            Marcar entregue
          </Botao>
        ) : null}
        {entregueEm ? (
          <Etiqueta className="border-emerald-200 bg-emerald-50 text-emerald-700" icone={CheckCircle2}>
            Entregue em {dataBR(entregueEm)}
          </Etiqueta>
        ) : null}
        <Botao tamanho="sm" variante="secundario" icone={Pencil} onClick={() => acoes.editar(p)}>
          {podeEditar ? 'Editar' : 'Ver'}
        </Botao>
        {podeExcluir ? (
          <Botao
            tamanho="sm"
            variante="ghost"
            className="text-rose-500 hover:bg-rose-50"
            icone={Trash2}
            onClick={() => disparar(acoes.pedirExclusao(p))}
          >
            Excluir
          </Botao>
        ) : null}
      </>
    )
  }

  const mostrarValorDe = (p: Pedido) => ehProprietario || p.vendedor_id === usuario?.vendedor_id

  return (
    <>
      <Abas<Aba>
        ativa={aba}
        onChange={setAba}
        abas={
          verEntregas
            ? [
                {
                  id: 'pedidos' as Aba,
                  label: ehProprietario ? 'Pedidos' : 'Meus pedidos',
                  icone: ClipboardList,
                  contador: pedidos.length,
                },
                { id: 'entregas' as Aba, label: 'Entregas', icone: Truck },
              ]
            : [{ id: 'pedidos' as Aba, label: 'Pedidos', icone: ClipboardList, contador: pedidos.length }]
        }
        acoes={
          aba === 'pedidos' ? (
            <>
              {verFilaDaProducao ? (
                <Botao variante="secundario" icone={PrinterCheck} onClick={() => impressao.novo()}>
                  Registrar impressão
                </Botao>
              ) : null}
              <Botao icone={Plus} onClick={() => navegar('/pedido/novo')}>
                Novo pedido
              </Botao>
            </>
          ) : undefined
        }
      />

      {aba === 'entregas' && verEntregas ? (
        <Entregas embutido />
      ) : (
        <>
          <div className={cn('mb-3 grid grid-cols-2 gap-3', filtro === 'todas' ? 'lg:grid-cols-4' : 'lg:grid-cols-3')}>
            {filtro === 'todas' ? (
              <>
                <CartaoResumo
                  titulo="Total de pedidos"
                  valor={resumo.total}
                  icone={Package}
                  gradiente="from-pink-500 to-purple-600"
                />
                <CartaoResumo
                  titulo="Retirada"
                  valor={resumo.retirada}
                  icone={Store}
                  gradiente="from-violet-500 to-indigo-600"
                />
                <CartaoResumo
                  titulo="Correios"
                  valor={resumo.correios}
                  icone={Truck}
                  gradiente="from-sky-500 to-blue-600"
                />
                <CartaoResumo
                  titulo="A receber"
                  valor={moeda(resumo.aReceber)}
                  icone={Wallet}
                  gradiente="from-amber-500 to-orange-600"
                />
              </>
            ) : (
              <>
                <CartaoResumo
                  titulo={LABEL_ETAPA[filtro]}
                  valor={resumo.total}
                  icone={ICONE_ETAPA[filtro]}
                  gradiente={COR_ETAPA[filtro]}
                />
                <CartaoResumo
                  titulo="Metragem"
                  valor={`${numeroBR(resumo.metragem)} m`}
                  icone={Printer}
                  gradiente="from-fuchsia-500 to-pink-600"
                />
                {verFilaDaProducao && !ehProprietario ? (
                  <CartaoResumo
                    titulo="Vendedores"
                    valor={new Set(daEtapa.map((p) => p.vendedor_id).filter(Boolean)).size}
                    icone={Store}
                    gradiente="from-violet-500 to-indigo-600"
                  />
                ) : (
                  <CartaoResumo
                    titulo="Valor"
                    valor={moeda(resumo.valor)}
                    icone={Wallet}
                    gradiente="from-violet-500 to-indigo-600"
                  />
                )}
              </>
            )}
          </div>

          <Pilulas<Filtro>
            className="mb-3"
            ativo={filtro}
            onChange={setFiltro}
            itens={[
              { id: 'todas', label: 'Todas', contador: pedidos.length },
              { id: 'a_pagar', label: LABEL_ETAPA.a_pagar, contador: contagem.a_pagar },
              { id: 'a_imprimir', label: LABEL_ETAPA.a_imprimir, contador: contagem.a_imprimir },
              { id: 'imprimindo', label: LABEL_ETAPA.imprimindo, contador: contagem.imprimindo },
              { id: 'concluido', label: LABEL_ETAPA.concluido, contador: contagem.concluido },
              { id: 'entregue', label: LABEL_ETAPA.entregue, contador: contagem.entregue },
            ]}
          />

          <BarraBusca
            className="mb-3"
            valor={busca}
            onChange={setBusca}
            placeholder="Buscar por cliente, nº do pedido, descrição, cidade ou código de rastreio..."
          />

          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              {AJUDA_FILTRO[filtro]} {filtrados.length} pedido{filtrados.length === 1 ? '' : 's'}
              {busca ? ' encontrado(s)' : ''}.
            </p>
          </div>

          {filtrados.length === 0 ? (
            <Vazio
              icone={ICONE_ETAPA[filtro]}
              titulo={
                busca
                  ? 'Nenhum pedido encontrado'
                  : filtro === 'todas'
                    ? ehProprietario
                      ? 'Nenhum pedido cadastrado ainda'
                      : 'Você ainda não tem pedidos'
                    : `Nenhum pedido em "${LABEL_ETAPA[filtro]}"`
              }
              descricao={
                busca
                  ? 'Tente buscar por outro termo.'
                  : filtro === 'todas'
                    ? 'Comece criando o primeiro pedido.'
                    : AJUDA_FILTRO[filtro]
              }
              acao={
                !busca && filtro === 'todas' ? (
                  <Botao icone={Plus} onClick={() => navegar('/pedido/novo')}>
                    Novo pedido
                  </Botao>
                ) : undefined
              }
            />
          ) : (
            <div className={cn('space-y-3', 'animate-fade-in-up')}>
              {filtrados.map((p) => (
                <PedidoCartao
                  key={p.id}
                  pedido={p}
                  mostrarVendedor={ehProprietario || verFilaDaProducao}
                  mostrarValor={mostrarValorDe(p)}
                  acoes={botoesDaFila(p)}
                />
              ))}
            </div>
          )}
        </>
      )}

      {acoes.dialog}
      {impressao.janela}
    </>
  )
}
