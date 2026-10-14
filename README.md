# SelfMusic

Aplicativo de música exclusivo para Android, desenvolvido com React Native e Expo. O SelfMusic se conecta a uma API compatível para autenticação, biblioteca, playlists e reprodução de áudio.

> Este repositório contém o aplicativo cliente. A API e os arquivos de música são mantidos pelo servidor configurado no app.

## Recursos

- Cadastro e login de usuários.
- Início com músicas recentes e playlists disponíveis.
- Busca de músicas na biblioteca do servidor.
- Reprodução com controles e fila de músicas.
- Biblioteca, playlists pessoais e adição de músicas a playlists.
- Temas visuais e configuração do endereço da API pelo aplicativo.
- Armazenamento seguro da sessão e renovação de tokens.
- Controles de mídia e suporte à reprodução em segundo plano em builds nativas compatíveis.

## Tecnologias

- Expo SDK 57
- React Native 0.86 e React 19
- JavaScript
- `expo-audio` e `expo-media-control` para áudio e controles de mídia
- API HTTP externa para autenticação e dados da biblioteca

## Requisitos

- Node.js e npm
- Um dispositivo Android ou emulador Android
- Uma instância acessível da API usada pelo aplicativo

## Instalação e execução

Instale as dependências:

```bash
npm ci
```

Inicie o Expo:

```bash
npm start
```

Também estão disponíveis os atalhos:

```bash
npm run android
```

Os módulos nativos de áudio e controles de mídia podem exigir um development build ou uma build nativa do EAS. O Expo Go pode não incluir todos os módulos usados pelo projeto.

## Configuração da API

A API do projeto está em [selfmusic-api](https://github.com/ElyahuMendesdaSilva/selfmusic-api). O app não define um endereço de API padrão. Configure a URL na tela de login ou em **Configurações → Conexão** dentro do app.

Para definir um endereço padrão durante o desenvolvimento, crie `.env` na raiz:

```env
EXPO_PUBLIC_API_URL=https://sua-api.exemplo.com
```

Depois de alterar essa variável, reinicie o Expo. O valor `EXPO_PUBLIC_API_URL` é incorporado ao bundle durante a execução/build; para builds já instaladas, gere uma nova build.

### Acesso local

- Android Emulator: use `http://10.0.2.2:8000` para acessar uma API executada na máquina host.
- Dispositivo físico: use o IP da máquina host na rede local, por exemplo `http://192.168.0.12:8000`; o dispositivo precisa alcançar esse endereço.
- Builds de produção devem usar HTTPS. O projeto permite HTTP em configurações de desenvolvimento; essa permissão é desativada no perfil EAS `production`.

O endereço deve apontar para a raiz HTTP esperada pela API. A API precisa oferecer os endpoints de autenticação, músicas e playlists consumidos pelo cliente.

## Builds com EAS

O arquivo `eas.json` define três perfis:

- `development`: development client para distribuição interna.
- `preview`: build Android APK para distribuição interna.
- `production`: build Android App Bundle para produção.

Com o EAS CLI instalado e o projeto autenticado, por exemplo:

```bash
eas build --platform android --profile preview
eas build --platform android --profile production
```

## Estrutura do projeto

```text
.
├── App.js                 # composição dos providers e navegação principal
├── app.json               # configuração Expo e plugins nativos
├── app.config.js          # ajustes nativos por ambiente de build
├── eas.json               # perfis de build e distribuição
├── assets/                # ícones e imagens do aplicativo
├── brand/                 # identidade visual e arquivos de marca
└── src/
    ├── components/        # componentes reutilizáveis
    ├── context/           # autenticação, player, tema e cache
    ├── screens/           # telas do aplicativo
    ├── services/          # cliente HTTP e serviços da API
    └── theme/             # paletas e estilos de tema
```

## Documentação relacionada

- [DOCUMENTACAO_API.md](./DOCUMENTACAO_API.md): documentação da API usada pelo cliente.
- [app.md](./app.md): documentação complementar do projeto.
- [brand/selfmusic/GUIA.md](./brand/selfmusic/GUIA.md): guia da identidade visual.

## Licença

Consulte o arquivo [LICENSE](./LICENSE).
