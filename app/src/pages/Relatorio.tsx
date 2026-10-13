import RelatorioResumo from './RelatorioResumo'

/**
 * Relatório — uma tela só: faturamento do período e comissão da equipe.
 *
 * O proprietário vê todos os vendedores (e o total de comissões no impresso);
 * o vendedor vê apenas os pedidos e a comissão dele.
 */
export default function Relatorio() {
  return <RelatorioResumo />
}
