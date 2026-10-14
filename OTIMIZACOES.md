# Otimizações recomendadas — app-de-musica (Expo / React Native)

Análise estática do código enviado (Expo SDK 57, React Native 0.86, ~5.200 linhas em `src/` + `App.js`).
Nada foi executado: os itens abaixo vêm da leitura do código, então vale medir (React DevTools Profiler / Perfetto) antes de priorizar os de performance.

**Legenda de prioridade:** 🔴 alta (bug ou impacto claro) · 🟡 média · 🟢 baixa / polimento

---

## Resumo

| # | Item | Prioridade | Arquivo(s) |
|---|------|:---:|---|
| 1 | Stream de áudio não renova o token expirado | 🔴 | `PlayerContext.js`, `songsService.js` |
| 2 | Corrida ao trocar de música rapidamente | 🔴 | `PlayerContext.js` |
| 3 | `getItemLayout` errado na playlist | 🔴 | `PlaylistScreen.js` |
| 4 | `StyleSheet` recriado a cada render (23 locais) | 🔴 | quase todas as telas/componentes |
| 5 | Re-render da tela do player a cada tick de progresso | 🟡 | `PlayerScreen.js`, `NowPlayingBar.js`, `PlayerContext.js` |
| 6 | Abas desmontadas a cada troca (perde estado e refaz carga) | 🟡 | `App.js` |
| 7 | Fila do player renderizada com `ScrollView.map` | 🟡 | `PlayerScreen.js` |
| 8 | `ItemSeparatorComponent` inline recria separadores | 🟡 | `SearchScreen.js`, `LibraryScreen.js` |
| 9 | Inicialização lenta (tema → URL → sessão → `/auth/me`) | 🟡 | `ThemeContext`, `ApiConfigContext`, `AuthContext` |
| 10 | `apiClient`: token lido do SecureStore a cada requisição, sem timeout com `signal`, `console.log` em produção | 🟡 | `apiClient.js` |
| 11 | Cache: um único contexto re-renderiza todos os consumidores; `invalidatePlaylist` deixa estado inconsistente | 🟡 | `DataCacheContext.js` |
| 12 | Imagens: `Image` nativa sem cache/fallback em Home e NowPlayingBar | 🟡 | `HomeScreen.js`, `NowPlayingBar.js` |
| 13 | `@expo/ui/jetpack-compose` é só Android, mas o projeto declara iOS/web | 🟡 | `bottomBar.js`, `AdminSettings.js`, `LibraryScreen.js` |
| 14 | Botão voltar do Android e safe areas | 🟡 | `App.js` e overlays |
| 15 | Segurança de rede: cleartext e ATS liberados em produção | 🟡 | `app.json` |
| 16 | Código duplicado / morto / organização | 🟢 | vários |
| 17 | Dependências e config | 🟢 | `package.json`, `app.json` |
| 18 | Qualidade: lint, TypeScript, testes | 🟢 | projeto |

---

## 🔴 Prioridade alta

### 1. O stream de áudio não passa pelo refresh de token
**Onde:** `PlayerContext.playAtIndex` → `songsService.createStreamSource`.
O player recebe `{ uri, headers: { Authorization: Bearer <token> } }` direto, sem passar pelo `apiClient`. Quando o access token expira no meio da sessão, o `/songs/{id}/stream` devolve 401 e o `expo-audio` só mostra "Erro ao reproduzir" (o `catch` em `playAtIndex` também engole o erro). O refresh automático só existe para chamadas JSON.

**Como resolver:**
- Antes de montar o source, garantir um token válido (ex.: função `ensureFreshToken()` que decodifica o `exp` do JWT, ou faz um `HEAD`/chamada leve via `apiRequest` quando faltar pouco para expirar).
- Ouvir `playerStatus.error`; ao detectar 401, renovar o token e repetir `player.replace(...)` uma vez.
- Alternativa no backend: URL de stream assinada e de curta duração, sem depender de header.

### 2. Corrida ao trocar de faixa rapidamente
**Onde:** `PlayerContext.playAtIndex`.
Cada chamada faz `await createStreamSource()` e depois `player.replace()`. Com toques rápidos em "próxima", as respostas podem chegar fora de ordem e tocar uma faixa que não é a atual (o estado `currentSong` já mudou). O `didJustFinish` também pode disparar `next()` enquanto uma troca está em andamento.

**Como resolver:** guardar um `requestIdRef` incrementado a cada `playAtIndex` e ignorar o resultado se o id mudou. Opcional: *debounce* de ~150 ms em `next/previous`.

### 3. `getItemLayout` incorreto na playlist
**Onde:** `PlaylistScreen.js`.
`getItemLayout` usa `PLAYLIST_ROW_HEIGHT + 10` (68 px), mas a linha tem `height: 58` e a lista **não** tem separador nem margem. O layout informado diverge do real, o que causa saltos de scroll e posicionamento errado em listas longas.
**Como resolver:** usar `58` (ou adicionar de fato um `ItemSeparatorComponent`/`marginBottom` de 10 px e manter 68). Aplicar o mesmo conceito em `SearchScreen` e `LibraryScreen` (linhas de altura fixa) para ganhar `getItemLayout`.

### 4. `createStyles(colors)` executado a cada render
**Onde:** 23 chamadas (Home, Search, Library, Player, NowPlayingBar, modais, `SongRow`, `PlaylistRow`…).
Cada render cria um `StyleSheet.create` novo, inclusive **dentro de cada linha de lista**. Isso também anula o `memo`: em `PlaylistScreen`, `PlaylistSongRow` recebe `styles`, `colors` e `onRemove` novos a cada render, então nunca é "memoizado" de verdade.

**Como resolver (escolha uma):**
```js
// Opção A: memoizar por tema
const styles = useMemo(() => createStyles(colors), [colors]);

// Opção B (melhor): estilos estáticos no módulo + cor dinâmica só onde precisa
const styles = StyleSheet.create({ row: { flexDirection: 'row', gap: 12 } });
<Text style={[styles.title, { color: colors.text }]} />
```
Para as linhas de lista, passe só `colors.text`/`colors.accent` como props primitivas (ou crie um `useThemedStyles(createStyles)` central).

---

## 🟡 Prioridade média

### 5. Tela do player re-renderiza a cada tick de progresso
`usePlayerStatus()` entrega o status inteiro (atualiza ~2×/s). `PlayerScreen` e `NowPlayingBar` re-renderizam inteiros a cada tick, recriando estilos e remapeando a fila. `NowPlayingBar` só precisa de `playing`, `isBuffering` e `error`.
**Como resolver:**
- Dividir em dois contextos/hooks: `usePlaybackState()` (playing, buffering, error — muda raramente) e `usePlaybackProgress()` (currentTime, duration — muda sempre).
- Extrair o slider + tempos para um componente `ProgressBar` que é o único a assinar o progresso.
- Atualizar o progresso nos controles do sistema (`updatePlaybackState` com posição) também após `seekTo`, não só ao mudar play/pause, para a barra da notificação não ficar defasada.

### 6. Abas são desmontadas a cada troca
**Onde:** `App.js` renderiza só a aba ativa (ternário).
Ao trocar de aba perdem-se: texto da busca e resultados, posição do scroll, `extraSongs` da paginação da Biblioteca (que não vão para o cache), e as telas refazem montagem/efeitos de carga. Além disso, roda uma animação de fade em toda troca.
**Como resolver:** manter as abas montadas e esconder as inativas (`display: 'none'` / `react-freeze`), ou adotar `react-navigation` (bottom tabs + stack para Player/Playlist/Atualizações). Navegação real também resolve o item 14. Se mantiver o modelo atual, mova `extraSongs`/`hasMore` e a query de busca para o `DataCacheContext`.

### 7. Fila do player usa `ScrollView` + `map`
**Onde:** `PlayerScreen` (painel "Em seguida").
Toda a fila (pode ter centenas de músicas, vinda de "Todas as músicas") é renderizada de uma vez. Trocar por `FlatList` com `getItemLayout` (linha de 36–48 px) e `keyExtractor`.

### 8. `ItemSeparatorComponent={() => <View/>}` inline
**Onde:** `SearchScreen`, `LibraryScreen` (e `SectionSeparatorComponent`).
Uma função anônima nova a cada render é um tipo de componente novo, então os separadores são desmontados e remontados. Declare o componente fora, ou use `gap`/`marginBottom` no item.

### 9. Inicialização em cascata
Hoje: `ThemeProvider` lê SecureStore → `ApiConfigProvider` lê SecureStore → `AuthProvider` lê 3 chaves **em sequência** → `GET /auth/me` (timeout de 10 s) → só então o app aparece. Se a API estiver lenta/fora do ar, o usuário fica na tela de loading. O tema também "pisca" do padrão para o salvo.
**Como resolver:**
- `Promise.all` para ler tema, URL da API e tokens/usuário de uma vez (ou migrar tema e URL para `AsyncStorage`/MMKV — não são segredos e não precisam de SecureStore).
- Usar `expo-splash-screen` (`preventAutoHideAsync`) até tema + sessão local estarem lidos.
- Entrar com o usuário salvo imediatamente e validar `/auth/me` em segundo plano (só deslogar se vier 401 depois do refresh).
- Remover a lógica de refresh duplicada de `AuthContext.restoreSession` (já existe em `apiClient`).

### 10. `apiClient.js`
- **Token lido do SecureStore em toda requisição** (`getAccessToken()` é chamada nativa assíncrona). Manter o token em memória (variável de módulo) e persistir só ao mudar.
- **`signal` do chamador substitui o timeout** (`signal || controller.signal`): a busca com `AbortController` fica sem limite de tempo. Combinar os dois sinais (ou usar `AbortSignal.any` / helper).
- **Retry após refresh perde o `signal`** do chamador.
- **Fila de espera do refresh:** se o refresh falha, `onRefreshed(null)` faz cada requisição pendente reenviar com `Bearer null`; melhor rejeitar direto.
- **Três funções quase iguais:** `apiRequest`, `fetchWithTimeout` e `handleResponse` repetem fetch, parse e tratamento de erro. Unificar em um único caminho com `retried` como parâmetro.
- `await import('./sessionStorage')` dinâmico é desnecessário — o módulo já é importado no topo.
- `console.log('FETCH ERROR RAW', …)` deve sair (ou ficar atrás de `__DEV__`).
- Sem retry com *backoff* para GET em falha de rede; um retry curto melhora muito em rede móvel.
- Timeout fixo de 10 s para tudo; considerar timeouts por tipo (listas vs upload).

### 11. `DataCacheContext`
- **Um contexto só para dados e funções:** qualquer `publish()` troca `playlists`/`recentSongs` e re-renderiza todos os consumidores (Home, Library, Search, modais, Playlist). Separar em contexto de **ações** (estável) e de **dados**, ou migrar para uma lib de cache de servidor (TanStack Query: dedupe, *stale-while-revalidate*, invalidação, persistência) ou um store com seletores (Zustand).
- **`invalidatePlaylist` zera `updatedAt` sem `publish`**, e `hasPlaylists` é derivado de `updatedAt`. No próximo render, `hasPlaylists` vira `false` e Home/Library entram em `setLoading(true)` (spinner de tela cheia). Use um campo `stale: true` em vez de zerar a data.
- **Reset do cache durante o render** (`if (scopeRef.current !== scope) {…}`) é efeito colateral em render; mover para `useEffect`/`useMemo` por `scope`.
- **Sem limite de tamanho:** `searches` e `playlistDetails` crescem indefinidamente; adicionar LRU (ex.: 30 buscas).
- **Sem stale-while-revalidate nem persistência:** após o TTL ou numa abertura a frio, a UI mostra spinner em vez do último dado. Mostrar o dado antigo e revalidar em segundo plano; persistir `recentSongs`/`playlists` em disco.
- `loadMore` da Biblioteca chama `getRecentSongs` direto, fora do cache; paginação em `offset` pode duplicar itens quando entram músicas novas (hoje mitigado com `filter`). Preferir paginação por cursor no backend.
- `HomeScreen`/`LibraryScreen`: o `useEffect([load])` roda duas vezes porque `load` depende de `hasPlaylists`/`hasRecentSongs`, que mudam após a primeira carga. Usar um `useEffect` com dependência vazia + `useRef` para o estado "já carregou".

### 12. Imagens
`HomeScreen` e `NowPlayingBar` usam `Image` do React Native puro, enquanto `SongCover` já tem `cache: 'force-cache'` e fallback em erro. Padronizar:
- Usar `SongCover` em todos os lugares (remove também `colorFromString`/estilos duplicados), ou migrar para `expo-image` (cache em disco/memória, `placeholder`/blurhash, `recyclingKey` em listas, transição).
- Pedir à API miniaturas já redimensionadas (ex.: 96/192/512 px) em vez de reutilizar a capa original em cartões de 48–136 px.
- O player usa `SongCover` com `size={340}` mas o estilo força `width: '100%'`; garantir que a imagem carregada seja a de maior resolução só nessa tela.

### 13. Compose só funciona no Android
`@expo/ui/jetpack-compose` (`BottomBar`, `AdminSettings`, botão "+" da Biblioteca) é exclusivo do Android, mas `app.json` declara `ios` e `web` e o `package.json` inclui `react-native-web`. Em iOS/web essas telas quebram.
**Decisão:** ou (a) assumir Android-only e remover `ios`/`web`/`react-native-web`/`react-dom`, ou (b) criar `bottomBar.android.js` + `bottomBar.js` (fallback RN) e idem para os outros componentes.

### 14. Botão voltar e safe areas
- Não há `BackHandler`: com Player, Playlist ou Atualizações abertos (são *overlays* absolutos), o botão voltar do Android fecha o app. Tratar com `BackHandler` ou, melhor, com navegação real (item 6).
- Paddings fixos (`paddingTop: 28`, `Platform.OS === 'ios' ? 56 : 32`) e `bottom: 84` para a barra do player. Com edge-to-edge (padrão nas versões recentes do Android) isso pode ficar sob a barra de status/gestos. Usar `react-native-safe-area-context` (`useSafeAreaInsets`) e medir a altura real da `BottomBar`.

### 15. Rede insegura liberada em produção
`app.json` ativa `usesCleartextTraffic: true` (Android) e `NSAllowsArbitraryLoads: true` (iOS) para **todos** os builds, embora a URL padrão seja HTTPS. Mover isso para `app.config.js` condicionado ao perfil de build (só `development`/`preview`) e manter o `production` bloqueando HTTP.

---

## 🟢 Prioridade baixa / manutenção

### 16. Duplicação, código morto e organização
- **Não utilizados:** `components/MyPlaylistsSection.js`, `data/mockSongs.js`, `data/mockPlaylists.js`, `sessionStorage.updateAccessToken`, `expo-document-picker` (dependência sem uso). Em `adminService.js`, ~20 funções ainda não têm tela (ok se forem para o painel futuro; senão, remova).
- **Pasta com typo:** `src/componnents/` → mover `bottomBar.js` para `src/components/`.
- **Camada de storage repetida** 3×: `sessionStorage`, `themeStorage`, `apiConfigStorage` repetem `webGet/webSet/isWeb`. Criar um `storage.js` único (`getItem/setItem/removeItem`, com SecureStore só para tokens).
- **Componentes repetidos:** capa com fallback (Home, NowPlayingBar, Search), `Row`s de música (Search/Library/Playlist), estados de loading/erro/vazio (Home, Library, Search, MyPlaylists). Extrair `SongRow`, `EmptyState`, `ErrorState`, `ScreenLoading`.
- **Cores de erro hardcoded** (`#ff9b9b`, `rgba(255,107,107,.12)`) → `theme.colors.danger`.
- **Formatação:** `PlaylistScreen.js` e `AddToPlaylistModal.js` estão em linhas muito longas, com vários `useState` e funções por linha — difícil de revisar. Rodar Prettier e quebrar em componentes menores.
- Funções com `try/catch` vazios ou que engolem erros (`playAtIndex`, `close`) escondem falhas; no mínimo, logar em `__DEV__`.

### 17. Dependências e configuração
- `userInterfaceStyle: "light"` no `app.json`, porém todos os temas são escuros → usar `"dark"` (ou `"automatic"`) para que barras do sistema e teclado combinem.
- Dependências sem uso aparente: `expo-document-picker`; `react-dom`/`react-native-web` só se o web for mesmo suportado.
- `eas.json`: `submit.production` vazio; ok enquanto não publicar. Confirmar que `runtimeVersion: appVersion` + `expo-updates` está alinhado com o fluxo de releases (OTA só vale para mudanças JS).
- Não há `.gitignore` no pacote (`node_modules`, `.env`, `.expo`, builds). Adicionar.
- Considerar habilitar o React Compiler (Expo SDK recentes suportam via `experiments.reactCompiler`), que reduz a necessidade de `useMemo/useCallback` manuais — mas só depois de corrigir os pontos 4 e 5.

### 18. Qualidade e confiabilidade
- Sem ESLint (`eslint-config-expo`), sem Prettier, sem TypeScript e sem testes. Um `npm run lint` e tipos para o contrato da API (`Song`, `Playlist`, `User`) pegam muitos bugs deste tipo (como o `getItemLayout`) antes de rodar.
- Testes unitários valem principalmente para: `apiClient` (refresh e fila), `DataCacheContext` (TTL/invalidar) e `PlayerContext` (avançar fila, corrida de faixas).
- Relatório de erros em produção (Sentry/`expo-updates` + `ErrorBoundary` global); hoje uma exceção em render derruba o app inteiro.
- Faltam recursos que o usuário costuma esperar de um player e que se encaixam bem na arquitetura: pré-carregar a próxima faixa (reprodução sem pausa), repetir/aleatório, retomar a última fila ao abrir.

---

## Ordem sugerida de execução

1. **Bugs rápidos:** itens 3, 2, 1 e remoção do `console.log` (10).
2. **Ganho de performance barato:** itens 4, 8, 7 e 5.
3. **Estrutura:** itens 6 + 14 (navegação), depois 9, 11 e 12.
4. **Decisões de plataforma/segurança:** itens 13 e 15.
5. **Limpeza contínua:** itens 16–18.
