# Instalar o Altoprints como aplicativo (PWA)

O Altoprints pode ser instalado pelo navegador no celular ou computador. Ele ganha um
ícone na tela inicial/área de aplicativos e abre em uma janela própria, sem precisar
redigitar o endereço.

## Marca e ícone

O cabeçalho do app e os ícones do aplicativo usam somente o símbolo colorido da Altoprints,
sem o nome ou o slogan, para continuar reconhecível em tamanhos pequenos. A marca completa
em alta resolução está em `app/public/brand/altoprints-logo-completo.png` (PNG) e
`app/public/brand/altoprints-logo-completo.svg`; a arte do símbolo está em
`app/public/brand/altoprints-simbolo.png`.

## Acesso do proprietário e relatório no celular

1. No aparelho do proprietário atual, abra **Configurações → Funcionários e acessos → Novo acesso de proprietário** e crie um e-mail (ou usuário) e senha separados para o chefe. Não reutilize o acesso da equipe.
2. No celular do chefe, abra o mesmo endereço oficial e toque em **Login proprietário**. A conexão com a Nuvem vem do site e é igual em todos os aparelhos.
3. No **Painel**, toque em **Relatório**. Escolha o período (por exemplo, do início até hoje) e deixe **Todos os funcionários**; use **Imprimir / PDF** para visualizar/salvar ou **Exportar CSV** para baixar.

O relatório é protegido para proprietários. Com a Nuvem conectada ao mesmo banco, o chefe vê os pedidos atualizados em qualquer aparelho. Em **Configurações → Nuvem → Diagnóstico da sincronização**, compare o endereço do projeto e confira a hora da última leitura em cada aparelho.

## Antes de instalar

- Abra o endereço hospedado por HTTPS, por exemplo:
  <https://yuuv1.github.io/projeto-comiss-o-altoprints/>.
- O Altoprints é somente online; não existe arquivo local/offline para usar o sistema ou gravar pedidos.
- Na primeira abertura, conecte à internet para o navegador baixar o aplicativo.

## Android (Chrome)

1. Abra o endereço do Altoprints no Chrome.
2. Toque em **Instalar app** dentro do sistema. Se o navegador mostrar a confirmação,
   toque em **Instalar**.
3. Se o botão não abrir a confirmação: menu **⋮ → Instalar app** ou
   **Adicionar à tela inicial** → **Instalar**.

## iPhone ou iPad (Safari)

1. Abra o endereço no **Safari**.
2. Toque em **Compartilhar**.
3. Escolha **Adicionar à Tela de Início** e confirme em **Adicionar**.

O iOS não mostra o mesmo aviso automático de instalação do Android; o Altoprints mostra
as instruções quando você toca em **Instalar app**.

## Computador (Chrome ou Edge)

Use o botão **Instalar app** no Altoprints ou o ícone de instalação na barra de endereço.
Também é possível abrir o menu do navegador e escolher **Instalar Altoprints**.

## Atualizações e funcionamento sem internet

- O PWA confere a versão ao abrir ou voltar ao app e, enquanto fica aberto com internet, a cada 5 minutos. Uma versão nova é ativada e a tela recarrega automaticamente — não é preciso apagar o cache.
- Um aparelho desligado ou sem internet atualiza na próxima abertura online. Se a versão não mudar, feche o app por completo e abra de novo pelo mesmo endereço oficial. Não limpe os dados do navegador: isso pode encerrar a sessão e redefinir preferências, mas não é necessário para receber atualizações.
- A atualização do **programa** é diferente da sincronização dos **pedidos**. O app confere mudanças a cada 15 segundos e ao voltar para a tela; o Supabase Realtime atualiza as outras abas/aparelhos.
- O PWA pode guardar somente os arquivos do programa para abrir a interface; pedidos, clientes, acessos, configurações e artes exigem internet. O service worker não guarda respostas do banco e o app não grava esses dados localmente se ficar offline.
- Cada PWA está vinculado ao endereço oficial instalado. Todos os aparelhos devem usar o mesmo domínio e caminho; endereços diferentes de Pages/Netlify são publicações distintas.
- A publicação oficial exige a conexão central do Supabase no build. O navegador ignora conexões antigas salvas ou recebidas por link, garantindo que todos os aparelhos usem o mesmo banco.

Para remover, desinstale o Altoprints pela tela inicial/lista de aplicativos do aparelho,
como qualquer outro app. O PWA não passa pela Play Store ou App Store.
