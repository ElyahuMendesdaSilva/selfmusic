# Music API — documentação completa

API FastAPI para usuários, biblioteca de MP3, streaming, playlists e mensagens. A API é executada com SQLite e mantém arquivos de música em disco; a interface OpenAPI interativa está em `/docs`.

## 1. Instalação e configuração

```bash
cp .env.example .env
docker-compose up --build
```

O volume `./data` preserva o SQLite e `./musicas` preserva MP3 e capas. As variáveis principais são `DATABASE_URL`, `JWT_SECRET_KEY`, `ACCESS_TOKEN_EXPIRE_MINUTES`, `REFRESH_TOKEN_EXPIRE_DAYS`, `MUSIC_LIBRARY_DIR`, `MAX_UPLOAD_SIZE` (corpo total, padrão: 1 GB), `MAX_MUSIC_UPLOAD_BYTES` (arquivo de música, padrão: o mesmo de `MAX_UPLOAD_SIZE`), `MAX_COVER_UPLOAD_BYTES` (padrão: 10 MB), credenciais `FIRST_ADMIN_*`, `ALLOW_USER_REGISTRATION` e `CORS_ORIGINS`. O container mantém conexões ociosas por até 300 segundos; o proxy reverso, se houver, deve receber limites/timeout compatíveis.

Na inicialização, a API cria as tabelas, garante `allow_user_registration` e `allow_user_playlists`, cria o primeiro administrador se ainda não houver um e sincroniza `musicas/songs`: cadastra MP3s novos pelo caminho canônico e remove registros cujos arquivos sumiram. Falhas de leitura são registradas e não impedem o restante da varredura.

### `GET /`

Rota pública de status. Não exige autenticação e retorna `200`:

```json
{"status":"online","version":"2.0.0","docs":"/docs"}
```

## 2. Funcionalidades removidas

O sistema de busca, importação e download direto do YouTube foi removido. Não existem rotas de download/sincronização nem URLs externas como fonte de músicas. A biblioteca é alimentada exclusivamente pelo upload administrativo de arquivos `.mp3`.

## 3. Convenções de autenticação e erros

As rotas marcadas como autenticadas exigem:

```http
Authorization: Bearer <access_token>
```

O access token é um JWT de curta duração; o refresh token é persistido e usado somente em `/auth/refresh`. Respostas de erro usam `{ "detail": "..." }`.

| Código | Uso na API |
|---|---|
| 200 | Consulta ou alteração concluída. |
| 201 | Usuário, música, mensagem ou playlist criada. |
| 204 | Exclusão/logout concluído, sem corpo. |
| 400 | MP3 inválido, formato não permitido ou configuração booleana inválida. |
| 401 | Credenciais/access token/refresh token inválidos ou expirados. |
| 403 | Papel insuficiente, conta desativada, registro ou criação pessoal desabilitada. |
| 404 | Recurso inexistente ou playlist inacessível ao usuário. |
| 409 | Nome de usuário, e-mail ou nome de playlist já utilizado pelo mesmo dono. |
| 422 | Body, query ou formulário não atende ao schema. |

## 4. Permissões

| Funcionalidade | Usuário | Administrador |
|---|---:|---:|
| Listar/buscar músicas e streaming | ✓ | ✓ |
| Ver capa pública | ✓ | ✓ |
| Criar playlist pessoal | Configurável | ✓ |
| Alterar a própria playlist pessoal | ✓ | ✓ |
| Consultar playlist de biblioteca | ✓ | ✓ |
| Gerenciar playlist de outro usuário | ✗ | ✓ |
| Enviar MP3 ou pasta | ✗ | ✓ |
| Remover música da biblioteca | ✗ | ✓ |
| Gerenciar usuários, mensagens e configurações | ✗ | ✓ |

Usuários comuns nunca enviam músicas pelas playlists pessoais: elas guardam apenas referências a músicas já existentes na biblioteca.

## 5. Modelos e relações

### User

`id`, `username` (3–50), `email`, `role` (`user` ou `admin`), `is_active`, `created_at`. A senha é armazenada apenas como hash e nunca é retornada.

### Song

`id`, `title`, `artist`, `album`, `album_artist`, `genre`, `year`, `track_number`, `disc_number`, `composer`, `duration_seconds`, `thumbnail_url`, `added_at`. O caminho físico (`file_path`) é interno e não é exposto pela resposta.

### Playlist e PlaylistSong

Playlist possui `id`, `name`, `owner_id`, `source_type` (`library` ou `personal`), `created_at` e `total_songs`. `PlaylistSong` é a relação N:N, com `playlist_id`, `song_id`, `position` e `added_at`. Uma música pode estar em muitas playlists sem cópia do MP3.

```text
User ──< Playlist ──< PlaylistSong >── Song
```

Uma playlist `library` é criada pelo administrador com upload de pasta e fica visível para todos os autenticados. Uma `personal` pertence ao criador. Ao apagar uma música, suas relações são removidas por foreign key; as playlists permanecem.

### Outros modelos

`RefreshToken` guarda token, usuário, expiração e revogação. `Message` contém remetente, conteúdo, data, leitura e resolução. `AppSetting` armazena pares `key`/`value` como texto.

## 6. Autenticação (`/auth`)

### `POST /auth/register`

Cria usuário comum quando `allow_user_registration` está habilitado. Não exige autenticação.

```json
{"username":"ana","email":"ana@example.com","password":"senha-com-8"}
```

Retorna `201` com:

```json
{"id":2,"username":"ana","email":"ana@example.com","role":"user","is_active":true,"created_at":"2026-08-13T10:00:00"}
```

Erros: `403` se cadastro público estiver desabilitado, `409` para nome/e-mail repetidos e `422` para dados inválidos.

### `POST /auth/login`

Não exige autenticação. Body: `{"email":"ana@example.com","password":"senha-com-8"}`. Retorna `200`:

```json
{"access_token":"jwt","refresh_token":"token-seguro","token_type":"bearer"}
```

Retorna `401` para credenciais inválidas e `403` para conta desativada.

### `POST /auth/refresh`

Não exige access token. Body: `{"refresh_token":"token-seguro"}`. Revoga o token informado e retorna novo objeto de tokens (`200`); retorna `401` se ele for inválido, expirado ou revogado.

### `POST /auth/logout`

Não exige access token. Body: `{"refresh_token":"token-seguro"}`. Revoga o token se ele existir e retorna `204`.

### `GET /auth/me`

Exige autenticação para `user` ou `admin`. Retorna `200` com o objeto `User` atual; `401` para token inválido.

## 7. Biblioteca e streaming (`/songs`)

### `GET /songs/`

Autenticação: `user` ou `admin`. Query: `skip` (inteiro, padrão `0`) e `limit` (inteiro, padrão `20`). Retorna `200` com músicas mais recentes.

```json
[{"id":15,"title":"Faixa","artist":"Artista","album":null,"album_artist":null,"genre":null,"year":null,"track_number":null,"disc_number":null,"composer":null,"duration_seconds":212,"thumbnail_url":"http://host/songs/15/cover","added_at":"2026-08-13T10:00:00"}]
```

### `GET /songs/search`

Autenticação: `user` ou `admin`. Query obrigatória `q` (texto, mínimo 1) e opcional `limit` (padrão `20`). Busca título, artista ou álbum e retorna a mesma lista de `Song` (`200`). Dados de query inválidos retornam `422`.

```bash
curl -H 'Authorization: Bearer TOKEN' 'http://localhost:8000/songs/search?q=rock&limit=20'
```

### `GET /songs/{song_id}/stream`

Autenticação: `user` ou `admin`. Faz streaming do arquivo e aceita o header opcional `Range`; retorna `200` para arquivo completo ou `206` para faixa parcial, com `Accept-Ranges` e `Content-Range`. Retorna `404` se música/arquivo não existir.

### `GET /songs/{song_id}/cover`

Pública, sem autenticação. Retorna o arquivo de capa extraída ou `404` (`Capa não encontrada`).

## 8. Upload e gerenciamento administrativo da biblioteca (`/admin/music`)

Todas exigem access token de `admin`.

### Fluxo de MP3 individual

```text
Administrador → POST /admin/music/upload → validação/tags/capa → arquivo em musicas/songs → música disponível
```

### `POST /admin/music/upload`

`multipart/form-data`, campo obrigatório **exatamente** chamado `file` (`.mp3`). A extensão deve ser `.mp3`, o arquivo não pode estar vazio, deve respeitar `MAX_MUSIC_UPLOAD_BYTES` e seu conteúdo deve ser lido como MP3 válido. A API calcula hash SHA-256, evita duplicação física, usa tags existentes e usa o nome do arquivo somente como fallback para `title`. Tags disponíveis: título, artista, álbum, artista do álbum, gênero, ano/data, faixa, disco, compositor, duração e capa incorporada. Capas JPEG, PNG e WebP incorporadas mantêm a extensão correta.

```bash
curl -X POST http://localhost:8000/admin/music/upload \
  -H 'Authorization: Bearer TOKEN' -F 'file=@musica.mp3'
```

Retorna `201` com `Song` quando cria o registro. Se o mesmo conteúdo já estiver na biblioteca, retorna a música existente com `200`, sem duplicar o arquivo. Retorna `400` para extensão inválida, arquivo vazio, arquivo acima do limite ou MP3 que não possa ser processado; `401`/`403` sem um token de administrador válido; `422` se o campo de formulário estiver ausente.

> No navegador, não defina manualmente o cabeçalho `Content-Type` ao usar `FormData`. O cliente adiciona o `boundary` necessário. Defina apenas `Authorization`.

### `GET /admin/music`

Query opcional: `skip` (padrão `0`) e `limit` (padrão `100`). Retorna `200` com lista de `Song`.

### `DELETE /admin/music/{song_id}`

Apaga registro, MP3 e capa, retornando `204`. As ligações em playlists são apagadas automaticamente; playlists não são apagadas. Retorna `404` se a música não existir.

### `PATCH /admin/music/{song_id}/metadata`

Atualiza somente os campos enviados, preservando os demais tanto no banco quanto nas tags ID3 do MP3. Aceita `title`, `artist`, `album`, `album_artist`, `genre`, `year`, `track_number`, `disc_number` e `composer`; `title` não pode ser vazio. Exemplo:

```json
{"title":"Novo título","genre":"Rock","composer":null}
```

### Capas: `PUT` e `DELETE /admin/music/{song_id}/cover`

`PUT` recebe `multipart/form-data` com o campo `file`. Aceita apenas JPEG, PNG ou WebP, valida a assinatura real do arquivo e `MAX_COVER_UPLOAD_BYTES`, substitui a capa anterior sem deixar arquivo órfão e atualiza a imagem APIC incorporada no MP3. `DELETE` remove tanto a capa externa quanto a incorporada; ambas retornam `404` para música inexistente.

## 9. Playlists pessoais e de biblioteca (`/playlists`)

### Fluxo de usuário

```text
Login → administrador mantém allow_user_playlists habilitado → cria playlist → lista músicas → adiciona IDs existentes → playlist pronta
```

### `GET /playlists/`

Autenticação: `user` ou `admin`. Um usuário recebe playlists `library` e suas próprias `personal`; administrador recebe todas. Retorna `200` com objetos:

```json
[{"id":7,"name":"Minha playlist","source_type":"personal","created_at":"2026-08-13T10:00:00","total_songs":2}]
```

### `POST /playlists/`

Autenticação: `user` ou `admin`. Body obrigatório:

```json
{"name":"Minha playlist"}
```

Cria playlist `personal` e retorna `201`. Para usuário comum, retorna `403` se `allow_user_playlists` estiver `false`; administrador pode criar. Nome vazio resulta em `422`; nome já usado pelo mesmo dono resulta em `409`.

### `GET /playlists/{playlist_id}`

Autenticação: `user` ou `admin`. Usuário acessa playlists próprias e de biblioteca; admin acessa qualquer uma. Retorna `200` com os campos da playlist e `songs` ordenadas pela posição. Retorna `404` para inexistente ou sem acesso.

### `PATCH /playlists/{playlist_id}`

Autenticação: `user` ou `admin`. Body `{"name":"Novo nome"}`. Usuário altera somente a própria playlist `personal`; admin pode alterar qualquer uma. Retorna `200`, `404` para acesso/recurso, `409` para nome em conflito ou `422` para nome vazio/ausente.

### `DELETE /playlists/{playlist_id}`

Autenticação: `user` ou `admin`. Usuário apaga somente a própria `personal`; admin pode apagar qualquer uma. Retorna `204` ou `404`.

### `PUT /playlists/{playlist_id}/songs/{song_id}`

Autenticação: `user` ou `admin`. Não há body. Adiciona uma música existente; usuário somente em playlist pessoal própria, admin em qualquer playlist. Retorna `204`; operação repetida também retorna `204` sem duplicar vínculo. Retorna `404` se não houver música, playlist ou acesso.

```bash
curl -X PUT -H 'Authorization: Bearer TOKEN' http://localhost:8000/playlists/7/songs/15
```

### `DELETE /playlists/{playlist_id}/songs/{song_id}`

Autenticação e permissão idênticas à rota anterior. Remove o vínculo e retorna `204`; retorna `404` se playlist/acesso não existir ou se a música não pertencer à playlist.

## 10. Playlist de biblioteca por upload (`/admin/playlists`)

Todas exigem `admin`. Enviar múltiplos campos `files` equivale ao envio de uma pasta: os arquivos MP3 válidos entram na biblioteca e são associados à nova playlist `library`; não há cópias nos diretórios de playlist.

```text
Administrador → POST /admin/playlists/upload → processa cada arquivo → cria playlist library → associa referências Song
```

### `POST /admin/playlists/upload`

Formulário multipart:

| Campo | Tipo | Obrigatório | Descrição |
|---|---|---:|---|
| `files` | arquivo repetível | Sim | Arquivos da pasta. |
| `playlist` | string | Não | Substitui o nome calculado. |

Se `playlist` não vier, a API usa o diretório pai comum nos nomes relativos (`Rock/01.mp3` gera `Rock`). Sem um pai comum, usa `Upload AAAA-MM-DD HH:MM`. Arquivos que não terminam em `.mp3` são ignorados; falha ao ler um MP3 é registrada e os demais continuam. Se não houver sucesso, a playlist recém-criada é apagada e a resposta é `400`.

```bash
curl -X POST http://localhost:8000/admin/playlists/upload \
  -H 'Authorization: Bearer TOKEN' \
  -F 'files=@Rock/01.mp3' -F 'files=@Rock/notas.txt' \
  -F 'playlist=Rock clássico'
```

Resposta `201`:

```json
{
  "playlist":{"id":3,"name":"Rock clássico","source_type":"library","created_at":"2026-08-13T10:00:00","total_songs":1,"songs":[{"id":15,"title":"01","artist":null,"album":null,"album_artist":null,"genre":null,"year":null,"track_number":null,"disc_number":null,"composer":null,"duration_seconds":212,"thumbnail_url":null,"added_at":"2026-08-13T10:00:00"}]},
  "total":2,"sucessos":1,"ignorados":1,"erros":0,
  "arquivos_ignorados":["Rock/notas.txt"],"arquivos_com_erro":[]
}
```

### Gerenciamento administrativo de playlists

| Método e rota | Body | Resultado |
|---|---|---|
| `PATCH /admin/playlists/{playlist_id}` | `{"name":"Novo nome"}` | Renomeia qualquer playlist; `200`. |
| `DELETE /admin/playlists/{playlist_id}` | — | Exclui qualquer playlist; `204`. |
| `PUT /admin/playlists/{playlist_id}/songs/{song_id}` | — | Adiciona música existente; `204`. |
| `DELETE /admin/playlists/{playlist_id}/songs/{song_id}` | — | Remove vínculo; `204`. |

Essas rotas retornam `404` para recurso inexistente (ou vínculo ausente na remoção), `409` para nome repetido e `422` para nome vazio. A adição repetida não cria duplicata.

## 11. Configurações administrativas (`/admin/settings`)

Todas exigem `admin`.

### `GET /admin/settings`

Retorna `200` com todos os pares persistentes, por exemplo:

```json
[{"key":"allow_user_playlists","value":"true"},{"key":"allow_user_registration","value":"false"}]
```

### `PATCH /admin/settings/registration`

Body `{"value":"true"}` ou `{"value":"false"}`. Atualiza exatamente a chave `allow_user_registration`, retorna `200`; outro valor retorna `400`.

### `GET /admin/settings/user-playlists`

Consulta a chave `allow_user_playlists`; se ela ainda não existir, a rota a cria com `"true"`. Retorna `200`:

```json
{"key":"allow_user_playlists","value":"true"}
```

### `PATCH /admin/settings/user-playlists`

Body `{"value":"true"}` ou `{"value":"false"}`. Altera `allow_user_playlists` e retorna `200`; outro valor retorna `400`.

Quando o valor é `true`, usuários comuns podem chamar `POST /playlists/`. Com `false`, a mesma chamada retorna `403`; visualizar e administrar playlists pessoais já existentes continua permitido. A checagem é feita no backend.

## 12. Usuários administrativos (`/admin/users`)

Todas exigem `admin`.

| Método e rota | Body/parâmetros | Resposta e erros |
|---|---|---|
| `GET /admin/users` | — | Lista `User`, `200`. |
| `POST /admin/users` | `username`, `email`, `password`, opcional `role` e `is_active` | Cria usuário, `201`; `409` repetido; `422` inválido. |
| `GET /admin/users/{user_id}` | ID de rota | `User`, `200`; `404`. |
| `PATCH /admin/users/{user_id}` | opcional `username`, `email`, `role`, `is_active` | `User`, `200`; `404`, `409` ou `422`. |
| `PATCH /admin/users/{user_id}/password` | `{"password":"minimo-8"}` | `User`, `200`; revoga refresh tokens; `404`/`422`. |
| `DELETE /admin/users/{user_id}` | — | `204`; `404`. |

Exemplo de criação:

```bash
curl -X POST http://localhost:8000/admin/users -H 'Authorization: Bearer TOKEN' \
  -H 'Content-Type: application/json' \
  -d '{"username":"bia","email":"bia@example.com","password":"senha-com-8","role":"user","is_active":true}'
```

## 13. Mensagens

### `POST /messages/`

Autenticação: `user` ou `admin`. Body: `{"content":"Mensagem com pelo menos dez caracteres"}` (10–5000 caracteres). Retorna `201` com `id`, conteúdo, data, `is_read`, `is_resolved` e `sender`; campos inválidos retornam `422`.

### Administração de mensagens (`/admin/messages`)

Todas exigem `admin`.

| Método e rota | Parâmetros/body | Resultado |
|---|---|---|
| `GET /admin/messages` | `skip=0`, `limit=100` | Lista mais recentes, `200`. |
| `GET /admin/messages/{message_id}` | ID | Mensagem, `200`; `404`. |
| `PATCH /admin/messages/{message_id}` | `{"is_read":true,"is_resolved":false}`; ambos opcionais | Mensagem atualizada, `200`; `404`. |
| `DELETE /admin/messages/{message_id}` | ID | `204` (inclusive se já não existir). |

## 14. Fluxos para clientes

### Administrador adicionando uma música

1. `POST /auth/login` e armazene tokens.
2. Envie o access token em `POST /admin/music/upload` como multipart `file`.
3. Leia a música retornada e use `GET /songs/` ou streaming pelo `id`.

### Exemplo Android (React Native / Expo)

Após selecionar um arquivo com `expo-document-picker`, envie `uri`, `name` e `mimeType` no `FormData`. Em Android, use a URL da API acessível pelo aparelho/emulador — `localhost` aponta para o próprio celular, não para seu computador.

```js
import * as DocumentPicker from "expo-document-picker";

async function chooseAndUpload(accessToken) {
  const result = await DocumentPicker.getDocumentAsync({ type: "audio/mpeg", copyToCacheDirectory: true });
  if (result.canceled) return null;

  const file = result.assets[0];
  const form = new FormData();
  form.append("file", {
    uri: file.uri,
    name: file.name || "musica.mp3",
    type: file.mimeType || "audio/mpeg",
  });

  const response = await fetch(`${API_URL}/admin/music/upload`, {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}` },
    body: form,
  });
  const body = await response.json();
  if (!response.ok) throw new Error(body.detail || "Falha no upload");
  return body;
}
```

Mostre a mensagem `detail` em caso de erro e atualize a lista chamando `GET /songs/` após o retorno bem-sucedido. Não inclua o token em URLs ou logs.

### Administrador criando playlist por pasta

1. Faça login como admin.
2. Envie todos os arquivos em `POST /admin/playlists/upload`; use `playlist` quando o cliente não preservar caminho relativo.
3. Inspecione `sucessos`, `ignorados`, `erros` e as listas de arquivos na resposta.
4. Consulte a playlist retornada em `GET /playlists/{id}`; use as rotas administrativas para ajustes posteriores.

### Usuário criando playlist pessoal

1. Faça login.
2. O aplicativo pode pedir a um administrador a configuração, pois `GET /admin/settings/user-playlists` é administrativa; trate `403` de `POST /playlists/` como criação desabilitada.
3. Liste `GET /songs/`, crie com `POST /playlists/` e inclua IDs por `PUT /playlists/{id}/songs/{song_id}`.
4. Trate `404` como música/playlist inexistente ou sem acesso e `409` como conflito de nome.

## 15. Revisão de compatibilidade

Esta documentação descreve as rotas registradas em `app/main.py` e seus schemas atuais. Rotas antigas de download/importação/sincronização externa não são rotas funcionais desta versão. Para detalhes de tipos e validação automática, consulte também `/docs` da instância em execução.
