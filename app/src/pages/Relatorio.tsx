import { BarChart3, History } from 'lucide-react'
import { useState } from 'react'
import { Abas, TituloPagina } from '../components/ui'
import { useAuth } from '../lib/auth'
import { telasDoUsuario } from '../lib/types'
import Impressoes from './Impressoes'
import RelatorioResumo from './RelatorioResumo'

type AbaRelatorio = 'filas' | 'resumo'

/**
 * Relatório — a tela de produção e de números em um só lugar:
 *  • Filas registradas: tudo o que saiu da máquina (e o botão de registrar),
 *    com filtro por vendedor;
 *  • Resumo e comissões: faturamento, comissão por faixa e por vendedor.
 */
export default function Relatorio() {
  const { usuario, ehProprietario } = useAuth()
  const telas = telasDoUsuario(usuario)
  const podeVerFilas = ehProprietario || telas.impressoes
  const [aba, setAba] = useState<AbaRelatorio>(podeVerFilas ? 'filas' : 'resumo')

  if (!podeVerFilas) return <RelatorioResumo />

  return (
    <>
      <TituloPagina
        icone={BarChart3}
        titulo="Relatório"
        subtitulo="As filas que saíram da máquina e o resumo de vendas e comissões do período."
      />
      <Abas<AbaRelatorio>
        ativa={aba}
        onChange={setAba}
        abas={[
          { id: 'filas', label: 'Filas registradas', icone: History },
          { id: 'resumo', label: ehProprietario ? 'Resumo e comissões' : 'Meu desempenho', icone: BarChart3 },
        ]}
      />
      {aba === 'filas' ? <Impressoes embutido /> : <RelatorioResumo embutido />}
    </>
  )
}
