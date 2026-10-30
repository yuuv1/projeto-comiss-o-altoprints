// Lembra o último nome de funcionário escolhido neste aparelho.
//
// Sem login de funcionário, cada pessoa escolhe o próprio nome ao registrar uma
// fila. Para não escolher tudo de novo a cada pedido, o sistema guarda a última
// escolha **neste navegador** e já deixa marcada na próxima vez.
import { lsGravar, lsLer } from './local'

const CHAVE = 'altoprints:ultimo-funcionario'

export const ultimoFuncionario = () => lsLer(CHAVE) ?? ''

export const guardarUltimoFuncionario = (vendedorId: string) => {
  if (vendedorId) lsGravar(CHAVE, vendedorId)
}
