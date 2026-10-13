// Versão do sistema, mostrada na tela de login e nas Configurações.
// Serve para conferir, num relance, se o aparelho está com a versão mais nova
// (quando o navegador guarda uma versão antiga em cache, o número fica para trás).
import pacote from '../../package.json'

export const VERSAO: string = pacote.version
