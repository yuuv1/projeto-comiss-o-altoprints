import RelatorioResumo from './RelatorioResumo'

/**
 * Relatório — uma tela só: faturamento do período e comissão da equipe.
 *
 * O proprietário vê todos os vendedores (e o total de comissões no impresso);
 * o relatório é uma tela do proprietário (a equipe trabalha sem login).
 */
export default function Relatorio() {
  return <RelatorioResumo />
}
